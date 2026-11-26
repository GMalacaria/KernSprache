// send-reminders: called every hour by pg_cron (shared secret, no user JWT). For each
// learner with a push subscription whose local hour is their reminder hour, sends at
// most one notification a day: streak at risk, reviews due, or today's goal.
import { webpush } from '../_shared/deps.ts'
import { requireEnv } from '../_shared/env.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import {
  decideReminder,
  hourOfTime,
  localDayAndHour,
  previousDay,
  type Reminder,
  streakEndingYesterday,
} from '../_shared/reminders.ts'
import { adminClient, type Db } from '../_shared/supabase.ts'
import type { LanguageCode } from '../_shared/languages.ts'

const STREAK_LOOKBACK_DAYS = 60
const PUSH_TTL_SECONDS = 6 * 60 * 60

interface Subscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

Deno.serve(
  handle(async (req) => {
    const secret = req.headers.get('x-cron-secret')
    if (!secret || secret !== requireEnv('CRON_SECRET')) throw new HttpError(401, 'unauthorized', 'Non autorizzato')

    const db = adminClient()
    const server = await webpush.ApplicationServer.new({
      contactInformation: requireEnv('VAPID_SUBJECT'),
      vapidKeys: await webpush.importVapidKeys(JSON.parse(atob(requireEnv('VAPID_KEYS')))),
    })

    const { data: subs, error } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
    if (error) throw error
    const byUser = Map.groupBy(subs as Subscription[], (s) => s.user_id)
    if (byUser.size === 0) return json({ users: 0, sent: 0, removed: 0 })

    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('id, reminder_time, timezone, daily_goal_minutes, active_language')
      .in('id', [...byUser.keys()])
    if (profilesError) throw profilesError

    const now = new Date()
    let users = 0
    let sent = 0
    let removed = 0
    for (const profile of profiles) {
      const local = safeLocal(now, profile.timezone)
      if (!local || local.hour !== hourOfTime(profile.reminder_time)) continue

      const reminder = await reminderFor(db, profile, local.day, now)
      if (!reminder) continue
      // Claim the day first: a repeated call in the same hour cannot send twice.
      const { error: claimError } = await db
        .from('reminder_log')
        .insert({ user_id: profile.id, day: local.day, kind: reminder.kind })
      if (claimError) {
        if (claimError.code !== '23505') console.error('Failed to claim reminder', claimError)
        continue
      }

      users++
      for (const sub of byUser.get(profile.id) ?? []) {
        const result = await push(server, sub, reminder)
        if (result === 'sent') sent++
        else if (result === 'gone') {
          removed++
          await db.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
    return json({ users, sent, removed })
  }),
)

function safeLocal(now: Date, timeZone: string): { day: string; hour: number } | null {
  try {
    return localDayAndHour(now, timeZone)
  } catch {
    console.error('Invalid time zone', timeZone)
    return null
  }
}

async function reminderFor(
  db: Db,
  profile: { id: string; daily_goal_minutes: number; active_language: LanguageCode },
  today: string,
  now: Date,
): Promise<Reminder | null> {
  const since = (() => {
    let day = today
    for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) day = previousDay(day)
    return day
  })()
  const { data: days, error } = await db
    .from('study_days')
    .select('day, completed_at')
    .eq('user_id', profile.id)
    .gte('day', since)
  if (error) throw error
  const completed = new Set(days.filter((d) => d.completed_at !== null).map((d) => d.day))

  const nowIso = now.toISOString()
  // Cards due in the language being studied: the review only shows those.
  const [vocab, mistakes] = await Promise.all([
    db.from('vocab_items').select('id', { count: 'exact', head: true }).eq('user_id', profile.id)
      .eq('language', profile.active_language).lte('due', nowIso),
    db.from('mistakes').select('id', { count: 'exact', head: true }).eq('user_id', profile.id)
      .eq('language', profile.active_language).lte('due', nowIso),
  ])
  if (vocab.error) throw vocab.error
  if (mistakes.error) throw mistakes.error

  return decideReminder({
    goalReached: completed.has(today),
    streak: streakEndingYesterday(completed, today),
    dueCount: (vocab.count ?? 0) + (mistakes.count ?? 0),
    goalMinutes: profile.daily_goal_minutes,
  })
}

/** 'gone' means the browser dropped the subscription: it is removed. Other failures are only logged. */
async function push(
  server: webpush.ApplicationServer,
  sub: Subscription,
  reminder: Reminder,
): Promise<'sent' | 'gone' | 'failed'> {
  try {
    const subscriber = server.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } })
    await subscriber.pushTextMessage(
      JSON.stringify({ title: reminder.title, body: reminder.body, url: '/', tag: 'daily-reminder' }),
      { ttl: PUSH_TTL_SECONDS },
    )
    return 'sent'
  } catch (err) {
    if (err instanceof webpush.PushMessageError && err.isGone()) return 'gone'
    console.error('Push failed', sub.endpoint.slice(0, 40), err)
    return 'failed'
  }
}

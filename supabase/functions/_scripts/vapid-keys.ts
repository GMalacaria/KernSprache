// Generates a VAPID key pair for Web Push. Run with: pnpm push:keys
// Put the first line in supabase/functions/.env (secret) and the second in apps/web/.env.local (public).
import * as webpush from 'jsr:@negrel/webpush@0.5.0' // keep the version in sync with _shared/deps.ts

const keys = await webpush.generateVapidKeys({ extractable: true })
// Base64 keeps the value free of quotes, which env files handle inconsistently.
console.log(`VAPID_KEYS=${btoa(JSON.stringify(await webpush.exportVapidKeys(keys)))}`)
console.log(`VITE_VAPID_PUBLIC_KEY=${await webpush.exportApplicationServerKey(keys)}`)

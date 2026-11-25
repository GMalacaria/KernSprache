import type { TutorReply } from './schemas/tutor-chat.ts'

/**
 * Drops empty/no-op corrections, normalises and de-duplicates vocabulary. Words are lower-cased unless the
 * language capitalises nouns (German: "der Tisch"); duplicates and words in review are compared case-insensitively.
 */
export function cleanReply(reply: TutorReply, reviewWords: Set<string>, keepCase = false): TutorReply {
  const corrections = reply.corrections.filter(
    (c) => c.original.trim() && c.corrected.trim() && c.original.trim() !== c.corrected.trim(),
  )
  const review = new Set([...reviewWords].map((w) => w.toLowerCase()))
  const seen = new Set<string>()
  const new_vocab = reply.new_vocab
    .map((v) => ({ en: keepCase ? v.en.trim() : v.en.trim().toLowerCase(), it: v.it.trim() }))
    .filter((v) => {
      const key = v.en.toLowerCase()
      if (!v.en || !v.it || seen.has(key) || review.has(key)) return false
      seen.add(key)
      return true
    })
  return { reply: reply.reply.trim(), corrections, new_vocab }
}

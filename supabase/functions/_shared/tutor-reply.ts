import type { TutorReply } from './schemas/tutor-chat.ts'

/** Drops empty/no-op corrections, normalises and de-duplicates vocabulary. */
export function cleanReply(reply: TutorReply, reviewWords: Set<string>): TutorReply {
  const corrections = reply.corrections.filter(
    (c) => c.original.trim() && c.corrected.trim() && c.original.trim() !== c.corrected.trim(),
  )
  const seen = new Set<string>()
  const new_vocab = reply.new_vocab
    .map((v) => ({ en: v.en.trim().toLowerCase(), it: v.it.trim() }))
    .filter((v) => {
      if (!v.en || !v.it || seen.has(v.en) || reviewWords.has(v.en)) return false
      seen.add(v.en)
      return true
    })
  return { reply: reply.reply.trim(), corrections, new_vocab }
}

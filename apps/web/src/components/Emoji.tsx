import airplane from '../assets/emoji/airplane.svg'
import briefcase from '../assets/emoji/briefcase.svg'
import clapper from '../assets/emoji/clapper.svg'
import heart from '../assets/emoji/heart.svg'
import microphone from '../assets/emoji/microphone.svg'
import party from '../assets/emoji/party.svg'
import speaker from '../assets/emoji/speaker.svg'
import stopwatch from '../assets/emoji/stopwatch.svg'

// Fluent Emoji (flat) by Microsoft, MIT licence: the same look on every phone instead of each system's own set.
const EMOJI = { airplane, briefcase, clapper, heart, microphone, party, speaker, stopwatch }

export type EmojiName = keyof typeof EMOJI

/** Decorative emoji: the text next to it carries the meaning. */
export function Emoji({ name, size = '1.25em' }: { name: EmojiName; size?: string }) {
  return <img className="emoji" src={EMOJI[name]} alt="" style={{ width: size, height: size }} aria-hidden="true" />
}

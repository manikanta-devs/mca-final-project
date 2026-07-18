/**
 * Browser SpeechSynthesis voice selection utility.
 * Extracted from InterviewPage.jsx.
 */
import { VOICE_PROFILES } from '../constants/interviewConstants'

/**
 * Picks the best matching browser voice for a given voice profile.
 * Priority: online/natural voices > high-quality offline > preferred terms > gender fallback > first available.
 *
 * @param {SpeechSynthesisVoice[]} voices  - Array from speechSynthesis.getVoices()
 * @param {object} profile                 - A VOICE_PROFILES entry
 * @returns {SpeechSynthesisVoice|null}
 */
export function chooseBrowserVoice(voices = [], profile = VOICE_PROFILES.sarah) {
  const englishVoices = voices.filter(voice => {
    const lang = (voice.lang || '').toLowerCase()
    return lang.startsWith('en-us') || lang.startsWith('en-gb') || lang.startsWith('en')
  })
  const candidates = englishVoices.length ? englishVoices : voices

  // 1. High-quality natural/online voices matching gender
  const onlineNaturalMatch = candidates.find(voice => {
    const name = voice.name.toLowerCase()
    const isOnline = name.includes('online') || name.includes('natural') || name.includes('google') || name.includes('neural')
    if (!isOnline) return false
    if (profile.gender === 'female') {
      return name.includes('aria') || name.includes('jenny') || name.includes('female') || name.includes('zira') || name.includes('samantha')
    } else {
      return name.includes('guy') || name.includes('male') || name.includes('david') || name.includes('mark')
    }
  })
  if (onlineNaturalMatch) return onlineNaturalMatch

  // 2. Standard high-quality offline voices (Samantha on Mac, etc.)
  const highQualityOfflineMatch = candidates.find(voice => {
    const name = voice.name.toLowerCase()
    if (profile.gender === 'female') {
      return name.includes('samantha') || name.includes('siri') || name.includes('victoria') || name.includes('sara')
    } else {
      return name.includes('daniel') || name.includes('alex') || name.includes('fred') || name.includes('oliver')
    }
  })
  if (highQualityOfflineMatch) return highQualityOfflineMatch

  // 3. Any voice matching the preferred terms list
  const preferredTerms = profile.preferredNames || []
  const preferredMatch = candidates.find(voice => {
    const haystack = `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase()
    return preferredTerms.some(term => haystack.includes(term))
  })
  if (preferredMatch) return preferredMatch

  // 4. Gender match in offline local voices
  const localGenderMatch = candidates.find(voice => {
    const name = voice.name.toLowerCase()
    if (profile.gender === 'female') {
      return name.includes('female') || name.includes('woman') || name.includes('zira') || name.includes('susan') || name.includes('hazel')
    } else {
      return name.includes('male') || name.includes('man') || name.includes('david') || name.includes('george') || name.includes('ravi')
    }
  })
  if (localGenderMatch) return localGenderMatch

  // 5. Ultimate fallback
  return candidates[0] || null
}

/**
 * useVoiceProfiles.js — Centralized voice profile registry.
 * Extracted from InterviewPage.jsx to eliminate duplication.
 * Single source of truth for all TTS voice characteristics.
 */

export const VOICE_PROFILES = {
  sarah: {
    name: 'sarah',
    displayName: 'Sarah Chen',
    gender: 'female',
    preferredVoices: [
      'Microsoft Zira',
      'Google UK English Female',
      'Samantha',
      'Victoria',
      'Karen',
      'Moira',
      'Fiona',
      'en-GB-Standard-A',
    ],
    rate: 0.92,
    pitch: 1.08,
    lang: 'en-US',
  },
  marcus: {
    name: 'marcus',
    displayName: 'Marcus Rodriguez',
    gender: 'male',
    preferredVoices: [
      'Microsoft David',
      'Google UK English Male',
      'Daniel',
      'Alex',
      'Fred',
      'en-GB-Standard-B',
    ],
    rate: 0.88,
    pitch: 0.95,
    lang: 'en-US',
  },
  nagma_hr: {
    name: 'nagma_hr',
    displayName: 'Nagma HR',
    gender: 'female',
    preferredVoices: [
      'Microsoft Zira',
      'Google UK English Female',
      'Samantha',
      'Victoria',
      'Karen',
      'Moira',
      'Fiona',
      'en-GB-Standard-A',
    ],
    rate: 0.90,
    pitch: 1.05,
    lang: 'en-US',
  },
}

export const PANEL_VOICE_PROFILES = {
  technical_lead: VOICE_PROFILES.marcus,
  hr_manager: VOICE_PROFILES.sarah,
  strict_manager: {
    ...VOICE_PROFILES.marcus,
    rate: 0.84,
    pitch: 0.88,
  },
}

/**
 * Choose the best matching browser voice for a given profile.
 * Falls back gracefully if no preferred voice is available.
 *
 * @param {SpeechSynthesisVoice[]} availableVoices - From speechSynthesis.getVoices()
 * @param {object} profile - One of VOICE_PROFILES or PANEL_VOICE_PROFILES values
 * @returns {SpeechSynthesisVoice|null}
 */
export function chooseBrowserVoice(availableVoices, profile) {
  if (!availableVoices?.length || !profile) return null

  const lang = profile.lang || 'en'

  // 1. Exact name match (highest priority)
  for (const preferred of profile.preferredVoices || []) {
    const match = availableVoices.find(
      v => v.name.toLowerCase().includes(preferred.toLowerCase())
    )
    if (match) return match
  }

  // 2. Gender heuristic — female voices have "female" in name, male have "male"
  const genderKey = profile.gender === 'female' ? 'female' : 'male'
  const genderMatch = availableVoices.find(
    v => v.lang.startsWith(lang.slice(0, 2)) && v.name.toLowerCase().includes(genderKey)
  )
  if (genderMatch) return genderMatch

  // 3. Language-only fallback
  const langMatch = availableVoices.find(v => v.lang.startsWith(lang.slice(0, 2)))
  if (langMatch) return langMatch

  // 4. Absolute fallback — first voice available
  return availableVoices[0] || null
}

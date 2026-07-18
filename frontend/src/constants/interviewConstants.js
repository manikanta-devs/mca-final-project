/**
 * Shared constants for the Interview feature.
 * Extracted from InterviewPage.jsx to reduce file size.
 */

export const DIFF_OPTIONS = [
  { value: 'easy',   label: 'Easy',   desc: 'Fundamental concepts' },
  { value: 'medium', label: 'Medium', desc: 'Industry standard level' },
  { value: 'hard',   label: 'Hard',   desc: 'Senior/expert level' },
]

export const ROLE_OPTIONS = [
  { value: 'software_engineer',   label: 'Software Engineer' },
  { value: 'frontend_developer',  label: 'Frontend Developer' },
  { value: 'backend_developer',   label: 'Backend Developer' },
  { value: 'fullstack_developer', label: 'Full Stack Developer' },
  { value: 'data_scientist',      label: 'Data Scientist' },
  { value: 'ml_engineer',         label: 'ML Engineer' },
  { value: 'devops_engineer',     label: 'DevOps Engineer' },
  { value: 'product_manager',     label: 'Product Manager' },
]

export const FORMAT_OPTIONS = [
  { value: 'text',  label: 'Text',  desc: 'Type your answers — no mic or camera needed', icon: 'type' },
  { value: 'voice', label: 'Voice', desc: 'Speak your answers — mic only, no camera',    icon: 'mic' },
  { value: 'video', label: 'Video', desc: 'Speak + camera — full emotion & posture tracking', icon: 'video' },
]

export const COMPANY_OPTIONS = [
  { value: 'General',   label: 'General',   desc: 'Standard industry questions' },
  { value: 'Google',    label: 'Google',    desc: 'Scale, Algorithmic & Googlyness' },
  { value: 'Amazon',    label: 'Amazon',    desc: 'Leadership Principles & Depth' },
  { value: 'Microsoft', label: 'Microsoft', desc: 'Robust Design & Collaboration' },
  { value: 'Netflix',   label: 'Netflix',   desc: 'Freedom & Responsibility, Chaos' },
  { value: 'Meta',      label: 'Meta',      desc: 'Fast execution & System design' },
  { value: 'Custom',    label: 'Custom',    desc: 'Provide your own company/context' },
]

export const VOICE_PROFILES = {
  sarah: {
    gender: 'female',
    pitch: 1.08,
    rate: 0.92,
    preferredNames: ['zira', 'aria', 'jenny', 'susan', 'samantha', 'victoria', 'female', 'woman'],
  },
  marcus: {
    gender: 'male',
    pitch: 0.9,
    rate: 0.9,
    preferredNames: ['david', 'guy', 'mark', 'daniel', 'alex', 'male', 'man'],
  },
  // Formerly 'female_hr_looking_screen' — renamed to reflect the actual persona
  nagma_hr: {
    gender: 'female',
    pitch: 1.05,
    rate: 0.90,
    preferredNames: ['zira', 'aria', 'jenny', 'susan', 'samantha', 'victoria', 'female', 'woman'],
  },
}

export const PANEL_VOICE_PROFILES = {
  technical_lead: VOICE_PROFILES.marcus,
  hr_manager:     VOICE_PROFILES.sarah,
  strict_manager: VOICE_PROFILES.marcus,
}

/** Application phase constants for the interview flow. */
export const PHASE = {
  SETUP:        'setup',
  GENERATING:   'generating',
  ROOM_ENTRY:   'room_entry',
  INTERVIEWING: 'interviewing',
  EVALUATING:   'evaluating',
}

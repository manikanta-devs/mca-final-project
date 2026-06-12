/**
 * Adaptive Interview Engine
 * - Adjusts question difficulty based on previous answer scores
 * - Generates live coaching tips during recording
 * - Determines when to ask follow-up questions
 * - Generates contextual follow-up prompts
 */

// ── Difficulty Adaptation ────────────────────────────────────────
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard']

export function getNextDifficulty(previousScores = [], currentDifficulty = 'medium') {
  if (previousScores.length === 0) return currentDifficulty

  const recent = previousScores.slice(-3)
  const avg = recent.reduce((sum, s) => sum + s, 0) / recent.length
  const currentIdx = DIFFICULTY_LEVELS.indexOf(currentDifficulty)

  if (avg >= 80 && currentIdx < 2) {
    return DIFFICULTY_LEVELS[currentIdx + 1]
  }
  if (avg < 45 && currentIdx > 0) {
    return DIFFICULTY_LEVELS[currentIdx - 1]
  }
  return currentDifficulty
}

export function getDifficultyLabel(difficulty) {
  const map = {
    easy: { label: 'Easy', color: 'text-green-400', bg: 'bg-green-500/20', icon: '●' },
    medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '●' },
    hard: { label: 'Hard', color: 'text-red-400', bg: 'bg-red-500/20', icon: '●' },
  }
  return map[difficulty] || map.medium
}

// ── Live Coaching Tips ───────────────────────────────────────────
const TIP_RULES = [
  {
    id: 'add_example',
    check: (ctx) => ctx.wordCount > 15 && !ctx.hasNumbers && !ctx.hasExample,
    tip: 'Add a specific example with measurable impact',
    priority: 1,
  },
  {
    id: 'slow_down',
    check: (ctx) => ctx.wpm > 180,
    tip: 'Slow down — you\'re speaking too fast',
    priority: 0,
  },
  {
    id: 'speed_up',
    check: (ctx) => ctx.wpm > 0 && ctx.wpm < 80 && ctx.elapsed > 10,
    tip: 'Try to speak a bit faster and more confidently',
    priority: 0,
  },
  {
    id: 'be_concise',
    check: (ctx) => ctx.elapsed > 90 && ctx.wordCount > 180,
    tip: 'Be more concise — wrap up your main point',
    priority: 0,
  },
  {
    id: 'use_star',
    check: (ctx) => ctx.questionType === 'behavioral' && ctx.wordCount > 5 && !ctx.hasStructure,
    tip: 'Use the STAR method: Situation → Task → Action → Result',
    priority: 2,
  },
  {
    id: 'mention_project',
    check: (ctx) => ctx.wordCount > 20 && !ctx.hasProject && ctx.questionType === 'technical',
    tip: 'Mention a real project where you applied this',
    priority: 1,
  },
  {
    id: 'too_short',
    check: (ctx) => ctx.elapsed > 15 && ctx.wordCount < 10,
    tip: 'Start speaking — don\'t leave long silences',
    priority: 0,
  },
  {
    id: 'fillers_high',
    check: (ctx) => ctx.fillerRatio > 10,
    tip: 'Reduce filler words (um, like, basically)',
    priority: 1,
  },
  {
    id: 'add_tradeoff',
    check: (ctx) => ctx.questionType === 'technical' && ctx.wordCount > 30 && !ctx.hasTradeoff,
    tip: 'Discuss trade-offs or alternatives',
    priority: 2,
  },
  {
    id: 'good_pace',
    check: (ctx) => ctx.wpm >= 110 && ctx.wpm <= 160 && ctx.elapsed > 10,
    tip: 'Great pace — keep it up!',
    priority: 3,
  },
]

export function generateLiveCoachingTips(transcript = '', elapsedSeconds = 0, questionType = 'technical', fillerCount = 0) {
  const words = transcript.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const durationMin = elapsedSeconds > 0 ? elapsedSeconds / 60 : 0
  const wpm = durationMin > 0 ? Math.round(wordCount / durationMin) : 0
  const fillerRatio = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100) : 0
  const lower = transcript.toLowerCase()

  const ctx = {
    wordCount,
    wpm,
    elapsed: elapsedSeconds,
    fillerRatio,
    questionType,
    hasNumbers: /\d+%?|\$\d+|[0-9]+x/.test(transcript),
    hasExample: /for example|for instance|in my|at my|we built|we used|i worked|project|implementation/i.test(lower),
    hasProject: /project|system|app|application|tool|platform|service|pipeline|dashboard/i.test(lower),
    hasStructure: /first|then|after|finally|as a result|the outcome|situation|task|action|result/i.test(lower),
    hasTradeoff: /trade-?off|downside|alternative|compared to|versus|however|on the other hand|but the/i.test(lower),
  }

  const matchedTips = TIP_RULES
    .filter(rule => rule.check(ctx))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(rule => rule.tip)

  return matchedTips
}

// ── Follow-up Question Logic ─────────────────────────────────────
export function shouldAskFollowUp(evaluation) {
  if (!evaluation) return false
  const completeness = evaluation.completeness_score || 0
  const technical = evaluation.technical_score || 0
  const overall = evaluation.overall_score || 0

  return completeness < 55 || technical < 50 || overall < 50
}

export function getFollowUpPrompt(question, answer, evaluation) {
  const qType = typeof question === 'object' ? question.type : 'technical'
  const topic = evaluation?.topic || 'this topic'

  const templates = {
    technical: [
      `Can you go deeper on the technical implementation of ${topic}?`,
      `What would be the trade-offs of the approach you described?`,
      `How would you handle edge cases or failure scenarios in your solution?`,
      `Can you walk me through the architecture diagram of what you just described?`,
    ],
    behavioral: [
      `What was the measurable outcome of that experience?`,
      `Looking back, what would you do differently?`,
      `How did that experience change how you approach similar situations now?`,
    ],
    situational: [
      `What if the constraint you mentioned was removed — how would your approach change?`,
      `How would you prioritize if you had limited time and resources?`,
      `What's the first thing you'd do in the first 30 minutes?`,
    ],
  }

  const pool = templates[qType] || templates.technical
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]
}

// ── Score History Tracking ────────────────────────────────────────
export function getScoreHistory() {
  try {
    const raw = localStorage.getItem('nexus_score_history')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveSessionScore(sessionData) {
  try {
    const history = getScoreHistory()
    history.push({
      date: new Date().toISOString(),
      overall: sessionData.overall || 0,
      technical: sessionData.technical || 0,
      clarity: sessionData.clarity || 0,
      role: sessionData.role || 'unknown',
      questionCount: sessionData.questionCount || 0,
    })
    // Keep last 50 sessions
    const trimmed = history.slice(-50)
    localStorage.setItem('nexus_score_history', JSON.stringify(trimmed))
  } catch { /* ignore */ }
}

export function getImprovementMessage(history) {
  if (history.length < 2) return null
  const first = history[0].overall
  const last = history[history.length - 1].overall
  const diff = last - first
  if (diff > 0) return `You've improved by ${diff}% since your first session!`
  if (diff < 0) return `Your score dropped ${Math.abs(diff)}% — keep practicing!`
  return 'Your score is consistent. Push for harder questions!'
}

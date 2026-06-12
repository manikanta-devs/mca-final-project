import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Lightbulb, Target, Zap, BookOpen, TrendingUp, Eye } from 'lucide-react'

/* ── Animated Score Ring ──────────────────────────────────────── */
function ScoreRing({ score = 0, size = 100, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-black text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={score}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-gray-400">/100</span>
      </div>
    </div>
  )
}

/* ── Score Bar ────────────────────────────────────────────────── */
function ScoreBar({ label, score = 0, maxScore = 100 }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-bold text-white w-12 text-right">{score}/{maxScore}</span>
    </div>
  )
}

/* ── Coaching Tip Chip ────────────────────────────────────────── */
function CoachingTip({ tip, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start gap-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
    >
      <Lightbulb className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
      <span className="text-xs text-cyan-300 leading-relaxed">{tip}</span>
    </motion.div>
  )
}

/* ── STAR Method Helper ───────────────────────────────────────── */
function StarHelper() {
  const [expanded, setExpanded] = useState(false)
  const steps = [
    { letter: 'S', label: 'Situation', desc: 'Set the context', color: 'bg-blue-500' },
    { letter: 'T', label: 'Task', desc: 'Explain your responsibility', color: 'bg-violet-500' },
    { letter: 'A', label: 'Action', desc: 'Describe the action you took', color: 'bg-amber-500' },
    { letter: 'R', label: 'Result', desc: 'Share the outcome', color: 'bg-green-500' },
  ]

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">STAR Method</span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3 space-y-2"
          >
            {steps.map(s => (
              <div key={s.letter} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg ${s.color} flex items-center justify-center text-xs font-black text-white`}>
                  {s.letter}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{s.label}</div>
                  <div className="text-[10px] text-gray-500">{s.desc}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Filler Badge ─────────────────────────────────────────────── */
function FillerBadge({ count = 0 }) {
  const level = count <= 2 ? 'Good' : count <= 5 ? 'Okay' : 'High'
  const color = count <= 2 ? 'text-green-400' : count <= 5 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">Filler Words</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white">{count}</span>
        <span className={`text-xs font-semibold ${color}`}>{level}</span>
      </div>
    </div>
  )
}

/* ── Main Panel ───────────────────────────────────────────────── */
export default function LiveFeedbackPanel({
  evaluation,
  coachingTips = [],
  voiceMetrics,
  emotionSnapshot,
  isLive = false,
  questionType = 'technical',
}) {
  const score = evaluation?.overall_score || 0
  const sentimentLabel = score >= 75 ? 'Good Answer!' : score >= 50 ? 'Decent Answer' : 'Needs Work'
  const sentimentColor = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  const sentimentDesc = score >= 75
    ? 'You are on the right track. Keep going!'
    : score >= 50
    ? 'Add more depth and examples to improve.'
    : 'Try to structure your answer better.'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          {isLive ? 'AI Live Feedback' : 'AI Feedback'}
        </h3>
        {isLive && (
          <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
          </span>
        )}
      </div>

      {/* Score Ring + Sentiment */}
      {evaluation && (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <ScoreRing score={score} size={80} strokeWidth={6} />
          <div>
            <p className={`text-lg font-black ${sentimentColor}`}>{sentimentLabel}</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">{sentimentDesc}</p>
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      {evaluation && (
        <div className="space-y-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <ScoreBar label="Clarity" score={evaluation.clarity_score || 0} />
          <ScoreBar label="Relevance" score={evaluation.relevance_score || evaluation.technical_score || 0} />
          <ScoreBar label="Structure" score={evaluation.structure_score || 0} />
          <ScoreBar label="Confidence" score={evaluation.confidence_score || 0} />
          <div className="border-t border-white/[0.06] pt-2 mt-2">
            <FillerBadge count={evaluation.filler_word_count || voiceMetrics?.filler_count || 0} />
          </div>
        </div>
      )}

      {emotionSnapshot?.sample_count > 0 && (
        <div className="space-y-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Video Signals
          </h4>
          <ScoreBar label="Engage" score={emotionSnapshot.engagement_score || 0} />
          <ScoreBar label="Eye line" score={emotionSnapshot.eye_contact_score || 0} />
          <p className="text-[11px] text-gray-400 leading-relaxed">{emotionSnapshot.summary}</p>
        </div>
      )}

      {/* Live Coaching Tips */}
      {coachingTips.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> AI Tips {isLive && '(Live)'}
          </h4>
          <AnimatePresence mode="popLayout">
            {coachingTips.map((tip, i) => (
              <CoachingTip key={tip} tip={tip} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* STAR Method Helper */}
      {(questionType === 'behavioral' || questionType === 'situational') && (
        <StarHelper />
      )}

      {/* View Detailed Feedback Button */}
      {evaluation?.feedback && (
        <button className="w-full py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> View Detailed Feedback
        </button>
      )}
    </motion.div>
  )
}

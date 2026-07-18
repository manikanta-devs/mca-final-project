import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  Brain, Target, AlertTriangle, CheckCircle, Lightbulb,
  MessageSquare, Mic, RefreshCw, ChevronRight, ChevronDown,
  ChevronUp, Copy, Check, BookOpen, Zap, TrendingUp, Eye, Award,
  X
} from 'lucide-react'


/* ── animation variants ───────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
}


/* ── ScoreGauge ───────────────────────────────────────────── */

function ScoreGauge({ score, maxScore = 10, label, size = 56 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(score / maxScore, 1)
  const offset = circumference * (1 - pct)
  const color = score >= 7 ? '#22c55e' : score >= 5 ? '#eab308' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3}
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={3}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-black"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <span className="text-[10px] text-gray-500 font-medium">{label}</span>
    </div>
  )
}


/* ── Section card wrapper ─────────────────────────────────── */

function SectionCard({ children, className }) {
  return (
    <motion.div
      variants={itemVariants}
      className={clsx(
        'rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

function SectionTitle({ icon: Icon, color, children }) {
  return (
    <h4 className="text-xs font-bold text-white flex items-center gap-2">
      <Icon className={clsx('w-4 h-4', color)} />
      {children}
    </h4>
  )
}


/* ── Main component ───────────────────────────────────────── */

export default function InterviewCoachPanel({ coaching, loading, onRetry, onNext, isLastQuestion }) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)

  /* nothing to render */
  if (!loading && !coaching) return null

  /* ── loading skeleton ─────────────────────────────────── */
  if (loading && !coaching) {
    return (
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-slate-900/80 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-violet-400 animate-pulse" />
          <span className="text-sm text-gray-300 font-medium">AI Coach is analyzing your answer…</span>
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-32 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-2 w-full rounded bg-white/[0.04] animate-pulse" />
            <div className="h-2 w-4/5 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  /* copy helper */
  const handleCopy = () => {
    if (!coaching?.personalized_answer) return
    navigator.clipboard.writeText(coaching.personalized_answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/[0.06] bg-slate-950/80 backdrop-blur-xl overflow-hidden">

      {/* ─── 1. Header ─────────────────────────────────── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">🎓</span>
          <span className="text-sm font-bold text-white tracking-tight">AI Interview Coach</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">
            AI-Powered
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="coach-body"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-5 space-y-3"
          >

            {/* ─── 2. Score Gauges ──────────────────────── */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-around py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <ScoreGauge score={coaching.overall_score} label="Overall" />
              <ScoreGauge score={coaching.confidence_score} label="Confidence" />
              <ScoreGauge score={coaching.communication_score} label="Communication" />
              <ScoreGauge score={coaching.technical_score} label="Technical" />
            </motion.div>


            {/* ─── 3. HR First Impression ───────────────── */}
            {coaching.hr_first_impression && (
              <SectionCard className="border-l-2 border-l-violet-500/60">
                <SectionTitle icon={Eye} color="text-violet-400">HR First Impression</SectionTitle>
                <p className="text-[11px] text-gray-400 leading-relaxed italic pl-3 border-l border-violet-500/30">
                  &quot;{coaching.hr_first_impression}&quot;
                </p>
              </SectionCard>
            )}


            {/* ─── 4. What HR Expected ─────────────────── */}
            {coaching.what_hr_expected && (
              <SectionCard className="border-l-2 border-l-cyan-500/60">
                <SectionTitle icon={Target} color="text-cyan-400">What HR Expected</SectionTitle>
                <p className="text-[11px] text-gray-400 leading-relaxed pl-3 border-l border-cyan-500/30">
                  {coaching.what_hr_expected}
                </p>
              </SectionCard>
            )}


            {/* ─── 5. Strengths ────────────────────────── */}
            {coaching.strengths?.length > 0 && (
              <SectionCard className="bg-emerald-500/[0.03]">
                <SectionTitle icon={CheckCircle} color="text-emerald-400">Strengths</SectionTitle>
                <ul className="space-y-1.5">
                  {coaching.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}


            {/* ─── 6. Mistakes ─────────────────────────── */}
            {coaching.mistakes?.length > 0 && (
              <SectionCard className="bg-rose-500/[0.03]">
                <SectionTitle icon={AlertTriangle} color="text-rose-400">Mistakes</SectionTitle>
                <ul className="space-y-1.5">
                  {coaching.mistakes.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed">
                      <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}


            {/* ─── 7. Missing Points ──────────────────── */}
            {coaching.missing_points?.length > 0 && (
              <SectionCard className="bg-amber-500/[0.03]">
                <SectionTitle icon={Lightbulb} color="text-amber-400">Missing Points</SectionTitle>
                <ul className="space-y-1.5">
                  {coaching.missing_points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed">
                      <Zap className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}


            {/* ─── 8. Interview Psychology ────────────── */}
            {coaching.interview_psychology && (
              <SectionCard className="bg-purple-500/[0.04] border-purple-500/10">
                <SectionTitle icon={Brain} color="text-purple-400">
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="inline-flex"
                  >
                    <Brain className="w-4 h-4 text-purple-400" />
                  </motion.span>
                  <span className="ml-1">Interview Psychology</span>
                </SectionTitle>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {coaching.interview_psychology}
                </p>
              </SectionCard>
            )}


            {/* ─── 9. Better Answer Structure ────────── */}
            {coaching.better_structure?.length > 0 && (
              <SectionCard>
                <SectionTitle icon={TrendingUp} color="text-sky-400">Better Answer Structure</SectionTitle>
                <ol className="space-y-1.5">
                  {coaching.better_structure.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed">
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </SectionCard>
            )}


            {/* ─── 10. Personalized Better Answer ────── */}
            {coaching.personalized_answer && (
              <SectionCard className="bg-gradient-to-br from-violet-500/[0.04] to-cyan-500/[0.04]">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Award} color="text-violet-400">Personalized Better Answer</SectionTitle>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/[0.06]"
                  >
                    {copied ? (
                      <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed bg-black/20 rounded-lg p-3 font-mono whitespace-pre-wrap">
                  {coaching.personalized_answer}
                </p>

                {/* Why this works */}
                {coaching.why_this_answer_works && (
                  <div>
                    <button
                      onClick={() => setWhyOpen(w => !w)}
                      className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 transition-colors mt-1"
                    >
                      {whyOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      Why This Answer Works
                    </button>
                    <AnimatePresence>
                      {whyOpen && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[11px] text-gray-400 leading-relaxed mt-2 pl-3 border-l border-violet-500/30"
                        >
                          {coaching.why_this_answer_works}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </SectionCard>
            )}


            {/* ─── 11. Speaking Tips ──────────────────── */}
            {coaching.speaking_tips?.length > 0 && (
              <SectionCard>
                <SectionTitle icon={Mic} color="text-pink-400">Speaking Tips</SectionTitle>
                <ol className="space-y-1.5">
                  {coaching.speaking_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed">
                      <span className="text-[10px] font-bold text-pink-400 bg-pink-400/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {tip}
                    </li>
                  ))}
                </ol>
              </SectionCard>
            )}


            {/* ─── 12. Practice Again ────────────────── */}
            {coaching.practice_again && (
              <SectionCard className="bg-gradient-to-r from-amber-500/[0.04] to-orange-500/[0.04]">
                <SectionTitle icon={RefreshCw} color="text-amber-400">Practice Again</SectionTitle>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {coaching.practice_again}
                </p>
                <button
                  onClick={onRetry}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Answer
                </button>
              </SectionCard>
            )}


            {/* ─── 13. Follow-up Questions ───────────── */}
            {coaching.follow_up_questions?.length > 0 && (
              <SectionCard>
                <button
                  onClick={() => setFollowUpOpen(f => !f)}
                  className="w-full flex items-center justify-between"
                >
                  <SectionTitle icon={MessageSquare} color="text-indigo-400">Follow-up Questions</SectionTitle>
                  {followUpOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
                <AnimatePresence>
                  {followUpOpen && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {coaching.follow_up_questions.map((q, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-gray-400 leading-relaxed bg-indigo-500/[0.04] rounded-lg p-2.5 border border-indigo-500/10"
                        >
                          <span className="text-indigo-400 font-semibold mr-1.5">Q{i + 1}.</span>
                          {q}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </SectionCard>
            )}


            {/* ─── 14. Footer Actions ────────────────── */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 pt-2"
            >
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl py-2.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Answer
              </button>
              <button
                onClick={onNext}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl py-2.5 transition-all shadow-lg shadow-violet-500/20"
              >
                {isLastQuestion ? 'View Results' : 'Next Question'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

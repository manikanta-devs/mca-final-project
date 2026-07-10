import React from 'react'
import { motion } from 'framer-motion'
import {
  Activity, AudioLines, BarChart3, Brain, CheckCircle2, FileSearch,
  Gauge, Lightbulb, Mic, Radar, Route, ShieldCheck, Target,
  Timer, Trophy, Zap
} from 'lucide-react'

const PANEL_DATA = {
  dashboard: {
    eyebrow: 'Command center',
    title: 'Every module now works as one preparation loop.',
    desc: 'Resume signals, interview recordings, quizzes, coaching, and analytics connect into a single readiness workflow.',
    icon: Radar,
    actions: ['Resume to questions', 'Voice/video evidence', 'Analytics to study plan'],
    stats: [
      { label: 'Workflow', value: '6 tools' },
      { label: 'Feedback', value: 'Live' },
      { label: 'Stack', value: 'Free APIs' },
    ],
  },
  resume: {
    eyebrow: 'Resume intelligence',
    title: 'Turn a resume into interview strategy.',
    desc: 'Extract skills, score readiness, compare against job descriptions, and convert gaps into practice targets.',
    icon: FileSearch,
    actions: ['Skill extraction', 'Job match scoring', 'Gap-based prep'],
    stats: [
      { label: 'Inputs', value: 'PDF / DOCX / TXT' },
      { label: 'Signals', value: 'Skills + fit' },
      { label: 'Output', value: 'Action plan' },
    ],
  },
  interview: {
    eyebrow: 'Interview lab',
    title: 'Practice with transcript, waveform, recording, and AI evaluation.',
    desc: 'The interview room captures speech, shows live transcript, records playback, and evaluates answer quality.',
    icon: Mic,
    actions: ['Live mic waveform', 'Speech transcript', 'AI scoring'],
    stats: [
      { label: 'Modes', value: 'Text / Voice / Video' },
      { label: 'Capture', value: 'Mic + camera' },
      { label: 'Signals', value: 'WPM + clarity' },
    ],
  },
  quiz: {
    eyebrow: 'Adaptive drill engine',
    title: 'Practice weak topics with fast, explainable quiz rounds.',
    desc: 'Quiz mode gives quick topic drills, instant explanations, session history, and accuracy tracking.',
    icon: Brain,
    actions: ['Topic drills', 'Instant explanations', 'Weak area tracking'],
    stats: [
      { label: 'Topics', value: 'Coding / SQL / HR' },
      { label: 'Difficulty', value: '3 levels' },
      { label: 'Review', value: 'Per question' },
    ],
  },
  analytics: {
    eyebrow: 'Readiness analytics',
    title: 'Convert practice data into a study plan.',
    desc: 'Trends, radar charts, weak areas, recent sessions, and weekly plans help users improve instead of guessing.',
    icon: BarChart3,
    actions: ['Score trends', 'Weak signals', 'Weekly plan'],
    stats: [
      { label: 'Charts', value: 'Radar + trend' },
      { label: 'Focus', value: 'Weak areas' },
      { label: 'Loop', value: 'Practice again' },
    ],
  },
  coach: {
    eyebrow: 'Communication coach',
    title: 'Train speaking structure, confidence, and delivery.',
    desc: 'Daily drills and speaking rules help users reduce filler words, answer clearly, and sound more confident.',
    icon: AudioLines,
    actions: ['Filler reduction', 'STAR structure', 'Daily drills'],
    stats: [
      { label: 'Coach', value: 'Personalized' },
      { label: 'Skill', value: 'Delivery' },
      { label: 'Habit', value: 'Daily' },
    ],
  },
}

const ICONS = [Activity, Gauge, Timer, ShieldCheck, Trophy, Lightbulb, Route, Target, Zap]

export default function AdvancedToolPanel({ type = 'dashboard', compact = false }) {
  const data = PANEL_DATA[type] || PANEL_DATA.dashboard
  const Icon = data.icon || Trophy

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#07111f_0%,#0b1726_48%,#12312f_100%)] p-5 text-white shadow-xl"
    >
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(20,184,166,0.16),transparent_35%),linear-gradient(320deg,rgba(251,191,36,0.12),transparent_38%)]" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-teal-100">
              <Icon className="h-3.5 w-3.5" /> {data.eyebrow}
            </div>
            <h3 className="text-2xl font-black leading-tight md:text-3xl">{data.title}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/68">{data.desc}</p>

            {!compact && (
              <div className="mt-5 flex flex-wrap gap-2">
                {data.actions.map((action, index) => {
                  const ActionIcon = ICONS[index % ICONS.length]
                  return (
                    <span key={action} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/78">
                      <ActionIcon className="h-3.5 w-3.5 text-amber-200" />
                      {action}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {data.stats.map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.06] p-3 sm:p-4 flex flex-col justify-between min-w-0">
                <div className="text-xs sm:text-sm md:text-base lg:text-xs xl:text-lg font-black text-white leading-tight break-words">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/45 truncate">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {data.actions.map(action => (
            <div key={action} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2 text-xs text-white/68">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-200" />
              Ready: {action}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

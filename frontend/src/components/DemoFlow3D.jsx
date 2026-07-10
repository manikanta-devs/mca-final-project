import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Brain, FileText, Mic, Target, Zap } from 'lucide-react'

const STEPS = [
  {
    icon: FileText,
    title: 'Resume Intelligence',
    detail: 'Extract skills, score resume, detect job-fit gaps',
    accent: 'from-emerald-300 to-teal-300',
    metric: 'Fit gaps',
  },
  {
    icon: Brain,
    title: 'Question Engine',
    detail: 'Shift difficulty by resume context and score',
    accent: 'from-cyan-300 to-indigo-300',
    metric: 'Adaptive Qs',
  },
  {
    icon: Mic,
    title: 'Speech Chamber',
    detail: 'Process transcript, voice latency, fillers, speed',
    accent: 'from-rose-300 to-amber-300',
    metric: 'Live transcript',
  },
  {
    icon: Target,
    title: 'AI Evaluator',
    detail: 'Score clarity, relevance, confidence, and depth',
    accent: 'from-amber-300 to-orange-300',
    metric: 'Rubric',
  },
  {
    icon: BarChart3,
    title: 'Analytics Loop',
    detail: 'Track trends, weak areas, study plan, next drills',
    accent: 'from-violet-300 to-cyan-300',
    metric: 'Next steps',
  },
]

export default function DemoFlow3D() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-12">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/70">
          <Zap className="h-4 w-4 text-amber-300" />
          3D demo flow for viva and project walkthrough
        </div>
        <h2 className="text-3xl font-black md:text-4xl">Show the complete system in one scene</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/45 md:text-base">
          A single end-to-end flow that explains how the platform moves from resume input to interview practice, evaluation, and improvement analytics.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(20,184,166,0.14),transparent_36%),linear-gradient(320deg,rgba(251,191,36,0.12),transparent_38%)]" />
        <div className="relative mx-auto max-w-6xl" style={{ perspective: '1300px' }}>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10"
            initial={{ rotateX: 18, rotateY: -8, rotateZ: -2, y: 35, opacity: 0 }}
            whileInView={{ rotateX: 0, rotateY: 0, rotateZ: 0, y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          >
            {STEPS.map(({ icon: Icon, title, detail, accent, metric }, index) => (
              <div
                key={title}
                className="relative rounded-2xl border border-white/[0.06] bg-[#0c1420]/80 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between h-48 group hover:border-white/20 transition-all duration-300"
              >
                <div className="absolute -top-3.5 -right-3.5 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black font-mono text-white/45">
                  0{index + 1}
                </div>
                <div>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center p-2 mb-4 text-slate-950`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-white group-hover:text-teal-355 transition-colors">{title}</h3>
                  <p className="text-[10px] text-white/45 leading-normal mt-1 font-semibold">{detail}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-[9px] font-mono uppercase tracking-wider text-white/35">
                  <span>Audit segment</span>
                  <span className="font-bold text-white/50">{metric}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

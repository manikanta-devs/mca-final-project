import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Brain, FileText, Mic, Sparkles, Target } from 'lucide-react'

const STEPS = [
  {
    icon: FileText,
    title: 'Resume Intelligence',
    detail: 'Extract skills, score resume, detect job-fit gaps',
    accent: 'from-emerald-300 to-teal-300',
    metric: '76% match',
  },
  {
    icon: Brain,
    title: 'Question Engine',
    detail: 'Generate role, difficulty, and resume-aware prompts',
    accent: 'from-cyan-300 to-blue-300',
    metric: 'Adaptive',
  },
  {
    icon: Mic,
    title: 'Live Interview',
    detail: 'Record voice/video, waveform, transcript, delivery signals',
    accent: 'from-rose-300 to-amber-300',
    metric: 'Live mic',
  },
  {
    icon: Target,
    title: 'AI Evaluation',
    detail: 'Score clarity, relevance, confidence, and depth',
    accent: 'from-amber-300 to-orange-300',
    metric: '82/100',
  },
  {
    icon: BarChart3,
    title: 'Analytics Loop',
    detail: 'Track trends, weak areas, study plan, next drills',
    accent: 'from-violet-300 to-cyan-300',
    metric: '+18%',
  },
]

export default function DemoFlow3D() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-12">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/70">
          <Sparkles className="h-4 w-4 text-amber-300" />
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
            className="grid gap-4 lg:grid-cols-5"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(58deg) rotateZ(-9deg)',
            }}
            initial={{ opacity: 0, y: 60, rotateX: 64 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 58 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {STEPS.map(({ icon: Icon, title, detail, accent, metric }, index) => (
              <motion.div
                key={title}
                className="relative min-h-[245px] rounded-2xl border border-white/10 bg-[#07111f]/95 p-4 shadow-2xl shadow-black/40"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${index % 2 === 0 ? 44 : 18}px)`,
                }}
                whileHover={{ y: -12, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                {index < STEPS.length - 1 && (
                  <div className="absolute left-[calc(100%-8px)] top-1/2 z-0 hidden h-1 w-8 -translate-y-1/2 bg-gradient-to-r from-cyan-300/80 to-amber-300/70 lg:block" />
                )}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-slate-950 shadow-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Stage {index + 1}</p>
                  <h3 className="mt-1 text-base font-black text-white">{title}</h3>
                </div>
                <p className="min-h-[58px] text-sm leading-relaxed text-white/52">{detail}</p>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">Signal</span>
                  <span className="text-sm font-black text-cyan-100">{metric}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1">
                  {[45, 72, 58, 88].map((height, barIndex) => (
                    <motion.span
                      key={barIndex}
                      className="block rounded-full bg-gradient-to-t from-teal-300 to-amber-200"
                      style={{ height }}
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: (index + barIndex) * 0.12 }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 mt-8 grid gap-3 md:grid-cols-3">
          {[
            'Evaluator can understand the complete app flow in under 30 seconds.',
            'Each stage maps directly to a real dashboard tool in the project.',
            'The demo path is simple: upload, practice, evaluate, improve.',
          ].map(item => (
            <div key={item} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/62">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

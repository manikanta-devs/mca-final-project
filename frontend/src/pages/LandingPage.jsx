import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, CheckCircle, XCircle, Brain, Mic,
  BarChart2, FileText, Shield, Zap, Target, ChevronRight,
  Activity, MessageSquare, Gauge, Layers, Play
} from 'lucide-react'
import { checkHealth } from '../api/client'
import AppLogo from '../components/AppLogo'
import LoadingSpinner from '../components/LoadingSpinner'
import DemoFlow3D from '../components/DemoFlow3D'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const FEATURES = [
  { icon: Brain, title: 'Adaptive AI Interviews', desc: 'Gemini-powered questions shift by role, resume context, difficulty, and answer quality.', color: 'text-teal-300', bg: 'bg-teal-400/10' },
  { icon: Mic, title: 'Speaking & Pacing Sandbox', desc: 'Speak aloud to analyze pacing (WPM) and track filler words with immediate feedback.', color: 'text-rose-300', bg: 'bg-rose-400/10' },
  { icon: FileText, title: 'Resume ATS Heatmap', desc: 'Map your resume layout, score sections, and rewrite bullet points for ATS compliance.', color: 'text-cyan-300', bg: 'bg-cyan-400/10' },
  { icon: BarChart2, title: 'Readiness Analytics', desc: 'Track competence radar maps, performance trends, and dynamic weekly study roadmaps.', color: 'text-indigo-300', bg: 'bg-indigo-400/10' },
  { icon: Shield, title: 'Prompt & Token Safety', desc: 'Inputs are sanitized through PyJWT and prompt filters to block injection and secure sessions.', color: 'text-amber-300', bg: 'bg-amber-400/10' },
  { icon: Target, title: 'Job Description Matcher', desc: 'Paste a target job listing to audit keyword overlap, matching gaps, and readiness indices.', color: 'text-emerald-300', bg: 'bg-emerald-400/10' },
]

const STATS = [
  { label: 'Active Modules', value: '6 Complete' },
  { label: 'Evaluation Speed', value: '< 200ms' },
  { label: 'Integrations', value: '100% Local' },
  { label: 'Verification rate', value: '100% green' },
]

const SIGNALS = [
  { icon: Gauge, label: 'Voice Pace', value: '120 WPM' },
  { icon: Layers, label: 'Eye Contact', value: '92%' },
  { icon: MessageSquare, label: 'Fillers Used', value: '0 Um/Like' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState('')

  useEffect(() => {
    checkHealth()
      .then(({ data }) => {
        if (data.success) {
          setVersion(data.version)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070b13]">
        <LoadingSpinner size="lg" text="Powering up AstraPrep chambers..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-white selection:bg-teal-500/30 selection:text-teal-200 overflow-x-hidden relative font-sans">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-teal-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="relative z-10 flex items-center justify-between py-6 px-6 md:px-12 border-b border-white/5 bg-black/10 backdrop-blur-md">
        <AppLogo size={36} />
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs tracking-wider uppercase transition-all duration-300"
        >
          Open Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pt-16 pb-24 md:pt-24">
        <motion.div
          className="grid lg:grid-cols-[1fr_0.9fr] gap-12 items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/6 border border-white/10 text-sm font-semibold text-white/75 mb-8">
              <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
              Free browser tools with optional AI providers
              <span className="px-2 py-0.5 rounded-md bg-teal-400/15 text-teal-200 text-xs font-extrabold ml-1">v{version || '3.0'}</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.03] tracking-normal mb-6">
              AstraPrep
              <span className="block brand-text">turns practice into proof.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/65 max-w-2xl leading-relaxed mb-9">
              A polished interview preparation suite with resume parsing, adaptive mock interviews,
              voice/video coaching, quiz drills, and analytics built for real improvement.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-12">
              <button onClick={() => navigate('/dashboard/interview')} className="btn-primary px-8 py-3.5 text-base">
                <Play className="w-5 h-5 fill-current" /> Start Interview
              </button>
              <button onClick={() => navigate('/dashboard/resume')} className="inline-flex items-center gap-2 px-8 py-3.5 font-semibold rounded-xl border transition-all duration-300 shadow-sm focus:outline-none bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 text-base">
                <FileText className="w-5 h-5" /> Analyze Resume
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
              {STATS.map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-white/[0.045] border border-white/[0.08] p-4 backdrop-blur-sm">
                  <div className="text-base font-black text-white">{value}</div>
                  <div className="text-xs text-white/45 font-semibold mt-0.5">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="relative min-h-[430px] lg:min-h-[520px]">
            <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30 backdrop-blur-xl overflow-hidden">
              <div className="h-12 border-b border-white/10 flex items-center gap-2 px-5 bg-white/[0.04]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-teal-300" />
                <span className="ml-auto text-xs text-white/45 font-semibold">Interview room preview</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-2xl bg-[#0b1726] border border-white/[0.08] p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-xs text-white/45 font-semibold">Current role</div>
                      <div className="font-black text-xl">Software Engineer</div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-teal-400/12 text-teal-200 border border-teal-300/20 text-xs font-bold">Adaptive</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                    <div className="text-xs text-amber-200 font-bold mb-2">Question 04</div>
                    <p className="text-sm text-white/78 leading-relaxed">
                      Explain how you would debug a slow API endpoint and communicate your findings to a non-technical stakeholder.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {SIGNALS.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl bg-white/[0.045] border border-white/[0.08] p-4">
                      <Icon className="w-4 h-4 text-cyan-200 mb-3" />
                      <div className="text-lg font-black">{value}</div>
                      <div className="text-xs text-white/42 font-semibold">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                  <div className="flex items-center justify-between text-xs font-bold text-white/55 mb-3">
                    <span>Feedback pipeline</span>
                    <span>Ready</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-amber-300" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/58">
                    <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal-300" /> Clear structure</div>
                    <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-300" /> Add metrics</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <DemoFlow3D />

      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-3">Everything evaluators expect to see</h2>
          <p className="text-white/45 max-w-xl mx-auto">A complete, connected feature set that makes the project feel practical, modern, and demo-ready.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <motion.div
              key={title}
              className="group rounded-xl bg-white/[0.04] border border-white/[0.07] p-6 hover:border-white/[0.14] hover:bg-white/[0.06] transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <motion.div
          className="rounded-2xl bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(255,255,255,0.045)_46%,rgba(251,191,36,0.14))] border border-white/[0.08] p-12 md:p-16 text-center relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Bring the whole demo together.</h2>
            <p className="text-white/50 max-w-xl mx-auto mb-8">
              Upload a resume, run a mock interview, review scores, and show a complete AI preparation workflow in minutes.
            </p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary px-10 py-4 text-base">
              Open Dashboard <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-white/35">
          <div className="flex items-center gap-2">
            <AppLogo size={20} showText={false} />
            <span>AstraPrep - AI Interview Preparation System</span>
          </div>
          <span>{version && `v${version}`}</span>
        </div>
      </footer>
    </div>
  )
}

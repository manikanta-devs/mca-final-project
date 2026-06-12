import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, ArrowRight, CheckCircle, XCircle, Brain, Mic,
  BarChart2, FileText, Shield, Zap, Target, ChevronRight,
  Activity, MessageSquare, Gauge, Layers
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
  { icon: Mic, title: 'Voice Confidence Signals', desc: 'Practice live speaking with clarity, pacing, filler-word, and confidence feedback.', color: 'text-cyan-300', bg: 'bg-cyan-400/10' },
  { icon: BarChart2, title: 'Performance Analytics', desc: 'Track trends, weak skills, grades, session history, and recommended study focus.', color: 'text-amber-300', bg: 'bg-amber-400/10' },
  { icon: FileText, title: 'Resume Intelligence', desc: 'Extract skills from resumes and turn them into personalized preparation paths.', color: 'text-emerald-300', bg: 'bg-emerald-400/10' },
  { icon: Target, title: 'Targeted Quiz Drills', desc: 'Practice coding, Python, SQL, aptitude, and HR topics with focused MCQ rounds.', color: 'text-orange-300', bg: 'bg-orange-400/10' },
  { icon: Shield, title: 'Communication Coach', desc: 'Build structured answers, stronger delivery, and daily speaking discipline.', color: 'text-rose-300', bg: 'bg-rose-400/10' },
]

const STATS = [
  { label: 'AI Engine', value: 'Free-first' },
  { label: 'Interview Modes', value: 'Text + Voice + Video' },
  { label: 'Practice Tracks', value: '6 Modules' },
  { label: 'Feedback Loop', value: 'Live' },
]

const SIGNALS = [
  { icon: Gauge, label: 'Confidence', value: '82%' },
  { icon: MessageSquare, label: 'Answer depth', value: 'Strong' },
  { icon: Layers, label: 'Skill match', value: '76%' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking')
  const [version, setVersion] = useState('')

  useEffect(() => {
    checkHealth()
      .then(({ data }) => {
        setStatus('connected')
        setVersion(data.version || '3.0.0')
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-[#06101b] text-white overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(140deg,rgba(20,184,166,0.14),transparent_34%),linear-gradient(315deg,rgba(251,191,36,0.11),transparent_36%),linear-gradient(180deg,#06101b_0%,#0a1624_46%,#07111f_100%)]" />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <motion.nav
        className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AppLogo size={36} showText />
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              borderColor: status === 'connected' ? 'rgba(34,197,94,0.3)' : status === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
              background: status === 'connected' ? 'rgba(34,197,94,0.08)' : status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
            }}
          >
            {status === 'checking' && <LoadingSpinner size="sm" color="white" />}
            {status === 'connected' && <><Activity className="w-3.5 h-3.5 text-green-400" /> <span className="text-green-300">API Live</span></>}
            {status === 'error' && <><XCircle className="w-3.5 h-3.5 text-red-400" /> <span className="text-red-300">Offline</span></>}
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm">
            Launch App <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.nav>

      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-14 md:pt-24 pb-16">
        <motion.div
          className="grid lg:grid-cols-[1fr_0.9fr] gap-12 items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/6 border border-white/10 text-sm font-semibold text-white/75 mb-8">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Free browser tools with optional AI providers
              <span className="px-2 py-0.5 rounded-md bg-teal-400/15 text-teal-200 text-xs font-extrabold ml-1">v{version || '3.0'}</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.03] tracking-normal mb-6">
              AstraPrep AI
              <span className="block brand-text">turns practice into proof.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/65 max-w-2xl leading-relaxed mb-9">
              A polished interview preparation suite with resume parsing, adaptive mock interviews,
              voice/video coaching, quiz drills, and analytics built for real improvement.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-12">
              <button onClick={() => navigate('/dashboard/interview')} className="btn-primary px-8 py-3.5 text-base">
                <Sparkles className="w-5 h-5" /> Start AI Interview
              </button>
              <button onClick={() => navigate('/dashboard/resume')} className="btn-secondary px-8 py-3.5 text-base bg-white/6 border-white/10 text-white hover:bg-white/10 hover:border-white/20">
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
                <span className="ml-auto text-xs text-white/45 font-semibold">Live mock interview</span>
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
                    <span>Answer quality</span>
                    <span>78%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-amber-300" />
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
            <span>AstraPrep AI - Built with Gemini AI</span>
          </div>
          <span>{version && `v${version}`}</span>
        </div>
      </footer>
    </div>
  )
}

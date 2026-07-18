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
  const [avatarPreviewState, setAvatarPreviewState] = useState('speaking')
  const [avatarPreviewPersona, setAvatarPreviewPersona] = useState('sarah')

  const avatarPreviewSources = {
    sarah: {
      name: 'Sarah Chen',
      title: 'Senior HR Director',
      speaking: '/interviewers/sarah_chen_speaking.mp4',
      idle: '/interviewers/sarah_chen_idle.mp4',
      thinking: '/interviewers/sarah_chen_thinking.mp4',
    },
    marcus: {
      name: 'Marcus Rodriguez',
      title: 'Technical Lead',
      speaking: '/interviewers/marcus_rodriguez_speaking.mp4',
      idle: '/interviewers/marcus_rodriguez_idle.mp4',
      thinking: '/interviewers/marcus_rodriguez_thinking.mp4',
    },
  }

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
        <LoadingSpinner size="lg" text="Powering up TalentForge chambers..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-white selection:bg-teal-500/30 selection:text-teal-200 overflow-x-hidden relative font-sans">
      {/* Premium ambient decorative grid & glowing spheres */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-30" />
      <motion.div 
        className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-teal-600/10 rounded-full blur-[140px] pointer-events-none"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Top Navbar */}
      <nav className="relative z-10 flex items-center justify-between py-6 px-6 md:px-12 border-b border-white/5 bg-[#070b13]/40 backdrop-blur-md">
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
          className="flex flex-col items-center text-center justify-center max-w-4xl mx-auto"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col items-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-sm font-semibold text-white/75 mb-8"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
            >
              <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
              Free browser tools with optional AI providers
              <span className="px-2 py-0.5 rounded-md text-xs font-extrabold ml-1"
                style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(20,184,166,0.3)', color: '#5eead4' }}
              >v{version || '3.0'}</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.03] tracking-normal mb-6">
              TalentForge
              <span className="block brand-text">turns practice into proof.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/65 max-w-2xl leading-relaxed mb-9">
              A polished interview preparation suite with resume parsing, adaptive mock interviews,
              voice/video coaching, quiz drills, and analytics built for real improvement.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center mb-12">
              <button onClick={() => navigate('/dashboard/interview')} className="btn-primary px-8 py-3.5 text-base">
                <Play className="w-5 h-5 fill-current" /> Start Interview
              </button>
              <button onClick={() => navigate('/dashboard/resume')} className="inline-flex items-center gap-2 px-8 py-3.5 font-semibold rounded-xl border transition-all duration-300 shadow-sm focus:outline-none bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 text-base">
                <FileText className="w-5 h-5" /> Analyze Resume
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
              {STATS.map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-white/[0.08] p-4 backdrop-blur-sm text-center"
                  style={{ background: 'rgba(255,255,255,0.035)' }}
                >
                  <div className="text-lg font-black text-white mb-0.5">{value}</div>
                  <div className="text-xs text-white/40 font-semibold">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
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
              className="group rounded-xl border border-white/[0.07] p-6 hover:border-white/[0.14] transition-all duration-300 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              {/* Subtle corner glow on hover */}
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
                style={{ background: bg.replace('/10', '/30') }}
              />
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
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
            <span>TalentForge - AI Interview Preparation System</span>
          </div>
          <span>{version && `v${version}`}</span>
        </div>
      </footer>
    </div>
  )
}

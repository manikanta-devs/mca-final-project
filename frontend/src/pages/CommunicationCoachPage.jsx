import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle, Brain, Camera, Mic, RefreshCcw, Sparkles, Target, Volume2 } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getCommunicationCoach, getAnalyticsSummary } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'

export default function CommunicationCoachPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [coach, setCoach] = useState(null)
  const [summary, setSummary] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [coachRes, summaryRes] = await Promise.allSettled([
        getCommunicationCoach(),
        getAnalyticsSummary(),
      ])

      if (coachRes.status === 'fulfilled') setCoach(coachRes.value.data.communication_coach)
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data.summary)
    } catch (err) {
      toast.error('Failed to load communication coach')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading communication coach..." /></div>
  }

  const metrics = [
    { label: 'Average score', value: `${summary?.avg_overall ?? 0}%` },
    { label: 'Voice delivery', value: `${coach?.focus_modes?.includes('Polish') ? 'polish' : 'practice'}` },
    { label: 'Sessions', value: summary?.total_sessions ?? 0 },
  ]

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <AdvancedToolPanel type="coach" />

      <div className="card bg-gradient-to-br from-gray-950 via-slate-900 to-primary-950 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 grid lg:grid-cols-[1.3fr_0.7fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Communication-first interview training
            </div>
            <h2 className="text-3xl md:text-5xl font-black leading-tight mb-4">
              Learn to answer clearly, confidently, and without rambling.
            </h2>
            <p className="text-white/75 text-base md:text-lg max-w-2xl leading-relaxed mb-6">
              This coach is built for people who know the content but struggle to say it well.
              Practice structure, reduce filler words, and train your speaking style for real interview rounds.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/dashboard/interview')} className="btn-primary bg-white text-gray-950 hover:bg-gray-100">
                Start a mock interview <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={loadData} className="btn-ghost text-white border-white/15 hover:bg-white/10">
                <RefreshCcw className="w-4 h-4" /> Refresh plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {metrics.map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-white/60 mb-1">{label}</div>
                <div className="text-2xl font-black text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-5">
        <div className="card border-primary-100 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-900">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-primary-600 text-white flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Coach summary</h3>
              <p className="text-sm text-gray-500">What your practice should focus on next</p>
            </div>
          </div>

          <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">{coach?.headline}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{coach?.summary}</p>

          <div className="flex flex-wrap gap-2 mb-5">
            {coach?.focus_modes?.map(mode => (
              <span key={mode} className="badge badge-blue">{mode}</span>
            ))}
          </div>

          <div className="space-y-3">
            {(coach?.weak_signals || []).map(signal => (
              <div key={signal} className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Watch this signal</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{signal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Daily speaking drills</h3>
              <p className="text-sm text-gray-500">Short tasks that build interview communication fast</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {coach?.daily_drills?.map((drill, index) => (
              <div key={drill} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary-500 mb-1">Drill {index + 1}</div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{drill}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-gray-950 text-white p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-primary-300" />
              <h4 className="font-bold">Speaking rules</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              {coach?.speaking_rules?.map(rule => (
                <li key={rule} className="flex items-start gap-2">
                  <span className="text-primary-300 mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <button onClick={() => navigate('/dashboard/analytics')} className="btn-secondary w-full justify-center">
            Review analytics <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card bg-slate-950 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 right-0 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 grid md:grid-cols-[0.85fr_1.15fr] gap-6 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold mb-4">
              <Camera className="w-3.5 h-3.5" />
              Free browser tools only
            </div>
            <h3 className="text-2xl md:text-3xl font-black leading-tight mb-3">Practice without buying anything extra.</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              The communication coach is built around browser speech input, local feedback, and short drills so users can train every day without a paid stack.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'SpeechRecognition for live speaking practice',
              'Timer-based drills for pacing and structure',
              'Transcript feedback for filler-word reduction',
              'Analytics-driven daily focus without premium tools',
            ].map(item => (
              <div key={item} className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm text-sm text-white/80">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Practice tracks</h3>
            <p className="text-sm text-gray-500">Use these during mock sessions or daily speaking practice</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {coach?.practice_tracks?.map(track => (
            <div key={track.title} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="font-bold text-gray-900 dark:text-white mb-2">{track.title}</div>
              <p className="text-sm text-gray-500 leading-relaxed">{track.goal}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pb-6">
        <button onClick={() => navigate('/dashboard/interview')} className="btn-primary flex-1 justify-center">
          Begin practice interview
        </button>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1 justify-center">
          Back to dashboard
        </button>
      </div>
    </motion.div>
  )
}

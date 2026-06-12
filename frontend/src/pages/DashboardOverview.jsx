import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, FileText, Mic, Brain, ArrowRight,
  TrendingUp, Target, Clock, Award, ChevronRight
} from 'lucide-react'
import { getAnalyticsSummary, getAnalyticsSessions } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import FreeStackPanel from '../components/FreeStackPanel'
import AdvancedToolPanel from '../components/AdvancedToolPanel'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const QUICK_ACTIONS = [
  { icon: Sparkles,  label: 'AI Interview',    desc: 'Start a mock interview session', path: '/dashboard/interview', gradient: 'from-teal-500/10 to-cyan-500/10', iconColor: 'text-teal-500' },
  { icon: FileText,  label: 'Resume Analysis', desc: 'Upload and analyze your resume',  path: '/dashboard/resume',    gradient: 'from-emerald-500/10 to-cyan-500/10',  iconColor: 'text-emerald-500' },
  { icon: Brain,     label: 'Quiz Practice',   desc: 'Sharpen weak areas with drills',  path: '/dashboard/quiz',      gradient: 'from-orange-500/10 to-amber-500/10',  iconColor: 'text-orange-500' },
  { icon: Mic,       label: 'Coach',           desc: 'Improve speaking and structure',  path: '/dashboard/coach',     gradient: 'from-fuchsia-500/10 to-pink-500/10',  iconColor: 'text-fuchsia-500' },
]

function AnimatedCounter({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (typeof value !== 'number' || value === 0) { setDisplay(value || 0); return }
    let start = 0
    const increment = Math.max(1, Math.floor(value / 30))
    const timer = setInterval(() => {
      start += increment
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(start)
    }, 30)
    return () => clearInterval(timer)
  }, [value])
  return <>{display}{suffix}</>
}

export default function DashboardOverview() {
  const navigate = useNavigate()
  const { resumeData } = useApp()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])

  useEffect(() => {
    Promise.allSettled([
      getAnalyticsSummary(),
      getAnalyticsSessions(3),
    ]).then(([sumRes, sessRes]) => {
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data.summary)
      if (sessRes.status === 'fulfilled') setRecentSessions(sessRes.value.data.sessions || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading dashboard..." /></div>
  }

  const hasData = summary && summary.total_sessions > 0

  const statCards = hasData ? [
    { icon: Target,     label: 'Avg Score',    value: summary.avg_overall,    suffix: '%', color: 'text-primary-600 dark:text-primary-400' },
    { icon: TrendingUp, label: 'Improvement',  value: summary.improvement_rate, suffix: '%', color: summary.improvement_rate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
    { icon: Award,      label: 'Best Score',   value: summary.best_score,     suffix: '%', color: 'text-amber-600 dark:text-amber-400' },
    { icon: Clock,      label: 'Sessions',     value: summary.total_sessions, suffix: '',  color: 'text-blue-600 dark:text-blue-400' },
  ] : []

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">
      {/* Welcome hero */}
      <motion.div
        variants={fadeUp}
        className="card bg-[linear-gradient(135deg,#07111f_0%,#0b1726_48%,#12312f_100%)] text-white border-none shadow-xl overflow-hidden relative"
      >
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(20,184,166,0.16),transparent_35%),linear-gradient(320deg,rgba(251,191,36,0.14),transparent_38%)]" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {hasData ? 'Welcome back - your data is ready' : 'Welcome to AstraPrep AI'}
          </div>
          <h2 className="text-2xl md:text-4xl font-black leading-tight mb-3">
            {hasData
              ? `${summary.total_sessions} session${summary.total_sessions !== 1 ? 's' : ''} completed. Keep the streak going.`
              : 'Start your first AI-powered mock interview today.'
            }
          </h2>
          <p className="text-white/60 max-w-2xl leading-relaxed mb-5">
            {hasData
              ? 'Your analytics show real progress. Use the quick actions below to keep building interview strength across every module.'
              : 'Upload your resume, practice with AI-generated questions, and track your improvement over time.'
            }
          </p>
          <button
            onClick={() => navigate('/dashboard/interview')}
            className="btn-primary bg-white text-gray-950 hover:bg-gray-100"
          >
            Start Interview <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <AdvancedToolPanel type="dashboard" />
      </motion.div>

      {/* Stats row */}
      {hasData && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, label, value, suffix, color }) => (
            <div key={label} className="card flex items-center gap-4 hover-lift">
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-black ${color}`}>
                  <AnimatedCounter value={value} suffix={suffix} />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div variants={fadeUp}>
        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(({ icon: Icon, label, desc, path, gradient, iconColor }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`card text-left group hover-lift cursor-pointer bg-gradient-to-br ${gradient}`}
            >
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">{label}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mt-3 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <FreeStackPanel />
      </motion.div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <motion.div variants={fadeUp} className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Recent Sessions</h3>
            <button onClick={() => navigate('/dashboard/analytics')} className="btn-ghost text-sm">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentSessions.map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/dashboard/results/${s.id}`)}
                className="w-full flex items-center justify-between rounded-2xl border border-gray-100 dark:border-white/5 p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all text-left"
              >
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{s.candidate_name}</div>
                  <div className="text-xs text-gray-500 capitalize">{s.role?.replace('_', ' ')} - {s.interview_format || 'voice'}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-black ${s.overall_score >= 70 ? 'text-emerald-600' : s.overall_score >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                    {s.overall_score}%
                  </div>
                  <div className="text-xs text-gray-400">{s.grade}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Resume status */}
      <motion.div variants={fadeUp} className="card">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
            <FileText className={`w-5 h-5 ${resumeData ? 'text-emerald-500' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white">
              {resumeData ? 'Resume loaded and analyzed' : 'No resume uploaded yet'}
            </div>
            <p className="text-xs text-gray-500">
              {resumeData
                ? `${resumeData.skills?.all?.length || 0} skills detected - questions will be personalized`
                : 'Upload your resume to unlock personalized questions and job-match scoring'
              }
            </p>
          </div>
          {!resumeData && (
            <button onClick={() => navigate('/dashboard/resume')} className="btn-ghost text-sm">
              Upload <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

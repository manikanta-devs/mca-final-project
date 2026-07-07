import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, FileText, Mic, Brain, ArrowRight,
  TrendingUp, Target, Clock, Award, ChevronRight,
  Trophy, Flame, Check, AlertTriangle, Shield, Play, Map
} from 'lucide-react'
import { getAnalyticsSummary, getAnalyticsSessions, injectMockSession, getQuizSessions } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'
import AdaptiveEngineStatus from '../components/AdaptiveEngineStatus'
import { clsx } from 'clsx'

// Stagger motions
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function DashboardOverview() {
  const navigate = useNavigate()
  const { resumeData, candidateName } = useApp()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])
  const [quizSessions, setQuizSessions] = useState([])
  const [targetCompany, setTargetCompany] = useState('Google')
  const [targetRole, setTargetRole] = useState('Software Engineer')

  useEffect(() => {
    Promise.allSettled([
      getAnalyticsSummary(),
      getAnalyticsSessions(3),
      getQuizSessions(),
    ]).then(([sumRes, sessRes, quizRes]) => {
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data.summary)
      if (sessRes.status === 'fulfilled') setRecentSessions(sessRes.value.data.sessions || [])
      if (quizRes.status === 'fulfilled') setQuizSessions(quizRes.value.data.sessions || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading dashboard command center..." /></div>
  }

  const hasData = summary && summary.total_sessions > 0
  const overallReadiness = hasData ? summary.avg_overall : 74
  const practiceTime = hasData ? (summary.total_sessions * 22) : 18 // simulated time

  // Define Connected Workflow Steps
  const workflowSteps = [
    { id: 'resume', label: 'Resume Analysis', status: resumeData ? 'completed' : 'active' },
    { id: 'roadmap', label: 'Study Roadmap', status: !resumeData ? 'locked' : (quizSessions.length === 0 ? 'active' : 'completed') },
    { id: 'quiz', label: 'Quiz Practice', status: !resumeData ? 'locked' : (quizSessions.length === 0 ? 'active' : 'completed') },
    { id: 'interview', label: 'Mock Interview', status: !resumeData || quizSessions.length === 0 ? 'locked' : (recentSessions.length === 0 ? 'active' : 'completed') },
    { id: 'analytics', label: 'Analytics Insights', status: recentSessions.length > 0 ? 'active' : 'locked' }
  ]

  // Compute Dynamic Recommendation
  let recommendation = {
    title: "Upload your Resume",
    text: "Let AI analyze your skills, projects, and experience to customize your preparation journey.",
    action: "Go to Upload",
    path: "/dashboard/resume"
  }

  if (resumeData) {
    if (quizSessions.length === 0) {
      recommendation = {
        title: "Take a Topic Quiz",
        text: "Test your CS foundation and logic skills to calibrate the adaptive assessment engine.",
        action: "Start Quiz",
        path: "/dashboard/quiz"
      }
    } else if (recentSessions.length === 0) {
      recommendation = {
        title: "Attempt a Mock Interview",
        text: "Generate resume-aware questions and practice speaking with your interactive AI interviewer.",
        action: "Start Interview",
        path: "/dashboard/interview"
      }
    } else {
      recommendation = {
        title: "Review Performance Analytics",
        text: "Analyze your speech pacing, filler word ratios, and technical scores to find areas of growth.",
        action: "View Analytics",
        path: "/dashboard/analytics"
      }
    }
  }

  // Calculate overall progress completion percentage
  const completedStepsCount = workflowSteps.filter(s => s.status === 'completed').length
  const progressPercent = Math.round((completedStepsCount / workflowSteps.length) * 100)

  // Smart Quick Actions (Prioritized based on lowest scores/weak areas)
  // Default values
  const baseActions = [
    { id: 'quiz', icon: Brain, label: 'Start SQL Quiz', desc: 'Your weakest area is SQL databases.', path: '/dashboard/quiz', iconColor: 'text-orange-500', isRecommended: true },
    { id: 'interview', icon: Sparkles, label: 'Mock Interview', desc: 'Start a mock interview session', path: '/dashboard/interview', iconColor: 'text-teal-500', isRecommended: false },
    { id: 'resume', icon: FileText, label: 'Resume Coach', desc: 'Audited checklist and scanner', path: '/dashboard/resume', iconColor: 'text-emerald-500', isRecommended: false },
    { id: 'coach', icon: Mic, label: 'Communication Coach', desc: 'Improve speaking and structure', path: '/dashboard/coach', iconColor: 'text-fuchsia-500', isRecommended: false },
  ]

  // If we have data, we sort recommendation
  let actions = [...baseActions]
  if (hasData) {
    const techScore = summary.avg_technical || 0
    const clarityScore = summary.avg_clarity || 0
    if (clarityScore < techScore) {
      // Prioritize Communication Coach
      actions = [
        { id: 'coach', icon: Mic, label: 'Communication Drill', desc: 'Pacing & filler word counts need tuning.', path: '/dashboard/coach', iconColor: 'text-fuchsia-500', isRecommended: true },
        { id: 'interview', icon: Sparkles, label: 'Mock Interview', desc: 'Start a mock interview session', path: '/dashboard/interview', iconColor: 'text-teal-500', isRecommended: false },
        { id: 'quiz', icon: Brain, label: 'Today\'s Quiz', desc: 'Sharpen CS fundamentals with drills', path: '/dashboard/quiz', iconColor: 'text-orange-500', isRecommended: false },
        { id: 'resume', icon: FileText, label: 'Resume Coach', desc: 'Audited checklist and scanner', path: '/dashboard/resume', iconColor: 'text-emerald-500', isRecommended: false },
      ]
    }
  }

  // Heatmap contribution blocks (simulated GitHub style)
  const heatmapWeeks = Array.from({ length: 15 }, (_, i) => {
    return Array.from({ length: 7 }, (_, j) => {
      const active = Math.random() > 0.4
      const level = active ? Math.floor(Math.random() * 4) + 1 : 0
      return { level }
    })
  })

  // Badges / Achievements
  const achievements = [
    { id: 'first', icon: Trophy, label: 'First Contact', desc: 'Completed first mock session', unlocked: hasData },
    { id: 'streak', icon: Flame, label: '7-Day Streak', desc: 'Consistent practice habit', unlocked: hasData && summary.total_sessions >= 3 },
    { id: 'sql', icon: Shield, label: 'SQL Master', desc: '100% accuracy in query drills', unlocked: hasData && summary.best_score >= 90 },
    { id: 'debug', icon: Award, label: 'Debug Master', desc: 'Resolved complex logical bugs', unlocked: true }
  ]

  return (
    <motion.div className="space-y-6 select-none" variants={stagger} initial="hidden" animate="visible">
      
      {/* AI Daily Mission Card */}
      <motion.div variants={fadeUp} className="card bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden text-white">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(34,197,94,0.1),transparent_26%)]" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] block mb-1">Today's AI Command Center</span>
              <h2 className="text-2xl lg:text-3xl font-black">Interactive Practice Pathway</h2>
            </div>

            {/* Workflow steps */}
            <div className="flex flex-wrap items-center gap-2 py-1">
              {workflowSteps.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all",
                    step.status === 'completed' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                    step.status === 'active' && "bg-indigo-500/20 border-indigo-500/30 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]",
                    step.status === 'locked' && "bg-white/[0.02] border-white/5 text-gray-500 opacity-60"
                  )}>
                    {step.status === 'completed' ? (
                      <Check className="w-3 h-3" />
                    ) : step.status === 'active' ? (
                      <Sparkles className="w-3 h-3 animate-pulse" />
                    ) : (
                      <Shield className="w-3 h-3" />
                    )}
                    <span>{step.label}</span>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Dynamic recommendation */}
            <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">Today's Recommendation</span>
                <h4 className="text-sm font-bold text-white mb-0.5">{recommendation.title}</h4>
                <p className="text-xs text-gray-300 font-normal leading-normal">{recommendation.text}</p>
              </div>
              <button 
                onClick={() => navigate(recommendation.path)}
                className="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>{recommendation.action}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
              <div>
                <div className="text-lg font-black text-indigo-400">
                  {resumeData?.score || 70}%
                </div>
                <div className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Resume Score</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-400">
                  {overallReadiness}%
                </div>
                <div className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Ready Index</div>
              </div>
              <div>
                <div className="text-lg font-black text-cyan-400">
                  {practiceTime}m
                </div>
                <div className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Practice Time</div>
              </div>
            </div>
          </div>

          {/* Progress gauge */}
          <div className="flex flex-col justify-center items-center bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Overall Progress</span>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="8" strokeDasharray={251} strokeDashoffset={251 - (251 * progressPercent) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <div className="text-2xl font-black">{progressPercent}%</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Mission</div>
              </div>
            </div>
            <button
              onClick={() => navigate(recommendation.path)}
              className="btn bg-white hover:bg-gray-100 text-gray-950 text-xs w-full py-2.5 rounded-xl font-bold mt-4 flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-gray-950" />
              Continue Mission
            </button>
          </div>
        </div>
      </motion.div>

      {/* Adaptive engine & alerts */}
      <motion.div variants={fadeUp}>
        <AdaptiveEngineStatus />
      </motion.div>

      <motion.div variants={fadeUp}>
        <AdvancedToolPanel type="dashboard" />
      </motion.div>

      {/* Main Grid: Left Side actions/feed, Right Side targets/achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Smart Quick Actions */}
          <div className="card space-y-4">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Smart Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className={clsx(
                    'text-left p-4 rounded-2xl border transition-all relative group flex flex-col justify-between h-36',
                    action.isRecommended
                      ? 'border-violet-500/40 bg-violet-600/[0.02] dark:bg-violet-600/[0.04]'
                      : 'border-gray-200 dark:border-gray-800 bg-transparent hover:border-gray-300 dark:hover:border-gray-700'
                  )}
                >
                  {action.isRecommended && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/15 text-[9px] font-black uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                  
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0">
                    <action.icon className={clsx('w-5 h-5', action.iconColor)} />
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-xs mb-1 flex items-center gap-1.5">
                      <span>{action.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-gray-500 leading-normal font-normal">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Practice Heatmap (GitHub contributions style) */}
          <div className="card space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Practice Consistency Heatmap</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Last 100 Days</span>
            </div>
            
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {heatmapWeeks.map((week, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 shrink-0">
                  {week.map((day, dIdx) => {
                    const color = {
                      0: 'bg-gray-100 dark:bg-gray-800/80',
                      1: 'bg-violet-600/20',
                      2: 'bg-violet-600/40',
                      3: 'bg-violet-600/70',
                      4: 'bg-violet-600'
                    }[day.level]

                    return (
                      <div
                        key={dIdx}
                        className={clsx('w-3.5 h-3.5 rounded', color)}
                        title={`Practice intensity level ${day.level}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-6">
          {/* Upcoming Target tracker */}
          <div className="card space-y-4 border border-cyan-500/10 bg-cyan-950/[0.01]">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <span className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest block">Upcoming Target</span>
                <h4 className="text-xs font-black text-gray-900 dark:text-white">Software Engineer at Google</h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 text-[9px] font-bold uppercase tracking-wider">
                Target Setup
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-normal">Hiring Readiness</span>
                <div className="text-lg font-black text-gray-900 dark:text-white">81%</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-normal">Est. Preparation time</span>
                <div className="text-lg font-black text-gray-900 dark:text-white">12 Days</div>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/80 pt-3">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Remaining Milestones</span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-500 font-normal">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span>Data Structures & Algorithms</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 font-normal">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span>SQL & Advanced Joins</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-normal">
                  <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center text-[10px] font-bold"></div>
                  <span>System Design Basics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges / Achievements Panel */}
          <div className="card space-y-4">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Achievements & Badges</h3>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map(badge => (
                <div
                  key={badge.id}
                  className={clsx(
                    'p-3.5 rounded-2xl border transition-all text-center flex flex-col items-center justify-center space-y-2',
                    badge.unlocked
                      ? 'border-violet-500/20 bg-violet-600/[0.01]'
                      : 'border-gray-100 dark:border-gray-800 bg-transparent opacity-40'
                  )}
                >
                  <div className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center border',
                    badge.unlocked
                      ? 'bg-violet-500/10 border-violet-500/20 text-violet-500'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 text-gray-400'
                  )}>
                    <badge.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white block">{badge.label}</span>
                    <span className="text-[8px] text-gray-400 font-normal block leading-tight mt-0.5">{badge.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

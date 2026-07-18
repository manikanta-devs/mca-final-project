import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, Mic, Brain, ArrowRight,
  TrendingUp, Target, Clock, Award, ChevronRight,
  Trophy, Flame, Check, AlertTriangle, Shield, Play, Map,
  Briefcase, Zap, Video
} from 'lucide-react'
import { getAnalyticsSummary, getAnalyticsSessions, getQuizSessions, getDashboardInsights } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'
import AdaptiveEngineStatus from '../components/AdaptiveEngineStatus'
import { clsx } from 'clsx'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function DashboardOverview() {
  const navigate = useNavigate()
  const { resumeData } = useApp()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])
  const [quizSessions, setQuizSessions] = useState([])
  const [dashboardInsights, setDashboardInsights] = useState(null)

  useEffect(() => {
    Promise.allSettled([
      getAnalyticsSummary(),
      getAnalyticsSessions(3),
      getQuizSessions(),
      getDashboardInsights(),
    ]).then(([sumRes, sessRes, quizRes, insightsRes]) => {
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data.summary)
      if (sessRes.status === 'fulfilled') setRecentSessions(sessRes.value.data.sessions || [])
      if (quizRes.status === 'fulfilled') setQuizSessions(quizRes.value.data.sessions || [])
      if (insightsRes.status === 'fulfilled') setDashboardInsights(insightsRes.value.data.insights)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <LoadingSpinner size="lg" text="Loading dashboard command center..." />
      </div>
    )
  }

  const hasData = summary && summary.total_sessions > 0
  const hasInsightData = dashboardInsights?.has_data
  const overallReadiness = hasData ? summary.avg_overall : 0
  const practiceTime = dashboardInsights?.practice_minutes ?? 0
  const topFocus = dashboardInsights?.top_focus || 'Complete a baseline interview'
  const trendDelta = dashboardInsights?.trend_delta ?? 0
  const streakDays = dashboardInsights?.current_streak_days ?? 0

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
        text: `Review your real trend and focus next on ${topFocus}.`,
        action: "View Analytics",
        path: "/dashboard/analytics"
      }
    }
  }

  const completedStepsCount = workflowSteps.filter(s => s.status === 'completed').length
  const progressPercent = Math.round((completedStepsCount / workflowSteps.length) * 100)

  const baseActions = [
    { id: 'quiz', icon: Brain, label: 'Start Topic Quiz', desc: hasData ? `Practice focus: ${topFocus}.` : 'Calibrate your readiness with a short drill.', path: '/dashboard/quiz', iconColor: 'text-orange-500 dark:text-orange-400', isRecommended: !resumeData },
    { id: 'interview', icon: Briefcase, label: 'Mock Interview', desc: 'Start a mock interview session', path: '/dashboard/interview', iconColor: 'text-indigo-650 dark:text-cyan-400', isRecommended: false },
    { id: 'video-interview', icon: Video, label: '3D Mock Interview', desc: 'Practice with immersive 3D digital avatars', path: '/dashboard/video-interview', iconColor: 'text-cyan-500 dark:text-cyan-400', isRecommended: false },
    { id: 'resume', icon: FileText, label: 'Resume Coach', desc: 'Audited checklist and scanner', path: '/dashboard/resume', iconColor: 'text-emerald-600 dark:text-emerald-400', isRecommended: false },
    { id: 'coach', icon: Mic, label: 'Communication Coach', desc: 'Improve speaking and structure', path: '/dashboard/coach', iconColor: 'text-fuchsia-600 dark:text-fuchsia-400', isRecommended: false },
  ]

  let actions = [...baseActions]
  if (hasData) {
    const techScore = summary.avg_technical || 0
    const clarityScore = summary.avg_clarity || 0
    if (clarityScore < techScore) {
      actions = [
        { id: 'coach', icon: Mic, label: 'Communication Drill', desc: 'Pacing & filler word counts need tuning.', path: '/dashboard/coach', iconColor: 'text-fuchsia-600 dark:text-fuchsia-400', isRecommended: true },
        { id: 'interview', icon: Briefcase, label: 'Mock Interview', desc: 'Start a mock interview session', path: '/dashboard/interview', iconColor: 'text-indigo-650 dark:text-cyan-400', isRecommended: false },
        { id: 'video-interview', icon: Video, label: '3D Mock Interview', desc: 'Immersive avatar technical session', path: '/dashboard/video-interview', iconColor: 'text-cyan-500 dark:text-cyan-400', isRecommended: false },
        { id: 'quiz', icon: Brain, label: 'Today\'s Quiz', desc: 'Sharpen CS fundamentals with drills', path: '/dashboard/quiz', iconColor: 'text-orange-500 dark:text-orange-400', isRecommended: false },
        { id: 'resume', icon: FileText, label: 'Resume Coach', desc: 'Audited checklist and scanner', path: '/dashboard/resume', iconColor: 'text-emerald-600 dark:text-emerald-400', isRecommended: false },
      ]
    }
  }

  const emptyHeatmap = Array.from({ length: 15 }, () => Array.from({ length: 7 }, () => ({ level: 0, count: 0 })))
  const heatmapWeeks = dashboardInsights?.heatmap_weeks || emptyHeatmap

  const achievements = [
    { id: 'first', icon: Trophy, label: 'First Contact', desc: 'Completed first mock session', unlocked: hasData },
    { id: 'streak', icon: Flame, label: '7-Day Streak', desc: 'Consistent practice habit', unlocked: hasData && summary.total_sessions >= 3 },
    { id: 'sql', icon: Shield, label: 'SQL Master', desc: '100% accuracy in query drills', unlocked: hasData && summary.best_score >= 90 },
    { id: 'debug', icon: Award, label: 'Debug Master', desc: 'Resolved complex logical bugs', unlocked: hasData && summary.best_score >= 85 }
  ]

  return (
    <motion.div 
      className="space-y-6 text-slate-800 dark:text-slate-100 select-none pb-12" 
      variants={stagger} 
      initial="hidden" 
      animate="visible"
    >
      {/* --- COMMAND HUB PANEL --- */}
      <motion.div 
        variants={fadeUp} 
        className="card relative overflow-hidden shadow-2xl p-6"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="absolute -top-20 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
          <div className="space-y-5">
            <div>
              <span className="text-[9px] font-mono tracking-widest text-indigo-650 dark:text-indigo-400 font-extrabold uppercase border-b border-indigo-500/20 pb-0.5">Today&apos;s Command Pathway</span>
              <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mt-1">Preparation Control Center</h2>
            </div>

            {/* Workflow steps */}
            <div className="flex flex-wrap items-center gap-2 py-1">
              {workflowSteps.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest border transition-all",
                    step.status === 'completed' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                    step.status === 'active' && "bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 shadow-md dark:shadow-[0_0_12px_rgba(99,102,241,0.1)]",
                    step.status === 'locked' && "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-gray-400 dark:text-gray-600 opacity-60"
                  )}>
                    {step.status === 'completed' ? (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : step.status === 'active' ? (
                      <Zap className="w-3 h-3 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                    ) : (
                      <Shield className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                    )}
                    <span>{step.label}</span>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-300 dark:text-gray-700 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Dynamic recommendation */}
            <div className="bg-slate-950/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[8px] font-mono tracking-widest text-indigo-600 dark:text-indigo-400 uppercase block mb-0.5">AI Suggestion</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">{recommendation.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 font-normal leading-normal">{recommendation.text}</p>
              </div>
              <button 
                onClick={() => navigate(recommendation.path)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/10"
              >
                <span>{recommendation.action}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Circular progress gauge with glow */}
          </div>

          <div className="flex flex-col justify-center items-center bg-slate-950/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5 p-5 rounded-2xl">
            <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase mb-3">Overall Progress</span>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="6" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#06b6d4" strokeWidth="6" strokeDasharray={251} strokeDashoffset={251 - (251 * progressPercent) / 100} strokeLinecap="round" className="glow-cyan" />
              </svg>
              <div className="absolute text-center">
                <div className="text-xl font-black text-slate-900 dark:text-white">{progressPercent}%</div>
                <div className="text-[8px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider font-mono">Mission</div>
              </div>
            </div>
            <button
              onClick={() => navigate(recommendation.path)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-gray-100 text-white dark:text-gray-950 text-xs font-mono font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Continue Mission</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* --- STANDALONE 4 METRIC CARDS WITH COLORED BORDERS --- */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 metric-card-cyan hover-lift flex flex-col justify-between h-24">
          <div className="flex justify-between items-center text-slate-400 dark:text-gray-500">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Resume ATS</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black score-gradient-cyan mt-1">
            {resumeData?.score || 0}%
          </div>
        </div>

        <div className="card p-4 metric-card-violet hover-lift flex flex-col justify-between h-24">
          <div className="flex justify-between items-center text-slate-400 dark:text-gray-500">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Ready Index</span>
            <Target className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black score-gradient-violet mt-1">
            {overallReadiness}%
          </div>
        </div>

        <div className="card p-4 metric-card-amber hover-lift flex flex-col justify-between h-24">
          <div className="flex justify-between items-center text-slate-450 dark:text-gray-500">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Practice Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black score-gradient-amber mt-1">
            {practiceTime}m
          </div>
        </div>

        <div className="card p-4 metric-card-emerald hover-lift flex flex-col justify-between h-24">
          <div className="flex justify-between items-center text-slate-450 dark:text-gray-500">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Active Streak</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black score-gradient-emerald mt-1">
            {streakDays}d
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

      {/* Main Grid: Left Side actions, Right Side intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Smart Quick Actions */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
              <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">Smart Action Nodes</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className={clsx(
                    'text-left p-4 rounded-2xl border transition-all relative group flex flex-col justify-between h-36',
                    action.isRecommended
                      ? 'recommended-card border-indigo-500/25 bg-indigo-500/[0.02] dark:bg-indigo-600/[0.01]'
                      : 'border-black/5 dark:border-white/5 bg-transparent hover:border-black/10 dark:hover:border-white/10'
                  )}
                >
                  {action.isRecommended && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 text-[8px] font-mono uppercase tracking-widest">
                      Priority
                    </span>
                  )}
                  
                  <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0">
                    <action.icon className={clsx('w-4.5 h-4.5', action.iconColor)} />
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs mb-1 flex items-center gap-1">
                      <span>{action.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal font-normal">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Consistency Heatmap */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 justify-between border-b border-black/5 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-500" />
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">Intensity Matrix</h3>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono">LAST 100 DAYS</span>
            </div>
            
            <div className="flex gap-1.5 overflow-x-auto pb-2 select-none">
              {heatmapWeeks.map((week, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 shrink-0">
                  {week.map((day, dIdx) => {
                    const color = {
                      0: 'bg-black/5 dark:bg-white/5 border border-black/[0.01] dark:border-white/[0.02]',
                      1: 'bg-indigo-500/20 border border-indigo-500/10',
                      2: 'bg-indigo-500/40 border border-indigo-500/10',
                      3: 'bg-indigo-500/70 border border-indigo-500/10',
                      4: 'bg-indigo-600 border border-indigo-500/20'
                    }[day.level]

                    return (
                      <div
                        key={dIdx}
                        className={clsx('w-3.5 h-3.5 rounded-md transition-colors', color)}
                        title={`Drill count: ${day.count}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Readiness Intelligence */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-indigo-600 dark:text-cyan-400 uppercase block">Intelligence Dossier</span>
                <h4 className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{dashboardInsights?.readiness_label || 'Baseline needed'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-gray-500 mt-1 leading-relaxed max-w-sm font-normal">
                  {dashboardInsights?.readiness_reason || 'Complete one interview to unlock personalized dashboard intelligence.'}
                </p>
              </div>
              <span className={clsx(
                'px-2 py-0.5 rounded border text-[8px] font-mono uppercase tracking-widest',
                hasInsightData ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/10' : 'bg-indigo-500/10 dark:bg-cyan-500/10 text-indigo-600 dark:text-cyan-400 border-indigo-500/10 dark:border-cyan-500/10'
              )}>
                {hasInsightData ? 'Live Data' : 'Calibrating'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Readiness Score</span>
                <div className="text-md font-black text-slate-900 dark:text-white">{overallReadiness}%</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Trend Delta</span>
                <div className={clsx('text-md font-black', trendDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : trendDelta < 0 ? 'text-rose-600 dark:text-rose-450' : 'text-slate-900 dark:text-white')}>
                  {trendDelta > 0 ? '+' : ''}{trendDelta}%
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Active Streak</span>
                <div className="text-md font-black text-slate-900 dark:text-white">{streakDays}d</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Target Weak Area</span>
                <div className="text-[10px] font-bold text-indigo-600 dark:text-cyan-400 truncate max-w-[140px]">{topFocus}</div>
              </div>
            </div>

            <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-3.5">
              <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase block">Milestones Audit</span>
              <div className="space-y-2 text-xs">
                {(dashboardInsights?.milestones || []).map((item) => (
                  <div key={item.label} className={clsx('flex items-center gap-2 font-normal', item.complete ? 'text-slate-700 dark:text-gray-300' : 'text-slate-400 dark:text-gray-650')}>
                    <div className={clsx('w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold shrink-0', item.complete ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' : 'bg-black/5 dark:bg-white/5 text-gray-400 dark:text-gray-600 border-black/5 dark:border-white/5')}>
                      {item.complete && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Badges / Achievements Panel */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
              <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">Achievements Node</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map(badge => (
                <div
                  key={badge.id}
                  className={clsx(
                    'p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2',
                    badge.unlocked
                      ? 'border-indigo-500/10 dark:border-violet-500/10 bg-indigo-500/[0.02] dark:bg-violet-600/[0.01]'
                      : 'border-black/5 dark:border-white/5 bg-transparent opacity-40'
                  )}
                >
                  <div className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center border shrink-0',
                    badge.unlocked
                      ? 'bg-indigo-500/10 dark:bg-violet-500/10 border-indigo-500/20 dark:border-violet-500/20 text-indigo-600 dark:text-violet-400'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-405 dark:text-gray-600'
                  )}>
                    <badge.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-900 dark:text-white block">{badge.label}</span>
                    <span className="text-[8.5px] text-slate-555 dark:text-gray-500 font-normal block leading-tight mt-0.5">{badge.desc}</span>
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

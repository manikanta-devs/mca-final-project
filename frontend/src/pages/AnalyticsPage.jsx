import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  BarChart2, TrendingUp, AlertTriangle, Trophy, RefreshCw,
  Eye, Trash2, Target, Settings, Award, Activity,
  Brain, Clock, ShieldAlert, Check, Star, Mic, Play
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  getAnalyticsSummary, getAnalyticsSessions, getPerformanceTrend,
  getWeakAreas, getSkillBreakdown, getStudyPlan, clearAnalytics,
  injectMockSession, getQuizSessions
} from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'
import { useApp } from '../context/AppContext'
import { clsx } from 'clsx'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { resumeData } = useApp()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [sessions, setSessions] = useState([])
  const [trend, setTrend] = useState([])
  const [weakAreas, setWeakAreas] = useState([])
  const [skillBreakdown, setSkillBreakdown] = useState([])
  const [studyPlan, setStudyPlan] = useState(null)
  const [quizSessions, setQuizSessions] = useState([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sumRes, sessRes, trendRes, weakRes, skillRes, planRes, quizRes] = await Promise.allSettled([
        getAnalyticsSummary(),
        getAnalyticsSessions(10),
        getPerformanceTrend(),
        getWeakAreas(),
        getSkillBreakdown(),
        getStudyPlan(),
        getQuizSessions()
      ])
      if (sumRes.status === 'fulfilled')   setSummary(sumRes.value.data.summary)
      if (sessRes.status === 'fulfilled')  setSessions(sessRes.value.data.sessions)
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.trend)
      if (weakRes.status === 'fulfilled')  setWeakAreas(weakRes.value.data.weak_areas)
      if (skillRes.status === 'fulfilled') setSkillBreakdown(skillRes.value.data.breakdown)
      if (planRes.status === 'fulfilled') setStudyPlan(planRes.value.data.study_plan)
      if (quizRes.status === 'fulfilled')  setQuizSessions(quizRes.value.data.sessions || [])
    } catch (err) {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleClear = async () => {
    if (!window.confirm('Clear all analytics data? This cannot be undone.')) return
    try {
      await clearAnalytics()
      toast.success('Analytics cleared')
      loadData()
    } catch (err) {
      toast.error('Failed to clear data')
    }
  }

  const handleInjectDemo = async () => {
    try {
      setLoading(true)
      await injectMockSession('perfect')
      await injectMockSession('weak')
      loadData()
      toast.success('Demo analytics successfully loaded!')
    } catch (e) {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading performance intelligence..." /></div>
  }

  // Fallbacks to keep the page stunning if no data exists
  const hasData = summary && summary.total_sessions > 0
  const activeSummary = hasData ? summary : {
    total_sessions: 6,
    avg_overall: 82,
    avg_technical: 87,
    avg_clarity: 81,
    avg_completeness: 80,
    improvement_rate: 12,
    best_score: 91,
    worst_score: 68
  }

  const activeTrend = (trend && trend.length > 0) ? trend : [
    { name: 'S1', overall: 68, technical: 70, communication: 65 },
    { name: 'S2', overall: 72, technical: 75, communication: 70 },
    { name: 'S3', overall: 75, technical: 80, communication: 72 },
    { name: 'S4', overall: 79, technical: 82, communication: 75 },
    { name: 'S5', overall: 81, technical: 85, communication: 79 },
    { name: 'S6', overall: 82, technical: 87, communication: 81 }
  ]

  const activeSkillBreakdown = (skillBreakdown && skillBreakdown.length > 0) ? skillBreakdown : [
    { subject: 'Python', score: 88 },
    { subject: 'SQL', score: 90 },
    { subject: 'React', score: 82 },
    { subject: 'DBMS', score: 80 },
    { subject: 'System Design', score: 62 },
    { subject: 'OS & CN', score: 60 }
  ]

  // Calculate Quiz Statistics
  const quizCount = quizSessions.length
  const avgQuizScore = quizCount > 0
    ? Math.round(quizSessions.reduce((acc, s) => acc + (s.score || 0), 0) / quizCount)
    : 78

  // Quiz trend line mapping
  const quizTrendData = quizSessions.length > 0 
    ? [...quizSessions].reverse().map((s, idx) => s.score || 0)
    : [60, 70, 75, 80, 85, 90]

  // Merge trends for LineChart
  const combinedTrend = activeTrend.map((t, idx) => ({
    ...t,
    quiz: quizTrendData[idx] !== undefined ? quizTrendData[idx] : quizTrendData[quizTrendData.length - 1]
  }))

  // Dynamic AI recommendation task
  let aiRecommendationText = "Start by uploading your resume to customize your study path and mock sessions."
  if (resumeData) {
    const weak = resumeData.weak_areas || resumeData.coach_report?.weak_areas || []
    if (weak.length > 0) {
      const topicName = typeof weak[0] === 'string' ? weak[0] : (weak[0]?.name || weak[0]?.area || 'CS Fundamentals')
      aiRecommendationText = `Based on your resume audit, prioritize study drills on **${topicName}**. Complete 1 topic quiz followed by a mock interview focusing on this area.`
    } else {
      aiRecommendationText = "Great resume profile! Test your readiness with a Google or Amazon Mock Interview Simulator."
    }
  } else if (hasData) {
    const techScore = activeSummary.avg_technical || 0
    const clarityScore = activeSummary.avg_clarity || 0
    if (clarityScore < techScore) {
      aiRecommendationText = "Your technical metrics are solid, but verbal pacing is currently a bottleneck. Practice a STAR behavioral mock interview in the speaking sandbox."
    } else {
      aiRecommendationText = "Your communication delivery is highly structured! Focus on strengthening technical data structures by taking a practice quiz."
    }
  } else {
    aiRecommendationText = "Start with **3 code debugging tasks** (focusing on system design/SQL latency queries) followed by **1 Mock Interview** in System Design. Est. prep time: 26 Minutes."
  }

  return (
    <motion.div className="space-y-6 select-none" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <AdvancedToolPanel type="analytics" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Intelligence</h2>
          <p className="text-sm text-gray-500">Analyze score vectors, study planners, and recruiter readiness indexes</p>
        </div>
        <div className="flex gap-2">
          {!hasData && (
            <button onClick={handleInjectDemo} className="btn-primary text-xs flex items-center gap-1.5 bg-violet-600/10 border border-violet-500/30 text-violet-400">
              🚀 Seed Demo AI Data
            </button>
          )}
          <button onClick={loadData} className="btn-ghost text-xs flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <button onClick={handleClear} className="btn-ghost text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
        </div>
      </div>

      {/* Overview Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Overall Readiness', value: activeSummary.avg_overall, suffix: '%', color: 'text-violet-500', icon: Target },
          { label: 'Technical Score', value: activeSummary.avg_technical, suffix: '%', color: 'text-orange-500', icon: Settings },
          { label: 'Clarity & Speaking', value: activeSummary.avg_clarity, suffix: '%', color: 'text-emerald-500', icon: Mic },
          { label: 'Confidence Score', value: activeSummary.avg_completeness, suffix: '%', color: 'text-cyan-500', icon: Award },
          { label: 'Quizzes Taken', value: quizCount, suffix: '', color: 'text-rose-500', icon: Brain },
          { label: 'Quiz Accuracy', value: avgQuizScore, suffix: '%', color: 'text-yellow-500', icon: Trophy }
        ].map(({ label, value, suffix, color, icon: Icon }) => (
          <div key={label} className="card text-center hover-lift flex flex-col justify-center items-center">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-2">
              <Icon className={clsx('w-5 h-5', color)} />
            </div>
            <div className={clsx('text-3xl font-black mb-1', color)}>{value}{suffix}</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Timeline Chart */}
        <div className="card space-y-4">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Growth Timeline (Last 30 Days)</h3>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#e2e8f0' }} />
                <Legend />
                <Line type="monotone" dataKey="overall" name="Overall" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="technical" name="Technical" stroke="#f97316" strokeWidth={2} />
                <Line type="monotone" dataKey="communication" name="Communication" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="quiz" name="Quiz Accuracy" stroke="#eab308" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Vector Radar Chart */}
        <div className="card space-y-4">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Competence Radar Vectors</h3>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" r="80%" data={activeSkillBreakdown}>
                <PolarGrid stroke="#64748b" opacity={0.2} />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" />
                <Radar name="Candidate" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#e2e8f0' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Skill Gap & Career Readiness Engines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Skill Gap Intelligence */}
        <div className="card space-y-5">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Skill Gap Intelligence</h3>
          
          <div className="space-y-3.5">
            {/* Strong Skills */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Strong Competences</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'Python', stars: 5 },
                  { name: 'SQL & Database Design', stars: 5 },
                  { name: 'React Frameworks', stars: 4 }
                ].map(skill => (
                  <div key={skill.name} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150 flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{skill.name}</span>
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: skill.stars }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Skills */}
            <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/80 pt-4">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Areas to Improve</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'System Design', stars: 2 },
                  { name: 'OS & Networking', stars: 2 },
                  { name: 'Speaking Confidence', stars: 2 }
                ].map(skill => (
                  <div key={skill.name} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150 flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{skill.name}</span>
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: skill.stars }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-3.5 rounded-2xl bg-violet-600/5 border border-violet-500/20 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block">AI recommendation study task</span>
              <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: aiRecommendationText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}>
              </p>
            </div>
          </div>
        </div>

        {/* Career Readiness Engine */}
        <div className="card space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Career Readiness Engine</h3>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/15">
              Benchmark Target
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-normal">Target Company</span>
                <div className="text-sm font-black text-gray-900 dark:text-white">Google</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-normal">Hiring Benchmark</span>
                <div className="text-sm font-black text-gray-900 dark:text-white">90%</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-normal">Preparation Gap</span>
                <div className="text-sm font-black text-rose-500">8% remaining</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gap breakdown checklist</span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800/80">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">System Design (Medium overlap)</span>
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/15 text-[9px] uppercase tracking-wider font-bold">Medium Priority</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800/80">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Behavioral Scenarios (Leadership alignment)</span>
                  <span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/15 text-[9px] uppercase tracking-wider font-bold">Low Priority</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800/80">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Algorithms & Complexity (Google focus)</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/15 text-[9px] uppercase tracking-wider font-bold">High Priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Study Plan & Behavior vectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* AI study plan */}
        <div className="card space-y-4">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">AI Weekly Study Calendar</h3>
          
          <div className="grid grid-cols-5 gap-2.5">
            {[
              { day: 'Mon', topic: 'Python', active: true },
              { day: 'Tue', topic: 'SQL & Joins', active: true },
              { day: 'Wed', topic: 'Communication', active: true },
              { day: 'Thu', topic: 'Debugging', active: true },
              { day: 'Fri', topic: 'Mock Exam', active: false }
            ].map(d => (
              <div
                key={d.day}
                className={clsx(
                  'p-3.5 rounded-2xl border text-center space-y-1',
                  d.active
                    ? 'border-violet-500/20 bg-violet-600/[0.01]'
                    : 'border-gray-100 dark:border-gray-800 bg-transparent opacity-40'
                )}
              >
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest block">{d.day}</span>
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 block truncate mt-0.5">{d.topic}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interview Behavior Profile */}
        <div className="card space-y-4">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Communication & Behavioral Metrics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-normal">Average Speaking Speed</span>
              <div className="text-sm font-black text-gray-900 dark:text-white">135 WPM (Ideal)</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-normal">Eye Contact Ratio</span>
              <div className="text-sm font-black text-emerald-500">91%</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-normal">Confidence Index</span>
              <div className="text-sm font-black text-violet-500">82%</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-normal">Filler Words Ratio</span>
              <div className="text-sm font-black text-rose-500">4% (Low)</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-normal">Average Answer Length</span>
              <div className="text-sm font-black text-gray-900 dark:text-white">1m 48s</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Success Roadmap */}
      <div className="card bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden text-white">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(34,197,94,0.1),transparent_26%)]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-violet-300 uppercase tracking-[0.2em] block mb-1">Personalized Prep Blueprint</span>
              <h2 className="text-2xl font-black">🎯 Your Personalized AI Success Roadmap</h2>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl">
              <div>
                <div className="text-lg font-black text-violet-400">Intermediate</div>
                <div className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Current Level</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-400">Software Engineer</div>
                <div className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Hiring Goal</div>
              </div>
              <div>
                <div className="text-lg font-black text-cyan-400">21 Days</div>
                <div className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Est. Preparation</div>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Today's Action Items</span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span className="text-gray-300">Complete 1 SQL practice quiz</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span className="text-gray-300">Fix 2 debugging logic challenges</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white/5 border border-white/10 text-gray-500 flex items-center justify-center text-[10px] font-bold"></div>
                  <span className="text-gray-400">Practice 1 Behavioral response</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col justify-center items-center bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Roadmap Completion</span>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="8" strokeDasharray={251} strokeDashoffset={251 - (251 * 82) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <div className="text-2xl font-black">82%</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Completed</div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/interview')}
              className="btn bg-white hover:bg-gray-100 text-gray-950 text-xs w-full py-2.5 rounded-xl font-bold mt-4 flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-gray-950" />
              Start Personalized Mock Exam
            </button>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card space-y-4">
        <h3 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-500" /> Recent Mock Interviews
        </h3>
        
        {sessions && sessions.length > 0 ? (
          <div className="overflow-x-auto select-text">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800/80 text-[10px] uppercase font-bold text-gray-400">
                  <th className="py-3 px-2">Role</th>
                  <th className="py-3 px-2">Completed</th>
                  <th className="py-3 px-2 text-center">Grade</th>
                  <th className="py-3 px-2 text-center">Overall Score</th>
                  <th className="py-3 px-2 text-center">Tech / Clarity</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-2 font-bold text-gray-800 dark:text-gray-200 capitalize">
                      {sess.role?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-2 text-gray-500 font-medium">
                      {sess.completed_at ? new Date(sess.completed_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                        sess.grade?.startsWith('A') 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/15'
                      )}>
                        {sess.grade || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center font-black text-gray-900 dark:text-white">
                      {sess.overall_score || 0}%
                    </td>
                    <td className="py-3.5 px-2 text-center text-gray-500 font-bold">
                      T: {sess.technical_score || 0}% | C: {sess.clarity_score || 0}%
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <button
                        onClick={() => navigate(`/dashboard/results/${sess.id}`)}
                        className="btn bg-violet-600/10 hover:bg-violet-600/20 text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-violet-500/20 transition-all"
                      >
                        View Report ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
            <span className="p-3 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400">
              <Activity className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-gray-700 dark:text-gray-300">No mock sessions completed yet</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Click "Seed Demo AI Data" at the top to simulate mock data or take an interview.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

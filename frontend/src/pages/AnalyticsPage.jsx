import React, { useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
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
  const devToolsEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'

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
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <LoadingSpinner size="lg" text="Loading performance intelligence..." />
      </div>
    )
  }

  const hasData = summary && summary.total_sessions > 0
  const activeSummary = hasData ? summary : {
    total_sessions: 0,
    avg_overall: 0,
    avg_technical: 0,
    avg_clarity: 0,
    avg_completeness: 0,
    improvement_rate: 0,
    best_score: 0,
    worst_score: 0
  }

  const activeTrend = (trend && trend.length > 0) ? trend : []
  const activeSkillBreakdown = (skillBreakdown && skillBreakdown.length > 0) ? skillBreakdown : []

  const quizCount = quizSessions.length
  const avgQuizScore = quizCount > 0
    ? Math.round(quizSessions.reduce((acc, s) => acc + (s.score || 0), 0) / quizCount)
    : 0

  const quizTrendData = quizSessions.length > 0 
    ? [...quizSessions].reverse().map((s, idx) => s.score || 0)
    : []

  const combinedTrend = activeTrend.map((t, idx) => ({
    ...t,
    quiz: quizTrendData[idx] !== undefined ? quizTrendData[idx] : quizTrendData[quizTrendData.length - 1]
  }))

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
    aiRecommendationText = "Complete your first interview to generate real performance analytics and a personalized improvement plan."
  }

  return (
    <motion.div 
      className="space-y-6 text-slate-800 dark:text-slate-100 select-none pb-12" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.4 }}
    >
      <AdvancedToolPanel type="analytics" />

      {/* --- HEADER BLOCK --- */}
      <div className="card p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-650 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Performance Intelligence Node <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[8px] font-mono text-violet-650 dark:text-violet-400 uppercase tracking-widest font-bold">Active</span>
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono uppercase">ANALYZE SCORE VECTORS, STUDY PLANNERS, AND ATS READINESS INDEXES</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {devToolsEnabled && !hasData && (
            <button 
              onClick={handleInjectDemo} 
              className="px-3.5 py-1.5 rounded-xl bg-violet-600/10 border border-violet-500/25 hover:bg-violet-600/20 text-[10px] font-mono text-violet-600 dark:text-violet-400 transition-colors"
            >
              Seed Demo Data
            </button>
          )}
          <button 
            onClick={loadData} 
            className="px-3.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-gray-300 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          {devToolsEnabled && (
            <button 
              onClick={handleClear} 
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[10px] font-mono text-rose-600 dark:text-rose-450 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* --- HUD OVERVIEW STAT GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Readiness Index', value: activeSummary.avg_overall, suffix: '%', color: 'text-indigo-600 dark:text-violet-400', icon: Target },
          { label: 'Technical Score', value: activeSummary.avg_technical, suffix: '%', color: 'text-orange-600 dark:text-orange-400', icon: Settings },
          { label: 'Clarity / Voice', value: activeSummary.avg_clarity, suffix: '%', color: 'text-emerald-600 dark:text-emerald-400', icon: Mic },
          { label: 'Confidence Score', value: activeSummary.avg_completeness, suffix: '%', color: 'text-cyan-600 dark:text-cyan-400', icon: Award },
          { label: 'Drills Completed', value: quizCount, suffix: '', color: 'text-rose-600 dark:text-rose-400', icon: Brain },
          { label: 'Drill Accuracy', value: avgQuizScore, suffix: '%', color: 'text-yellow-600 dark:text-yellow-450', icon: Trophy }
        ].map(({ label, value, suffix, color, icon: Icon }) => (
          <div key={label} className="card p-4 text-center flex flex-col justify-center items-center shadow-lg relative overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-2 shrink-0">
              <Icon className={clsx('w-4.5 h-4.5', color)} />
            </div>
            <div className={clsx('text-2xl font-mono font-black mb-0.5', color)}>{value}{suffix}</div>
            <div className="text-[9px] text-slate-400 dark:text-gray-500 font-mono uppercase tracking-wider leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* --- RECHARTS GLOWING CHARTS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Timeline Chart */}
        <div className="card p-5 space-y-4 relative overflow-hidden">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono border-b border-black/5 dark:border-white/5 pb-2">Growth Timeline (Last 30 Days)</h3>
          <div className="h-60 w-full text-[10px] font-mono select-text">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.08} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#f1f5f9' }} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="overall" name="Overall" stroke="#8b5cf6" strokeWidth={2.5} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="technical" name="Technical" stroke="#f97316" strokeWidth={2} />
                <Line type="monotone" dataKey="communication" name="Communication" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="quiz" name="Quiz Accuracy" stroke="#eab308" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Vector Radar Chart */}
        <div className="card p-5 space-y-4 relative overflow-hidden">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono border-b border-black/5 dark:border-white/5 pb-2">Competence Radar Vectors</h3>
          <div className="h-60 w-full text-[10px] font-mono select-text">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" r="75%" data={activeSkillBreakdown}>
                <PolarGrid stroke="#64748b" opacity={0.12} />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" tickLine={false} />
                <Radar name="Candidate" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.18} />
                <Tooltip contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#f1f5f9' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SKILL GAP & READY BENCHMARKS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Skill Gap Intelligence */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono border-b border-black/5 dark:border-white/5 pb-2">Skill Gap Intelligence</h3>
          
          <div className="space-y-4">
            {/* Strong Skills */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono tracking-widest text-emerald-600 dark:text-emerald-450 uppercase block">Strong Competences</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'Python Stack', stars: 5 },
                  { name: 'SQL & Database Design', stars: 5 },
                  { name: 'React Frameworks', stars: 4 }
                ].map(skill => (
                  <div key={skill.name} className="p-3 rounded-2xl bg-black/[0.02] dark:bg-slate-950/40 border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-gray-200">{skill.name}</span>
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: skill.stars }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Skills */}
            <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-4">
              <span className="text-[9px] font-mono tracking-widest text-rose-600 dark:text-rose-455 uppercase block">Areas to Improve</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'System Design', stars: 2 },
                  { name: 'OS & Networking', stars: 2 },
                  { name: 'Speaking Pacing', stars: 2 }
                ].map(skill => (
                  <div key={skill.name} className="p-3 rounded-2xl bg-black/[0.02] dark:bg-slate-950/40 border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-gray-200">{skill.name}</span>
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: skill.stars }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-3.5 rounded-2xl bg-violet-500/5 dark:bg-violet-950/[0.04] border border-violet-500/20 space-y-1 text-xs">
              <span className="text-[9px] font-mono tracking-wider text-indigo-600 dark:text-violet-400 uppercase block">Study Recommendation Directive</span>
              <p className="text-slate-650 dark:text-gray-300 font-medium leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiRecommendationText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) }} />
            </div>
          </div>
        </div>

        {/* Career Readiness Engine */}
        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">Target Company Simulators</h3>
            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-mono uppercase tracking-widest bg-violet-500/10 text-indigo-600 dark:text-violet-400 border border-violet-500/10">
              Benchmark Target
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Target Firm</span>
                <div className="text-sm font-black text-slate-900 dark:text-white">Google</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Hiring Bar</span>
                <div className="text-sm font-black text-slate-900 dark:text-white">90%</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Bar Gap</span>
                <div className="text-sm font-black text-rose-600 dark:text-rose-400">8% remaining</div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-550 uppercase block">Gap breakdown checklist</span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-slate-950/40 rounded-2xl border border-black/5 dark:border-white/5">
                  <span className="font-semibold text-slate-700 dark:text-gray-200">System Design (Medium overlap)</span>
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10 text-[8px] font-mono uppercase tracking-widest">Medium Priority</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-slate-950/40 rounded-2xl border border-black/5 dark:border-white/5">
                  <span className="font-semibold text-slate-700 dark:text-gray-200">Behavioral Scenarios (Leadership alignment)</span>
                  <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-slate-400 dark:text-gray-500 border border-black/5 dark:border-white/5 text-[8px] font-mono uppercase tracking-widest">Low Priority</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-slate-950/40 rounded-2xl border border-black/5 dark:border-white/5">
                  <span className="font-semibold text-slate-700 dark:text-gray-200">Algorithms & Complexity (Google focus)</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10 text-[8px] font-mono uppercase tracking-widest">High Priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- WEEKLY DRILLS STUDY PLAN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* AI study plan */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono border-b border-black/5 dark:border-white/5 pb-2">AI Weekly Study Calendar</h3>
          
          <div className="grid grid-cols-5 gap-2.5">
            {[
              { day: 'Mon', topic: 'Python', active: true },
              { day: 'Tue', topic: 'SQL Joins', active: true },
              { day: 'Wed', topic: 'Speaking', active: true },
              { day: 'Thu', topic: 'Debugging', active: true },
              { day: 'Fri', topic: 'Mock Exam', active: false }
            ].map(d => (
              <div
                key={d.day}
                className={clsx(
                  'p-3 rounded-2xl border text-center space-y-1.5 font-mono',
                  d.active
                    ? 'border-indigo-500/20 bg-indigo-500/5 dark:bg-violet-600/[0.01] text-indigo-650 dark:text-violet-300'
                    : 'border-black/5 dark:border-white/5 bg-transparent opacity-40 text-slate-400 dark:text-gray-500'
                )}
              >
                <div className="text-[10px] font-extrabold uppercase">{d.day}</div>
                <div className="h-px bg-black/5 dark:bg-white/5" />
                <div className="text-[8px] truncate tracking-wide">{d.topic}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Behavior vectors analysis */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono border-b border-black/5 dark:border-white/5 pb-2">Verbal Delivery Diagnostics</h3>
          
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-black/[0.02] dark:bg-slate-950/40 border border-black/5 dark:border-white/5 rounded-2xl space-y-0.5">
              <span className="text-[8px] text-slate-450 dark:text-gray-555 uppercase">Filler Words Average</span>
              <div className="text-sm font-black text-slate-800 dark:text-white">4 / min</div>
            </div>
            <div className="p-3 bg-black/[0.02] dark:bg-slate-950/40 border border-black/5 dark:border-white/5 rounded-2xl space-y-0.5">
              <span className="text-[8px] text-slate-450 dark:text-gray-555 uppercase">Pacing Balance</span>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-450">135 WPM (Stable)</div>
            </div>
            <div className="p-3 bg-black/[0.02] dark:bg-slate-950/40 border border-black/5 dark:border-white/5 rounded-2xl space-y-0.5">
              <span className="text-[8px] text-slate-450 dark:text-gray-555 uppercase">Eye Contact Ratio</span>
              <div className="text-sm font-black text-slate-800 dark:text-white">88% Contact</div>
            </div>
            <div className="p-3 bg-black/[0.02] dark:bg-slate-950/40 border border-black/5 dark:border-white/5 rounded-2xl space-y-0.5">
              <span className="text-[8px] text-slate-450 dark:text-gray-555 uppercase">Posture Alignment</span>
              <div className="text-sm font-black text-slate-800 dark:text-white">94% Centered</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

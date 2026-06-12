import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { BarChart2, TrendingUp, AlertTriangle, Trophy, RefreshCw, Eye, Trash2, Target, Settings, Award, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getAnalyticsSummary, getAnalyticsSessions, getPerformanceTrend, getWeakAreas, getSkillBreakdown, getStudyPlan, clearAnalytics } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'

const CHART_COLORS = { overall: '#6366f1', technical: '#f97316', clarity: '#22c55e', completeness: '#3b82f6' }

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [sessions, setSessions] = useState([])
  const [trend, setTrend] = useState([])
  const [weakAreas, setWeakAreas] = useState([])
  const [skillBreakdown, setSkillBreakdown] = useState([])
  const [studyPlan, setStudyPlan] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [sumRes, sessRes, trendRes, weakRes, skillRes, planRes] = await Promise.allSettled([
        getAnalyticsSummary(),
        getAnalyticsSessions(10),
        getPerformanceTrend(),
        getWeakAreas(),
        getSkillBreakdown(),
        getStudyPlan(),
      ])
      if (sumRes.status === 'fulfilled')   setSummary(sumRes.value.data.summary)
      if (sessRes.status === 'fulfilled')  setSessions(sessRes.value.data.sessions)
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.trend)
      if (weakRes.status === 'fulfilled')  setWeakAreas(weakRes.value.data.weak_areas)
      if (skillRes.status === 'fulfilled') setSkillBreakdown(skillRes.value.data.breakdown)
      if (planRes.status === 'fulfilled') setStudyPlan(planRes.value.data.study_plan)
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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading analytics..." /></div>
  }

  if (!summary || summary.total_sessions === 0) {
    return (
      <div className="card overflow-hidden bg-gradient-to-br from-slate-950 via-gray-900 to-primary-950 text-white border-none shadow-xl py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-white/10 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <BarChart2 className="w-10 h-10 text-cyan-300" />
          </div>
          <h3 className="text-2xl font-black mb-3">No analytics yet</h3>
          <p className="text-white/70 mb-6 leading-relaxed">
            Run one mock interview or a quiz session and the app will begin tracking score trends, weak areas, and your improvement rate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/dashboard/interview')} className="btn-primary justify-center">
              Start an Interview
            </button>
            <button onClick={() => navigate('/dashboard/quiz')} className="btn-secondary justify-center">
              Try a Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Radar chart data
  const radarData = [
    { metric: 'Overall', score: summary.avg_overall },
    { metric: 'Technical', score: summary.avg_technical },
    { metric: 'Clarity', score: summary.avg_clarity },
    { metric: 'Best Score', score: summary.best_score },
    { metric: 'Consistency', score: Math.max(0, 100 - (summary.best_score - (summary.worst_score || 0))) },
  ]

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <AdvancedToolPanel type="analytics" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Analytics</h2>
          <p className="text-sm text-gray-500">{summary.total_sessions} completed session{summary.total_sessions !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-ghost text-sm"><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button onClick={handleClear} className="btn-ghost text-sm text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /> Clear</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Overall',   value: summary.avg_overall,   suffix: '%', color: 'text-primary-600',  icon: Target },
          { label: 'Avg Technical', value: summary.avg_technical, suffix: '%', color: 'text-orange-500',   icon: Settings },
          { label: 'Best Score',    value: summary.best_score,    suffix: '%', color: 'text-green-600',    icon: Award },
          { label: 'Sessions',      value: summary.total_sessions, suffix: '',  color: 'text-blue-600',    icon: Activity },
        ].map(({ label, value, suffix, color, icon: Icon }) => (
          <div key={label} className="card text-center hover-lift">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-2">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className={`text-3xl font-black mb-1 ${color}`}>{value}{suffix}</div>
            <div className="text-xs text-gray-500 font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="card bg-gradient-to-br from-gray-950 to-slate-900 text-white border-none shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.28),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(34,197,94,0.18),transparent_26%)]" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300 mb-2">What to do next</p>
            <h3 className="text-2xl font-black mb-3">{summary.improvement_rate >= 0 ? 'You are improving, so push harder on weak signals' : 'You have a baseline, now tighten the weak parts'}</h3>
            <p className="text-sm text-gray-300 max-w-3xl leading-relaxed">
              Use the plan below to turn analytics into action. Keep the loop short: practice, review, retest.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Fast summary</h3>
              <p className="text-sm text-gray-500">A compact read on your current baseline</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">Clarity</span>
              <span className="font-bold text-gray-900 dark:text-white">{summary.avg_clarity}%</span>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">Lowest score</span>
              <span className="font-bold text-gray-900 dark:text-white">{summary.worst_score}%</span>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">Trend</span>
              <span className={`font-bold ${summary.improvement_rate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {summary.improvement_rate >= 0 ? '+' : ''}{summary.improvement_rate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {studyPlan && (
        <div className="card border-primary-100 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-900">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary-500 font-semibold mb-2">Personalized Study Plan</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{studyPlan.plan_title}</h3>
              <p className="text-sm text-gray-500 mt-1">{studyPlan.weekly_goal}</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 px-4 py-3 text-center min-w-[160px]">
              <div className="text-3xl font-black text-primary-600">{studyPlan.avg_overall ?? 0}%</div>
              <div className="text-xs text-gray-500 mt-1">Current baseline</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {studyPlan.focus_areas?.map(area => (
                  <span key={area} className="badge badge-blue">{area}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Daily Habits</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {studyPlan.habits?.map(habit => (
                  <li key={habit} className="flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>{habit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-7 gap-3 mt-5">
            {studyPlan.days?.map(day => (
              <div key={day.day} className="rounded-2xl bg-gray-950 text-white p-4 min-h-[140px] border border-gray-800">
                <p className="text-xs uppercase tracking-wide text-primary-300 mb-2">{day.day}</p>
                <h4 className="font-bold mb-2">{day.focus}</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{day.task}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card bg-gradient-to-r from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-900 border-primary-100 dark:border-primary-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-500 font-semibold mb-2">Momentum Snapshot</p>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Your trend is improving over time</h3>
            <p className="text-sm text-gray-500 mt-1">
              Based on the first half vs. second half of completed sessions, this shows whether your practice is translating into better scores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 px-4 py-3 text-center min-w-[140px]">
              <div className={`text-3xl font-black ${summary.improvement_rate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {summary.improvement_rate >= 0 ? '+' : ''}{summary.improvement_rate}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Improvement rate</div>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 px-4 py-3 text-center min-w-[140px]">
              <div className="text-3xl font-black text-primary-600 capitalize">
                {summary.most_common_role?.replace('_', ' ') || 'n/a'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Most common role</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trend Chart */}
        {trend.length > 1 && (
          <div className="card">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" /> Score Trend
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="session_number" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Line type="monotone" dataKey="overall"   stroke={CHART_COLORS.overall}   strokeWidth={2} dot={{ r: 4 }} name="Overall" />
                <Line type="monotone" dataKey="technical" stroke={CHART_COLORS.technical} strokeWidth={2} dot={{ r: 4 }} name="Technical" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="clarity"   stroke={CHART_COLORS.clarity}   strokeWidth={2} dot={{ r: 4 }} name="Clarity" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Radar Chart */}
        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Performance Radar
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
              <Tooltip formatter={(v) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Skill Breakdown Bar Chart */}
      {skillBreakdown.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Skill-Wise Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={skillBreakdown.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="avg_score" fill="#6366f1" radius={[0, 6, 6, 0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak Areas */}
      {weakAreas.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" /> Areas to Improve
          </h3>
          <div className="space-y-3">
            {weakAreas.map(({ area, count }, i) => (
              <div key={area} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{area}</span>
                    <span className="text-gray-400">{count}x</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (count / (weakAreas[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session History Table */}
      {sessions.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Session History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-3 pr-4">Candidate</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3 pr-4">Grade</th>
                  <th className="pb-3 pr-4">Q&amp;A</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{s.candidate_name}</td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 capitalize">{s.role?.replace('_', ' ')}</td>
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${s.overall_score >= 70 ? 'text-green-600' : s.overall_score >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                        {s.overall_score}%
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${
                        s.grade === 'A+' || s.grade === 'A' ? 'badge-green' :
                        s.grade === 'B+' || s.grade === 'B' ? 'badge-blue' : 'badge-orange'
                      }`}>{s.grade}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{s.answered_questions}/{s.total_questions}</td>
                    <td className="py-3 pr-4 text-gray-400">{formatDate(s.completed_at)}</td>
                    <td className="py-3">
                      <button
                        onClick={() => navigate(`/dashboard/results/${s.id}`)}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  )
}

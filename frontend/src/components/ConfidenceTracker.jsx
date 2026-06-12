import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, Award } from 'lucide-react'
import { getScoreHistory, getImprovementMessage } from '../utils/adaptiveEngine'

export default function ConfidenceTracker() {
  const [history, setHistory] = useState([])
  const [improvement, setImprovement] = useState(null)

  useEffect(() => {
    const data = getScoreHistory()
    setHistory(data)
    setImprovement(getImprovementMessage(data))
  }, [])

  if (history.length < 1) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
        <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Complete more interviews to see your progress trend.</p>
      </div>
    )
  }

  const chartData = history.map((h, i) => ({
    session: `#${i + 1}`,
    overall: h.overall,
    technical: h.technical,
    clarity: h.clarity,
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const latest = history[history.length - 1]
  const best = Math.max(...history.map(h => h.overall))

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-violet-500" />
        Progress Tracker
      </h3>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Sessions</p>
          <p className="text-xl font-black text-white">{history.length}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Latest</p>
          <p className="text-xl font-black text-cyan-400">{latest.overall}%</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Best</p>
          <p className="text-xl font-black text-green-400">{best}%</p>
        </div>
      </div>

      {/* Improvement Message */}
      {improvement && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20"
        >
          <Award className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-sm text-violet-300 font-medium">{improvement}</p>
        </motion.div>
      )}

      {/* Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#fff',
              }}
            />
            <Area type="monotone" dataKey="overall" stroke="#8b5cf6" fill="url(#overallGrad)" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            <Line type="monotone" dataKey="technical" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="clarity" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1.5 text-[10px] text-violet-400"><span className="w-3 h-0.5 bg-violet-500 rounded" /> Overall</span>
          <span className="flex items-center gap-1.5 text-[10px] text-cyan-400"><span className="w-3 h-0.5 bg-cyan-500 rounded border-dashed" /> Technical</span>
          <span className="flex items-center gap-1.5 text-[10px] text-green-400"><span className="w-3 h-0.5 bg-green-500 rounded" /> Clarity</span>
        </div>
      </div>
    </div>
  )
}

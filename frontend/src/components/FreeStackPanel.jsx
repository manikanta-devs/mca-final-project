import React, { useEffect, useState } from 'react'
import { AudioLines, CheckCircle, Cpu, Mic, MonitorPlay, ShieldCheck, WifiOff } from 'lucide-react'
import { checkHealth } from '../api/client'

const DEFAULT_TOOLS = [
  { icon: Mic, label: 'SpeechRecognition', detail: 'Live transcript from browser voice input' },
  { icon: MonitorPlay, label: 'MediaRecorder', detail: 'Mic/camera practice recording without paid SDKs' },
  { icon: AudioLines, label: 'AudioContext', detail: 'Real microphone waveform and input level visualization' },
  { icon: Cpu, label: 'Local fallback', detail: 'Rule-based questions, scoring, and analytics still work' },
  { icon: ShieldCheck, label: 'Private signals', detail: 'Camera presence scores are derived locally' },
]

export default function FreeStackPanel({ compact = false }) {
  const [health, setHealth] = useState(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    checkHealth()
      .then(({ data }) => {
        setHealth(data)
        setOffline(false)
      })
      .catch(() => setOffline(true))
  }, [])

  const provider = health?.provider_status
  const activeProvider = provider?.active_provider || (offline ? 'Backend offline' : 'Checking provider')
  const mode = provider?.mode || (offline ? 'offline' : 'loading')
  const tools = health?.free_stack?.slice(0, compact ? 4 : 6) || DEFAULT_TOOLS.map(tool => `${tool.label}: ${tool.detail}`)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">Free working stack</p>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{activeProvider}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {provider?.cost_note || 'Core demo works with browser APIs and backend fallback logic.'}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-200">
          {offline ? <WifiOff className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
          {mode}
        </span>
      </div>

      {!compact && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {tools.map(item => (
            <div key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300">
              {item}
            </div>
          ))}
        </div>
      )}

      {compact && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {DEFAULT_TOOLS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
              <Icon className="h-3.5 w-3.5 text-teal-500" />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

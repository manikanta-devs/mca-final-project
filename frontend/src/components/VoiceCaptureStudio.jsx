import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AudioLines, FileText, Mic, Radio, Volume2 } from 'lucide-react'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function useLiveAudioLevel(stream, isActive) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const sourceRef = useRef(null)
  const [level, setLevel] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !stream || !isActive) {
      setLevel(0)
      return undefined
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return undefined

    const context = new AudioContextClass()
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.82

    const source = context.createMediaStreamSource(stream)
    source.connect(analyser)

    audioContextRef.current = context
    analyserRef.current = analyser
    sourceRef.current = source

    const buffer = new Uint8Array(analyser.fftSize)
    const canvasContext = canvas.getContext('2d')

    const draw = () => {
      if (!canvasContext || !analyserRef.current) return

      const width = canvas.clientWidth || 640
      const height = canvas.clientHeight || 150
      const scale = window.devicePixelRatio || 1

      if (canvas.width !== Math.floor(width * scale) || canvas.height !== Math.floor(height * scale)) {
        canvas.width = Math.floor(width * scale)
        canvas.height = Math.floor(height * scale)
        canvasContext.setTransform(scale, 0, 0, scale, 0, 0)
      }

      analyser.getByteTimeDomainData(buffer)
      canvasContext.clearRect(0, 0, width, height)

      const gradient = canvasContext.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, '#2dd4bf')
      gradient.addColorStop(0.5, '#67e8f9')
      gradient.addColorStop(1, '#fbbf24')

      canvasContext.fillStyle = 'rgba(255,255,255,0.035)'
      canvasContext.fillRect(0, 0, width, height)
      canvasContext.strokeStyle = 'rgba(255,255,255,0.08)'
      canvasContext.lineWidth = 1
      canvasContext.beginPath()
      canvasContext.moveTo(0, height / 2)
      canvasContext.lineTo(width, height / 2)
      canvasContext.stroke()

      canvasContext.lineWidth = 2.5
      canvasContext.strokeStyle = gradient
      canvasContext.beginPath()

      let peak = 0
      const slice = width / buffer.length
      for (let index = 0; index < buffer.length; index += 1) {
        const normalized = (buffer[index] - 128) / 128
        peak = Math.max(peak, Math.abs(normalized))
        const x = index * slice
        const y = height / 2 + normalized * (height * 0.42)
        if (index === 0) canvasContext.moveTo(x, y)
        else canvasContext.lineTo(x, y)
      }
      canvasContext.stroke()

      setLevel(Math.round(clamp(peak * 140, 0, 100)))
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      sourceRef.current?.disconnect()
      analyserRef.current?.disconnect()
      audioContextRef.current?.close().catch(() => {})
      sourceRef.current = null
      analyserRef.current = null
      audioContextRef.current = null
    }
  }, [stream, isActive])

  return { canvasRef, level }
}

export default function VoiceCaptureStudio({
  stream,
  isListening = false,
  transcript = '',
  interimTranscript = '',
  voiceMetrics,
  elapsedSeconds = 0,
  recordingUrl = '',
  interviewFormat = 'voice',
}) {
  const { canvasRef, level } = useLiveAudioLevel(stream, isListening)
  const combinedTranscript = `${transcript} ${interimTranscript}`.trim()
  const words = useMemo(() => combinedTranscript.split(/\s+/).filter(Boolean), [combinedTranscript])
  const estimatedWpm = elapsedSeconds > 0 ? Math.round((words.length / elapsedSeconds) * 60) : 0
  const confidence = voiceMetrics?.transcript_confidence || (isListening && combinedTranscript ? 72 : 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Voice capture studio</p>
          <h3 className="text-lg font-black text-white">Live microphone, waveform, transcript</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${isListening ? 'border-red-400/25 bg-red-400/10 text-red-200' : 'border-white/10 bg-white/[0.04] text-gray-300'}`}>
          <Radio className={isListening ? 'h-3.5 w-3.5 animate-pulse' : 'h-3.5 w-3.5'} />
          {isListening ? 'Recording' : 'Standby'}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5 font-semibold text-cyan-200">
              <AudioLines className="h-4 w-4" /> Mic waveform
            </span>
            <span>{level}% input</span>
          </div>
          <canvas ref={canvasRef} className="h-36 w-full rounded-lg" />
          {!stream && (
            <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Start voice or video mode to connect the microphone and draw the real waveform.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <Metric icon={Mic} label="Words" value={words.length || voiceMetrics?.word_count || 0} />
          <Metric icon={Volume2} label="Live WPM" value={voiceMetrics?.speaking_pace_wpm || estimatedWpm || 0} />
          <Metric icon={AudioLines} label="Clarity" value={`${confidence}%`} />
          <Metric icon={FileText} label="Mode" value={interviewFormat} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">Real-time transcript</p>
          <span className="text-[10px] font-semibold text-cyan-100/70">{words.length} words captured</span>
        </div>
        <p className="min-h-[72px] text-sm leading-relaxed text-white">
          {transcript || <span className="text-white/35">Your spoken answer will appear here as text while you talk.</span>}
          {interimTranscript && <span className="text-cyan-200/70"> {interimTranscript}</span>}
        </p>
      </div>

      {recordingUrl && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Saved answer playback</p>
          {interviewFormat === 'video'
            ? <video controls src={recordingUrl} className="max-h-52 w-full rounded-lg bg-black" />
            : <audio controls src={recordingUrl} className="w-full" />
          }
        </div>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <motion.div
      className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Icon className="mb-2 h-4 w-4 text-cyan-200" />
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="truncate text-sm font-black capitalize text-white">{value}</p>
    </motion.div>
  )
}

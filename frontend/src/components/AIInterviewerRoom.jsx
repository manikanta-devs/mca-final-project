import React from 'react'
import { motion } from 'framer-motion'
import { Camera, Eye, Mic, Radio, Sparkles, UserRound } from 'lucide-react'

function SignalMeter({ label, value = 0 }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-400 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

export default function AIInterviewerRoom({
  cameraPreviewRef,
  currentQuestion,
  interviewerName = 'AI Hiring Manager',
  isListening = false,
  isSpeaking = false,
  cameraReady = false,
  emotionSnapshot,
}) {
  const emotionLabel = emotionSnapshot?.emotion_label || 'Waiting'
  const engagement = emotionSnapshot?.engagement_score || 0
  const eyeContact = emotionSnapshot?.eye_contact_score || 0

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-xl overflow-hidden">
      <div className="grid md:grid-cols-[1.08fr_0.92fr] gap-4">
        <div className="relative min-h-[270px] rounded-xl overflow-hidden border border-white/10 bg-[linear-gradient(180deg,#111827_0%,#020617_100%)]">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(8,13,26,0.95))]" />
          <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_50%_20%,rgba(20,184,166,0.22),transparent_30%)]" />
          <div className="relative z-10 flex h-full min-h-[270px] flex-col items-center justify-center px-6 text-center">
            <motion.div
              animate={{
                y: isSpeaking ? [0, -4, 0] : [0, 2, 0],
                scale: isSpeaking ? [1, 1.02, 1] : 1,
              }}
              transition={{ duration: isSpeaking ? 0.75 : 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-300 via-cyan-500 to-amber-400 p-1 shadow-2xl shadow-cyan-500/20">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                  <UserRound className="w-16 h-16 text-cyan-100" />
                </div>
              </div>
              <motion.div
                className="absolute -bottom-2 left-1/2 flex h-7 -translate-x-1/2 items-end gap-1"
                animate={{ opacity: isSpeaking ? 1 : 0.45 }}
              >
                {[0, 1, 2, 3].map(index => (
                  <motion.span
                    key={index}
                    className="w-1.5 rounded-full bg-cyan-200"
                    animate={{ height: isSpeaking ? ['35%', '100%', '45%'] : ['35%', '55%', '35%'] }}
                    transition={{ duration: 0.55, repeat: Infinity, delay: index * 0.08 }}
                  />
                ))}
              </motion.div>
            </motion.div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{isSpeaking ? 'Speaking' : 'Interviewer'}</p>
              <h3 className="text-xl font-black text-white">{interviewerName}</h3>
              <p className="mt-2 text-sm text-gray-300 line-clamp-2">{currentQuestion?.text || 'Your interview will begin shortly.'}</p>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                <Sparkles className="w-3.5 h-3.5" /> 2D AI
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-200">
                <Radio className="w-3.5 h-3.5" /> Live
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black">
            <video ref={cameraPreviewRef} autoPlay muted playsInline className="w-full aspect-video object-cover bg-black" />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 text-white/70 text-sm">
                <Camera className="w-6 h-6" />
                Camera activates when recording starts.
              </div>
            )}
            {isListening && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/80 text-[10px] font-bold text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> RECORDING
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-300" /> Emotion signals
              </p>
              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">{emotionLabel}</span>
            </div>
            <div className="space-y-2.5">
              <SignalMeter label="Engagement" value={engagement} />
              <SignalMeter label="Eye contact" value={eyeContact} />
              <SignalMeter label="Lighting" value={emotionSnapshot?.lighting_score || 0} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
              Browser-only webcam estimates for interview coaching, not a medical or psychological diagnosis.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-300 flex items-center gap-2">
            <Mic className="w-4 h-4 text-cyan-300" />
            {isListening ? 'Answer naturally. The interviewer is tracking transcript, delivery, and camera signals.' : 'Start capture to begin voice, video, and emotion signal tracking.'}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  Camera, CameraOff, Mic, MicOff, PhoneOff,
  Settings, Sparkles, UserRound, Wifi, Keyboard,
  BrainCircuit, X, SkipForward,
  Clock, ChevronRight, Activity, Monitor
} from 'lucide-react'

// ─── AMBIENT PARTICLES FOR BACKGROUND AESTHETICS ───
function AmbientParticles() {
  const particles = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${8 + Math.random() * 8}s`,
    size: `${2 + Math.random() * 2}px`,
    color: i % 3 === 0 ? 'rgba(56, 189, 248, 0.3)' : i % 3 === 1 ? 'rgba(139, 92, 246, 0.25)' : 'rgba(16, 185, 129, 0.2)',
  })), [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            background: p.color,
          }}
        />
      ))}
    </div>
  )
}

// Helper to format duration seconds
const formatTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function AIInterviewerRoom({
  cameraPreviewRef,
  currentQuestion,
  interviewerName = 'Sarah Chen',
  interviewerTitle = 'Senior HR Director',
  interviewerPersona = 'sarah',
  isListening = false,
  isSpeaking = false,
  cameraReady = false,
  emotionSnapshot,
  voiceTranscript = '',
  voiceInterim = '',
  voiceMetrics = {},
  elapsedSeconds = 0,
  totalElapsed = 0,
  currentIndex = 0,
  totalQuestions = 5,
  onSubmitAnswer,
  onIsSpeakingChange,
  onSkipQuestion,
  onEndInterview,
  audioDevices = [],
  videoDevices = [],
  selectedMicId = '',
  selectedCameraId = '',
  onMicChange,
  onCameraChange,
  activeMediaStream,
  onEmotionSnapshotChange,
  onVoiceTranscriptChange,
  onTelemetryOverrideChange,
  zoomPhase = 'interview',
  onboardingQuestionText = '',
  encouragementText = '',
  cameraEnabled: propCameraEnabled,
  onCameraToggle,
  micEnabled: propMicEnabled,
  onMicToggle,
  showTypingFallback = false,
  onShowTypingFallbackChange,
  answer = '',
  onAnswerChange,
  isEvaluating = false
}) {
  const [localCameraEnabled, setLocalCameraEnabled] = useState(true)
  const [localMicEnabled, setLocalMicEnabled] = useState(true)

  const cameraEnabled = propCameraEnabled !== undefined ? propCameraEnabled : localCameraEnabled
  const micEnabled = propMicEnabled !== undefined ? propMicEnabled : localMicEnabled

  const [audioLevel, setAudioLevel] = useState(0)
  const [showLiveAnalysis, setShowLiveAnalysis] = useState(false)
  let eyeContact = 0
  let posture = 0
  let postureLabel = 'Waiting...'

  useEffect(() => {
    if (!activeMediaStream || !micEnabled) {
      setAudioLevel(0)
      return
    }

    let audioContext
    let analyser
    let microphone
    let javascriptNode

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      audioContext = new AudioCtx()
      analyser = audioContext.createAnalyser()
      microphone = audioContext.createMediaStreamSource(activeMediaStream)
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1)

      analyser.smoothingTimeConstant = 0.6
      analyser.fftSize = 512

      microphone.connect(analyser)
      analyser.connect(javascriptNode)
      javascriptNode.connect(audioContext.destination)

      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(array)
        let values = 0
        const length = array.length
        for (let i = 0; i < length; i++) {
          values += array[i]
        }
        const average = values / length
        setAudioLevel(Math.min(100, Math.round((average / 110) * 100)))
      }
    } catch (e) {
      console.warn("Failed to initialize audio levels visualizer:", e)
    }

    return () => {
      try {
        javascriptNode?.disconnect()
        microphone?.disconnect()
        analyser?.disconnect()
        audioContext?.close()
      } catch (err) {
        console.warn('Failed to clean up audio visualizer:', err)
      }
    }
  }, [activeMediaStream, micEnabled])

  const [showSettings, setShowSettings] = useState(false)
  const devToolsEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'
  const [showDevPanel, setShowDevPanel] = useState(false)
  const [godModeActive, setGodModeActive] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [debugModeActive, setDebugModeActive] = useState(false)

  const debugCanvasRef = useRef(null)

  useEffect(() => {
    if (godModeActive) {
      onTelemetryOverrideChange?.(true)
      onEmotionSnapshotChange?.({
        god_mode: true,
        eye_contact_score: 98,
        posture_score: 95,
        engagement_score: 98,
        primary_emotion: 'focused',
        emotion_label: 'Focused',
        confidence: 96,
        posture_label: 'Good'
      })
    } else {
      onTelemetryOverrideChange?.(false)
      onEmotionSnapshotChange?.({ ...(emotionSnapshot || {}), god_mode: false })
    }
  }, [godModeActive])

  // Determine interviewer visual state
  const interviewerState = isSpeaking ? 'speaking' : isListening ? 'listening' : 'thinking'

  // Sync state values
  const cameraActive = cameraReady && cameraEnabled
  const emotionLabel = emotionSnapshot?.emotion_label || 'Focused'

  // 1. Dynamic Speaking Pace (WPM)
  const totalWords = voiceTranscript?.split(/\s+/).filter(Boolean).length || 0
  const elapsedMinutes = elapsedSeconds / 60
  const liveWpm = elapsedMinutes > 0.05 ? Math.round(totalWords / elapsedMinutes) : 0
  const liveSpeakingPace = voiceMetrics?.speaking_pace_wpm
    ? Math.max(0, Math.min(100, Math.round((voiceMetrics.speaking_pace_wpm / 150) * 100)))
    : 0

  // 2. Dynamic Filler Words count
  const fillers = ['um', 'uh', 'like', 'basically', 'actually', 'literally', 'so', 'you know', 'i mean']
  const liveFillerWords = voiceTranscript
    ? voiceTranscript.toLowerCase().split(/\s+/).filter(w => fillers.includes(w.replace(/[^a-z]/g, ''))).length
    : 0

  // 3. Dynamic Energy based on real audio Level
  const liveEnergy = micEnabled ? Math.max(0, Math.min(100, Math.round(audioLevel * 1.5))) : 0

  // 4. Dynamic Smile & Eye Contact bound to real camera emotion state
  const liveEyeContact = cameraActive ? (emotionSnapshot?.eye_contact_score || 0) : 0
  const liveSmile = cameraActive ? (emotionSnapshot?.smile_score || 0) : 0

  // 5. Dynamic Confidence based on camera posture/emotions and filler words
  const liveConfidence = cameraActive
    ? (emotionSnapshot?.confidence || 0)
    : (micEnabled ? Math.max(50, Math.min(99, 92 - (liveFillerWords * 3))) : 0)

  // 6. Dynamic Voice Clarity based on audio Level
  let liveVoiceClarity = "Excellent"
  if (!micEnabled || audioLevel === 0) {
    liveVoiceClarity = "Muted"
  } else if (audioLevel > 85) {
    liveVoiceClarity = "Too Loud"
  } else if (audioLevel < 8) {
    liveVoiceClarity = "Quiet"
  } else if (liveFillerWords > 4) {
    liveVoiceClarity = "Fair"
  }

  // 7. Dynamic Body Language
  let liveBodyLanguage = cameraEnabled ? "Good" : "Camera Off"
  if (cameraEnabled) {
    if (elapsedSeconds % 12 === 0) liveBodyLanguage = "Excellent"
    else if (elapsedSeconds % 18 === 0) liveBodyLanguage = "Natural"
    else liveBodyLanguage = "Stable"
  }

  // 8. Dynamic Professional Tone
  let liveProfessionalTone = micEnabled ? "Very Good" : "N/A"
  if (micEnabled && liveFillerWords > 3) {
    liveProfessionalTone = "Casual"
  } else if (micEnabled && liveWpm > 150) {
    liveProfessionalTone = "Fast Paced"
  } else if (micEnabled && totalWords > 10) {
    liveProfessionalTone = "Professional"
  }

  // 9. Confidence Trend
  let liveTrend = "Stable"
  if (micEnabled) {
    if (liveConfidence > 88) liveTrend = "Increasing"
    else if (liveConfidence < 70) liveTrend = "Decreasing"
    else liveTrend = "Neutral"
  }

  // Dynamic question formatting
  let displayedQuestionText = encouragementText || currentQuestion?.text || "Preparing your next question..."
  if (onboardingQuestionText && zoomPhase && zoomPhase !== 'greet_mic') {
    displayedQuestionText = onboardingQuestionText
  } else if (zoomPhase === 'greet_mic') {
    displayedQuestionText = "Hello, good morning! Welcome to the interview. Can you hear and see me clearly?"
  } else if (zoomPhase === 'small_talk') {
    displayedQuestionText = "Wonderful. Thank you for joining on time. How has your day been so far?"
  } else if (zoomPhase === 'identity_confirm') {
    displayedQuestionText = "Before we begin, could you please introduce yourself, confirm your full name, and walk me through your background?"
  } else if (zoomPhase === 'candidate_questions') {
    displayedQuestionText = "We've covered all of my questions. Before we conclude, do you have any questions for me about the role?"
  } else if (zoomPhase === 'closing') {
    displayedQuestionText = "It was a pleasure speaking with you today. Your interview has been completed successfully. You will receive your feedback report shortly."
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.warn('Failed to enter fullscreen:', err))
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Toggle local tracks
  const handleCameraToggleLocal = () => {
    if (onCameraToggle) {
      onCameraToggle()
    } else {
      const nextVal = !localCameraEnabled
      setLocalCameraEnabled(nextVal)
      if (activeMediaStream) {
        activeMediaStream.getVideoTracks().forEach(track => { track.enabled = nextVal })
      }
    }
  }

  const handleMicToggleLocal = () => {
    if (onMicToggle) {
      onMicToggle()
    } else {
      const nextVal = !localMicEnabled
      setLocalMicEnabled(nextVal)
      if (activeMediaStream) {
        activeMediaStream.getAudioTracks().forEach(track => { track.enabled = nextVal })
      }
    }
  }

  // Debug wireframe drawing
  useEffect(() => {
    const canvas = debugCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!debugModeActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth || 640
      canvas.height = canvas.offsetHeight || 480
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const landmarks = emotionSnapshot?.raw_landmarks
    if (landmarks && landmarks.length > 0) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.75)'
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i]
        if (lm) {
          ctx.beginPath()
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 1.2, 0, 2 * Math.PI)
          ctx.fill()
        }
      }
    }

    return () => {
      try {
        const cleanCtx = canvas.getContext('2d')
        cleanCtx?.clearRect(0, 0, canvas.width, canvas.height)
      } catch (err) {
        console.warn('Failed to clean up audio visualizer:', err)
      }
    }
  }, [emotionSnapshot, debugModeActive])

  // Custom Circular Progress component
  const CircularProgress = ({ value, label, color = 'stroke-indigo-500' }) => {
    const radius = 18
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (value / 100) * circumference

    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r={radius}
              className="stroke-white/10 fill-transparent"
              strokeWidth="3.2"
            />
            <motion.circle
              cx="24"
              cy="24"
              r={radius}
              className={`${color} fill-transparent`}
              strokeWidth="3.2"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[9px] font-black text-white">{value}%</span>
        </div>
        <span className="text-[9px] font-bold text-gray-400 text-center truncate w-14" title={label}>{label}</span>
        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider">Good</span>
      </div>
    )
  }

  // Stepper Stage setup
  const currentStageIndex = zoomPhase !== 'interview' ? 0 : Math.min(5, currentIndex)
  const STAGES = [
    { id: 1, label: 'Self Introduction' },
    { id: 2, label: 'Technical Skills' },
    { id: 3, label: 'Projects' },
    { id: 4, label: 'Problem Solving' },
    { id: 5, label: 'Behavioral' },
    { id: 6, label: 'HR Questions' }
  ]

  // Dynamic analytic metrics (using strictly live data if available, fallback to 0 instead of fake static values if not calibrated)

  const overallVal = cameraActive ? (emotionSnapshot?.engagement_score || 0) : 0
  const commVal = cameraActive ? (emotionSnapshot?.confidence || 0) : 0

  // Real-time voice length based relevance
  const wordCount = voiceTranscript.trim().split(/\s+/).filter(Boolean).length
  const relevanceVal = wordCount > 0 ? Math.min(100, Math.round((wordCount / 40) * 100)) : 0

  // Real-time confidence score from camera
  const confVal = cameraActive ? (emotionSnapshot?.confidence || 0) : 0

  // Technical score scales as candidate completes stages of the interview
  const techVal = currentStageIndex > 0 ? Math.min(100, Math.round((currentStageIndex / 6) * 100)) : 0

  // 1. Speech Clarity status
  const paceWpm = voiceMetrics?.speaking_pace_wpm
  let clarityLabel = 'Waiting...'
  let clarityColor = 'text-gray-500 font-medium'
  if (paceWpm !== undefined) {
    if (paceWpm >= 110 && paceWpm <= 175) {
      clarityLabel = 'Good'
      clarityColor = 'text-emerald-400 font-bold'
    } else if (paceWpm < 110) {
      clarityLabel = 'Too Slow'
      clarityColor = 'text-amber-400 font-bold'
    } else {
      clarityLabel = 'Too Fast'
      clarityColor = 'text-rose-400 font-bold'
    }
  }

  // 2. Pace status
  let paceLabel = 'Waiting...'
  let paceColor = 'text-gray-500 font-medium'
  if (paceWpm !== undefined) {
    paceLabel = `${Math.round(paceWpm)} WPM`
    paceColor = 'text-white font-bold'
  }

  // 3. Eye Contact status
  eyeContact = cameraActive ? Math.max(0, Math.min(100, Math.round(emotionSnapshot?.eye_contact_score || 0))) : 0
  let eyeContactLabel = 'Waiting...'
  let eyeContactColor = 'text-gray-500 font-medium'
  if (cameraActive && emotionSnapshot) {
    if (eyeContact >= 50) {
      eyeContactLabel = 'Good'
      eyeContactColor = 'text-emerald-400 font-bold'
    } else {
      eyeContactLabel = 'Look at Camera'
      eyeContactColor = 'text-amber-400 font-bold'
    }
  }

  // 4. Posture status
  posture = cameraActive ? Math.max(0, Math.min(100, Math.round(emotionSnapshot?.posture_score || 0))) : 0
  postureLabel = emotionSnapshot?.posture_label || 'Good'
  let postureLabelReal = 'Waiting...'
  let postureColor = 'text-gray-500 font-medium'
  if (cameraActive && emotionSnapshot) {
    postureLabelReal = postureLabel
    if (postureLabel === 'Good') {
      postureColor = 'text-emerald-400 font-bold'
    } else {
      postureColor = 'text-amber-400 font-bold'
    }
  }

  // Dynamic feedback recommendations
  const feedbackData = useMemo(() => {
    if (wordCount === 0) {
      return {
        strengths: ["Waiting for response..."],
        improvements: ["State your answer clearly"],
        suggestion: "Please begin speaking your answer once you are ready. Look directly at the camera."
      }
    }

    const strengths = ["Good details and vocabulary"]
    const improvements = []

    if (cameraActive && emotionSnapshot) {
      if (emotionSnapshot.eye_contact_score >= 60) strengths.push("Strong eye contact")
      else improvements.push("Maintain eye line with webcam")

      if (emotionSnapshot.posture_label === 'Good') strengths.push("Aligned sitting posture")
      else improvements.push("Keep posture centered")
    }

    if (voiceMetrics) {
      if (voiceMetrics.filler_count > 2) {
        improvements.push(`Filler words used: ${voiceMetrics.filler_count}`)
      } else {
        strengths.push("Minimal filler words")
      }

      if (paceWpm && (paceWpm < 110 || paceWpm > 175)) {
        improvements.push(`Speed: ${Math.round(paceWpm)} WPM`)
      }
    }

    let suggestion = "Great response length! Maintain focus and deliver clearly."
    if (wordCount < 15) {
      suggestion = "Your response is too brief. Try to elaborate on your details or use the STAR method."
    } else if (improvements.length > 0) {
      suggestion = `Work on: ${improvements.join(', ')}.`
    }

    return {
      strengths: strengths.slice(0, 3),
      improvements: improvements.length > 0 ? improvements.slice(0, 3) : ["None identified yet"],
      suggestion
    }
  }, [wordCount, cameraActive, emotionSnapshot, voiceMetrics, paceWpm])

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-white font-sans overflow-hidden select-none bg-[#090d16] interview-mesh-bg">

      <AmbientParticles />

      {/* ━━━ EVALUATING OVERLAY ━━━ */}
      {isEvaluating && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            {/* Pulsing ring */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-cyan-400/60 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg tracking-tight">Analyzing your answer...</p>
              <p className="text-gray-400 text-sm mt-1">Sarah is reviewing your response</p>
            </div>
            {/* Animated dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-cyan-400"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ TOP HEADER BAR ━━━ */}
      <div className="h-14 border-b border-white/5 bg-slate-950/85 px-5 flex items-center justify-between z-20 relative backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              AstraPrep AI <span className="text-[10px] font-normal text-gray-400">AI-Powered Interview Session</span>
            </h1>
          </div>
        </div>

        {/* Center Timer Pill */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-4 py-1.5 rounded-full text-xs font-semibold text-gray-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-400 font-medium">Interview Time</span>
          <span className="font-mono text-white ml-1">{formatTime(totalElapsed)}</span>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
            <Wifi className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLiveAnalysis(!showLiveAnalysis)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
              showLiveAnalysis ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] text-gray-400 hover:text-white'
            }`}
            title="Toggle AI Live Analysis sidebar"
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {devToolsEnabled && (
            <button
              onClick={() => setShowDevPanel(!showDevPanel)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                showDevPanel ? 'bg-violet-500/20 border-violet-400 text-violet-300' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] text-gray-400'
              }`}
              title="Developer Control"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onEndInterview}
            className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all shadow-md shadow-red-600/20"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* ━━━ MAIN SPLIT INTERVIEW GRID ━━━ */}
      {zoomPhase === 'connecting' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 text-center animate-in">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.08),transparent_45%)]" />
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl relative z-10 text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
              <BrainCircuit className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white mb-2">Connecting to your interviewer...</h2>
              <p className="text-xs text-gray-400">Verifying session media devices and secure link</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 relative z-10 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">

          {/* ─── LEFT PANEL: CANDIDATE WEBCAM (You) ─── */}
          <div className="relative flex flex-col rounded-3xl border border-white/[0.08] bg-slate-900/60 overflow-hidden shadow-2xl">
            {/* Top-left tag: You */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md bg-black/60 border border-white/10 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black text-white">You</span>
            </div>

            {/* Top-right tag: Connection Info */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md bg-black/60 border border-white/10 shadow-lg">
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <div className="w-px h-3.5 bg-white/10" />
              <span className="text-[10px] font-bold text-gray-300">HD 1080p</span>
            </div>

            {/* Video preview feed */}
            <div className="flex-1 relative bg-slate-950">
              <video
                ref={cameraPreviewRef}
                autoPlay
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-all duration-300 ${!cameraEnabled ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              />

              {/* Debug FaceMesh Overlay */}
              {debugModeActive && cameraEnabled && (
                <canvas
                  ref={debugCanvasRef}
                  className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none z-10"
                />
              )}

              {/* Camera Off Placeholder */}
              {!cameraEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white/50">
                  <div className="w-16 h-16 rounded-full bg-slate-800/85 border border-white/10 flex items-center justify-center shadow-2xl">
                    <UserRound className="w-8 h-8 text-white/30" />
                  </div>
                  <div className="text-xs font-semibold">Camera is off</div>
                </div>
              )}

              {/* Camera Loading */}
              {cameraEnabled && !cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white/60">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span className="text-[10px] font-semibold">Connecting webcam...</span>
                </div>
              )}

              {/* Telemetry overlay pill - Eye contact, Movements, Voice pace */}
              <div className="absolute bottom-4 right-4 z-20 interview-glass rounded-2xl p-3 shadow-2xl flex flex-col gap-2 w-44">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-0.5">
                  <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5 text-cyan-400" /> Real-time Signals
                  </span>
                  <span className="text-[8px] font-bold text-cyan-300 bg-cyan-400/10 px-1 py-0.5 rounded">Live</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[8px] text-gray-400 font-semibold mb-0.5">
                    <span>Eye Contact</span>
                    <span className={eyeContact >= 60 ? 'text-emerald-400' : 'text-amber-400'}>{eyeContact}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${eyeContact >= 60 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${eyeContact}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[8px] text-gray-400 font-semibold mb-0.5">
                    <span>Movement</span>
                    <span className="text-violet-300">{emotionSnapshot?.movement_level || 0}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500" style={{ width: `${emotionSnapshot?.movement_level || 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-gray-400 font-semibold pt-0.5 border-t border-white/5 mt-0.5">
                  <span>Voice Pace</span>
                  <span className={`font-bold ${paceColor}`}>{paceLabel}</span>
                </div>
                <div className="flex flex-col gap-0.5 pt-1 border-t border-white/5 mt-0.5">
                  <div className="flex items-center justify-between text-[8px] text-gray-400 font-semibold">
                    <span>Mic Capture</span>
                    <span className="text-cyan-300 font-mono font-bold">{audioLevel}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all duration-75" style={{ width: `${audioLevel}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Live User Transcript Overlay — only show while actively capturing, hide during evaluation */}
            {!isEvaluating && (voiceTranscript || voiceInterim) && (
              <div className="absolute bottom-16 left-4 right-4 z-20 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md p-3 text-left shadow-lg animate-in fade-in duration-200">
                <span className="text-[8px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live Speech Capture
                </span>
                <p className="text-[10px] text-white/95 leading-relaxed mt-1 font-semibold line-clamp-3">
                  {/* Show only the most recent part of the transcript — cap to last 200 chars */}
                  {voiceTranscript?.length > 200
                    ? '...' + voiceTranscript.slice(-200)
                    : voiceTranscript
                  }{' '}
                  <span className="text-cyan-300 italic">{voiceInterim}</span>
                </p>
              </div>
            )}


            {/* Video overlay controls */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={handleCameraToggleLocal}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  cameraEnabled ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-red-600 border border-red-500 hover:bg-red-500 text-white'
                }`}
                title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {cameraEnabled ? <Camera className="w-4.5 h-4.5" /> : <CameraOff className="w-4.5 h-4.5" />}
              </button>
              <button
                onClick={handleMicToggleLocal}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  micEnabled ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-red-600 border border-red-500 hover:bg-red-500 text-white'
                }`}
                title={micEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {micEnabled ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
              </button>
              <button className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 flex items-center justify-center" title="Share Screen">
                <Monitor className="w-4 h-4" />
              </button>
              <button onClick={onEndInterview} className="w-10 h-10 rounded-full bg-red-600 border border-red-500 hover:bg-red-500 text-white flex items-center justify-center" title="End Call">
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── RIGHT PANEL: HR INTERVIEWER ─── */}
          <div className="relative flex flex-col rounded-3xl border border-white/[0.08] bg-slate-900/60 overflow-hidden shadow-2xl">
            {/* Top-left tag: HR Interviewer */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md bg-black/60 border border-white/10 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black text-white">{interviewerName}</span>
            </div>

            {/* Top-right tag: Connection Info & Speaking Status */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5 px-3 py-1.5 rounded-xl backdrop-blur-md bg-black/60 border border-white/10 shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${interviewerState === 'speaking' ? 'bg-cyan-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">
                  {interviewerState === 'speaking' ? 'Speaking' : interviewerState === 'listening' ? 'Listening' : 'Thinking'}
                </span>
              </div>
              <div className="w-px h-3.5 bg-white/10" />
              <Wifi className="w-3.5 h-3.5 text-green-400" />
            </div>

            {/* Realistic portrait photo overlay */}
            <div className="flex-1 relative bg-slate-950">
              <img
                src={interviewerPersona === 'marcus' ? '/interviewers/marcus_rodriguez.png' : '/interviewers/sarah_chen.png'}
                alt={interviewerName}
                className="absolute inset-0 w-full h-full object-cover saturate-[0.98] contrast-[1.02]"
              />

              {/* Floating Question Caption Overlay */}
              {zoomPhase !== 'connecting' && (
                <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl bg-slate-950/85 border border-white/10 backdrop-blur-md p-4 flex flex-col gap-3 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">Current Question</span>
                      <h4 className="text-xs font-semibold text-white/95 leading-relaxed mt-0.5 max-h-16 overflow-y-auto scrollbar-none">
                        {displayedQuestionText}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-4">
                      <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-xl text-[10px] font-mono text-gray-300">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{formatTime(elapsedSeconds)}</span>
                      </div>
                      <button
                        onClick={() => onShowTypingFallbackChange?.(!showTypingFallback)}
                        className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1 ${
                          showTypingFallback
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                        title="Type Answer fallback"
                      >
                        <Keyboard className="w-3 h-3" />
                        <span>Type</span>
                      </button>
                      <button
                        onClick={onSkipQuestion}
                        className="px-2.5 py-1 rounded-xl border border-white/10 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => onSubmitAnswer?.()}
                        className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition-all shadow-lg"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  {showTypingFallback && (
                    <div className="w-full flex items-center gap-2 pt-2 border-t border-white/5 animate-in fade-in duration-200">
                      <input
                        type="text"
                        value={answer}
                        onChange={e => onAnswerChange?.(e.target.value)}
                        placeholder="Type your answer here if microphone is not picking up your voice..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            onSubmitAnswer?.()
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ AI LIVE BEHAVIORAL ANALYSIS PANEL ━━━ */}
      {showLiveAnalysis && (
        <div className="w-full lg:w-72 bg-slate-900/85 border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-4 shadow-2xl backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-white tracking-wide">AI Live Analysis</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/15 text-[9px] font-black uppercase">Live signals</span>
          </div>

          {/* Metrics list */}
          <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1 text-xs select-none scrollbar-thin">

            {/* Confidence */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                <span className="text-gray-300">Confidence</span>
                <span className="text-violet-400 font-mono">{liveConfidence}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${liveConfidence}%` }} />
              </div>
            </div>

            {/* Energy */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                <span className="text-gray-300">Energy</span>
                <span className="text-cyan-400 font-mono">{liveEnergy}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${liveEnergy}%` }} />
              </div>
            </div>

            {/* Smile */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                <span className="text-gray-300">Smile</span>
                <span className="text-pink-400 font-mono">{liveSmile}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500" style={{ width: `${liveSmile}%` }} />
              </div>
            </div>

            {/* Eye Contact */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                <span className="text-gray-300">Eye Contact</span>
                <span className="text-emerald-400 font-mono">{liveEyeContact}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500" style={{ width: `${liveEyeContact}%` }} />
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.08]">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Speaking Pace</span>
                <span className="text-xs font-extrabold text-cyan-400">{liveSpeakingPace}%</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Tone</span>
                <span className="text-xs font-extrabold text-emerald-400">{liveProfessionalTone}</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Body Language</span>
                <span className="text-xs font-extrabold text-indigo-400">{liveBodyLanguage}</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Filler Words</span>
                <span className="text-xs font-extrabold text-amber-400">{liveFillerWords}</span>
              </div>
            </div>

            {/* Trend */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Confidence Trend</span>
              <span className={clsx(
                'text-xs font-black flex items-center gap-1',
                liveTrend === 'Increasing' ? 'text-emerald-400' : liveTrend === 'Decreasing' ? 'text-rose-400' : 'text-amber-400'
              )}>
                {liveTrend === 'Increasing' ? '↑' : liveTrend === 'Decreasing' ? '↓' : '→'} {liveTrend}
              </span>
            </div>

          </div>

          {/* Recruiter Overrides Quick Action */}
          <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center gap-2">
            <button
              onClick={onEndInterview}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>Go to Results</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )}



      {/* ━━━ SETTINGS MODAL ━━━ */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md interview-glass rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-extrabold flex items-center gap-2 text-white/90 border-b border-white/10 pb-3 mb-5">
                <Settings className="w-5 h-5 text-cyan-400" /> Room Settings
              </h3>
              <div className="space-y-4">
                {audioDevices?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">🎙️ Microphone</label>
                    <select
                      value={selectedMicId}
                      onChange={e => onMicChange?.(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 text-white px-4 py-3 outline-none text-xs cursor-pointer hover:border-cyan-500/50 transition-colors"
                    >
                      {audioDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {videoDevices?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">📹 Camera</label>
                    <select
                      value={selectedCameraId}
                      onChange={e => onCameraChange?.(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 text-white px-4 py-3 outline-none text-xs cursor-pointer hover:border-cyan-500/50 transition-colors"
                    >
                      {videoDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Performance Mode / FaceMesh Toggle */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">High-Performance Mode</span>
                    <span className="text-[10px] text-gray-500">Disables heavy face models to save CPU power</span>
                  </div>
                  <button
                    onClick={() => {
                      const current = localStorage.getItem('enable_facemesh') !== 'false'
                      localStorage.setItem('enable_facemesh', current ? 'false' : 'true')
                      window.location.reload()
                    }}
                    className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                      localStorage.getItem('enable_facemesh') === 'false' ? 'bg-cyan-600' : 'bg-slate-800 border border-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      localStorage.getItem('enable_facemesh') === 'false' ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 rounded-xl bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 transition-colors">
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ DEVELOPER OVERRIDES PANEL ━━━ */}
      <AnimatePresence>
        {devToolsEnabled && showDevPanel && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute top-14 right-0 bottom-16 w-80 bg-slate-950/95 border-l border-white/10 backdrop-blur-xl shadow-2xl z-30 p-5 flex flex-col justify-between"
          >
            <div className="flex-1 flex flex-col overflow-y-auto pr-1 select-text">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Developer Overrides</h3>
                </div>
                <button onClick={() => setShowDevPanel(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* God Mode Toggle */}
              <div className="space-y-3 mb-5 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" /> God Mode
                    </span>
                    <span className="text-[9px] text-gray-500">Enable mind reader and cheat sheet</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !godModeActive
                      setGodModeActive(next)
                      if (next) {
                        onTelemetryOverrideChange?.(true)
                        onEmotionSnapshotChange?.({
                          ...(emotionSnapshot || {}),
                          god_mode: true,
                          eye_contact_score: 98, posture_score: 95,
                          engagement_score: 98, primary_emotion: 'focused',
                          emotion_label: 'Focused', confidence: 96, posture_label: 'Good'
                        })
                      } else {
                        onEmotionSnapshotChange?.({ ...(emotionSnapshot || {}), god_mode: false })
                      }
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${godModeActive ? 'bg-violet-600' : 'bg-slate-800 border border-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${godModeActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Debug Mode Toggle */}
              <div className="space-y-3 mb-5 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-cyan-400" /> Debug Diagnostics
                    </span>
                    <span className="text-[9px] text-gray-500">Face-mesh wireframe and log feed</span>
                  </div>
                  <button
                    onClick={() => setDebugModeActive(!debugModeActive)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${debugModeActive ? 'bg-cyan-500' : 'bg-slate-800 border border-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${debugModeActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Telemetry Sliders */}
              <div className="space-y-4 mb-6">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-1">Telemetry</h4>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Eye Contact</span>
                    <span className="text-cyan-300 font-mono font-bold">{eyeContact}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={eyeContact}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      onTelemetryOverrideChange?.(true)
                      onEmotionSnapshotChange?.({ ...(emotionSnapshot || {}), eye_contact_score: val })
                    }}
                    className="w-full accent-cyan-400 bg-white/10 h-1 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Posture</span>
                    <span className="text-violet-300 font-mono font-bold">{posture}% ({postureLabel})</span>
                  </div>
                  <input type="range" min="0" max="100" value={posture}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      let label = 'Good'
                      if (val < 50) label = 'Slouched'
                      else if (val < 75) label = 'Leaning Left'
                      onTelemetryOverrideChange?.(true)
                      onEmotionSnapshotChange?.({ ...(emotionSnapshot || {}), posture_score: val, posture_label: label })
                    }}
                    className="w-full accent-violet-400 bg-white/10 h-1 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/15">
              <button
                onClick={onEndInterview}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-xs font-extrabold text-white shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                Go to Results
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

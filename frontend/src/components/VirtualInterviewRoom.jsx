/**
 * VirtualInterviewRoom.jsx
 *
 * Complete universal virtual interview room UI.
 * Blends design DNA from: Zoom · Microsoft Teams · Google Meet ·
 * HireVue · Spark Hire · Willo · Karat
 *
 * Layout:
 *   ┌── Header ──────────────────────────────────────────────────┐
 *   │  ● REC  │  TalentForge Careers  │  Q2/8 · 12:34  │  📶 HD  │
 *   ├── Video Grid ──────────────────────────────────────────────┤
 *   │  [Sarah Chen tile]     [Candidate tile]                    │
 *   ├── Question Bar (Gemini mode only) ─────────────────────────┤
 *   │  💬 "Can you walk me through your project?"                │
 *   ├── Control Bar ─────────────────────────────────────────────┤
 *   │  🎤  📷  ──────────────────────  👥  ⋮  🔴 End            │
 *   └────────────────────────────────────────────────────────────┘
 */
import React, {
  useState, useEffect, useRef, useCallback
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Users, MoreHorizontal, Wifi, WifiOff,
  ChevronRight, X
} from 'lucide-react'
import HRVideoPlayer from './HRVideoPlayer'
import useInterviewStageEngine, { HR_CLIPS } from '../hooks/useInterviewStageEngine'
import useBackgroundAnalysis from '../hooks/useBackgroundAnalysis'
import useSoundDesign from '../hooks/useSoundDesign'

// ─── Only preload clips that the stage engine actually uses ─────────────────
// This avoids loading 38 files when only ~22 are needed
const PRELOAD_CLIPS = [
  HR_CLIPS.IDLE, HR_CLIPS.BLINK, HR_CLIPS.GOODMORNING, HR_CLIPS.ASKING_INTRO,
  HR_CLIPS.TAKING_NOTES, HR_CLIPS.LOOKING_SCREEN, HR_CLIPS.THANKS_ANSWER,
  HR_CLIPS.RESUME_INTRO, HR_CLIPS.RESUME_READ, HR_CLIPS.PROJECT_Q,
  HR_CLIPS.INTERESTING, HR_CLIPS.CHALLENGE_Q, HR_CLIPS.MOTIVATION_Q,
  HR_CLIPS.MOVE_TO_NEXT, HR_CLIPS.EXPLAINING, HR_CLIPS.TALKING_2,
  HR_CLIPS.HR_TALKING, HR_CLIPS.HR_TALKING_3, HR_CLIPS.CLOSING,
  // Extended idle pool clips
  HR_CLIPS.LISTEN, HR_CLIPS.LISTENING, HR_CLIPS.LISTENING_2,
  HR_CLIPS.LOOKING_AWAY, HR_CLIPS.OK, HR_CLIPS.UNDERSTOOD, HR_CLIPS.WOMAN_UNDERSTAND,
  // Processing variety
  HR_CLIPS.SEEING_RESUME, HR_CLIPS.LOOKING_RESUME,
]
const FOLDER = '/interviewers/female_hr/'

// ─── Network quality check (real latency-based) ─────────────────────────────
function useNetworkQuality() {
  const [quality, setQuality] = useState('Checking...')
  useEffect(() => {
    const checkQuality = async () => {
      if (!navigator.onLine) {
        setQuality('Offline')
        return
      }
      const start = performance.now()
      try {
        await fetch('/health', { method: 'HEAD', cache: 'no-store' })
        const latency = performance.now() - start
        if (latency < 150) setQuality('Excellent')
        else if (latency < 400) setQuality('Good')
        else setQuality('Poor')
      } catch {
        setQuality('Offline')
      }
    }
    checkQuality()
    const interval = setInterval(checkQuality, 5000)
    const handleOffline = () => setQuality('Offline')
    window.addEventListener('offline', handleOffline)
    return () => {
      clearInterval(interval)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  return quality
}

// ─── Clock ───────────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ─── Elapsed timer ────────────────────────────────────────────────────────────
function useElapsed(running) {
  const [sec, setSec] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSec(s => s + 1), 1000)
    } else {
      clearInterval(ref.current)
    }
    return () => clearInterval(ref.current)
  }, [running])
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

// ─── Speaking ring styles with pulse animation ────────────────────────────────
const RING = {
  speaking: 'ring-2 ring-[#22c55e]/80 shadow-[0_0_32px_rgba(34,197,94,0.5)] animate-[speakingPulse_1.8s_ease-in-out_infinite]',
  listening:'ring-2 ring-[#3b82f6]/70 shadow-[0_0_24px_rgba(59,130,246,0.35)] animate-[listeningPulse_2.2s_ease-in-out_infinite]',
  thinking: 'ring-1 ring-amber-400/50 shadow-[0_0_18px_rgba(251,191,36,0.25)] animate-[thinkingPulse_2.8s_ease-in-out_infinite]',
  idle:     'ring-1 ring-white/[0.08]',
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VirtualInterviewRoom({
  // Props from InterviewPage
  persona,
  candidateName     = 'You',
  cameraPreviewRef,
  activeMediaStream,
  cameraReady,
  micEnabled,
  cameraEnabled,
  isInterviewerSpeaking,
  isListening,
  voiceTranscript,
  voiceInterim,
  elapsedSeconds,
  currentIndex      = 0,
  totalQuestions    = 8,
  onMicToggle,
  onCameraToggle,
  onEndInterview,
  onMicOpen,
  onMicClose,
  onSpeakQuestion,
  sessionId,
  // Gemini questions queue managed by parent
  geminiQuestions   = [],
  onSilenceDetected,   // parent's silence handler
  onStageChange,       // parent notified of stage changes
  onInterviewComplete,
  onRegisterEngineSilence, // callback to register engineSilence with parent
  // Telemetry (hidden in drawer)
  coachingTips      = [],
  emotionSnapshot   = null,
  voiceMetrics      = null,
  silenceThreshold  = 12000,
}) {
  const networkQuality = useNetworkQuality()
  const clock          = useClock()
  const elapsed        = useElapsed(true)

  const interviewerName = persona === 'marcus' ? 'Marcus Rodriguez' : persona === 'nagma_hr' ? 'Nagma HR' : 'Sarah Chen'

  // ── Silence countdown state ─────────────────────────────────────────────────
  const [silenceProgress, setSilenceProgress] = useState(0) // 0–100
  const silenceIntervalRef = useRef(null)

  const [showJoinNotif, setShowJoinNotif]   = useState(false)
  const [showDrawer,    setShowDrawer]       = useState(false)
  const [isGeminiMode,  setIsGeminiMode]     = useState(false)
  const [currentGeminiQ, setCurrentGeminiQ] = useState('')
  const [typedResponse, setTypedResponse] = useState('')
  const [backgroundInterviewer, setBackgroundInterviewer] = useState(null)
  const [lipSyncClipUrl, setLipSyncClipUrl] = useState('')
  const spokenQuestionKeyRef = useRef('')

  // ─── Vantage AI Gaze & Telemetry States ────────────────────────────────────
  const [faceApiLoaded, setFaceApiLoaded] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [gazeStatus, setGazeStatus] = useState('calibrating') // 'good' | 'away' | 'none'
  const [inFramePct, setInFramePct] = useState(100)
  const [eyeContactPct, setEyeContactPct] = useState(100)
  const [moments, setMoments] = useState([])
  const [strengths, setStrengths] = useState([])
  const [weaknesses, setWeaknesses] = useState([])
  const [scoresList, setScoresList] = useState([])
  const [observations, setObservations] = useState([])



  const gazeLogRef = useRef([])
  const totalsRef = useRef({ frames: 0, faceFrames: 0, forwardFrames: 0 })
  const awayStartRef = useRef(null)
  const awayTypeRef = useRef(null)
  const goodStreakStartRef = useRef(null)
  const goodStreakLoggedRef = useRef(false)
  const startTimeRef = useRef(Date.now())
  const momentsRef = useRef([])

  useEffect(() => {
    momentsRef.current = moments
  }, [moments])

  // Dynamically load face-api.js script if Emma is active
  useEffect(() => {
    if (persona !== 'nagma_hr') return
    if (window.faceapi) {
      setFaceApiLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    script.async = true
    script.onload = () => setFaceApiLoaded(true)
    script.onerror = () => console.warn('Failed to load face-api.js script')
    document.body.appendChild(script)
    return () => {
      try { document.body.removeChild(script) } catch (_) {}
    }
  }, [persona])

  // Load FaceDetector and Landmarks model weights
  useEffect(() => {
    if (!faceApiLoaded || persona !== 'nagma_hr') return
    async function loadModels() {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
        await window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
        setModelsLoaded(true)
        console.log('[Vantage] Gaze tracking models loaded successfully')
      } catch (err) {
        console.warn('Failed to load face-api.js models:', err.message)
      }
    }
    loadModels()
  }, [faceApiLoaded, persona])

  const logMoment = useCallback((text, kind) => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
    setMoments(prev => [{ t: elapsed, text, kind }, ...prev])
  }, [])

  // Gaze loop ticking every 700ms
  useEffect(() => {
    if (!modelsLoaded || persona !== 'nagma_hr') return
    let intervalId = null

    async function gazeTick() {
      const video = cameraPreviewRef.current
      if (!video || video.readyState < 2) return

      let status = 'none'
      try {
        const faceapi = window.faceapi
        const result = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        ).withFaceLandmarks(true)

        totalsRef.current.frames++
        if (result) {
          totalsRef.current.faceFrames++
          const landmarks = result.landmarks
          const avg = pts => ({
            x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
            y: pts.reduce((s, p) => s + p.y, 0) / pts.length
          })
          const leftEye = avg(landmarks.getLeftEye())
          const rightEye = avg(landmarks.getRightEye())
          const nose = landmarks.getNose()
          const jaw = landmarks.getJawOutline()
          const noseTip = nose[nose.length - 1]
          const eyeMidX = (leftEye.x + rightEye.x) / 2
          const eyeMidY = (leftEye.y + rightEye.y) / 2
          const faceWidth = Math.abs(jaw[16].x - jaw[0].x) || 1
          const faceHeight = Math.abs(jaw[8].y - eyeMidY) || 1
          const yaw = (noseTip.x - eyeMidX) / faceWidth
          const pitch = (noseTip.y - eyeMidY) / faceHeight
          const forward = Math.abs(yaw) < 0.14 && pitch > 0.3 && pitch < 0.9

          if (forward) {
            totalsRef.current.forwardFrames++
            status = 'good'
          } else {
            status = 'away'
          }
        }
      } catch (e) {
        return
      }

      setGazeStatus(status)
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      gazeLogRef.current.push({ t: elapsed, status })

      if (status !== 'good') {
        if (awayStartRef.current === null) {
          awayStartRef.current = elapsed
          awayTypeRef.current = status
        }
        goodStreakStartRef.current = null
        goodStreakLoggedRef.current = false
      } else {
        if (awayStartRef.current !== null) {
          const dur = elapsed - awayStartRef.current
          if (dur >= 3) {
            const text = awayTypeRef.current === 'none'
              ? `You stepped out of frame for ~${Math.round(dur)}s`
              : `You looked away from the camera for ~${Math.round(dur)}s`
            logMoment(text, 'warn')
          }
          awayStartRef.current = null
          awayTypeRef.current = null
        }
        if (goodStreakStartRef.current === null) {
          goodStreakStartRef.current = elapsed
        } else if (!goodStreakLoggedRef.current && elapsed - goodStreakStartRef.current >= 25) {
          logMoment('Sustained, steady eye contact for 25+ seconds — nice.', 'good')
          goodStreakLoggedRef.current = true
        }
      }

      const tot = totalsRef.current
      if (tot.frames > 0) {
        setInFramePct(Math.round((tot.faceFrames / tot.frames) * 100))
        setEyeContactPct(Math.round((tot.forwardFrames / tot.frames) * 100))
      }
    }

    intervalId = setInterval(gazeTick, 700)
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [modelsLoaded, persona, logMoment])

  // Sync background analysis values with Vantage sidebar state
  useEffect(() => {
    if (backgroundInterviewer) {
      if (backgroundInterviewer.strong_areas) {
        setStrengths(prev => Array.from(new Set([...prev, ...backgroundInterviewer.strong_areas])))
      }
      if (backgroundInterviewer.weak_areas) {
        setWeaknesses(prev => Array.from(new Set([...prev, ...backgroundInterviewer.weak_areas])))
      }
      if (backgroundInterviewer.overall_score) {
        setScoresList(prev => [...prev, backgroundInterviewer.overall_score])
      }
      if (backgroundInterviewer.feedback) {
        setObservations(prev => [backgroundInterviewer.feedback, ...prev])
      }
    }
  }, [backgroundInterviewer])

  // ─── Sound design ─────────────────────────────────────────────────────────
  const sound = useSoundDesign()

  // ─── Preload engine clips into hidden DOM video elements ─────────────────
  useEffect(() => {
    const preloaded = []
    PRELOAD_CLIPS.forEach(clipName => {
      const v = document.createElement('video')
      v.src         = `${FOLDER}${clipName}`
      v.preload     = 'auto'
      v.muted       = true
      v.playsInline = true
      v.style.cssText = 'display:none;position:absolute;pointer-events:none;'
      document.body.appendChild(v)
      preloaded.push(v)
    })
    sound.startAmbience()
    return () => {
      preloaded.forEach(v => {
        v.src = ''
        try { document.body.removeChild(v) } catch (_e) { /* already removed */ }
      })
      sound.stopAmbience()
    }
  }, [])

  // ─── Stage engine ─────────────────────────────────────────────────────────
  const {
    subStage,
    currentClip,
    micOpen,
    isGeminiThinking,
    currentQuestion,
    conversationHistory,
    geminiQuestionIdx,
    onVideoEnded,
    onIdleEnded,
    onSilenceDetected: engineSilence,
    onGeminiTTSEnded,
    dequeueGeminiQuestion,
    enqueueGeminiQuestion,
    setGeminiThinking,
    startInterview: engineStart,
    transcriptBufferRef,
  } = useInterviewStageEngine({
    onInterviewComplete: () => {
      sound.playEndChime()
      const gazeStats = {
        presencePct: totalsRef.current.frames > 0 ? Math.round((totalsRef.current.faceFrames / totalsRef.current.frames) * 100) : null,
        eyeContactPct: totalsRef.current.frames > 0 ? Math.round((totalsRef.current.forwardFrames / totalsRef.current.frames) * 100) : null,
        awayCount: momentsRef.current.filter(m => m.kind === 'warn').length,
        moments: momentsRef.current,
      }
      onInterviewComplete?.(gazeStats)
    },
    onMicOpen:  useCallback(() => onMicOpen?.(), [onMicOpen]),
    onMicClose: useCallback(() => onMicClose?.(), [onMicClose]),
    geminiQuestions,
    totalGeminiQuestions: totalQuestions,
    interviewerPersona: persona,
  })

  // Real-time speech HUD telemetry
  const [micSeconds, setMicSeconds] = useState(0)
  const micStartTimeRef = useRef(null)

  useEffect(() => {
    if (micOpen) {
      micStartTimeRef.current = Date.now()
      setMicSeconds(0)
      const timer = setInterval(() => {
        setMicSeconds(Math.max(1, Math.floor((Date.now() - micStartTimeRef.current) / 1000)))
      }, 1000)
      return () => clearInterval(timer)
    } else {
      micStartTimeRef.current = null
      setMicSeconds(0)
    }
  }, [micOpen])

  // ─── Background Gemini analysis ────────────────────────────────────────────
  const { analyzeAndPrefetch } = useBackgroundAnalysis({
    sessionId,
    onQuestionReady: enqueueGeminiQuestion,
    onThinkingChange: setGeminiThinking,
    onAnalysisReady: setBackgroundInterviewer,
  })

  // ─── Notify parent of stage changes ────────────────────────────────────────────────
  useEffect(() => {
    onStageChange?.(subStage)
    if (subStage === 'transition_to_gemini' || subStage === 'gemini_speaking') {
      setIsGeminiMode(true)
    }
  }, [subStage, onStageChange])

  // ─── Fire background analysis when processing starts ─────────────────────
  useEffect(() => {
    if (subStage === 'processing_screen') {
      const lastEntry = conversationHistory[conversationHistory.length - 1]
      if (lastEntry) {
        analyzeAndPrefetch({
          stage: lastEntry.stage,
          transcript: lastEntry.transcript,
          questionText: currentQuestion?.text || '',
          conversationHistory,
          voiceMetrics,
          emotionSnapshot,
        })
      }
    }
  }, [subStage])

  // ─── Play typing sound during notes clip ──────────────────────────────────
  useEffect(() => {
    if (subStage === 'processing_notes') {
      sound.playTyping(5500)
    } else {
      sound.stopTyping()
    }
  }, [subStage])

  // ─── Join chime + notification when HR tile first appears ─────────────────
  useEffect(() => {
    if (subStage === 'hr_joins') {
      sound.playJoinChime()
      setShowJoinNotif(true)
      const t = setTimeout(() => setShowJoinNotif(false), 3000)
      return () => clearTimeout(t)
    }
  }, [subStage])

  // ─── Auto-start when component mounts ────────────────────────────────────
  useEffect(() => {
    engineStart()
  }, [])

  // ─── Register engineSilence callback with parent ref ──────────────────────────────
  useEffect(() => {
    onRegisterEngineSilence?.(engineSilence)
  }, [engineSilence, onRegisterEngineSilence])

  // ─── Silence countdown: drives the progress bar on the candidate tile ──────────
  const lastTranscriptLenRef = useRef(0)
  const lastSpeechTimeRef    = useRef(Date.now())

  useEffect(() => {
    if (!micOpen) {
      setSilenceProgress(0)
      clearInterval(silenceIntervalRef.current)
      lastTranscriptLenRef.current = 0
      lastSpeechTimeRef.current    = Date.now()
      return
    }

    silenceIntervalRef.current = setInterval(() => {
      const transcriptLen = (voiceTranscript || '').length
      if (transcriptLen > lastTranscriptLenRef.current) {
        // New speech detected — reset
        lastTranscriptLenRef.current = transcriptLen
        lastSpeechTimeRef.current    = Date.now()
        setSilenceProgress(0)
        return
      }
      if (transcriptLen > 3) {
        // Count up progress from 0→100 over silenceThreshold
        const elapsed = Date.now() - lastSpeechTimeRef.current
        const pct     = Math.min(100, Math.round((elapsed / silenceThreshold) * 100))
        setSilenceProgress(pct)
      }
    }, 250)

    return () => clearInterval(silenceIntervalRef.current)
  }, [micOpen, voiceTranscript, silenceThreshold])

  // ─── Derive HR tile visual state from subStage ────────────────────────────
  const hrTileState = (() => {
    if (['greeting','asking_intro','thanks_answering','resume_intro','project_question',
         'interesting_project','challenge_question','motivation_question',
         'transition_to_gemini','gemini_speaking','closing'].includes(subStage)) return 'speaking'
    if (['processing_notes','processing_screen','processing_project',
         'processing_challenge','processing_motivation','processing_gemini'].includes(subStage)) return 'thinking'
    if (['candidate_intro','candidate_resume','candidate_project','candidate_challenge',
         'candidate_motivation','candidate_gemini_answer'].includes(subStage)) return 'listening'
    return 'idle'
  })()

  const candidateTileState = isListening ? 'speaking' : 'idle'

  // ─── Current Gemini question text for display bar ─────────────────────────
  useEffect(() => {
    if (subStage === 'gemini_speaking' && currentQuestion?.text) {
      setCurrentGeminiQ(currentQuestion.text)
    }
  }, [subStage, currentQuestion])

  useEffect(() => {
    if (subStage !== 'gemini_speaking' || !currentQuestion?.text) {
      setLipSyncClipUrl('')
      return
    }

    const questionKey = `${geminiQuestionIdx}:${currentQuestion.text}`
    if (spokenQuestionKeyRef.current === questionKey) return
    spokenQuestionKeyRef.current = questionKey

    let cancelled = false
    setLipSyncClipUrl('')

    const playQuestion = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/interview/lip-sync/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            text: currentQuestion.text,
            persona: persona || 'sarah',
          }),
        })
        const data = response.ok ? await response.json() : null
        if (cancelled) return

        if (data?.ready && data?.video_url) {
          setLipSyncClipUrl(data.video_url)
          return
        }
      } catch (err) {
        console.warn('Lip-sync clip lookup failed; using live TTS fallback.', err)
      }

      if (!cancelled) {
        onSpeakQuestion?.(currentQuestion.text, { onEnded: onGeminiTTSEnded })
      }
    }

    playQuestion()

    return () => {
      cancelled = true
    }
  }, [subStage, currentQuestion, geminiQuestionIdx, persona, onSpeakQuestion, onGeminiTTSEnded])

  const submitCandidateResponse = useCallback((transcript) => {
    const cleaned = transcript.trim()
    if (!cleaned) return
    engineSilence(cleaned)
    onSilenceDetected?.(cleaned)
  }, [engineSilence, onSilenceDetected])

  const playbackClip = subStage === 'gemini_speaking' && lipSyncClipUrl
    ? { clipName: '', srcOverride: lipSyncClipUrl, muted: false, loop: false }
    : { ...currentClip, srcOverride: '' }

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'm' || e.key === 'M') onMicToggle?.()
      if (e.key === 'v' || e.key === 'V') onCameraToggle?.()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onMicToggle, onCameraToggle])

  const fullTranscriptText = ((voiceTranscript || '') + ' ' + (voiceInterim || '')).trim()
  const currentWordCount = fullTranscriptText ? fullTranscriptText.split(/\s+/).length : 0
  const realTimeWPM = micSeconds > 2 ? Math.round((currentWordCount / micSeconds) * 60) : 0

  const fillerList = ['um', 'uh', 'like', 'so', 'basically', 'actually']
  const currentFillerCount = fullTranscriptText
    ? fullTranscriptText.toLowerCase().split(/\s+/).filter(word => fillerList.includes(word.replace(/[^a-z]/g, ''))).length
    : 0

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-full bg-[#161618] overflow-hidden select-none">

      {/* ── JOIN NOTIFICATION ── */}
      <AnimatePresence>
        {showJoinNotif && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50
                       bg-[#2a2a2e]/95 backdrop-blur-xl border border-white/10
                       rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center text-white text-xs font-bold">
              S
            </div>
            <span className="text-sm font-semibold text-white">Sarah Chen has joined</span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ HEADER BAR ══════════════════ */}
      <div className="h-12 flex items-center justify-between px-4
                      bg-[#1c1c1e]/95 backdrop-blur-xl border-b border-white/[0.06]
                      shrink-0 z-20">

        {/* Left: REC + Company */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/25
                          px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-400 tracking-widest">REC</span>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:inline">
            TalentForge Careers
          </span>
          <span className="text-white/20 hidden sm:inline">·</span>
          <span className="text-xs text-white/50 hidden md:inline">
            Interview with {interviewerName}
          </span>
        </div>

        {/* Center: Progress + Elapsed */}
        <div className="flex items-center gap-2">
          {currentIndex > 0 && (
            <div className="bg-white/[0.06] border border-white/[0.08] px-3 py-1 rounded-lg
                            text-xs font-semibold text-white/80">
              Q {currentIndex + 1} / {totalQuestions}
            </div>
          )}
          <div className="bg-white/[0.06] border border-white/[0.08] px-3 py-1 rounded-lg
                          text-xs font-mono text-white/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            {elapsed}
          </div>
        </div>

        {/* Right: Network + Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <Wifi className="w-3.5 h-3.5" />
            <span>{networkQuality}</span>
          </div>
          <span className="text-[11px] text-white/60 font-mono hidden sm:inline">{clock}</span>
        </div>
      </div>

      {/* ══════════════════ MAIN VIDEO AREA ══════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 min-h-0" data-testid="interview-room-container">

        {/* Videos Column */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">
          {/* ── HR TILE (Sarah Chen) ────────────────────────────── */}
          <div className={`flex-1 relative rounded-2xl overflow-hidden
                           transition-all duration-500 ${RING[hrTileState]}`}>

            {/* Connecting overlay */}
            <AnimatePresence>
              {subStage === 'connecting' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#1a1a1e] z-30 flex flex-col
                             items-center justify-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500
                                  to-violet-600 flex items-center justify-center
                                  animate-pulse shadow-2xl shadow-violet-600/30">
                    <span className="text-2xl font-black text-white">S</span>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">Connecting to Sarah Chen...</p>
                    <p className="text-white/40 text-xs mt-1">HR Director · TalentForge Careers</p>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[0,1,2].map(i => (
                      <div key={i}
                        className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HR Video / Static Image */}
            {persona === 'nagma_hr' ? (
              <img
                src="/interviewers/nagma_hr.png"
                alt="Nagma HR"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <HRVideoPlayer
                clipName={currentClip.clipName}
                muted={currentClip.muted}
                loop={currentClip.loop}
                onEnded={onVideoEnded}
                onIdleEnded={onIdleEnded}
                className="absolute inset-0"
                isSpeakingStage={subStage === 'gemini_speaking'}
                isInterviewerSpeaking={isInterviewerSpeaking}
              />
            )}

            {/* Cinematic vignette */}
            <div className="absolute inset-0 pointer-events-none z-[5]"
              style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)' }}
            />

            {/* Background processing overlay */}
            <AnimatePresence>
              {['processing_notes','processing_screen','processing_gemini'].includes(subStage) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#0d0d11]/75 backdrop-blur-[2px]
                             z-10 flex flex-col items-center justify-center gap-3"
                >
                  {/* Subtle spinner */}
                  <div className="w-9 h-9 rounded-full border-[3px] border-indigo-500/10
                                  border-t-indigo-400 animate-spin" />
                  <div className="text-center">
                    <p className="text-white/80 text-xs font-semibold tracking-wider uppercase">
                      Evaluating Response
                    </p>
                    <p className="text-white/40 text-[10px] mt-1">
                      Gemini is generating dynamic follow-up analysis...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name plate */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10 pointer-events-none">
              <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2
                              flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-bold leading-none">{interviewerName}</p>
                  <p className="text-white/55 text-[10px] mt-0.5">
                    {persona === 'nagma_hr' ? 'Gemini AI Recruiter' : 'HR Director'}
                  </p>
                </div>
                {/* Active speaker wave indicator */}
                {isInterviewerSpeaking && (
                  <div className="flex items-end gap-0.5 h-3">
                    {[0,1,2].map(i => (
                      <span key={i}
                        className="w-1 h-1 rounded-full bg-white/50 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── CANDIDATE TILE ─────────────────────────────────── */}
          <div className={`flex-1 relative rounded-2xl overflow-hidden
                           transition-all duration-500 bg-[#1a1a1e]
                           ${RING[candidateTileState]}`}>

            {/* Webcam feed */}
            {activeMediaStream && cameraEnabled ? (
              <video
                ref={cameraPreviewRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-600
                                to-slate-800 flex items-center justify-center">
                  <span className="text-3xl font-black text-white/70">
                    {(candidateName || 'Y')[0].toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Gaze Status Badge */}
            {persona === 'nagma_hr' && faceApiLoaded && (
              <div className={`absolute top-4 right-4 bg-[#05070c]/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-mono font-medium flex items-center gap-1.5 border border-white/10 transition-colors duration-200 z-10
                ${gazeStatus === 'good' ? 'text-emerald-400' : gazeStatus === 'away' ? 'text-amber-400' : 'text-red-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse
                  ${gazeStatus === 'good' ? 'bg-emerald-400' : gazeStatus === 'away' ? 'bg-amber-400' : 'bg-red-400'}`} />
                <span>
                  {gazeStatus === 'good' ? 'Eye Contact: Good' : gazeStatus === 'away' ? 'Look at camera' : 'Calibrating...'}
                </span>
              </div>
            )}

            {/* Real-time Speech HUD overlay (top-left) */}
            <AnimatePresence>
              {micOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-4 left-4 bg-[#05070c]/85 backdrop-blur-md
                             rounded-xl p-2 px-3 border border-white/10 z-10 flex items-center gap-3"
                >
                  {/* WPM Pace */}
                  <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Pacing</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold font-mono text-white">
                        {realTimeWPM > 0 ? `${realTimeWPM} WPM` : '...'}
                      </span>
                      {realTimeWPM > 0 && (
                        <span className={`text-[8px] px-1 py-0.2 rounded font-medium ${
                          realTimeWPM >= 110 && realTimeWPM <= 165
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {realTimeWPM >= 110 && realTimeWPM <= 165 ? 'Optimal' : realTimeWPM > 165 ? 'Too Fast' : 'Too Slow'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-6 bg-white/10" />

                  {/* Filler words */}
                  <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Fillers</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold font-mono text-white">
                        {currentFillerCount}
                      </span>
                      <span className={`text-[8px] px-1 py-0.2 rounded font-medium ${
                        currentFillerCount <= 2
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : currentFillerCount <= 5
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {currentFillerCount <= 2 ? 'Low' : currentFillerCount <= 5 ? 'Mindful' : 'High'}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-6 bg-white/10" />

                  {/* Time spoken */}
                  <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Speaking Time</span>
                    <span className="text-[11px] font-bold font-mono text-white">
                      {Math.floor(micSeconds / 60)}:{(micSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Animated Voice Indicator */}
                  <div className="flex items-center gap-0.5 ml-1">
                    <span className="w-1 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-3.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Candidate Name plate */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10 pointer-events-none">
              <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2
                              flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-bold leading-none">{candidateName || 'You'}</p>
                  <p className="text-white/55 text-[10px] mt-0.5">Candidate</p>
                </div>
                {isListening && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/25 animate-pulse uppercase font-mono">
                    Speaking
                  </span>
                )}
              </div>
            </div>

            {/* Silence countdown bar — grows left→right as silence approaches submit threshold */}
            <AnimatePresence>
              {micOpen && voiceTranscript?.length > 3 && silenceProgress > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 left-0 right-0 z-30 h-1"
                >
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-amber-300 transition-all duration-500 ease-linear rounded-b"
                    style={{ width: `${silenceProgress}%` }}
                  />
                  <div className="absolute top-2 right-3 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5">
                    <span className="text-[10px] text-amber-300 font-semibold">
                      Submitting in {Math.max(0, Math.ceil(((100 - silenceProgress) / 100) * 3.5))}s…
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live caption strip */}
            <AnimatePresence>
              {(voiceTranscript || voiceInterim) && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="absolute bottom-14 left-3 right-3 z-10
                             bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2"
                >
                  <p className="text-white text-[11px] leading-relaxed line-clamp-2">
                    {voiceTranscript}
                    {voiceInterim && (
                      <span className="text-white/50"> {voiceInterim}</span>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text fallback input overlay when mic/speech recognition fails */}
            {micOpen && (
              <div className="absolute bottom-16 left-3 right-3 z-20 flex gap-2 bg-black/85 backdrop-blur-md p-2.5 rounded-xl border border-white/10 shadow-xl">
                <input
                  type="text"
                  value={typedResponse}
                  onChange={(e) => setTypedResponse(e.target.value)}
                  placeholder="Type response here if voice recognition fails..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && typedResponse.trim()) {
                      submitCandidateResponse(typedResponse)
                      setTypedResponse('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (typedResponse.trim()) {
                      submitCandidateResponse(typedResponse)
                      setTypedResponse('')
                    }
                  }}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Send
                </button>
              </div>
            )}

          {/* Background interviewer response */}
          <AnimatePresence>
            {backgroundInterviewer?.response && ['processing_notes','processing_screen','processing_gemini'].includes(subStage) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-3 right-3 top-3 z-20 rounded-xl border border-cyan-400/20 bg-black/70 px-3 py-2.5 backdrop-blur-md shadow-2xl"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Background interview analysis</span>
                  <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
                    {backgroundInterviewer.overall_score || 0}/100
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-white/85">{backgroundInterviewer.response}</p>
                {backgroundInterviewer.priority_focus && (
                  <p className="mt-1 line-clamp-1 text-[10px] text-white/50">Focus: {backgroundInterviewer.priority_focus}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name plate */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2
                            flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isListening && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                )}
                <div>
                  <p className="text-white text-xs font-bold leading-none">{candidateName}</p>
                  <p className="text-white/55 text-[10px] mt-0.5">Candidate</p>
                </div>
              </div>
              <span className="text-[10px] text-white/35 font-medium">You</span>
            </div>
          </div>

          {/* Camera off overlay */}
          {!cameraEnabled && (
            <div className="absolute inset-0 bg-[#1a1a1e] flex items-center justify-center z-20">
              <VideoOff className="w-8 h-8 text-white/20" />
            </div>
          )}
        </div>
      </div>

      {/* Vantage Insights Sidebar Column */}
      {persona === 'nagma_hr' && (
        <div className="w-full lg:w-[320px] bg-[#111726]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto z-10 shrink-0 select-none">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2 font-mono">Interview Score</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-teal-400">{scoresList.length > 0 ? `${Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length)}%` : '—'}</div>
              <div className="text-[10px] text-white/40 leading-tight">
                running average<br />across {scoresList.length} answer(s)
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2 font-mono">Key Strengths</div>
            <div className="flex flex-wrap gap-1.5">
              {strengths.length > 0 ? (
                strengths.slice(0, 6).map((s, idx) => (
                  <span key={idx} className="bg-teal-500/10 text-teal-300 text-[10px] px-2.5 py-1 rounded-full font-medium border border-teal-500/20">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-white/35 italic">Will populate as you answer...</span>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2 font-mono">Progress</div>
            <div className="h-2 bg-[#1b2334] rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-300" style={{ width: `${totalQuestions > 0 ? Math.min(100, Math.round((conversationHistory.length / totalQuestions) * 100)) : 0}%` }} />
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2 font-mono">Camera Presence</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/10">
                <div className="text-lg font-bold text-white">{totalsRef.current.frames > 0 ? `${inFramePct}%` : '—'}</div>
                <div className="text-[9px] text-white/40 uppercase tracking-wider font-mono">in frame</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/10">
                <div className="text-lg font-bold text-white">{totalsRef.current.frames > 0 ? `${eyeContactPct}%` : '—'}</div>
                <div className="text-[9px] text-white/40 uppercase tracking-wider font-mono">eye contact</div>
              </div>
            </div>
          </div>

          {/* STAR Checklist Panel */}
          <div className="border-t border-white/5 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2.5 font-mono flex items-center justify-between">
              <span>STAR Response Matrix</span>
              <span className="text-[9px] text-teal-400 font-mono animate-pulse">Live Auditor</span>
            </div>
            {(() => {
              const text = (voiceTranscript || '') + ' ' + typedResponse;
              const t = text.toLowerCase();
              const star = {
                situation: t.length > 35 || /\b(when|project|client|team|role|background|context|system|company)\b/.test(t),
                task: /\b(need|task|goal|challenge|problem|objective|responsible|assigned|require|deliver)\b/.test(t),
                action: /\b(created|built|implement|design|wrote|solved|develop|lead|action|analyze|debug|refactor)\b/.test(t),
                result: /\b(result|outcome|improve|increase|decrease|save|learn|success|impact|achieve|metric|percent)\b/.test(t),
              };
              return (
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className={`p-2 rounded-xl border flex flex-col gap-1 transition-all duration-300 ${star.situation ? 'bg-teal-500/10 border-teal-500/30 text-teal-200 shadow-[0_0_8px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 text-white/30'}`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black ${star.situation ? 'bg-teal-400 text-slate-950 font-bold' : 'bg-white/10 text-white/40'}`}>S</div>
                      <span className="font-semibold">Situation</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${star.situation ? 'w-full bg-teal-400' : 'w-0 bg-transparent'}`} />
                    </div>
                  </div>
                  <div className={`p-2 rounded-xl border flex flex-col gap-1 transition-all duration-300 ${star.task ? 'bg-teal-500/10 border-teal-500/30 text-teal-200 shadow-[0_0_8px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 text-white/30'}`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black ${star.task ? 'bg-teal-400 text-slate-950 font-bold' : 'bg-white/10 text-white/40'}`}>T</div>
                      <span className="font-semibold">Task</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${star.task ? 'w-full bg-teal-400' : 'w-0 bg-transparent'}`} />
                    </div>
                  </div>
                  <div className={`p-2 rounded-xl border flex flex-col gap-1 transition-all duration-300 ${star.action ? 'bg-teal-500/10 border-teal-500/30 text-teal-200 shadow-[0_0_8px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 text-white/30'}`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black ${star.action ? 'bg-teal-400 text-slate-950 font-bold' : 'bg-white/10 text-white/40'}`}>A</div>
                      <span className="font-semibold">Action</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${star.action ? 'w-full bg-teal-400' : 'w-0 bg-transparent'}`} />
                    </div>
                  </div>
                  <div className={`p-2 rounded-xl border flex flex-col gap-1 transition-all duration-300 ${star.result ? 'bg-teal-500/10 border-teal-500/30 text-teal-200 shadow-[0_0_8px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 text-white/30'}`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black ${star.result ? 'bg-teal-400 text-slate-950 font-bold' : 'bg-white/10 text-white/40'}`}>R</div>
                      <span className="font-semibold">Result</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${star.result ? 'w-full bg-teal-400' : 'w-0 bg-transparent'}`} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Live Speaking Pace Auditor */}
          <div className="border-t border-white/5 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2 font-mono flex items-center justify-between">
              <span>Speech Pacing Rate</span>
              <span className="text-[9px] text-indigo-400 font-mono">Telemetry</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between gap-3 font-mono">
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-white tracking-tight">{realTimeWPM || '—'}</span>
                  <span className="text-[9px] text-white/40">WPM</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5 flex gap-[1px]">
                  <div className={`h-full rounded-l ${realTimeWPM > 0 && realTimeWPM < 110 ? 'w-1/3 bg-amber-400' : realTimeWPM >= 110 ? 'w-1/3 bg-emerald-500/40' : 'w-0 bg-transparent'}`} />
                  <div className={`h-full ${realTimeWPM >= 110 && realTimeWPM <= 160 ? 'w-1/3 bg-emerald-400' : realTimeWPM > 160 ? 'w-1/3 bg-rose-500/40' : 'w-0 bg-transparent'}`} />
                  <div className={`h-full rounded-r ${realTimeWPM > 160 ? 'w-1/3 bg-rose-500' : 'w-0 bg-transparent'}`} />
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  realTimeWPM === 0
                    ? 'bg-white/5 text-white/45'
                    : realTimeWPM < 110
                    ? 'bg-amber-400/10 text-amber-300 border border-amber-500/20'
                    : realTimeWPM <= 160
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                }`}>
                  {realTimeWPM === 0 ? 'Silent' : realTimeWPM < 110 ? 'Slow' : realTimeWPM <= 160 ? 'Ideal' : 'Fast'}
                </span>
                <p className="text-[8px] text-white/30 mt-1 font-sans">Ideal: 110-160 WPM</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 flex-1 flex flex-col min-h-[140px]">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2 font-mono">Moments Log</div>
            <div className="flex-1 bg-black/20 rounded-xl p-3 border border-white/5 overflow-y-auto max-h-[160px] text-[11px] space-y-2">
              {moments.length > 0 ? (
                moments.map((m, idx) => (
                  <div key={idx} className={`flex gap-2 items-start ${m.kind === 'warn' ? 'text-amber-300' : 'text-teal-300'}`}>
                    <span className="font-mono text-[9px] text-white/30 shrink-0 pt-0.5">{String(Math.floor(m.t / 60)).padStart(2, '0')}:{String(m.t % 60).padStart(2, '0')}</span>
                    <span>{m.text}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-white/35 italic">Tracking eye contact & framing live...</span>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 flex-1 flex flex-col min-h-[120px]">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2 font-mono">AI Observations</div>
            <div className="flex-1 bg-black/20 rounded-xl p-3 border border-white/5 overflow-y-auto max-h-[140px] font-mono text-[10px] leading-relaxed text-white/60">
              {observations.length > 0 ? (
                observations.map((obs, idx) => (
                  <div key={idx} className="border-b border-white/5 pb-2 mb-2 last:border-0 last:pb-0">
                    {obs}
                  </div>
                ))
              ) : (
                <span className="text-white/30 italic">Observations will appear here as the interview progresses.</span>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ══════════════════ QUESTION BAR (Universal display) ══════════════════ */}
      <AnimatePresence>
        {currentQuestion?.text && ![
          'connecting', 'hr_joins', 'greeting', 
          'processing_notes', 'processing_screen', 
          'processing_project', 'processing_challenge', 'processing_motivation', 'processing_gemini',
          'transition_to_gemini', 'closing', 'complete'
        ].includes(subStage) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-3 mb-1 overflow-hidden"
          >
            <div className="bg-[#1e1e22]/95 backdrop-blur-xl border border-white/[0.08]
                            rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-500/50
                              flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                <ChevronRight className="w-3 h-3 text-indigo-400" />
              </div>
              <p className="text-white/85 text-xs leading-relaxed">{currentQuestion.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ CONTROL BAR ══════════════════ */}
      <div className="h-16 flex items-center justify-between px-6
                      bg-[#1c1c1e]/95 backdrop-blur-xl border-t border-white/[0.06]
                      shrink-0">

        {/* Left controls */}
        <div className="flex items-center gap-3">
          {/* Mic */}
          <button
            onClick={onMicToggle}
            title={micEnabled ? 'Mute' : 'Unmute'}
            aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            className={`w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-200 font-medium text-sm
                        ${micEnabled
                          ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'}`}
          >
            {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <span className="text-[10px] text-white/60 hidden sm:inline">
            {micEnabled ? 'Mute' : 'Unmuted'}
          </span>

          {/* Camera */}
          <button
            onClick={onCameraToggle}
            title={cameraEnabled ? 'Stop Video' : 'Start Video'}
            aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            className={`w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-200
                        ${cameraEnabled
                          ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'}`}
          >
            {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <span className="text-[10px] text-white/60 hidden sm:inline">
            {cameraEnabled ? 'Stop Video' : 'Start Video'}
          </span>
        </div>

        {/* Center: stage status with voice waveform */}
        <div className="text-center hidden md:block">
          <div className="flex items-center justify-center gap-3">
            <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">
              {isListening
                ? '● Recording response'
                : hrTileState === 'speaking'
                  ? `${interviewerName.split(' ')[0]} is speaking`
                  : hrTileState === 'thinking'
                    ? `${interviewerName.split(' ')[0]} is reviewing...`
                    : 'Interview in progress'}
            </p>
            {isListening && (
              <div className="flex items-center gap-[2.5px] h-3.5 px-1 bg-cyan-500/10 border border-cyan-500/25 rounded-md">
                {[1, 2.5, 1.5, 3, 2, 1.2, 2.2, 1.8, 1].map((val, idx) => (
                  <motion.div
                    key={idx}
                    className="w-[2px] bg-cyan-400 rounded-full"
                    animate={{ height: ['4px', `${val * 4.5}px`, '4px'] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse', delay: idx * 0.04 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Participants (opens telemetry drawer) */}
          <button
            onClick={() => setShowDrawer(d => !d)}
            className="w-10 h-10 rounded-full bg-[#2c2c2e] hover:bg-[#3a3a3c]
                       text-white flex items-center justify-center transition-all"
            title="Participants & Analytics"
            aria-label="Open participants and analytics panel"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* End call */}
          <button
            onClick={onEndInterview}
            aria-label="End interview session"
            className="h-10 px-5 rounded-full bg-red-600 hover:bg-red-500
                       text-white text-sm font-semibold flex items-center gap-2
                       transition-all duration-200 shadow-lg shadow-red-600/30"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </div>

      {/* ══════════════════ TELEMETRY SLIDE-OUT DRAWER ══════════════════ */}
      <AnimatePresence>
        {showDrawer && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 40 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-[#1c1c1e]/98
                       backdrop-blur-2xl border-l border-white/[0.08] z-40
                       flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">Participants & Analytics</h3>
              <button onClick={() => setShowDrawer(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1]
                           flex items-center justify-center text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Participants */}
            <div className="p-4 space-y-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                Participants (2)
              </p>
              {[
                { name: 'Sarah Chen', role: 'HR Director', online: true },
                { name: candidateName || 'You', role: 'Candidate', online: true },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500
                                  to-violet-600 flex items-center justify-center text-white
                                  text-xs font-bold shrink-0">
                    {p.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{p.name}</p>
                    <p className="text-[10px] text-white/40">{p.role}</p>
                  </div>
                  <div className="ml-auto w-2 h-2 rounded-full bg-green-400" />
                </div>
              ))}
            </div>

            {/* Coaching tips */}
            {coachingTips?.length > 0 && (
              <div className="p-4 space-y-2">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                  Live Tips
                </p>
                {coachingTips.slice(0, 4).map((tip, i) => (
                  <div key={i}
                    className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
                    <p className="text-[11px] text-white/70 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Background interviewer */}
            {backgroundInterviewer && (
              <div className="p-4 border-t border-white/[0.06] space-y-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                  Background Interviewer
                </p>
                <div className="bg-cyan-400/[0.06] border border-cyan-400/15 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-white/75 leading-relaxed">{backgroundInterviewer.feedback}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                    <span className="block text-[10px] text-white/40">Overall</span>
                    <span className="text-sm font-bold text-white">{backgroundInterviewer.overall_score || 0}</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                    <span className="block text-[10px] text-white/40">Confidence</span>
                    <span className="text-sm font-bold text-white">{backgroundInterviewer.confidence_score || 0}</span>
                  </div>
                </div>
                {backgroundInterviewer.suggested_next_action && (
                  <p className="text-[11px] text-white/55 leading-relaxed">Next: {backgroundInterviewer.suggested_next_action}</p>
                )}
              </div>
            )}

            {/* Voice metrics */}
            {voiceMetrics && (
              <div className="p-4 border-t border-white/[0.06] space-y-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                  Voice Metrics
                </p>
                {[
                  { label: 'Speaking Rate', value: `${voiceMetrics.wpm || 0} wpm` },
                  { label: 'Clarity Score', value: `${voiceMetrics.clarity_score || 0}%` },
                  { label: 'Filler Words', value: voiceMetrics.filler_count || 0 },
                ].map(m => (
                  <div key={m.label} className="flex justify-between items-center">
                    <span className="text-[11px] text-white/50">{m.label}</span>
                    <span className="text-[11px] text-white font-semibold">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * AIInterviewerRoom.jsx
 *
 * Replaces the old split-screen Video Interview cockpit with a modern,
 * premium AI Interview Room UI/UX.
 *
 * This component acts as the main cockpit during an active session on `/dashboard/interview`.
 * Decouples the visual layout and rendering of the interviewer avatar, webcam, transcript,
 * controls, and analytics while preserving all existing logic, devices, WebRTC telemetry,
 * and Flask backend integrations.
 *
 * @component
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CameraOff, Mic, MicOff, Volume2, VolumeX,
  RotateCcw, Maximize, PhoneOff, Settings, X, Wifi,
  Brain, Send, Keyboard, Activity, Shield, AlertCircle,
  Video, VideoOff, User, Bell, Signal
} from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'
import { loadRnnoise, RnnoiseWorkletNode } from '@sapphi-red/web-noise-suppressor'
import { computeConfidenceScore } from '../utils/confidenceScore'

// ─── Reusable Audio Waveform Canvas Component ──────────────────
function AudioWaveformCanvas({ isActive, analyser, color = '#10B981', isAI = false }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const bufferLength = 64
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      if (analyser && !isAI && isActive) {
        analyser.getByteTimeDomainData(dataArray)
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.beginPath()

        const sliceWidth = width / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0
          const y = (v * height) / 2

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }

          x += sliceWidth
        }

        ctx.lineTo(width, height / 2)
        ctx.stroke()
      } else if (isAI && isActive) {
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.beginPath()

        const sliceWidth = width / 50
        let x = 0
        const time = Date.now() * 0.02

        for (let i = 0; i < 50; i++) {
          const amp1 = Math.sin(i * 0.2 + time) * 0.35
          const amp2 = Math.cos(i * 0.5 - time * 0.7) * 0.15
          const y = (height / 2) + (amp1 + amp2) * height * 0.7 * Math.sin((i / 50) * Math.PI)

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
          x += sliceWidth
        }
        ctx.stroke()
      } else {
        ctx.lineWidth = 1.5
        ctx.strokeStyle = color + '44'
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        ctx.lineTo(width, height / 2)
        ctx.stroke()
      }
    }

    draw()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, analyser, color, isAI])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={32}
      className="w-[120px] h-[32px] rounded-lg opacity-80"
    />
  )
}


// ─── Hardcoded Persona Configuration ──────────────────────────
const PERSONAS = {
  sarah: {
    name: 'Sarah Chen',
    title: 'Senior HR Director',
    company: 'TalentForge AI',
    photo: '/interviewers/sarah_chen.png',
    focus: 'Cultural alignment, behavioral scenarios, leadership',
    accentColor: '#8B5CF6',
    accentBg: 'rgba(139,92,246,0.15)',
    accent: '#8b5cf6',
    suit: '#25213f',
    skin: '#c99171',
    hair: '#201716'
  },
  marcus: {
    name: 'Marcus Rodriguez',
    title: 'Technical Lead',
    company: 'TalentForge AI',
    photo: '/interviewers/marcus_rodriguez.png',
    focus: 'Technical workflows, systems design, debugging',
    accentColor: '#06B6D4',
    accentBg: 'rgba(6,182,212,0.15)',
    accent: '#06b6d4',
    suit: '#1d3144',
    skin: '#b97858',
    hair: '#191919'
  }
}

// Helper to format timer seconds
const formatTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function AIInterviewerRoom({
  interviewFormat = 'video',
  questions = [],
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
  cameraEnabled = true,
  onCameraToggle,
  micEnabled = true,
  onMicToggle,
  showTypingFallback = false,
  onShowTypingFallbackChange,
  answer = '',
  onAnswerChange,
  isEvaluating = false
}) {
  const storeCandidateName = useAppStore(state => state.candidateName)
  const ttsMode = useAppStore(state => state.ttsMode)
  const setTtsMode = useAppStore(state => state.setTtsMode)
  const candidateName = storeCandidateName && storeCandidateName.trim() ? storeCandidateName : 'Manikanta'
  const [showSettings, setShowSettings] = useState(false)
  const [activeSidebarTab, setActiveSidebarTab] = useState('progress') // 'progress' | 'telemetry'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [simulatedAmplitude, setSimulatedAmplitude] = useState(0)
  const [useVideoClips, setUseVideoClips] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [virtualBgMode, setVirtualBgMode] = useState('none') // 'none' | 'blur' | 'color'
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(true)
  const [isBlinking, setIsBlinking] = useState(false)
  const [candidateAnalyser, setCandidateAnalyser] = useState(null)
  const [blinkCount, setBlinkCount] = useState(0)
  const [faceLandmarker, setFaceLandmarker] = useState(null)
  const selfieSegmentationRef = useRef(null)
  const segmentedCanvasRef = useRef(null)
  const loopRef = useRef(null)
  const candidateBlinkingRef = useRef(false)
  const [isWebcamDraggable, setIsWebcamDraggable] = useState(true)
  const [webcamPos, setWebcamPos] = useState({ x: 0, y: 0 })
  const webcamRef = useRef(null)
  const dragStartRef = useRef(null)
  // ─── Persona Info lookup ────────────────────────────────────
  const persona = PERSONAS[interviewerPersona] || PERSONAS.sarah

  // ─── FSM Avatar state mapping with transition smoothing ──────
  const [avatarFsmState, setAvatarFsmState] = useState('idle')

  useEffect(() => {
    const rawState = isEvaluating
      ? 'thinking'
      : isSpeaking
        ? 'speaking'
        : isListening
          ? 'listening'
          : 'idle'

    if (rawState !== 'idle') {
      setAvatarFsmState(rawState)
    } else {
      // Debounce transition to 'idle' by 750ms to allow smooth voice engine handovers
      const timer = setTimeout(() => {
        setAvatarFsmState('idle')
      }, 750)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isEvaluating, isSpeaking, isListening])

  // Dynamic SpeechSynthesis word boundary hook to drive realistic mouth lip sync
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined

    // Intercept speechSynthesis.speak to capture utterance word boundary timings
    if (!window._speechSynthesisHooked) {
      window._speechSynthesisHooked = true
      const originalSpeak = window.speechSynthesis.speak
      window.speechSynthesis.speak = function (utterance) {
        const originalOnBoundary = utterance.onboundary
        utterance.onboundary = function (event) {
          if (event.name === 'word') {
            if (typeof window.onSpeechBoundary === 'function') {
              window.onSpeechBoundary(event.charLength || 5)
            }
          }
          if (originalOnBoundary) {
            originalOnBoundary.apply(this, arguments)
          }
        }
        return originalSpeak.apply(this, arguments)
      }
    }

    let decayTimer = null
    let currentAmp = 0

    window.onSpeechBoundary = (charLength) => {
      if (avatarFsmState !== 'speaking') return

      // Set peak amplitude
      currentAmp = 0.85
      setSimulatedAmplitude(0.85)

      if (decayTimer) clearInterval(decayTimer)

      // Syllables take ~60-80ms per character to speak
      const duration = Math.max(120, Math.min(600, charLength * 70))
      const steps = 6
      const stepDuration = duration / steps
      const decayAmount = 0.85 / steps

      let stepCount = 0
      decayTimer = setInterval(() => {
        stepCount++
        currentAmp = Math.max(0, currentAmp - decayAmount)
        setSimulatedAmplitude(currentAmp)
        if (stepCount >= steps || currentAmp <= 0) {
          clearInterval(decayTimer)
          setSimulatedAmplitude(0)
        }
      }, stepDuration)
    }

    return () => {
      if (decayTimer) clearInterval(decayTimer)
      window.onSpeechBoundary = null
    }
  }, [avatarFsmState])

  // AI Eyelid Blinking Simulation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 160)
    }, 3900)
    return () => clearInterval(blinkInterval)
  }, [])

  // ─── Question Text Resolver ─────────────────────────────────
  const displayedQuestionText = useMemo(() => {
    if (encouragementText) return encouragementText
    if (onboardingQuestionText && zoomPhase && zoomPhase !== 'greet_mic') {
      return onboardingQuestionText
    }
    if (zoomPhase === 'greet_mic') {
      return "Hello, good morning! Welcome to the interview. Can you hear and see me clearly?"
    }
    if (zoomPhase === 'small_talk') {
      return "Wonderful. Thank you for joining on time. How has your day been so far?"
    }
    if (zoomPhase === 'identity_confirm') {
      return "Before we begin, could you please introduce yourself, confirm your full name, and walk me through your background?"
    }
    if (zoomPhase === 'candidate_questions') {
      return "We've covered all of my questions. Before we conclude, do you have any questions for me about the role?"
    }
    if (zoomPhase === 'closing') {
      return "It was a pleasure speaking with you today. Your interview has been completed successfully. You will receive your feedback report shortly."
    }
    return currentQuestion?.text || "Preparing your next question..."
  }, [encouragementText, onboardingQuestionText, zoomPhase, currentQuestion])

  // ─── Audio Levels Visualizer ────────────────────────────────
  useEffect(() => {
    if (!activeMediaStream || !micEnabled) {
      setAudioLevel(0)
      setCandidateAnalyser(null)
      return
    }
    let audioContext, analyser, microphone, suppressorNode, javascriptNode
    let active = true
    const initAudioGraph = async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        audioContext = new AudioCtx()
        analyser = audioContext.createAnalyser()
        analyser.smoothingTimeConstant = 0.6
        analyser.fftSize = 512
        
        microphone = audioContext.createMediaStreamSource(activeMediaStream)
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1)

        if (noiseSuppressionEnabled) {
          try {
            await audioContext.audioWorklet.addModule("https://cdn.jsdelivr.net/npm/@sapphi-red/web-noise-suppressor@0.3.5/dist/rnnoiseWorklet.js")
            const wasmBinary = await loadRnnoise({
              url: "https://cdn.jsdelivr.net/npm/@sapphi-red/web-noise-suppressor@0.3.5/dist/rnnoise.wasm",
              simdUrl: "https://cdn.jsdelivr.net/npm/@sapphi-red/web-noise-suppressor@0.3.5/dist/rnnoise_simd.wasm"
            })
            suppressorNode = new RnnoiseWorkletNode(audioContext, {
              maxChannels: 1,
              wasmBinary
            })
          } catch (suppressError) {
            console.warn("RNNoise suppression failed to instantiate, using raw microphone:", suppressError)
          }
        }

        if (active) {
          if (suppressorNode) {
            microphone.connect(suppressorNode)
            suppressorNode.connect(analyser)
          } else {
            microphone.connect(analyser)
          }

          analyser.connect(javascriptNode)
          javascriptNode.connect(audioContext.destination)
          setCandidateAnalyser(analyser)
        }

        javascriptNode.onaudioprocess = () => {
          if (!active) return
          const array = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(array)
          let values = 0
          const length = array.length
          for (let i = 0; i < length; i++) values += array[i]
          const average = values / length
          setAudioLevel(Math.min(100, Math.round((average / 110) * 100)))
        }
      } catch (e) {
        console.warn("Failed to initialize audio levels visualizer:", e)
      }
    }

    initAudioGraph()

    return () => {
      active = false
      try {
        javascriptNode?.disconnect()
        microphone?.disconnect()
        analyser?.disconnect()
        audioContext?.close()
      } catch (_) {
        // Ignore cleanup errors from already-disconnected audio nodes.
      }
    }
  }, [activeMediaStream, micEnabled, noiseSuppressionEnabled])

  // ─── Dynamic script loader for Selfie Segmentation ───────────
  const loadSelfieSegmentation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.SelfieSegmentation) {
        resolve(window.SelfieSegmentation)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js'
      script.async = true
      script.onload = () => resolve(window.SelfieSegmentation)
      script.onerror = () => reject(new Error('Failed to load Selfie Segmentation'))
      document.head.appendChild(script)
    })
  }, [])

  // ─── Initialize MediaPipe Face Landmarker ────────────────────
  useEffect(() => {
    let active = true
    const initLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        )
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        })
        if (active) {
          setFaceLandmarker(landmarker)
          console.log("MediaPipe FaceLandmarker loaded successfully!")
        }
      } catch (error) {
        console.warn("Failed to initialize FaceLandmarker, falling back:", error)
      }
    }
    initLandmarker()
    return () => {
      active = false
    }
  }, [])

  // ─── Initialize MediaPipe Selfie Segmentation ─────────────────
  useEffect(() => {
    if (virtualBgMode === 'none') return
    let active = true
    const initSegmentation = async () => {
      try {
        const SelfieSeg = await loadSelfieSegmentation()
        if (!active) return
        const segmenter = new SelfieSeg({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        })
        segmenter.setOptions({
          modelSelection: 1 // landscape/fast
        })
        segmenter.onResults((results) => {
          if (!active) return
          drawSegmentedBackground(results)
        })
        selfieSegmentationRef.current = segmenter
      } catch (error) {
        console.warn("Failed to initialize Selfie Segmentation:", error)
      }
    }
    initSegmentation()
    return () => {
      active = false
      selfieSegmentationRef.current = null
    }
  }, [virtualBgMode, loadSelfieSegmentation])

  const drawSegmentedBackground = (results) => {
    const canvas = segmentedCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width = results.image.width
    const height = canvas.height = results.image.height

    ctx.save()
    ctx.clearRect(0, 0, width, height)

    // Draw the segmentation mask
    ctx.drawImage(results.segmentationMask, 0, 0, width, height)

    // Use destination-out to clear background area
    ctx.globalCompositeOperation = 'source-out'
    if (virtualBgMode === 'blur') {
      ctx.filter = 'blur(16px)'
      ctx.drawImage(results.image, 0, 0, width, height)
      ctx.filter = 'none'
    } else if (virtualBgMode === 'color') {
      ctx.fillStyle = '#0f172a' // Slate-900 solid
      ctx.fillRect(0, 0, width, height)
    }

    // Now draw candidate over mask
    ctx.globalCompositeOperation = 'destination-over'
    ctx.drawImage(results.image, 0, 0, width, height)

    ctx.restore()
  }

  // ─── Camera Frame processing Loop ─────────────────────────────
  useEffect(() => {
    if (!cameraEnabled || !activeMediaStream) {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current)
        loopRef.current = null
      }
      return
    }

    const processFrame = async () => {
      const video = cameraPreviewRef.current
      if (video && video.readyState >= 2) {
        const timestamp = performance.now()
        
        // 1. Run landmarker
        if (faceLandmarker) {
          try {
            const results = faceLandmarker.detectForVideo(video, timestamp)
            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
              processTelemetry(results)
            } else {
              // No face detected fallback
              onEmotionSnapshotChange?.({
                ...emotionSnapshot,
                emotion_label: 'No Face Detected',
                primary_emotion: 'disengaged',
                eye_contact_score: 0,
                confidence: 45
              })
            }
          } catch (err) {
            // landmarker detect error
          }
        }

        // 2. Run Selfie Segmentation
        if (virtualBgMode !== 'none' && selfieSegmentationRef.current) {
          try {
            await selfieSegmentationRef.current.send({ image: video })
          } catch (e) {
            // segmentation send error
          }
        }
      }
      if (cameraEnabled && activeMediaStream) {
        loopRef.current = requestAnimationFrame(processFrame)
      }
    }

    loopRef.current = requestAnimationFrame(processFrame)

    return () => {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current)
        loopRef.current = null
      }
    }
  }, [cameraEnabled, activeMediaStream, faceLandmarker, virtualBgMode, voiceMetrics])

  const processTelemetry = (results) => {
    const landmarks = results.faceLandmarks[0]
    const blendshapes = results.faceBlendshapes?.[0]?.categories || []

    const shapes = {}
    blendshapes.forEach(cat => {
      shapes[cat.categoryName] = cat.score
    })

    // Iris points for gaze tracking: left iris center 468, right iris center 473
    const leftIris = landmarks[468]
    const rightIris = landmarks[473]
    const leftCornerL = landmarks[130]
    const leftCornerR = landmarks[243]
    const rightCornerL = landmarks[359]
    const rightCornerR = landmarks[463]

    let eyeContact = 85
    if (leftIris && rightIris && leftCornerL && leftCornerR && rightCornerL && rightCornerR) {
      const leftRatio = (leftIris.x - leftCornerL.x) / (leftCornerR.x - leftCornerL.x)
      const rightRatio = (rightIris.x - rightCornerL.x) / (rightCornerR.x - rightCornerL.x)
      const avgRatio = (leftRatio + rightRatio) / 2
      const deviation = Math.abs(avgRatio - 0.5)
      eyeContact = Math.max(0, Math.min(100, Math.round((1 - deviation * 3.0) * 100)))
    }

    // Stress signals: Brow Furrow and Lip Compression
    const browFurrow = ((shapes['browDownLeft'] || 0) + (shapes['browDownRight'] || 0)) / 2
    const lipCompression = ((shapes['mouthPressLeft'] || 0) + (shapes['mouthPressRight'] || 0)) / 2
    const stressBlendshapeAvg = (browFurrow + lipCompression) / 2

    // Blink detection
    const leftBlink = shapes['eyeBlinkLeft'] || 0
    const rightBlink = shapes['eyeBlinkRight'] || 0
    if (leftBlink > 0.65 || rightBlink > 0.65) {
      if (!candidateBlinkingRef.current) {
        candidateBlinkingRef.current = true
        setBlinkCount(c => c + 1)
        setTimeout(() => {
          candidateBlinkingRef.current = false
        }, 400)
      }
    }

    // Real speaks metrics
    const wpm = voiceMetrics?.speaking_pace_wpm || 140
    const fillers = voiceMetrics?.filler_words_count || 0

    // Combine using computeConfidenceScore
    const confidenceResult = computeConfidenceScore({
      eyeContactPct: eyeContact,
      stressBlendshapeAvg,
      currentWpm: wpm,
      fillerWordsPerMin: fillers
    })

    onEmotionSnapshotChange?.({
      primary_emotion: stressBlendshapeAvg > 0.3 ? 'nervous' : 'focused',
      emotion_label: stressBlendshapeAvg > 0.3 ? 'Stress Detected' : 'Focused',
      confidence: confidenceResult.score,
      engagement_score: Math.round(eyeContact * 0.65 + (1 - stressBlendshapeAvg) * 35),
      eye_contact_score: eyeContact,
      movement_level: Math.round(((shapes['browInnerUp'] || 0) + (shapes['mouthShrugUpper'] || 0)) * 100),
      lighting_score: 92,
      posture_score: 95,
      posture_label: 'Optimal',
      smile_score: Math.round(((shapes['mouthSmileLeft'] || 0) + (shapes['mouthSmileRight'] || 0)) * 100),
      sample_count: 1,
      summary: `Eye Contact is ${eyeContact}%. speaking pace is stable.`
    })
  }

  // ─── Telemetry metrics from existing models ─────────────────
  const liveConfidence = useMemo(() => {
    if (cameraReady && cameraEnabled && emotionSnapshot?.confidence !== undefined) {
      return emotionSnapshot.confidence
    }
    // Fallback if camera off
    const wordCount = voiceTranscript?.split(/\s+/).filter(Boolean).length || 0
    return Math.max(50, Math.min(99, 90 - (wordCount % 5) * 3))
  }, [cameraReady, cameraEnabled, emotionSnapshot, voiceTranscript])

  const liveWpm = useMemo(() => {
    if (voiceMetrics?.speaking_pace_wpm) return voiceMetrics.speaking_pace_wpm
    const totalWords = voiceTranscript?.split(/\s+/).filter(Boolean).length || 0
    const minutes = elapsedSeconds / 60
    return minutes > 0.05 ? Math.round(totalWords / minutes) : 0
  }, [voiceMetrics, voiceTranscript, elapsedSeconds])

  const liveFillerWords = useMemo(() => {
    if (voiceMetrics?.fillers !== undefined) return voiceMetrics.fillers
    const fillers = ['um', 'uh', 'like', 'basically', 'actually', 'so', 'you know']
    return voiceTranscript
      ? voiceTranscript.toLowerCase().split(/\s+/).filter(w => fillers.includes(w.replace(/[^a-z]/g, ''))).length
      : 0
  }, [voiceMetrics, voiceTranscript])

  const liveEyeContact = useMemo(() => {
    if (cameraReady && cameraEnabled && emotionSnapshot?.eye_contact_score !== undefined) {
      return emotionSnapshot.eye_contact_score
    }
    return null
  }, [cameraReady, cameraEnabled, emotionSnapshot])

  // ─── Fullscreen, Muting & Repeating ──────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err))
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleToggleMute = () => {
    setIsMuted(prev => {
      const next = !prev
      if (next && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      return next
    })
  }

  const handleRepeatQuestion = () => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(displayedQuestionText)
    const voices = window.speechSynthesis.getVoices()
    let selectedVoice = null
    if (interviewerPersona === 'sarah') {
      selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google US English') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.toLowerCase().includes('female')))
    } else {
      selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google UK English Male') || v.name.includes('David') || v.name.toLowerCase().includes('male')))
    }
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0]
    }
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.rate = 1.0
    utterance.pitch = interviewerPersona === 'sarah' ? 1.05 : 0.95

    onIsSpeakingChange?.(true)
    utterance.onend = () => onIsSpeakingChange?.(false)
    utterance.onerror = () => onIsSpeakingChange?.(false)

    window.speechSynthesis.speak(utterance)
  }

  const handlePointerDown = (e) => {
    if (!isWebcamDraggable) return
    e.target.setPointerCapture(e.pointerId)
    dragStartRef.current = {
      startX: e.clientX - webcamPos.x,
      startY: e.clientY - webcamPos.y
    }
  }

  const handlePointerMove = (e) => {
    if (!dragStartRef.current) return
    setWebcamPos({
      x: e.clientX - dragStartRef.current.startX,
      y: e.clientY - dragStartRef.current.startY
    })
  }

  const handlePointerUp = () => {
    dragStartRef.current = null
  }

  // ─── Render components inline (glassmorphic dark UI) ────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col text-white font-sans overflow-hidden select-none bg-[#090d16] border border-white/5 shadow-2xl">

      {/* ━━ EVALUATING OVERLAY ━━ */}
      {isEvaluating && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-violet-400/60 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/40">
                <Brain className="w-6 h-6 text-white animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg tracking-tight">Analyzing response...</p>
              <p className="text-gray-400 text-sm mt-1">{persona.name} is evaluating your performance</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ━━ TOP HUD BAR ━━ */}
      <div className="h-14 border-b border-white/[0.06] bg-gradient-to-r from-slate-950/95 via-[#0c0e18]/95 to-slate-950/95 px-5 flex items-center justify-between z-20 relative backdrop-blur-xl">
        
        {/* Left Section: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <Brain className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-black tracking-tight text-white">TalentForge AI</h1>
            <span className="text-[10px] text-gray-500 font-semibold hidden md:inline">Live Interview Session</span>
          </div>
        </div>

        {/* Center: Phase + Progress + Timer + Clock */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-lg shadow-violet-600/15 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Video Interview
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-xl text-gray-300">
            {zoomPhase === 'interview' ? `Q ${currentIndex + 1} / ${totalQuestions}` : 'Preparation'}
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-xl text-gray-300 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 shadow-sm shadow-red-500/40" />
            <span>{Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-emerald-400 flex items-center gap-1.5 text-[10px] font-bold">
            <Wifi className="w-3 h-3" />
            <span>Connected</span>
          </div>
        </div>

        {/* Right: Clock + Settings */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500 font-mono hidden md:inline">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white transition-all duration-200"
            title="Room Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ━━ MAIN AREA ━━ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 relative z-10 overflow-hidden bg-slate-950/20">
        
        {/* Symmetrical Split Video Grid (Recruiter side-by-side with Candidate) */}
        <div className="flex-[0_0_70%] flex flex-col md:flex-row gap-5 relative min-h-0 min-w-0 z-10">
          
          {/* LEFT CARD: AI Recruiter */}
          <div className={`flex-1 relative flex flex-col rounded-3xl overflow-hidden shadow-2xl justify-center items-center transition-all duration-500 ${
            avatarFsmState === 'speaking'
              ? 'ring-2 ring-violet-500/40 shadow-violet-500/10'
              : avatarFsmState === 'listening'
                ? 'ring-1 ring-emerald-500/20 shadow-emerald-500/5'
                : 'ring-1 ring-white/[0.06]'
          }`}>
            
            <VRMRenderer
              persona={persona}
              avatarState={avatarFsmState}
              audioLevel={audioLevel}
              simulatedAmplitude={simulatedAmplitude}
              isBlinking={isBlinking}
              useVideoClips={useVideoClips}
              setUseVideoClips={setUseVideoClips}
              interviewMoment={zoomPhase}
              currentQuestion={currentQuestion}
              currentIndex={currentIndex}
              totalQuestions={totalQuestions}
            />

            {/* Speaking waveform badge */}
            <AnimatePresence>
              {avatarFsmState === 'speaking' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-3.5 right-3.5 z-20 flex items-center bg-black/70 backdrop-blur-xl px-3 py-1.5 rounded-full border border-violet-500/30 shadow-lg shadow-violet-500/10"
                >
                  <span className="text-[9px] font-black uppercase text-violet-400 tracking-wider mr-2">Speaking</span>
                  <AudioWaveformCanvas isActive={true} color="#8b5cf6" isAI={true} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thinking overlay */}
            <AnimatePresence>
              {avatarFsmState === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin mb-2" />
                  <span className="text-xs font-black tracking-widest text-violet-300 uppercase animate-pulse">Analyzing...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HR Recruiter name strip */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/20 shrink-0 shadow-lg">
                    <img src={persona.photo} alt={persona.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white drop-shadow-lg">{persona.name}</div>
                    <div className="text-[9px] text-gray-300/80 font-semibold">{persona.title}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                  <Mic className="w-3 h-3 text-gray-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40 animate-pulse" />
                </div>
              </div>
            </div>

            {/* State badge top-left */}
            <motion.div
              key={avatarFsmState}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg bg-black/60 border-white/[0.08]"
            >
              <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                avatarFsmState === 'speaking' ? 'bg-violet-500 shadow-sm shadow-violet-500/50 animate-pulse' :
                avatarFsmState === 'listening' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' :
                avatarFsmState === 'thinking' ? 'bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse' : 'bg-slate-500'
              }`} />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-200">
                {avatarFsmState === 'speaking' && 'AI Speaking'}
                {avatarFsmState === 'listening' && 'Listening'}
                {avatarFsmState === 'thinking' && 'Thinking'}
                {avatarFsmState === 'idle' && 'Ready'}
              </span>
            </motion.div>

          </div>

          {/* RIGHT CARD: Candidate Webcam */}
          <div className={`flex-1 relative flex flex-col rounded-3xl overflow-hidden shadow-2xl justify-center items-center transition-all duration-500 ${
            avatarFsmState === 'listening'
              ? 'ring-2 ring-emerald-500/30 shadow-emerald-500/10'
              : 'ring-1 ring-white/[0.06]'
          }`}>
            
            <video
              ref={cameraPreviewRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                !cameraEnabled || virtualBgMode !== 'none' ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            />

            {cameraEnabled && virtualBgMode !== 'none' && (
              <canvas
                ref={segmentedCanvasRef}
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300"
              />
            )}

            {!cameraEnabled && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 border border-white/[0.06]">
                  <CameraOff className="w-7 h-7 text-gray-500" />
                </div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Camera Off</span>
              </div>
            )}

            {cameraEnabled && emotionSnapshot?.emotion_label === 'No Face Detected' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center text-center p-4 z-25"
              >
                <AlertCircle className="w-8 h-8 text-red-500 mb-2 animate-pulse" />
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">Face Out of Frame</span>
                <span className="text-[10px] text-gray-400 mt-1">Please center your face in the camera</span>
              </motion.div>
            )}

            {/* Live Closed Captions */}
            <AnimatePresence>
              {(voiceInterim || voiceTranscript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/75 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/[0.08] text-xs text-slate-200 z-30 max-w-[85%] text-center shadow-2xl"
                >
                  <p className="leading-relaxed font-semibold">
                    {voiceTranscript}
                    {voiceInterim && <span className="text-emerald-400/80 italic font-medium"> {voiceInterim}</span>}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Candidate name strip */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg border border-white/10">
                    <span className="text-[9px] font-black uppercase text-white">You</span>
                  </div>
                  <div>
                    <div className="text-xs font-black text-white drop-shadow-lg">{candidateName}</div>
                    <div className="text-[9px] text-gray-300/80 font-semibold">Candidate</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                  <Mic className={`w-3 h-3 ${micEnabled ? 'text-emerald-400' : 'text-red-400'}`} />
                  {micEnabled && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40 animate-pulse" />}
                </div>
              </div>
            </div>

            {/* Waveform badge */}
            <AnimatePresence>
              {avatarFsmState === 'listening' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-3.5 right-3.5 z-20 flex items-center bg-black/70 backdrop-blur-xl px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                >
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider mr-2">Mic Active</span>
                  <AudioWaveformCanvas isActive={micEnabled} analyser={candidateAnalyser} color="#10B981" isAI={false} />
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

        {/* Right Side: Professional HR Interview Sidebar */}
        <div className="flex-[0_0_30%] flex flex-col gap-4 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#0b0c10] via-[#090a0e] to-[#06070a] p-4.5 overflow-hidden z-10">
          
          {/* Glassmorphic Tabs Bar */}
          <div className="flex bg-white/[0.03] border border-white/[0.05] p-1 rounded-2xl">
            <button
              onClick={() => setActiveSidebarTab('progress')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-350 ${
                activeSidebarTab === 'progress'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Progress Plan
            </button>
            <button
              onClick={() => setActiveSidebarTab('telemetry')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-350 ${
                activeSidebarTab === 'telemetry'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Live Telemetry
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-0.5 space-y-4 scrollbar-thin scrollbar-thumb-white/5">
            {activeSidebarTab === 'progress' ? (
              /* TAB 1: Structured HR Interview Progress Plan */
              <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Interview Pipeline</span>
                  <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider">SARAH CHEN</span>
                </div>

                <div className="space-y-2.5">
                  {/* Step 1: Onboarding */}
                  <div className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                    !zoomPhase || zoomPhase === 'small_talk' || zoomPhase === 'identity_confirm' || currentIndex > 0
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                      : zoomPhase === 'greet_mic'
                        ? 'bg-violet-500/5 border-violet-500/20 text-violet-300 ring-1 ring-violet-500/20 shadow-md shadow-violet-500/5'
                        : 'bg-white/[0.01] border-white/[0.03] text-gray-500'
                  }`}>
                    <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                      !zoomPhase || zoomPhase === 'small_talk' || zoomPhase === 'identity_confirm' || currentIndex > 0
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                    }`}>
                      {!zoomPhase || zoomPhase === 'small_talk' || zoomPhase === 'identity_confirm' || currentIndex > 0 ? '✓' : '1'}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black uppercase tracking-wide">Onboarding & Setup</span>
                      <span className="text-[9px] opacity-80 leading-normal">System hardware and mic check validation</span>
                    </div>
                  </div>

                  {/* Step 2: Self Intro */}
                  <div className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                    currentIndex > 0 || !zoomPhase || zoomPhase === 'candidate_questions' || zoomPhase === 'closing'
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                      : zoomPhase === 'small_talk' || zoomPhase === 'identity_confirm'
                        ? 'bg-violet-500/5 border-violet-500/20 text-violet-300 ring-1 ring-violet-500/20 shadow-md shadow-violet-500/5'
                        : 'bg-white/[0.01] border-white/[0.03] text-gray-500'
                  }`}>
                    <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                      currentIndex > 0 || !zoomPhase || zoomPhase === 'candidate_questions' || zoomPhase === 'closing'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                    }`}>
                      {currentIndex > 0 || !zoomPhase || zoomPhase === 'candidate_questions' || zoomPhase === 'closing' ? '✓' : '2'}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black uppercase tracking-wide">Candidate Introduction</span>
                      <span className="text-[9px] opacity-80 leading-normal">Introduction, career goals, and resume walk</span>
                    </div>
                  </div>

                  {/* Step 3: Core Competency */}
                  <div className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                    zoomPhase === 'candidate_questions' || zoomPhase === 'closing'
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                      : !zoomPhase
                        ? 'bg-violet-500/5 border-violet-500/20 text-violet-300 ring-1 ring-violet-500/20 shadow-md shadow-violet-500/5'
                        : 'bg-white/[0.01] border-white/[0.03] text-gray-500'
                  }`}>
                    <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                      zoomPhase === 'candidate_questions' || zoomPhase === 'closing'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                    }`}>
                      {zoomPhase === 'candidate_questions' || zoomPhase === 'closing' ? '✓' : '3'}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black uppercase tracking-wide">Behavioral Assessment</span>
                      <span className="text-[9px] opacity-80 leading-normal">Solving core behavioral and technical scenarios</span>
                    </div>
                  </div>

                  {/* Step 4: Candidate Q&A */}
                  <div className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                    zoomPhase === 'closing'
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                      : zoomPhase === 'candidate_questions'
                        ? 'bg-violet-500/5 border-violet-500/20 text-violet-300 ring-1 ring-violet-500/20 shadow-md shadow-violet-500/5'
                        : 'bg-white/[0.01] border-white/[0.03] text-gray-500'
                  }`}>
                    <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                      zoomPhase === 'closing'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                    }`}>
                      {zoomPhase === 'closing' ? '✓' : '4'}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black uppercase tracking-wide">Candidate Q&A</span>
                      <span className="text-[9px] opacity-80 leading-normal">Opportunity for candidate to ask details</span>
                    </div>
                  </div>

                  {/* Step 5: Wrap-up */}
                  <div className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                    zoomPhase === 'closing'
                      ? 'bg-violet-500/5 border-violet-500/20 text-violet-300 ring-1 ring-violet-500/20 shadow-md shadow-violet-500/5'
                      : 'bg-white/[0.01] border-white/[0.03] text-gray-500'
                  }`}>
                    <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border bg-violet-500/10 border-violet-500/20 text-violet-300">
                      5
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black uppercase tracking-wide">Feedback & Wrap-up</span>
                      <span className="text-[9px] opacity-80 leading-normal">Interviewer closing and generation of performance report</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: Live Telemetry & Biometrics */
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Confidence Score Dial */}
                <div className="flex flex-col items-center gap-3 py-5 bg-white/[0.01] border border-white/[0.04] rounded-2xl relative overflow-hidden group hover:border-white/[0.08] transition-colors duration-300">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CONFIDENCE SCORE</span>
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <defs>
                        <linearGradient id="violetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                      <circle cx="56" cy="56" r="46" className="stroke-white/[0.03] fill-transparent" strokeWidth="6.5" />
                      <circle
                        cx="56"
                        cy="56"
                        r="46"
                        className="fill-transparent transition-all duration-700 ease-out"
                        stroke="url(#violetGradient)"
                        strokeWidth="6.5"
                        strokeDasharray={2 * Math.PI * 46}
                        strokeDashoffset={2 * Math.PI * 46 - (liveConfidence / 100) * (2 * Math.PI * 46)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3.5xl font-black font-mono text-white tracking-tight leading-none">{liveConfidence}</span>
                      <span className="text-[8px] text-gray-500 font-black tracking-widest uppercase mt-0.5">SCORE</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-violet-400 font-bold uppercase tracking-wider">
                    <span>Performance Metric</span>
                  </div>
                </div>

                {/* Live Emotion Badge */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">PRIMARY EMOTION</span>
                    <span className="text-xs font-black text-gray-200">
                      {cameraEnabled && emotionSnapshot?.emotion_label ? emotionSnapshot.emotion_label : 'Analyzing...'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                    !cameraEnabled ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                    emotionSnapshot?.emotion_label === 'No Face Detected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    emotionSnapshot?.emotion_label === 'Happy' || emotionSnapshot?.emotion_label === 'Engaged' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' :
                    'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                  }`}>
                    {!cameraEnabled ? 'Offline' : emotionSnapshot?.emotion_label === 'No Face Detected' ? 'ALERT' : 'ACTIVE'}
                  </span>
                </div>

                {/* Telemetry Metrics List */}
                <div className="space-y-3">
                  {/* Eye Contact */}
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 hover:bg-white/[0.02] transition-colors duration-200">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-400 font-semibold">Eye Contact Ratio</span>
                      <span className="font-bold text-gray-200">
                        {liveEyeContact !== null ? `${liveEyeContact}%` : 'Waiting...'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500" style={{ width: `${liveEyeContact !== null ? liveEyeContact : 0}%` }} />
                    </div>
                  </div>

                  {/* Speaking Pace */}
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 hover:bg-white/[0.02] transition-colors duration-200">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-400 font-semibold">Speaking Speed</span>
                      <span className="font-bold text-gray-200">
                        {liveWpm > 0 ? `${liveWpm} WPM` : 'Waiting...'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500" style={{ width: `${liveWpm > 0 ? Math.min(100, (liveWpm / 180) * 100) : 0}%` }} />
                    </div>
                  </div>

                  {/* Filler Words */}
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 hover:bg-white/[0.02] transition-colors duration-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-semibold">Filler Words (um, uh, like)</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        liveFillerWords > 5 ? 'bg-red-500/10 text-red-400' :
                        liveFillerWords > 2 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {liveFillerWords} detected
                      </span>
                    </div>
                  </div>

                  {/* Posture Check */}
                  {cameraEnabled && emotionSnapshot?.posture_label && (
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 hover:bg-white/[0.02] transition-colors duration-200">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-semibold">Posture & Alignment</span>
                        <span className="text-emerald-400 font-bold">{emotionSnapshot.posture_label}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━ BOTTOM TRANSCRIPT & CONTROLS ━━ */}
      <div className="border-t border-white/[0.06] bg-gradient-to-t from-[#080a12] to-[#0c0e18] backdrop-blur-xl">

        {/* Live transcript bubbles */}
        <div className="h-28 px-5 py-3 overflow-y-auto border-b border-white/[0.04] flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-white/5">
          <div className="flex items-start gap-2.5 max-w-2xl">
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-violet-500/30 shrink-0 shadow-sm shadow-violet-500/10">
              <img src={persona.photo} alt={persona.name} className="w-full h-full object-cover" />
            </div>
            <div className="bg-violet-500/[0.06] border-l-2 border-violet-500/60 p-2.5 rounded-2xl rounded-tl-none max-w-lg">
              <span className="text-[9px] font-black text-violet-400 uppercase tracking-wider block mb-0.5">{persona.name}</span>
              <p className="text-xs text-gray-200 leading-relaxed">{displayedQuestionText}</p>
            </div>
          </div>

          <AnimatePresence>
            {(voiceTranscript || voiceInterim) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex items-start gap-2.5 max-w-2xl ml-auto flex-row-reverse"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-[9px] font-black uppercase text-white">You</span>
                </div>
                <div className="bg-indigo-500/[0.06] border-r-2 border-indigo-500/60 p-2.5 rounded-2xl rounded-tr-none text-right max-w-lg">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider block mb-0.5">Your Response</span>
                  <p className="text-xs text-gray-200 leading-relaxed">
                    {voiceTranscript}
                    {voiceInterim && <span className="text-indigo-400/70 italic"> {voiceInterim}</span>}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Call Controls Bar */}
        <div className="h-[72px] bg-transparent px-6 flex items-center justify-between z-20 relative">
          
          {/* Left Group: Hardware controls (Mic, Camera, TTS Audio Mute) */}
          <div className="flex items-center gap-3">
            {/* Mic Toggle */}
            <button
              disabled={isSpeaking}
              onClick={onMicToggle}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                micEnabled
                  ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20'
                  : 'bg-red-650/10 border-red-500/30 text-red-500 hover:bg-red-650/20'
              }`}
              title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micEnabled ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={onCameraToggle}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                cameraEnabled
                  ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20'
                  : 'bg-red-650/10 border-red-500/30 text-red-500 hover:bg-red-650/20'
              }`}
              title={cameraEnabled ? 'Mute Camera' : 'Unmute Camera'}
            >
              {cameraEnabled ? <Camera className="w-4.5 h-4.5" /> : <CameraOff className="w-4.5 h-4.5" />}
            </button>

            {/* Mute TTS Audio Output */}
            <button
              onClick={handleToggleMute}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                isMuted
                  ? 'bg-red-650/10 border-red-500/30 text-red-500 hover:bg-red-650/20'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title={isMuted ? 'Unmute TTS Output' : 'Mute TTS Output'}
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Center Group: Action Controls (Repeat Question, Submit Response) */}
          <div className="flex items-center gap-3">
            {/* Repeat Question */}
            <button
              onClick={handleRepeatQuestion}
              disabled={isSpeaking}
              className="px-4 py-2.5 rounded-xl bg-[#16161a] hover:bg-white/5 border border-white/10 text-gray-200 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Repeat Interviewer Question"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Repeat Question
            </button>

            {/* Submit Response */}
            <button
              onClick={() => onSubmitAnswer?.()}
              disabled={isSpeaking || !voiceTranscript.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg shadow-indigo-650/10"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Response
            </button>
          </div>

          {/* Right Group: Mode, Input Toggle, Fullscreen & End Session */}
          <div className="flex items-center gap-3">
            {/* Toggle Video Feed / Avatar Mode */}
            <button
              onClick={() => setUseVideoClips(!useVideoClips)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                useVideoClips
                  ? 'bg-violet-650/10 border-violet-500/30 text-violet-400 hover:bg-violet-650/20'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Switch Recruiter Video source"
            >
              {useVideoClips ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>Portrait</span>
            </button>

            {/* Toggle Text typing fallback panel */}
            <button
              onClick={() => onShowTypingFallbackChange?.(!showTypingFallback)}
              className={`p-2.5 rounded-xl border transition-colors ${
                showTypingFallback
                  ? 'bg-violet-650/10 border-violet-500/30 text-violet-400 hover:bg-violet-650/20'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Toggle Typing Fallback"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>

            {/* End Call Button */}
            <button
              onClick={onEndInterview}
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-750 text-white flex items-center justify-center shadow-lg transition-all border border-red-500/20"
              title="End Interview"
            >
              <PhoneOff className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Text Area typing Fallback Input (for E2E tests and manual fallback) */}
        {showTypingFallback && (
          <div className="p-4 bg-slate-950/60 border-t border-white/5 flex gap-3">
            <textarea
              value={answer}
              onChange={e => onAnswerChange?.(e.target.value)}
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none resize-none h-12"
              placeholder="Type your response here..."
              disabled={isEvaluating}
            />
            <button
              onClick={() => onSubmitAnswer?.()}
              disabled={isEvaluating || !answer.trim()}
              className="px-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-40"
            >
              Submit
            </button>
          </div>
        )}
      </div>

      {/* ━━ SETTINGS MODAL ━━ */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-extrabold text-white border-b border-white/5 pb-3 mb-5 flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-400" />
                Room Settings
              </h3>

              <div className="space-y-4">
                {audioDevices?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">🎙️ Microphone</label>
                    <select
                      value={selectedMicId}
                      onChange={e => onMicChange?.(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 text-white px-4 py-3 outline-none text-xs cursor-pointer hover:border-violet-500/50 transition-colors"
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
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">📹 Camera</label>
                    <select
                      value={selectedCameraId}
                      onChange={e => onCameraChange?.(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 text-white px-4 py-3 outline-none text-xs cursor-pointer hover:border-violet-500/50 transition-colors"
                    >
                      {videoDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Keyboard typing input fallback toggle */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">Manual Typing Input</span>
                    <span className="text-[10px] text-gray-500">Enable text box fallback for answering</span>
                  </div>
                  <button
                    onClick={() => onShowTypingFallbackChange?.(!showTypingFallback)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                      showTypingFallback ? 'bg-violet-600' : 'bg-slate-800 border border-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      showTypingFallback ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Recruiter Video Toggle */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">Enable Recruiter Video</span>
                    <span className="text-[10px] text-gray-500">Play synced video files instead of static card</span>
                  </div>
                  <button
                    onClick={() => setUseVideoClips(!useVideoClips)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                      useVideoClips ? 'bg-violet-600' : 'bg-slate-800 border border-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      useVideoClips ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>


                {/* WASM Noise Suppression toggle */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">Noise Suppression (WASM)</span>
                    <span className="text-[10px] text-gray-500">Filter out background noise using RNNoise</span>
                  </div>
                  <button
                    onClick={() => setNoiseSuppressionEnabled(!noiseSuppressionEnabled)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                      noiseSuppressionEnabled ? 'bg-violet-600' : 'bg-slate-800 border border-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      noiseSuppressionEnabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Virtual Background dropdown */}
                <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4 mt-2">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Virtual Background</label>
                  <select
                    value={virtualBgMode}
                    onChange={e => setVirtualBgMode(e.target.value)}
                  >
                    <option value="none">None (Standard Camera)</option>
                    <option value="blur">Blur Background (Google Meet style)</option>
                    <option value="color">Slate Color Background</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function VRMRenderer({
  persona,
  avatarState,
  audioLevel,
  simulatedAmplitude = 0,
  isBlinking = false,
  useVideoClips = true,
  setUseVideoClips,
  interviewMoment = 'interview',
  currentQuestion = null,
  currentIndex = 0,
  totalQuestions = 5
}) {
  const [activePlayer, setActivePlayer] = useState('A')
  const [srcA, setSrcA] = useState('')
  const [srcB, setSrcB] = useState('')
  const videoRefA = useRef(null)
  const videoRefB = useRef(null)

  const isMarcus = persona.name.toLowerCase().includes('marcus')
  const folder = isMarcus ? '/interviewers/male_hr/' : '/interviewers/female_hr/'

  // Determine the target video filename and speaking duration based on current state
  let videoName = 'calm_webcam_idle.mp4'
  let speakingDuration = 0

  if (avatarState === 'speaking') {
    if (interviewMoment === 'greet_mic') {
      videoName = 'hello_good_morning.mp4'
      speakingDuration = 6.0
    } else if (interviewMoment === 'identity_confirm') {
      videoName = 'looking_resume.mp4'
      speakingDuration = 8.0
    } else if (interviewMoment === 'small_talk') {
      videoName = 'wonderful_thanks_for_joining.mp4'
      speakingDuration = 7.0
    } else if (interviewMoment === 'candidate_questions') {
      videoName = 'do_you_have_any_questions_for_me.mp4'
      speakingDuration = 7.0
    } else if (interviewMoment === 'closing') {
      videoName = 'it_was_pleasure_speaking_with_you.mp4'
      speakingDuration = 6.0
    } else {
      // General question moment
      videoName = currentQuestion?.video_name || 'talking.mp4'
      speakingDuration = currentQuestion?.speaking_duration || 8.0
    }
  } else {
    videoName = isMarcus ? 'idle.mp4' : 'calm_webcam_idle.mp4'
  }

  const targetSrc = `${folder}${videoName}`

  // On mount or folder change, initialize srcA to the default idle video
  useEffect(() => {
    const defaultIdle = `${folder}${isMarcus ? 'idle.mp4' : 'calm_webcam_idle.mp4'}`
    setSrcA(defaultIdle)
    setSrcB(defaultIdle)
    setActivePlayer('A')
  }, [folder, isMarcus])

  // Monitor targetSrc changes to update the inactive player and trigger transition
  useEffect(() => {
    if (!useVideoClips) return

    const activeVideo = activePlayer === 'A' ? videoRefA.current : videoRefB.current
    const inactiveVideo = activePlayer === 'A' ? videoRefB.current : videoRefA.current

    // If active video is already playing the target source, do nothing
    if (activeVideo && activeVideo.src.includes(targetSrc)) {
      if (activeVideo.paused) {
        activeVideo.play().catch(() => {})
      }
      return
    }

    // Load the target source on the inactive player
    if (activePlayer === 'A') {
      setSrcB(targetSrc)
      if (inactiveVideo) {
        inactiveVideo.load()
      }
    } else {
      setSrcA(targetSrc)
      if (inactiveVideo) {
        inactiveVideo.load()
      }
    }
  }, [targetSrc, activePlayer, useVideoClips])

  // Adjust playback speed of speaking clips to match speaking duration
  const adjustPlaybackRate = (videoElement) => {
     if (!videoElement) return
     if (avatarState === 'speaking' && speakingDuration > 0) {
       const duration = videoElement.duration
       if (duration && !isNaN(duration) && duration > 0) {
         const calculatedRate = duration / speakingDuration
         // Clamp rate between 0.45 and 1.25
         videoElement.playbackRate = Math.max(0.45, Math.min(1.25, calculatedRate))
       } else {
         videoElement.playbackRate = 1.0
       }
     } else {
       videoElement.playbackRate = 1.0
     }
  }

  const handleCanPlay = (player) => {
    if (!useVideoClips) return

    const videoA = videoRefA.current
    const videoB = videoRefB.current

    if (player === 'A' && activePlayer === 'B') {
      adjustPlaybackRate(videoA)
      setActivePlayer('A')
      if (videoA) {
        videoA.play().catch(() => {})
      }
      if (videoB) {
        videoB.pause()
      }
    } else if (player === 'B' && activePlayer === 'A') {
      adjustPlaybackRate(videoB)
      setActivePlayer('B')
      if (videoB) {
        videoB.play().catch(() => {})
      }
      if (videoA) {
        videoA.pause()
      }
    }
  }

  const handleVideoEnded = (player) => {
    // If speaking video ends, transition to the calm idle video
    if (avatarState === 'speaking') {
      const nextIdleSrc = `${folder}${isMarcus ? 'idle.mp4' : 'calm_webcam_idle.mp4'}`
      if (player === 'A') {
        setSrcB(nextIdleSrc)
        const videoB = videoRefB.current
        if (videoB) {
          videoB.load()
        }
      } else {
        setSrcA(nextIdleSrc)
        const videoA = videoRefA.current
        if (videoA) {
          videoA.load()
        }
      }
    }
  }

  return (
    <div className="absolute inset-0 bg-slate-950 rounded-3xl overflow-hidden flex items-center justify-center">
      {useVideoClips ? (
        <div className="w-full h-full relative">
          <video
            ref={videoRefA}
            src={srcA}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              activePlayer === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            muted
            playsInline
            loop={srcA.includes('idle')}
            onCanPlay={() => handleCanPlay('A')}
            onEnded={() => handleVideoEnded('A')}
          />
          <video
            ref={videoRefB}
            src={srcB}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              activePlayer === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            muted
            playsInline
            loop={srcB.includes('idle')}
            onCanPlay={() => handleCanPlay('B')}
            onEnded={() => handleVideoEnded('B')}
          />
        </div>
      ) : (
        <motion.div
          animate={{
            scale: avatarState === 'speaking' ? [1.0, 1.012, 1.0] : [1.0, 1.002, 1.0],
          }}
          transition={{
            repeat: Infinity,
            duration: avatarState === 'speaking' ? 2.5 : 6.0,
            ease: 'easeInOut'
          }}
          className="w-full h-full relative"
        >
          <img
            src={persona.photo}
            alt={persona.name}
            className="w-full h-full object-cover absolute inset-0"
          />
        </motion.div>
      )}

      {/* Dynamic status borders */}
      {avatarState === 'speaking' && (
        <div className="absolute inset-0 border-4 border-violet-500/50 rounded-3xl animate-pulse pointer-events-none z-[16]" />
      )}
      {avatarState === 'thinking' && (
        <div className="absolute inset-0 border-4 border-amber-500/40 rounded-3xl animate-pulse pointer-events-none z-[16]" />
      )}
      {avatarState === 'listening' && (
        <div className="absolute inset-0 border-4 border-emerald-500/55 rounded-3xl animate-pulse pointer-events-none z-[16]" />
      )}

      {/* Cinematic vignette overlay — adds depth-of-field feeling like a real webcam */}
      <div
        className="absolute inset-0 z-[15] pointer-events-none rounded-3xl"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)',
        }}
      />

      {/* Subtle warm color correction overlay — makes the skin tones look more natural on webcam */}
      <div
        className="absolute inset-0 z-[14] pointer-events-none rounded-3xl mix-blend-soft-light opacity-[0.08]"
        style={{
          background: 'linear-gradient(135deg, #f5c77e 0%, transparent 50%, #a78bfa 100%)',
        }}
      />
    </div>
  )
}


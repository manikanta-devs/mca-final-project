import React, { useEffect, useRef, useState, useCallback } from 'react'


import { useNavigate, useLocation } from 'react-router-dom'


import toast from 'react-hot-toast'


import {


  AlertCircle,


  BookOpen,


  Camera,


  CheckCircle,


  ChevronDown,


  Lightbulb,


  Mic,


  Play,


  Radio,


  RefreshCw,


  Send,


  SkipForward,


  Square,


  TrendingUp,


  Type,


  Video,


  Volume2,


  Cpu,


} from 'lucide-react'


import clsx from 'clsx'


import { generateQuestions, startInterview, submitAnswer, completeInterview, submitFollowUp, submitOnboardingResponse, getInterviewCoaching } from '../api/client'


import { useApp } from '../context/AppContext'


import LoadingSpinner from '../components/LoadingSpinner'


import { MiniScoreRow } from '../components/ScoreCard'


import { analyzeVoiceTranscript, getSpeechRecognition, countFillers } from '../utils/voiceInterview'
import PreInterviewChecklist from '../components/PreInterviewChecklist'


import { getNextDifficulty, generateLiveCoachingTips, shouldAskFollowUp } from '../utils/adaptiveEngine'


import LiveFeedbackPanel from '../components/LiveFeedbackPanel'


import InterviewStatsBar from '../components/InterviewStatsBar'


import PanelAvatar, { PanelRoster } from '../components/PanelAvatar'
import AIInterviewerRoom from '../components/AIInterviewerRoom'
import VirtualInterviewRoom from '../components/VirtualInterviewRoom'
import VoiceCaptureStudio from '../components/VoiceCaptureStudio'
import InterviewCoachPanel from '../components/InterviewCoachPanel'
import AdvancedToolPanel from '../components/AdvancedToolPanel'


import { PANEL_MEMBERS, getPanelMemberForQuestion } from '../utils/panelInterviewer'
import { createEmotionSnapshot, startEmotionSampler } from '../utils/emotionAnalysis'

// ─── Extracted modules ──────────────────────────────────────────────────────
import {
  DIFF_OPTIONS, ROLE_OPTIONS, FORMAT_OPTIONS, COMPANY_OPTIONS,
  VOICE_PROFILES, PANEL_VOICE_PROFILES, PHASE,
} from '../constants/interviewConstants'
import { chooseBrowserVoice } from '../utils/voiceUtils'
import { normalizeQuestion, buildCorporateInterviewQuestions } from '../utils/questionUtils'
import WalkInInterviewRoom from '../components/WalkInInterviewRoom'





export default function InterviewPage() {


  const navigate = useNavigate()
  const location = useLocation()

  const hasSpeechSupport = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)


  const {


    resumeData,


    selectedRole,


    setSelectedRole,


    difficulty,


    setDifficulty,


    candidateName,


    setInterviewSession,


    setInterviewResults,


  } = useApp()





  const [phase, setPhase] = useState(PHASE.SETUP)
  const [precheckStream, setPrecheckStream] = useState(null)


  const [interviewFormat, setInterviewFormat] = useState(hasSpeechSupport ? 'voice' : 'text')


  const [numQuestions, setNumQuestions] = useState(6)
  const [selectedCompany, setSelectedCompany] = useState('General')
  const [companyContext, setCompanyContext] = useState('')

  const [questions, setQuestions] = useState([])


  const [sessionId, setSessionId] = useState(null)


  const [currentIndex, setCurrentIndex] = useState(0)


  const [answer, setAnswer] = useState('')

  const checkStar = (val) => {
    const v = val.toLowerCase()
    return {
      s: /\b(when|during|working|previous|at\s+company|the\s+problem|background|context|situation|team|project|role)\b/.test(v),
      t: /\b(tasked|responsible|needed\s+to|had\s+to|goal|objective|challenge|requirements)\b/.test(v),
      a: /\b(built|implemented|designed|wrote|created|optimized|developed|engineered|refactored|debugged|integrated|migrated|configured|tested|resolved)\b/.test(v),
      r: /%|\b(percent|increased|reduced|saved|seconds|ms|improvement|boosted|decreased|resulted|optimized\s+by|throughput|latency|metrics)\b/.test(v) || /\b\d+\s*(%|percent|x|seconds|ms|users|requests)\b/.test(v)
    }
  }
  const starStatus = checkStar(answer)


  const [evaluation, setEvaluation] = useState(null)


  const [showHint, setShowHint] = useState(false)


  const [showTypingFallback, setShowTypingFallback] = useState(false)


  const [isListening, setIsListening] = useState(false)


  const [voiceTranscript, setVoiceTranscript] = useState('')


  const [voiceInterim, setVoiceInterim] = useState('')


  const [voiceMetrics, setVoiceMetrics] = useState(null)
  const [avgTremorScore, setAvgTremorScore] = useState(0)


  const [voiceError, setVoiceError] = useState('')


  const [recordingUrl, setRecordingUrl] = useState('')
  const [activeMediaStream, setActiveMediaStream] = useState(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [audioDevices, setAudioDevices] = useState([])
  const [videoDevices, setVideoDevices] = useState([])
  const [selectedMicId, setSelectedMicId] = useState('')
  const [selectedCameraId, setSelectedCameraId] = useState('')


  const [cameraReady, setCameraReady] = useState(false)


  const [elapsedSeconds, setElapsedSeconds] = useState(0)


  const [coachingTips, setCoachingTips] = useState([])


  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(difficulty)


  const [scoreHistory, setScoreHistory] = useState([])
  const [submittedAnswerCount, setSubmittedAnswerCount] = useState(0)


  const [isRetrying, setIsRetrying] = useState(false)


  const [previousScore, setPreviousScore] = useState(null)
  const [coaching, setCoaching] = useState(null)
  const [coachingLoading, setCoachingLoading] = useState(false)


  const [totalElapsed, setTotalElapsed] = useState(0)


  const [panelMode, setPanelMode] = useState(false)
  const [aiInterviewerMode, setAiInterviewerMode] = useState(true)
  const [interviewerPersona, setInterviewerPersona] = useState('nagma_hr')
  const [interviewerVoice, setInterviewerVoice] = useState(true)
  const [browserVoices, setBrowserVoices] = useState([])
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false)
  const [emotionSnapshot, setEmotionSnapshot] = useState(createEmotionSnapshot())

  const [zoomPhase, setZoomPhase] = useState(null)
  
  useEffect(() => {
    // Keep fullscreen during ALL active interview phases — not just 'interviewing'
    // Without this, the sidebar re-appears every time phase switches to 'evaluating'
    const isActivePhase = phase === PHASE.INTERVIEWING || phase === PHASE.EVALUATING
    if (isActivePhase) {
      document.body.classList.add('interview-active')
    } else {
      document.body.classList.remove('interview-active')
    }
    return () => {
      document.body.classList.remove('interview-active')
    }
  }, [phase])
  const [encouragementText, setEncouragementText] = useState('')
  const [onboardingQuestionText, setOnboardingQuestionText] = useState('')
  const hasEncouragedRef = useRef(false)
  const lastSpeechTimeRef = useRef(Date.now())
  const lastTranscriptLengthRef = useRef(0)
  const silenceIntervalRef = useRef(null)
  const engineSilenceRef = useRef(null)
  const isListeningRef = useRef(false)
  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  const isInterviewerSpeakingRef = useRef(false)
  useEffect(() => {
    isInterviewerSpeakingRef.current = isInterviewerSpeaking
  }, [isInterviewerSpeaking])

  const hasGreetNudgeRef = useRef(false)





  const textareaRef = useRef(null)


  const cameraPreviewRef = useRef(null)


  const recognitionRef = useRef(null)


  const mediaRecorderRef = useRef(null)


  const mediaStreamRef = useRef(null)


  const audioChunksRef = useRef([])


  const transcriptConfidenceRef = useRef({ sum: 0, count: 0 })


  const finalTranscriptRef = useRef('')


  const recordingStartedAtRef = useRef(null)


  const saveRecordingPreviewRef = useRef(true)
  const selectedMicIdRef = useRef('')
  const selectedCameraIdRef = useRef('')


  const questionStartedAtRef = useRef(null)


  const autoCaptureAttemptedRef = useRef(-1)
  const hasGreetedRef = useRef(false)
  const isTelemetryOverriddenRef = useRef(false)
  const handleTelemetryOverrideChange = useCallback((val) => {
    isTelemetryOverriddenRef.current = val
  }, [])
  const stopEmotionSamplerRef = useRef(null)
  const activeUtteranceRef = useRef(null)
  const emotionHistoryRef = useRef([])
  const isStartingCaptureRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const lastInterviewerSpeechEndTimeRef = useRef(0)





  const currentQuestion = questions[currentIndex]


  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0
  const activePanelMember = panelMode ? getPanelMemberForQuestion(currentQuestion) : null
  const interviewerName = activePanelMember?.name || (interviewerPersona === 'marcus' ? 'Marcus Rodriguez' : 'Sarah Chen')
  const selectedRoleLabel = ROLE_OPTIONS.find(option => option.value === selectedRole)?.label || 'Candidate'





  const handleStartPregenerated = async (pregenerated) => {
    hasGreetedRef.current = false
    setPhase(PHASE.GENERATING)
    const toastId = toast.loading('Initializing personalized interview from resume...')
    try {
      const interviewQuestions = buildCorporateInterviewQuestions({
        generatedQuestions: pregenerated,
        resumeData: resumeData || {},
        candidateName: candidateName || 'Candidate',
        company: selectedCompany,
        panelMode,
      })

      setQuestions(interviewQuestions)

      const { data: startData } = await startInterview({
        questions: interviewQuestions,
        resume_data: resumeData || {},
        role: selectedRole,
        candidate_name: candidateName || 'Candidate',
        interview_format: interviewFormat,
        difficulty: difficulty,
        panel_mode: panelMode,
        interviewer_persona: interviewerPersona,
      })

      setSessionId(startData.session_id)
      setInterviewSession(startData)
      setCurrentIndex(0)
      setEvaluation(null)
      setAnswer('')
      setVoiceTranscript('')
      setVoiceInterim('')
      setVoiceMetrics(null)
      setVoiceError('')
      setEmotionSnapshot(createEmotionSnapshot())
      isTelemetryOverriddenRef.current = false
      setShowHint(false)
      setShowTypingFallback(false)
      setPhase(PHASE.INTERVIEWING)
      if (typeof window !== 'undefined') {
        window._heardHello = false
      }
      if (interviewFormat !== 'text') {
        setZoomPhase('connecting')
        setOnboardingQuestionText('')
        hasGreetedRef.current = false
        hasEncouragedRef.current = false
        hasGreetNudgeRef.current = false
        lastSpeechTimeRef.current = Date.now()
        setEncouragementText('')
      }
      toast.success(`Mock interview session started!`, { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed to start personalized interview.', { id: toastId })
      setPhase(PHASE.SETUP)
    }
  }

  useEffect(() => {
    if (location.state?.pregeneratedQuestions && location.state.pregeneratedQuestions.length > 0) {
      const q = location.state.pregeneratedQuestions
      // Clear location state to prevent double-firing
      window.history.replaceState({}, document.title)
      handleStartPregenerated(q)
    }
  }, [location.state])

  useEffect(() => {





    return () => {


      if (recognitionRef.current) {


        recognitionRef.current.onresult = null


        recognitionRef.current.onerror = null


        recognitionRef.current.onend = null


        try {


          recognitionRef.current.stop()


        } catch (_) {
          void _
        }


        recognitionRef.current = null


      }





      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {


        try {


          mediaRecorderRef.current.stop()


        } catch (_) {
          void _
        }


      }





      if (mediaStreamRef.current) {


        mediaStreamRef.current.getTracks().forEach(track => track.stop())


        mediaStreamRef.current = null


      }





      if (cameraPreviewRef.current) {


        cameraPreviewRef.current.srcObject = null


      }

      stopEmotionSamplerRef.current?.()
      stopEmotionSamplerRef.current = null
      window.speechSynthesis?.cancel()


    }


  }, [])





  useEffect(() => {


    if (phase === PHASE.INTERVIEWING && (interviewFormat === 'text' || showTypingFallback)) {


      textareaRef.current?.focus()


    }


  }, [phase, currentIndex, interviewFormat, showTypingFallback])

  useEffect(() => {
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTop = 0
    }
  }, [phase])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined

    const synth = window.speechSynthesis
    const loadVoices = () => setBrowserVoices(synth.getVoices())
    loadVoices()
    synth.addEventListener?.('voiceschanged', loadVoices)
    synth.onvoiceschanged = loadVoices

    return () => {
      synth.removeEventListener?.('voiceschanged', loadVoices)
      if (synth.onvoiceschanged === loadVoices) synth.onvoiceschanged = null
    }
  }, [])


  useEffect(() => {
    // If using the high-fidelity video/voice room, disable the parent's automatic 
    // TTS effect to prevent dual audio and out-of-sync playback. 
    // The room will trigger TTS manually using the onSpeakQuestion callback.
    if (interviewFormat === 'video' || interviewFormat === 'voice') {
      return undefined
    }

    if (!interviewerVoice || phase !== PHASE.INTERVIEWING || typeof window === 'undefined') {
      return undefined
    }

    if (interviewFormat === 'text') {
      return undefined
    }

    if (zoomPhase === 'connecting') {
      return undefined
    }

    // If we are not in greeting phase and there is no question, return
    if (!zoomPhase && !currentQuestion?.text) {
      return undefined
    }

    // Cleanly stop any existing capture before speaking the question
    stopVoiceCapture({ keepTranscript: true }).catch(() => {})

    const synth = window.speechSynthesis
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return undefined

    synth.cancel()
    
    let textToSpeak = ''

    if (onboardingQuestionText && zoomPhase && zoomPhase !== 'greet_mic') {
      textToSpeak = onboardingQuestionText
    } else if (zoomPhase === 'greet_mic') {
      textToSpeak = interviewFormat === 'voice'
        ? "Hello, good morning! Welcome to the interview. Can you hear me clearly?"
        : "Hello, good morning! Welcome to the interview. Can you hear and see me clearly?"
    } else if (zoomPhase === 'small_talk') {
      textToSpeak = "Wonderful. Thank you for joining on time. How has your day been so far?"
    } else if (zoomPhase === 'identity_confirm') {
      textToSpeak = "Before we begin, could you please introduce yourself, confirm your full name, and walk me through your background?"
    } else if (zoomPhase === 'candidate_questions') {
      textToSpeak = "We've covered all of my questions. Before we conclude, do you have any questions for me about the role or the interview process?"
    } else if (zoomPhase === 'closing') {
      textToSpeak = "Thank you for your question. We have a highly collaborative, fast-paced culture where we support each other. It was a pleasure speaking with you today. Your interview has been completed successfully. You'll receive your performance report shortly."
    } else {
      textToSpeak = currentQuestion.text
      if (currentIndex === 0 && !hasGreetedRef.current) {
        // After onboarding already covered self-introduction, transition naturally to Q1
        textToSpeak = "Thank you for the introduction. That's a great background. Now, let's move into the interview questions. " + currentQuestion.text
        hasGreetedRef.current = true
      } else {
        const connectors = [
          "Thank you. Let's move on to the next question. ",
          "Interesting. Now, let's discuss: ",
          "That's a good point. Next, ",
          "I understand. Let's transition to the next topic. ",
          "Good explanation. Let's discuss: ",
          "Makes sense. Moving forward: "
        ]
        const conn = connectors[currentIndex % connectors.length]
        textToSpeak = conn + textToSpeak
      }
    }

    const voiceProfile = panelMode
      ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
      : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
    const selectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), voiceProfile)

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    activeUtteranceRef.current = utterance
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.lang = selectedVoice?.lang || 'en-US'
    utterance.rate = voiceProfile.rate
    utterance.pitch = voiceProfile.pitch
    utterance.onstart = () => {
      setIsInterviewerSpeaking(true)
      // Mute the mic hardware track while Sarah/Marcus is speaking
      // This prevents the speakers from being picked up by the microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      }
    }

    let fallbackTimeout = null
    const handleSpeechEnd = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      setIsInterviewerSpeaking(false)
      lastInterviewerSpeechEndTimeRef.current = Date.now()
      // Re-enable mic track and give 600ms for echo to clear before listening again
      setTimeout(() => {
        if (mediaStreamRef.current && micEnabled) {
          mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
        }
        // Clear any transcript captured while AI was speaking before restarting
        finalTranscriptRef.current = ''
        setVoiceTranscript('')
        setVoiceInterim('')
        if (zoomPhase === 'closing') {
          handleFinish()
        }
        startVoiceCapture().catch(() => {})
      }, 600)
    }

    utterance.onend = handleSpeechEnd
    utterance.onerror = (err) => {
      if (err.error === 'interrupted' || err.error === 'interrupted-by-another' || err.error === 'canceled') {
        return
      }
      console.warn('SpeechSynthesis error:', err)
      handleSpeechEnd()
    }

    const durationEstimate = (textToSpeak.length * 110) + 7000
    const timer = window.setTimeout(() => {
      // Don't speak if the tab is hidden — it wastes TTS quota and the mic would capture silence
      if (document.hidden) {
        handleSpeechEnd()
        return
      }
      synth.speak(utterance)
      fallbackTimeout = setTimeout(() => {
        console.warn('SpeechSynthesis onend failed to fire within estimate. Force triggering end handler.')
        synth.cancel()
        handleSpeechEnd()
      }, durationEstimate)
    }, 400)

    return () => {
      window.clearTimeout(timer)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      synth.cancel()
      setIsInterviewerSpeaking(false)
      lastInterviewerSpeechEndTimeRef.current = Date.now()
    }
  }, [phase, currentIndex, currentQuestion?.text, interviewerVoice, panelMode, activePanelMember?.id, interviewerPersona, browserVoices, zoomPhase, interviewFormat, onboardingQuestionText])





  useEffect(() => {


    if (phase !== PHASE.INTERVIEWING) {


      setElapsedSeconds(0)


      questionStartedAtRef.current = null


      autoCaptureAttemptedRef.current = -1


      return undefined


    }





    questionStartedAtRef.current = Date.now()


    setElapsedSeconds(0)


    const timer = setInterval(() => {


      if (questionStartedAtRef.current) {


        setElapsedSeconds(Math.floor((Date.now() - questionStartedAtRef.current) / 1000))


      }


    }, 1000)





    return () => clearInterval(timer)


  }, [phase, currentIndex])





  // Total elapsed timer


  useEffect(() => {


    if (phase !== PHASE.INTERVIEWING && phase !== PHASE.EVALUATING) return


    const timer = setInterval(() => {


      setTotalElapsed(prev => prev + 1)


    }, 1000)


    return () => clearInterval(timer)


  }, [phase])

  const speakEncouragement = async (phrase) => {
    // 1. Stop listening
    await stopVoiceCapture({ keepTranscript: true })

    const synth = window.speechSynthesis
    if (!synth) return

    synth.cancel()
    const voiceProfile = panelMode
      ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
      : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
    const selectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), voiceProfile)

    const utterance = new SpeechSynthesisUtterance(phrase)
    activeUtteranceRef.current = utterance
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.lang = selectedVoice?.lang || 'en-US'
    utterance.rate = voiceProfile.rate
    utterance.pitch = voiceProfile.pitch

    utterance.onstart = () => {
      setIsInterviewerSpeaking(true)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      }
    }
    utterance.onend = () => {
      setIsInterviewerSpeaking(false)
      setTimeout(() => {
        if (mediaStreamRef.current && micEnabled) {
          mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
        }
        startVoiceCapture().catch(() => {})
        lastSpeechTimeRef.current = Date.now()
      }, 500)
    }
    utterance.onerror = () => {
      setIsInterviewerSpeaking(false)
      if (mediaStreamRef.current && micEnabled) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
      }
      startVoiceCapture().catch(() => {})
      lastSpeechTimeRef.current = Date.now()
    }

    if (document.hidden) {
      setIsInterviewerSpeaking(false)
      startVoiceCapture().catch(() => {})
      lastSpeechTimeRef.current = Date.now()
      return
    }
    synth.speak(utterance)
  }

  const speakTransitionAndSkip = async () => {
    // Stop listening
    await stopVoiceCapture({ keepTranscript: true })

    const synth = window.speechSynthesis
    if (!synth) {
      handleSkip()
      return
    }

    synth.cancel()
    const voiceProfile = panelMode
      ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
      : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
    const selectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), voiceProfile)

    const transitionPhrase = "No worries at all. Let's move on to the next question to keep the momentum going."
    const utterance = new SpeechSynthesisUtterance(transitionPhrase)
    activeUtteranceRef.current = utterance
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.lang = selectedVoice?.lang || 'en-US'
    utterance.rate = voiceProfile.rate
    utterance.pitch = voiceProfile.pitch

    utterance.onstart = () => {
      setIsInterviewerSpeaking(true)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      }
    }
    utterance.onend = () => {
      setIsInterviewerSpeaking(false)
      setTimeout(() => {
        if (mediaStreamRef.current && micEnabled) {
          mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
        }
        handleSkip()
      }, 400)
    }
    utterance.onerror = () => {
      setIsInterviewerSpeaking(false)
      if (mediaStreamRef.current && micEnabled) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
      }
      handleSkip()
    }

    if (document.hidden) {
      setIsInterviewerSpeaking(false)
      if (mediaStreamRef.current && micEnabled) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
      }
      handleSkip()
      return
    }
    synth.speak(utterance)
  }



  // Zoom Phase and Speech-Driven Transitions
  useEffect(() => {
    if (phase !== PHASE.INTERVIEWING || !zoomPhase || interviewFormat === 'text') return undefined

    if (zoomPhase === 'connecting') {
      if (interviewFormat === 'voice') {
        // Voice mode: if we already have a stream from precheck, advance immediately
        if (activeMediaStream && activeMediaStream.getAudioTracks().length > 0) {
          setZoomPhase('greet_mic')
          return undefined
        }
        // Otherwise request mic only
        if (!activeMediaStream) {
          startVoiceCapture().catch((err) => {
            console.error('Voice capture failed:', err)
            setZoomPhase(null)
          })
        }
      } else if (interviewFormat === 'video') {
        // Video mode: advance once camera is ready, or after 3s timeout fallback
        if (activeMediaStream && (cameraReady || activeMediaStream.getVideoTracks().length > 0)) {
          if (!cameraReady) setCameraReady(true)
          setZoomPhase('greet_mic')
          return undefined
        }
        if (!activeMediaStream) {
          startVoiceCapture().catch((err) => {
            console.error('Media capture failed during connecting:', err)
            setZoomPhase(null)
          })
        }
        // 3-second fallback — never stay stuck on 'connecting'
        const fallback = setTimeout(() => {
          setZoomPhase('greet_mic')
        }, 3000)
        return () => clearTimeout(fallback)
      }
      return undefined
    }
  }, [zoomPhase, phase, interviewFormat, activeMediaStream, cameraReady])

  useEffect(() => {
    // Silence timer and automatic skipping disabled to ensure the candidate has full manual control and isn't interrupted.
    return undefined
  }, [])

  // Attach camera stream to video element whenever stream or ref becomes available
  useEffect(() => {
    if (interviewFormat !== 'video') return
    if (!activeMediaStream) return

    // Try immediately, and retry until the ref mounts (component may not be mounted yet)
    const attachStream = () => {
      const videoEl = cameraPreviewRef.current
      if (!videoEl) return false
      if (videoEl.srcObject === activeMediaStream) return true // already attached

      videoEl.srcObject = activeMediaStream
      videoEl.play().catch(() => {})
      setCameraReady(true)  // ← CRITICAL: allows zoom phase to advance past 'connecting'

      stopEmotionSamplerRef.current?.()
      emotionHistoryRef.current = []
      setEmotionSnapshot(createEmotionSnapshot())
      isTelemetryOverriddenRef.current = false

      const beginEmotionSampling = () => {
        stopEmotionSamplerRef.current?.()
        stopEmotionSamplerRef.current = startEmotionSampler({
          video: videoEl,
          onUpdate: snapshot => {
            emotionHistoryRef.current = [...emotionHistoryRef.current.slice(-79), snapshot]
            if (!isTelemetryOverriddenRef.current) {
              setEmotionSnapshot(snapshot)
            } else {
              setEmotionSnapshot(prev => ({
                ...prev,
                raw_landmarks: snapshot.raw_landmarks,
                raw_stats: snapshot.raw_stats
              }))
            }
          }
        })
      }

      if (videoEl.readyState >= 2) {
        beginEmotionSampling()
      } else {
        videoEl.onloadedmetadata = beginEmotionSampling
      }
      return true
    }

    // Try immediately
    if (attachStream()) return

    // If ref not ready yet, retry with an interval until it mounts
    const interval = setInterval(() => {
      if (attachStream()) clearInterval(interval)
    }, 100)

    return () => clearInterval(interval)
  }, [activeMediaStream, interviewFormat, phase])





  // Live coaching tip updates


  const elapsedSecondsRef = useRef(elapsedSeconds)
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds
  }, [elapsedSeconds])

  const currentQuestionRef = useRef(currentQuestion)
  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])

  const voiceInterimRef = useRef(voiceInterim)
  useEffect(() => {
    voiceInterimRef.current = voiceInterim
  }, [voiceInterim])

  const handleSubmitAnswerRef = useRef(null)
  useEffect(() => {
    handleSubmitAnswerRef.current = handleSubmitAnswer
  })

  // Track zoomPhase in a ref so the interval can read it without re-creating
  const zoomPhaseRef = useRef(zoomPhase)
  useEffect(() => {
    zoomPhaseRef.current = zoomPhase
  }, [zoomPhase])

  useEffect(() => {
    if (phase !== 'interviewing' || !isListening) {
      return
    }

    const interval = setInterval(() => {
      const transcript = `${finalTranscriptRef.current} ${voiceInterimRef.current || ''}`.trim()
      const fillerCount = countFillers(transcript)
      const tips = generateLiveCoachingTips(
        transcript,
        elapsedSecondsRef.current,
        currentQuestionRef.current?.type || 'technical',
        fillerCount
      )
      setCoachingTips(tips)

      if (transcript.length > lastTranscriptLengthRef.current) {
        lastTranscriptLengthRef.current = transcript.length
        lastSpeechTimeRef.current = Date.now()
        setEncouragementText('')
      } else if (transcript.length > 3) {
        // Automatically submit onboarding responses after 6.0s of silence
        // Automatically submit interview questions after 12.0s of silence
        const isOnboarding = !!zoomPhaseRef.current
        const threshold = isOnboarding ? 6000 : 12000
        const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current
        if (timeSinceLastSpeech > threshold) {
          console.log(`Candidate finished speaking. Silence threshold of ${threshold}ms reached. Automatically submitting.`);
          lastTranscriptLengthRef.current = 0
          if (engineSilenceRef.current) {
            engineSilenceRef.current(transcript)
          }
          handleSubmitAnswerRef.current?.()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, isListening])











  const stopVoiceCapture = async ({ keepTranscript = true, saveRecordingPreview = true, persistMetrics = true, stopCamera = false } = {}) => {
    setIsListening(false)
    const recognition = recognitionRef.current

    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.stop()
      } catch (_) {
        void _
      }
      recognitionRef.current = null
    }





    const recorder = mediaRecorderRef.current


    if (recorder && recorder.state !== 'inactive') {


      try {


        recorder.stop()


      } catch (_) {
        void _
      }


    }


    mediaRecorderRef.current = null



    stopEmotionSamplerRef.current?.()
    stopEmotionSamplerRef.current = null



    if (stopCamera) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      setActiveMediaStream(null)
      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = null
      }
      setCameraReady(false)
    }


    saveRecordingPreviewRef.current = saveRecordingPreview


    setIsListening(false)





    const startedAt = recordingStartedAtRef.current


    const durationSeconds = startedAt ? (Date.now() - startedAt) / 1000 : 0


    recordingStartedAtRef.current = null





    const transcript = finalTranscriptRef.current.trim()


    const averageConfidence = transcriptConfidenceRef.current.count > 0


      ? transcriptConfidenceRef.current.sum / transcriptConfidenceRef.current.count


      : 0


    const metrics = analyzeVoiceTranscript({


      transcript,


      durationSeconds,


      recognitionConfidence: averageConfidence,


    })





    if (keepTranscript && transcript) {


      setAnswer(transcript)


      setVoiceTranscript(transcript)


    }





    if (persistMetrics) {


      setVoiceMetrics(metrics)


    }


    setVoiceInterim('')


    transcriptConfidenceRef.current = { sum: 0, count: 0 }





    return metrics
  }

  const handleMicChange = async (deviceId) => {
    setSelectedMicId(deviceId)
    selectedMicIdRef.current = deviceId
    if (recognitionRef.current || mediaStreamRef.current) {
      toast.loading('Switching microphone...', { id: 'device-switch', duration: 1000 })
      await stopVoiceCapture({ keepTranscript: true, persistMetrics: false })
      setTimeout(() => {
        startVoiceCapture()
      }, 400)
    }
  }

  const handleCameraChange = async (deviceId) => {
    setSelectedCameraId(deviceId)
    selectedCameraIdRef.current = deviceId
    if (recognitionRef.current || mediaStreamRef.current) {
      toast.loading('Switching camera...', { id: 'device-switch', duration: 1000 })
      await stopVoiceCapture({ keepTranscript: true, persistMetrics: false })
      setTimeout(() => {
        startVoiceCapture()
      }, 400)
    }
  }
  // Stable callbacks for VirtualInterviewRoom mic open/close — must NOT be inline
  // arrow functions or the stage-engine useEffect re-fires on every render.
  const handleStageMicOpen = useCallback(() => {
    startVoiceCapture().catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStageMicClose = useCallback(() => {
    stopVoiceCapture({ keepTranscript: true }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Custom speaker helper for VirtualInterviewRoom's Gemini/AI speaking stages
  const speakVirtualQuestion = useCallback((text, { onEnded }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnded?.()
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()

    // Cleanly stop any existing capture before speaking the question
    stopVoiceCapture({ keepTranscript: true }).catch(() => {})

    const voiceProfile = panelMode
      ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
      : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
    
    // Fallback: browserVoices state might be empty, retrieve directly
    const currentVoices = browserVoices.length ? browserVoices : synth.getVoices()
    const selectedVoice = chooseBrowserVoice(currentVoices, voiceProfile)

    const utterance = new SpeechSynthesisUtterance(text)
    activeUtteranceRef.current = utterance
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.lang = selectedVoice?.lang || 'en-US'
    utterance.rate = voiceProfile.rate
    utterance.pitch = voiceProfile.pitch

    utterance.onstart = () => {
      setIsInterviewerSpeaking(true)
      // Mute microphone hardware track while speaking
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      }
    }

    let fallbackTimeout = null
    const handleSpeechEnd = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      setIsInterviewerSpeaking(false)
      lastInterviewerSpeechEndTimeRef.current = Date.now()
      
      setTimeout(() => {
        if (mediaStreamRef.current && micEnabled) {
          mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
        }
        // Clear any transcript captured while AI was speaking
        finalTranscriptRef.current = ''
        setVoiceTranscript('')
        setVoiceInterim('')
        // Call the callback to notify the stage engine that TTS ended
        onEnded?.()
      }, 600)
    }

    utterance.onend = handleSpeechEnd
    utterance.onerror = (err) => {
      if (err.error === 'interrupted' || err.error === 'interrupted-by-another' || err.error === 'canceled') {
        return
      }
      console.warn('Virtual TTS error:', err)
      handleSpeechEnd()
    }

    // Word-rate based estimate: ~600ms per word + 3s lead-in, min 8s, max 90s
    // This is far more accurate than character-count for variable-length questions.
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    const durationEstimate = Math.min(90000, Math.max(8000, wordCount * 600 + 3000))
    // Don't speak if the tab is hidden
    if (document.hidden) {
      handleSpeechEnd()
      return
    }
    
    synth.speak(utterance)
    fallbackTimeout = setTimeout(() => {
      console.warn('Virtual TTS onend failed to fire within estimate. Force triggering end handler.')
      synth.cancel()
      handleSpeechEnd()
    }, durationEstimate)

  }, [browserVoices, interviewerPersona, panelMode, activePanelMember?.id, micEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCameraToggle = () => {
    const nextVal = !cameraEnabled
    setCameraEnabled(nextVal)
    if (activeMediaStream) {
      activeMediaStream.getVideoTracks().forEach(track => { track.enabled = nextVal })
    }
  }

  const handleMicToggle = async () => {
    const nextVal = !micEnabled
    setMicEnabled(nextVal)
    if (activeMediaStream) {
      activeMediaStream.getAudioTracks().forEach(track => { track.enabled = nextVal })
    }
    if (!nextVal) {
      await stopVoiceCapture({ keepTranscript: true })
    } else {
      if (!isInterviewerSpeaking) {
        startVoiceCapture().catch(() => {})
      }
    }
  }





  const getFriendlyVoiceErrorMessage = (error) => {
    const errorStr = typeof error === 'string' ? error : (error?.name || error?.message || '');
    const err = errorStr.toLowerCase();

    if (err.includes('notallowed') || err.includes('not-allowed') || err.includes('permission')) {
      return 'Microphone or Speech Recognition access denied. Please ensure microphone permissions are granted in your browser settings (click the padlock/site settings icon in the URL bar).';
    }
    if (err.includes('timeout')) {
      return 'Camera/Microphone request timed out. Another application (e.g. Teams, Zoom, or another browser tab) might be locking your camera. Please release the device or grant permissions and reload.';
    }
    if (err.includes('network')) {
      return 'Network communication failed. Browser speech recognition (especially in Chrome/Edge) requires an active internet connection to Google/Microsoft recognition servers.';
    }
    if (err.includes('no-speech') || err.includes('nospeech')) {
      return 'No speech detected. Please verify your microphone is active and speak clearly.';
    }
    if (err.includes('notfound') || err.includes('not-found') || err.includes('device')) {
      return 'No microphone detected. Please plug in a microphone or headset and try again.';
    }
    if (err.includes('notreadable') || err.includes('already in use') || err.includes('track')) {
      return 'Microphone is already in use by another application (e.g. Zoom, Teams, or another browser tab).';
    }
    if (err.includes('aborted')) {
      return 'Voice recognition was aborted.';
    }
    return `Voice capture failed: ${errorStr}`;
  }

  const startVoiceCapture = async () => {
    if (!micEnabled) return
    if (isStartingCaptureRef.current) return
    isStartingCaptureRef.current = true

    const Recognition = getSpeechRecognition()
    if (!Recognition || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Voice recognition is not supported in this browser.')
      setShowTypingFallback(true)
      isStartingCaptureRef.current = false
      return
    }

    try {
      setVoiceError('')
      setVoiceMetrics(null)
      setVoiceTranscript('')
      setVoiceInterim('')
      setShowTypingFallback(false)
      finalTranscriptRef.current = ''
      transcriptConfidenceRef.current = { sum: 0, count: 0 }
      audioChunksRef.current = []

      const useVideo = interviewFormat === 'video'
      const activeMicId = selectedMicIdRef.current
      const activeCameraId = selectedCameraIdRef.current

      const audioConstraints = activeMicId
        ? { deviceId: { exact: activeMicId } }
        : true;
      const videoConstraints = useVideo
        ? (activeCameraId ? { deviceId: { exact: activeCameraId } } : true)
        : false;

      let stream = mediaStreamRef.current
      const hasActiveTracks = stream && stream.active && stream.getAudioTracks().length > 0 && (!useVideo || stream.getVideoTracks().length > 0)
      
      if (!hasActiveTracks) {
        if (stream) {
          try { stream.getTracks().forEach(t => t.stop()) } catch(e) { console.warn('Failed to stop existing media stream:', e) }
        }
        const mediaPromise = navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        })
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MediaDeviceTimeout: Camera or microphone request timed out. Please check permissions.')), 7500)
        )
        stream = await Promise.race([mediaPromise, timeoutPromise])
        mediaStreamRef.current = stream
        setActiveMediaStream(stream)
      }

      // If the AI is currently speaking, mute the microphone tracks immediately
      // to prevent picking up the speaker sound during startup latency
      if (isInterviewerSpeakingRef.current) {
        stream.getAudioTracks().forEach(t => { t.enabled = false })
      }

      // Enumerate devices once permission is granted
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioDevs = devices.filter(d => d.kind === 'audioinput')
        const videoDevs = devices.filter(d => d.kind === 'videoinput')
        setAudioDevices(audioDevs)
        setVideoDevices(videoDevs)

        // Sync selected ids if empty
        if (audioDevs.length > 0 && !selectedMicIdRef.current) {
          const activeTrack = stream.getAudioTracks()[0]
          const activeId = activeTrack?.getSettings()?.deviceId || audioDevs[0].deviceId
          setSelectedMicId(activeId)
          selectedMicIdRef.current = activeId
        }
        if (videoDevs.length > 0 && !selectedCameraIdRef.current && useVideo) {
          const activeTrack = stream.getVideoTracks()[0]
          const activeId = activeTrack?.getSettings()?.deviceId || videoDevs[0].deviceId
          setSelectedCameraId(activeId)
          selectedCameraIdRef.current = activeId
        }
      } catch (err) {
        console.warn('Failed to enumerate media devices:', err)
      }

      mediaStreamRef.current = stream
      setActiveMediaStream(stream)


      recordingStartedAtRef.current = Date.now()


      saveRecordingPreviewRef.current = true





      if (useVideo) {
        setCameraReady(true)
      }





      if (typeof MediaRecorder !== 'undefined') {


        const recorder = new MediaRecorder(stream)


        mediaRecorderRef.current = recorder


        recorder.ondataavailable = event => {


          if (event.data && event.data.size > 0) {


            audioChunksRef.current.push(event.data)


          }


        }


        recorder.onstop = () => {


          if (saveRecordingPreviewRef.current && audioChunksRef.current.length > 0) {


            const blobType = useVideo ? 'video/webm' : 'audio/webm'


            const mediaBlob = new Blob(audioChunksRef.current, { type: blobType })


            const nextUrl = URL.createObjectURL(mediaBlob)


            setRecordingUrl(previousUrl => {


              if (previousUrl) URL.revokeObjectURL(previousUrl)


              return nextUrl


            })


          } else {


            setRecordingUrl(previousUrl => {


              if (previousUrl) URL.revokeObjectURL(previousUrl)


              return ''


            })


          }


          audioChunksRef.current = []


        }


        recorder.start()


      }





      let recognition = recognitionRef.current
      if (recognition) {
        finalTranscriptRef.current = ''
        setVoiceTranscript('')
        setVoiceInterim('')
        setAnswer('')
        lastSpeechTimeRef.current = Date.now()
        lastTranscriptLengthRef.current = 0
        setIsListening(true)
        isStartingCaptureRef.current = false
        return
      }

      recognition = new Recognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = event => {
        if (!isListeningRef.current || isInterviewerSpeakingRef.current) {
          return
        }
        // Discard any echo or delayed speech recognition events within 1.2 seconds of AI stopping speech
        if (Date.now() - lastInterviewerSpeechEndTimeRef.current < 1200) {
          return
        }

        let interimText = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          const transcript = result[0]?.transcript || ''

          if (result.isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim()
            const confidence = result[0]?.confidence ?? 0
            transcriptConfidenceRef.current.sum += confidence
            transcriptConfidenceRef.current.count += 1
          } else {
            interimText += transcript
          }
        }

        const liveTranscript = `${finalTranscriptRef.current} ${interimText}`.trim()
        setVoiceTranscript(finalTranscriptRef.current)
        setVoiceInterim(interimText.trim())

        if (liveTranscript) {
          setAnswer(liveTranscript)
          lastSpeechTimeRef.current = Date.now()
          if (liveTranscript.toLowerCase().includes('hello') && !window._heardHello) {
            window._heardHello = true
            toast.success('Mic Check: Heard you say "hello"! Voice recognition is working.', { id: 'hello-check', duration: 5000 })
          }
        }
      }

      recognition.onerror = event => {
        const errorType = event.error;
        console.warn(`Speech recognition error: ${errorType}`);

        if (errorType === 'no-speech' || errorType === 'aborted') {
          return;
        }

        const msg = getFriendlyVoiceErrorMessage(event.error);
        setVoiceError(msg)
        toast.error('Voice capture stopped.')
        stopVoiceCapture({ keepTranscript: true }).catch(() => {})
      }

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          try {
            recognition.start()
          } catch (err) {
            console.error('Failed to restart speech recognition:', err)
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
      setIsListening(true)
      recognition.start()

      isStartingCaptureRef.current = false
    } catch (error) {
      isStartingCaptureRef.current = false
      const msg = getFriendlyVoiceErrorMessage(error);
      setVoiceError(msg)
      toast.error('Could not access microphone or webcam. Falling back to text mode.')
      setShowTypingFallback(true)
      setZoomPhase(null)
      await stopVoiceCapture({ keepTranscript: false })
    }


  }





  const handleGenerate = async () => {
    hasGreetedRef.current = false
    setPhase(PHASE.GENERATING)
    const toastId = toast.loading('Generating AI questions...')

    try {
      const { data } = await generateQuestions({
        resume_data: resumeData || {},
        role: selectedRole,
        difficulty,
        num_questions: numQuestions,
        panel_mode: panelMode,
        company: selectedCompany,
        company_context: companyContext,
        interviewer_persona: interviewerPersona,
      })

      if (data.success && data.questions.length > 0) {
        const interviewQuestions = buildCorporateInterviewQuestions({
          generatedQuestions: data.questions,
          resumeData: resumeData || {},
          candidateName: candidateName || 'Candidate',
          company: selectedCompany,
          panelMode,
        })

        setQuestions(interviewQuestions)

        const { data: startData } = await startInterview({
          questions: interviewQuestions,
          resume_data: resumeData || {},
          role: selectedRole,
          candidate_name: candidateName || 'Candidate',
          interview_format: interviewFormat,
          difficulty: difficulty,
          panel_mode: panelMode,
          interviewer_persona: interviewerPersona,
        })

        setSessionId(startData.session_id)
        setInterviewSession(startData)
        setCurrentIndex(0)
        setEvaluation(null)
        setAnswer('')
        setVoiceTranscript('')
        setVoiceInterim('')
        setVoiceMetrics(null)
        setVoiceError('')
        setEmotionSnapshot(createEmotionSnapshot())
        isTelemetryOverriddenRef.current = false
        setShowHint(false)
        setShowTypingFallback(false)

        toast.dismiss(toastId)

        // For voice/video: go to device precheck lobby first
        // For text: skip lobby and go straight to interview
        if (interviewFormat === 'text') {
          setPhase(PHASE.INTERVIEWING)
          if (typeof window !== 'undefined') window._heardHello = false
        } else {
          // Route to precheck lobby — it will call onBegin() to start interviewing
          setPhase(PHASE.ROOM_ENTRY)
        }

      } else {
        throw new Error('No questions generated')
      }

    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate questions', { id: toastId })
      setPhase(PHASE.SETUP)
    }
  }





  const handleSubmitAnswer = async () => {
    // Guard against double-fire (double-click or rapid re-invocation during API latency)
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (zoomPhase) {
      const finalAnswer = (answer.trim() || `${finalTranscriptRef.current} ${voiceInterim}`.trim() || "[No verbal response captured]").trim()
      const nextPhaseMap = {
        'greet_mic': 'small_talk',
        'small_talk': 'identity_confirm',
        'identity_confirm': null,
        'candidate_questions': 'closing'
      }
      const nextPhase = nextPhaseMap[zoomPhase]
      
      await stopVoiceCapture({ keepTranscript: true })
      
      try {
        const { data } = await submitOnboardingResponse({
          session_id: sessionId,
          current_phase: zoomPhase,
          answer: finalAnswer
        })
        if (data?.success && data?.response) {
          setOnboardingQuestionText(data.response)
        } else {
          setOnboardingQuestionText('')
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic onboarding transition:', err)
        setOnboardingQuestionText('')
      }

      if (nextPhase !== undefined) {
        setZoomPhase(nextPhase)
      }
      setVoiceTranscript('')
      setVoiceInterim('')
      setAnswer('')
      lastTranscriptLengthRef.current = 0
      isSubmittingRef.current = false
      return
    }

    const draftAnswer = answer.trim() || `${voiceTranscript} ${voiceInterim}`.trim()

    if (!draftAnswer && interviewFormat === 'text') {
      toast.error('Please write an answer before submitting.')
      isSubmittingRef.current = false
      return
    }

    let latestVoiceMetrics = voiceMetrics

    if (isListening) {
      latestVoiceMetrics = await stopVoiceCapture({ keepTranscript: true })
    }

    const finalAnswer = (answer.trim() || `${finalTranscriptRef.current} ${voiceInterim}`.trim() || draftAnswer || "[No verbal response captured]").trim()


    setPhase(PHASE.EVALUATING)
    lastTranscriptLengthRef.current = 0
    try {


      const { data } = await submitAnswer({


        session_id: sessionId,


        answer: finalAnswer,


        question_index: currentIndex,


        voice_metrics: latestVoiceMetrics || voiceMetrics ? {
          ...(latestVoiceMetrics || voiceMetrics || {}),
          tremor_score: avgTremorScore
        } : null,


        emotion_metrics: interviewFormat === 'video' ? emotionSnapshot : null,


      })


      setEvaluation(data.evaluation)
      setSubmittedAnswerCount(count => count + 1)





      // Track score history for adaptive difficulty


      const newScore = data.evaluation?.overall_score || 0


      const newHistory = [...scoreHistory, newScore]


      setScoreHistory(newHistory)





      // Update adaptive difficulty


      const nextDiff = getNextDifficulty(newHistory, adaptiveDifficulty)


      if (nextDiff !== adaptiveDifficulty) {


        setAdaptiveDifficulty(nextDiff)


        toast(`Difficulty adjusted to ${nextDiff}`)


      }





      if (data.updated_questions) {


        setQuestions(data.updated_questions)


      }





      setCoachingTips([])
      
      // Auto-advance loop: Only auto-advance in voice/video modes, leave text mode on evaluation feedback
      if (interviewFormat === 'text') {
        setPhase(PHASE.EVALUATING)
        // Fire AI coaching request (non-blocking, loads async below evaluation)
        setCoachingLoading(true)
        setCoaching(null)
        const currentQ = questions[currentIndex]
        getInterviewCoaching({
          session_id: sessionId,
          question_index: currentIndex,
          question: currentQ,
          answer: finalAnswer,
          evaluation_scores: {
            overall: data.evaluation?.overall_score || 0,
            technical: data.evaluation?.technical_score || 0,
            clarity: data.evaluation?.clarity_score || 0,
            relevance: data.evaluation?.relevance_score || 0,
          }
        }).then(res => {
          setCoaching(res.data.coaching)
        }).catch(err => {
          console.warn('Coaching request failed:', err)
        }).finally(() => setCoachingLoading(false))
      } else {
        setPhase(PHASE.INTERVIEWING)
        // Speak the AI HR's natural response to the answer, then advance
        const hrReply = data.evaluation?.interviewer_response
        if (hrReply && interviewerVoice && window.speechSynthesis) {
          const synth = window.speechSynthesis
          const hrVoiceProfile = panelMode
            ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
            : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
          const hrSelectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), hrVoiceProfile)
          synth.cancel()
          const replyUtterance = new SpeechSynthesisUtterance(hrReply)
          activeUtteranceRef.current = replyUtterance
          if (hrSelectedVoice) replyUtterance.voice = hrSelectedVoice
          replyUtterance.lang = hrSelectedVoice?.lang || 'en-US'
          replyUtterance.rate = 0.92
          replyUtterance.pitch = 1.05
          setIsInterviewerSpeaking(true)
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
          }
          let replyDone = false
          let hrReplyFallbackTimeout = null
          const doNext = () => {
            if (hrReplyFallbackTimeout) clearTimeout(hrReplyFallbackTimeout)
            if (replyDone) return
            replyDone = true
            setIsInterviewerSpeaking(false)
            if (mediaStreamRef.current && micEnabled) {
              mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
            }
            setTimeout(() => { handleNextQuestion() }, 400)
          }
          replyUtterance.onend = () => doNext()
          replyUtterance.onerror = () => doNext()
          
          const durationEstimate = (hrReply.length * 80) + 4000
          setTimeout(() => {
            if (document.hidden) {
              doNext()
            } else {
              synth.speak(replyUtterance)
              hrReplyFallbackTimeout = setTimeout(() => {
                console.warn('HR Reply SpeechSynthesis onend failed to fire. Force advancing.')
                synth.cancel()
                doNext()
              }, durationEstimate)
            }
          }, 300)
        } else {
          setTimeout(() => {
            handleNextQuestion()
          }, 1200)
        }
      }


    } catch (error) {


      toast.error('Evaluation failed')
      setPhase(PHASE.INTERVIEWING)
      isSubmittingRef.current = false
    }


  }





  const handleNextQuestion = async () => {


    await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => {})


    const nextIndex = currentIndex + 1


    if (nextIndex >= questions.length) {
      if (interviewFormat !== 'text') {
        setPhase(PHASE.INTERVIEWING)
        setZoomPhase('candidate_questions')
        setVoiceTranscript('')
        setVoiceInterim('')
        setAnswer('')
      } else {
        handleFinish()
      }
      return
    }





    setCurrentIndex(nextIndex)


    setAnswer('')


    setEvaluation(null)
    setCoaching(null)
    setCoachingLoading(false)


    setShowHint(false)


    setShowTypingFallback(false)


    setVoiceTranscript('')


    setVoiceInterim('')


    setVoiceMetrics(null)
    setAvgTremorScore(0)


    setVoiceError('')
    setEmotionSnapshot(createEmotionSnapshot())
    isTelemetryOverriddenRef.current = false


    if (recordingUrl) {


      URL.revokeObjectURL(recordingUrl)


      setRecordingUrl('')


    }


    setPhase(PHASE.INTERVIEWING)


  }





  const handleSkip = async () => {


    const latestVoiceMetrics = await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => null)


    try {


      await submitAnswer({


        session_id: sessionId,


        answer: '[SKIPPED]',


        question_index: currentIndex,


        voice_metrics: latestVoiceMetrics || voiceMetrics || null,


        emotion_metrics: interviewFormat === 'video' ? emotionSnapshot : null,


      })
      setSubmittedAnswerCount(count => count + 1)


    } catch (_) {
      void _
    }


    await handleNextQuestion()


  }





  const handleFinish = async (gazeStats = null) => {


    await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false, stopCamera: true }).catch(() => {})
    window.speechSynthesis?.cancel()
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
    }

    const hasSubmittedAnswers = submittedAnswerCount > 0 || scoreHistory.length > 0 || currentIndex > 0 || evaluation

    if (!hasSubmittedAnswers) {
      setPhase(PHASE.SETUP)
      setAnswer('')
      setVoiceTranscript('')
      setVoiceInterim('')
      setRecordingUrl('')
      setQuestions([])
      setCurrentIndex(0)
      setElapsedSeconds(0)
      setTotalElapsed(0)
      setIsInterviewerSpeaking(false)
      toast.success('Interview ended. You are back at setup.')
      return
    }


    const toastId = toast.loading('Completing interview...')


    try {


      const { data } = await completeInterview(sessionId, gazeStats)


      setInterviewResults(data.results)


      toast.success('Interview completed!', { id: toastId })


      navigate(`/dashboard/results/${sessionId}`)


    } catch (error) {


      toast.error(error?.message || 'Failed to complete interview', { id: toastId })


    }


  }





  const handleRetryAnswer = () => {


    setPreviousScore(evaluation?.overall_score || null)


    setIsRetrying(true)


    setEvaluation(null)


    setAnswer('')


    setVoiceTranscript('')


    setVoiceInterim('')


    setVoiceMetrics(null)
    setAvgTremorScore(0)


    setVoiceError('')
    setEmotionSnapshot(createEmotionSnapshot())
    isTelemetryOverriddenRef.current = false


    setCoachingTips([])


    if (recordingUrl) {


      URL.revokeObjectURL(recordingUrl)


      setRecordingUrl('')


    }


    setPhase(PHASE.INTERVIEWING)


    toast('Retry mode - give a better answer!')


  }





  const handleFollowUp = async () => {


    if (!evaluation || !currentQuestion) return


    const toastId = toast.loading('Generating follow-up...')


    try {


      const { data } = await submitFollowUp({


        session_id: sessionId,


        question: currentQuestion,


        answer: answer,


        evaluation: evaluation,


      })


      if (data.follow_up_question) {


        // Insert follow-up as next question


        const updatedQuestions = [...questions]


        updatedQuestions.splice(currentIndex + 1, 0, {


          ...data.follow_up_question,


          id: questions.length + 1,


        })


        setQuestions(updatedQuestions)


        toast.success('Follow-up question added!', { id: toastId })


      } else {


        toast.dismiss(toastId)


      }


    } catch {


      toast.error('Could not generate follow-up', { id: toastId })


    }


  }





  if (phase === PHASE.SETUP) {
    return (
      <div className="space-y-0 animate-in">

        {/* ━━━ INTERVIEW MODE SELECTOR (Big Cards) ━━━ */}
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Choose Interview Mode</p>
          <div className="grid grid-cols-3 gap-3">
            {/* TEXT MODE */}
            <button
              onClick={() => setInterviewFormat('text')}
              className={clsx(
                'relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left',
                interviewFormat === 'text'
                  ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10'
              )}
            >
              {interviewFormat === 'text' && (
                <span className="absolute top-3 right-3 text-[9px] font-black uppercase bg-violet-500 text-white px-2 py-0.5 rounded-full tracking-wider">Active</span>
              )}
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Type className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="font-black text-sm text-gray-900 dark:text-white">Text Interview</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">Type your answers — no mic or camera needed</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500">⌨️ Keyboard</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500">🤖 AI Scoring</span>
              </div>
            </button>

            {/* VOICE MODE */}
            <button
              onClick={() => setInterviewFormat('voice')}
              className={clsx(
                'relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left',
                interviewFormat === 'voice'
                  ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/10'
              )}
            >
              {interviewFormat === 'voice' && (
                <span className="absolute top-3 right-3 text-[9px] font-black uppercase bg-cyan-500 text-white px-2 py-0.5 rounded-full tracking-wider">Active</span>
              )}
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                <Mic className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-black text-sm text-gray-900 dark:text-white">Voice Interview</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">Speak your answers — mic only, no camera required</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">🎙️ Microphone</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500">📝 Transcript</span>
              </div>
            </button>

            {/* VIDEO MODE */}
            <button
              onClick={() => setInterviewFormat('video')}
              className={clsx(
                'relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left',
                interviewFormat === 'video'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
              )}
            >
              {interviewFormat === 'video' && (
                <span className="absolute top-3 right-3 text-[9px] font-black uppercase bg-indigo-500 text-white px-2 py-0.5 rounded-full tracking-wider">Active</span>
              )}
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                <Video className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-black text-sm text-gray-900 dark:text-white">Video Interview</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">Speak + live camera — emotion & posture tracking</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">📹 Camera</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">🎙️ Mic</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500">🧠 AI Vision</span>
              </div>
            </button>
          </div>
        </div>

        {/* ━━━ HERO ENTRY CARD (Dynamic based on mode) ━━━ */}
        <div className="card bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden text-white mb-6">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(34,197,94,0.1),transparent_26%)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {aiInterviewerMode && (
                <div className="relative shrink-0">
                  <img
                    src={interviewerPersona === 'marcus' ? '/interviewers/marcus_rodriguez.png' : '/interviewers/sarah_chen.png'}
                    alt={interviewerName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400/40 shadow-xl shadow-cyan-500/20"
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] block mb-1">
                  {interviewFormat === 'text' ? '⌨️ Text Interview' : interviewFormat === 'voice' ? '🎙️ Voice Interview' : '📹 Video Interview'}
                </span>
                <h1 className="text-2xl font-black leading-tight">
                  {interviewerName} is ready to interview you
                </h1>
                <p className="text-sm text-white/55 mt-1">
                  {interviewFormat === 'text'
                    ? 'Type your answers below each question. AI will score and give feedback instantly.'
                    : interviewFormat === 'voice'
                    ? 'Microphone will activate when you start. Speak naturally — the AI listens and transcribes.'
                    : 'Camera and mic will turn on when you start. AI tracks emotions, posture, and eye contact.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> AI Engine Active
              </div>
              {resumeData
                ? <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Resume loaded</div>
                : <button onClick={() => navigate('/dashboard/resume')} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-300 text-xs font-semibold hover:bg-white/10 transition-colors"><BookOpen className="w-3.5 h-3.5" /> Upload resume</button>
              }
            </div>
          </div>

          {/* Resume skill tags */}
          {resumeData?.skills?.all?.length > 0 && (
            <div className="relative z-10 mt-4 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
              <span className="text-[10px] text-gray-500 mr-1 self-center">Your skills:</span>
              {resumeData.skills.all.slice(0, 8).map(skill => (
                <span key={skill} className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold">{skill}</span>
              ))}
              {resumeData.skills.all.length > 8 && <span className="text-[10px] text-white/35 self-center">+{resumeData.skills.all.length - 8} more</span>}
            </div>
          )}
        </div>

        {/* ━━━ MAIN CONFIG GRID ━━━ */}
        <div className="grid md:grid-cols-[1fr_290px] gap-5 items-start">

          {/* LEFT col */}
          <div className="space-y-4">

            {/* Role */}
            <div className="card !p-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Target Role</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROLE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedRole(value)}
                    className={clsx(
                      'px-3 py-2.5 rounded-xl text-sm font-semibold text-left border-2 transition-all',
                      selectedRole === value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty + Mode in one row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card !p-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Difficulty</label>
                <div className="flex flex-col gap-2">
                  {DIFF_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setDifficulty(value)}
                      className={clsx(
                        'p-2.5 rounded-xl text-left border-2 transition-all',
                        difficulty === value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25'
                          : 'border-gray-200 dark:border-gray-700/70 hover:border-indigo-400'
                      )}
                    >
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card !p-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Interview Mode</label>
                <div className="flex flex-col gap-2">
                  {FORMAT_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => { if (phase === PHASE.SETUP) setInterviewFormat(value) }}
                      className={clsx(
                        'p-2.5 rounded-xl text-left border-2 transition-all',
                        interviewFormat === value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25'
                          : 'border-gray-200 dark:border-gray-700/70 hover:border-indigo-400'
                      )}
                    >
                      <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        {value === 'text' ? <Type className="w-3.5 h-3.5" /> : value === 'voice' ? <Mic className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                        {label}
                        {interviewFormat === value && <span className="ml-auto text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">Selected</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
                {!hasSpeechSupport && (
                  <p className="text-[10px] text-amber-500 mt-2">Voice/Video needs Chrome or Edge</p>
                )}
              </div>
            </div>

            {/* Company */}
            <div className="card !p-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Target Company</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {COMPANY_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setSelectedCompany(value); if (value === 'General') setCompanyContext('') }}
                    className={clsx(
                      'p-2 rounded-xl text-center border-2 transition-all text-xs font-semibold',
                      selectedCompany === value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 hover:border-indigo-400'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedCompany !== 'General' && (
                <textarea
                  value={companyContext}
                  onChange={(e) => setCompanyContext(e.target.value)}
                  placeholder="Optional: describe the team, role, or domain..."
                  className="mt-3 w-full p-3 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              )}
            </div>

            {/* Questions slider */}
            <div className="card !p-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Questions: <span className="text-indigo-500 normal-case font-black">{numQuestions}</span>
              </label>
              <input type="range" min={3} max={10} value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full accent-indigo-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>3 — Quick</span><span>5 — Standard</span><span>10 — Thorough</span></div>
            </div>

          </div>

          {/* RIGHT col — settings + CTA */}
          <div className="space-y-4 md:sticky md:top-4">

            {/* Interviewer picker */}
            <div className="card bg-gradient-to-br from-slate-950 to-slate-900 border border-white/10 !p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-3">Your AI Interviewer</p>
              <div className="flex gap-2">
                {['nagma_hr', 'sarah', 'marcus'].map(p => {
                  const isSelected = interviewerPersona === p
                  const name = p === 'sarah' ? 'Sarah Chen' : p === 'marcus' ? 'Marcus Rodriguez' : 'Nagma HR'
                  const img = p === 'sarah'
                    ? '/interviewers/sarah_chen.png'
                    : p === 'marcus'
                      ? '/interviewers/marcus_rodriguez.png'
                      : '/interviewers/nagma_hr.png'
                  const desc = p === 'nagma_hr' ? 'AI Recruiter' : 'HR Lead'
                  return (
                    <button
                      key={p}
                      onClick={() => setInterviewerPersona(p)}
                      className={clsx('flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all', isSelected ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-white/5 hover:border-white/25')}
                    >
                      <div className="relative">
                        <img src={img} alt={name} className="w-14 h-14 rounded-xl object-cover" />
                        {isSelected && <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950" />}
                      </div>
                      <span className="text-xs font-bold text-white">{name.split(' ')[0]}</span>
                      <span className="text-[9px] text-gray-500">{desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="card bg-gradient-to-br from-slate-950 to-slate-900 border border-white/10 !p-4 text-white space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-1">Interview Settings</p>

              {[
                { label: 'AI Interviewer Room', desc: 'Live camera & emotion tracking', value: aiInterviewerMode, toggle: () => setAiInterviewerMode(!aiInterviewerMode), color: 'bg-cyan-600' },
                { label: 'Spoken Questions', desc: 'AI reads questions aloud', value: interviewerVoice, toggle: () => setInterviewerVoice(!interviewerVoice), color: 'bg-amber-500' },
                { label: 'Panel Mode', desc: '3 AI interviewers take turns', value: panelMode, toggle: () => setPanelMode(!panelMode), color: 'bg-violet-600' },
              ].map(({ label, desc, value, toggle, color }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">{label}</p>
                    <p className="text-[10px] text-gray-500">{desc}</p>
                  </div>
                  <button onClick={toggle} className={clsx('relative w-11 h-6 rounded-full transition-colors shrink-0', value ? color : 'bg-gray-700')}>
                    <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', value ? 'translate-x-5' : 'translate-x-0')} />
                  </button>
                </div>
              ))}

              {panelMode && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  {PANEL_MEMBERS.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-[9px] font-black text-white shrink-0`}>{m.initials}</div>
                      <div>
                        <p className="text-[10px] font-semibold text-white leading-tight">{m.name}</p>
                        <p className="text-[9px] text-gray-600">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="card bg-gradient-to-br from-slate-950 to-slate-900 border border-white/10 !p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">How it works</p>
              <div className="space-y-2.5">
                {[
                  { step: '1', text: 'Click Start → browser asks for camera & mic', color: 'bg-cyan-500' },
                  { step: '2', text: 'AI HR greets you and asks questions aloud', color: 'bg-indigo-500' },
                  { step: '3', text: 'You speak → AI records and transcribes live', color: 'bg-violet-500' },
                  { step: '4', text: 'AI analyzes your answer and responds instantly', color: 'bg-emerald-500' },
                ].map(({ step, text, color }) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5`}>{step}</div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* START CTA */}
            <button
              onClick={handleGenerate}
              className={clsx(
                'w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-black text-base shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]',
                interviewFormat === 'text'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-500/25 hover:shadow-violet-500/40'
                  : interviewFormat === 'voice'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-cyan-500/25 hover:shadow-cyan-500/40'
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-500/25 hover:shadow-indigo-500/40'
              )}
            >
              {interviewFormat === 'text' ? <Type className="w-5 h-5" /> : interviewFormat === 'voice' ? <Mic className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              Start {interviewFormat === 'text' ? 'Text' : interviewFormat === 'voice' ? 'Voice' : 'Video'} Interview
            </button>

          </div>
        </div>
      </div>
    )
  }



  if (phase === PHASE.ROOM_ENTRY) {
    return (
      <PreInterviewChecklist
        candidateName={candidateName || 'Candidate'}
        roleLabel={selectedRoleLabel}
        resumeData={resumeData}
        interviewerPersona={interviewerPersona}
        interviewerName={interviewerName}
        interviewFormat={interviewFormat}
        onBack={() => setPhase(PHASE.SETUP)}
        onBegin={(stream) => {
          if (stream) {
            mediaStreamRef.current = stream
            setActiveMediaStream(stream)
            setPrecheckStream(stream)
          }
          setPhase(PHASE.INTERVIEWING)
          if (typeof window !== 'undefined') {
            window._heardHello = false
          }
          if (interviewFormat !== 'text') {
            setZoomPhase('connecting')
            setOnboardingQuestionText('')
            hasGreetedRef.current = false
            hasEncouragedRef.current = false
            hasGreetNudgeRef.current = false
            lastSpeechTimeRef.current = Date.now()
            setEncouragementText('')
          }
        }}
      />
    )
  }


  if (phase === PHASE.GENERATING) {


    return (


      <div className="flex flex-col items-center justify-center py-24 animate-in">


        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mb-6 animate-bounce-slow">


          <Mic className="w-10 h-10 text-primary-600" />


        </div>


        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Preparing Your Interview</h2>


        <p className="text-gray-500 text-sm mb-8">Gemini AI is crafting personalized questions...</p>


        <LoadingSpinner size="lg" color="primary" />


      </div>


    )
  }


  // Dedicated full-screen Text Interview layout
  if (
    (phase === PHASE.INTERVIEWING || phase === PHASE.EVALUATING) &&
    interviewFormat === 'text'
  ) {
    const totalQuestions = questions.length
    const wordCount = answer.split(/\s+/).filter(Boolean).length
    const charCount = answer.length

    // Dynamic hint based on role
    const getHint = () => {
      if (selectedRoleLabel.toLowerCase().includes('engineer') || selectedRoleLabel.toLowerCase().includes('developer')) {
        return "Try mentioning key technologies: architecture patterns, testing methodologies, and scalability tradeoffs."
      }
      return "Focus on structuring your response with a clear context, your specific actions, and the measurable results achieved."
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col text-white font-sans overflow-hidden select-none bg-[#090d16] interview-mesh-bg animate-in fade-in duration-300">
        <AmbientParticles />

        {/* ━━━ EVALUATING OVERLAY ━━━ */}
        {phase === PHASE.EVALUATING && (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-5">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border-4 border-cyan-400/60 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">Evaluating your response...</p>
                <p className="text-gray-400 text-sm mt-1">{interviewerName} is analyzing your answer</p>
              </div>
            </div>
          </div>
        )}

        {/* ━━━ TOP HEADER BAR ━━━ */}
        <div className="h-14 border-b border-white/5 bg-slate-950/85 px-5 flex items-center justify-between z-20 relative backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Type className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                AI Text Interview <span className="text-[10px] font-normal text-gray-400">Preparation Suite</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFinish}
              className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all shadow-md shadow-red-600/20"
            >
              End Interview
            </button>
          </div>
        </div>

        {/* ━━━ STATS BAR ROW ━━━ */}
        <div className="h-16 border-b border-white/5 bg-slate-950/40 px-6 flex items-center justify-between z-20 relative gap-4">
          <div className="flex items-center gap-6 text-xs text-gray-300">
            {/* Question */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Question</span>
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-violet-400" />
                {currentIndex + 1} / {totalQuestions}
              </span>
            </div>

            {/* Time left */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Time Left</span>
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                {formatTime(Math.max(0, 900 - totalElapsed))}
              </span>
            </div>

            {/* Total time */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Total Time</span>
              <span className="font-extrabold text-white flex items-center gap-1.5 font-mono">
                {formatTime(totalElapsed)}
              </span>
            </div>

            {/* Mode */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Mode</span>
              <span className="font-extrabold text-white flex items-center gap-1">
                Text
              </span>
            </div>

            {/* Difficulty */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Difficulty</span>
              <span className="font-extrabold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {adaptiveDifficulty.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex-1 max-w-xs flex items-center gap-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Progress</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* ━━━ MAIN WORKSPACE ━━━ */}
        <div className="flex-1 flex gap-5 p-5 min-h-0 relative z-10 overflow-hidden">
          {/* Left panel: Question description + Input area */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            
            {/* Interviewer Message Card */}
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-5 flex flex-col gap-3 relative shadow-2xl shrink-0">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                    <Cpu className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white">{interviewerName}</span>
                    <span className="text-[9px] text-gray-400 block">Interviewer (AI)</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500">Live</span>
              </div>
              <p className="text-base font-black text-white leading-relaxed">
                {currentQuestion?.text}
              </p>
              
              {/* Context tags / buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button 
                  onClick={() => toast(getHint(), { icon: '💡', duration: 4000 })}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-bold text-gray-300 transition-colors"
                >
                  💡 Show Hint
                </button>
                {resumeData && (
                  <span className="px-3.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-300">
                    📄 Resume Walkthrough
                  </span>
                )}
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-300 uppercase">
                  {adaptiveDifficulty}
                </span>
              </div>
            </div>

            {/* Answer Input area */}
            <div className="flex-1 rounded-3xl border border-white/[0.08] bg-slate-900/60 p-5 flex flex-col justify-between shadow-2xl min-h-0 relative">
              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Your Answer</label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="flex-1 w-full bg-slate-950/40 rounded-2xl border border-white/5 text-sm text-white placeholder-gray-500 p-4 focus:outline-none focus:border-violet-500/50 resize-none font-medium leading-relaxed overflow-y-auto scrollbar-thin"
                />
              </div>

              {/* Word / Char counter & Submit buttons */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-3 shrink-0">
                <div className="flex gap-4 text-[10px] text-gray-500 font-bold">
                  <span>{wordCount} words</span>
                  <span>{charCount} characters</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-xs font-bold text-gray-300 transition-colors flex items-center gap-1.5"
                  >
                    Skip Question
                  </button>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim()}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent transition-all text-xs font-bold text-white shadow-lg flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Answer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Tips footer row */}
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 flex items-center gap-6 shadow-2xl shrink-0 text-[10px]">
              <span className="font-black text-violet-300 uppercase tracking-widest">💡 Quick Tips</span>
              <div className="flex items-center gap-4 flex-wrap text-gray-400 font-bold">
                <span className="flex items-center gap-1.5">✓ Be specific and concise</span>
                <span className="flex items-center gap-1.5">✓ Highlight relevant experience</span>
                <span className="flex items-center gap-1.5">✓ Use real examples from your projects</span>
              </div>
            </div>
          </div>

          {/* Right panel: Evaluation criteria + STAR info + Today's summary */}
          <div className="w-80 bg-slate-900/60 rounded-3xl border border-white/[0.08] p-5 flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
            {/* 1. Evaluation checklist */}
            <div className="space-y-2 pb-3 border-b border-white/5">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block">AI Feedback Criteria</span>
              <p className="text-[10px] text-gray-500 font-semibold mb-2">Your answer will be evaluated on:</p>
              <div className="space-y-2 text-[10px] font-bold text-white">
                {['Relevance', 'Clarity', 'Depth', 'Structure'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. STAR method description */}
            <div className="space-y-2.5 pb-3 border-b border-white/5">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block">STAR Method Tracker</span>
              <p className="text-[10px] text-gray-500 font-semibold mb-1">Your response structure (evaluates as you type):</p>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-extrabold">
                <div className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col gap-0.5 ${
                  starStatus.s 
                    ? 'border-cyan-500/40 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-cyan-300' 
                    : 'border-white/5 bg-slate-950/40 text-gray-500'
                }`}>
                  <span className={`text-xs font-black transition-colors ${starStatus.s ? 'text-cyan-400' : 'text-gray-600'}`}>
                    S {starStatus.s ? '✓' : ''}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider">Situation</span>
                </div>

                <div className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col gap-0.5 ${
                  starStatus.t 
                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-emerald-300' 
                    : 'border-white/5 bg-slate-950/40 text-gray-500'
                }`}>
                  <span className={`text-xs font-black transition-colors ${starStatus.t ? 'text-emerald-400' : 'text-gray-600'}`}>
                    T {starStatus.t ? '✓' : ''}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider">Task</span>
                </div>

                <div className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col gap-0.5 ${
                  starStatus.a 
                    ? 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-amber-300' 
                    : 'border-white/5 bg-slate-950/40 text-gray-500'
                }`}>
                  <span className={`text-xs font-black transition-colors ${starStatus.a ? 'text-amber-400' : 'text-gray-600'}`}>
                    A {starStatus.a ? '✓' : ''}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider">Action</span>
                </div>

                <div className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col gap-0.5 ${
                  starStatus.r 
                    ? 'border-fuchsia-500/40 bg-fuchsia-950/20 shadow-[0_0_12px_rgba(217,70,239,0.15)] text-fuchsia-300' 
                    : 'border-white/5 bg-slate-950/40 text-gray-500'
                }`}>
                  <span className={`text-xs font-black transition-colors ${starStatus.r ? 'text-fuchsia-400' : 'text-gray-600'}`}>
                    R {starStatus.r ? '✓' : ''}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider">Result</span>
                </div>
              </div>
            </div>

            {/* 3. Today's Summary */}
            <div className="space-y-2 flex-1 flex flex-col justify-end">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Today's Summary</span>
              <div className="space-y-2 text-[10px] font-bold text-gray-400">
                <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                  <span>Questions Answered</span>
                  <span className="text-white">{currentIndex} / {totalQuestions}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                  <span>Time Spent</span>
                  <span className="text-white">{formatTime(totalElapsed)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                  <span>Average Time / Q</span>
                  <span className="text-white">{currentIndex > 0 ? formatTime(Math.round(totalElapsed / currentIndex)) : "00:00"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── VirtualInterviewRoom — full-screen 19-clip HR video interview ──────────
  if (
    (phase === PHASE.INTERVIEWING || phase === PHASE.EVALUATING) &&
    (interviewFormat === 'video' || interviewFormat === 'voice')
  ) {
    return (
      <VirtualInterviewRoom
        // Identity
        persona={interviewerPersona}
        candidateName={candidateName}
        sessionId={sessionId}
        // Camera / mic streams
        cameraPreviewRef={cameraPreviewRef}
        activeMediaStream={activeMediaStream}
        cameraReady={cameraReady}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        // HR speaking state (drives mic mute during HR clips)
        isInterviewerSpeaking={isInterviewerSpeaking}
        // Candidate voice
        isListening={isListening}
        voiceTranscript={voiceTranscript}
        voiceInterim={voiceInterim}
        voiceMetrics={voiceMetrics}
        // Progress
        elapsedSeconds={elapsedSeconds}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        // Gemini question queue (pre-generated at session start)
        geminiQuestions={questions}
        // Silence detection → submit answer + advance stage engine
        onSilenceDetected={(transcript) => {
          if (transcript) setAnswer(transcript)
          handleSubmitAnswer()
        }}
        // Stage change → sync zoomPhase for TTS compat
        onStageChange={(stage) => {
          const phaseMap = {
            greeting:                'greet_mic',
            asking_intro:            'identity_confirm',
            candidate_intro:         null,
            candidate_resume:        null,
            thanks_answering:        null,
            resume_intro:            'small_talk',
            resume_reading:          null,
            project_question:        null,
            candidate_project:       null,
            interesting_project:     null,
            challenge_question:      null,
            candidate_challenge:     null,
            motivation_question:     null,
            candidate_motivation:    null,
            transition_to_gemini:    null,
            gemini_speaking:         null,
            candidate_gemini_answer: null,
            closing:                 'closing',
          }
          const mapped = phaseMap[stage]
          if (mapped !== undefined) setZoomPhase(mapped)
        }}
        onInterviewComplete={handleFinish}
        // Controls
        onMicToggle={handleMicToggle}
        onCameraToggle={handleCameraToggle}
        onEndInterview={handleFinish}
        // Stable mic lifecycle callbacks — useCallback([]) avoids render loops
        onMicOpen={handleStageMicOpen}
        onMicClose={handleStageMicClose}
        onSpeakQuestion={speakVirtualQuestion}
        // Telemetry drawer
        coachingTips={coachingTips}
        emotionSnapshot={emotionSnapshot}
        onRegisterEngineSilence={(fn) => { engineSilenceRef.current = fn }}
        silenceThreshold={zoomPhase ? 6000 : 12000}
      />
    )
  }


  return (


    <div className="space-y-4 animate-in max-w-7xl mx-auto">


      {/* - Mode Tabs - */}


      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/80 border border-white/[0.06] w-fit">


        {FORMAT_OPTIONS.map(({ value, label }) => (


          <button


            key={value}


            className={clsx(


              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',


              interviewFormat === value


                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'


                : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'


            )}


            onClick={() => { if (phase === PHASE.SETUP) setInterviewFormat(value) }}


          >


            {value === 'text' ? <Type className="w-4 h-4" /> : value === 'voice' ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}


            {label} Mode


          </button>


        ))}


      </div>





      {/* - Stats Bar - */}


      <InterviewStatsBar


        currentIndex={currentIndex}


        totalQuestions={questions.length}


        elapsedSeconds={elapsedSeconds}


        totalElapsed={totalElapsed}


        interviewFormat={interviewFormat}


        difficulty={adaptiveDifficulty}


        progress={progress}


      />





      {/* - Main 2-Column Layout - */}


      <div className="grid lg:grid-cols-[1fr_340px] gap-4">


        {/* LEFT COLUMN */}


        <div className="space-y-4">


          {interviewFormat === 'video' && aiInterviewerMode && (
            <AIInterviewerRoom
              cameraPreviewRef={cameraPreviewRef}
              currentQuestion={currentQuestion}
              interviewerName={interviewerName}
              interviewerPersona={interviewerPersona}
              isListening={isListening}
              isSpeaking={isInterviewerSpeaking}
              cameraReady={cameraReady}
              emotionSnapshot={emotionSnapshot}
              onEmotionSnapshotChange={setEmotionSnapshot}
              onTelemetryOverrideChange={handleTelemetryOverrideChange}
              voiceTranscript={voiceTranscript}
              onVoiceTranscriptChange={setVoiceTranscript}
              onIsSpeakingChange={setIsInterviewerSpeaking}
              onEndInterview={handleFinish}
            />
          )}



          {/* Question Card */}


          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-xl">


            <div className="flex items-center justify-between mb-3">


              <div className="flex items-center gap-3">


                {panelMode ? (


                  <PanelAvatar member={getPanelMemberForQuestion(currentQuestion)} isActive showIntro={currentIndex === 0} />


                ) : (


                  <>


                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">


                      <Cpu className="w-5 h-5 text-white" />


                    </div>


                    <div>


                      <p className="text-xs text-gray-400">Interviewer</p>


                      <p className="text-sm font-bold text-white">Hiring Manager</p>


                    </div>


                  </>


                )}


              </div>


              <div className="flex items-center gap-2">


                {panelMode && <PanelRoster members={PANEL_MEMBERS} activeId={getPanelMemberForQuestion(currentQuestion)?.id} />}


                {isRetrying && <span className="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">RETRY</span>}


                {currentQuestion?.is_follow_up && <span className="px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-[10px] font-bold text-violet-300">FOLLOW-UP</span>}


                <span className="flex items-center gap-1.5 text-[11px] text-red-300 font-semibold"><Radio className="w-3 h-3 animate-pulse" /> Live</span>


              </div>


            </div>





            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Question {currentIndex + 1} of {questions.length}</p>


            <p className="text-lg font-semibold text-white leading-relaxed mb-3">{currentQuestion?.text}</p>


            <div className="flex flex-wrap gap-2">


              {currentQuestion?.round && <span className="badge badge-green">{currentQuestion.round}</span>}


              {currentQuestion?.category && <span className="badge badge-blue">{currentQuestion.category}</span>}


              {currentQuestion?.time_limit_seconds && <span className="badge badge-red">{currentQuestion.time_limit_seconds}s</span>}


              {currentQuestion?.difficulty && (


                <span className={clsx('badge', {


                  'badge-green': currentQuestion.difficulty === 'easy',


                  'badge-orange': currentQuestion.difficulty === 'medium',


                  'badge-red': currentQuestion.difficulty === 'hard',


                })}>{currentQuestion.difficulty}</span>


              )}


            </div>


            <button onClick={() => setShowHint(v => !v)} className="mt-3 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">


              <Lightbulb className="w-3.5 h-3.5" /> {showHint ? 'Hide hint' : 'Show hint'}


            </button>


            {showHint && (


              <div className="mt-2 p-3 bg-amber-500/10 rounded-xl text-xs text-amber-200 border border-amber-500/20">


                <Lightbulb className="w-3.5 h-3.5 inline mr-1" /> This is a <strong>{currentQuestion?.type}</strong> question about <strong>{currentQuestion?.category}</strong>. Structure your answer: context, approach, outcome.


              </div>


            )}


          </div>





          {/* Recording / Input Area */}


          {interviewFormat !== 'text' && (


            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">


              {interviewFormat === 'video' && !aiInterviewerMode && (


                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black mb-4">


                  <video ref={cameraPreviewRef} autoPlay muted playsInline className="w-full aspect-video object-cover bg-black" />


                  {!cameraReady && (


                    <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm bg-black/70">Camera activates when recording starts.</div>


                  )}


                  {isListening && <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/80 text-[10px] font-bold text-white"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE</div>}


                </div>


              )}





              <div className="flex items-center justify-between mb-3">


                <p className="text-sm font-semibold text-white flex items-center gap-2">


                  {interviewFormat === 'video' ? <Camera className="w-4 h-4 text-cyan-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}


                  {isListening ? 'Listening...' : 'Mic capture'}


                </p>


                <div className="flex gap-2">


                  {!isListening && (


                    <button onClick={startVoiceCapture} className="px-3 py-1.5 rounded-xl bg-green-500/15 border border-green-500/30 text-xs font-semibold text-green-300 hover:bg-green-500/25 transition-colors flex items-center gap-1.5">


                      <Play className="w-3 h-3" /> Start


                    </button>


                  )}


                  {isListening && (


                    <button onClick={() => stopVoiceCapture({ keepTranscript: true })} className="px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition-colors flex items-center gap-1.5">


                      <Square className="w-3 h-3" /> Stop


                    </button>


                  )}


                  <button onClick={() => setShowTypingFallback(v => !v)} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10 transition-colors">


                    <Type className="w-3 h-3" />


                  </button>


                </div>


              </div>





              <VoiceCaptureStudio
                stream={activeMediaStream}
                isListening={isListening}
                transcript={voiceTranscript}
                interimTranscript={voiceInterim}
                voiceMetrics={voiceMetrics}
                elapsedSeconds={elapsedSeconds}
                recordingUrl={recordingUrl}
                interviewFormat={interviewFormat}
                onVoiceTelemetryUpdate={(tel) => setAvgTremorScore(tel.avg_tremor)}
                audioDevices={audioDevices}
                videoDevices={videoDevices}
                selectedMicId={selectedMicId}
                selectedCameraId={selectedCameraId}
                onMicChange={handleMicChange}
                onCameraChange={handleCameraChange}
              />





              {voiceError && (


                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200 mb-3 space-y-2">
                  <div className="font-bold text-red-300">Voice Recognition Issue:</div>
                  <div>{voiceError}</div>
                  <div className="pt-1.5 text-[11px] text-gray-400 border-t border-white/5 space-y-1">
                    <p className="font-semibold text-gray-300">💡 Quick Troubleshooting Tips:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Use a supported browser like <strong className="text-gray-300">Google Chrome</strong> or <strong className="text-gray-300">Microsoft Edge</strong>.</li>
                      <li>Ensure you are accessing the app via <code className="bg-white/5 px-1 rounded text-gray-300">http://localhost:5173</code> (IP address access requires HTTPS for media devices).</li>
                      <li>Click the site settings/padlock icon next to the URL in your browser address bar and verify Microphone permission is set to <strong>Allow</strong>.</li>
                      <li>If you still experience issues, click the <strong>Keyboard/Type icon (⌨️)</strong> above to enable the <strong className="text-gray-300">Typed Fallback mode</strong> and type your answers.</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-red-500/10">
                    <button
                      onClick={startVoiceCapture}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Retry Mic Capture</span>
                    </button>
                    <button
                      onClick={() => {
                        setVoiceError('')
                        setShowTypingFallback(true)
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-lg border border-white/10 transition-colors text-[11px]"
                    >
                      Use Typed Input
                    </button>
                  </div>
                </div>


              )}





            </div>


          )}





          {/* Typed answer area */}


          {(showTypingFallback || interviewFormat === 'text') && (


            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">


              <label className="block text-sm font-semibold text-white mb-2">


                {interviewFormat === 'text' ? 'Your Answer' : 'Typed Fallback'}


              </label>


              <textarea


                ref={textareaRef}


                className="w-full rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-gray-500 p-3 resize-none h-32 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all"


                placeholder="Type your answer here..."


                value={answer}


                onChange={e => setAnswer(e.target.value)}


                disabled={phase === PHASE.EVALUATING}


              />


              <div className="flex items-center justify-between mt-2">


                <span className="text-xs text-gray-500">{answer.split(/\s+/).filter(Boolean).length} words</span>


              </div>


            </div>


          )}





          {/* Action buttons */}


          <div className="flex items-center gap-3">


            <button onClick={handleSkip} disabled={phase === PHASE.EVALUATING} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:bg-white/[0.08] transition-colors flex items-center gap-2">


              <SkipForward className="w-4 h-4" /> Skip


            </button>


            <button


              onClick={handleSubmitAnswer}


              disabled={!(answer.trim() || voiceTranscript.trim()) || phase === PHASE.EVALUATING}


              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"


            >


              {phase === PHASE.EVALUATING


                ? <><LoadingSpinner size="sm" color="white" /> Evaluating...</>


                : <><Send className="w-4 h-4" /> Submit Answer</>


              }


            </button>


            {evaluation && (


              <button onClick={handleNextQuestion} className="px-4 py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-sm font-semibold text-cyan-300 hover:bg-cyan-600/30 transition-colors flex items-center gap-2">


                {currentIndex + 1 >= questions.length ? <><TrendingUp className="w-4 h-4" /> Results</> : <><ChevronDown className="w-4 h-4" /> Next</>}


              </button>


            )}


          </div>





          {/* Bottom Metrics Bar */}


          {(isListening || voiceMetrics) && (


            <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/[0.06]">


              <MetricChip label="WPM" value={voiceMetrics?.speaking_pace_wpm || '-'} status={voiceMetrics?.speaking_pace_wpm >= 110 && voiceMetrics?.speaking_pace_wpm <= 170 ? 'good' : voiceMetrics?.speaking_pace_wpm ? 'warn' : 'idle'} />


              <MetricChip label="Fillers" value={voiceMetrics?.filler_count ?? '-'} status={voiceMetrics?.filler_count <= 3 ? 'good' : voiceMetrics?.filler_count ? 'warn' : 'idle'} />


              <MetricChip label="Words" value={voiceMetrics?.word_count || answer.split(/\s+/).filter(Boolean).length || '-'} status="idle" />


              <MetricChip label="Clarity" value={evaluation?.clarity_score ? `${evaluation.clarity_score}` : '-'} status={evaluation?.clarity_score >= 70 ? 'good' : evaluation?.clarity_score ? 'warn' : 'idle'} />


              <MetricChip label="Confidence" value={evaluation?.confidence_score ? `${evaluation.confidence_score}` : '-'} status={evaluation?.confidence_score >= 70 ? 'good' : evaluation?.confidence_score ? 'warn' : 'idle'} />


            </div>


          )}





          {/* Evaluation Result (inline) */}


          {evaluation && phase !== PHASE.INTERVIEWING && (


            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 space-y-4">


              <div className="flex items-center justify-between">


                <h3 className="font-bold text-white flex items-center gap-2">


                  {evaluation.overall_score >= 70 ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-orange-500" />}


                  Evaluation


                  {isRetrying && previousScore !== null && (


                    <span className={clsx('text-xs ml-2 px-2 py-0.5 rounded-full', evaluation.overall_score > previousScore ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>


                      {evaluation.overall_score > previousScore ? `+${evaluation.overall_score - previousScore}` : evaluation.overall_score - previousScore} from retry


                    </span>


                  )}


                </h3>


                <span className={clsx('text-2xl font-black', evaluation.overall_score >= 70 ? 'text-green-500' : evaluation.overall_score >= 50 ? 'text-yellow-500' : 'text-red-500')}>


                  {evaluation.overall_score}/100


                </span>


              </div>





              <div className="grid grid-cols-2 gap-2">


                <MiniScoreRow label="Technical" score={evaluation.technical_score} />


                <MiniScoreRow label="Clarity" score={evaluation.clarity_score} />


                <MiniScoreRow label="Relevance" score={evaluation.relevance_score || evaluation.technical_score} />


                <MiniScoreRow label="Depth" score={evaluation.depth_score || evaluation.completeness_score} />


              </div>





              {evaluation.feedback && (


                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-gray-300">


                  <p className="font-semibold text-white mb-1 flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Feedback</p>


                  {evaluation.feedback}


                </div>


              )}





              {evaluation.ideal_answer_hints && (


                <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-sm text-violet-300">


                  <p className="font-semibold text-violet-200 mb-1 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Ideal Answer</p>


                  {evaluation.ideal_answer_hints}


                </div>


              )}





              {/* Strengths / Weaknesses */}


              <div className="flex gap-3">


                {evaluation.strong_areas?.length > 0 && (


                  <div className="flex-1">


                    <p className="text-[10px] font-bold uppercase text-green-400 mb-1.5 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Strengths</p>


                    <div className="flex flex-wrap gap-1">{evaluation.strong_areas.map(a => <span key={a} className="badge badge-green">{a}</span>)}</div>


                  </div>


                )}


                {evaluation.weak_areas?.length > 0 && (


                  <div className="flex-1">


                    <p className="text-[10px] font-bold uppercase text-orange-400 mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Improve</p>


                    <div className="flex flex-wrap gap-1">{evaluation.weak_areas.map(a => <span key={a} className="badge badge-orange">{a}</span>)}</div>


                  </div>


                )}


              </div>





              {/* Action buttons */}


              <div className="flex gap-2">


                <button onClick={handleRetryAnswer} className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5">


                  <RefreshCw className="w-3.5 h-3.5" /> Retry Answer


                </button>


                {shouldAskFollowUp(evaluation) && (


                  <button onClick={handleFollowUp} className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center gap-1.5">


                    <Zap className="w-3.5 h-3.5" /> Follow-Up Question


                  </button>


                )}


              </div>


            </div>


          )}

          {/* AI Interview Coach Panel */}
          <InterviewCoachPanel
            coaching={coaching}
            loading={coachingLoading}
            onRetry={handleRetryAnswer}
            onNext={handleNextQuestion}
            isLastQuestion={currentIndex + 1 >= questions.length}
          />


        </div>





        {/* RIGHT COLUMN - Live Feedback Panel */}


        <div className="hidden lg:block">


          <div className="sticky top-4 rounded-2xl border border-white/10 bg-slate-950 p-5">


            <LiveFeedbackPanel


              evaluation={evaluation}


              coachingTips={coachingTips}


              voiceMetrics={voiceMetrics}
              emotionSnapshot={emotionSnapshot}


              isLive={isListening}


              questionType={currentQuestion?.type || 'technical'}


            />


          </div>


        </div>


      </div>


    </div>


  )


}





/* - Metric Chip (bottom bar) - */


function MetricChip({ label, value, status = 'idle' }) {


  const color = status === 'good' ? 'text-green-400' : status === 'warn' ? 'text-yellow-400' : 'text-gray-400'


  return (


    <div className="flex items-center gap-2">


      <div>


        <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>


        <p className={`text-sm font-bold text-white`}>{value}</p>


      </div>


      <span className={`text-[10px] font-semibold ${color}`}>


        {status === 'good' ? 'Good' : status === 'warn' ? 'Avg' : ''}


      </span>


    </div>


  )


}












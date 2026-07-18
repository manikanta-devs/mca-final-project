/**
 * useInterviewStageEngine.js
 *
 * Central state machine for the real virtual interview flow.
 * Drives which HR video clip plays, whether mic is open, and
 * handles idle loop alternation + Gemini talking animation pool.
 *
 * SUB-STAGES (in order):
 *   connecting → hr_joins → greeting → asking_intro →
 *   candidate_intro → processing_notes → processing_screen → thanks_answering →
 *   resume_intro → resume_reading →
 *   project_question → candidate_project → processing_project →
 *   interesting_project → challenge_question → candidate_challenge → processing_challenge →
 *   motivation_question → candidate_motivation → processing_motivation →
 *   transition_to_gemini →
 *   [loop] gemini_speaking → candidate_gemini_answer → processing_gemini →
 *   closing → complete
 *
 * Fixes applied:
 *  - conversationHistory stale closure fixed via conversationHistoryRef
 *  - IDLE_POOL expanded with 7 real listening/reacting clips (muted loops)
 *  - Processing stages get extra clip variety (seeing_resume, looking_resume)
 */
import { useState, useRef, useCallback, useEffect } from 'react'

// ─── All clip filenames (served from /interviewers/female_hr/) ────────────────
export const HR_CLIPS = {
  // Core scripted clips
  IDLE:            'idel_looking.mp4',
  BLINK:           'only_blinking_eyes.mp4',
  GOODMORNING:     'hr_goodmorning.mp4',
  ASKING_INTRO:    'asking_for_self_introduction.mp4',
  TAKING_NOTES:    'hr_taking_notes.mp4',
  LOOKING_SCREEN:  'hr_looking_at_screen.mp4',
  THANKS_ANSWER:   'thanks_for_answering.mp4',
  RESUME_INTRO:    'great_i_have_your_resume_here.mp4',
  RESUME_READ:     'hr_looking_at_resume.mp4',
  PROJECT_Q:       'thanks_for_the_intro_asking_project.mp4',
  INTERESTING:     'thats_an_interesting_project.mp4',
  CHALLENGE_Q:     'can_you_tell_the_biggest_challenge.mp4',
  MOTIVATION_Q:    'thanks_for_explaining_motivates.mp4',
  MOVE_TO_NEXT:    'thanks_answering_move_to_next_q.mp4',
  EXPLAINING:      'explaining.mp4',
  TALKING_2:       'talking_2.mp4',
  HR_TALKING:      'hr_talking.mp4',
  HR_TALKING_3:    'hr_talking_3.mp4',
  CLOSING:         'closing.mp4',
  // Extended idle/listening pool clips (muted)
  LISTEN:          'listen.mp4',
  LISTENING:       'listening.mp4',
  LISTENING_2:     'listening_2.mp4',
  LOOKING_AWAY:    'looking_away.mp4',
  OK:              'ok.mp4',
  UNDERSTOOD:      'understood.mp4',
  WOMAN_UNDERSTAND:'woman_saying_i_understand.mp4',
  // Processing variety
  SEEING_RESUME:   'seeing_resume.mp4',
  LOOKING_RESUME:  'looking_resume.mp4',
}

// ─── Idle loop pool (alternated while candidate speaks) ─────────────────────
// All are muted looping clips — HR observing the candidate
const IDLE_POOL = [
  HR_CLIPS.IDLE,
  HR_CLIPS.BLINK,
  HR_CLIPS.LISTEN,
  HR_CLIPS.LISTENING,
  HR_CLIPS.LISTENING_2,
]

// ─── OK/nodding pool (occasionally played after idle to show engagement) ────
const REACT_POOL = [
  HR_CLIPS.OK,
]

// ─── Gemini talking animation pool (random pick, loops while TTS plays) ──────
const GEMINI_TALKING_POOL = [
  HR_CLIPS.EXPLAINING,
  HR_CLIPS.TALKING_2,
  HR_CLIPS.HR_TALKING,
  HR_CLIPS.HR_TALKING_3,
]

// ─── Processing clip pools ───────────────────────────────────────────────────
const PROCESSING_NOTES_POOL = [
  HR_CLIPS.TAKING_NOTES,
]

const PROCESSING_SCREEN_POOL = [
  HR_CLIPS.LOOKING_SCREEN,
  HR_CLIPS.SEEING_RESUME,
  HR_CLIPS.LOOKING_RESUME,
]

// ─── Human-like randomised delays (ms) ──────────────────────────────────────
const humanDelay = {
  afterCandidateStops: () => 600  + Math.random() * 900,  // 0.6–1.5s
  betweenProcessing:   () => 150  + Math.random() * 250,  // 0.15–0.4s
  betweenScripted:     () => 300  + Math.random() * 500,  // 0.3–0.8s
  beforeGeminiSpeaks:  () => 800  + Math.random() * 1200, // 0.8–2.0s
}

// ─── Pool pickers ─────────────────────────────────────────────────────────────
let _lastGeminiClipIdx = -1
function pickGeminiClip() {
  let idx
  do { idx = Math.floor(Math.random() * GEMINI_TALKING_POOL.length) }
  while (idx === _lastGeminiClipIdx && GEMINI_TALKING_POOL.length > 1)
  _lastGeminiClipIdx = idx
  return GEMINI_TALKING_POOL[idx]
}

let _idleIdx = 0
let _idleConsecutive = 0
function nextIdleClip() {
  // Every 3 consecutive idles, pick a "react" clip instead (nodding)
  _idleConsecutive++
  if (_idleConsecutive % 3 === 0 && REACT_POOL.length > 0) {
    return REACT_POOL[Math.floor(Math.random() * REACT_POOL.length)]
  }
  // Otherwise rotate through the idle pool
  const prev = _idleIdx
  do { _idleIdx = Math.floor(Math.random() * IDLE_POOL.length) }
  while (_idleIdx === prev && IDLE_POOL.length > 1)
  return IDLE_POOL[_idleIdx]
}

function pickProcessingScreenClip() {
  return PROCESSING_SCREEN_POOL[Math.floor(Math.random() * PROCESSING_SCREEN_POOL.length)]
}

// ─── Clip resolver: subStage → { clipName, muted, loop } ────────────────────
function resolveClip(subStage, idleClipName, geminiTalkingClip, processingScreenClip) {
  switch (subStage) {
    case 'connecting':             return { clipName: HR_CLIPS.IDLE,             muted: true,  loop: true  }
    case 'hr_joins':               return { clipName: HR_CLIPS.IDLE,             muted: true,  loop: true  }
    case 'greeting':               return { clipName: HR_CLIPS.GOODMORNING,      muted: false, loop: false }
    case 'asking_intro':           return { clipName: HR_CLIPS.ASKING_INTRO,     muted: false, loop: false }
    case 'candidate_intro':
    case 'candidate_resume':
    case 'candidate_project':
    case 'candidate_challenge':
    case 'candidate_motivation':
    case 'candidate_gemini_answer':return { clipName: idleClipName,             muted: true,  loop: true  }
    case 'processing_notes':       return { clipName: HR_CLIPS.TAKING_NOTES,    muted: true,  loop: false }
    case 'processing_screen':
    case 'processing_project':
    case 'processing_challenge':
    case 'processing_motivation':
    case 'processing_gemini':      return { clipName: processingScreenClip,      muted: true,  loop: false }
    case 'thanks_answering':       return { clipName: HR_CLIPS.THANKS_ANSWER,   muted: false, loop: false }
    case 'resume_intro':           return { clipName: HR_CLIPS.RESUME_INTRO,    muted: false, loop: false }
    case 'resume_reading':         return { clipName: HR_CLIPS.RESUME_READ,     muted: true,  loop: false }
    case 'project_question':       return { clipName: HR_CLIPS.PROJECT_Q,       muted: false, loop: false }
    case 'interesting_project':    return { clipName: HR_CLIPS.INTERESTING,     muted: false, loop: false }
    case 'challenge_question':     return { clipName: HR_CLIPS.CHALLENGE_Q,     muted: false, loop: false }
    case 'motivation_question':    return { clipName: HR_CLIPS.MOTIVATION_Q,    muted: false, loop: false }
    case 'transition_to_gemini':   return { clipName: HR_CLIPS.MOVE_TO_NEXT,   muted: false, loop: false }
    case 'gemini_speaking':        return { clipName: geminiTalkingClip,         muted: true,  loop: true  }
    case 'closing':                return { clipName: HR_CLIPS.CLOSING,         muted: false, loop: false }
    case 'complete':               return { clipName: HR_CLIPS.IDLE,            muted: true,  loop: true  }
    default:                       return { clipName: HR_CLIPS.IDLE,            muted: true,  loop: true  }
  }
}

// ─── Stages where the candidate's mic should be open ─────────────────────────
const MIC_OPEN_STAGES = new Set([
  'candidate_intro',
  'candidate_resume',
  'candidate_project',
  'candidate_challenge',
  'candidate_motivation',
  'candidate_gemini_answer',
])

// ─── Main Hook ────────────────────────────────────────────────────────────────
export default function useInterviewStageEngine({
  onInterviewComplete,
  onMicOpen,
  onMicClose,
  geminiQuestions = [],       // pre-fetched question list for Gemini mode
  totalGeminiQuestions = 5,
  interviewerPersona,
}) {
  const [subStage, setSubStage]           = useState('connecting')
  const [idleClipName, setIdleClipName]   = useState(HR_CLIPS.IDLE)
  const [geminiClipName, setGeminiClipName] = useState(GEMINI_TALKING_POOL[0])
  const [processingScreenClip, setProcessingScreenClip] = useState(HR_CLIPS.LOOKING_SCREEN)
  const [geminiQuestionIdx, setGeminiQuestionIdx] = useState(0)
  const [isGeminiThinking, setIsGeminiThinking]   = useState(false)
  const [currentQuestion, setCurrentQuestion]      = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])

  const subStageRef              = useRef('connecting')
  const geminiQueueRef           = useRef([...geminiQuestions])
  const transcriptBufferRef      = useRef('')
  const timerRef                 = useRef(null)
  // ── Fix: keep conversationHistory accessible in onVideoEnded without stale closure ──
  const conversationHistoryRef   = useRef([])

  // Keep refs in sync
  useEffect(() => { subStageRef.current = subStage }, [subStage])

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory
  }, [conversationHistory])

  // Sync gemini queue when questions arrive
  useEffect(() => {
    geminiQueueRef.current = [...geminiQuestions]
  }, [geminiQuestions])

  // ─── Advance to next sub-stage (with human delay) ──────────────────────────
  const advanceTo = useCallback((nextStage, delay = 0) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setSubStage(nextStage)
      subStageRef.current = nextStage
      // Pick a fresh processing screen clip when entering any processing stage
      if (
        nextStage === 'processing_screen' ||
        nextStage === 'processing_project' ||
        nextStage === 'processing_challenge' ||
        nextStage === 'processing_motivation' ||
        nextStage === 'processing_gemini'
      ) {
        setProcessingScreenClip(pickProcessingScreenClip())
      }
    }, delay)
  }, [])

  // ─── Derived state ──────────────────────────────────────────────────────────
  const currentClip = resolveClip(subStage, idleClipName, geminiClipName, processingScreenClip)
  const micOpen     = MIC_OPEN_STAGES.has(subStage)

  // ─── Auto-advance from hr_joins to greeting after a delay ──────────────────
  useEffect(() => {
    if (subStage === 'hr_joins') {
      advanceTo('greeting', 3500)
    }
  }, [subStage, advanceTo])

  // ─── Mic side-effects ───────────────────────────────────────────────────────
  const onMicOpenRef  = useRef(onMicOpen)
  const onMicCloseRef = useRef(onMicClose)

  useEffect(() => {
    onMicOpenRef.current  = onMicOpen
    onMicCloseRef.current = onMicClose
  }, [onMicOpen, onMicClose])

  useEffect(() => {
    if (micOpen) { onMicOpenRef.current?.() }
    else         { onMicCloseRef.current?.() }
  }, [micOpen])

  // ─── Called by parent when Gemini TTS finishes speaking ──────────────────
  // (declared before onVideoEnded so it can be referenced)
  const onGeminiTTSEnded = useCallback(() => {
    if (subStageRef.current === 'gemini_speaking') {
      // Opens mic for candidate_gemini_answer — inline to avoid circular ref
      advanceTo('candidate_gemini_answer', 0)
    }
  }, [advanceTo])

  // ─── Called when processing_gemini ends — dequeue next Gemini question ────
  const dequeueGeminiQuestion = useCallback(() => {
    const queue = geminiQueueRef.current
    if (queue.length > 0) {
      const next = queue.shift()
      geminiQueueRef.current = queue
      setCurrentQuestion(next)
      const clip = pickGeminiClip()
      setGeminiClipName(clip)
      setGeminiQuestionIdx(idx => idx + 1)
      return next
    }
    // No more questions — close interview
    advanceTo('closing', humanDelay.betweenScripted())
    return null
  }, [advanceTo])

  // ─── Called by HRVideoPlayer when a non-looping clip finishes ──────────────
  const onVideoEnded = useCallback(() => {
    const s     = subStageRef.current
    const delay = humanDelay.betweenScripted()
    // ── Use ref (not state) so we always read the latest conversation history ──
    const history = conversationHistoryRef.current

    switch (s) {
      // ── Scripted greeting sequence ─────────────────────────────────────────
      case 'hr_joins':          advanceTo('greeting',           delay); break
      case 'greeting':          advanceTo('asking_intro',       delay); break
      case 'asking_intro':      advanceTo('candidate_intro',    0);     break  // mic opens immediately

      // ── Processing → thanks sequence ──────────────────────────────────────
      case 'processing_notes':  advanceTo('processing_screen',  humanDelay.betweenProcessing()); break

      case 'processing_screen': {
        const lastCandidate = history[history.length - 1]?.stage

        if (lastCandidate === 'candidate_gemini_answer') {
          const nextQ = dequeueGeminiQuestion()
          if (nextQ) {
            advanceTo('gemini_speaking', delay)
          }
        } else {
          const stageMap = {
            candidate_intro:     'thanks_answering',
            candidate_resume:    'project_question',
            candidate_project:   'interesting_project',
            candidate_challenge: 'motivation_question',
            candidate_motivation:'transition_to_gemini',
          }
          const next = stageMap[lastCandidate] || 'thanks_answering'
          advanceTo(next, delay)
        }
        break
      }

      case 'processing_project':
      case 'processing_challenge':
      case 'processing_motivation':
      case 'processing_gemini': {
        // These processing stages are entered but resolveClip maps them to LOOKING_SCREEN pool.
        // After any of these, fall through to the same logic as processing_screen.
        const lastCandidate = history[history.length - 1]?.stage

        if (lastCandidate === 'candidate_gemini_answer') {
          const nextQ = dequeueGeminiQuestion()
          if (nextQ) {
            advanceTo('gemini_speaking', delay)
          }
        } else {
          const stageMap = {
            candidate_intro:     'thanks_answering',
            candidate_resume:    'project_question',
            candidate_project:   'interesting_project',
            candidate_challenge: 'motivation_question',
            candidate_motivation:'transition_to_gemini',
          }
          const next = stageMap[lastCandidate] || 'thanks_answering'
          advanceTo(next, delay)
        }
        break
      }

      case 'thanks_answering':    advanceTo('resume_intro',          delay); break
      case 'resume_intro':        advanceTo('resume_reading',        delay); break
      case 'resume_reading':      advanceTo('candidate_resume',      0);     break  // mic opens immediately
      case 'project_question':    advanceTo('candidate_project',     0);     break
      case 'interesting_project': advanceTo('challenge_question',    delay); break
      case 'challenge_question':  advanceTo('candidate_challenge',   0);     break
      case 'motivation_question': advanceTo('candidate_motivation',  0);     break
      case 'transition_to_gemini': {
        const nextQ = dequeueGeminiQuestion()
        if (nextQ) {
          advanceTo('gemini_speaking', humanDelay.beforeGeminiSpeaks())
        }
        break
      }

      case 'gemini_speaking': {
        // TTS has ended (parent calls onGeminiTTSEnded) — this path handles
        // the edge case where the lipSync video clip finishes playing naturally
        advanceTo('candidate_gemini_answer', 0)
        break
      }

      case 'closing': {
        advanceTo('complete', 500)
        onInterviewComplete?.()
        break
      }
      default: break
    }
  }, [advanceTo, dequeueGeminiQuestion, onInterviewComplete])

  // ─── Called when idle clip ends during candidate-speaking stages ──────────
  const onIdleEnded = useCallback(() => {
    const next = nextIdleClip()
    setIdleClipName(next)
  }, [])

  // ─── Called when silence is detected (candidate stopped speaking) ─────────
  const onSilenceDetected = useCallback((transcript = '') => {
    const s = subStageRef.current
    if (!MIC_OPEN_STAGES.has(s)) return

    // Save transcript to history
    transcriptBufferRef.current = transcript
    const entry = { stage: s, transcript, timestamp: Date.now() }
    setConversationHistory(prev => {
      const next = [...prev, entry]
      conversationHistoryRef.current = next
      return next
    })

    // Go to processing with human delay
    advanceTo('processing_notes', humanDelay.afterCandidateStops())
  }, [advanceTo])

  // ─── Called by useBackgroundAnalysis when next question is ready ──────────
  const enqueueGeminiQuestion = useCallback((question) => {
    geminiQueueRef.current.push(question)
    setIsGeminiThinking(false)

    const s = subStageRef.current
    if (s === 'processing_screen' || s === 'processing_gemini' || s === 'processing_notes') {
      const queue = geminiQueueRef.current
      if (queue.length > 0) {
        const next = queue.shift()
        geminiQueueRef.current = queue
        setCurrentQuestion(next)
        const clip = pickGeminiClip()
        setGeminiClipName(clip)
        setGeminiQuestionIdx(idx => idx + 1)
        advanceTo('gemini_speaking', 0)
      }
    }
  }, [advanceTo])

  const setGeminiThinking = useCallback((val) => {
    setIsGeminiThinking(val)
  }, [])

  // ─── Start the interview (called when connecting screen resolves) ─────────
  const startInterview = useCallback(() => {
    advanceTo('hr_joins', 3500) // 3.5s connecting animation then HR joins
  }, [advanceTo])

  // ─── Fallback timers for Nagma HR (static avatar has no video end events) ───
  useEffect(() => {
    if (interviewerPersona !== 'nagma_hr') return
    
    if (subStage === 'greeting') {
      const t = setTimeout(() => {
        const nextQ = dequeueGeminiQuestion()
        if (nextQ) {
          advanceTo('gemini_speaking', 0)
        } else {
          advanceTo('closing', 0)
        }
      }, 4500)
      return () => clearTimeout(t)
    }
  }, [subStage, interviewerPersona, dequeueGeminiQuestion, advanceTo])

  useEffect(() => {
    if (interviewerPersona !== 'nagma_hr') return

    if (subStage === 'closing') {
      const t = setTimeout(() => {
        advanceTo('complete', 500)
        onInterviewComplete?.()
      }, 5000)
    }
  }, [subStage, interviewerPersona, advanceTo, onInterviewComplete])

  useEffect(() => {
    if (interviewerPersona !== 'nagma_hr') return

    if (['processing_notes', 'processing_screen', 'processing_gemini'].includes(subStage)) {
      const t = setTimeout(() => {
        onVideoEnded()
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [subStage, interviewerPersona, onVideoEnded])

  return {
    subStage,
    currentClip,
    micOpen,
    isGeminiThinking,
    currentQuestion,
    conversationHistory,
    geminiQuestionIdx,
    onVideoEnded,
    onIdleEnded,
    onSilenceDetected,
    onGeminiTTSEnded,
    dequeueGeminiQuestion,
    enqueueGeminiQuestion,
    setGeminiThinking,
    startInterview,
    transcriptBufferRef,
  }
}

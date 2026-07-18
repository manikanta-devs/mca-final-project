/**
 * VideoInterviewRoom.jsx
 * 
 * The main interview room layout — a single-page cockpit that orchestrates
 * all interview components: avatar, webcam, transcript, controls, analytics, HUD.
 * 
 * This component manages the conversation flow:
 *   IDLE → GREETING → SPEAKING → LISTENING → THINKING → SPEAKING → ... → ENDING
 * 
 * It is the PRESENTATION LAYER only. It does not change how questions are
 * generated, evaluated, stored, or how interview history works. It only
 * consumes the existing interview APIs and state.
 * 
 * @component
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, RotateCcw, ArrowLeft, CheckCircle, Star, MessageSquare } from 'lucide-react'

import HRAvatar from './HRAvatar'
import CandidateWebcam from './CandidateWebcam'
import InterviewTranscript from './InterviewTranscript'
import InterviewControls from './InterviewControls'
import InterviewAnalytics from './InterviewAnalytics'
import InterviewHUD from './InterviewHUD'

import { useInterviewSession, SESSION_PHASES, AVATAR_STATES } from '../hooks/useInterviewSession'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useSpeechToText } from '../hooks/useSpeechToText'

// ─── Filler words to detect ─────────────────────────────────
const FILLER_WORDS = ['um', 'uh', 'uhh', 'umm', 'like', 'you know', 'basically', 'actually', 'literally', 'so yeah']

function countFillerWords(text) {
  if (!text) return 0
  const lower = text.toLowerCase()
  return FILLER_WORDS.reduce((count, filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    const matches = lower.match(regex)
    return count + (matches ? matches.length : 0)
  }, 0)
}

function countWords(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ─── Styles ──────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
  },
  mainArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarSection: {
    flex: '0 0 70%',
    position: 'relative',
    overflow: 'hidden',
  },
  analyticsSection: {
    flex: '0 0 30%',
    background: 'rgba(15,23,42,0.6)',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  bottomSection: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(15,23,42,0.8)',
    backdropFilter: 'blur(12px)',
  },
  // Results screen styles
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)',
    borderRadius: '16px',
    overflow: 'auto',
  },
  resultsTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#e2e8f0',
    marginBottom: '8px',
  },
  resultsSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '32px',
  },
  qaList: {
    width: '100%',
    maxWidth: '700px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
    textAlign: 'left',
  },
  qaCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '16px',
  },
  qaQuestion: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  qaAnswer: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.5',
    paddingLeft: '24px',
  },
  qaCategory: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(139,92,246,0.15)',
    color: '#A78BFA',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  resultsActions: {
    display: 'flex',
    gap: '12px',
  },
  resultBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
}

/**
 * Main Interview Room Component
 * 
 * @param {Object} props
 * @param {string} props.persona - 'sarah' or 'marcus'
 * @param {string} props.difficulty - 'Easy', 'Medium', or 'Hard'
 * @param {number} props.numQuestions - Total questions for the session
 * @param {Function} props.onExit - Callback to return to setup screen
 */
export default function VideoInterviewRoom({
  persona = 'sarah',
  difficulty = 'Medium',
  numQuestions = 5,
  onExit,
}) {
  // ─── Session hook ───────────────────────────────────────
  const session = useInterviewSession(numQuestions)
  const {
    phase, avatarState, setAvatarState,
    qaHistory, currentQuestion, currentIndex,
    elapsedTime, isPaused,
    startInterview, submitAnswer, resetInterview,
    onSpeakComplete, togglePause, endInterview,
  } = session

  // ─── Speech hooks ───────────────────────────────────────
  const tts = useTextToSpeech()
  const stt = useSpeechToText()

  // ─── Local state ────────────────────────────────────────
  const [isMicOn, setIsMicOn] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [messages, setMessages] = useState([])
  const [totalCandidateWords, setTotalCandidateWords] = useState(0)
  const [totalFillerWords, setTotalFillerWords] = useState(0)
  const [speakingStartTime, setSpeakingStartTime] = useState(null)
  const containerRef = useRef(null)
  const hasStartedRef = useRef(false)

  // ─── Start interview on mount ───────────────────────────
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      startInterview()
    }
  }, [startInterview])

  // ─── Speak the current question when it arrives ─────────
  useEffect(() => {
    if (phase === SESSION_PHASES.ASKING && currentQuestion?.question) {
      // Add HR message to transcript
      setMessages(prev => [
        ...prev,
        {
          role: 'hr',
          text: currentQuestion.question,
          timestamp: Date.now(),
          category: currentQuestion.category,
        }
      ])

      // Speak the question via TTS (unless muted)
      if (!isMuted) {
        tts.speak(currentQuestion.question, persona)
      } else {
        // If muted, immediately transition to listening after a brief pause
        setTimeout(() => onSpeakComplete(), 1500)
      }
    }
  }, [phase, currentQuestion])

  // ─── When TTS finishes, transition avatar to LISTENING ──
  useEffect(() => {
    if (!tts.isSpeaking && avatarState === AVATAR_STATES.SPEAKING && phase === SESSION_PHASES.ASKING) {
      onSpeakComplete()
    }
  }, [tts.isSpeaking, avatarState, phase, onSpeakComplete])

  // ─── Auto-start mic when avatar starts listening ────────
  useEffect(() => {
    if (avatarState === AVATAR_STATES.LISTENING && stt.isSupported && !isMicOn) {
      setIsMicOn(true)
      stt.startListening()
      setSpeakingStartTime(Date.now())
    }
  }, [avatarState])

  // ─── Handle mic toggle ─────────────────────────────────
  const handleToggleMic = useCallback(() => {
    if (avatarState === AVATAR_STATES.SPEAKING || avatarState === AVATAR_STATES.GREETING) {
      return // Don't allow mic during AI speaking
    }
    if (isMicOn) {
      stt.stopListening()
      setIsMicOn(false)
    } else {
      stt.startListening()
      setIsMicOn(true)
      if (!speakingStartTime) setSpeakingStartTime(Date.now())
    }
  }, [isMicOn, stt, avatarState, speakingStartTime])

  // ─── Handle answer submission ──────────────────────────
  const handleSubmitAnswer = useCallback((text) => {
    const answerText = text || stt.transcript || ''
    
    // Stop mic
    if (isMicOn) {
      stt.stopListening()
      setIsMicOn(false)
    }

    // Track metrics
    const words = countWords(answerText)
    const fillers = countFillerWords(answerText)
    setTotalCandidateWords(prev => prev + words)
    setTotalFillerWords(prev => prev + fillers)

    // Add candidate message to transcript
    if (answerText.trim()) {
      setMessages(prev => [
        ...prev,
        {
          role: 'candidate',
          text: answerText,
          timestamp: Date.now(),
        }
      ])
    }

    // Reset STT for next question
    stt.reset()
    setSpeakingStartTime(null)

    // Submit to session (triggers THINKING → next SPEAKING)
    submitAnswer(answerText)
  }, [stt, isMicOn, submitAnswer])

  // ─── Handle text input submission (fallback) ───────────
  const handleSubmitText = useCallback((text) => {
    if (!text.trim()) return
    handleSubmitAnswer(text)
  }, [handleSubmitAnswer])

  // ─── Controls ──────────────────────────────────────────
  const handleToggleCamera = useCallback(() => setIsCameraOn(p => !p), [])
  const handleToggleMute = useCallback(() => {
    setIsMuted(p => {
      if (!p) tts.stop() // Stop current speech when muting
      return !p
    })
  }, [tts])

  const handleRepeatQuestion = useCallback(() => {
    if (currentQuestion?.question && !tts.isSpeaking) {
      setAvatarState(AVATAR_STATES.SPEAKING)
      tts.speak(currentQuestion.question, persona)
    }
  }, [currentQuestion, tts, persona, setAvatarState])

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [])

  const handleEndInterview = useCallback(() => {
    tts.stop()
    stt.stopListening()
    setIsMicOn(false)
    endInterview()
  }, [tts, stt, endInterview])

  // ─── Calculated live metrics ───────────────────────────
  const speakingSpeedWPM = useMemo(() => {
    if (totalCandidateWords < 5 || !elapsedTime) return null
    // Rough estimate: words per minute based on total interview time
    // This is an approximation since not all time is speaking time
    const minutes = elapsedTime / 60
    return minutes > 0 ? totalCandidateWords / minutes : null
  }, [totalCandidateWords, elapsedTime])

  // ─── Render Results Screen ─────────────────────────────
  if (phase === SESSION_PHASES.COMPLETE) {
    return (
      <motion.div
        style={styles.resultsContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <Trophy style={{ width: '56px', height: '56px', color: '#8B5CF6', marginBottom: '16px' }} />
        </motion.div>
        
        <h2 style={styles.resultsTitle}>Interview Complete!</h2>
        <p style={styles.resultsSubtitle}>
          You answered {qaHistory.length} question{qaHistory.length !== 1 ? 's' : ''} in{' '}
          {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
        </p>

        {/* Q&A Summary */}
        <div style={styles.qaList}>
          {qaHistory.map((qa, idx) => (
            <motion.div
              key={idx}
              style={styles.qaCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <div style={styles.qaQuestion}>
                <MessageSquare style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '1px' }} />
                <span style={{ flex: 1 }}>Q{idx + 1}: {qa.question}</span>
                <span style={styles.qaCategory}>{qa.category}</span>
              </div>
              <div style={styles.qaAnswer}>
                {qa.answer || '(No answer recorded)'}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.resultsActions}>
          <motion.button
            style={{
              ...styles.resultBtn,
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8',
            }}
            whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onExit}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Back to Setup
          </motion.button>
          <motion.button
            style={{
              ...styles.resultBtn,
              background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
              color: '#fff',
            }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              resetInterview()
              setMessages([])
              setTotalCandidateWords(0)
              setTotalFillerWords(0)
              hasStartedRef.current = false
            }}
          >
            <RotateCcw style={{ width: '16px', height: '16px' }} />
            New Interview
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // ─── Render Interview Room ─────────────────────────────
  const isAISpeaking = avatarState === AVATAR_STATES.SPEAKING || avatarState === AVATAR_STATES.GREETING

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Top HUD */}
      <InterviewHUD
        persona={persona}
        difficulty={difficulty}
        elapsedTime={elapsedTime}
        currentIndex={currentIndex}
        totalQuestions={numQuestions}
        isActive={phase !== SESSION_PHASES.IDLE && phase !== SESSION_PHASES.COMPLETE}
        onEndInterview={handleEndInterview}
      />

      {/* Main Area: Avatar + Analytics */}
      <div style={styles.mainArea}>
        {/* Avatar Section (70%) */}
        <div style={styles.avatarSection}>
          <HRAvatar
            persona={persona}
            state={avatarState}
            amplitude={tts.amplitude}
            speechText={currentQuestion?.question || ''}
            questionCategory={currentQuestion?.category || ''}
          />

          {/* Floating Webcam PiP */}
          <CandidateWebcam
            enabled={isCameraOn}
            onToggle={handleToggleCamera}
          />
        </div>

        {/* Analytics Section (30%) */}
        <div style={styles.analyticsSection}>
          <InterviewAnalytics
            speakingSpeedWPM={speakingSpeedWPM}
            fillerWordCount={totalFillerWords}
            totalWords={totalCandidateWords}
            currentIndex={currentIndex}
            totalQuestions={numQuestions}
            elapsedTime={elapsedTime}
          />
        </div>
      </div>

      {/* Bottom: Transcript + Controls */}
      <div style={styles.bottomSection}>
        <InterviewTranscript
          messages={messages}
          isAISpeaking={isAISpeaking}
          currentSpeechText={isAISpeaking ? (currentQuestion?.question || '') : ''}
          interimTranscript={stt.interimResult}
          showTextInput={!stt.isSupported || avatarState === AVATAR_STATES.LISTENING}
          onSubmitText={handleSubmitText}
          disabled={isAISpeaking || avatarState === AVATAR_STATES.THINKING}
        />
        
        <InterviewControls
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          isMuted={isMuted}
          isPaused={isPaused}
          isAISpeaking={isAISpeaking}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleMute={handleToggleMute}
          onTogglePause={togglePause}
          onRepeatQuestion={handleRepeatQuestion}
          onToggleFullscreen={handleToggleFullscreen}
          onEndInterview={handleEndInterview}
          onSubmitAnswer={() => handleSubmitAnswer(null)}
          hasTranscript={!!(stt.transcript || '').trim()}
          isListening={avatarState === AVATAR_STATES.LISTENING}
        />
      </div>
    </div>
  )
}

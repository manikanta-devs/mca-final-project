/**
 * useInterviewSession.js
 * 
 * Core interview session hook that manages the interview state machine.
 * 
 * IMPORTANT: This is a PRESENTATION LAYER hook. It does NOT change how
 * questions are generated, how answers are evaluated, how sessions are
 * stored, or how interview history works. It only consumes the existing
 * interview APIs and manages UI state.
 * 
 * Avatar Finite State Machine:
 *   IDLE → GREETING → SPEAKING → LISTENING → THINKING → SPEAKING → ... → ENDING
 * 
 * @module useInterviewSession
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { getNextQuestion } from '../api/videoInterviewApi'
import { useApp } from '../../../context/AppContext'

export const SESSION_PHASES = {
  IDLE: 'idle',
  LOADING_QUESTION: 'loading_question',
  ASKING: 'asking',
  LISTENING: 'listening',
  EVALUATING: 'evaluating',
  COMPLETE: 'complete'
}

/** Avatar states following the defined FSM */
export const AVATAR_STATES = {
  IDLE: 'idle',
  GREETING: 'greeting',
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  THINKING: 'thinking',
  ENDING: 'ending',
}

/**
 * Serialize resumeData from the Zustand store into a text summary
 * for the backend API (which expects `resume_text` string).
 * 
 * @param {Object} resumeData - The resumeData object from the store
 * @returns {string} A plain-text summary of the resume
 */
function serializeResumeData(resumeData) {
  if (!resumeData) return ''
  
  const parts = []
  
  if (resumeData.summary) {
    parts.push(`Summary: ${resumeData.summary}`)
  }
  
  if (resumeData.skills?.all?.length > 0) {
    parts.push(`Skills: ${resumeData.skills.all.join(', ')}`)
  }
  
  if (resumeData.experience?.years) {
    parts.push(`Experience: ${resumeData.experience.years} years`)
  }
  
  if (resumeData.experience?.entries?.length > 0) {
    const entries = resumeData.experience.entries
      .map(e => `${e.title || ''} at ${e.company || ''}: ${e.description || ''}`)
      .join('; ')
    parts.push(`Work History: ${entries}`)
  }

  if (resumeData.education?.length > 0) {
    const edu = resumeData.education
      .map(e => `${e.degree || ''} from ${e.institution || ''}`)
      .join('; ')
    parts.push(`Education: ${edu}`)
  }

  if (resumeData.projects?.length > 0) {
    const proj = resumeData.projects
      .map(p => `${p.name || ''}: ${p.description || ''}`)
      .join('; ')
    parts.push(`Projects: ${proj}`)
  }
  
  // If the resume has raw text, append it
  if (resumeData.raw_text) {
    parts.push(resumeData.raw_text)
  }
  
  return parts.join('\n\n') || JSON.stringify(resumeData)
}

/**
 * Core interview session hook.
 * 
 * @param {number} numQuestions - Total number of questions in the session
 * @returns {Object} Session state and control functions
 */
export function useInterviewSession(numQuestions = 5) {
  const [phase, setPhase] = useState(SESSION_PHASES.IDLE)
  const [avatarState, setAvatarState] = useState(AVATAR_STATES.IDLE)
  const [qaHistory, setQaHistory] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  
  // FIX: Extract resumeData (not resumeText) from the Zustand store
  const { resumeData } = useApp()
  
  // Serialize resume data into text for the API
  const resumeTextRef = useRef('')
  useEffect(() => {
    resumeTextRef.current = serializeResumeData(resumeData)
  }, [resumeData])

  // Session timer (pauses when isPaused is true)
  useEffect(() => {
    let timer = null
    if (phase !== SESSION_PHASES.IDLE && phase !== SESSION_PHASES.COMPLETE && !isPaused) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [phase, isPaused])

  const fetchNextQuestion = useCallback(async (history) => {
    try {
      setPhase(SESSION_PHASES.LOADING_QUESTION)
      setAvatarState(AVATAR_STATES.THINKING)
      
      // Call backend next-question API with serialized resume text + current history
      const qData = await getNextQuestion(resumeTextRef.current, history)
      
      setCurrentQuestion(qData)
      setPhase(SESSION_PHASES.ASKING)
      setAvatarState(AVATAR_STATES.SPEAKING)
    } catch (e) {
      console.error('Failed to retrieve next question, using hardcoded fallback:', e)
      // Fallback: Local questions list
      const fallbackQuestions = [
        { question: "To start off, could you please introduce yourself and tell me a bit about your professional background?", category: "Introduction", difficulty: "Easy" },
        { question: "Describe a complex technical challenge you faced and how you overcame it.", category: "Technical", difficulty: "Medium" },
        { question: "Tell me about a time you had a difference of opinion with a team member. How did you resolve it?", category: "Behavioral", difficulty: "Hard" },
        { question: "Why do you want to join our organization, and what makes you the ideal candidate for this role?", category: "Behavioral", difficulty: "Medium" },
        { question: "What are your career goals for the next three years, and how do you plan to achieve them?", category: "Behavioral", difficulty: "Easy" }
      ]
      
      const qIdx = history.length % fallbackQuestions.length
      setCurrentQuestion(fallbackQuestions[qIdx])
      setPhase(SESSION_PHASES.ASKING)
      setAvatarState(AVATAR_STATES.SPEAKING)
    }
  }, [])

  /** Start a new interview session. Avatar goes: IDLE → GREETING → SPEAKING */
  const startInterview = useCallback(async () => {
    setPhase(SESSION_PHASES.LOADING_QUESTION)
    setAvatarState(AVATAR_STATES.GREETING)
    setQaHistory([])
    setCurrentIndex(0)
    setElapsedTime(0)
    setIsPaused(false)
    setCurrentQuestion(null)

    // Brief greeting pause, then fetch first question
    await new Promise(r => setTimeout(r, 2000))
    await fetchNextQuestion([])
  }, [fetchNextQuestion])

  /** 
   * Called when the TTS finishes speaking the question.
   * Avatar transitions: SPEAKING → LISTENING
   */
  const onSpeakComplete = useCallback(() => {
    if (phase === SESSION_PHASES.ASKING) {
      setAvatarState(AVATAR_STATES.LISTENING)
      setPhase(SESSION_PHASES.LISTENING)
    }
  }, [phase])

  /** 
   * Submit the candidate's answer.
   * Avatar transitions: LISTENING → THINKING → SPEAKING (next) or ENDING
   */
  const submitAnswer = useCallback(async (answerText) => {
    setPhase(SESSION_PHASES.EVALUATING)
    setAvatarState(AVATAR_STATES.THINKING)
    
    // Add Q&A pair to history
    const updatedHistory = [
      ...qaHistory,
      {
        question: currentQuestion.question,
        answer: answerText || '(No verbal answer recorded)',
        category: currentQuestion.category || 'General',
        difficulty: currentQuestion.difficulty || 'Medium'
      }
    ]
    setQaHistory(updatedHistory)

    const nextIndex = currentIndex + 1
    setCurrentIndex(nextIndex)

    if (nextIndex >= numQuestions) {
      setPhase(SESSION_PHASES.COMPLETE)
      setAvatarState(AVATAR_STATES.ENDING)
    } else {
      await fetchNextQuestion(updatedHistory)
    }
  }, [qaHistory, currentQuestion, currentIndex, numQuestions, fetchNextQuestion])

  /** Reset the interview to initial state */
  const resetInterview = useCallback(() => {
    setPhase(SESSION_PHASES.IDLE)
    setAvatarState(AVATAR_STATES.IDLE)
    setQaHistory([])
    setCurrentQuestion(null)
    setCurrentIndex(0)
    setElapsedTime(0)
    setIsPaused(false)
  }, [])

  /** Toggle pause state */
  const togglePause = useCallback(() => {
    setIsPaused(p => !p)
  }, [])

  /** End interview early */
  const endInterview = useCallback(() => {
    setPhase(SESSION_PHASES.COMPLETE)
    setAvatarState(AVATAR_STATES.ENDING)
  }, [])

  return {
    // Session state
    phase,
    setPhase,
    avatarState,
    setAvatarState,
    qaHistory,
    currentQuestion,
    currentIndex,
    numQuestions,
    elapsedTime,
    isPaused,
    
    // Actions
    startInterview,
    submitAnswer,
    resetInterview,
    onSpeakComplete,
    togglePause,
    endInterview,
  }
}

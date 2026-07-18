/**
 * useBackgroundAnalysis.js
 *
 * Fire-and-forget Gemini analysis that runs during every HR processing pause.
 * While hr_taking_notes + hr_looking_at_screen play (8-12s window),
 * this hook sends the candidate's transcript to the backend, gets the next
 * adaptive question back, and queues it — ready before the next stage starts.
 */
import { useRef, useCallback } from 'react'

export default function useBackgroundAnalysis({ sessionId, onQuestionReady, onThinkingChange, onAnalysisReady }) {
  const isAnalyzingRef = useRef(false)
  const abortControllerRef = useRef(null)

  const analyzeAndPrefetch = useCallback(async ({
    stage,
    transcript,
    questionText = '',
    conversationHistory = [],
    voiceMetrics = null,
    emotionSnapshot = null,
  }) => {
    if (isAnalyzingRef.current) return
    if (!sessionId || !transcript?.trim()) return

    isAnalyzingRef.current = true
    onThinkingChange?.(true)

    // Cancel any previous in-flight request
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/interview/analyze-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: sessionId,
          stage,
          transcript,
          question_text: questionText,
          conversation_history: conversationHistory,
          voice_metrics: voiceMetrics,
          emotion_metrics: emotionSnapshot,
        }),
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const data = await response.json()

      if (data.success && data.background_interviewer) {
        onAnalysisReady?.(data.background_interviewer)
      }

      if (data.success && data.next_question?.text) {
        onQuestionReady?.(data.next_question)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      console.warn('[useBackgroundAnalysis] Prefetch failed — interview will use fallback questions:', err.message)
    } finally {
      isAnalyzingRef.current = false
      onThinkingChange?.(false)
    }
  }, [sessionId, onQuestionReady, onThinkingChange, onAnalysisReady])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    isAnalyzingRef.current = false
    onThinkingChange?.(false)
  }, [onThinkingChange])

  return { analyzeAndPrefetch, cancel }
}

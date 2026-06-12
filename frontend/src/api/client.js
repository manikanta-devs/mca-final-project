import axios from 'axios'
import { parseApiError } from '../utils/apiError'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s for AI calls (Gemini can be slow on first call)
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor with timing ────────────────────────
client.interceptors.request.use(
  config => {
    config.metadata = { startTime: Date.now() }
    console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  error => Promise.reject(error)
)

// ─── Response interceptor with timing + retry + error handling ──
client.interceptors.response.use(
  response => {
    const elapsed = Date.now() - (response.config.metadata?.startTime || Date.now())
    if (elapsed > 5000) {
      console.info(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} — ${elapsed}ms (slow)`)
    }
    return response
  },
  async error => {
    const config = error.config
    const apiError = parseApiError(error)
    const msg = apiError.getReadableMessage()

    // Retry logic: retry on network errors and 5xx (not on cancellation or 4xx)
    if (
      !config._retried &&
      !error.response?.status?.toString().startsWith('4') &&
      error.code !== 'ERR_CANCELED'
    ) {
      config._retried = true
      const retryDelayMs = 1500
      console.warn(`[API] Retrying ${config.method?.toUpperCase()} ${config.url} after ${retryDelayMs}ms (${msg})`)
      await new Promise(r => setTimeout(r, retryDelayMs))
      return client(config)
    }

    // Log error if not canceled
    if (error.code !== 'ERR_CANCELED') {
      console.error('[API] Error:', {
        status: error.response?.status,
        message: msg,
        url: config.url,
        method: config.method?.toUpperCase()
      })
    }

    // Return API error with parsed information
    return Promise.reject(apiError)
  }
)

// ─── Health ─────────────────────────────────────────────────
export const checkHealth = () => client.get('/health')

// ─── Resume ─────────────────────────────────────────────────
export const uploadResume = (formData) =>
  client.post('/api/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const analyzeResumeText = (text, jobDescription = '') =>
  client.post('/api/resume/analyze-text', {
    text,
    job_description: jobDescription,
  })

export const matchResumeToJob = (resumeData, jobDescription) =>
  client.post('/api/resume/match-job', {
    resume_data: resumeData,
    job_description: jobDescription,
  })

export const getRoles = () => client.get('/api/resume/roles')

// ─── Interview ──────────────────────────────────────────────
export const generateQuestions = (data) =>
  client.post('/api/interview/generate-questions', data)

export const startInterview = (data) =>
  client.post('/api/interview/start', data)

export const submitAnswer = (data) =>
  client.post('/api/interview/answer', data)

export const completeInterview = (sessionId) =>
  client.post('/api/interview/complete', { session_id: sessionId })

export const getSessions = () => client.get('/api/interview/sessions')

export const getSession = (id) => client.get(`/api/interview/session/${id}`)

export const deleteSession = (id) => client.delete(`/api/interview/session/${id}`)

export const submitFollowUp = (data) =>
  client.post('/api/interview/follow-up', data)

// ─── Analytics ──────────────────────────────────────────────
export const getAnalyticsSummary = () => client.get('/api/analytics/summary')

export const getAnalyticsSessions = (limit = 20) =>
  client.get(`/api/analytics/sessions?limit=${limit}`)

export const getPerformanceTrend = () => client.get('/api/analytics/performance-trend')

export const getWeakAreas = () => client.get('/api/analytics/weak-areas')

export const getSkillBreakdown = () => client.get('/api/analytics/skill-breakdown')

export const getStudyPlan = () => client.get('/api/analytics/study-plan')

export const getCommunicationCoach = () => client.get('/api/analytics/communication-coach')

export const clearAnalytics = () => client.delete('/api/analytics/clear')

// ─── Quiz ──────────────────────────────────────────────────
export const getQuizTopics = () => client.get('/api/quiz/topics')

export const startQuiz = (data) => client.post('/api/quiz/start', data)

export const submitQuizAnswer = (data) => client.post('/api/quiz/answer', data)

export const completeQuiz = (sessionId) => client.post('/api/quiz/complete', { session_id: sessionId })

export const getQuizSessions = () => client.get('/api/quiz/sessions')

export const getQuizSession = (id) => client.get(`/api/quiz/session/${id}`)

export default client

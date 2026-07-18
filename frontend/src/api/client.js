import axios from 'axios'
import { parseApiError } from '../utils/apiError'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s for AI calls (Gemini can be slow on first call)
  headers: { 'Content-Type': 'application/json' },
})

const apiCache = new Map()

const cachedGet = async (url, ttlMs = 15000) => {
  const cached = apiCache.get(url)
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.promise
  }
  const promise = client.get(url)
  apiCache.set(url, { promise, timestamp: Date.now() })
  promise.catch(() => apiCache.delete(url))
  return promise
}

export const clearApiCache = () => {
  apiCache.clear()
}

// ─── Request interceptor with timing ────────────────────────
client.interceptors.request.use(
  config => {
    config.metadata = { startTime: Date.now() }
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (import.meta.env.DEV) console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  error => Promise.reject(error)
)

// ─── Response interceptor with timing + retry + error handling ──
client.interceptors.response.use(
  response => {
    const method = response.config?.method?.toUpperCase()
    if (method && ['POST', 'PUT', 'DELETE'].includes(method)) {
      apiCache.clear()
    }
    const elapsed = Date.now() - (response.config.metadata?.startTime || Date.now())
    if (elapsed > 5000) {
      if (import.meta.env.DEV) console.info(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${elapsed}ms (slow)`)
    }
    return response
  },
  async error => {
    const config = error.config
    const apiError = parseApiError(error)
    const msg = apiError.getReadableMessage()

    // Catch 401 Unauthorized errors and force user logout/redirect
    if (error.response?.status === 401) {
      if (import.meta.env.DEV) console.warn('[API] Unauthorized (401) response received. Clearing credentials.')
      const hasToken = !!localStorage.getItem('token')
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      if (hasToken && window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }

    // Retry logic: retry on network errors and 5xx (not on cancellation or 4xx)
    if (
      !config._retried &&
      !error.response?.status?.toString().startsWith('4') &&
      error.code !== 'ERR_CANCELED'
    ) {
      config._retried = true
      const retryDelayMs = 1500
      if (import.meta.env.DEV) console.warn(`[API] Retrying ${config.method?.toUpperCase()} ${config.url} after ${retryDelayMs}ms (${msg})`)
      await new Promise(r => setTimeout(r, retryDelayMs))
      return client(config)
    }

    // Log error if not canceled
    if (error.code !== 'ERR_CANCELED') {
      if (import.meta.env.DEV) console.error('[API] Error:', {
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

export const submitOnboardingResponse = (data) =>
  client.post('/api/interview/onboarding-response', data)

export const completeInterview = (sessionId, gazeStats = null) =>
  client.post('/api/interview/complete', { session_id: sessionId, gaze_stats: gazeStats })

export const getSessions = () => client.get('/api/interview/sessions')

export const getSession = (id) => client.get(`/api/interview/session/${id}`)

export const deleteSession = (id) => client.delete(`/api/interview/session/${id}`)

export const submitFollowUp = (data) =>
  client.post('/api/interview/follow-up', data)

export const getInterviewCoaching = (data) =>
  client.post('/api/interview/coach', data)

export const injectMockSession = (type) =>
  client.post('/api/developer/mock-session', { type })

// ─── Analytics ──────────────────────────────────────────────
export const getAnalyticsSummary = () => cachedGet('/api/analytics/summary')

export const getDashboardInsights = () => cachedGet('/api/analytics/dashboard-insights')

export const getAnalyticsSessions = (limit = 20) =>
  client.get(`/api/analytics/sessions?limit=${limit}`)

export const getPerformanceTrend = () => cachedGet('/api/analytics/performance-trend')

export const getWeakAreas = () => cachedGet('/api/analytics/weak-areas')

export const getSkillBreakdown = () => cachedGet('/api/analytics/skill-breakdown')

export const getStudyPlan = () => cachedGet('/api/analytics/study-plan')

export const getCommunicationCoach = () => cachedGet('/api/analytics/communication-coach')
export const askCareerMentor = (question) => client.post('/api/coach/ask', { question })
export const generateStudyRoadmap = (customTopic) => client.post('/api/coach/generate-roadmap', { custom_topic: customTopic })
export const critiqueSpeech = (data) => client.post('/api/coach/critique-speech', data)

export const clearAnalytics = () => client.delete('/api/analytics/clear')

// ─── Quiz ──────────────────────────────────────────────────
export const getQuizTopics = () => client.get('/api/quiz/topics')

export const startQuiz = (data) => client.post('/api/quiz/start', data)

export const submitQuizAnswer = (data) => client.post('/api/quiz/answer', data)

export const completeQuiz = (sessionId) => client.post('/api/quiz/complete', { session_id: sessionId })

export const getQuizSessions = () => client.get('/api/quiz/sessions')

export const getQuizSession = (id) => client.get(`/api/quiz/session/${id}`)

// ─── Auth ───────────────────────────────────────────────────
export const loginUser = (username, password) =>
  client.post('/api/auth/login', { username, password })

export const registerUser = (username, password) =>
  client.post('/api/auth/register', { username, password })

export default client

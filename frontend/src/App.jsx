import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import { FullPageLoader } from './components/LoadingSpinner'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'))
const CommunicationCoachPage = lazy(() => import('./pages/CommunicationCoachPage'))
const ResumePage = lazy(() => import('./pages/ResumePage'))
const InterviewPage = lazy(() => import('./pages/InterviewPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const VideoInterviewPage = lazy(() => import('./features/video-interview/VideoInterviewPage'))
import ProtectedRoute from './components/ProtectedRoute'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardOverview />} />
            <Route path="coach" element={<CommunicationCoachPage />} />
            <Route path="resume" element={<ResumePage />} />
            <Route path="interview" element={<InterviewPage />} />
            <Route path="video-interview" element={<VideoInterviewPage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="results/:sessionId" element={<ResultsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '14px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Suspense fallback={<FullPageLoader text="Loading TalentForge AI..." />}>
          <AnimatedRoutes />
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  )
}

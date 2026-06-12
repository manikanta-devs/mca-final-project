import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import DashboardOverview from './pages/DashboardOverview'
import CommunicationCoachPage from './pages/CommunicationCoachPage'
import ResumePage from './pages/ResumePage'
import InterviewPage from './pages/InterviewPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ResultsPage from './pages/ResultsPage'
import QuizPage from './pages/QuizPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardOverview />} />
          <Route path="coach" element={<CommunicationCoachPage />} />
          <Route path="resume" element={<ResumePage />} />
          <Route path="interview" element={<InterviewPage />} />
          <Route path="quiz" element={<QuizPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="results/:sessionId" element={<ResultsPage />} />
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
        <AnimatedRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}

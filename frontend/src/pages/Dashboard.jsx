import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const PAGE_META = {
  '/dashboard':           { title: 'Dashboard Overview', subtitle: 'Live performance snapshot from real data' },
  '/dashboard/coach':     { title: 'Communication Coach', subtitle: 'Train clarity, confidence, and interview speaking skills' },
  '/dashboard/resume':    { title: 'Resume Analysis',     subtitle: 'Upload and analyze your resume' },
  '/dashboard/interview': { title: 'Mock Interview',   subtitle: 'Practice with generated questions' },
  '/dashboard/quiz':      { title: 'Quiz Practice',       subtitle: 'Strengthen weak areas with fast topic-based drills' },
  '/dashboard/analytics': { title: 'Performance Analytics', subtitle: 'Track your progress and improvement' },
}

const pageVariants = {
  initial:  { opacity: 0, y: 12 },
  in:       { opacity: 1, y: 0 },
  out:      { opacity: 0, y: -8 },
}

const pageTransition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.3,
}

export default function Dashboard() {
  const location = useLocation()
  const meta = Object.entries(PAGE_META).sort((a, b) => b[0].length - a[0].length).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || { title: 'Dashboard', subtitle: '' }

  React.useEffect(() => {
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTop = 0
    }
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#070b13] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <motion.div
            key={location.pathname}
            className="max-w-7xl mx-auto"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

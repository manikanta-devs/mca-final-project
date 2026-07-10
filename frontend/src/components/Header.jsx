import React from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Header({ title = '', subtitle = '' }) {
  const { selectedRole, difficulty } = useApp()
  const location = useLocation()
  const isInterviewPage = location.pathname.startsWith('/dashboard/interview')

  return (
    <motion.header
      className="relative flex items-center px-6 pt-7 pb-5 shrink-0 mb-1 overflow-hidden"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Subtle gradient bg */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/20 backdrop-blur-md border-b border-slate-100 dark:border-white/5" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(99,102,241,0.02),transparent_42%,rgba(217,70,239,0.02))] dark:bg-[linear-gradient(90deg,rgba(139,92,246,0.03),transparent_42%,rgba(217,70,239,0.03))]" />

      <div className="relative flex flex-col justify-center w-full max-w-7xl mx-auto items-center z-10">
        {title && (
          <h2 className="font-bold text-gray-900 dark:text-white text-lg leading-tight text-center">{title}</h2>
        )}
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5">{subtitle}</p>
        )}
        {isInterviewPage && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 justify-center">
            <span className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 capitalize text-primary-700 dark:text-primary-300 font-medium">
              {selectedRole?.replace('_', ' ') || 'software engineer'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 capitalize">
              {difficulty} mode
            </span>
          </div>
        )}
      </div>
    </motion.header>
  )
}

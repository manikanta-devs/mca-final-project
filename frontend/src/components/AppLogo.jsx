import React from 'react'
import { motion } from 'framer-motion'

export default function AppLogo({ size = 40, showText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        className="relative overflow-hidden rounded-[1.15rem] shadow-2xl shadow-cyan-500/20 ring-1 ring-white/10"
        style={{ width: size, height: size }}
        aria-hidden="true"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <div className="absolute inset-0 bg-[#07111f]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(45,212,191,0.22),transparent_40%),linear-gradient(315deg,rgba(251,191,36,0.2),transparent_42%)]" />
        <div className="absolute inset-x-2 top-2 h-px bg-white/30" />
        <svg viewBox="0 0 64 64" width={size} height={size} className="absolute inset-0">
          <rect x="0" y="0" width="64" height="64" rx="18" fill="none" />
          <path
            d="M15 47L30.5 18.5C31.2 17.2 33 17.2 33.7 18.5L49 47"
            fill="none"
            stroke="url(#brandA)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M23 44L32 27L41 44"
            fill="none"
            stroke="#07111f"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M26 38H38"
            fill="none"
            stroke="#07111f"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <circle cx="45" cy="21" r="3" fill="#2dd4bf" />
          <circle cx="50.5" cy="31" r="2.2" fill="#fbbf24" />
          <circle cx="39" cy="45" r="2.4" fill="#67e8f9" />
          <defs>
            <linearGradient id="brandA" x1="14" y1="18" x2="50" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="52%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      {showText && (
        <div className="min-w-0">
          <div className="font-black leading-tight text-sm brand-text">
            AstraPrep AI
          </div>
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 leading-tight">
            Interview intelligence suite
          </div>
        </div>
      )}
    </div>
  )
}

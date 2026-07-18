import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Video, Clock, X } from 'lucide-react'

/**
 * Persona metadata for the interviewer chip display.
 * Each persona has a name, title, and photo path.
 */
const PERSONAS = {
  sarah: {
    name: 'Sarah Chen',
    title: 'Senior HR Director',
    photo: '/interviewers/sarah_chen.png',
  },
  marcus: {
    name: 'Marcus Rodriguez',
    title: 'Technical Lead',
    photo: '/interviewers/marcus_rodriguez.png',
  },
}

/**
 * Difficulty level badge color mapping.
 * Returns inline style properties for each difficulty level.
 * @param {string} difficulty
 * @returns {{ bg: string, text: string, border: string, dot: string }}
 */
const getDifficultyStyle = (difficulty) => {
  switch (difficulty) {
    case 'Easy':
      return {
        bg: 'rgba(34, 197, 94, 0.1)',
        text: '#4ADE80',
        border: 'rgba(34, 197, 94, 0.25)',
        dot: '#22C55E',
      }
    case 'Hard':
      return {
        bg: 'rgba(239, 68, 68, 0.1)',
        text: '#FCA5A5',
        border: 'rgba(239, 68, 68, 0.25)',
        dot: '#EF4444',
      }
    case 'Medium':
    default:
      return {
        bg: 'rgba(245, 158, 11, 0.1)',
        text: '#FCD34D',
        border: 'rgba(245, 158, 11, 0.25)',
        dot: '#F59E0B',
      }
  }
}

/**
 * InterviewHUD — Top header bar inside the interview room.
 *
 * Displays the interviewer persona chip, live status, interview type badge,
 * difficulty indicator, elapsed timer, question progress counter, and an
 * end-interview button. Renders as a 56px glassmorphic horizontal bar.
 *
 * @param {Object}   props
 * @param {string}   props.persona        - 'sarah' or 'marcus'
 * @param {string}   props.difficulty      - 'Easy', 'Medium', or 'Hard'
 * @param {number}   props.elapsedTime     - Elapsed seconds
 * @param {number}   props.currentIndex    - Current question index (0-based)
 * @param {number}   props.totalQuestions  - Total number of questions
 * @param {boolean}  props.isActive        - Interview in progress
 * @param {Function} props.onEndInterview  - End interview callback
 */
export default function InterviewHUD({
  persona = 'sarah',
  difficulty = 'Medium',
  elapsedTime = 0,
  currentIndex = 0,
  totalQuestions = 5,
  isActive = true,
  onEndInterview = () => {},
}) {
  // Resolve persona data with fallback
  const personaData = PERSONAS[persona] || PERSONAS.sarah

  // Format elapsed time to mm:ss
  const formattedTime = useMemo(() => {
    const mins = Math.floor(elapsedTime / 60)
      .toString()
      .padStart(2, '0')
    const secs = (elapsedTime % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }, [elapsedTime])

  // Difficulty badge style
  const diffStyle = getDifficultyStyle(difficulty)

  // Entrance animation
  const hudVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 28, delay: 0.1 },
    },
  }

  return (
    <motion.div
      variants={hudVariants}
      initial="hidden"
      animate="visible"
      style={{
        width: '100%',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* ── LEFT: Interviewer chip + live status ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Persona avatar chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Circular photo thumbnail */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              flexShrink: 0,
            }}
          >
            <img
              src={personaData.photo}
              alt={personaData.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // Graceful fallback: hide broken image, show initials instead
                e.target.style.display = 'none'
              }}
            />
          </div>

          {/* Name + title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#e2e8f0',
                lineHeight: 1.2,
              }}
            >
              {personaData.name}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: 1.2,
              }}
            >
              {personaData.title}
            </span>
          </div>
        </div>

        {/* Separator dot */}
        <div
          style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            flexShrink: 0,
          }}
        />

        {/* Live status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isActive ? (
            <>
              <motion.span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#4ADE80',
                  letterSpacing: '0.02em',
                }}
              >
                Interview in Progress
              </span>
            </>
          ) : (
            <>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#64748b',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#64748b',
                  letterSpacing: '0.02em',
                }}
              >
                Session Idle
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── CENTER: Interview type badge + Difficulty badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Interview type pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >
          <Video style={{ width: 12, height: 12, color: '#A78BFA' }} />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#A78BFA',
              letterSpacing: '0.02em',
            }}
          >
            Video Interview
          </span>
        </div>

        {/* Difficulty badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: diffStyle.bg,
            border: `1px solid ${diffStyle.border}`,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: diffStyle.dot,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: diffStyle.text,
              letterSpacing: '0.02em',
            }}
          >
            {difficulty}
          </span>
        </div>
      </div>

      {/* ── RIGHT: Timer + Question counter + End button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock style={{ width: 14, height: 14, color: '#64748b' }} />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#e2e8f0',
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
              letterSpacing: '0.06em',
              minWidth: '48px',
            }}
          >
            {formattedTime}
          </span>
        </div>

        {/* Question counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748b',
            }}
          >
            Q:
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#e2e8f0',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            }}
          >
            {currentIndex + 1}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            /
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#94a3b8',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            }}
          >
            {totalQuestions}
          </span>
        </div>

        {/* End Interview button */}
        <motion.button
          onClick={onEndInterview}
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3))',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <X style={{ width: 14, height: 14, color: '#FCA5A5' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#FCA5A5',
              letterSpacing: '0.02em',
            }}
          >
            End Interview
          </span>
        </motion.button>
      </div>
    </motion.div>
  )
}

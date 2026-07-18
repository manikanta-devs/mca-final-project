/**
 * @file HRAvatar.jsx
 * @description Modular HR Avatar component for the TalentForge AI Interview System.
 *
 * Renders an interviewer avatar with state-driven visual overlays. The component
 * exposes a clean, backend-agnostic prop interface — today it renders professional
 * photos with framer-motion overlays, but the same contract supports swapping in
 * VRM, Live2D, HeyGen, or any future avatar backend without touching consumers.
 *
 * ## Finite State Machine
 * | State      | Visual Description                                           |
 * |------------|--------------------------------------------------------------|
 * | idle       | Photo with subtle ambient glow pulse                         |
 * | greeting   | Welcome overlay, warm radial glow                            |
 * | speaking   | Typing speech bubble, equalizer bars synced to amplitude     |
 * | listening  | Green glow ring, microphone indicator badge, scale pulse     |
 * | thinking   | Amber glow, "Analyzing Response…" shimmer overlay            |
 * | ending     | Fade-out, "Interview Complete" overlay                       |
 *
 * @example
 * <HRAvatar
 *   persona="sarah"
 *   state="speaking"
 *   amplitude={0.65}
 *   speechText="Tell me about a time you led a cross-functional team."
 *   questionCategory="Behavioral"
 * />
 */

import React, { useMemo, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Brain, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react'

// ─── Persona Registry ──────────────────────────────────────────────────────────
const PERSONAS = {
  sarah: {
    name: 'Sarah Chen',
    title: 'Senior HR Director',
    company: 'TalentForge AI',
    photo: '/interviewers/sarah_chen.png',
    focus: 'Cultural alignment, behavioral scenarios, leadership',
  },
  marcus: {
    name: 'Marcus Rodriguez',
    title: 'Technical Lead',
    company: 'TalentForge AI',
    photo: '/interviewers/marcus_rodriguez.png',
    focus: 'Technical workflows, system design, debugging',
  },
}

// ─── State-specific glow colour mappings ────────────────────────────────────────
const STATE_GLOW = {
  idle: { color: '#8B5CF6', shadow: 'rgba(139,92,246,0.25)' },
  greeting: { color: '#F59E0B', shadow: 'rgba(245,158,11,0.30)' },
  speaking: { color: '#8B5CF6', shadow: 'rgba(139,92,246,0.35)' },
  listening: { color: '#10B981', shadow: 'rgba(16,185,129,0.35)' },
  thinking: { color: '#F59E0B', shadow: 'rgba(245,158,11,0.30)' },
  ending: { color: '#64748B', shadow: 'rgba(100,116,139,0.15)' },
}

// ─── State badge label + icon config ────────────────────────────────────────────
const STATE_BADGES = {
  idle: { label: 'Ready', Icon: Sparkles, bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)', text: '#A78BFA' },
  greeting: { label: 'Greeting', Icon: Sparkles, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#FBBF24' },
  speaking: { label: 'Speaking', Icon: MessageSquare, bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)', text: '#A78BFA' },
  listening: { label: 'Listening', Icon: Mic, bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: '#34D399' },
  thinking: { label: 'Analyzing', Icon: Brain, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#FBBF24' },
  ending: { label: 'Complete', Icon: CheckCircle2, bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', text: '#94A3B8' },
}

// ─── Typing animation hook ──────────────────────────────────────────────────────
/**
 * Simulates a typing effect for speech text. Characters are revealed progressively
 * at a natural reading pace that adapts to punctuation pauses.
 */
function useTypingEffect(text, isActive) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => {
    // Reset when text changes
    setDisplayed('')
    indexRef.current = 0

    if (!isActive || !text) return

    const tick = () => {
      if (indexRef.current < text.length) {
        const char = text[indexRef.current]
        indexRef.current += 1
        setDisplayed(text.slice(0, indexRef.current))

        // Adaptive delay: pause longer at punctuation for natural rhythm
        const delay = /[.,;:!?]/.test(char) ? 80 : 28
        timerRef.current = setTimeout(tick, delay)
      }
    }

    timerRef.current = setTimeout(tick, 120) // initial delay

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, isActive])

  return displayed
}

// ═════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} props
 * @param {'sarah'|'marcus'} props.persona — Which interviewer to render
 * @param {'idle'|'greeting'|'speaking'|'listening'|'thinking'|'ending'} props.state — Current FSM state
 * @param {number} props.amplitude — Speech amplitude 0.0–1.0 (from TTS)
 * @param {string} props.speechText — Text currently being spoken (for speech bubble)
 * @param {string} props.questionCategory — e.g. "Technical", "Behavioral"
 */
export default function HRAvatar({
  persona = 'sarah',
  state = 'idle',
  amplitude = 0,
  speechText = '',
  questionCategory = '',
}) {
  const personaData = PERSONAS[persona] || PERSONAS.sarah
  const glow = STATE_GLOW[state] || STATE_GLOW.idle
  const badge = STATE_BADGES[state] || STATE_BADGES.idle

  // Typing animation — only active when speaking
  const typedText = useTypingEffect(speechText, state === 'speaking')

  // Equalizer bar seed values — memoised so they stay consistent across renders
  const eqBarSeeds = useMemo(
    () => Array.from({ length: 7 }, () => 0.3 + Math.random() * 0.7),
    []
  )

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,1) 60%, rgba(10,15,30,1) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {/* ── Background ambient gradient ── */}
      <motion.div
        animate={{
          opacity: state === 'ending' ? 0.15 : 0.45,
          scale: state === 'speaking' ? 1.15 : 1,
        }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, ${glow.shadow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Status badge pill (top-left) ── */}
      <motion.div
        key={state}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35 }}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 20,
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <badge.Icon style={{ width: 12, height: 12, color: badge.text }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: badge.text,
          }}
        >
          {badge.label}
        </span>
        {/* Live dot for active states */}
        {(state === 'speaking' || state === 'listening') && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: badge.text,
            }}
          />
        )}
      </motion.div>

      {/* ── Category pill (top-right) ── */}
      {questionCategory && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 30,
            padding: '5px 12px',
            borderRadius: 20,
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            fontSize: 9,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
          }}
        >
          {questionCategory}
        </div>
      )}

      {/* ── Outer glow ring ── */}
      <motion.div
        animate={{
          boxShadow: state === 'idle'
            ? `0 0 40px 8px ${glow.shadow}, inset 0 0 30px 4px ${glow.shadow}`
            : state === 'speaking'
            ? `0 0 60px 15px ${glow.shadow}, inset 0 0 40px 8px ${glow.shadow}`
            : state === 'listening'
            ? `0 0 50px 12px ${glow.shadow}, inset 0 0 35px 6px ${glow.shadow}`
            : `0 0 35px 6px ${glow.shadow}`,
          scale: state === 'listening' ? [1, 1.03, 1] : 1,
        }}
        transition={{
          duration: state === 'listening' ? 1.8 : 1.2,
          repeat: state === 'listening' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          position: 'relative',
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: `2px solid ${glow.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* ── Inner glow pulse ring (speaking only) ── */}
        {state === 'speaking' && (
          <motion.div
            animate={{
              scale: [1, 1.12 + amplitude * 0.15, 1],
              opacity: [0.5, 0.15, 0.5],
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -12,
              borderRadius: '50%',
              border: `1.5px solid ${glow.color}`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ── Avatar photo ── */}
        <motion.div
          animate={{
            opacity: state === 'ending' ? 0.3 : 1,
            scale: state === 'ending' ? 0.92 : 1,
          }}
          transition={{ duration: 0.8 }}
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(255,255,255,0.1)',
            position: 'relative',
          }}
        >
          <img
            src={personaData.photo}
            alt={personaData.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: state === 'ending' ? 'grayscale(0.6) brightness(0.6)' : 'none',
              transition: 'filter 0.6s ease',
            }}
            draggable={false}
          />

          {/* ── Thinking shimmer overlay ── */}
          <AnimatePresence>
            {state === 'thinking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  borderRadius: '50%',
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.18) 50%, transparent 100%)',
                  }}
                />
                {/* Thinking label */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15,23,42,0.55)',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Brain style={{ width: 28, height: 28, color: '#FBBF24' }} />
                  </motion.div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#FBBF24',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Analyzing Response…
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Ending overlay ── */}
          <AnimatePresence>
            {state === 'ending' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(15,23,42,0.7)',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <CheckCircle2 style={{ width: 32, height: 32, color: '#34D399' }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Interview Complete
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ── Listening microphone badge ── */}
      <AnimatePresence>
        {state === 'listening' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 10 }}
            transition={{ duration: 0.35, ease: 'backOut' }}
            style={{
              position: 'absolute',
              bottom: 'calc(50% - 140px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              🎤
            </motion.span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#34D399',
              }}
            >
              Listening…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Greeting welcome overlay ── */}
      <AnimatePresence>
        {state === 'greeting' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 60,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              padding: '12px 24px',
              borderRadius: 16,
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(245,158,11,0.2)',
              backdropFilter: 'blur(12px)',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#FBBF24', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ✨ Welcome to TalentForge
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>
              Your interview is about to begin
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Interviewer name + title badge (bottom-left) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 14,
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `1.5px solid ${glow.color}`,
            flexShrink: 0,
          }}
        >
          <img
            src={personaData.photo}
            alt={personaData.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 }}>
            {personaData.name}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {personaData.title} · {personaData.company}
          </div>
        </div>
      </div>

      {/* ── Speech bubble (speaking state) ── */}
      <AnimatePresence>
        {state === 'speaking' && speechText && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 60,
              left: 24,
              right: 24,
              zIndex: 25,
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(139,92,246,0.2)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {/* Speech text with typing cursor */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e2e8f0',
                lineHeight: 1.6,
                minHeight: 20,
                maxHeight: 80,
                overflow: 'hidden',
              }}
            >
              {typedText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: 14,
                  backgroundColor: '#8B5CF6',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Equalizer bars (speaking state, synced to amplitude) ── */}
      <AnimatePresence>
        {state === 'speaking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              bottom: 42,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 3,
              height: 30,
            }}
          >
            {eqBarSeeds.map((seed, i) => {
              // Each bar height is driven by amplitude * a per-bar seed for organic feel
              const barHeight = 4 + amplitude * seed * 26
              return (
                <motion.div
                  key={i}
                  animate={{ height: barHeight }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  style={{
                    width: 4,
                    borderRadius: 2,
                    backgroundColor: '#8B5CF6',
                    opacity: 0.6 + amplitude * 0.4,
                    minHeight: 4,
                  }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Idle ambient pulse (very subtle) ── */}
      {state === 'idle' && (
        <motion.div
          animate={{
            opacity: [0.12, 0.25, 0.12],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: '1px solid rgba(139,92,246,0.15)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}
    </div>
  )
}

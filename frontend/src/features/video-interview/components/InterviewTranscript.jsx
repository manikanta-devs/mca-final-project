import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, User, Bot } from 'lucide-react'

/**
 * InterviewTranscript — Live conversation transcript with chat bubbles.
 *
 * Renders a scrollable message feed at the bottom of the interview room,
 * showing HR (left-aligned, purple border) and candidate (right-aligned,
 * blue border) messages with avatar thumbnails, timestamps, typing
 * indicators, interim speech-to-text previews, and a text input fallback.
 *
 * @param {Object}   props
 * @param {Array}    props.messages          - Array of { role: 'hr'|'candidate', text: string, timestamp: number }
 * @param {boolean}  props.isAISpeaking      - Show typing indicator for HR when true
 * @param {string}   props.currentSpeechText - Current text being spoken by HR (live display)
 * @param {string}   props.interimTranscript - Interim speech-to-text result from candidate
 * @param {boolean}  props.showTextInput     - Show the text input fallback
 * @param {Function} props.onSubmitText      - Callback when user submits text answer
 * @param {boolean}  props.disabled          - Disable input during AI speaking
 */
export default function InterviewTranscript({
  messages = [],
  isAISpeaking = false,
  currentSpeechText = '',
  interimTranscript = '',
  showTextInput = true,
  onSubmitText = () => {},
  disabled = false,
}) {
  const scrollRef = useRef(null)
  const [inputText, setInputText] = useState('')

  // ── Auto-scroll to bottom on new messages / typing / interim changes ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isAISpeaking, interimTranscript, currentSpeechText])

  /**
   * Format a Unix-ms timestamp to HH:MM string.
   * @param {number} ts - timestamp in milliseconds
   * @returns {string} formatted time
   */
  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  /**
   * Handle text input submission via button or Enter key.
   */
  const handleSubmit = () => {
    const trimmed = inputText.trim()
    if (!trimmed || disabled) return
    onSubmitText(trimmed)
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── Animation variants ──
  const messageVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 340, damping: 28 },
    },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  }

  // Check if the transcript has any content at all
  const hasContent = messages.length > 0 || isAISpeaking || interimTranscript

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '180px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* ── Scrollable message feed ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent',
        }}
      >
        {/* Empty state */}
        {!hasContent && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px 0',
              opacity: 0.45,
            }}
          >
            <MessageSquare style={{ width: 22, height: 22, color: '#94a3b8' }} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.02em',
              }}
            >
              Interview transcript will appear here
            </span>
          </div>
        )}

        {/* Rendered messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <MessageBubble
              key={`msg-${idx}-${msg.timestamp}`}
              role={msg.role}
              text={msg.text}
              timestamp={formatTime(msg.timestamp)}
              variants={messageVariants}
            />
          ))}

          {/* Live HR speech text (what the AI is currently saying) */}
          {isAISpeaking && currentSpeechText && (
            <MessageBubble
              key="live-speech"
              role="hr"
              text={currentSpeechText}
              timestamp="now"
              variants={messageVariants}
              isLive
            />
          )}

          {/* Typing indicator (3 bouncing dots) when AI is speaking but no text yet */}
          {isAISpeaking && !currentSpeechText && (
            <motion.div
              key="typing-indicator"
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'flex-start',
              }}
            >
              <AvatarCircle role="hr" />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '10px 16px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderLeft: '3px solid #8B5CF6',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderLeftWidth: '3px',
                  borderLeftColor: '#8B5CF6',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#8B5CF6',
                    }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Interim transcript (candidate's partial speech) */}
          {interimTranscript && (
            <motion.div
              key="interim-transcript"
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                alignSelf: 'flex-end',
                maxWidth: '78%',
                opacity: 0.55,
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderLeft: '3px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderLeftWidth: '3px',
                  borderLeftColor: 'rgba(59, 130, 246, 0.4)',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  {interimTranscript}
                </span>
              </div>
              <AvatarCircle role="candidate" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Text input fallback ── */}
      {showTextInput && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? 'Wait for AI to finish speaking...' : 'Type your response...'}
            style={{
              flex: 1,
              height: '36px',
              padding: '0 12px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              color: '#e2e8f0',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              opacity: disabled ? 0.4 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              if (!disabled) e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            }}
          />
          <motion.button
            onClick={handleSubmit}
            disabled={disabled || !inputText.trim()}
            whileHover={!disabled && inputText.trim() ? { scale: 1.08 } : {}}
            whileTap={!disabled && inputText.trim() ? { scale: 0.94 } : {}}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              background:
                disabled || !inputText.trim()
                  ? 'rgba(255, 255, 255, 0.04)'
                  : '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: disabled || !inputText.trim() ? 'not-allowed' : 'pointer',
              opacity: disabled || !inputText.trim() ? 0.35 : 1,
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <Send
              style={{
                width: 15,
                height: 15,
                color: disabled || !inputText.trim() ? '#94a3b8' : '#ffffff',
              }}
            />
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Small circular avatar thumbnail for HR or Candidate.
 * @param {{ role: 'hr'|'candidate' }} props
 */
function AvatarCircle({ role }) {
  const isHR = role === 'hr'
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: isHR ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
        border: `1.5px solid ${isHR ? 'rgba(139, 92, 246, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {isHR ? (
        <Bot style={{ width: 14, height: 14, color: '#A78BFA' }} />
      ) : (
        <User style={{ width: 14, height: 14, color: '#60A5FA' }} />
      )}
    </div>
  )
}

/**
 * Individual message bubble for HR or Candidate.
 *
 * @param {Object}  props
 * @param {string}  props.role      - 'hr' or 'candidate'
 * @param {string}  props.text      - Message content
 * @param {string}  props.timestamp - Formatted HH:MM string
 * @param {Object}  props.variants  - Framer-motion animation variants
 * @param {boolean} props.isLive    - Whether this is a live/streaming message
 */
function MessageBubble({ role, text, timestamp, variants, isLive = false }) {
  const isHR = role === 'hr'

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        alignSelf: isHR ? 'flex-start' : 'flex-end',
        maxWidth: '78%',
        flexDirection: isHR ? 'row' : 'row-reverse',
      }}
    >
      <AvatarCircle role={role} />

      <div
        style={{
          flex: 1,
          padding: '8px 12px',
          background: isHR ? 'rgba(15, 23, 42, 0.7)' : 'rgba(30, 41, 59, 0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderLeft: isHR ? '3px solid #8B5CF6' : undefined,
          borderRight: !isHR ? '3px solid #3B82F6' : undefined,
          position: 'relative',
        }}
      >
        {/* Name + timestamp header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: isHR ? '#A78BFA' : '#60A5FA',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {isHR ? 'Interviewer' : 'You'}
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#64748b',
              fontFamily: 'monospace',
            }}
          >
            {timestamp}
            {isLive && (
              <motion.span
                style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#8B5CF6',
                  marginLeft: 5,
                  verticalAlign: 'middle',
                }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </span>
        </div>

        {/* Message text */}
        <p
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#e2e8f0',
            lineHeight: 1.55,
            margin: 0,
            wordBreak: 'break-word',
          }}
        >
          {text}
        </p>
      </div>
    </motion.div>
  )
}

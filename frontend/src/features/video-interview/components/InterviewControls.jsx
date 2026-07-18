import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Maximize,
  Minimize,
  PhoneOff,
} from 'lucide-react'

/**
 * InterviewControls — Bottom control bar with glassmorphic icon buttons.
 *
 * Provides toggle controls for mic, camera, mute, pause, question repeat,
 * fullscreen, and ending the interview. Each button has animated hover/tap
 * states, active-state colored rings, disabled handling, and labels.
 *
 * @param {Object}   props
 * @param {boolean}  props.isMicOn            - Microphone toggle state
 * @param {boolean}  props.isCameraOn         - Camera toggle state
 * @param {boolean}  props.isMuted            - TTS mute state
 * @param {boolean}  props.isPaused           - Timer pause state
 * @param {boolean}  props.isAISpeaking       - Disable mic while AI speaks
 * @param {Function} props.onToggleMic        - Mic toggle callback
 * @param {Function} props.onToggleCamera     - Camera toggle callback
 * @param {Function} props.onToggleMute       - Mute toggle callback
 * @param {Function} props.onTogglePause      - Pause toggle callback
 * @param {Function} props.onRepeatQuestion   - Re-speak current question
 * @param {Function} props.onToggleFullscreen - Fullscreen toggle callback
 * @param {Function} props.onEndInterview     - End interview callback
 */
export default function InterviewControls({
  isMicOn = true,
  isCameraOn = true,
  isMuted = false,
  isPaused = false,
  isAISpeaking = false,
  onToggleMic = () => {},
  onToggleCamera = () => {},
  onToggleMute = () => {},
  onTogglePause = () => {},
  onRepeatQuestion = () => {},
  onToggleFullscreen = () => {},
  onEndInterview = () => {},
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  /** Wrap fullscreen toggle to also track internal state for icon swap */
  const handleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
    onToggleFullscreen()
  }

  // ── Button definitions (left-to-right order) ──
  const controlButtons = [
    {
      id: 'mic',
      label: isMicOn ? 'Mic On' : 'Mic Off',
      icon: isMicOn ? Mic : MicOff,
      isActive: isMicOn,
      activeColor: '#22C55E',      // green-500
      activeRing: 'rgba(34, 197, 94, 0.35)',
      disabled: isAISpeaking,
      tooltip: isAISpeaking ? 'Wait for AI to finish' : null,
      onClick: onToggleMic,
    },
    {
      id: 'camera',
      label: isCameraOn ? 'Camera' : 'Cam Off',
      icon: isCameraOn ? Camera : CameraOff,
      isActive: isCameraOn,
      activeColor: '#22C55E',
      activeRing: 'rgba(34, 197, 94, 0.35)',
      disabled: false,
      onClick: onToggleCamera,
    },
    {
      id: 'mute',
      label: isMuted ? 'Unmute' : 'Mute',
      icon: isMuted ? VolumeX : Volume2,
      isActive: !isMuted,
      activeColor: '#8B5CF6',
      activeRing: 'rgba(139, 92, 246, 0.3)',
      disabled: false,
      onClick: onToggleMute,
    },
    {
      id: 'pause',
      label: isPaused ? 'Resume' : 'Pause',
      icon: isPaused ? Play : Pause,
      isActive: !isPaused,
      activeColor: '#F59E0B',      // amber-500
      activeRing: 'rgba(245, 158, 11, 0.3)',
      disabled: false,
      onClick: onTogglePause,
    },
    {
      id: 'repeat',
      label: 'Repeat',
      icon: RotateCcw,
      isActive: false,
      activeColor: '#8B5CF6',
      activeRing: 'transparent',
      disabled: false,
      onClick: onRepeatQuestion,
    },
    {
      id: 'fullscreen',
      label: isFullscreen ? 'Exit FS' : 'Expand',
      icon: isFullscreen ? Minimize : Maximize,
      isActive: isFullscreen,
      activeColor: '#8B5CF6',
      activeRing: 'rgba(139, 92, 246, 0.25)',
      disabled: false,
      onClick: handleFullscreen,
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
      }}
    >
      {/* ── Main control buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {controlButtons.map((btn) => (
          <ControlButton key={btn.id} {...btn} />
        ))}
      </div>

      {/* ── Separator ── */}
      <div
        style={{
          width: '1px',
          height: '32px',
          background: 'rgba(255, 255, 255, 0.08)',
          margin: '0 10px',
          flexShrink: 0,
        }}
      />

      {/* ── End Interview (isolated red button) ── */}
      <ControlButton
        id="end"
        label="End"
        icon={PhoneOff}
        isActive={true}
        activeColor="#EF4444"
        activeRing="rgba(239, 68, 68, 0.35)"
        isDestructive
        disabled={false}
        onClick={onEndInterview}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal sub-component: Single control button
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ControlButton — An individual glassmorphic circle button with icon, label,
 * hover/tap animations, active ring, disabled state, and optional tooltip.
 *
 * @param {Object}   props
 * @param {string}   props.id            - Unique key identifier
 * @param {string}   props.label         - Label text below the button
 * @param {Object}   props.icon          - Lucide icon component
 * @param {boolean}  props.isActive      - Whether the control is in its "on" state
 * @param {string}   props.activeColor   - Color for the active ring/dot
 * @param {string}   props.activeRing    - Box-shadow ring color when active
 * @param {boolean}  props.disabled      - Whether the button is disabled
 * @param {string}   props.tooltip       - Optional tooltip (shown on hover when disabled)
 * @param {boolean}  props.isDestructive - Red/destructive styling (end interview)
 * @param {Function} props.onClick       - Click handler
 */
function ControlButton({
  id,
  label,
  icon: Icon,
  isActive = false,
  activeColor = '#8B5CF6',
  activeRing = 'transparent',
  disabled = false,
  tooltip = null,
  isDestructive = false,
  onClick = () => {},
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  /** Determine button background */
  const getBg = () => {
    if (isDestructive) {
      return 'linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(185, 28, 28, 0.45))'
    }
    return 'rgba(255, 255, 255, 0.05)'
  }

  /** Determine icon color */
  const getIconColor = () => {
    if (disabled) return '#64748b'
    if (isDestructive) return '#FCA5A5'
    if (isActive) return '#e2e8f0'
    return '#94a3b8'
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        position: 'relative',
      }}
      onMouseEnter={() => tooltip && disabled && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              marginBottom: '6px',
              padding: '5px 10px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#F59E0B',
              whiteSpace: 'nowrap',
              zIndex: 50,
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button circle */}
      <motion.button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.12, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        whileTap={disabled ? {} : { scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: 'none',
          background: getBg(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          position: 'relative',
          outline: 'none',
          boxShadow: isActive && !isDestructive
            ? `0 0 0 2px ${activeRing}, 0 0 12px ${activeRing}`
            : isDestructive
            ? `0 0 0 2px ${activeRing}, 0 0 16px rgba(239, 68, 68, 0.2)`
            : 'none',
          transition: 'box-shadow 0.25s ease, opacity 0.2s ease',
        }}
      >
        <Icon style={{ width: 20, height: 20, color: getIconColor() }} />

        {/* Green status dot for mic/camera when active */}
        {(id === 'mic' || id === 'camera') && isActive && !disabled && (
          <span
            style={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22C55E',
              border: '2px solid rgba(15, 23, 42, 0.9)',
              boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)',
            }}
          />
        )}
      </motion.button>

      {/* Label */}
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          color: disabled ? '#475569' : isDestructive ? '#FCA5A5' : '#64748b',
          textAlign: 'center',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * @file CandidateWebcam.jsx
 * @description Floating Picture-in-Picture webcam component for the TalentForge
 * AI Interview System. Shows the candidate's live camera feed in a draggable,
 * glassmorphic overlay positioned at the bottom-right of the viewport.
 *
 * Features:
 * - Live webcam preview via `react-webcam` (mirrored)
 * - Pointer-event-based dragging (no external library)
 * - Graceful handling of camera-off and permission-denied states
 * - Smooth framer-motion entrance / exit animations
 * - Minimize (hide) button and camera status badge
 *
 * @example
 * <CandidateWebcam
 *   enabled={true}
 *   onToggle={() => setCameraOn(prev => !prev)}
 * />
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, X, Video, VideoOff } from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────────────────────
const PIP_WIDTH = 200
const PIP_HEIGHT = 150
const BORDER_RADIUS = 16

// Default position: 20px from bottom-right edge (will be offset from parent)
const DEFAULT_POSITION = { x: -20, y: -20 }

// ═════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} props
 * @param {boolean} props.enabled — Whether the camera should be on
 * @param {() => void} props.onToggle — Callback to toggle camera on/off
 */
export default function CandidateWebcam({ enabled = true, onToggle = () => {} }) {
  // ── Visibility state (minimized by 'x' button) ──
  const [minimized, setMinimized] = useState(false)

  // ── Camera permission state ──
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)

  // ── Drag state ──
  const [position, setPosition] = useState(DEFAULT_POSITION)
  const dragStateRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 })
  const containerRef = useRef(null)

  // Reset permission state when enabled changes
  useEffect(() => {
    if (enabled) {
      setPermissionDenied(false)
      setCameraReady(false)
    }
  }, [enabled])

  // ── Drag handlers (pointer events — no external library) ──────────────────

  const handlePointerDown = useCallback((e) => {
    // Don't drag from buttons
    if (e.target.closest('button')) return

    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [position])

  const handlePointerMove = useCallback((e) => {
    const ds = dragStateRef.current
    if (!ds.dragging) return

    const dx = e.clientX - ds.startX
    const dy = e.clientY - ds.startY
    setPosition({ x: ds.originX + dx, y: ds.originY + dy })
  }, [])

  const handlePointerUp = useCallback(() => {
    dragStateRef.current.dragging = false
  }, [])

  // ── Webcam callbacks ──────────────────────────────────────────────────────

  /** Called when react-webcam gets a stream successfully */
  const handleUserMedia = useCallback(() => {
    setCameraReady(true)
    setPermissionDenied(false)
  }, [])

  /** Called when camera access is denied or an error occurs */
  const handleUserMediaError = useCallback((error) => {
    console.warn('[CandidateWebcam] Camera access error:', error)
    // NotAllowedError = permission denied, NotFoundError = no camera device
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      setPermissionDenied(true)
    }
    setCameraReady(false)
  }, [])

  // ── Minimized restore button ──────────────────────────────────────────────

  if (minimized) {
    return (
      <motion.button
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.7, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setMinimized(false)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 50,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: enabled
            ? '0 0 16px rgba(139,92,246,0.3)'
            : '0 4px 12px rgba(0,0,0,0.4)',
          color: enabled ? '#A78BFA' : '#94a3b8',
        }}
        title="Show webcam"
      >
        <Video style={{ width: 18, height: 18 }} />
      </motion.button>
    )
  }

  // ── Main PiP container ────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
          borderRadius: BORDER_RADIUS,
          overflow: 'hidden',
          zIndex: 50,
          cursor: dragStateRef.current.dragging ? 'grabbing' : 'grab',
          // Glassmorphic container
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: enabled && cameraReady
            ? '0 0 20px rgba(139,92,246,0.3), 0 8px 24px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.5)',
          userSelect: 'none',
          touchAction: 'none', // prevent scrolling while dragging
        }}
      >
        {/* ── Live webcam feed ── */}
        {enabled && !permissionDenied && (
          <Webcam
            audio={false}
            mirrored={true}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            videoConstraints={{
              width: PIP_WIDTH * 2,
              height: PIP_HEIGHT * 2,
              facingMode: 'user',
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              borderRadius: BORDER_RADIUS,
            }}
          />
        )}

        {/* ── Camera off placeholder ── */}
        {!enabled && !permissionDenied && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'rgba(15,23,42,0.95)',
            }}
          >
            <CameraOff style={{ width: 24, height: 24, color: '#64748b' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
              }}
            >
              Camera Off
            </span>
          </div>
        )}

        {/* ── Permission denied placeholder ── */}
        {permissionDenied && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
              background: 'rgba(15,23,42,0.95)',
              textAlign: 'center',
            }}
          >
            <VideoOff style={{ width: 24, height: 24, color: '#ef4444' }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#f87171',
                lineHeight: 1.4,
              }}
            >
              Camera access denied
            </span>
            <span
              style={{
                fontSize: 9,
                color: '#94a3b8',
                lineHeight: 1.3,
              }}
            >
              Check browser permissions
            </span>
          </div>
        )}

        {/* ── Top-right camera status badge ── */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: enabled && cameraReady
              ? 'rgba(16,185,129,0.2)'
              : 'rgba(100,116,139,0.2)',
            border: `1px solid ${
              enabled && cameraReady
                ? 'rgba(16,185,129,0.4)'
                : 'rgba(100,116,139,0.3)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Camera
            style={{
              width: 11,
              height: 11,
              color: enabled && cameraReady ? '#34D399' : '#94a3b8',
            }}
          />
        </div>

        {/* ── Minimize ('x') button (top-left) ── */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMinimized(true)
          }}
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            color: '#94a3b8',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.3)'
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(15,23,42,0.7)'
            e.currentTarget.style.color = '#94a3b8'
          }}
          title="Minimize webcam"
        >
          <X style={{ width: 11, height: 11 }} />
        </button>

        {/* ── Camera toggle button (bottom-center) ── */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          style={{
            position: 'absolute',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '3px 10px',
            borderRadius: 10,
            background: enabled
              ? 'rgba(139,92,246,0.2)'
              : 'rgba(100,116,139,0.2)',
            border: `1px solid ${
              enabled
                ? 'rgba(139,92,246,0.3)'
                : 'rgba(100,116,139,0.25)'
            }`,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            color: enabled ? '#A78BFA' : '#94a3b8',
            fontSize: 9,
            fontWeight: 700,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = enabled
              ? 'rgba(139,92,246,0.35)'
              : 'rgba(100,116,139,0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = enabled
              ? 'rgba(139,92,246,0.2)'
              : 'rgba(100,116,139,0.2)'
          }}
          title={enabled ? 'Turn camera off' : 'Turn camera on'}
        >
          {enabled ? (
            <Camera style={{ width: 10, height: 10 }} />
          ) : (
            <CameraOff style={{ width: 10, height: 10 }} />
          )}
          {enabled ? 'On' : 'Off'}
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

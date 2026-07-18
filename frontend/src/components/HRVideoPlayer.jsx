/**
 * HRVideoPlayer.jsx
 *
 * Gapless A/B cross-fade video player for HR interview clips.
 * - Two hidden <video> elements swap via CSS opacity — zero black flash
 * - Calls onEnded when a non-looping clip finishes
 * - Calls onIdleEnded when a looping idle clip finishes one cycle
 *   (so the parent can alternate to the next idle clip)
 *
 * All clips are already preloaded in the browser cache by the
 * preloader effect in VirtualInterviewRoom — this player just plays them.
 *
 * Fixes applied:
 *  - muted prop is now applied reactively to the active video whenever it changes
 *  - Cross-fade reduced to 250ms (was 400ms) to eliminate visible black gap
 *  - handleEnded guards against loop prop mismatch — only calls onIdleEnded if loop===true
 */
import React, { useRef, useState, useEffect, useCallback } from 'react'

const FOLDER = '/interviewers/female_hr/'

export default function HRVideoPlayer({
  clipName,
  srcOverride = '',
  muted  = true,
  loop   = false,
  onEnded,
  onIdleEnded,
  className = '',
  isSpeakingStage = false,
  isInterviewerSpeaking = false,
}) {
  const [activePlayer, setActivePlayer] = useState('A')
  const [srcA, setSrcA] = useState('')
  const [srcB, setSrcB] = useState('')
  const refA = useRef(null)
  const refB = useRef(null)
  const targetRef  = useRef('')
  const mutedRef   = useRef(muted)
  const loopRef    = useRef(loop)

  const targetSrc = srcOverride || (clipName ? `${FOLDER}${clipName}` : '')

  // ── Keep refs in sync with latest props ─────────────────────────────────────
  useEffect(() => { mutedRef.current = muted },  [muted])
  useEffect(() => { loopRef.current  = loop  },  [loop])

  // ── When clipName/srcOverride changes, load on inactive player and cross-fade ─
  useEffect(() => {
    if (!targetSrc || targetSrc === targetRef.current) return
    targetRef.current = targetSrc

    const activeVideo   = activePlayer === 'A' ? refA.current : refB.current
    const inactiveVideo = activePlayer === 'A' ? refB.current : refA.current

    // Already playing the right clip? Just ensure it's running
    if (
      activeVideo?.src === targetSrc ||
      (clipName && activeVideo?.src?.endsWith(clipName))
    ) {
      if (activeVideo.paused) activeVideo.play().catch(() => {})
      return
    }

    // Stage next clip on inactive player
    if (activePlayer === 'A') setSrcB(targetSrc)
    else                       setSrcA(targetSrc)

    if (inactiveVideo) {
      inactiveVideo.muted = muted
      inactiveVideo.loop  = loop
      inactiveVideo.load()
    }
  }, [targetSrc, clipName, srcOverride, activePlayer, muted, loop])

  // ── Reactively update muted on the currently-active video when prop changes ─
  useEffect(() => {
    const activeVideo = activePlayer === 'A' ? refA.current : refB.current
    if (activeVideo) {
      activeVideo.muted = muted
    }
  }, [muted, activePlayer])

  // ── Reactive speaking sync: pause/resume based on speaking state ─────────────
  // IMPORTANT: Never pause looping idle clips — they must run continuously
  // while the candidate speaks. Only pause/resume non-looping talking clips.
  useEffect(() => {
    const activeVideo = activePlayer === 'A' ? refA.current : refB.current
    if (!activeVideo) return
    if (!isSpeakingStage) return   // not in a speaking-controlled stage
    if (loopRef.current) return    // never pause looping idle clips

    if (isInterviewerSpeaking) {
      activeVideo.play().catch(() => {})
    } else {
      activeVideo.pause()
    }
  }, [isSpeakingStage, isInterviewerSpeaking, activePlayer])

  const handleCanPlay = useCallback((player) => {
    const videoA = refA.current
    const videoB = refB.current
    if (!videoA || !videoB) return

    const isTarget = (player === 'A' && activePlayer === 'B') ||
                     (player === 'B' && activePlayer === 'A')
    if (!isTarget) return

    const incoming = player === 'A' ? videoA : videoB
    const outgoing = player === 'A' ? videoB : videoA

    incoming.muted = mutedRef.current
    incoming.loop  = loopRef.current

    const shouldPlay = !isSpeakingStage || isInterviewerSpeaking
    if (shouldPlay) {
      incoming.play().catch((err) => {
        console.warn(`video${player} play blocked, retrying muted:`, err)
        incoming.muted = true
        incoming.play().catch(() => {})
      })
    } else {
      incoming.pause()
    }

    outgoing.pause()
    setActivePlayer(player)
  }, [activePlayer, isSpeakingStage, isInterviewerSpeaking])

  const handleEnded = useCallback((player) => {
    // Only use the currently-active player's ended event to avoid stale B-player fires
    if ((player === 'A') !== (activePlayer === 'A')) return

    if (loopRef.current) {
      // For looping idle clips — notify parent to pick next idle clip
      onIdleEnded?.()
      return
    }
    // For scripted single-play clips — notify parent to advance stage
    onEnded?.()
  }, [activePlayer, onEnded, onIdleEnded])

  const handleError = useCallback((player, event) => {
    const error = event.target.error
    console.error(`HRVideoPlayer error on player ${player}:`, error?.message || error?.code || error)
    
    // Auto-resolve: if a scripted non-looping video fails, trigger onEnded after a short delay
    // to prevent the interview from freezing!
    if (!loopRef.current) {
      console.warn(`Scripted video failed. Triggering fallback onEnded in 2.5 seconds to bypass freeze...`)
      setTimeout(() => {
        if ((player === 'A') === (activePlayer === 'A')) {
          onEnded?.()
        }
      }, 2500)
    } else {
      // For looping idle clips, try to pick the next one
      onIdleEnded?.()
    }
  }, [activePlayer, onEnded, onIdleEnded])

  const videoClass = (isActive) =>
    `absolute inset-0 w-full h-full object-cover transition-opacity duration-[250ms] ${
      isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
    }`

  return (
    <div className={`relative w-full h-full ${className}`}>
      <video
        ref={refA}
        src={srcA}
        className={videoClass(activePlayer === 'A')}
        playsInline
        preload="auto"
        onCanPlay={() => handleCanPlay('A')}
        onEnded={() => handleEnded('A')}
        onError={(e) => handleError('A', e)}
      />
      <video
        ref={refB}
        src={srcB}
        className={videoClass(activePlayer === 'B')}
        playsInline
        preload="auto"
        onCanPlay={() => handleCanPlay('B')}
        onEnded={() => handleEnded('B')}
        onError={(e) => handleError('B', e)}
      />
    </div>
  )
}

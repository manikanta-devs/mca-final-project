/**
 * useSoundDesign.js
 *
 * All interview room sounds generated via Web Audio API.
 * Zero external audio files needed.
 *
 * Sounds:
 *  - playJoinChime()    → 3-note ascending chime when HR joins (Zoom-like)
 *  - playTyping()       → soft keyboard clicks during hr_taking_notes
 *  - playEndChime()     → descending tone when interview closes
 *  - startAmbience()    → very faint office background hum (3% volume)
 *  - stopAmbience()     → stops ambience loop
 */
import { useRef, useCallback } from 'react'

export default function useSoundDesign() {
  const ambienceNodeRef   = useRef(null)
  const ambienceGainRef   = useRef(null)
  const typingTimerRef    = useRef(null)
  const audioCtxRef       = useRef(null)

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return audioCtxRef.current
  }, [])

  // ── Join chime (3-note ascending — Zoom/Teams style) ─────────────────────
  const playJoinChime = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return
    const notes = [523, 659, 784]   // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.5)
    })
  }, [getCtx])

  // ── Soft keyboard typing clicks ────────────────────────────────────────────
  const playTyping = useCallback((durationMs = 5000) => {
    const ctx = getCtx()
    if (!ctx) return
    clearInterval(typingTimerRef.current)

    const startAt = Date.now()
    typingTimerRef.current = setInterval(() => {
      if (Date.now() - startAt >= durationMs) {
        clearInterval(typingTimerRef.current)
        return
      }
      const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.15))
      }
      const src  = ctx.createBufferSource()
      const filt = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      filt.type = 'bandpass'
      filt.frequency.value = 3000 + Math.random() * 1500
      filt.Q.value = 3
      gain.gain.value = 0.06
      src.buffer = buf
      src.connect(filt)
      filt.connect(gain)
      gain.connect(ctx.destination)
      src.start()
    }, 80 + Math.random() * 140)
  }, [getCtx])

  const stopTyping = useCallback(() => {
    clearInterval(typingTimerRef.current)
  }, [])

  // ── End-call descending chime ─────────────────────────────────────────────
  const playEndChime = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return
    const notes = [784, 659, 523]   // G5, E5, C5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4)
      osc.start(ctx.currentTime + i * 0.15)
      osc.stop(ctx.currentTime + i * 0.15 + 0.4)
    })
  }, [getCtx])

  // ── Faint office ambience (AC hum + subtle noise floor) ───────────────────
  const startAmbience = useCallback(() => {
    const ctx = getCtx()
    if (!ctx || ambienceNodeRef.current) return

    const bufLen = ctx.sampleRate * 4   // 4-second looping noise buffer
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data   = buffer.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1

    const src  = ctx.createBufferSource()
    src.buffer = buffer
    src.loop   = true

    const lo   = ctx.createBiquadFilter()
    lo.type    = 'lowpass'
    lo.frequency.value = 200   // below 200Hz → AC hum feel

    const gain = ctx.createGain()
    gain.gain.value = 0.03     // 3% volume — below conscious detection

    src.connect(lo)
    lo.connect(gain)
    gain.connect(ctx.destination)
    src.start()

    ambienceNodeRef.current = src
    ambienceGainRef.current = gain
  }, [getCtx])

  const stopAmbience = useCallback(() => {
    try { ambienceNodeRef.current?.stop() } catch (_err) { /* node may already be stopped */ }
    ambienceNodeRef.current = null
    ambienceGainRef.current = null
  }, [])

  return {
    playJoinChime,
    playTyping,
    stopTyping,
    playEndChime,
    startAmbience,
    stopAmbience,
  }
}

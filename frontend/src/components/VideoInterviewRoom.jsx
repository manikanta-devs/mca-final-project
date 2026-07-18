import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera, CameraOff, Maximize, Mic, MicOff, PhoneOff,
  RotateCcw, Volume2, VolumeX, Brain, Activity, MessageSquare
} from 'lucide-react'

const PERSONAS = {
  sarah: {
    name: 'Sarah Chen',
    title: 'Senior HR Director',
    mode: 'Behavioral interview',
    accent: '#8b5cf6',
    suit: '#25213f',
    skin: '#c99171',
    hair: '#201716',
  },
  marcus: {
    name: 'Marcus Rodriguez',
    title: 'Technical Lead',
    mode: 'Technical interview',
    accent: '#06b6d4',
    suit: '#1d3144',
    skin: '#b97858',
    hair: '#191919',
  },
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const formatTime = (secs = 0) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = Math.floor(secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function resolveAvatarState({ isEvaluating, isSpeaking, isListening, zoomPhase }) {
  if (zoomPhase === 'closing') return 'ending'
  if (zoomPhase === 'greet_mic') return 'greeting'
  if (isEvaluating) return 'thinking'
  if (isSpeaking) return 'speaking'
  if (isListening) return 'listening'
  return 'idle'
}

function resolveQuestion({ encouragementText, onboardingQuestionText, zoomPhase, currentQuestion }) {
  if (encouragementText) return encouragementText
  if (onboardingQuestionText && zoomPhase && zoomPhase !== 'greet_mic') return onboardingQuestionText
  if (zoomPhase === 'greet_mic') return 'Hello, good morning. Welcome to the interview. Can you hear and see me clearly?'
  if (zoomPhase === 'small_talk') return 'Wonderful. Thank you for joining on time. How has your day been so far?'
  if (zoomPhase === 'identity_confirm') return 'Before we begin, please introduce yourself and walk me through your background.'
  if (zoomPhase === 'candidate_questions') return 'We have covered my questions. Do you have any questions for me about the role?'
  if (zoomPhase === 'closing') return 'It was a pleasure speaking with you today. Your interview has been completed successfully.'
  return currentQuestion?.text || 'Preparing your next question...'
}

function createRoundedBox(width, height, depth, color) {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.04 })
  return new THREE.Mesh(geometry, material)
}

function createOfficeScene(scene) {
  scene.background = new THREE.Color('#0b111d')

  const floor = createRoundedBox(12, 0.12, 10, '#20283a')
  floor.position.set(0, -1.36, 0.6)
  scene.add(floor)

  const backWall = createRoundedBox(12, 6, 0.12, '#eef2f7')
  backWall.position.set(0, 1.55, -3.25)
  scene.add(backWall)

  const sideGlass = createRoundedBox(0.08, 5, 6, '#a8d9ff')
  sideGlass.material.transparent = true
  sideGlass.material.opacity = 0.22
  sideGlass.position.set(-5.2, 1.25, -0.2)
  scene.add(sideGlass)

  const desk = createRoundedBox(5.8, 0.34, 1.55, '#7a4a2b')
  desk.position.set(0, -0.78, -0.2)
  scene.add(desk)

  const deskFront = createRoundedBox(5.9, 0.9, 0.12, '#5d3824')
  deskFront.position.set(0, -1.16, 0.62)
  scene.add(deskFront)

  const laptop = createRoundedBox(1.35, 0.08, 0.85, '#151923')
  laptop.position.set(-1.25, -0.55, -0.24)
  laptop.rotation.x = -0.12
  scene.add(laptop)

  const laptopScreen = createRoundedBox(1.35, 0.84, 0.06, '#111827')
  laptopScreen.position.set(-1.25, -0.18, -0.58)
  laptopScreen.rotation.x = -0.28
  scene.add(laptopScreen)

  const shelf = createRoundedBox(2.5, 2.0, 0.22, '#334155')
  shelf.position.set(3.8, 0.8, -3.05)
  scene.add(shelf)
  for (let i = 0; i < 10; i += 1) {
    const book = createRoundedBox(0.14 + (i % 3) * 0.05, 0.7, 0.16, ['#7c3aed', '#0f766e', '#b45309'][i % 3])
    book.position.set(2.8 + i * 0.18, 0.28 + (i % 2) * 0.82, -2.86)
    scene.add(book)
  }

  const plantStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.9, 10),
    new THREE.MeshStandardMaterial({ color: '#315b3a', roughness: 0.9 })
  )
  plantStem.position.set(2.1, -0.22, -0.42)
  scene.add(plantStem)
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 10),
      new THREE.MeshStandardMaterial({ color: '#2f7d46', roughness: 0.8 })
    )
    leaf.scale.set(0.5, 0.16, 0.9)
    leaf.position.set(2.1 + Math.cos(i) * 0.26, 0.1 + i * 0.05, -0.42 + Math.sin(i) * 0.2)
    leaf.rotation.set(0.5, i, 0.2)
    scene.add(leaf)
  }

  const key = new THREE.DirectionalLight('#fff4df', 2.4)
  key.position.set(-3, 5, 4)
  scene.add(key)
  const fill = new THREE.DirectionalLight('#b9d8ff', 1.1)
  fill.position.set(3, 2.5, 2)
  scene.add(fill)
  scene.add(new THREE.AmbientLight('#b9c7dc', 1.8))
}

function createHumanoidAvatar(persona) {
  const group = new THREE.Group()
  group.name = 'vrm-ready-humanoid-fallback'

  const suitMat = new THREE.MeshStandardMaterial({ color: persona.suit, roughness: 0.7 })
  const skinMat = new THREE.MeshStandardMaterial({ color: persona.skin, roughness: 0.62 })
  const hairMat = new THREE.MeshStandardMaterial({ color: persona.hair, roughness: 0.82 })
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.65 })
  const accentMat = new THREE.MeshStandardMaterial({ color: persona.accent, roughness: 0.5 })

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 10, 20), suitMat)
  torso.position.y = 0.05
  torso.scale.set(1.05, 1, 0.48)
  group.add(torso)

  const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 4), whiteMat)
  shirt.position.set(0, 0.22, 0.44)
  shirt.rotation.z = Math.PI / 4
  group.add(shirt)

  const tie = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 4), accentMat)
  tie.position.set(0, 0.05, 0.55)
  tie.rotation.z = Math.PI / 4
  group.add(tie)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 24), skinMat)
  neck.position.y = 0.82
  group.add(neck)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 36, 24), skinMat)
  head.position.y = 1.18
  head.scale.set(0.86, 1.1, 0.78)
  group.add(head)

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 16), hairMat)
  hair.position.set(0, 1.36, -0.02)
  hair.scale.set(0.92, 0.42, 0.72)
  group.add(hair)

  const eyeMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.3 })
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), eyeMat)
  leftEye.position.set(-0.13, 1.21, 0.29)
  const rightEye = leftEye.clone()
  rightEye.position.x = 0.13
  group.add(leftEye, rightEye)

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.018), new THREE.MeshStandardMaterial({ color: '#7f1d1d' }))
  mouth.position.set(0, 1.06, 0.31)
  group.add(mouth)

  const leftArmPivot = new THREE.Group()
  const rightArmPivot = new THREE.Group()
  leftArmPivot.position.set(-0.62, 0.45, 0.04)
  rightArmPivot.position.set(0.62, 0.45, 0.04)
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.78, 8, 16)
  const leftArm = new THREE.Mesh(armGeo, suitMat)
  leftArm.position.y = -0.42
  leftArm.rotation.z = -0.2
  const rightArm = new THREE.Mesh(armGeo, suitMat)
  rightArm.position.y = -0.42
  rightArm.rotation.z = 0.2
  leftArmPivot.add(leftArm)
  rightArmPivot.add(rightArm)
  group.add(leftArmPivot, rightArmPivot)

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), skinMat)
  leftHand.position.set(-0.76, -0.48, 0.2)
  const rightHand = leftHand.clone()
  rightHand.position.x = 0.76
  group.add(leftHand, rightHand)

  group.userData.parts = { head, mouth, leftEye, rightEye, leftArmPivot, rightArmPivot, leftHand, rightHand }
  group.position.set(0, -0.62, -0.78)
  group.rotation.x = 0.02
  return group
}

function AnimationController({ avatar, avatarState, audioLevel }) {
  const stateRef = useRef(avatarState)

  useEffect(() => {
    stateRef.current = avatarState
  }, [avatarState])

  useEffect(() => {
    if (!avatar) return undefined
    let frame = 0
    let raf = 0
    const parts = avatar.userData.parts || {}
    const animate = () => {
      frame += 0.016
      const state = stateRef.current
      const breathe = Math.sin(frame * 1.4) * 0.025
      const nod = state === 'speaking' ? Math.sin(frame * 5.2) * 0.055 : state === 'listening' ? Math.sin(frame * 2.2) * 0.035 : 0
      const thinkingTilt = state === 'thinking' ? -0.15 : 0
      avatar.position.y = -0.62 + breathe
      if (parts.head) {
        parts.head.rotation.x = thinkingTilt + nod
        parts.head.rotation.y = Math.sin(frame * 0.8) * 0.06
      }
      if (parts.mouth) {
        const open = state === 'speaking' ? clamp(audioLevel / 100, 0.08, 0.55) : 0.02
        parts.mouth.scale.y = 1 + open * 7
        parts.mouth.position.y = 1.06 - open * 0.02
      }
      const gesture = state === 'speaking' ? Math.sin(frame * 3.4) * 0.18 : state === 'greeting' ? 0.55 : 0
      if (parts.leftArmPivot) parts.leftArmPivot.rotation.z = -0.12 + gesture * 0.2
      if (parts.rightArmPivot) parts.rightArmPivot.rotation.z = 0.12 - gesture
      if (parts.rightHand) parts.rightHand.position.y = state === 'greeting' ? -0.02 + Math.sin(frame * 4) * 0.05 : -0.48
      raf = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(raf)
  }, [avatar, audioLevel])

  return null
}

function VRMRenderer({ persona, avatarState, audioLevel }) {
  const mountRef = useRef(null)
  const [avatar, setAvatar] = useState(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined
    const scene = new THREE.Scene()
    createOfficeScene(scene)

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0.82, 4.25)
    camera.lookAt(0, 0.38, -0.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = false
    mount.appendChild(renderer.domElement)

    const fallbackAvatar = createHumanoidAvatar(persona)
    scene.add(fallbackAvatar)
    setAvatar(fallbackAvatar)

    let raf = 0
    const render = () => {
      renderer.render(scene, camera)
      raf = requestAnimationFrame(render)
    }
    render()

    const handleResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      scene.traverse((node) => {
        if (node.geometry) node.geometry.dispose?.()
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material]
          materials.forEach((mat) => mat.dispose?.())
        }
      })
    }
  }, [persona])

  return (
    <div ref={mountRef} className="absolute inset-0 bg-slate-950">
      <AnimationController avatar={avatar} avatarState={avatarState} audioLevel={audioLevel} />
    </div>
  )
}

function LipSyncController({ activeMediaStream, micEnabled, isSpeaking }) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!activeMediaStream || !micEnabled) {
      setLevel(isSpeaking ? 42 : 0)
      return undefined
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return undefined
    let raf = 0
    const ctx = new AudioCtx()
    const analyser = ctx.createAnalyser()
    const source = ctx.createMediaStreamSource(activeMediaStream)
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((sum, value) => sum + value, 0) / data.length
      setLevel(Math.round(clamp(avg / 1.25, 0, 100)))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      ctx.close()
    }
  }, [activeMediaStream, micEnabled, isSpeaking])

  return level
}

function SpeechController({ isSpeaking, avatarState, questionText }) {
  return (
    <div className="absolute left-5 top-5 max-w-xl rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        <Volume2 className="h-3.5 w-3.5" /> {isSpeaking ? 'HR speaking' : avatarState === 'thinking' ? 'Analyzing response' : 'Interview prompt'}
      </div>
      <p className="text-sm font-semibold leading-relaxed text-white/88">{questionText}</p>
    </div>
  )
}

function CandidateWebcam({ cameraPreviewRef, cameraReady, cameraEnabled }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragStart = useRef(null)

  const onPointerDown = (event) => {
    dragStart.current = { x: event.clientX, y: event.clientY, ox: pos.x, oy: pos.y }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event) => {
    if (!dragStart.current) return
    setPos({
      x: dragStart.current.ox + event.clientX - dragStart.current.x,
      y: dragStart.current.oy + event.clientY - dragStart.current.y,
    })
  }
  const onPointerUp = () => {
    dragStart.current = null
  }

  return (
    <div
      className="absolute bottom-5 right-5 z-20 h-36 w-56 overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl shadow-black/50"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <video ref={cameraPreviewRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      {(!cameraReady || !cameraEnabled) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white/70">
          <CameraOff className="mb-1 h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Camera muted</span>
        </div>
      )}
      <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/70">You</div>
    </div>
  )
}

function InterviewHUD({ persona, avatarState, elapsedSeconds, currentIndex, totalQuestions }) {
  return (
    <div className="absolute right-5 top-5 z-20 w-72 rounded-2xl border border-white/10 bg-black/35 p-4 text-white backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Real-time HR</p>
          <h2 className="mt-1 text-lg font-black">{persona.name}</h2>
          <p className="text-xs font-semibold text-white/55">{persona.title}</p>
        </div>
        <span className="rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider" style={{ color: persona.accent, borderColor: persona.accent }}>
          {avatarState}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-white/8 p-2"><div className="font-black">{formatTime(elapsedSeconds)}</div><div className="text-[9px] text-white/40">Time</div></div>
        <div className="rounded-xl bg-white/8 p-2"><div className="font-black">{currentIndex + 1}/{Math.max(totalQuestions, 1)}</div><div className="text-[9px] text-white/40">Question</div></div>
        <div className="rounded-xl bg-white/8 p-2"><div className="font-black">Live</div><div className="text-[9px] text-white/40">Session</div></div>
      </div>
    </div>
  )
}

function InterviewTranscript({ questionText, voiceTranscript, voiceInterim, isListening, isSpeaking }) {
  const transcriptRef = useRef(null)
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [questionText, voiceTranscript, voiceInterim])

  return (
    <div ref={transcriptRef} className="h-44 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-sm text-white shadow-xl">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-black text-cyan-200">HR</div>
        <p className="leading-relaxed text-white/82">{questionText}</p>
      </div>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-black text-violet-200">YOU</div>
        <p className="leading-relaxed text-white/75">
          {voiceTranscript || (isListening ? 'Listening...' : 'Your answer will appear here.')}
          {voiceInterim && <span className="text-cyan-200"> {voiceInterim}</span>}
        </p>
      </div>
      {isSpeaking && <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-cyan-300">Typing animation active...</div>}
    </div>
  )
}

function InterviewControls({ cameraEnabled, micEnabled, onCameraToggle, onMicToggle, onEndInterview, onSubmitAnswer, onRepeat }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-xl">
      <button onClick={onMicToggle} className="btn-secondary rounded-xl px-4 py-2 text-xs" title={micEnabled ? 'Mute mic' : 'Unmute mic'}>
        {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </button>
      <button onClick={onCameraToggle} className="btn-secondary rounded-xl px-4 py-2 text-xs" title={cameraEnabled ? 'Mute camera' : 'Unmute camera'}>
        {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
      </button>
      <button onClick={onRepeat} className="btn-secondary rounded-xl px-4 py-2 text-xs" title="Repeat question"><RotateCcw className="h-4 w-4" /></button>
      <button onClick={() => document.documentElement.requestFullscreen?.()} className="btn-secondary rounded-xl px-4 py-2 text-xs" title="Fullscreen"><Maximize className="h-4 w-4" /></button>
      <button onClick={onSubmitAnswer} className="btn-primary rounded-xl px-5 py-2 text-xs"><MessageSquare className="h-4 w-4" /> Submit Answer</button>
      <button onClick={onEndInterview} className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500"><PhoneOff className="h-4 w-4" /> End</button>
    </div>
  )
}

function InterviewAnalytics({ liveWpm, fillerWords, audioLevel, emotionSnapshot, isEvaluating }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-xl md:grid-cols-4">
      <div><p className="text-[10px] font-bold uppercase text-white/40">Speaking speed</p><p className="text-lg font-black">{liveWpm || 0} WPM</p></div>
      <div><p className="text-[10px] font-bold uppercase text-white/40">Filler words</p><p className="text-lg font-black">{fillerWords}</p></div>
      <div><p className="text-[10px] font-bold uppercase text-white/40">Mic level</p><p className="text-lg font-black">{audioLevel}%</p></div>
      <div><p className="text-[10px] font-bold uppercase text-white/40">Backend scoring</p><p className="text-lg font-black">{isEvaluating ? 'Analyzing' : emotionSnapshot?.primary_emotion || 'Ready'}</p></div>
    </div>
  )
}

function AvatarEngine({ persona, avatarState, audioLevel }) {
  return <VRMRenderer persona={persona} avatarState={avatarState} audioLevel={audioLevel} />
}

function InterviewRoom(props) {
  const persona = PERSONAS[props.interviewerPersona] || PERSONAS.sarah
  const avatarState = resolveAvatarState(props)
  const questionText = resolveQuestion(props)
  const audioLevel = LipSyncController(props)

  const liveWpm = useMemo(() => {
    if (props.voiceMetrics?.speaking_pace_wpm) return props.voiceMetrics.speaking_pace_wpm
    const words = props.voiceTranscript?.split(/\s+/).filter(Boolean).length || 0
    const minutes = props.elapsedSeconds / 60
    return minutes > 0.05 ? Math.round(words / minutes) : 0
  }, [props.voiceMetrics, props.voiceTranscript, props.elapsedSeconds])

  const fillerWords = useMemo(() => {
    if (props.voiceMetrics?.fillers !== undefined) return props.voiceMetrics.fillers
    const fillers = ['um', 'uh', 'like', 'basically', 'actually', 'so']
    return props.voiceTranscript
      ? props.voiceTranscript.toLowerCase().split(/\s+/).filter((word) => fillers.includes(word.replace(/[^a-z]/g, ''))).length
      : 0
  }, [props.voiceMetrics, props.voiceTranscript])

  const repeatQuestion = () => {
    if (!window.speechSynthesis || !questionText) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(questionText)
    utterance.rate = 0.92
    utterance.pitch = 0.95
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="min-h-[calc(100vh-96px)] rounded-[1.5rem] bg-[#050811] p-4 text-white shadow-2xl shadow-black/40">
      <div className="relative h-[62vh] min-h-[520px] overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950">
        <AvatarEngine persona={persona} avatarState={avatarState} audioLevel={audioLevel} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(2,6,23,0.72)_100%)]" />
        <SpeechController isSpeaking={props.isSpeaking} avatarState={avatarState} questionText={questionText} />
        <InterviewHUD persona={persona} avatarState={avatarState} elapsedSeconds={props.totalElapsed || props.elapsedSeconds} currentIndex={props.currentIndex} totalQuestions={props.totalQuestions} />
        <CandidateWebcam cameraPreviewRef={props.cameraPreviewRef} cameraReady={props.cameraReady} cameraEnabled={props.cameraEnabled} />
        <AnimatePresence>
          {props.isEvaluating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-950/70 px-4 py-2 text-xs font-black uppercase tracking-wider text-cyan-100 backdrop-blur-xl">
              <Brain className="h-4 w-4 animate-pulse" /> Analyzing Response...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <InterviewTranscript questionText={questionText} voiceTranscript={props.voiceTranscript} voiceInterim={props.voiceInterim} isListening={props.isListening} isSpeaking={props.isSpeaking} />
        <InterviewControls cameraEnabled={props.cameraEnabled} micEnabled={props.micEnabled} onCameraToggle={props.onCameraToggle} onMicToggle={props.onMicToggle} onEndInterview={props.onEndInterview} onSubmitAnswer={props.onSubmitAnswer} onRepeat={repeatQuestion} />
      </div>

      <div className="mt-4">
        <InterviewAnalytics liveWpm={liveWpm} fillerWords={fillerWords} audioLevel={audioLevel} emotionSnapshot={props.emotionSnapshot} isEvaluating={props.isEvaluating} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
        <Activity className="h-3.5 w-3.5" /> Three.js avatar engine with VRM-ready scene boundaries
      </div>
    </div>
  )
}

export default function VideoInterviewRoom(props) {
  return <InterviewRoom {...props} />
}
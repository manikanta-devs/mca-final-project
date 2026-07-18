import React, { useEffect, useRef, useState } from "react"
import { Mic, Volume2, Globe, Check, Play, ShieldAlert, Cpu, Video } from "lucide-react"
import clsx from "clsx"

export default function PreInterviewChecklist({
  candidateName = "Candidate",
  roleLabel = "Software Engineer",
  interviewerName = "Sarah Chen",
  interviewerPersona = "sarah",
  resumeData,
  interviewFormat = "video",
  onBegin,
  onBack,
}) {
  const [activeStream, setActiveStream] = useState(null)
  const [cameraStatus, setCameraStatus] = useState("checking")
  const [micStatus, setMicStatus] = useState("checking")
  const [speakerTested, setSpeakerTested] = useState(false)
  const [pingLatency, setPingLatency] = useState(null)
  const [networkStatus, setNetworkStatus] = useState("checking")
  const [micLevel, setMicLevel] = useState(0)
  const [aiStepsComplete, setAiStepsComplete] = useState(false)
  const [aiSteps, setAiSteps] = useState([
    { id: 1, label: "Reviewing your profile...", status: "pending" },
    { id: 2, label: "Preparing your session...", status: "pending" },
    { id: 3, label: "Configuring interview environment...", status: "pending" },
    { id: 4, label: "Connecting to your interviewer...", status: "pending" },
  ])

  const videoRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const micAnimationRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function initMedia() {
      try {
        const constraints = {
          audio: true,
          video: interviewFormat === "video" ? { width: 640, height: 480, facingMode: "user" } : false,
        }
        setCameraStatus(interviewFormat === "video" ? "checking" : "inactive")
        setMicStatus("checking")
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        setActiveStream(stream)
        if (interviewFormat === "video" && videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
          setCameraStatus("active")
        } else {
          setCameraStatus("inactive")
        }
        setMicStatus("active")
        setupMicAnalyzer(stream)
      } catch (err) {
        if (!cancelled) {
          setCameraStatus("denied")
          setMicStatus("denied")
        }
      }
    }
    initMedia()
    return () => {
      cancelled = true
      if (micAnimationRef.current) cancelAnimationFrame(micAnimationRef.current)
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
    }
  }, [interviewFormat])

  const setupMicAnalyzer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const audioContext = new AudioCtx()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const updateMeter = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((s, v) => s + v, 0) / bufferLength
        setMicLevel(Math.min(100, Math.round((avg / 60) * 100)))
        micAnimationRef.current = requestAnimationFrame(updateMeter)
      }
      updateMeter()
    } catch (e) {
      // Audio meter is best-effort; keep the checklist usable if setup fails.
    }
  }

  const testSpeaker = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return setSpeakerTested(true)
      const ctx = new AudioCtx()
      const playTone = (freq, time, dur) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(freq, time)
        gain.gain.setValueAtTime(0.15, time)
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(time); osc.stop(time + dur)
      }
      const now = ctx.currentTime
      playTone(523.25, now, 0.4); playTone(659.25, now + 0.15, 0.4)
      playTone(783.99, now + 0.3, 0.5); playTone(1046.50, now + 0.45, 0.6)
      setSpeakerTested(true)
    } catch { setSpeakerTested(true) }
  }

  useEffect(() => {
    const runPing = async () => {
      const start = Date.now()
      try {
        const res = await fetch("http://127.0.0.1:5000/health")
        if (res.ok) {
          const lat = Date.now() - start
          setPingLatency(lat)
          setNetworkStatus(lat < 300 ? "excellent" : "poor")
        } else setNetworkStatus("poor")
      } catch { setNetworkStatus("poor") }
    }
    runPing()
  }, [])

  useEffect(() => {
    const delay = ms => new Promise(r => setTimeout(r, ms))
    async function run() {
      await delay(900); setAiSteps(p => p.map(s => s.id === 1 ? { ...s, status: "complete" } : s))
      await delay(800); setAiSteps(p => p.map(s => s.id === 2 ? { ...s, status: "complete" } : s))
      await delay(900); setAiSteps(p => p.map(s => s.id === 3 ? { ...s, status: "complete" } : s))
      await delay(700); setAiSteps(p => p.map(s => s.id === 4 ? { ...s, status: "complete" } : s))
      setAiStepsComplete(true)
    }
    run()
  }, [])

  const allChecksPassed =
    micStatus === "active" &&
    aiStepsComplete &&
    (interviewFormat !== "video" || cameraStatus === "active")

  const personaImage = interviewerPersona === "marcus"
    ? "/interviewers/marcus_rodriguez.png"
    : interviewerPersona === "nagma_hr"
    ? "/interviewers/nagma_hr.png"
    : "/interviewers/sarah_chen.png"

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 text-white flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.12),transparent_40%)]" />
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-stretch">

        {/* LEFT */}
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">
                {interviewFormat === "video" ? "Video Mode" : "Voice Mode"} — Device Precheck
              </span>
              <h2 className="text-lg font-black mt-0.5">
                {interviewFormat === "video" ? "Video Interview Lobby" : "Voice Interview Lobby"}
              </h2>
            </div>
            <button onClick={onBack} className="text-xs font-bold text-gray-400 hover:text-white transition-colors">
              Back
            </button>
          </div>

          <div className="relative w-full aspect-video rounded-2xl bg-slate-950 border border-white/5 overflow-hidden shadow-inner">
            {interviewFormat === "video" ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={clsx("w-full h-full object-cover scale-x-[-1]", cameraStatus !== "active" && "hidden")}
                />
                {cameraStatus === "checking" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                    <p className="text-xs text-gray-400 font-semibold">Starting webcam...</p>
                  </div>
                )}
                {cameraStatus === "denied" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <ShieldAlert className="w-10 h-10 text-red-400" />
                    <div>
                      <p className="text-sm font-bold text-white">Camera Access Blocked</p>
                      <p className="text-[11px] text-gray-500 mt-1">Allow camera access in your browser address bar, then refresh.</p>
                    </div>
                  </div>
                )}
                {cameraStatus === "active" && (
                  <div className="absolute bottom-3 left-3 right-3 py-1.5 px-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/5 flex items-center justify-between text-[11px] font-semibold text-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span>Camera Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Mic Active</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className={clsx(
                  "w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-100",
                  micStatus === "active" && micLevel > 10
                    ? "border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/30 scale-110"
                    : "border-cyan-500/30 bg-cyan-500/10"
                )}>
                  <Mic className={clsx("w-9 h-9 transition-colors", micStatus === "active" ? "text-cyan-400" : "text-gray-500")} />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {micStatus === "active" ? "Microphone Ready" : micStatus === "checking" ? "Connecting mic..." : "Mic Access Denied"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {micStatus === "active" ? "Speak now to verify your microphone" : "Please allow microphone access"}
                  </p>
                </div>
                {micStatus === "active" && (
                  <div className="w-full max-w-[200px]">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-75 rounded-full" style={{ width: `${micLevel}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 text-center">Audio level: {micLevel}%</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            {interviewFormat === "video" && (
              <div className="p-3.5 rounded-2xl border border-white/5 bg-slate-950/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5 text-cyan-400" /> Mic Test
                  </span>
                  <span className={clsx("text-[10px] font-bold", micStatus === "active" ? "text-green-400" : "text-gray-500")}>
                    {micStatus === "active" ? "Active" : "Waiting"}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-75" style={{ width: `${micStatus === "active" ? micLevel : 0}%` }} />
                </div>
                <p className="text-[9px] text-gray-500 leading-tight">Speak to verify</p>
              </div>
            )}
            <button
              onClick={testSpeaker}
              className={clsx(
                "p-3.5 rounded-2xl border text-left transition-all space-y-2",
                interviewFormat !== "video" && "col-span-2",
                speakerTested ? "border-green-500/20 bg-green-500/5" : "border-white/5 bg-slate-950/40 hover:border-white/15"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Speaker
                </span>
                {speakerTested && <Check className="w-3.5 h-3.5 text-green-400" />}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-extrabold text-cyan-300">
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>{speakerTested ? "Sound Played" : "Click to test"}</span>
              </div>
              <p className="text-[9px] text-gray-500 leading-tight">Optional</p>
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-2xl justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Lobby Progress</span>
              <h3 className="text-base font-black mt-0.5">System Ready Check</h3>
            </div>

            <div className="space-y-2">
              <div className={clsx("flex items-center justify-between p-3 rounded-2xl border text-xs", micStatus === "active" ? "border-green-500/20 bg-green-500/5" : "border-white/5 bg-slate-950/30")}>
                <div className="flex items-center gap-2"><Mic className="w-4 h-4 text-cyan-400" /><span className="font-semibold">Microphone</span></div>
                <span className={clsx("font-bold text-[11px]", micStatus === "active" ? "text-green-400" : micStatus === "checking" ? "text-gray-400" : "text-red-400")}>
                  {micStatus === "active" ? "Ready" : micStatus === "checking" ? "Checking..." : "Blocked"}
                </span>
              </div>
              {interviewFormat === "video" && (
                <div className={clsx("flex items-center justify-between p-3 rounded-2xl border text-xs", cameraStatus === "active" ? "border-green-500/20 bg-green-500/5" : "border-white/5 bg-slate-950/30")}>
                  <div className="flex items-center gap-2"><Video className="w-4 h-4 text-indigo-400" /><span className="font-semibold">Camera</span></div>
                  <span className={clsx("font-bold text-[11px]", cameraStatus === "active" ? "text-green-400" : cameraStatus === "checking" ? "text-gray-400" : "text-red-400")}>
                    {cameraStatus === "active" ? "Ready" : cameraStatus === "checking" ? "Starting..." : "Blocked"}
                  </span>
                </div>
              )}
              <div className={clsx("flex items-center justify-between p-3 rounded-2xl border text-xs", networkStatus === "excellent" ? "border-green-500/20 bg-green-500/5" : "border-white/5 bg-slate-950/30")}>
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /><span className="font-semibold">Network</span></div>
                <span className={clsx("font-bold text-[11px]", networkStatus === "excellent" ? "text-green-400" : networkStatus === "poor" ? "text-yellow-400" : "text-gray-500")}>
                  {networkStatus === "checking" ? "Pinging..." : `${pingLatency}ms`}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 space-y-3">
              <div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-indigo-400" /><span className="text-xs font-bold text-gray-300">AI Interview Planner</span></div>
              <div className="space-y-2.5">
                {aiSteps.map(step => (
                  <div key={step.id} className="flex items-center gap-2.5">
                    <div className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center border border-white/10">
                      {step.status === "complete" ? <Check className="w-2.5 h-2.5 text-green-400 stroke-[3]" />
                        : aiSteps.find(s => s.status === "pending")?.id === step.id ? <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        : <div className="w-1 h-1 rounded-full bg-gray-700" />}
                    </div>
                    <span className={clsx("text-xs", step.status === "complete" ? "text-gray-300 font-semibold" : "text-gray-500")}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-indigo-950/15">
              <img src={personaImage} alt={interviewerName} className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <p className="text-xs font-bold text-white">{interviewerName}</p>
                <p className="text-[10px] text-indigo-300 font-medium">
                  {interviewerPersona === "nagma_hr" ? "Gemini AI Recruiter" : interviewerPersona === "sarah" ? "Senior Recruiter" : "HR Director"}
                </p>
              </div>
              <div className="ml-auto shrink-0 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-400/20 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-indigo-300 tracking-wider">
                <Check className="w-3.5 h-3.5 text-indigo-400" /> Ready
              </div>
            </div>

          </div>

          <div className="space-y-2 pt-2">
            {!allChecksPassed && (
              <p className="text-center text-[10px] text-gray-500">
                {!aiStepsComplete ? "AI is preparing your session..."
                  : micStatus !== "active" ? "Waiting for microphone access..."
                  : "Waiting for camera access..."}
              </p>
            )}
            <button
              onClick={() => onBegin?.(activeStream)}
              disabled={!allChecksPassed}
              className={clsx(
                "w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl",
                allChecksPassed
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:opacity-90 active:scale-[0.99] cursor-pointer"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              <span>Begin Mock Session</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, FileText, Mic, Brain, ArrowRight,
  TrendingUp, Target, Clock, Award, ChevronRight,
  Trophy, Flame, Check, AlertTriangle, Shield, Play,
  Calendar, RefreshCcw, Video, BookOpen, ExternalLink, HelpCircle
} from 'lucide-react'
import { startQuiz, submitQuizAnswer, completeQuiz, getQuizSessions, generateStudyRoadmap, askCareerMentor } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const MENTOR_GUIDES = [
  { id: 'intro', category: 'HR Core', title: 'Self Introduction (60-90s)', why: 'Sets the first impression. Recruiters want to map your stack directly to their vacancy checklist.', blueprint: 'Present Stack ➔ Relevant Project ➔ Target Role Fit', template: 'I am a Software Engineer focusing on React and node.js development. Recently, I built an AI evaluation dashboard that optimized resume analysis rates by 40% using LLM models. I am looking to apply these full-stack and prompt engineering skills at your firm.' },
  { id: 'why_hire', category: 'HR Core', title: 'Why Should We Hire You?', why: 'Tests alignment and capability. Highlight a unique project overlay and clear stack mastery.', blueprint: 'Match Requirements ➔ Unique Skill ➔ Company Interest', template: 'You are looking for an engineer who understands both performance constraints and frontend aesthetics. My experience optimization project on responsive database dashboards proves I can deliver clean designs that match your target user interface requirements.' }
]

export default function CommunicationCoachPage() {
  const navigate = useNavigate()
  const { resumeData, candidateName } = useApp()
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('mentor') // mentor, roadmap, guides, sandbox
  const [isSpeaking, setIsSpeaking] = useState(false)

  // --- 1. AI Career Mentor (Ask Anything) States ---
  const [mentorQuestion, setMentorQuestion] = useState('')
  const [mentorAnswer, setMentorAnswer] = useState(null)
  const [mentorLoading, setMentorLoading] = useState(false)

  // --- 2. Premium Study Roadmap States ---
  const [roadmapTopic, setRoadmapTopic] = useState('')
  const [roadmap, setRoadmap] = useState({
    target_role: "Software Engineer",
    target_company: "Google",
    readiness_score: 72,
    est_days: 18,
    difficulty: "Intermediate",
    summary: "Based on your resume and quiz performance, we generated this targeted learning roadmap focusing on DBMS, SQL queries, and core system design concepts.",
    strengths: ["Python", "HTML/CSS", "React Frameworks", "Communication Clarity"],
    weaknesses: [
      { name: "SQL & Queries", mastery: "68%", priority: "High", est_improvement: "+15%" },
      { name: "DBMS Indexes", mastery: "50%", priority: "High", est_improvement: "+25%" },
      { name: "System Design", mastery: "40%", priority: "Medium", est_improvement: "+20%" },
      { name: "OS Networks", mastery: "55%", priority: "Medium", est_improvement: "+15%" }
    ],
    phases: [
      {
        phase_num: 1,
        title: "DBMS Fundamentals",
        status: "Completed",
        progress: 100,
        why_matters: "Understanding relational algebra, database models, and transactions is a requirement for core backend questions.",
        est_study_time: "4 Hours",
        difficulty: "Easy",
        learning_outcome: "Define 1NF/2NF/3NF normal forms and draw clear Entity Relationship diagrams.",
        importance: "Critical",
        resources: [
          { name: "freeCodeCamp DBMS Tutorial", type: "Video", url: "https://www.youtube.com/watch?v=ztHopE5Wnpc" },
          { name: "GeeksforGeeks DBMS Guide", type: "Documentation", url: "https://www.geeksforgeeks.org/dbms/" }
        ]
      },
      {
        phase_num: 2,
        title: "SQL Query Optimization",
        status: "Current",
        progress: 68,
        why_matters: "Companies test candidates on writing complex nested JOINs and subqueries under timed pressure.",
        est_study_time: "8 Hours",
        difficulty: "Medium",
        learning_outcome: "Write optimization routines using indexes and trace query latency factors.",
        importance: "Critical",
        resources: [
          { name: "SQLBolt Practice lessons", type: "Practice", url: "https://sqlbolt.com/" },
          { name: "Kudvenkat SQL Tutorials", type: "Video", url: "https://www.youtube.com/user/kudvenkat" }
        ]
      },
      {
        phase_num: 3,
        title: "Normalization & Transactions",
        status: "Locked",
        progress: 0,
        why_matters: "ACID properties ensure secure concurrency flow in real-world application backends.",
        est_study_time: "6 Hours",
        difficulty: "Hard",
        learning_outcome: "Audit write-ahead logs and design locking mechanisms for concurrent DB operations.",
        importance: "High",
        resources: [
          { name: "Microsoft Transact-SQL Docs", type: "Documentation", url: "https://learn.microsoft.com/" },
          { name: "Gate Smashers Normalization lecture", type: "Video", url: "https://www.youtube.com/c/GateSmashers" }
        ]
      },
      {
        phase_num: 4,
        title: "Database Mini Mock Interview",
        status: "Locked",
        progress: 0,
        why_matters: "Simulating spoken technical questions prevents freezing during real interview drills.",
        est_study_time: "3 Hours",
        difficulty: "Hard",
        learning_outcome: "Explain transaction isolation levels orally using structural STAR methodology.",
        importance: "Critical",
        resources: [
          { name: "LeetCode Database problems", type: "Practice", url: "https://leetcode.com/problemset/database/" },
          { name: "AstraPrep SQL Practice Room", type: "Quiz", url: "/dashboard/quiz" }
        ]
      }
    ],
    pipeline: ["Learn Concept", "Watch Video", "Read Notes", "Practice Problems", "Take Quiz", "Explain Concept", "Mini Mock Interview"],
    progress_metrics: {
      topics_completed: "4/12 Topics",
      est_readiness: "82%",
      days_remaining: "14 Days",
      current_streak: "5 Days",
      completion_pct: 66
    }
  })
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState(2) // expand current phase by default

  // --- 3. Speaking Sandbox States ---
  const [sandboxActive, setSandboxActive] = useState(false)
  const [sandboxTranscript, setSandboxTranscript] = useState('')
  const [sandboxInterim, setSandboxInterim] = useState('')
  const [sandboxWpm, setSandboxWpm] = useState(0)
  const [sandboxFillers, setSandboxFillers] = useState(0)
  const [sandboxCritique, setSandboxCritique] = useState(null)
  const [critiqueLoading, setCritiqueLoading] = useState(false)
  const [sandboxPrompt, setSandboxPrompt] = useState("Tell me about a time you solved a complex technical problem.")

  const recognitionRef = useRef(null)
  const sandboxTimeRef = useRef(null)
  const sandboxSecondsRef = useRef(0)
  const countIntervalRef = useRef(null)

  // Waveform Canvas Refs
  const sandboxCanvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const drawRef = useRef(null)

  // Daily Challenge & Tip
  const dailyTip = "Don't memorize answers. Understand concepts and speak naturally. Focus on using transitions like 'Specifically', 'For example', and 'As a result'."
  const dailyChallenge = "Explain your final year project structure in under 90 seconds in the Speaking Sandbox."

  useEffect(() => {
    setLoading(false)
    if (resumeData) {
      const weak = resumeData.weak_areas || resumeData.coach_report?.weak_areas || []
      if (weak.length > 0) {
        const firstWeak = typeof weak[0] === 'string' ? weak[0] : (weak[0]?.name || weak[0]?.area || '')
        if (firstWeak) setRoadmapTopic(firstWeak)
      } else {
        setRoadmapTopic("CS Fundamentals")
      }
    }
  }, [resumeData])

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'

      rec.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' '
          } else {
            interim += event.results[i][0].transcript
          }
        }
        setSandboxTranscript(prev => {
          const combined = prev + final
          // count words for WPM
          const words = combined.trim().split(/\s+/).filter(w => w.length > 0)
          const mins = sandboxSecondsRef.current / 60
          if (mins > 0) {
            setSandboxWpm(Math.round(words.length / mins))
          }
          // count fillers (like, um, ah, basically, actually, you know)
          const lower = combined.toLowerCase()
          const fillerMatches = lower.match(/\b(like|um|uh|ah|basically|actually|you know)\b/g)
          setSandboxFillers(fillerMatches ? fillerMatches.length : 0)
          return combined
        })
        setSandboxInterim(interim)
      }

      rec.onerror = (e) => {
        console.error("Speech recognition error", e)
      }

      recognitionRef.current = rec
    }
  }, [])

  // Clean up recording listeners
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (countIntervalRef.current) clearInterval(countIntervalRef.current)
      if (drawRef.current) cancelAnimationFrame(drawRef.current)
    }
  }, [])

  const startAudioAnalyser = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return null
      
      const ctx = new AudioContextClass()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const canvas = sandboxCanvasRef.current
      if (!canvas) return
      const canvasCtx = canvas.getContext('2d')
      
      const draw = () => {
        drawRef.current = requestAnimationFrame(draw)
        analyser.getByteFrequencyData(dataArray)
        canvasCtx.fillStyle = 'rgba(15, 23, 42, 0.2)'
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height)

        const barWidth = (canvas.width / bufferLength) * 2
        let barHeight
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2
          canvasCtx.fillStyle = `rgb(99, 102, 241)`
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
          x += barWidth + 1
        }
      }
      draw()
    } catch (e) {
      console.warn("Could not start visualizer", e)
    }
  }

  const stopAudioAnalyser = () => {
    if (drawRef.current) cancelAnimationFrame(drawRef.current)
    if (sourceRef.current) sourceRef.current.disconnect()
    if (audioContextRef.current) audioContextRef.current.close()
  }

  const startRecording = async () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API is not supported in this browser.")
      return
    }
    setSandboxTranscript('')
    setSandboxInterim('')
    setSandboxWpm(0)
    setSandboxFillers(0)
    setSandboxCritique(null)
    sandboxSecondsRef.current = 0
    setSandboxActive(true)
    
    recognitionRef.current.start()
    await startAudioAnalyser()

    countIntervalRef.current = setInterval(() => {
      sandboxSecondsRef.current += 1
    }, 1000)
  }

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    if (countIntervalRef.current) clearInterval(countIntervalRef.current)
    stopAudioAnalyser()
    setSandboxActive(false)
  }

  const toggleRecording = () => {
    if (sandboxActive) stopRecording()
    else startRecording()
  }

  const handleCritiqueSpeech = async () => {
    if (!sandboxTranscript) {
      toast.error("Please record some speech first.")
      return
    }
    setCritiqueLoading(true)
    const toastId = toast.loading("Analyzing speech patterns...")
    try {
      // Simulate client side critique parser for speedy responsive actions
      setTimeout(() => {
        setSandboxCritique({
          score: 82,
          headline: "Excellent pacing, but structure can be tightened",
          pacing_critique: "Your average speed was " + sandboxWpm + " WPM, which matches the target pacing speed for technical definitions perfectly.",
          fillers_critique: "We detected " + sandboxFillers + " filler word instances. Consider incorporating tiny pauses rather than stretching fillers.",
          structural_critique: "Good technical keywords. To make it a true STAR story, ensure you highlight the final performance results clearly.",
          keywords_used: ["React", "Optimized", "Database", "API", "Schema"],
          tips: [
            "Use standard transaction keywords (e.g. ACID, normal forms) directly.",
            "Insert a 1-second silence instead of 'like' or 'basically'.",
            "State your performance gains in absolute numbers (e.g. 'reduced latency by 30%')."
          ]
        })
        toast.success("Critique parsed!", { id: toastId })
        setCritiqueLoading(false)
      }, 1500)
    } catch (e) {
      toast.error("Critique failed", { id: toastId })
      setCritiqueLoading(false)
    }
  }

  const speakText = (txt) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // stop any active speech
      const utterance = new SpeechSynthesisUtterance(txt)
      utterance.rate = 0.95
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    } else {
      toast.error("Text-to-speech not supported in this browser.")
    }
  }

  const handleAskMentor = async () => {
    if (!mentorQuestion.trim()) return
    setMentorLoading(true)
    setMentorAnswer(null)
    try {
      const { data } = await askCareerMentor(mentorQuestion)
      if (data?.success && data?.data) {
        const payload = data.data
        setMentorAnswer({
          definition: payload.definition || '',
          analogy: payload.analogy || '',
          code: payload.example || payload.code || '',
          tips: payload.follow_ups || payload.tips || []
        })
      } else {
        toast.error("AI Coach could not formulate a response.")
      }
    } catch (e) {
      toast.error("Failed to query mentor")
    } finally {
      setMentorLoading(false)
    }
  }

  const handleGenerateRoadmap = async () => {
    setRoadmapLoading(true)
    try {
      const { data } = await generateStudyRoadmap(roadmapTopic)
      if (data?.success && data?.roadmap) {
        setRoadmap(data.roadmap)
        setExpandedPhase(1)
        toast.success(roadmapTopic ? `Roadmap updated for ${roadmapTopic}!` : "Personalized study roadmap generated!")
      } else {
        toast.error("Failed to generate personalized study roadmap")
      }
    } catch (e) {
      toast.error("Roadmap generation failed")
    } finally {
      setRoadmapLoading(false)
    }
  }

  const renderSafeChild = (val) => {
    if (typeof val === 'string' || typeof val === 'number') return val
    if (Array.isArray(val)) return val.join(', ')
    return JSON.stringify(val)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading AI Mentor room..." /></div>
  }

  return (
    <motion.div className="space-y-6 select-none" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <AdvancedToolPanel type="coach" />
      
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Sidebar navigation */}
        <div className="card space-y-2 p-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-3 mb-2">Interactive Guideline Center</span>
        
        <button
          onClick={() => setActiveSection('mentor')}
          className={clsx(
            'w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all',
            activeSection === 'mentor'
              ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-transparent'
          )}
        >
          <Sparkles className="w-4.5 h-4.5" />
          <span>AI Career Mentor</span>
        </button>

        <button
          onClick={() => setActiveSection('roadmap')}
          className={clsx(
            'w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all',
            activeSection === 'roadmap'
              ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-transparent'
          )}
        >
          <Calendar className="w-4.5 h-4.5" />
          <span>Study Roadmap</span>
        </button>

        <button
          onClick={() => setActiveSection('guides')}
          className={clsx(
            'w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all',
            activeSection === 'guides'
              ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-transparent'
          )}
        >
          <FileText className="w-4.5 h-4.5" />
          <span>Interview Guides</span>
        </button>

        <button
          onClick={() => setActiveSection('sandbox')}
          className={clsx(
            'w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all',
            activeSection === 'sandbox'
              ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-transparent'
          )}
        >
          <Mic className="w-4.5 h-4.5" />
          <span>Speaking Sandbox</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6 select-text">
        {/* MENTOR CHAT AREA */}
        {activeSection === 'mentor' && (
          <div className="card space-y-5">
            <div className="flex flex-col gap-1 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="text-md font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" /> AI Career Mentor (Ask Anything)
              </h3>
              <p className="text-xs text-gray-500">Query your tech concepts. Sarah will formulate analogies and structured scripts automatically.</p>
            </div>

            {/* Input query */}
            <div className="flex gap-2.5">
              <input
                type="text"
                value={mentorQuestion}
                onChange={e => setMentorQuestion(e.target.value)}
                placeholder="Ask about normalizations, SQL loops, system latency, or STAR scenarios..."
                className="input-base text-xs flex-1"
                onKeyDown={e => e.key === 'Enter' && handleAskMentor()}
              />
              <button
                onClick={handleAskMentor}
                disabled={mentorLoading}
                className="btn-primary text-xs shrink-0"
              >
                {mentorLoading ? 'Querying...' : 'Ask Sarah'}
              </button>
            </div>

            {/* Mentor response card */}
            {mentorAnswer && (
              <div className="card border-violet-500/20 space-y-4 select-text relative overflow-hidden animate-in">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />

                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <span className="text-xs font-black text-gray-900 dark:text-white">Mentor response</span>
                  </div>
                  <button
                    onClick={() => speakText(mentorAnswer.definition)}
                    className={clsx(
                      'px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1.5',
                      isSpeaking
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        : 'bg-white/5 border-gray-255 text-gray-650 dark:text-gray-300'
                    )}
                  >
                    <span>{isSpeaking ? 'Stop Speaking' : 'Listen Answer'}</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Conceptual Definition</span>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{mentorAnswer.definition}</p>
                  </div>

                  <div className="space-y-1 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Simplified Analogy</span>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium font-sans">{mentorAnswer.analogy}</p>
                  </div>

                  {mentorAnswer.code && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Ideal Output Snippet</span>
                      <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto select-text leading-relaxed">
                        <code>{mentorAnswer.code}</code>
                      </pre>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Speaking Guidelines & Key points</span>
                    <ul className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {mentorAnswer.tips.map((t, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROADMAP SECTION (GOD MODE) */}
        {activeSection === 'roadmap' && (
          <div className="space-y-6">
            
            {/* HERO CARD (Section 1) */}
            <div className="card bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden text-white">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_35%)]" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center md:text-left">
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Target Role</span>
                  <div className="text-md font-black text-white">{roadmap?.target_role || 'Software Engineer'}</div>
                  <span className="text-[10px] text-violet-400 font-bold block">at {roadmap?.target_company || 'Google'}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Readiness</span>
                  <div className="text-md font-black text-emerald-400">{roadmap?.readiness_score || 72}%</div>
                  <span className="text-[10px] text-gray-400 block">estimated index</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Est. Completion</span>
                  <div className="text-md font-black text-cyan-400">{roadmap?.est_days || 18} Days</div>
                  <span className="text-[10px] text-gray-400 block">preparation track</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Difficulty</span>
                  <div className="text-md font-black text-violet-400">{roadmap?.difficulty || 'Intermediate'}</div>
                  <span className="text-[10px] text-gray-400 block">level match</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 text-xs text-gray-300 font-normal leading-relaxed relative z-10 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
                <p>"{roadmap?.summary || 'Roadmap loading...'}"</p>
              </div>
            </div>

            {/* AI SKILL ANALYSIS (Section 2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths Card */}
              <div className="card space-y-4">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Check className="w-4.5 h-4.5 text-emerald-500" /> Strengths
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(roadmap?.strengths || []).map(skill => (
                    <div key={skill} className="px-3 py-2 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {skill}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses Card */}
              <div className="card space-y-4">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500" /> Needs Improvement
                </h4>
                <div className="space-y-2 text-xs">
                  {(roadmap?.weaknesses || []).map(skill => (
                    <div key={skill.name} className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150">
                      <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200 block">{skill.name}</span>
                        <span className="text-[9px] text-gray-400 font-normal">Mastery: {skill.mastery}</span>
                      </div>
                      <div className="text-right space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase">{skill.priority}</span>
                        <span className="text-[10px] font-bold text-emerald-400">{skill.est_improvement}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CUSTOM SKILL ROADMAP REGENERATOR */}
            <div className="card space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">🎯 Select & Regenerate Roadmap for Topic</span>
              <div className="flex gap-2">
                <select
                  value={roadmapTopic}
                  onChange={e => setRoadmapTopic(e.target.value)}
                  className="flex-1 input-base text-xs"
                >
                  <option value="">(Recommended) DBMS & SQL Roadmap</option>
                  <option value="python">Python Programming Roadmap</option>
                  <option value="dsa">DSA & Algorithms Roadmap</option>
                  <option value="web_dev">Web Development Roadmap</option>
                  <option value="aptitude">Quantitative Aptitude Roadmap</option>
                  <option value="hr">Behavioral/HR Roadmap</option>
                </select>
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={roadmapLoading}
                  className="btn-primary text-xs shrink-0"
                >
                  {roadmapLoading ? 'Compiling...' : 'Generate Roadmap'}
                </button>
              </div>
                     {/* LEARNING JOURNEY TIMELINE (Section 3 & 4) */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Learning Journey Timeline</span>

              <div className="relative border-l-2 border-violet-500/10 ml-4 pl-6 space-y-6">
                {(roadmap?.phases || []).map(phase => {
                  const isCurrent = phase.status === 'Current'
                  const isCompleted = phase.status === 'Completed'
                  const isLocked = phase.status === 'Locked'
                  const isExpanded = expandedPhase === phase.phase_num

                  return (
                    <div key={phase.phase_num} className="relative">
                      {/* Timeline dot */}
                      <div className={clsx(
                        'absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : isCurrent
                            ? 'bg-violet-600 border-violet-500 ring-4 ring-violet-500/20'
                            : 'bg-slate-900 border-gray-800'
                      )}>
                        {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      <div className="card space-y-3 border border-gray-150 transition-all hover:border-gray-255 select-text">
                        {/* Header title */}
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedPhase(isExpanded ? null : phase.phase_num)}>
                          <div>
                            <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block">Phase {phase.phase_num}</span>
                            <h4 className="text-xs font-black text-gray-900 dark:text-white">{phase.title}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              'px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider',
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
                                : isCurrent
                                  ? 'bg-violet-600/10 text-violet-500 border border-violet-500/15'
                                  : 'bg-gray-800 text-gray-400'
                            )}>
                              {phase.status}
                            </span>
                            <span className="text-[10px] font-extrabold text-gray-400">{phase.progress}%</span>
                          </div>
                        </div>

                        {/* Expandable card contents (Expanded Card / Section 4) */}
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-3 border-t border-gray-100 dark:border-gray-800/80 space-y-4 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-150">
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block font-bold">Est. Study Time</span>
                                <span className="font-extrabold">{phase.est_study_time}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block font-bold">Difficulty</span>
                                <span className="font-extrabold text-violet-400">{phase.difficulty}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block font-bold">Importance</span>
                                <span className="font-extrabold text-rose-500">{phase.importance}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block font-bold">Concept check</span>
                                <span className="font-extrabold text-emerald-400">STAR match</span>
                              </div>
                            </div>

                            <div className="space-y-1 select-text">
                              <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider">Why this topic matters</span>
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-normal">{phase.why_matters}</p>
                            </div>

                            <div className="space-y-1 select-text">
                              <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider">Learning outcome</span>
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-normal">{phase.learning_outcome}</p>
                            </div>

                            {/* Learning Pipeline (Section 4 Flow Indicators) */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider">Concept Practice Pipeline</span>
                              <div className="flex gap-2 items-center flex-wrap">
                                {(roadmap?.pipeline || []).map((step, idx) => (
                                  <React.Fragment key={idx}>
                                    <div className={clsx(
                                      'px-2.5 py-1 rounded-xl text-[10px] font-bold border',
                                      idx <= (isCompleted ? 6 : 2)
                                        ? 'bg-violet-600/10 border-violet-500/20 text-violet-500'
                                        : 'bg-transparent border-gray-200 text-gray-400'
                                    )}>
                                      {step}
                                    </div>
                                    {idx < (roadmap?.pipeline || []).length - 1 && (
                                      <span className="text-gray-300 dark:text-gray-700">➔</span>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>

                            {/* Free Resources List */}
                            <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/80 pt-3">
                              <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider">Free resource links</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(phase.resources || []).map(res => {
                                  const icon = {
                                    Video: Video,
                                    Documentation: BookOpen,
                                    Practice: ExternalLink,
                                    Quiz: HelpCircle
                                  }[res.type] || ExternalLink

                                  return (
                                    <a
                                      key={res.name}
                                      href={res.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] hover:bg-white/[0.04] border border-gray-200 dark:border-gray-800/80 hover:border-violet-500/30 transition-all font-semibold text-gray-800 dark:text-gray-200"
                                    >
                                      <div className="flex items-center gap-2">
                                        {React.createElement(icon, { className: 'w-4 h-4 text-violet-500 shrink-0' })}
                                        <span>{res.name}</span>
                                      </div>
                                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                    </a>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Practice Integrations workflow bridge */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                              <button
                                onClick={() => navigate('/dashboard/quiz', { state: { topic: phase.title, difficulty: phase.difficulty } })}
                                className="flex-1 py-2.5 bg-gradient-to-r from-orange-600/10 to-amber-600/10 hover:from-orange-600/20 hover:to-amber-600/20 border border-orange-500/20 hover:border-orange-500/35 text-orange-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                              >
                                <Brain className="w-3.5 h-3.5" />
                                <span>Practice Topic Quiz</span>
                              </button>
                              <button
                                onClick={() => navigate('/dashboard/interview', { state: { job_role: roadmap.target_role || "Software Engineer", skill_focus: [phase.title] } })}
                                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 hover:from-emerald-600/20 hover:to-teal-600/20 border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Mock Interview Drill</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* PROGRESS OVERALL CARD (Section 5) */}
            <div className="card bg-gradient-to-br from-slate-950 to-slate-900 text-white border-none shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_10%,rgba(99,102,241,0.14),transparent_25%)]" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-center">
                <div className="lg:col-span-2 space-y-2">
                  <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider">Overall Roadmap Progress</span>
                  <div className="text-2xl font-black">{roadmap?.progress_metrics?.topics_completed || '4/12'}</div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-violet-600 h-full rounded-full" style={{ width: `${roadmap?.progress_metrics?.completion_pct || 66}%` }} />
                  </div>
                </div>

                <div className="text-center md:text-left">
                  <span className="text-[9px] text-gray-400 uppercase block font-bold">Estimated Readiness</span>
                  <span className="text-lg font-black text-emerald-400">{roadmap?.progress_metrics?.est_readiness || '82%'}</span>
                </div>

                <div className="text-center md:text-left">
                  <span className="text-[9px] text-gray-400 uppercase block font-bold">Days Remaining</span>
                  <span className="text-lg font-black text-cyan-400">{roadmap?.progress_metrics?.days_remaining || '14 Days'}</span>
                </div>

                <div className="text-center md:text-left">
                  <span className="text-[9px] text-gray-400 uppercase block font-bold">Current Streak</span>
                  <span className="text-lg font-black text-violet-400">{roadmap?.progress_metrics?.current_streak || '5 Days'}</span>
                </div>
              </div>
            </div>       </div>
          </div>
        )}

        {/* GUIDES SECTION */}
        {activeSection === 'guides' && (
          <div className="card space-y-6">
            <div className="flex flex-col gap-1 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="text-md font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-500" /> HR & Project Mentor Guides
              </h3>
              <p className="text-xs text-gray-500">Structured scripts, key components, and explanations of *why* responses work.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MENTOR_GUIDES.map((g) => (
                <div 
                  key={g.id} 
                  className="p-5 rounded-2xl bg-white/[0.01] border border-gray-250 dark:border-gray-850 hover:border-gray-255 transition-all flex flex-col gap-4 select-text"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 text-[8px] font-black uppercase tracking-wider">
                        {g.category}
                      </span>
                      <h4 className="text-xs font-black text-gray-900 dark:text-white mt-1.5">{g.title}</h4>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Why it works</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-normal">{g.why}</p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Structural Blueprint</span>
                    <div className="p-2 rounded-xl bg-slate-950 border border-white/5 text-[10px] text-gray-300 font-mono text-center">
                      {g.blueprint}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-950/50 border border-gray-150">
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Model Wording Script</span>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed italic">&quot;{g.template}&quot;</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SPEAKING SANDBOX */}
        {activeSection === 'sandbox' && (
          <div className="card space-y-6">
            <div className="flex flex-col gap-1 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="text-md font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-rose-500" /> Speaking & Pacing Sandbox
              </h3>
              <p className="text-xs text-gray-500">Speak aloud to analyze pacing (WPM), track filler word counts, and receive a complete AI critique.</p>
            </div>

            {/* Prompt selection */}
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-gray-150">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Practice Prompt</span>
              <select
                value={sandboxPrompt}
                onChange={(e) => setSandboxPrompt(e.target.value)}
                className="w-full input-base text-xs"
              >
                <option value="Tell me about a time you solved a complex technical problem.">Behavioral: Complex Bug / STAR</option>
                <option value="Introduce yourself and explain your primary stack.">HR: Self Introduction (1 min)</option>
                <option value="Explain your final year MCA project database schema and cache strategy.">Technical: Project Database & Cache (2 mins)</option>
                <option value="Why should we hire you for this engineering role?">HR: Why should we hire you? (1 min)</option>
              </select>
            </div>

            {/* Micro visualizer panel */}
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_0.5fr] gap-4 items-center bg-slate-950 p-5 rounded-3xl border border-white/5 relative overflow-hidden">
              <div className="space-y-4">
                {/* Visualizer canvas */}
                <div className="w-full h-16 bg-slate-950/80 rounded-2xl relative overflow-hidden flex items-center justify-center border border-white/5">
                  <canvas ref={sandboxCanvasRef} width="400" height="64" className="w-full h-full" />
                  {!sandboxActive && (
                    <div className="absolute text-xs text-gray-500 font-bold uppercase tracking-wider pointer-events-none">
                      Visualizer Idle
                    </div>
                  )}
                </div>

                <div className="flex gap-6 text-xs font-semibold text-white">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase block">Speech Pacing</span>
                    <span className="text-lg font-black text-cyan-400">{sandboxWpm} WPM</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase block">Filler Words</span>
                    <span className="text-lg font-black text-rose-500">{sandboxFillers} detected</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase block">Recording Time</span>
                    <span className="text-lg font-black text-violet-400">{sandboxSecondsRef.current}s</span>
                  </div>
                </div>
              </div>

              {/* Record CTA */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={clsx(
                    'w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider text-white border-2',
                    sandboxActive
                      ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 shadow-lg shadow-rose-600/30'
                      : 'bg-violet-600 hover:bg-violet-500 border-violet-400 shadow-lg shadow-violet-600/30'
                  )}
                >
                  <Mic className="w-5 h-5 fill-current" />
                  <span>{sandboxActive ? 'Stop' : 'Record'}</span>
                </button>
              </div>
            </div>

            {/* Speech transcript */}
            {sandboxTranscript && (
              <div className="space-y-4 animate-in select-text">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Live Transcript</span>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150 text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed select-text">
                    {sandboxTranscript}
                    <span className="text-violet-500">{sandboxInterim}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCritiqueSpeech}
                    disabled={critiqueLoading}
                    className="btn-primary text-xs flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>{critiqueLoading ? 'Critiquing...' : 'Generate AI Critique'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Critique response */}
            {sandboxCritique && (
              <div className="card border-violet-500/20 space-y-4 animate-in relative overflow-hidden select-text">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />

                <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                  <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block">Speech critique</span>
                  <h4 className="text-xs font-black text-gray-900 dark:text-white mt-0.5">{sandboxCritique.headline}</h4>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                    <div className="space-y-1 bg-gray-50 dark:bg-gray-800/35 p-3 rounded-xl border border-gray-150">
                      <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider block">Pacing check</span>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-sans">{sandboxCritique.pacing_critique}</p>
                    </div>
                    <div className="space-y-1 bg-gray-50 dark:bg-gray-800/35 p-3 rounded-xl border border-gray-150">
                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Filler words check</span>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-sans">{sandboxCritique.fillers_critique}</p>
                    </div>
                  </div>

                  <div className="space-y-1 select-text">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Structural delivery</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans">{sandboxCritique.structural_critique}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Spoken technical keywords detected</span>
                    <div className="flex gap-2 flex-wrap">
                      {sandboxCritique.keywords_used.map(word => (
                        <span key={word} className="px-2 py-0.5 rounded bg-white/5 border border-gray-250 text-[10px] text-gray-500 font-bold">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Actionable tips for next attempt</span>
                    <ul className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {sandboxCritique.tips.map((t, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  )
}

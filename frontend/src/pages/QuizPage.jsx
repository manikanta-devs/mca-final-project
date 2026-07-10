import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import {
  CheckCircle, Clock, Lightbulb, Play, RotateCcw, Target,
  Brain, AlertTriangle, Flame, Map, BookOpen, ChevronRight,
  Shield, Check, Code, HelpCircle, Trophy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { startQuiz, submitQuizAnswer, completeQuiz, getQuizSessions } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'

const COMPANIES = [
  { id: 'google', name: 'Google', focus: 'Algorithms & System Design', difficulty: 'hard' },
  { id: 'amazon', name: 'Amazon', focus: 'Leadership & OOP Scenarios', difficulty: 'hard' },
  { id: 'microsoft', name: 'Microsoft', focus: 'Data Structures & OS', difficulty: 'hard' },
  { id: 'meta', name: 'Meta', focus: 'System Design & Coding', difficulty: 'hard' },
  { id: 'netflix', name: 'Netflix', focus: 'Architecture & Scalability', difficulty: 'hard' },
  { id: 'tcs', name: 'TCS NQT', focus: 'Quant, Verbal & Basic coding', difficulty: 'easy' },
  { id: 'infosys', name: 'Infosys', focus: 'Logical Reasoning & Coding', difficulty: 'medium' },
  { id: 'wipro', name: 'Wipro', focus: 'Aptitude & Technical Basics', difficulty: 'easy' },
  { id: 'accenture', name: 'Accenture', focus: 'Critical Reasoning & Pseudocode', difficulty: 'medium' },
  { id: 'deloitte', name: 'Deloitte', focus: 'Aptitude & DBMS Fundamentals', difficulty: 'medium' },
  { id: 'cognizant', name: 'Cognizant', focus: 'Logical Reasoning & OOP', difficulty: 'medium' },
  { id: 'zoho', name: 'Zoho', focus: 'C/Java Snippets & Code Analysis', difficulty: 'hard' }
]

const TECHNICAL_TOPICS = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'sql', name: 'SQL & Database Queries' },
  { id: 'dbms', name: 'DBMS Fundamentals' },
  { id: 'operating_systems', name: 'Operating Systems' },
  { id: 'networks', name: 'Computer Networks' },
  { id: 'oop', name: 'Object-Oriented Programming' },
  { id: 'system_design', name: 'System Design Basics' },
  { id: 'rest_apis', name: 'REST APIs' },
  { id: 'git', name: 'Git Version Control' },
  { id: 'cloud', name: 'Cloud Computing' }
]

const APTITUDE_DOMAINS = [
  { id: 'quant', name: 'Quantitative Aptitude' },
  { id: 'logical', name: 'Logical Reasoning' },
  { id: 'verbal', name: 'Verbal Ability' }
]

const DEBUG_LANGUAGES = [
  { id: 'python', name: 'Python Bugs' },
  { id: 'javascript', name: 'JavaScript / React Bugs' },
  { id: 'sql', name: 'SQL Query Fixes' },
  { id: 'api', name: 'REST API Errors (500, etc.)' }
]

export default function QuizPage() {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessions, setSessions] = useState([])
  const [setupModal, setSetupModal] = useState(null) // null | 'technical' | 'aptitude' | 'debugging' | 'company'

  // Form states
  const [selectedTopic, setSelectedTopic] = useState('python')
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(5)
  const [selectedCompany, setSelectedCompany] = useState('google')

  // Quiz active states
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [quizType, setQuizType] = useState('technical')
  const [activeCompany, setActiveCompany] = useState('General')
  const [results, setResults] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await getQuizSessions()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Auto-trigger setup from location link state
  useEffect(() => {
    if (location.state) {
      const { topic, difficulty, company } = location.state
      if (topic) {
        const cleanTopic = topic.toLowerCase()
        const isTechnical = TECHNICAL_TOPICS.some(t => t.name.toLowerCase() === cleanTopic || t.id === cleanTopic)
        const isAptitude = APTITUDE_DOMAINS.some(t => t.name.toLowerCase() === cleanTopic || t.id === cleanTopic)
        const isDebugging = DEBUG_LANGUAGES.some(t => t.name.toLowerCase() === cleanTopic || t.id === cleanTopic)
        
        if (isTechnical) {
          const matched = TECHNICAL_TOPICS.find(t => t.name.toLowerCase() === cleanTopic || t.id === cleanTopic)
          setSelectedTopic(matched?.id || 'python')
          setSelectedDifficulty(difficulty?.toLowerCase() || 'medium')
          setSetupModal('technical')
        } else if (isAptitude) {
          const matched = APTITUDE_DOMAINS.find(t => t.name.toLowerCase() === cleanTopic || t.id === cleanTopic)
          setSelectedTopic(matched?.id || 'quant')
          setSelectedDifficulty(difficulty?.toLowerCase() || 'medium')
          setSetupModal('aptitude')
        } else if (isDebugging) {
          const matched = DEBUG_LANGUAGES.find(t => t.name.toLowerCase() === cleanTopic || t.id === cleanTopic)
          setSelectedTopic(matched?.id || 'python')
          setSelectedDifficulty(difficulty?.toLowerCase() || 'medium')
          setSetupModal('debugging')
        } else {
          setSelectedTopic('python')
          setSelectedDifficulty('medium')
          setSetupModal('technical')
        }
      } else if (company) {
        setSelectedCompany(company.toLowerCase())
        setSetupModal('company')
      }
    }
  }, [location.state])

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || results) return
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleTimeOut()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeRemaining, results])

  // Keyboard shortcut listener
  useEffect(() => {
    if (!sessionId || questions.length === 0 || feedback !== null) return

    const handleKeyDown = (e) => {
      if (e.key >= '1' && e.key <= '4') {
        const optIndex = parseInt(e.key) - 1
        if (questions[currentIndex]?.options?.[optIndex]) {
          setSelectedIndex(optIndex)
        }
      }
      if (e.key === 'Enter') {
        if (selectedIndex !== null && !submitting) {
          handleSubmit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sessionId, questions, currentIndex, selectedIndex, feedback, submitting])

  const handleTimeOut = async () => {
    toast.error("Time is up! Submitting assessment.")
    try {
      const { data } = await completeQuiz(sessionId)
      setResults(data?.results || { score: 0, total: questions.length, percentage: 0 })
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleStart = async (type) => {
    setStarting(true)
    const toastId = toast.loading('Preparing assessment arena...')
    
    let topicParam = selectedTopic
    let difficultyParam = selectedDifficulty
    let companyParam = 'General'

    if (type === 'aptitude') {
      topicParam = selectedTopic
    } else if (type === 'debugging') {
      topicParam = selectedTopic
    } else if (type === 'company') {
      const comp = COMPANIES.find(c => c.id === selectedCompany)
      topicParam = comp?.focus || 'General'
      difficultyParam = comp?.difficulty || 'hard'
      companyParam = comp?.name || 'Google'
    }

    try {
      const { data } = await startQuiz({
        quiz_type: type,
        topic: topicParam,
        difficulty: difficultyParam,
        num_questions: numQuestions,
        company: companyParam
      })

      setSessionId(data.session_id)
      setQuestions(data.questions || [])
      setCurrentIndex(0)
      setSelectedIndex(null)
      setResults(null)
      setFeedback(null)
      setQuizType(type)
      setActiveCompany(companyParam)
      
      // Set timer: 2 minutes per question
      setTimeRemaining(numQuestions * 120)
      setSetupModal(null)
      toast.success('Assessment loaded. Focus on correctness!', { id: toastId })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start assessment', { id: toastId })
    } finally {
      setStarting(false)
    }
  }

  const handleSubmit = async () => {
    if (selectedIndex === null) {
      toast.error('Select an option before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await submitQuizAnswer({
        session_id: sessionId,
        question_index: currentIndex,
        selected_index: selectedIndex,
      })
      setFeedback(data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = async () => {
    setFeedback(null)
    setSelectedIndex(null)
    if (currentIndex + 1 >= questions.length) {
      const toastId = toast.loading('Calculating grade index...')
      try {
        const { data } = await completeQuiz(sessionId)
        setResults(data.results)
        await loadData()
        toast.success('Assessment finalized!', { id: toastId })
      } catch (err) {
        toast.error('Failed to complete quiz', { id: toastId })
      }
      return
    }
    setCurrentIndex(prev => prev + 1)
  }

  const handleReset = () => {
    setSessionId(null)
    setQuestions([])
    setCurrentIndex(0)
    setSelectedIndex(null)
    setResults(null)
    setFeedback(null)
    setTimeRemaining(null)
  }

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins}:${s < 10 ? '0' : ''}${s}`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <LoadingSpinner size="lg" text="Loading Readiness Center..." />
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-6 text-slate-800 dark:text-slate-100 select-none pb-12"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.4 }}
    >
      <AdvancedToolPanel type="quiz" />

      {/* --- DASHBOARD VIEW HEADER (No Active Session) --- */}
      {!sessionId && !results && (
        <div className="card relative overflow-hidden p-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[8px] font-mono tracking-widest text-violet-400 font-extrabold uppercase border-b border-violet-500/20 pb-0.5">Readiness Hub</span>
              <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">Interactive Assessment Arena</h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed max-w-2xl font-medium">
                Go beyond simple multiple-choice questions. Polish your syntax, solve logical and quantitative puzzles, debug API outputs, and simulate assessments from top-tier tech firms.
              </p>
            </div>
            <div className="flex items-center gap-6 shrink-0 bg-slate-950/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl font-mono">
              <div className="text-center">
                <div className="text-3xl font-black text-violet-600 dark:text-violet-400">{sessions.length}</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-450 dark:text-gray-500 mt-1">Drills Done</div>
              </div>
              <div className="w-px h-10 bg-black/5 dark:bg-white/5" />
              <div className="text-center">
                <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">4</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-450 dark:text-gray-500 mt-1">Active Arenas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ARENA SELECTOR (No Active Session) --- */}
      {!sessionId && !results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Technical */}
          <div className="card p-5 shadow-xl transition-all flex flex-col justify-between h-44 group hover:border-violet-500/20">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 dark:text-violet-400">
                <Code className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">🖥 Technical core</h4>
              <p className="text-[10px] text-slate-655 dark:text-gray-500 leading-relaxed font-normal">
                Coding and core CS preparations. Covers Programming Languages, SQL, DBMS, OS, OOP, and REST API structures.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTopic('python')
                setSetupModal('technical')
              }}
              className="px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-gray-300 transition-colors flex items-center justify-between"
            >
              <span>Initialize arena</span>
              <ChevronRight className="w-4 h-4 text-violet-500 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Card 2: Aptitude */}
          <div className="card p-5 shadow-xl transition-all flex flex-col justify-between h-44 group hover:border-emerald-500/20">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">🧠 Aptitude & Reasoning</h4>
              <p className="text-[10px] text-slate-655 dark:text-gray-500 leading-relaxed font-normal">
                Online Assessment drills. Quantitative aptitude, blood relations, seating arrangements, coding-decoding, and verbal correction.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTopic('quant')
                setSetupModal('aptitude')
              }}
              className="px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-gray-300 transition-colors flex items-center justify-between"
            >
              <span>Initialize arena</span>
              <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Card 3: Debugging */}
          <div className="card p-5 shadow-xl transition-all flex flex-col justify-between h-44 group hover:border-rose-500/20">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-450">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">🐞 Debugging Challenge</h4>
              <p className="text-[10px] text-slate-655 dark:text-gray-500 leading-relaxed font-normal">
                Fix broken code scripts, resolve syntax issues, find logical errors, and audit failing REST API payloads.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTopic('python')
                setSetupModal('debugging')
              }}
              className="px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-gray-300 transition-colors flex items-center justify-between"
            >
              <span>Initialize arena</span>
              <ChevronRight className="w-4 h-4 text-rose-600 dark:text-rose-450 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Card 4: Company */}
          <div className="card p-5 shadow-xl transition-all flex flex-col justify-between h-44 group hover:border-cyan-500/20">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-405">
                <Target className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">🏢 Company Simulator</h4>
              <p className="text-[10px] text-slate-655 dark:text-gray-500 leading-relaxed font-normal">
                Simulate targeted interview filters. Select Google, Amazon, Microsoft, TCS, Infosys, or Deloitte formats.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCompany('google')
                setSetupModal('company')
              }}
              className="px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-gray-300 transition-colors flex items-center justify-between"
            >
              <span>Initialize arena</span>
              <ChevronRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* --- CONFIGURATION MODALS --- */}
      <AnimatePresence>
        {setupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4">
            <motion.div
              className="card max-w-md w-full p-6 space-y-5 shadow-2xl relative overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest font-mono border-b border-black/5 dark:border-white/5 pb-2">
                Configure {setupModal} Drill
              </h3>

              <div className="space-y-4">
                {setupModal === 'technical' && (
                  <div>
                    <label className="block text-[9px] font-mono tracking-wider text-slate-450 dark:text-gray-500 uppercase mb-2">Technical Core Domain</label>
                    <select
                      value={selectedTopic}
                      onChange={e => setSelectedTopic(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-violet-500/50"
                    >
                      {TECHNICAL_TOPICS.map(topic => (
                        <option key={topic.id} value={topic.id}>{topic.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {setupModal === 'aptitude' && (
                  <div>
                    <label className="block text-[9px] font-mono tracking-wider text-slate-455 dark:text-gray-500 uppercase mb-2">Aptitude Area</label>
                    <select
                      value={selectedTopic}
                      onChange={e => setSelectedTopic(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      {APTITUDE_DOMAINS.map(domain => (
                        <option key={domain.id} value={domain.id}>{domain.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {setupModal === 'debugging' && (
                  <div>
                    <label className="block text-[9px] font-mono tracking-wider text-slate-455 dark:text-gray-500 uppercase mb-2">Debugger Environment</label>
                    <select
                      value={selectedTopic}
                      onChange={e => setSelectedTopic(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-rose-500/50"
                    >
                      {DEBUG_LANGUAGES.map(lang => (
                        <option key={lang.id} value={lang.id}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {setupModal === 'company' && (
                  <div>
                    <label className="block text-[9px] font-mono tracking-wider text-slate-455 dark:text-gray-500 uppercase mb-2">Simulate Exam For</label>
                    <select
                      value={selectedCompany}
                      onChange={e => setSelectedCompany(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      {COMPANIES.map(company => (
                        <option key={company.id} value={company.id}>{company.name} ({company.focus})</option>
                      ))}
                    </select>
                  </div>
                )}

                {setupModal !== 'company' && (
                  <div>
                    <label className="block text-[9px] font-mono tracking-wider text-slate-455 dark:text-gray-500 uppercase mb-2">Difficulty</label>
                    <div className="flex gap-2">
                      {['easy', 'medium', 'hard'].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setSelectedDifficulty(level)}
                          className={clsx(
                            'flex-1 py-2 text-[10px] font-mono uppercase font-bold rounded-xl border transition-all',
                            selectedDifficulty === level
                              ? 'bg-violet-600/10 border-violet-500/30 text-violet-600 dark:text-violet-400'
                              : 'bg-transparent border-black/5 dark:border-white/5 text-slate-450 dark:text-gray-500 hover:text-slate-750 dark:hover:text-gray-300'
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-mono tracking-wider text-slate-455 dark:text-gray-500 uppercase mb-2">Drill Size</label>
                  <select
                    value={numQuestions}
                    onChange={e => setNumQuestions(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {[3, 5, 8, 10].map(count => (
                      <option key={count} value={count}>{count} Questions</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSetupModal(null)}
                  className="px-4 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-250 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStart(setupModal)}
                  disabled={starting}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-550 text-xs font-bold text-white shadow-lg shadow-violet-600/10"
                >
                  {starting ? 'Generating...' : 'Start Assessment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ACTIVE QUIZ PLAYGROUND --- */}
      {sessionId && questions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
          {/* Question card */}
          <div className="card p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-mono tracking-widest text-violet-600 dark:text-violet-405 uppercase font-black block">
                    {quizType} Drill • {activeCompany !== 'General' ? activeCompany : selectedTopic.replace('_', ' ')}
                  </span>
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest border",
                    questions[currentIndex]?.difficulty === 'easy' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    questions[currentIndex]?.difficulty === 'medium' && "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
                    questions[currentIndex]?.difficulty === 'hard' && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  )}>
                    {questions[currentIndex]?.difficulty || 'medium'}
                  </span>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white">QUESTION {currentIndex + 1} OF {questions.length}</span>
              </div>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-450 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/10">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>

            {/* Question Text block */}
            <div className="text-xs md:text-sm font-semibold text-slate-800 dark:text-gray-250 leading-relaxed whitespace-pre-wrap select-text bg-black/5 dark:bg-slate-950/20 border border-black/5 dark:border-white/5 p-4 rounded-2xl relative">
              {questions[currentIndex]?.question}
            </div>

            {/* Options grid */}
            <div className="space-y-2.5">
              <span className="text-[8px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block mb-1">Select option using mouse or keys [1-4]</span>
              
              {questions[currentIndex]?.options?.map((opt, idx) => {
                const isSelected = selectedIndex === idx
                const hasFeedback = feedback !== null
                const isCorrect = idx === questions[currentIndex].correct_index

                const borderStyle = clsx(
                  'w-full text-left p-4 rounded-2xl border transition-all text-xs font-semibold flex items-center justify-between gap-4',
                  hasFeedback
                    ? isCorrect
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02] text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.03)]'
                      : isSelected
                        ? 'border-rose-500/30 bg-rose-500/[0.02] text-rose-600 dark:text-rose-450'
                        : 'border-black/5 dark:border-white/5 bg-transparent text-slate-400 dark:text-gray-600'
                    : isSelected
                      ? 'border-violet-500 bg-violet-600/5 text-violet-650 dark:text-violet-300 ring-2 ring-violet-500/20 scale-[1.005]'
                      : 'border-black/5 dark:border-white/5 bg-transparent hover:border-black/10 dark:hover:border-white/10 text-slate-650 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                )

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => !hasFeedback && setSelectedIndex(idx)}
                    disabled={hasFeedback}
                    className={borderStyle}
                  >
                    <div className="flex items-center gap-3">
                      {/* Keyboard shortcut keycap */}
                      <span className={clsx(
                        'w-5 h-5 rounded-lg border flex items-center justify-center text-[9px] font-mono shrink-0 transition-colors',
                        isSelected ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-slate-950 text-slate-450 dark:text-gray-500'
                      )}>
                        {idx + 1}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {hasFeedback && (
                      <span className="shrink-0">
                        {isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        {isSelected && !isCorrect && <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-450" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Action controls */}
            <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-250 transition-colors"
              >
                Quit Session
              </button>

              {feedback === null ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selectedIndex === null || submitting}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-550 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 transition-colors text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-violet-600/10"
                >
                  {submitting ? 'Auditing...' : 'Submit Answer'}
                  <span className="text-[9px] font-mono text-violet-350 dark:text-violet-300 ml-1 block border border-violet-500 rounded px-1">Enter</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-550 transition-colors text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-violet-600/10"
                >
                  <span>{currentIndex + 1 >= questions.length ? 'Finish Drill' : 'Next Question'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right explanation card */}
          <div className="space-y-4 select-text">
            <AnimatePresence mode="wait">
              {feedback !== null ? (
                <motion.div 
                  key="feedback-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="card p-5 space-y-4 relative overflow-hidden border-violet-500/20"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />

                  <div className="border-b border-black/5 dark:border-white/5 pb-3 flex items-center gap-2">
                    <Lightbulb className="w-4.5 h-4.5 text-violet-550 dark:text-violet-400 animate-pulse" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">AI Solution Audit</span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">Solution details</span>
                    <p className="text-[11px] text-slate-650 dark:text-gray-400 leading-relaxed font-sans font-medium">
                      {feedback.feedback || feedback.explanation}
                    </p>
                  </div>

                  {questions[currentIndex]?.short_trick && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1 text-slate-700 dark:text-gray-300">
                      <span className="text-[9px] font-mono tracking-wider text-amber-600 dark:text-amber-400 uppercase block flex items-center gap-1.5 font-bold">
                        <Target className="w-3.5 h-3.5" />
                        💡 Calculator Trick
                      </span>
                      <p className="text-[11px] text-slate-650 dark:text-gray-300 font-medium leading-relaxed font-normal">
                        {questions[currentIndex].short_trick}
                      </p>
                    </div>
                  )}

                  {quizType === 'debugging' && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1 text-slate-700 dark:text-gray-300">
                      <span className="text-[9px] font-mono tracking-wider text-rose-600 dark:text-rose-450 uppercase block flex items-center gap-1.5 font-bold">
                        <Flame className="w-3.5 h-3.5" />
                        Root Cause & Resolution
                      </span>
                      <p className="text-[11px] text-slate-650 dark:text-gray-300 font-medium leading-relaxed font-normal">
                        This bug was caused by a {selectedTopic.replace('_', ' ')} error. Correct syntax element or variable references to verify resolution.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="guidance-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="card p-5 space-y-4"
                >
                  <h4 className="font-extrabold text-[10px] text-slate-450 dark:text-gray-500 uppercase tracking-widest font-mono">Drill Guidelines</h4>
                  <ul className="space-y-3 text-[11px] text-slate-600 dark:text-gray-400">
                    <li className="flex items-start gap-2.5">
                      <span className="text-violet-500 dark:text-violet-400 font-black shrink-0">•</span>
                      <span>Assessments are timed (2 minutes average per question). Watch the clock!</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-violet-500 dark:text-violet-400 font-black shrink-0">•</span>
                      <span>For debugging queries, check syntax brackets and variables to trace execution.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-violet-500 dark:text-violet-400 font-black shrink-0">•</span>
                      <span>Press keys [1], [2], [3], [4] on your keyboard to instantly select options.</span>
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* --- FINAL RESULTS PERFORMANCE AUDIT REPORT --- */}
      {results && (
        <div className="card max-w-lg mx-auto text-center p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-500 dark:text-violet-400">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">Quiz complete</h3>
            <p className="text-[10px] text-slate-450 dark:text-gray-500 font-mono">DRILL RESULTS REGISTERED SUCCESSFULLY</p>
          </div>

          {/* HUD results panel */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl font-mono">
            <div>
              <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{results.score}</div>
              <div className="text-[8px] text-slate-455 dark:text-gray-500 uppercase mt-1">Correct</div>
            </div>
            <div className="w-px h-8 bg-black/5 dark:bg-white/5 mx-auto mt-2" />
            <div>
              <div className="text-2xl font-black text-slate-800 dark:text-gray-300">{results.total}</div>
              <div className="text-[8px] text-slate-455 dark:text-gray-500 uppercase mt-1">Total Items</div>
            </div>
            <div className="w-px h-8 bg-black/5 dark:bg-white/5 mx-auto mt-2" />
            <div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{results.percentage}%</div>
              <div className="text-[8px] text-slate-455 dark:text-gray-500 uppercase mt-1">Accuracy</div>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-250 transition-colors"
            >
              Take another quiz
            </button>
            <button
              onClick={() => handleStart(quizType)}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-550 text-xs font-bold text-white shadow-lg shadow-violet-600/10"
            >
              Retry Drill
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

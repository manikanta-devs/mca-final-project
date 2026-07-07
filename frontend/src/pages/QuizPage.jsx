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
    const toastId = toast.loading('Preparing assessment...')
    
    let topicParam = selectedTopic
    let difficultyParam = selectedDifficulty
    let companyParam = 'General'

    if (type === 'aptitude') {
      topicParam = selectedTopic // will be quant/logical/verbal
    } else if (type === 'debugging') {
      topicParam = selectedTopic // python, javascript, sql, api
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
      
      // Set timer (e.g. 2 minutes per question)
      setTimeRemaining(numQuestions * 120)
      setSetupModal(null)
      toast.success('Assessment started! Good luck.', { id: toastId })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start assessment', { id: toastId })
    } finally {
      setStarting(false)
    }
  }

  const handleSubmit = async () => {
    if (selectedIndex === null) {
      toast.error('Please select an option before submitting.')
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
      const toastId = toast.loading('Calculating score...')
      try {
        const { data } = await completeQuiz(sessionId)
        setResults(data.results)
        await loadData()
        toast.success('Assessment complete!', { id: toastId })
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
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading Readiness Center..." /></div>
  }

  return (
    <motion.div className="space-y-6 select-none" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <AdvancedToolPanel type="quiz" />

      {/* Main header banner */}
      {!sessionId && (
        <div className="card bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden text-white mb-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-300 font-extrabold mb-1">Interactive Readiness Center</p>
              <h3 className="text-2xl lg:text-3xl font-black">Train like a real candidate</h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-2xl mt-2 font-normal">
                Go beyond simple multiple-choice questions. Polish your syntax, solve logical and quantitative puzzles, debug API outputs, and simulate assessments from top-tier tech firms.
              </p>
            </div>
            <div className="flex items-center gap-6 shrink-0 bg-white/[0.03] border border-white/10 p-4 rounded-2xl backdrop-blur-md">
              <div className="text-center">
                <div className="text-4xl font-black text-violet-400">{sessions.length}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mt-1">Drills Done</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-4xl font-black text-cyan-400">4</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mt-1">Practice Arenas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arena Hub Cards (Shown when no quiz is active) */}
      {!sessionId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Technical Knowledge */}
          <div className="card border border-gray-150 hover:border-violet-500/30 transition-all hover:shadow-lg flex flex-col justify-between p-5 space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Code className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">🖥 Technical Knowledge</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-normal">
                Coding and core CS preparations. Covers Programming Languages, SQL, DBMS, OS, OOP, and REST API structures.
              </p>
            </div>
            <button
              onClick={() => handleStart('technical')}
              disabled={starting}
              className="btn-ghost w-full justify-between text-xs"
            >
              <span>Start quiz</span>
              <ChevronRight className="w-4 h-4 text-violet-500" />
            </button>
          </div>

          {/* Card 2: Aptitude & Reasoning */}
          <div className="card border border-gray-150 hover:border-violet-500/30 transition-all hover:shadow-lg flex flex-col justify-between p-5 space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">🧠 Aptitude & Reasoning</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-normal">
                Online Assessment drills. Quantitative aptitude, blood relations, seating arrangements, coding-decoding, and verbal correction.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTopic('quant')
                setSetupModal('aptitude')
              }}
              className="btn-ghost w-full justify-between text-xs"
            >
              <span>Configure & Start</span>
              <ChevronRight className="w-4 h-4 text-emerald-500" />
            </button>
          </div>

          {/* Card 3: Debugging Challenges */}
          <div className="card border border-gray-150 hover:border-violet-500/30 transition-all hover:shadow-lg flex flex-col justify-between p-5 space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">🐞 Debugging Challenges</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-normal">
                Fix broken code scripts, resolve syntax issues, find logical errors, and audit failing REST API payloads.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTopic('python')
                setSetupModal('debugging')
              }}
              className="btn-ghost w-full justify-between text-xs"
            >
              <span>Configure & Start</span>
              <ChevronRight className="w-4 h-4 text-rose-500" />
            </button>
          </div>

          {/* Card 4: Company Assessment */}
          <div className="card border border-gray-150 hover:border-violet-500/30 transition-all hover:shadow-lg flex flex-col justify-between p-5 space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Target className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">🏢 Company Assessment</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-normal">
                Simulate targeted interview filters. Select Google, Amazon, Microsoft, TCS, Infosys, or Deloitte formats.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCompany('google')
                setSetupModal('company')
              }}
              className="btn-ghost w-full justify-between text-xs"
            >
              <span>Configure & Start</span>
              <ChevronRight className="w-4 h-4 text-cyan-500" />
            </button>
          </div>
        </div>
      )}

      {/* SETUP MODALS */}
      <AnimatePresence>
        {setupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              className="card bg-white dark:bg-slate-900 max-w-md w-full p-6 space-y-5 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="font-extrabold text-gray-900 dark:text-white text-md capitalize">Configure {setupModal} Drill</h3>

              <div className="space-y-4">
                {/* Topic selection */}
                {setupModal === 'technical' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Technical Core Domain</label>
                    <select
                      value={selectedTopic}
                      onChange={e => setSelectedTopic(e.target.value)}
                      className="input-base text-xs"
                    >
                      {TECHNICAL_TOPICS.map(topic => (
                        <option key={topic.id} value={topic.id}>{topic.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {setupModal === 'aptitude' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Aptitude Area</label>
                    <select
                      value={selectedTopic}
                      onChange={e => setSelectedTopic(e.target.value)}
                      className="input-base text-xs"
                    >
                      {APTITUDE_DOMAINS.map(domain => (
                        <option key={domain.id} value={domain.id}>{domain.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {setupModal === 'debugging' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Debugger Environment</label>
                    <select
                      value={selectedTopic}
                      onChange={e => setSelectedTopic(e.target.value)}
                      className="input-base text-xs"
                    >
                      {DEBUG_LANGUAGES.map(lang => (
                        <option key={lang.id} value={lang.id}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {setupModal === 'company' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Simulate Exam For</label>
                    <select
                      value={selectedCompany}
                      onChange={e => setSelectedCompany(e.target.value)}
                      className="input-base text-xs"
                    >
                      {COMPANIES.map(company => (
                        <option key={company.id} value={company.id}>{company.name} ({company.focus})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Difficulty */}
                {setupModal !== 'company' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Difficulty</label>
                    <div className="flex gap-2">
                      {['easy', 'medium', 'hard'].map(level => (
                        <button
                          key={level}
                          onClick={() => setSelectedDifficulty(level)}
                          className={clsx(
                            'flex-1 py-2 text-xs font-bold rounded-xl capitalize border transition-all',
                            selectedDifficulty === level
                              ? 'bg-violet-600/10 border-violet-500/50 text-violet-600 dark:text-violet-400'
                              : 'bg-transparent border-gray-200 text-gray-500'
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions count */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Drill Size</label>
                  <select
                    value={numQuestions}
                    onChange={e => setNumQuestions(Number(e.target.value))}
                    className="input-base text-xs"
                  >
                    {[3, 5, 8, 10].map(count => (
                      <option key={count} value={count}>{count} Questions</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSetupModal(null)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStart(setupModal)}
                  disabled={starting}
                  className="btn-primary text-xs"
                >
                  {starting ? 'Generating...' : 'Start Assessment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTIVE QUIZ PLAYGROUND */}
      {sessionId && questions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          {/* Left Column - Question Arena */}
          <div className="card space-y-5">
            {/* Header info */}
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block capitalize">
                    {quizType} Drill • {activeCompany !== 'General' ? activeCompany : selectedTopic.replace('_', ' ')}
                  </span>
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                    questions[currentIndex]?.difficulty === 'easy' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                    questions[currentIndex]?.difficulty === 'medium' && "bg-violet-500/10 text-violet-400 border border-violet-500/20",
                    questions[currentIndex]?.difficulty === 'hard' && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  )}>
                    {questions[currentIndex]?.difficulty || 'medium'}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-gray-900 dark:text-white">Question {currentIndex + 1} of {questions.length}</span>
              </div>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-xl">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>

            {/* Question Text & Code Snippet */}
            <div className="space-y-4 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap select-text">
              {questions[currentIndex]?.question}
            </div>

            {/* Options list */}
            <div className="space-y-3">
              {questions[currentIndex]?.options?.map((opt, idx) => {
                const isSelected = selectedIndex === idx
                const hasFeedback = feedback !== null
                const isCorrect = idx === questions[currentIndex].correct_index

                const borderStyle = clsx(
                  'w-full text-left p-4 rounded-2xl border transition-all text-xs font-medium flex items-center justify-between gap-3',
                  hasFeedback
                    ? isCorrect
                      ? 'border-emerald-500/50 bg-emerald-500/[0.03] text-emerald-600 dark:text-emerald-400'
                      : isSelected
                        ? 'border-rose-500/50 bg-rose-500/[0.03] text-rose-600 dark:text-rose-400'
                        : 'border-gray-200 bg-transparent text-gray-400'
                    : isSelected
                      ? 'border-violet-500 bg-violet-600/5 text-violet-600 dark:text-violet-300 ring-2 ring-violet-500/20'
                      : 'border-gray-200 dark:border-gray-800 bg-transparent hover:border-gray-300 dark:hover:border-gray-700'
                )

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => !hasFeedback && setSelectedIndex(idx)}
                    disabled={hasFeedback}
                    className={borderStyle}
                  >
                    <span>{opt}</span>
                    {hasFeedback && (
                      <span className="shrink-0">
                        {isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {isSelected && !isCorrect && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleReset}
                className="btn-ghost text-xs"
              >
                Quit Session
              </button>

              {feedback === null ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selectedIndex === null || submitting}
                  className="btn-primary text-xs"
                >
                  {submitting ? 'Auditing...' : 'Submit Answer'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary text-xs flex items-center gap-2"
                >
                  <span>{currentIndex + 1 >= questions.length ? 'Finish Drill' : 'Next Question'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Explainers, Tricks & Debugger guides */}
          <div className="space-y-6 select-text">
            {/* Feedback section when submitted */}
            {feedback !== null && (
              <div className="card space-y-4 border border-violet-500/20 animate-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />

                <div className="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
                  <Lightbulb className="w-4.5 h-4.5 text-violet-500" />
                  <span className="text-xs font-black text-gray-900 dark:text-white">AI Solution Audit</span>
                </div>

                {/* Explanation */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Solution details</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-normal font-sans">
                    {feedback.feedback || feedback.explanation}
                  </p>
                </div>

                {/* Short calculations tricks (For Aptitude section) */}
                {questions[currentIndex]?.short_trick && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                      <Target className="w-3.5 h-3.5" />
                      💡 Fast Calculation Trick
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                      {questions[currentIndex].short_trick}
                    </p>
                  </div>
                )}

                {/* Debugging explanations for debug drills */}
                {quizType === 'debugging' && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                      <Flame className="w-3.5 h-3.5" />
                      Root Cause & Resolution
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                      This bug is caused by a {selectedTopic.replace('_', ' ')} error. Fixing it requires matching variables or correcting syntax elements in line with standard developer practices.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Default guidance instructions */}
            {feedback === null && (
              <div className="card space-y-4">
                <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wide">Drill Tips</h4>
                <ul className="space-y-2.5 text-xs text-gray-500">
                  <li className="flex items-start gap-2.5">
                    <span className="text-violet-500 font-black">•</span>
                    <span>Assessments are timed (2 minutes average per question). Watch the clock!</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-violet-500 font-black">•</span>
                    <span>For Debugging problems, copy the code to a scratchpad if needed to trace execution.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-violet-500 font-black">•</span>
                    <span>Company simulators mirror the specific technical focus of that company.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FINAL RESULTS DISPLAY */}
      {results && (
        <div className="card max-w-lg mx-auto text-center p-8 space-y-6 animate-in">
          <div className="w-20 h-20 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-500">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Quiz completed</h3>
            <p className="text-xs text-gray-400">Drill results parsed and registered successfully.</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-150">
            <div>
              <div className="text-2xl font-black text-violet-500">{results.score}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">Correct</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700/80 mx-auto mt-2" />
            <div>
              <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{results.total}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">Total Items</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700/80 mx-auto mt-2" />
            <div>
              <div className="text-2xl font-black text-emerald-400">{results.percentage}%</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">Accuracy</div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="btn-ghost text-xs"
            >
              Take another quiz
            </button>
            <button
              onClick={() => handleStart(quizType)}
              className="btn-primary text-xs"
            >
              Retry Drill
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

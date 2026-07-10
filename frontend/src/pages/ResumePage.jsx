import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle, Cpu, User,
  Briefcase, GraduationCap, Code, ChevronRight, RefreshCw,
  Star, Award, Globe, Target, Edit3,
  Brain, AlertTriangle, Play, Flame, Map, BookOpen, Clock, Check
} from 'lucide-react'
import { clsx } from 'clsx'
import { uploadResume, analyzeResumeText, matchResumeToJob } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ProgressBar from '../components/ProgressBar'
import AdvancedToolPanel from '../components/AdvancedToolPanel'

export default function ResumePage() {
  const navigate = useNavigate()
  const { resumeData, setResumeData, candidateName, setCandidateName } = useApp()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('upload') // upload | text
  const [textInput, setTextInput] = useState('')
  const [fileName, setFileName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobMatch, setJobMatch] = useState(null)
  const [matchLoading, setMatchLoading] = useState(false)
  const [subTab, setSubTab] = useState('coach')
  const [selectedSection, setSelectedSection] = useState('projects')
  
  // Scanning log simulator state
  const [scanStep, setScanStep] = useState(0)

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setScanStep(prev => (prev + 1) % 5)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setScanStep(0)
    }
  }, [loading])

  const scanLogs = [
    "Ingesting document structure & mapping text segments...",
    "Extracting technical skill vectors & parsing certifications...",
    "Analyzing layouts, section densities, and grammar tones...",
    "Running multi-model ATS diagnostics with fallback rotation...",
    "Compiling executive recruiter feedback & career roadmap..."
  ]

  const processResume = async (file) => {
    setLoading(true)
    const toastId = toast.loading('Initiating AI Resume Chamber analysis...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (jobDescription.trim()) {
        formData.append('job_description', jobDescription.trim())
      }
      const { data } = await uploadResume(formData)
      if (data.success) {
        setResumeData(data.analysis)
        setFileName(file.name)
        setJobMatch(data.job_match || null)
        toast.success('Resume analyzed successfully!', { id: toastId })
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to analyze resume'
      toast.error(msg, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) processResume(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: loading,
  })

  const handleTextAnalyze = async () => {
    if (textInput.trim().length < 50) {
      toast.error('Please enter at least 50 characters of resume text.')
      return
    }
    setLoading(true)
    const toastId = toast.loading('Analyzing resume text...')
    try {
      const { data } = await analyzeResumeText(textInput.trim(), jobDescription.trim())
      if (data.success) {
        setResumeData(data.analysis)
        setJobMatch(data.job_match || null)
        toast.success('Resume text analyzed!', { id: toastId })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleJobMatch = async () => {
    if (!resumeData) {
      toast.error('Analyze your resume first.')
      return
    }
    if (jobDescription.trim().length < 80) {
      toast.error('Paste a longer job description to get a reliable match score.')
      return
    }

    setMatchLoading(true)
    const toastId = toast.loading('Analyzing fit against the job description...')
    try {
      const { data } = await matchResumeToJob(resumeData, jobDescription.trim())
      if (data.success) {
        setJobMatch(data.job_match)
        toast.success('Job fit analyzed!', { id: toastId })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Job fit analysis failed', { id: toastId })
    } finally {
      setMatchLoading(false)
    }
  }

  // Circular HUD Ring Component
  const HUDRing = ({ value, max = 100, label, color = 'stroke-violet-500', glow = 'shadow-violet-500/20' }) => {
    const radius = 30
    const circ = 2 * Math.PI * radius
    const offset = circ - (Math.min(max, value) / max) * circ

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r={radius} className="stroke-black/5 dark:stroke-white/5 fill-transparent" strokeWidth="4" />
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              className={`${color} fill-transparent`}
              strokeWidth="4"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-sm font-black text-slate-900 dark:text-white">{value}</span>
        </div>
        <span className="text-[9px] font-mono tracking-wider text-slate-500 dark:text-gray-400 uppercase">{label}</span>
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
      <AdvancedToolPanel type="resume" />

      {/* --- CANDIDATE CREDENTIAL NODE --- */}
      <div className="card p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-650 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Candidate Credential Node <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[8px] font-mono text-violet-650 dark:text-violet-400 uppercase tracking-widest font-bold">Active</span>
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-gray-505 font-mono uppercase">LINK IDENTIFIER TO PERSONALIZED QUESTION DATASET</p>
          </div>
        </div>
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Enter candidate name..."
            value={candidateName}
            onChange={e => setCandidateName(e.target.value)}
            className="w-full bg-black/5 dark:bg-slate-955/40 border border-black/5 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-medium transition-colors"
            maxLength={50}
          />
        </div>
      </div>

      {/* --- THE SCANNER CHAMBER (UPLOAD & PASTE) --- */}
      <div className="card p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Upload className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase font-mono">Chamber Portal</h3>
              <p className="text-[9px] text-slate-450 dark:text-gray-505 font-mono uppercase">SUPPORTED FORMATS: PDF, DOCX, TXT (MAX 16MB)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {resumeData && (
              <button
                onClick={() => { setResumeData(null); setFileName(''); setJobMatch(null) }}
                className="px-3.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Reset Chamber
              </button>
            )}
            
            {/* Custom Control Tab Bar */}
            <div className="flex p-0.5 bg-black/5 dark:bg-slate-950/60 rounded-xl border border-black/5 dark:border-white/5">
              {[
                { id: 'upload', label: 'File Upload' },
                { id: 'text', label: 'Paste Text' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={clsx(
                    'px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all',
                    tab === item.id
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-gray-300'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Scanning Module wrapper */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading-scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-cyan-500/20 rounded-2xl p-10 bg-black/5 dark:bg-slate-955/40 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]"
              >
                {/* Real Aesthetic Risk: Moving Neon Laser Scan Line */}
                <motion.div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto animate-pulse">
                    <Cpu className="w-6 h-6 text-cyan-455" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest animate-pulse">Scanning Resume Document</h4>
                    <p className="text-[10px] text-slate-450 dark:text-gray-505 font-mono mt-1">DO NOT CLOSE THIS INTERFACE</p>
                  </div>
                  
                  {/* CLI Logs */}
                  <div className="w-full max-w-md bg-black/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 rounded-xl p-3.5 text-left font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-450 dark:text-gray-600">
                      <span>SYSTEM PORTAL STATS:</span>
                      <span className="text-cyan-600 dark:text-cyan-400">ACTIVE</span>
                    </div>
                    <div className="h-px bg-black/5 dark:bg-white/5 my-1.5" />
                    <div className="text-slate-650 dark:text-gray-500 flex items-center gap-2">
                      <span className="text-cyan-600 dark:text-cyan-400 animate-pulse">●</span>
                      <span>{scanLogs[scanStep]}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : tab === 'upload' ? (
              <motion.div
                key="file-upload-dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                {...getRootProps()}
                className={clsx(
                  'border border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden min-h-[220px] flex flex-col items-center justify-center',
                  isDragActive
                    ? 'border-cyan-500 bg-cyan-500/[0.02] shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                    : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-slate-950/20 hover:border-violet-500/30 hover:bg-black/[0.04] dark:hover:bg-slate-950/40'
                )}
              >
                <input {...getInputProps()} />
                {fileName && resumeData ? (
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white text-xs">{fileName}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 uppercase tracking-wider font-bold">Analysis complete ✓</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5 text-slate-500 dark:text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 dark:text-gray-300">
                        {isDragActive ? 'Release to upload...' : 'Drag & drop your resume file'}
                      </p>
                      <p className="text-[10px] text-slate-450 dark:text-gray-500 mt-1">or click to browse local directory</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="text-paste-area"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <textarea
                  className="w-full bg-black/[0.02] dark:bg-slate-950/40 rounded-2xl border border-black/5 dark:border-white/5 text-xs text-slate-800 dark:text-white placeholder-gray-500 p-4 resize-none h-36 focus:outline-none focus:border-violet-500/50 leading-relaxed"
                  placeholder="Paste raw resume text details here..."
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  disabled={loading}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-gray-500">{textInput.length} characters</span>
                  <button
                    onClick={handleTextAnalyze}
                    disabled={loading || textInput.trim().length < 50}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-550 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 transition-colors text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-violet-600/10"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Analyze Text</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- RESUME ANALYSIS RESULTS (EXECUTIVE HUD) --- */}
      {resumeData && (
        <div className="space-y-6 animate-in">
          
          {/* Executive Recruiter HUD Header */}
          <div className="card p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[8px] font-mono tracking-widest text-violet-400 font-extrabold uppercase border-b border-violet-500/20 pb-0.5">ATS Diagnostic HUD</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{candidateName || 'Candidate'} — Executive Summary</h3>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed max-w-2xl font-medium">
                  {resumeData.coach_report?.summary || resumeData.summary || 'Summary loaded.'}
                </p>
              </div>

              {/* Progress Rings Grid */}
              <div className="flex items-center gap-6 shrink-0 bg-slate-950/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl">
                <HUDRing 
                  value={resumeData.coach_report?.current_score || resumeData.resume_score?.total || 70} 
                  label="ATS Score" 
                  color="stroke-violet-500" 
                />
                <div className="w-px h-12 bg-black/5 dark:bg-white/5" />
                <HUDRing 
                  value={resumeData.coach_report?.potential_score || 89} 
                  label="Potential" 
                  color="stroke-emerald-400" 
                />
                <div className="w-px h-12 bg-black/5 dark:bg-white/5" />
                <HUDRing 
                  value={resumeData.career_roadmap?.job_readiness_percentage || 74} 
                  label="Ready %" 
                  color="stroke-cyan-400" 
                />
              </div>
            </div>
          </div>

          {/* Workflow Bridge Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'roadmap', label: 'Generate Study Roadmap', path: '/dashboard/coach', icon: Map, color: 'from-violet-600/10 to-indigo-600/10 border-violet-500/20 hover:border-violet-500/30 text-violet-600 dark:text-violet-400', text: 'Convert skill gaps into an interactive study guide with free online resources.' },
              { id: 'quiz', label: 'Test with CS Quizzes', path: '/dashboard/quiz', icon: Brain, color: 'from-orange-600/10 to-amber-600/10 border-orange-500/20 hover:border-orange-500/30 text-orange-600 dark:text-orange-400', text: 'Attempt an adaptive technical knowledge or debugging quiz to test your readiness.' },
              { id: 'interview', label: 'Start Mock Interview', path: '/dashboard/interview', icon: Briefcase, color: 'from-emerald-600/10 to-teal-600/10 border-emerald-500/20 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400', text: 'Launch a full-length, interactive interview with AI-generated custom questions.' }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => navigate(b.path)}
                className={`p-4 rounded-2xl bg-gradient-to-br ${b.color} border transition-all text-left flex flex-col justify-between h-32 group`}
              >
                <div className="w-8 h-8 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-center">
                  {React.createElement(b.icon, { className: 'w-4 h-4' })}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 group-hover:text-violet-650 dark:group-hover:text-white transition-colors">
                    <span>{b.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-gray-500 mt-1 leading-normal font-normal">{b.text}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Subtab Console Menu */}
          <div className="flex flex-wrap gap-1 p-0.5 bg-black/5 dark:bg-slate-950/60 border border-black/5 dark:border-white/5 rounded-2xl">
            {[
              { id: 'coach', label: 'AI Resume Coach', icon: Brain },
              { id: 'heatmap', label: 'ATS Heatmap Scanner', icon: Flame },
              { id: 'interview', label: 'Interview Generator', icon: BookOpen },
              { id: 'roadmap', label: 'AI Career Roadmap', icon: Map }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id)}
                className={clsx(
                  'flex-1 min-w-[130px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border',
                  subTab === item.id
                    ? 'bg-violet-500/10 dark:bg-violet-600/10 border-violet-500/20 text-violet-600 dark:text-violet-400 shadow-md'
                    : 'bg-transparent border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'
                )}
              >
                {React.createElement(item.icon, { className: 'w-4 h-4' })}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* --- SUBTAB CONTENT: AI RESUME COACH --- */}
          {subTab === 'coach' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Summary */}
                <div className="card p-5 space-y-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-500 dark:text-violet-400" /> Summary Diagnostics
                  </h4>
                  <p className="text-[11px] text-slate-650 dark:text-gray-400 leading-relaxed font-normal">
                    {resumeData.coach_report?.summary || resumeData.summary || 'Summary unavailable.'}
                  </p>
                </div>

                {/* Grammar */}
                <div className="card p-5 space-y-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Grammar & Voice Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {(resumeData.coach_report?.grammar_suggestions || ["Apply active verbs to project bullet descriptors.", "Ensure impact statement percentages are clear."]).map((g, i) => (
                      <li key={i} className="text-[11px] text-slate-650 dark:text-gray-400 leading-relaxed font-normal flex items-start gap-2">
                        <span className="text-cyan-500 dark:text-cyan-400 font-bold">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actionable Improvements */}
                <div className="card p-5 space-y-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Actionable Improvements
                  </h4>
                  <ul className="space-y-2">
                    {(resumeData.coach_report?.actionable_improvements || ["Include tech stacks inside certifications", "Add database metric details"]).map((imp, i) => (
                      <li key={i} className="text-[11px] text-slate-650 dark:text-gray-400 leading-relaxed font-normal flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-rose-500/10 text-rose-650 dark:text-rose-400 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">{i+1}</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next Steps */}
                <div className="card bg-violet-950/[0.04] p-5 space-y-3">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-500 dark:text-violet-400" /> Personalized Next Steps
                  </h4>
                  <div className="space-y-2">
                    {(resumeData.coach_report?.next_steps || ["Attempt mock drills", "Update resume metrics"]).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">✓</span>
                        <p className="text-[11px] text-slate-700 dark:text-gray-300 font-medium leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Strengths */}
                <div className="card p-5 border-l-4 border-emerald-500 space-y-3">
                  <h4 className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Strengths Detected
                  </h4>
                  <div className="space-y-2">
                    {(resumeData.coach_report?.strengths || ["Clean stack format", "Project descriptions"]).map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-650 dark:text-gray-400">
                        <span className="text-emerald-555 dark:text-emerald-400 shrink-0">✓</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="card p-5 border-l-4 border-amber-500 space-y-3">
                  <h4 className="font-extrabold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Weakness Identifiers
                  </h4>
                  <div className="space-y-2">
                    {(resumeData.coach_report?.weaknesses || ["Missing project metrics", "No cloud certifications"]).map((w, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-650 dark:text-gray-400">
                        <span className="text-amber-600 dark:text-amber-400 shrink-0">⚠</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Keywords & Sections */}
                <div className="card p-5 space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">Missing ATS Keywords</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(resumeData.coach_report?.missing_keywords || ["AWS", "Docker", "FastAPI"]).map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-4">
                    <span className="text-[9px] font-mono tracking-widest text-slate-455 dark:text-gray-500 uppercase block">Missing Sections</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(resumeData.coach_report?.missing_sections || ["Certifications", "Achievements"]).map((sec, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/5 dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-black/5 dark:border-white/5">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- SUBTAB CONTENT: ATS HEATMAP SCANNER --- */}
          {subTab === 'heatmap' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
              {/* Heatmap Section list */}
              <div className="card p-6 space-y-4">
                <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block border-b border-black/5 dark:border-white/5 pb-2">ATS Heatmap Preview (Select section to review)</span>
                
                <div className="space-y-2.5">
                  {[
                    { id: 'name', label: 'Name & Header', text: candidateName || 'Candidate Name Details' },
                    { id: 'contact', label: 'Contact Details Info', text: 'Email, Phone, LinkedIn, Location markers.' },
                    { id: 'summary', label: 'Professional Summary Segment', text: resumeData.summary || 'Summary paragraph details.' },
                    { id: 'skills', label: 'Skills Section', text: 'Languages, Frameworks, Databases, Tools.' },
                    { id: 'experience', label: 'Experience History', text: resumeData.experience?.years ? `${resumeData.experience.years} Years of history` : 'Professional experience details.' },
                    { id: 'projects', label: 'Projects details', text: 'MCA Project viva items and scaling metrics.' },
                    { id: 'education', label: 'Education Block', text: 'Degrees, Colleges, Grades, GPAs.' },
                    { id: 'certifications', label: 'Certifications list', text: 'AWS, Google, or development certificates.' },
                    { id: 'achievements', label: 'Achievements list', text: 'Hackathons, ranks, coding competitions.' },
                    { id: 'keywords', label: 'ATS Target Keywords density', text: 'Matched keywords overlap.' },
                    { id: 'formatting', label: 'Layout & Formatting', text: 'Spacing, fonts, parser parsing check.' }
                  ].map(({ id, label, text }) => {
                    const secVal = resumeData.heatmap?.[id] || { status: 'needs_improvement', score: 70 }
                    const borderStyle = {
                      excellent: 'border-emerald-500/20 bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] text-emerald-600 dark:text-emerald-400',
                      needs_improvement: 'border-amber-500/20 bg-amber-500/[0.01] hover:bg-amber-500/[0.03] text-amber-600 dark:text-amber-400',
                      weak_or_missing: 'border-rose-500/20 bg-rose-500/[0.01] hover:bg-rose-500/[0.03] text-rose-600 dark:text-rose-400'
                    }[secVal.status] || 'border-black/5 dark:border-white/5 text-slate-500'

                    const badgeColor = {
                      excellent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10',
                      needs_improvement: 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/10',
                      weak_or_missing: 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/10'
                    }[secVal.status]

                    const badgeLabel = {
                      excellent: 'Excellent',
                      needs_improvement: 'Needs Work',
                      weak_or_missing: 'Weak'
                    }[secVal.status]

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedSection(id)}
                        className={clsx(
                          'w-full text-left p-3 rounded-2xl border transition-all flex justify-between items-center gap-4',
                          borderStyle,
                          selectedSection === id && 'ring-2 ring-violet-500/40 border-violet-500 scale-[1.01]'
                        )}
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">{label}</span>
                          <p className="text-[10px] text-slate-700 dark:text-gray-300 font-medium truncate mt-0.5 leading-relaxed">{text}</p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={clsx('px-2 py-0.5 rounded text-[8px] font-black uppercase border', badgeColor)}>
                            {badgeLabel}
                          </span>
                          <span className="text-xs font-black text-slate-700 dark:text-gray-400">{secVal.score}%</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right comments sidebar */}
              {selectedSection && (
                <div className="card p-5 space-y-4 relative overflow-hidden border-violet-500/20">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-violet-500 dark:text-violet-400 uppercase block">Detailed Section Audit</span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white capitalize">{selectedSection.replace('_', ' ')} Section</h4>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-650 dark:text-violet-400">
                      {(resumeData.heatmap?.[selectedSection] || { score: 70 }).score}%
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono tracking-widest text-rose-600 dark:text-rose-455 uppercase block">Why it lost score</span>
                    <p className="text-[11px] text-slate-650 dark:text-gray-400 leading-relaxed font-normal">
                      {(resumeData.heatmap?.[selectedSection] || { feedback: 'Feedback details.' }).feedback}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-black/5 dark:border-white/5 pt-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-cyan-600 dark:text-cyan-400 uppercase block">Recruiter View</span>
                      <p className="text-[10px] text-slate-600 dark:text-gray-400 leading-relaxed font-normal">
                        {(resumeData.heatmap?.[selectedSection] || { recruiter_view: 'Recruiter view.' }).recruiter_view}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-amber-600 dark:text-amber-450 uppercase block">ATS Parser View</span>
                      <p className="text-[10px] text-slate-600 dark:text-gray-400 leading-relaxed font-normal">
                        {(resumeData.heatmap?.[selectedSection] || { ats_view: 'ATS view.' }).ats_view}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-3">
                    <span className="text-[9px] font-mono tracking-widest text-violet-500 dark:text-violet-400 uppercase block">Suggested ATS Rewrite</span>
                    <div className="p-3.5 rounded-xl bg-black/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 relative group select-all">
                      <pre className="text-[11px] text-slate-700 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {(resumeData.heatmap?.[selectedSection] || { suggested_rewrite: 'Suggested rewrite.' }).suggested_rewrite}
                      </pre>
                      <button
                        onClick={() => {
                          const textToCopy = (resumeData.heatmap?.[selectedSection] || {}).suggested_rewrite || ''
                          navigator.clipboard.writeText(textToCopy)
                          toast.success('Suggested rewrite copied!')
                        }}
                        className="absolute right-2 top-2 px-2.5 py-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- SUBTAB CONTENT: INTERVIEW GENERATOR --- */}
          {subTab === 'interview' && (
            <div className="card p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-405" /> AI Resume ➜ Interview Generator
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-500">Tailored questions generated specifically matching your resume stacks.</p>
                </div>

                <button
                  onClick={() => navigate('/dashboard/interview', { state: { pregeneratedQuestions: resumeData.interview_prep?.questions || [] } })}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-550 text-xs font-bold text-white shadow-lg shadow-cyan-600/10 flex items-center gap-2 hover:scale-[1.02] transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Start Personalized AI Interview
                </button>
              </div>

              {/* Metadata details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5">
                  <Clock className="w-4 h-4 text-cyan-605 dark:text-cyan-400 animate-pulse" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Estimated Duration</div>
                    <div className="text-slate-500 dark:text-gray-500 mt-0.5">{resumeData.interview_prep?.estimated_duration || '45 Minutes'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5">
                  <Target className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Company Target Styles</div>
                    <div className="text-slate-500 dark:text-gray-500 mt-0.5">{(resumeData.interview_prep?.company_styles || ["Google", "Amazon", "Microsoft"]).join(', ')}</div>
                  </div>
                </div>
              </div>

              {/* Questions display */}
              <div className="space-y-4">
                <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">Generated Interview Questions</span>
                <div className="space-y-4">
                  {(resumeData.interview_prep?.questions || []).map((q, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-950/5 dark:bg-slate-950/20 border border-black/5 dark:border-white/5 hover:border-violet-500/20 transition-all space-y-4 select-text">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono tracking-widest text-violet-600 dark:text-violet-400 uppercase block">Question {idx + 1} • {q.category}</span>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">{q.text}</h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-650 dark:text-violet-400 border border-violet-500/10">
                          {q.difficulty}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-t border-black/5 dark:border-white/5 pt-3.5">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono tracking-widest text-slate-455 dark:text-gray-500 uppercase block">Expected Answer Metrics</span>
                          <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-relaxed font-normal">{q.expected_answer}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono tracking-widest text-slate-455 dark:text-gray-500 uppercase block">Key Concepts to mention</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {q.key_concepts?.map(c => (
                              <span key={c} className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[9px] text-slate-500 dark:text-gray-400 font-bold">{c}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- SUBTAB CONTENT: AI CAREER ROADMAP --- */}
          {subTab === 'roadmap' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
              {/* Left Timeline card */}
              <div className="card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Personalized Career Pathing
                    </h3>
                    <p className="text-xs text-slate-550 dark:text-gray-505">Week-by-week learning roadmap generated based on resume gap auditing.</p>
                  </div>
                  <span className="px-3.5 py-1 bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 border border-emerald-500/10 text-xs font-bold rounded-xl shrink-0">
                    Duration: {resumeData.career_roadmap?.estimated_time || '3 Months'}
                  </span>
                </div>

                <div className="relative border-l border-black/5 dark:border-white/5 ml-3.5 pl-6 space-y-6">
                  {(resumeData.career_roadmap?.learning_path || [
                    {"week": "Week 1", "topic": "React Hooks & State", "detail": "Master dynamic state rendering and custom hooks."},
                    {"week": "Week 2", "topic": "Docker & Containerization", "detail": "Learn to containerize Python/Node apps."}
                  ]).map((w, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[31.5px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border border-emerald-650 dark:border-emerald-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-555 dark:bg-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 uppercase block">{w.week}</span>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{w.topic}</h4>
                        <p className="text-[11px] text-slate-650 dark:text-gray-400 leading-relaxed font-normal">{w.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right metadata card */}
              <div className="space-y-4">
                {/* Career Snapshot */}
                <div className="card p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">Current level</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-violet-500/10 text-violet-650 dark:text-violet-400 border border-violet-500/10 uppercase">
                      {resumeData.career_roadmap?.current_level || 'Intermediate'}
                    </span>
                  </div>

                  <div className="space-y-1 border-t border-black/5 dark:border-white/5 pt-4">
                    <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">Salary Target Range</span>
                    <div className="text-md font-black text-slate-900 dark:text-white">
                      {resumeData.career_roadmap?.salary_range || '$75k - $95k'}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-4">
                    <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">Suitable target roles</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(resumeData.career_roadmap?.suitable_roles || ["Full Stack Developer", "Software Engineer"]).map((role, i) => (
                        <span key={i} className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 text-[9px] font-bold text-slate-500 dark:text-gray-400 border border-black/5 dark:border-white/5">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Certifications and Action */}
                <div className="card p-5 space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono tracking-widest text-slate-450 dark:text-gray-500 uppercase block">Recommended Certifications</span>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-gray-400">
                      {(resumeData.career_roadmap?.recommended_certifications || ["AWS Certified Developer"]).map((cert, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-emerald-500">•</span>
                          <span>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-black/5 dark:border-white/5 pt-4">
                    <button
                      onClick={() => navigate('/dashboard/interview', { state: { pregeneratedQuestions: resumeData.interview_prep?.questions || [] } })}
                      className="w-full justify-center py-3 rounded-xl bg-violet-600 hover:bg-violet-550 text-xs font-bold text-white shadow-lg shadow-violet-600/10 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Start Personalized Interview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- JOB DESCRIPTION FIT MATCHER --- */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase font-mono">Job Description Fit Matcher</h3>
                <p className="text-[10px] text-slate-455 dark:text-gray-550 font-mono">COMPUTE KEYWORD DENSITY MATCH INDEX</p>
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                className="w-full bg-black/[0.02] dark:bg-slate-950/40 rounded-2xl border border-black/5 dark:border-white/5 text-xs text-slate-800 dark:text-white placeholder-gray-500 p-4 resize-none h-32 focus:outline-none focus:border-violet-500/50 leading-relaxed"
                placeholder="Paste the target job description details here to run ATS correlation audit..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={matchLoading}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 dark:text-gray-500">{jobDescription.length} characters (min 80 required)</span>
                <button
                  onClick={handleJobMatch}
                  disabled={matchLoading || jobDescription.trim().length < 80}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-550 disabled:bg-gray-250 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 transition-colors text-xs font-bold text-white shadow-lg shadow-cyan-600/10"
                >
                  {matchLoading ? <LoadingSpinner size="sm" color="white" /> : 'Run Fit Audit'}
                </button>
              </div>
            </div>

            {jobMatch && (
              <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-6 animate-in">
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                  <div className="card bg-slate-950/5 dark:bg-slate-950/40 p-4 flex flex-col justify-center items-center text-center">
                    <span className="text-[9px] font-mono tracking-widest text-slate-455 dark:text-gray-500 uppercase mb-2">Job Match Index</span>
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="6" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray={251} strokeDashoffset={251 - (251 * jobMatch.match_score) / 100} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-md font-black text-slate-900 dark:text-white">{jobMatch.match_score}%</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 mt-2 uppercase tracking-wide">{jobMatch.readiness}</span>
                  </div>

                  <div className="card bg-slate-950/5 dark:bg-slate-950/40 p-4 space-y-2">
                    <span className="text-[9px] font-mono tracking-widest text-slate-455 dark:text-gray-500 uppercase block">ATS Correlation Summary</span>
                    <p className="text-[11px] text-slate-650 dark:text-gray-400 leading-relaxed font-normal">{jobMatch.summary}</p>
                    
                    {jobMatch.strengths && jobMatch.strengths.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Matching Strengths</span>
                        <ul className="list-disc list-inside text-[10px] text-slate-500 dark:text-gray-500 space-y-0.5">
                          {jobMatch.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card bg-slate-950/5 dark:bg-slate-950/40 p-4 space-y-2">
                    <h4 className="text-[9px] font-mono tracking-widest text-emerald-600 dark:text-emerald-450 uppercase block">Matched Skills Density</h4>
                    {jobMatch.matched_skills && jobMatch.matched_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {jobMatch.matched_skills.map((skill) => (
                          <span key={skill} className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 text-[10px] font-semibold">{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">No direct matched overlap.</p>
                    )}
                  </div>

                  <div className="card bg-slate-950/5 dark:bg-slate-950/40 p-4 space-y-2">
                    <h4 className="text-[9px] font-mono tracking-widest text-rose-600 dark:text-rose-400 uppercase block">Missing Skills Target</h4>
                    {jobMatch.missing_skills && jobMatch.missing_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {jobMatch.missing_skills.map((skill) => (
                          <span key={skill} className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15 text-[10px] font-semibold">{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">None! Perfect stack coverage.</p>
                    )}
                  </div>
                </div>

                {jobMatch.recommendations && jobMatch.recommendations.length > 0 && (
                  <div className="card bg-slate-950/5 dark:bg-slate-950/40 p-4 space-y-2">
                    <span className="text-[9px] font-mono tracking-widest text-slate-455 dark:text-gray-500 uppercase block">Action Recommendations</span>
                    <ul className="list-disc list-inside text-[11px] text-slate-650 dark:text-gray-400 space-y-1 font-normal">
                      {jobMatch.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state CTA */}
      {!resumeData && !loading && (
        <div className="border border-dashed border-black/10 dark:border-white/10 rounded-3xl text-center py-12 bg-black/[0.01] dark:bg-slate-950/10">
          <div className="w-12 h-12 bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-5 h-5 text-slate-500 dark:text-gray-600" />
          </div>
          <h3 className="font-semibold text-slate-500 dark:text-gray-455 text-xs uppercase tracking-wider font-mono">No Resume Ingested</h3>
          <p className="text-[10px] text-slate-450 dark:text-gray-600 mt-1 font-mono uppercase">UPLOAD A DOCUMENT FILE OR PASTE RAW TEXT TO INITIALIZE</p>
        </div>
      )}
    </motion.div>
  )
}

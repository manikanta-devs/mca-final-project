import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  Upload, FileText, CheckCircle, Cpu, User,
  Briefcase, GraduationCap, Code, ChevronRight, RefreshCw,
  Star, Award, Globe, Target, Sparkles, Edit3,
  Brain, AlertTriangle, Play, Flame, Map, BookOpen, Clock, Check
} from 'lucide-react'
import { clsx } from 'clsx'
import { uploadResume, analyzeResumeText, matchResumeToJob } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ProgressBar from '../components/ProgressBar'
import AdvancedToolPanel from '../components/AdvancedToolPanel'

const SKILL_COLORS = {
  languages:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-200 dark:border-blue-800',   icon: null, iconClass: 'text-blue-500' },
  frameworks:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', icon: null, iconClass: 'text-purple-500' },
  databases:   { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-200 dark:border-green-800',  icon: null, iconClass: 'text-green-500' },
  cloud_devops:{ bg: 'bg-orange-50 dark:bg-orange-900/20',text: 'text-orange-700 dark:text-orange-300',border: 'border-orange-200 dark:border-orange-800',icon: null, iconClass: 'text-orange-500' },
  tools:       { bg: 'bg-gray-50 dark:bg-gray-800',       text: 'text-gray-700 dark:text-gray-300',    border: 'border-gray-200 dark:border-gray-700',    icon: null, iconClass: 'text-gray-500' },
}

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

  const processResume = async (file) => {
    setLoading(true)
    const toastId = toast.loading('Analyzing your resume with AI...')
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

  const gradeColor = (g) => ({
    'A+': 'text-emerald-600', A: 'text-green-600', 'B+': 'text-blue-600',
    B: 'text-primary-600', 'C+': 'text-orange-600', C: 'text-red-600'
  })[g] || 'text-gray-600'

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <AdvancedToolPanel type="resume" />

      {/* Candidate Name Input */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Your Name</h3>
            <p className="text-sm text-gray-500">Personalize your interview session</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Enter your name (optional)"
          value={candidateName}
          onChange={e => setCandidateName(e.target.value)}
          className="input-base"
          maxLength={50}
        />
      </div>

      {/* Upload Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-accent-100 dark:bg-accent-900/30 rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Upload Resume</h3>
            <p className="text-sm text-gray-500">PDF, DOCX, or TXT — max 16 MB</p>
          </div>
          {resumeData && (
            <button
              onClick={() => { setResumeData(null); setFileName(''); setJobMatch(null) }}
              className="ml-auto btn-ghost text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5">
          {['upload', 'text'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-2 text-sm font-semibold rounded-lg transition-all',
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {t === 'upload' ? <><Upload className="w-3.5 h-3.5 inline mr-1" /> File Upload</> : <><Edit3 className="w-3.5 h-3.5 inline mr-1" /> Paste Text</>}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer',
              isDragActive
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            {loading ? (
              <LoadingSpinner text="Analyzing with AI..." className="py-4" />
            ) : fileName && resumeData ? (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white mb-1">{fileName}</p>
                <p className="text-sm text-green-600">Analysis complete ✓</p>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isDragActive ? 'Drop it here!' : 'Drag & drop your resume'}
                </p>
                <p className="text-sm text-gray-400">or click to browse</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-3">PDF · DOCX · TXT</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <textarea
              className="input-base resize-none h-40 text-sm"
              placeholder="Paste your resume text here..."
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">{textInput.length} characters</span>
              <button
                onClick={handleTextAnalyze}
                disabled={loading || textInput.trim().length < 50}
                className="btn-primary"
              >
                {loading ? <LoadingSpinner size="sm" color="white" /> : <Cpu className="w-4 h-4" />}
                Analyze Text
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resume Analysis Results */}
      {resumeData && (
        <div className="space-y-6 animate-in">
          {/* Executive Overview Header */}
          <div className="card bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden text-white">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-violet-300 font-extrabold mb-1">ATS Executive Summary</p>
                <h3 className="text-2xl font-black">{candidateName || 'Candidate'} — Professional Analysis</h3>
                <p className="text-xs text-gray-300 leading-relaxed max-w-2xl mt-2">
                  {resumeData.coach_report?.summary || resumeData.summary || 'Deep analysis complete. Select tabs below to inspect recruiter feedback, formatting scores, career pathing, and launch customized mock interviews.'}
                </p>
              </div>

              <div className="flex items-center gap-6 shrink-0 bg-white/[0.03] border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                <div className="text-center">
                  <div className="text-4xl font-black text-violet-400">
                    {resumeData.coach_report?.current_score || resumeData.resume_score?.total || 70}
                  </div>
                  <h4 className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mt-1">Resume Score</h4>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-400">
                    {resumeData.coach_report?.potential_score || 89}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mt-1">Potential Score</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <div className="text-4xl font-black text-cyan-400">
                    {resumeData.career_roadmap?.job_readiness_percentage || 74}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mt-1">Job Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ecosystem Workflow Bridge Banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/dashboard/coach')}
              className="p-4 rounded-2xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/20 hover:border-violet-500/30 transition-all text-left flex flex-col justify-between h-32 group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
                <Map className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1 group-hover:text-violet-400 transition-colors">
                  <span>Generate Study Roadmap</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-normal leading-normal">
                  Convert detected skill gaps into an interactive study guide with free online resources.
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/dashboard/quiz')}
              className="p-4 rounded-2xl bg-gradient-to-br from-orange-600/10 to-amber-600/10 border border-orange-500/20 hover:border-orange-500/30 transition-all text-left flex flex-col justify-between h-32 group"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1 group-hover:text-orange-400 transition-colors">
                  <span>Test with CS Quizzes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-normal leading-normal">
                  Attempt an adaptive technical knowledge or debugging quiz to test your readiness.
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/dashboard/interview')}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 hover:border-emerald-500/30 transition-all text-left flex flex-col justify-between h-32 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                  <span>Start Mock Interview</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-normal leading-normal">
                  Launch a full-length, interactive interview with AI-generated custom questions.
                </p>
              </div>
            </button>
          </div>

          {/* Subtab Navigation Bar */}
          <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl">
            <button
              onClick={() => setSubTab('coach')}
              className={clsx(
                'flex-1 min-w-[140px] py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 border',
                subTab === 'coach'
                  ? 'bg-violet-600/10 border-violet-500/40 text-violet-300 shadow-md'
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 dark:hover:text-white'
              )}
            >
              <Brain className="w-4 h-4 text-violet-400" />
              <span>AI Resume Coach</span>
            </button>

            <button
              onClick={() => setSubTab('heatmap')}
              className={clsx(
                'flex-1 min-w-[140px] py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 border',
                subTab === 'heatmap'
                  ? 'bg-violet-600/10 border-violet-500/40 text-violet-300 shadow-md'
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 dark:hover:text-white'
              )}
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>ATS Heatmap Scanner</span>
            </button>

            <button
              onClick={() => setSubTab('interview')}
              className={clsx(
                'flex-1 min-w-[140px] py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 border',
                subTab === 'interview'
                  ? 'bg-violet-600/10 border-violet-500/40 text-violet-300 shadow-md'
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 dark:hover:text-white'
              )}
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Interview Generator</span>
            </button>

            <button
              onClick={() => setSubTab('roadmap')}
              className={clsx(
                'flex-1 min-w-[140px] py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 border',
                subTab === 'roadmap'
                  ? 'bg-violet-600/10 border-violet-500/40 text-violet-300 shadow-md'
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 dark:hover:text-white'
              )}
            >
              <Map className="w-4 h-4 text-emerald-400" />
              <span>AI Career Roadmap</span>
            </button>
          </div>

          {/* TAB CONTENT: AI RESUME COACH */}
          {subTab === 'coach' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Professional Summary */}
                <div className="card space-y-3">
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-violet-400" /> Professional Summary
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
                    {resumeData.coach_report?.summary || resumeData.summary || 'Summary details unavailable.'}
                  </p>
                </div>

                {/* Grammar Suggestions */}
                <div className="card space-y-3">
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <Edit3 className="w-4.5 h-4.5 text-cyan-400" /> Grammar & Voice Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {(resumeData.coach_report?.grammar_suggestions || ["Ensure active action verbs are applied to all project descriptors.", "Avoid duplicate terms like 'helped' or 'managed'."]).map((g, i) => (
                      <li key={i} className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-normal flex items-start gap-2.5">
                        <span className="text-cyan-500 font-extrabold">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actionable Improvements */}
                <div className="card space-y-3">
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <Target className="w-4.5 h-4.5 text-rose-400" /> Actionable Improvements
                  </h4>
                  <ul className="space-y-2">
                    {(resumeData.coach_report?.actionable_improvements || ["Add internship experience", "Improve project descriptions", "Add GitHub statistics", "Add quantified impact"]).map((imp, i) => (
                      <li key={i} className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-normal flex items-start gap-2.5">
                        <span className="w-4.5 h-4.5 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">{i+1}</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Personalized Next Steps */}
                <div className="card bg-violet-950/5 border border-violet-500/10 space-y-3.5">
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-violet-400" /> Personalized Next Steps
                  </h4>
                  <div className="space-y-3">
                    {(resumeData.coach_report?.next_steps || ["Start a personalized mock interview based on this resume.", "Add quantitative metrics to your projects."]).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">✓</div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Strengths */}
                <div className="card space-y-3.5 border-l-4 border-emerald-500">
                  <h4 className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5" /> Resume Strengths
                  </h4>
                  <div className="space-y-2.5">
                    {(resumeData.coach_report?.strengths || ["Strong technical stack", "Multiple projects", "Clean formatting"]).map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-normal">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="card space-y-3.5 border-l-4 border-amber-500">
                  <h4 className="font-extrabold text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5" /> Weakness Identifiers
                  </h4>
                  <div className="space-y-2.5">
                    {(resumeData.coach_report?.weaknesses || ["Missing measurable achievements", "Weak project descriptions", "No internships", "No certifications"]).map((w, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-normal">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Keywords & Sections */}
                <div className="card space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Missing ATS Keywords</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(resumeData.coach_report?.missing_keywords || ["Docker", "AWS", "REST APIs", "Unit Testing"]).map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/15">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/80 pt-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Missing Sections</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(resumeData.coach_report?.missing_sections || ["Certifications", "Achievements"]).map((sec, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ATS HEATMAP SCANNER */}
          {subTab === 'heatmap' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
              {/* Left Page Layout (Resume highlights) */}
              <div className="card bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 space-y-4 shadow-inner relative overflow-hidden select-text">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block border-b border-gray-200 dark:border-gray-800 pb-2">ATS Heatmap Preview (Click any section to audit)</span>
                
                <div className="space-y-3.5">
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
                      excellent: 'border-emerald-500/40 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] text-emerald-300 hover:bg-emerald-500/[0.06]',
                      needs_improvement: 'border-amber-500/40 bg-amber-500/[0.02] dark:bg-amber-500/[0.04] text-amber-300 hover:bg-amber-500/[0.06]',
                      weak_or_missing: 'border-rose-500/40 bg-rose-500/[0.02] dark:bg-rose-500/[0.04] text-rose-300 hover:bg-rose-500/[0.06]'
                    }[secVal.status] || 'border-gray-200 bg-transparent text-gray-400'

                    const badgeColor = {
                      excellent: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                      needs_improvement: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      weak_or_missing: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }[secVal.status]

                    const badgeLabel = {
                      excellent: 'Excellent',
                      needs_improvement: 'Needs Work',
                      weak_or_missing: 'Weak / Missing'
                    }[secVal.status]

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedSection(id)}
                        className={clsx(
                          'w-full text-left p-3.5 rounded-2xl border transition-all flex justify-between items-center gap-4',
                          borderStyle,
                          selectedSection === id && 'ring-2 ring-violet-500/50 scale-[1.01] border-violet-500'
                        )}
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-wider block text-gray-500 dark:text-gray-400">{label}</span>
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate mt-1 leading-relaxed">{text}</p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={clsx('px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border', badgeColor)}>
                            {badgeLabel}
                          </span>
                          <span className="text-xs font-black text-gray-400">{secVal.score}%</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right Comments Sidebar */}
              {selectedSection && (
                <div className="card space-y-5 select-text border border-violet-500/25 bg-violet-950/[0.02] relative overflow-hidden animate-in">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <div>
                      <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block">Detailed Section Audit</span>
                      <h4 className="text-xs font-black text-gray-900 dark:text-white capitalize">{selectedSection.replace('_', ' ')} Section</h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-400">
                      {(resumeData.heatmap?.[selectedSection] || { score: 70 }).score}%
                    </div>
                  </div>

                  {/* Why it lost score */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Why it lost score</span>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
                      {(resumeData.heatmap?.[selectedSection] || { feedback: 'Feedback details.' }).feedback}
                    </p>
                  </div>

                  {/* Recruiter & ATS Views */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800/80 pt-3.5">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-cyan-500 uppercase tracking-wider block">Recruiter Perspective</span>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
                        {(resumeData.heatmap?.[selectedSection] || { recruiter_view: 'Recruiter view.' }).recruiter_view}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">ATS Parsing Signal</span>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
                        {(resumeData.heatmap?.[selectedSection] || { ats_view: 'ATS view.' }).ats_view}
                      </p>
                    </div>
                  </div>

                  {/* Suggested Rewrite */}
                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/80 pt-3.5">
                    <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block">Suggested ATS Rewrite</span>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 relative group select-all">
                      <pre className="text-[11px] text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {(resumeData.heatmap?.[selectedSection] || { suggested_rewrite: 'Suggested rewrite.' }).suggested_rewrite}
                      </pre>
                      <button
                        onClick={() => {
                          const textToCopy = (resumeData.heatmap?.[selectedSection] || {}).suggested_rewrite || ''
                          navigator.clipboard.writeText(textToCopy)
                          toast.success('Suggested rewrite copied!')
                        }}
                        className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: INTERVIEW GENERATOR */}
          {subTab === 'interview' && (
            <div className="card space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-4">
                <div>
                  <h3 className="text-md font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-400" /> AI Resume ➜ Interview Generator
                  </h3>
                  <p className="text-xs text-gray-500">Based on your resume skills and MCA project viva markers, we generated {resumeData.interview_prep?.questions?.length || 3} tailored questions.</p>
                </div>

                <button
                  onClick={() => navigate('/dashboard/interview', { state: { pregeneratedQuestions: resumeData.interview_prep?.questions || [] } })}
                  className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 shadow-md hover:scale-[1.02] transition-transform shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Start Personalized AI Interview
                </button>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-700/50">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">Estimated Duration</div>
                    <div className="text-gray-400 mt-0.5">{resumeData.interview_prep?.estimated_duration || '45 Minutes'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-700/50">
                  <Target className="w-4 h-4 text-violet-400" />
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">Company Target Styles</div>
                    <div className="text-gray-400 mt-0.5">{(resumeData.interview_prep?.company_styles || ["Google", "Amazon", "Microsoft", "TCS"]).join(', ')}</div>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Generated Interview Questions</span>
                <div className="grid grid-cols-1 gap-4">
                  {(resumeData.interview_prep?.questions || []).map((q, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-white/[0.01] border border-gray-200 dark:border-gray-800/80 hover:border-violet-500/20 transition-all space-y-4 select-text">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block">Question {idx + 1} • {q.category}</span>
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white leading-relaxed">{q.text}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/15">
                          {q.difficulty}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-t border-gray-100 dark:border-gray-800/80 pt-3.5">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Expected Answer Metrics</span>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-normal">{q.expected_answer}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Key Concepts to mention</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {q.key_concepts?.map(c => (
                              <span key={c} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-500 font-semibold">{c}</span>
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

          {/* TAB CONTENT: AI CAREER ROADMAP */}
          {subTab === 'roadmap' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start animate-in">
              {/* Left timeline */}
              <div className="card space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-4">
                  <div>
                    <h3 className="text-md font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                      <Map className="w-5 h-5 text-emerald-400" /> Personalized Career Pathing
                    </h3>
                    <p className="text-xs text-gray-500">Week-by-week learning roadmap generated based on resume gap auditing.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-xs font-bold shrink-0">
                    Est. Time: {resumeData.career_roadmap?.estimated_time || '3 Months'}
                  </span>
                </div>

                {/* Timeline */}
                <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3.5 pl-6 space-y-5">
                  {(resumeData.career_roadmap?.learning_path || [
                    {"week": "Week 1", "topic": "React Hooks & State", "detail": "Master dynamic state rendering and custom hooks."},
                    {"week": "Week 2", "topic": "Docker & Containerization", "detail": "Learn to containerize Python/Node apps."}
                  ]).map((w, i) => (
                    <div key={i} className="relative">
                      {/* Circle indicator */}
                      <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">{w.week}</span>
                        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">{w.topic}</h4>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-normal">{w.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right metadata card */}
              <div className="space-y-6">
                {/* Career Snapshot */}
                <div className="card space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Current level</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/15">
                      {resumeData.career_roadmap?.current_level || 'Intermediate'}
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/80 pt-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Recommended Salary Target</span>
                    <div className="text-lg font-black text-gray-900 dark:text-white">
                      {resumeData.career_roadmap?.salary_range || '$75k - $95k'}
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t border-gray-100 dark:border-gray-800/80 pt-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Target suitable roles</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(resumeData.career_roadmap?.suitable_roles || ["Frontend Developer", "Backend Developer", "Full Stack Developer"]).map((role, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Certifications and Action */}
                <div className="card space-y-4">
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Recommended Certifications</span>
                    <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                      {(resumeData.career_roadmap?.recommended_certifications || ["AWS Cloud Practitioner", "Google Cloud Associate"]).map((cert, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-emerald-500">•</span>
                          <span>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800/80 pt-4">
                    <button
                      onClick={() => navigate('/dashboard/interview', { state: { pregeneratedQuestions: resumeData.interview_prep?.questions || [] } })}
                      className="btn-primary w-full justify-center text-xs py-3 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Start Personalized Interview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Job Description Fit matcher */}
          <div className="card space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Job Description Fit Matcher</h3>
                <p className="text-xs text-gray-400 font-medium">Compare your parsed resume keyword alignment against a target job listing.</p>
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                className="input-base resize-none h-32 text-sm"
                placeholder="Paste a target job description here to compare against your resume..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={matchLoading}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{jobDescription.length} characters (min 80 required)</span>
                <button
                  onClick={handleJobMatch}
                  disabled={matchLoading || jobDescription.trim().length < 80}
                  className="btn-primary text-xs px-5 py-2"
                >
                  {matchLoading ? <LoadingSpinner size="sm" color="white" /> : 'Analyze Fit'}
                </button>
              </div>
            </div>

            {jobMatch && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-4 flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Job Match Score</span>
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray={251} strokeDashoffset={251 - (251 * jobMatch.match_score) / 100} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-xl font-black">{jobMatch.match_score}%</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 mt-2">{jobMatch.readiness}</span>
                  </div>

                  <div className="card p-4 space-y-2 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">ATS Matching Summary</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-normal">{jobMatch.summary}</p>
                    
                    {jobMatch.strengths && jobMatch.strengths.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[9px] uppercase font-bold text-emerald-400">Strengths</span>
                        <ul className="list-disc list-inside text-[11px] text-gray-500 space-y-0.5">
                          {jobMatch.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-4 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Matched Skills</h4>
                    {jobMatch.matched_skills && jobMatch.matched_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {jobMatch.matched_skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 text-[10px] font-semibold">{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 font-medium">No direct keyword overlap detected.</p>
                    )}
                  </div>

                  <div className="card p-4 space-y-3">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Missing Skills</h4>
                    {jobMatch.missing_skills && jobMatch.missing_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {jobMatch.missing_skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/15 text-[10px] font-semibold">{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 font-medium">None! You meet all listed skill demands.</p>
                    )}
                  </div>
                </div>

                {jobMatch.recommendations && jobMatch.recommendations.length > 0 && (
                  <div className="card p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Recruiter Action Recommendations</span>
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300 space-y-1 font-normal">
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
        <div className="card text-center py-12 border-dashed">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No Resume Analyzed Yet</h3>
          <p className="text-sm text-gray-400">Upload your resume above to get started</p>
        </div>
      )}
    </motion.div>
  )
}

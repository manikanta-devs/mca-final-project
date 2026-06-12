import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  Upload, FileText, CheckCircle, Cpu, User,
  Briefcase, GraduationCap, Code, ChevronRight, RefreshCw,
  Star, Award, Globe, Target, Sparkles, Edit3
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
        <div className="space-y-5 animate-in">
          {/* Score Card */}
          <div className="card bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/10 border-primary-100 dark:border-primary-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-primary-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Resume Score</h3>
              </div>
              <div className={clsx('text-5xl font-black', gradeColor(resumeData.resume_score?.grade))}>
                {resumeData.resume_score?.grade || 'B'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.entries(resumeData.resume_score?.breakdown || {}).map(([key, val]) => (
                <ProgressBar
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={val}
                  max={25}
                  color="primary"
                  size="sm"
                />
              ))}
            </div>
            <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Score</span>
              <span className="font-bold text-primary-700 dark:text-primary-400 text-lg">
                {resumeData.resume_score?.total || 0} / 100
              </span>
            </div>
          </div>

          {/* Summary */}
          {resumeData.summary && (
            <div className="card border-l-4 border-primary-500">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary-500" /> Summary
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{resumeData.summary}</p>
            </div>
          )}

          {/* Job Match / 2027 Readiness */}
          <div className="card border border-dashed border-primary-200 dark:border-primary-800 bg-gradient-to-br from-white to-primary-50/50 dark:from-gray-800 dark:to-primary-900/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">2027 Job Match</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Paste a job description to get a fit score, missing keywords, and a focused action plan.
                </p>
              </div>
              {jobMatch && (
                <span className={clsx(
                  'ml-auto badge text-sm',
                  jobMatch.match_score >= 80 ? 'badge-green' : jobMatch.match_score >= 60 ? 'badge-blue' : 'badge-orange'
                )}>
                  {jobMatch.match_grade}
                </span>
              )}
            </div>

            <textarea
              className="input-base resize-none h-36 text-sm"
              placeholder="Paste a target job description here to compare against your resume..."
              value={jobDescription}
              onChange={e => {
                setJobDescription(e.target.value)
                setJobMatch(null)
              }}
              disabled={loading || matchLoading}
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-3">
              <p className="text-xs text-gray-400">
                Uses the same analysis payload to score keyword overlap, experience alignment, and readiness.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleJobMatch}
                  disabled={loading || matchLoading || !resumeData || jobDescription.trim().length < 80}
                  className="btn-primary"
                >
                  {matchLoading ? <LoadingSpinner size="sm" color="white" /> : <Sparkles className="w-4 h-4" />}
                  Analyze Fit
                </button>
              </div>
            </div>

            {!resumeData && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                Upload or paste your resume first, then this section will generate the match report.
              </p>
            )}
          </div>

          {jobMatch && (
            <div className="card bg-gray-950 text-white border-gray-800 shadow-xl shadow-primary-500/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary-300 mb-2">Role Fit Snapshot</p>
                  <h3 className="text-2xl font-black capitalize">{jobMatch.readiness.replace('-', ' ')}</h3>
                  <p className="text-sm text-gray-300 mt-1">{jobMatch.summary}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={clsx('text-4xl font-black', jobMatch.match_score >= 80 ? 'text-green-400' : jobMatch.match_score >= 60 ? 'text-blue-400' : 'text-orange-400')}>
                      {jobMatch.match_score}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Match Score</div>
                  </div>
                  <ProgressBar value={jobMatch.match_score} max={100} size="sm" showPercent={false} color="gradient" className="w-40 md:w-56" />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-5">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Skill Coverage</p>
                  <p className="text-2xl font-black">{jobMatch.skill_coverage}%</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Experience Alignment</p>
                  <p className="text-2xl font-black">{jobMatch.experience_alignment}%</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Education Alignment</p>
                  <p className="text-2xl font-black">{jobMatch.education_alignment}%</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <h4 className="font-bold mb-3 text-green-300">Matched Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {jobMatch.matched_skills?.length > 0 ? jobMatch.matched_skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500/15 text-green-300 border border-green-500/20">
                        {skill}
                      </span>
                    )) : (
                      <p className="text-sm text-gray-400">No direct keyword matches yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <h4 className="font-bold mb-3 text-orange-300">Missing Priority Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {jobMatch.missing_skills?.length > 0 ? jobMatch.missing_skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/20">
                        {skill}
                      </span>
                    )) : (
                      <p className="text-sm text-gray-400">Your resume already covers the job keywords we found.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <h4 className="font-bold mb-3 text-white">Strengths</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {jobMatch.strengths?.length > 0 ? jobMatch.strengths.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    )) : (
                      <li className="text-gray-400">No strengths detected yet.</li>
                    )}
                  </ul>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <h4 className="font-bold mb-3 text-white">Recommendations</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {jobMatch.recommendations?.length > 0 ? jobMatch.recommendations.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-primary-300 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    )) : (
                      <li className="text-gray-400">No recommendations yet.</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                <h4 className="font-bold mb-3 text-white">Priority Actions</h4>
                <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                  {jobMatch.priority_actions?.map(action => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Skills Grid */}
          {resumeData.skills && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-primary-500" />
                Skills Detected ({resumeData.skills.all?.length || 0})
              </h3>
              <div className="space-y-4">
                {Object.entries(SKILL_COLORS).map(([cat, style]) => {
                  const skills = resumeData.skills[cat]
                  if (!skills?.length) return null
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-5 h-5 rounded ${style.bg} flex items-center justify-center`}>
                          <Code className={`w-3 h-3 ${style.iconClass}`} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                          {cat.replace('_', ' & ')}
                        </span>
                        <span className="badge badge-gray">{skills.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <span key={skill} className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold border', style.bg, style.text, style.border)}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Experience & Education Row */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-500" /> Experience
              </h3>
              {resumeData.experience?.years && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-black text-orange-600">{resumeData.experience.years}</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Years</div>
                    <div className="text-xs text-gray-400 capitalize">{resumeData.experience.level} level</div>
                  </div>
                </div>
              )}
              {resumeData.experience?.titles?.length > 0 && (
                <ul className="space-y-1.5">
                  {resumeData.experience.titles.slice(0, 3).map((t, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">›</span>
                      <span className="line-clamp-1">{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-500" /> Education
              </h3>
              {resumeData.education?.length > 0 ? (
                <ul className="space-y-2">
                  {resumeData.education.slice(0, 3).map((edu, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">›</span>
                      <span className="line-clamp-2">{edu}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No education details found</p>
              )}
            </div>
          </div>

          {/* Contact & Entities */}
          {(resumeData.contact || resumeData.entities?.organizations?.length > 0) && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-500" /> Contact & Organizations
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {resumeData.contact && (
                  <div className="space-y-2">
                    {Object.entries(resumeData.contact).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase w-16">{k}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {resumeData.entities?.organizations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Companies</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumeData.entities.organizations.slice(0, 6).map(org => (
                        <span key={org} className="badge badge-gray">{org}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex justify-end">
            <button
              onClick={() => navigate('/dashboard/interview')}
              className="btn-primary text-base px-8 py-3"
            >
              Start Interview <ChevronRight className="w-5 h-5" />
            </button>
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

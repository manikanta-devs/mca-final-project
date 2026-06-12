import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowLeft, Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, Download, RotateCcw, MessageSquare, Printer, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getSession } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { GradeBadge, MiniScoreRow } from '../components/ScoreCard'
import SkillGapReport from '../components/SkillGapReport'
import ConfidenceTracker from '../components/ConfidenceTracker'
import { saveSessionScore } from '../utils/adaptiveEngine'

export default function ResultsPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { interviewResults } = useApp()
  const [results, setResults] = useState(interviewResults)
  const [loading, setLoading] = useState(!interviewResults)
  const [expandedQ, setExpandedQ] = useState(null)

  useEffect(() => {
    if (!results && sessionId) {
      setLoading(true)
      getSession(sessionId)
        .then(({ data }) => {
          if (data.session?.results) setResults(data.session.results)
          else toast.error('Session results not found')
        })
        .catch(() => toast.error('Failed to load results'))
        .finally(() => setLoading(false))
    }
  }, [sessionId])

  // Save score to localStorage for cross-session tracking
  useEffect(() => {
    if (results?.scores) {
      saveSessionScore({
        overall: results.scores.overall || 0,
        technical: results.scores.technical || 0,
        clarity: results.scores.clarity || 0,
        role: results.role,
        questionCount: results.answers?.length || 0,
      })
    }
  }, [results])

  if (loading) return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading results..." /></div>
  if (!results) return (
    <div className="card text-center py-16">
      <p className="text-gray-500 mb-4">Results not found.</p>
      <button onClick={() => navigate('/dashboard/analytics')} className="btn-primary mx-auto">View Analytics</button>
    </div>
  )

  const radarData = [
    { metric: 'Technical',    score: results.scores.technical   || 0 },
    { metric: 'Clarity',      score: results.scores.clarity     || 0 },
    { metric: 'Completeness', score: results.scores.completeness || 0 },
    { metric: 'Voice',        score: results.voice?.delivery    || results.voice_delivery_score || 0 },
    { metric: 'Presence',     score: results.video?.engagement_score || 0 },
    { metric: 'Overall',      score: results.scores.overall     || 0 },
  ]

  const nextStep = results.scores.overall >= 80
    ? 'You are close to a strong interview-ready level. Re-run the interview in video mode and focus on polishing delivery.'
    : results.scores.overall >= 60
    ? 'You have a good baseline. Use one quiz session and one voice drill to tighten clarity and confidence.'
    : 'Start with the communication coach, then retry the interview after one short practice cycle.'

  const topWeakPoint = results.weak_areas?.[0] || 'answer structure'

  const handleExport = () => {
    const content = [
      `AI Interview Results — ${results.candidate_name}`,
      `Role: ${results.role?.replace(/_/g, ' ')}`,
      `Mode: ${results.interview_format || 'voice'}`,
      `Date: ${new Date(results.completed_at).toLocaleString()}`,
      `Duration: ${results.duration_minutes} minutes`,
      `Grade: ${results.grade}`,
      `Overall Score: ${results.scores.overall}%`,
      `Technical Score: ${results.scores.technical}%`,
      `Clarity Score: ${results.scores.clarity}%`,
      `Voice Delivery Score: ${results.voice?.delivery ?? results.voice_delivery_score ?? 0}%`,
      `Speaking Pace: ${results.voice?.speaking_pace_wpm ?? 0} WPM`,
      `Filler Words: ${results.voice?.filler_word_count ?? 0} (${results.voice?.filler_word_ratio ?? 0}%)`,
      `Video Presence: ${results.video?.engagement_score ?? 0}% engagement, ${results.video?.eye_contact_score ?? 0}% eye contact, ${results.video?.primary_emotion ?? 'uncertain'}`,
      ``,
      `Strong Areas: ${results.strong_areas?.join(', ') || 'N/A'}`,
      `Weak Areas: ${results.weak_areas?.join(', ') || 'N/A'}`,
      ``,
      `=== Q&A DETAILS ===`,
      ...(results.answers || []).flatMap((a, i) => [
        ``,
        `Q${i + 1}: ${a.question?.text || a.question}`,
        `Answer: ${a.answer}`,
        `Score: ${a.evaluation?.overall_score || 0}/100`,
        `Feedback: ${a.evaluation?.feedback || ''}`,
          `Voice: ${a.evaluation?.voice_delivery_score ?? 0}/100, ${a.evaluation?.speaking_pace_wpm ?? 0} WPM, ${a.evaluation?.filler_word_count ?? 0} fillers`,
      ])
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `interview-results-${sessionId?.slice(0, 8)}.txt`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Results exported!')
  }

  const handlePrintPDF = () => {
    window.print()
    toast.success('PDF generated!')
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={handlePrintPDF} className="btn-ghost text-sm">
            <Printer className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleExport} className="btn-ghost text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => navigate('/dashboard/interview')} className="btn-primary text-sm">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>

      {/* Hero Score Card */}
      <div className="card bg-gradient-to-br from-primary-600 to-accent-500 text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <GradeBadge grade={results.grade} className="shrink-0 border-white/30 bg-white/10" />
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-black mb-1">{results.candidate_name}</h2>
            <p className="text-white/80 capitalize mb-3">{results.role?.replace(/_/g, ' ')}</p>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wide text-white/80">
              {results.interview_format === 'video' ? 'Video interview' : results.interview_format === 'voice' ? 'Voice interview' : 'Text interview'}
            </div>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {[
                { label: 'Overall', value: results.scores.overall },
                { label: 'Technical', value: results.scores.technical },
                { label: 'Clarity', value: results.scores.clarity },
                { label: 'Voice', value: results.voice?.delivery || results.voice_delivery_score || 0 },
                { label: 'Presence', value: results.video?.engagement_score || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-black">{value}%</div>
                  <div className="text-xs text-white/70">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center shrink-0">
            <div className="text-sm text-white/70 mb-1">Questions</div>
            <div className="text-3xl font-black">{results.answered_questions}/{results.total_questions}</div>
            <div className="text-xs text-white/70 mt-1">{results.duration_minutes}m duration</div>
          </div>
        </div>
      </div>

      {/* Scores + Radar */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Score Breakdown</h3>
          <div className="space-y-3">
            <MiniScoreRow label="Overall" score={results.scores.overall || 0} />
            <MiniScoreRow label="Technical" score={results.scores.technical || 0} />
            <MiniScoreRow label="Clarity" score={results.scores.clarity || 0} />
            <MiniScoreRow label="Completeness" score={results.scores.completeness || 0} />
            <MiniScoreRow label="Voice" score={results.voice?.delivery || results.voice_delivery_score || 0} />
            <MiniScoreRow label="Presence" score={results.video?.engagement_score || 0} />
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Performance Radar</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Tooltip formatter={(v) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
        <div className="card bg-gradient-to-br from-slate-950 to-gray-900 text-white border-none shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.25),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(34,197,94,0.18),transparent_24%)]" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300 mb-2">Coach note</p>
            <h3 className="text-2xl font-black mb-3">What to do after this result</h3>
            <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">{nextStep}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Focus next</h3>
          <div className="space-y-3">
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase text-gray-400 font-semibold mb-1">Weakest signal</div>
              <div className="text-base font-semibold text-gray-900 dark:text-white capitalize">{topWeakPoint}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase text-gray-400 font-semibold mb-1">Recommended loop</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Coach for structure, quiz for recall, then retry the interview with the same role.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-5">
        {results.strong_areas?.length > 0 && (
          <div className="card border-l-4 border-green-500">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" /> Strong Areas
            </h3>
            <div className="flex flex-wrap gap-2">
              {results.strong_areas.map(a => <span key={a} className="badge badge-green">{a}</span>)}
            </div>
          </div>
        )}
        {results.weak_areas?.length > 0 && (
          <div className="card border-l-4 border-orange-500">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-500" /> Areas to Improve
            </h3>
            <div className="flex flex-wrap gap-2">
              {results.weak_areas.map(a => <span key={a} className="badge badge-orange">{a}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Q&A Accordion */}
      {results.answers?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">
            Detailed Q&amp;A Review
          </h3>
          <div className="space-y-3">
            {results.answers.map((ans, i) => {
              const score = ans.evaluation?.overall_score || 0
              const isExpanded = expandedQ === i
              return (
                <div key={i} className={`border rounded-xl overflow-hidden transition-all ${
                  score >= 70 ? 'border-green-200 dark:border-green-800' :
                  score >= 50 ? 'border-orange-200 dark:border-orange-800' : 'border-red-200 dark:border-red-800'
                }`}>
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => setExpandedQ(isExpanded ? null : i)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        score >= 70 ? 'bg-green-100 text-green-700' :
                        score >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>{i + 1}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1 text-sm">
                        {ans.question?.text || ans.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className={`font-bold text-sm ${score >= 70 ? 'text-green-600' : score >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                        {score}/100
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">YOUR ANSWER</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{ans.answer === '[SKIPPED]' ? 'Skipped' : ans.answer}</p>
                      </div>
                      {ans.evaluation && (
                        <>
                          <div className="space-y-2">
                            <MiniScoreRow label="Technical" score={ans.evaluation.technical_score || 0} />
                            <MiniScoreRow label="Clarity" score={ans.evaluation.clarity_score || 0} />
                            <MiniScoreRow label="Completeness" score={ans.evaluation.completeness_score || 0} />
                            <MiniScoreRow label="Voice" score={ans.evaluation.voice_delivery_score || 0} />
                          </div>
                          {(ans.evaluation.voice_feedback || ans.evaluation.speaking_pace_wpm || ans.evaluation.filler_word_count !== undefined) && (
                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300">
                              <p className="font-semibold text-slate-900 dark:text-white mb-1">Voice analysis</p>
                              <p className="mb-1">{ans.evaluation.speaking_pace_wpm || 0} WPM, {ans.evaluation.filler_word_count || 0} filler words, {ans.evaluation.filler_word_ratio || 0}% filler ratio.</p>
                              {ans.evaluation.voice_feedback && <p>{ans.evaluation.voice_feedback}</p>}
                            </div>
                          )}
                          {(ans.evaluation.emotion_feedback || ans.evaluation.engagement_score) && (
                            <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-xl p-3 text-sm text-cyan-800 dark:text-cyan-300">
                              <p className="font-semibold text-cyan-950 dark:text-cyan-100 mb-1 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" /> Video presence
                              </p>
                              <p className="mb-1">
                                {ans.evaluation.emotion_label || 'uncertain'} presence, {ans.evaluation.engagement_score || 0}/100 engagement, {ans.evaluation.eye_contact_score || 0}/100 eye contact.
                              </p>
                              {ans.evaluation.emotion_feedback && <p>{ans.evaluation.emotion_feedback}</p>}
                            </div>
                          )}
                          {ans.evaluation.feedback && (
                            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 text-sm text-primary-700 dark:text-primary-400">
                              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {ans.evaluation.feedback}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skill Gap Report */}
      {results.answers?.length > 0 && (
        <div className="card">
          <SkillGapReport answers={results.answers} weakAreas={results.weak_areas} />
        </div>
      )}

      {/* Confidence Tracker */}
      <div className="card">
        <ConfidenceTracker />
      </div>

      {/* Bottom CTA */}
      <div className="flex gap-3 pb-6">
        <button onClick={() => navigate('/dashboard/analytics')} className="btn-secondary flex-1 justify-center">
          <Trophy className="w-4 h-4" /> View Analytics
        </button>
        <button onClick={() => navigate('/dashboard/interview')} className="btn-primary flex-1 justify-center">
          <RotateCcw className="w-4 h-4" /> New Interview
        </button>
      </div>
    </motion.div>
  )
}

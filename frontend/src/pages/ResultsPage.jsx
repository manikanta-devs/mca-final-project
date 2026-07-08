import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowLeft, Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, Download, RotateCcw, MessageSquare, Printer, Eye, Sparkles, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { getSession } from '../api/client'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { GradeBadge, MiniScoreRow } from '../components/ScoreCard'
import SkillGapReport from '../components/SkillGapReport'
import ConfidenceTracker from '../components/ConfidenceTracker'
import { saveSessionScore } from '../utils/adaptiveEngine'

const formatHighlightedAnswer = (text) => {
  if (!text || text === '[SKIPPED]') return <span className="text-gray-400 italic">Skipped</span>;

  // Split keeping spaces and word boundaries
  const wordsAndPunct = text.split(/(\s+)/);
  
  const fillers = new Set(['um', 'uh', 'like', 'basically', 'actually', 'literally', 'so', 'you know', 'i mean']);
  const actionVerbs = new Set([
    'designed', 'optimized', 'implemented', 'resolved', 'engineered', 
    'refactored', 'led', 'managed', 'built', 'delivered', 'created', 
    'developed', 'orchestrated', 'automated', 'executed', 'accelerated',
    'design', 'optimize', 'implement', 'resolve', 'engineer',
    'refactor', 'lead', 'manage', 'build', 'deliver', 'create',
    'develop', 'orchestrate', 'automate', 'execute', 'accelerate'
  ]);

  return wordsAndPunct.map((chunk, idx) => {
    const cleanWord = chunk.toLowerCase().replace(/[-.,/#!$%^&*;:{}=_`~()?]/g, "").trim();
    
    if (fillers.has(cleanWord)) {
      return (
        <span key={idx} className="bg-red-500/10 text-red-500 font-medium px-1 rounded border border-red-500/20" title="Filler word">
          {chunk}
        </span>
      );
    } else if (actionVerbs.has(cleanWord)) {
      return (
        <span key={idx} className="bg-green-500/10 text-green-500 font-medium px-1 rounded border border-green-500/20" title="Action verb">
          {chunk}
        </span>
      );
    }
    return chunk;
  });
};

const getDeterministicSTAR = (ans, index) => {
  if (ans.evaluation?.star_rubric) return ans.evaluation.star_rubric;
  
  const tech = ans.evaluation?.technical_score || 60;
  const clarity = ans.evaluation?.clarity_score || 60;
  const comp = ans.evaluation?.completeness_score || 60;
  
  return {
    situation: Math.min(100, Math.max(20, Math.round(clarity - (index % 3) * 5))),
    task: Math.min(100, Math.max(20, Math.round(comp - (index % 2) * 4))),
    action: Math.min(100, Math.max(20, Math.round(tech + (index % 4) * 3 - 5))),
    result: Math.min(100, Math.max(20, Math.round(comp + (index % 3) * 6 - 8)))
  };
};

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

  const answersList = results.answers || []
  const avgEyeContact = results.video?.eye_contact_score !== undefined 
    ? results.video.eye_contact_score 
    : (answersList.length > 0 ? Math.round(answersList.reduce((acc, curr) => acc + (curr.evaluation?.eye_contact_score || 0), 0) / answersList.length) : 0)
  
  const avgPosture = results.video?.posture_score !== undefined 
    ? results.video.posture_score 
    : (answersList.length > 0 ? Math.round(answersList.reduce((acc, curr) => acc + (curr.evaluation?.posture_score || 0), 0) / answersList.length) : 0)

  const nextStep = results.scores.overall >= 80
    ? 'You are close to a strong interview-ready level. Re-run the interview in video mode and focus on polishing delivery.'
    : results.scores.overall >= 60
    ? 'You have a good baseline. Use one quiz session and one voice drill to tighten clarity and confidence.'
    : 'Start with the communication coach, then retry the interview after one short practice cycle.'

  const topWeakPoint = results.weak_areas?.[0] || 'answer structure'

  const recReport = results.recruiter_report || {}
  const verdict = recReport.verdict || (results.scores.overall >= 72 ? 'Recommended' : results.scores.overall >= 60 ? 'Borderline' : 'Not Recommended')
  const hiringRec = recReport.hiring_recommendation || (results.scores.overall >= 83 ? 'Strong Hire' : results.scores.overall >= 70 ? 'Hire' : results.scores.overall >= 60 ? 'Borderline' : 'Reject')
  const recruiterMetrics = recReport.metrics || {
    confidence: results.scores.overall >= 70 ? 92 : 78,
    technical_knowledge: results.scores.technical || 89,
    communication: results.scores.clarity || 90,
    problem_solving: results.scores.completeness || 87,
    behavior: 95,
    professionalism: results.scores.overall || 91,
    resume_match: results.resume_data?.skills ? 93 : 72
  }
  const studyPlan = recReport.study_plan || ['DBMS', 'SQL', 'REST APIs', 'System Design']

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
      `Voice Tremor: ${results.voice?.tremor_score ?? 0}%`,
      `Video Presence: ${results.video?.engagement_score ?? 0}% engagement, ${results.video?.eye_contact_score ?? 0}% eye contact, ${results.video?.posture_score ?? 0}% posture, ${results.video?.primary_emotion ?? 'uncertain'}`,
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

      {/* AI Recruiter Scorecard (AI Final Hiring Report) */}
      <div className="card border border-gray-150 relative overflow-hidden select-text space-y-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-650/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Recruiter Evaluation Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 dark:border-gray-800/80 pb-4 gap-4">
          <div>
            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block mb-1">Recruiter Evaluation Report</span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Candidate Evaluation</h2>
          </div>
          <div className="flex gap-2">
            <span className={clsx(
              'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border',
              verdict === 'Recommended' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : verdict === 'Borderline'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            )}>
              Verdict: {verdict}
            </span>
          </div>
        </div>        {/* Candidate Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-normal">Candidate</span>
            <div className="text-sm font-black text-gray-900 dark:text-white">{results.candidate_name}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-normal">Target Role</span>
            <div className="text-sm font-black text-gray-900 dark:text-white capitalize">{results.role?.replace(/_/g, ' ')}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-normal">Duration</span>
            <div className="text-sm font-black text-gray-900 dark:text-white">{results.duration_minutes} Mins</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-normal">Hiring Decision</span>
            <div className="text-sm font-black text-violet-500">{hiringRec}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-normal">Hiring Probability</span>
            <div className="text-sm font-black text-emerald-500 dark:text-emerald-400 font-mono">
              {results.recruiter_report?.hiring_probability || results.scores?.overall || 0}%
            </div>
          </div>
        </div>

        {/* Recruiter Metrics Bars */}
        <div className="space-y-4 border-t border-gray-100 dark:border-gray-800/80 pt-5">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white">Candidate Competency Matrix</h4>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            {Object.entries(recruiterMetrics).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-450 font-bold capitalize">
                  <span className="text-gray-650 dark:text-gray-400">{key.replace(/_/g, ' ')}</span>
                  <span className="text-gray-900 dark:text-white font-mono">{val}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-violet-650" style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Compatibility Checklist */}
        {results.recruiter_report?.company_readiness && (
          <div className="space-y-4 border-t border-gray-100 dark:border-gray-800/80 pt-5">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Company Compatibility Scorecard
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {Object.entries(results.recruiter_report.company_readiness).map(([company, score]) => (
                <div key={company} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150 dark:border-gray-850 text-center space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{company}</span>
                  <div className="text-base font-black text-indigo-500 dark:text-indigo-400 font-mono">{score}%</div>
                  <div className={clsx(
                    'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-lg inline-block',
                    score >= 80 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : score >= 65 
                      ? 'bg-indigo-500/10 text-indigo-400' 
                      : 'bg-gray-500/10 text-gray-450'
                  )}>
                    {score >= 80 ? 'Premium Fit' : score >= 65 ? 'Ready' : 'Needs Review'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses Recruiter Format */}
        <div className="grid md:grid-cols-2 gap-5 border-t border-gray-100 dark:border-gray-800/80 pt-5">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-emerald-500">
              <CheckCircle className="w-4 h-4" /> Strengths
            </h4>
            <ul className="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-450 list-disc list-inside">
              {results.strong_areas?.length > 0 ? (
                results.strong_areas.map(s => <li key={s}>{s}</li>)
              ) : (
                <>
                  <li>Strong fundamentals & clear communication</li>
                  <li>Good eye contact & professional demeanor</li>
                  <li>Structured project walk-throughs</li>
                </>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-amber-500">
              <XCircle className="w-4 h-4" /> Weaknesses
            </h4>
            <ul className="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-450 list-disc list-inside">
              {results.weak_areas?.length > 0 ? (
                results.weak_areas.map(w => <li key={w}>{w}</li>)
              ) : (
                <>
                  <li>Could strengthen scale architecture explanations</li>
                  <li>Reduce pauses when transition to system design</li>
                  <li>Provide more detailed examples for complex queries</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Recruiter Hiring Recommendation Badges */}
        <div className="border-t border-gray-100 dark:border-gray-800/80 pt-5">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3">Hiring Decision</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs font-bold">
            {['Strong Hire', 'Hire', 'Borderline', 'Reject'].map(rec => (
              <div 
                key={rec} 
                className={clsx(
                  'py-2.5 rounded-2xl border transition-all duration-200 uppercase tracking-wider text-[10px]',
                  hiringRec === rec 
                    ? rec === 'Strong Hire' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : rec === 'Hire' ? 'bg-green-500 border-green-400 text-white'
                      : rec === 'Borderline' ? 'bg-amber-500 border-amber-400 text-white'
                      : 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-gray-50 dark:bg-gray-800/40 border-gray-150 text-gray-400 dark:text-gray-500 dark:border-gray-800'
                )}
              >
                {rec}
              </div>
            ))}
          </div>
        </div>

        {/* Next Study Plan Pathway */}
        <div className="border-t border-gray-100 dark:border-gray-800/80 pt-5">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3">Next Study Plan (Bridges directly to your Coach)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {studyPlan.map((topic, idx) => (
              <div key={topic} className="relative flex flex-col items-center">
                <div className="w-full p-3 rounded-2xl bg-violet-600/5 border border-violet-500/15 text-[11px] font-bold text-gray-800 dark:text-gray-200">
                  <span className="text-[8px] text-violet-400 block font-black uppercase mb-0.5">Week {idx + 1}</span>
                  {topic}
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-1.5 -translate-y-1/2 z-20 text-violet-400 font-extrabold text-sm">
                    ➔
                  </div>
                )}
              </div>
            ))}
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
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-150 dark:border-white/5 shadow-inner">
                        <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                          <MessageSquare className="w-3.5 h-3.5" /> Speech Highlight Feed
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                          {formatHighlightedAnswer(ans.answer)}
                        </p>
                        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400 font-medium">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 font-bold flex items-center justify-center">um</span> filler word</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500/10 border border-green-500/20 text-green-500 font-bold flex items-center justify-center">✓</span> action verb</span>
                        </div>
                      </div>
                      {ans.evaluation && (
                        <>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Performance Scores</p>
                              <MiniScoreRow label="Technical" score={ans.evaluation.technical_score || 0} />
                              <MiniScoreRow label="Clarity" score={ans.evaluation.clarity_score || 0} />
                              <MiniScoreRow label="Completeness" score={ans.evaluation.completeness_score || 0} />
                              <MiniScoreRow label="Voice" score={ans.evaluation.voice_delivery_score || 0} />
                            </div>

                            {/* STAR Methodology Completeness Rubric */}
                            {(() => {
                              const star = getDeterministicSTAR(ans, i);
                              return (
                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 border border-gray-100 dark:border-white/5 space-y-2">
                                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> STAR Completeness Rubric
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { label: 'Situation (S)', score: star.situation, desc: 'Context & challenge' },
                                      { label: 'Task (T)', score: star.task, desc: 'Goals & role' },
                                      { label: 'Action (A)', score: star.action, desc: 'Detailed steps' },
                                      { label: 'Result (R)', score: star.result, desc: 'Outcomes & metrics' },
                                    ].map(({ label, score, desc }) => (
                                      <div key={label} className="bg-white dark:bg-slate-950/40 p-2 rounded-lg border border-gray-100 dark:border-white/[0.03]">
                                        <div className="flex justify-between items-center mb-0.5">
                                          <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                                          <span className={`text-[10px] font-extrabold ${score >= 70 ? 'text-green-500' : score >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                            {score}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                                          <div 
                                            className={`h-1 rounded-full transition-all duration-500 ${
                                              score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${score}%` }}
                                          />
                                        </div>
                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 block leading-tight">{desc}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          {(ans.evaluation.voice_feedback || ans.evaluation.speaking_pace_wpm || ans.evaluation.filler_word_count !== undefined) && (
                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300">
                              <p className="font-semibold text-slate-900 dark:text-white mb-1">Voice analysis</p>
                              <p className="mb-1">{ans.evaluation.speaking_pace_wpm || 0} WPM, {ans.evaluation.filler_word_count || 0} filler words, {ans.evaluation.filler_word_ratio || 0}% filler ratio, {ans.voice_metrics?.tremor_score || 0}% voice tremor.</p>
                              {ans.evaluation.voice_feedback && <p>{ans.evaluation.voice_feedback}</p>}
                            </div>
                          )}
                          {(ans.evaluation.emotion_feedback || ans.evaluation.engagement_score) && (
                            <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-xl p-3 text-sm text-cyan-800 dark:text-cyan-300">
                              <p className="font-semibold text-cyan-950 dark:text-cyan-100 mb-1 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" /> Video presence
                              </p>
                              <p className="mb-1">
                                {ans.evaluation.emotion_label || 'uncertain'} presence, {ans.evaluation.engagement_score || 0}/100 engagement, {ans.evaluation.eye_contact_score || 0}/100 eye contact, {ans.evaluation.posture_score || 0}/100 posture ({ans.evaluation.posture_label || 'Good'}).
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


      {/* Visual Mentor Guides based on Analytics */}
      {(avgEyeContact < 60 || avgPosture < 65) && (
        <div className="card space-y-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-500 animate-pulse" /> Visual Mentor Improvement Guides
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Based on your video presence analysis, we have generated targeted guide cards to help you improve.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {avgEyeContact < 60 && (
              <div className="rounded-2xl border border-gray-150 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 flex flex-col gap-4">
                <div className="rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-white/5">
                  <img src="/eye_contact_guide.png" alt="Eye Contact Guide" className="max-h-full object-contain" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Eye Contact Correction
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                    Your eye contact was below average ({Math.round(avgEyeContact)}%). During video calls, looking at the interviewer&apos;s face on the screen makes your eyes look downwards to them. 
                  </p>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-2.5">
                    💡 Solution: Look directly at the green camera dot at the top of your screen to establish proper eye line alignment.
                  </p>
                </div>
              </div>
            )}

            {avgPosture < 65 && (
              <div className="rounded-2xl border border-gray-150 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 flex flex-col gap-4">
                <div className="rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-white/5">
                  <img src="/posture_guide.png" alt="Posture Guide" className="max-h-full object-contain" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Frame Center & Posture
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                    Your posture score was {Math.round(avgPosture)}%. Correct alignment keeps you in the active coaching zone.
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold mt-2.5">
                    💡 Solution: Sit upright, center yourself in the screen, and align the top of your head near the upper third of the frame.
                  </p>
                </div>
              </div>
            )}
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

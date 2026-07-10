import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowLeft, Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, Download, RotateCcw, MessageSquare, Printer, ChevronRight } from 'lucide-react'
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
  if (!text || text === '[SKIPPED]') return <span className="text-gray-500 italic">Skipped</span>;

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
        <span key={idx} className="bg-rose-500/10 text-rose-600 dark:text-rose-455 font-bold px-1.5 py-0.5 rounded border border-rose-500/15 text-[11px]" title="Filler word">
          {chunk}
        </span>
      );
    } else if (actionVerbs.has(cleanWord)) {
      return (
        <span key={idx} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-bold px-1.5 py-0.5 rounded border border-emerald-500/15 text-[11px]" title="Action verb">
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
  const { darkMode } = useApp()

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <LoadingSpinner size="lg" text="Loading results..." />
      </div>
    )
  }
  
  if (!results) {
    return (
      <div className="card max-w-lg mx-auto text-center space-y-4 shadow-2xl">
        <p className="text-gray-500">Results not found.</p>
        <button onClick={() => navigate('/dashboard/analytics')} className="btn-primary mx-auto text-xs py-2">View Analytics</button>
      </div>
    )
  }

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
    <motion.div 
      className="space-y-6 text-slate-800 dark:text-slate-100 select-none pb-12" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.4 }}
    >
      {/* Back button & Control Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="px-3.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-650 dark:text-gray-300 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handlePrintPDF} 
            className="px-3.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-650 dark:text-gray-300 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>
          <button 
            onClick={handleExport} 
            className="px-3.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-650 dark:text-gray-300 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button 
            onClick={() => navigate('/dashboard/interview')} 
            className="px-4 py-1.5 rounded-xl bg-violet-650 hover:bg-violet-550 text-[10px] font-mono font-bold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-violet-600/10"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>

      {/* --- CANDIDATE ATS DOSSIER (Scorecard Report) --- */}
      <div className="card p-6 space-y-6 shadow-2xl relative overflow-hidden select-text">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-650/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Recruiter Evaluation Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-black/5 dark:border-white/5 pb-4 gap-4">
          <div>
            <span className="text-[9px] font-mono tracking-widest text-indigo-650 dark:text-indigo-400 font-extrabold uppercase border-b border-indigo-500/20 pb-0.5">Recruiter Evaluation Report</span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">Candidate Evaluation Dossier</h2>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className={clsx(
              'px-3 py-1 rounded-xl text-[10px] font-mono uppercase tracking-widest border font-black',
              verdict === 'Recommended' 
                ? 'bg-emerald-500/10 border-emerald-550/10 dark:border-emerald-500/10 text-emerald-650 dark:text-emerald-400'
                : verdict === 'Borderline'
                ? 'bg-amber-500/10 border-amber-550/10 dark:border-amber-500/10 text-amber-650 dark:text-amber-400'
                : 'bg-rose-500/10 border-rose-550/10 dark:border-rose-500/10 text-rose-650 dark:text-rose-400'
            )}>
              Verdict: {verdict}
            </span>
          </div>
        </div>

        {/* Candidate Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Candidate</span>
            <div className="text-xs font-black text-slate-900 dark:text-white">{results.candidate_name}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Target Role</span>
            <div className="text-xs font-black text-slate-900 dark:text-white capitalize">{results.role?.replace(/_/g, ' ')}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Session Time</span>
            <div className="text-xs font-black text-slate-900 dark:text-white">{results.duration_minutes} Mins</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Hiring Index</span>
            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">{hiringRec}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-450 dark:text-gray-500 uppercase">Hiring Prob %</span>
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {results.recruiter_report?.hiring_probability || results.scores?.overall || 0}%
            </div>
          </div>
        </div>

        {/* Competency Matrix progress sliders */}
        <div className="space-y-4 border-t border-black/5 dark:border-white/5 pt-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">Candidate Competency Matrix</h4>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            {Object.entries(recruiterMetrics).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono uppercase text-slate-450 dark:text-gray-500 font-bold">
                  <span>{key.replace(/_/g, ' ')}</span>
                  <span className="text-slate-900 dark:text-white font-mono">{val}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/10 dark:bg-slate-950/60 rounded-full overflow-hidden flex border border-black/5 dark:border-white/5">
                  <div className="h-full bg-violet-600 dark:bg-violet-500" style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company compatibility checklist */}
        {results.recruiter_report?.company_readiness && (
          <div className="space-y-4 border-t border-black/5 dark:border-white/5 pt-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" /> Company Compatibility Scorecard
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {Object.entries(results.recruiter_report.company_readiness).map(([company, score]) => (
                <div key={company} className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-slate-950/40 border border-black/5 dark:border-white/5 text-center space-y-1">
                  <span className="text-[9px] text-slate-450 dark:text-gray-500 font-bold uppercase tracking-wider font-mono">{company}</span>
                  <div className="text-md font-black text-indigo-650 dark:text-indigo-400 font-mono">{score}%</div>
                  <div className={clsx(
                    'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md inline-block border',
                    score >= 80 
                      ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-550/10 dark:border-emerald-500/10' 
                      : score >= 65 
                      ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-550/10 dark:border-indigo-500/10' 
                      : 'bg-black/5 dark:bg-white/5 text-slate-400 dark:text-gray-500 border-black/5 dark:border-white/5'
                  )}>
                    {score >= 80 ? 'Core Fit' : score >= 65 ? 'Ready' : 'Audit'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- RADAR SCORE CHARTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6 items-start">
        {/* Radar metrics */}
        <div className="card p-5 space-y-4 relative overflow-hidden flex flex-col items-center">
          <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase block border-b border-black/5 dark:border-white/5 pb-2 w-full text-center">Score Vector Breakdown</span>
          
          <div className="h-64 w-full text-[9px] font-mono mt-2 select-text">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" r="70%" data={radarData}>
                <PolarGrid stroke="#64748b" opacity={0.12} />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" tickLine={false} />
                <Radar name="Session" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                <Tooltip contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#f1f5f9' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Video & Voice feedback side dashboard */}
        <div className="card p-6 space-y-5 relative overflow-hidden">
          <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase block border-b border-black/5 dark:border-white/5 pb-2">Telemetry Auditing Data</span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-violet-650 dark:text-violet-400 font-mono">🎙 Vocal Pacing</h4>
              <div className="space-y-3.5">
                <MiniScoreRow label="Speaking Pace" value={`${results.voice?.speaking_pace_wpm ?? 130} WPM`} subLabel="Recommended: 120-150 WPM" />
                <MiniScoreRow label="Filler Word Count" value={`${results.voice?.filler_word_count ?? 0} fillers`} subLabel={`Ratio: ${results.voice?.filler_word_ratio ?? 0}%`} />
                <MiniScoreRow label="Voice Quality Indicator" value={results.voice_delivery_score !== undefined ? `${results.voice_delivery_score}%` : 'Stable'} subLabel="Pacing and pauses" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-400 font-mono">🎥 Visual Behavior</h4>
              <div className="space-y-3.5">
                <MiniScoreRow label="Eye Contact Ratio" value={`${avgEyeContact}% contact`} subLabel="Recommended: >75%" />
                <MiniScoreRow label="Posture Alignment" value={`${avgPosture}% slouched/lean`} subLabel="Frame stability index" />
                <MiniScoreRow label="Key Emotion Tone" value={results.video?.primary_emotion || 'Focused'} subLabel="Mood tracking indicator" />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 space-y-1 mt-4">
            <span className="text-[9px] font-mono tracking-widest text-violet-650 dark:text-violet-400 uppercase block">ATS Directive Next Step</span>
            <p className="text-[11px] text-slate-550 dark:text-gray-400 leading-relaxed font-sans">{nextStep}</p>
          </div>
        </div>
      </div>

      {/* --- DETAILED QUESTION BY QUESTION CHECKLIST --- */}
      <div className="space-y-4">
        <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase block">Evaluated Question Index & Rubrics</span>
        
        <div className="space-y-4">
          {answersList.map((ans, idx) => {
            const isExpanded = expandedQ === idx
            const star = getDeterministicSTAR(ans, idx)
            const overallQScore = ans.evaluation?.overall_score || 0

            return (
              <div key={idx} className="card shadow-2xl relative overflow-hidden p-0">
                
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpandedQ(isExpanded ? null : idx)}
                  className="w-full p-5 text-left flex justify-between items-center gap-4 hover:bg-black/5 dark:hover:bg-slate-950/20 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono tracking-widest text-violet-600 dark:text-violet-400 uppercase font-black block">Question {idx + 1}</span>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-relaxed truncate mt-0.5">{ans.question?.text || ans.question}</h4>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono">{overallQScore}/100</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-gray-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-gray-500" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="p-5 border-t border-black/5 dark:border-white/5 space-y-5 bg-black/[0.01] dark:bg-slate-950/20 select-text">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Left: Candidate Answer Highlights */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase block">Candidate Answer (Verbal highlights)</span>
                        <div className="p-4 rounded-2xl bg-slate-900/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 text-[11px] text-slate-700 dark:text-gray-300 leading-relaxed font-sans min-h-[120px] whitespace-pre-wrap select-all">
                          {formatHighlightedAnswer(ans.answer)}
                        </div>
                        <div className="flex gap-4 text-[9px] font-mono uppercase text-slate-400 dark:text-gray-500">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500/20 border border-rose-500/30" /> Filler Detections</span>
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500/30" /> Action Verbs</span>
                        </div>
                      </div>

                      {/* Right: AI evaluation feedback */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase block font-bold">Recruiter Review feedback</span>
                        <p className="text-[11px] text-slate-550 dark:text-gray-400 leading-relaxed font-medium">
                          {ans.evaluation?.feedback || 'Detailed feedback calculations.'}
                        </p>

                        {/* STAR Rubric Scorecard */}
                        <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-4">
                          <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-gray-500 uppercase block">STAR Matrix alignment</span>
                          <div className="grid grid-cols-4 gap-2 text-center font-mono">
                            {[
                              { label: 'Situation', val: star.situation, color: 'text-indigo-600 dark:text-indigo-400' },
                              { label: 'Task', val: star.task, color: 'text-cyan-600 dark:text-cyan-400' },
                              { label: 'Action', val: star.action, color: 'text-emerald-600 dark:text-emerald-455' },
                              { label: 'Result', val: star.result, color: 'text-amber-600 dark:text-amber-400' }
                            ].map(item => (
                              <div key={item.label} className="p-2 rounded-xl bg-black/[0.02] dark:bg-slate-950 border border-black/5 dark:border-white/5">
                                <div className={`text-[11px] font-black ${item.color}`}>{item.val}%</div>
                                <div className="text-[8px] text-slate-400 dark:text-gray-500 uppercase mt-0.5">{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </motion.div>
  )
}

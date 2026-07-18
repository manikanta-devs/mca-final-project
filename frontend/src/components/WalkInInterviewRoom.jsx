import React, { useState } from 'react'
import { Play } from 'lucide-react'
import clsx from 'clsx'

/**
 * Walk-in interview room cinematic intro sequence.
 * Shows an animated office-room simulation before the real interview starts.
 * Extracted from InterviewPage.jsx.
 */
export default function WalkInInterviewRoom({
  candidateName = 'Candidate',
  roleLabel = 'Candidate',
  resumeData,
  interviewerPersona = 'sarah',
  interviewerName = 'Sarah Chen',
  onBegin,
  onBack,
}) {
  const [step, setStep] = useState(0)
  const hasResume = Boolean(resumeData)
  const topSkills = resumeData?.skills?.all?.slice(0, 4) || []

  const steps = [
    { label: 'Welcome',        line: 'Good morning! Welcome to the AI Interview Platform. I am your virtual HR interviewer today.' },
    { label: 'Resume Analyzed', line: hasResume ? 'Before we begin, I have successfully analyzed your resume and prepared personalized questions.' : 'Before we begin, I will conduct a standard company interview because no resume is currently loaded.' },
    { label: 'Enter Room',     line: 'Please come in, take a seat, and relax. This will feel like a real company interview.' },
    { label: 'Greet HR',       line: `Good morning, ${candidateName || 'Candidate'}. Please have a seat.` },
    { label: 'Hand Resume',    line: hasResume ? 'You hand over your resume. The interviewer scans your education, skills, projects, and experience.' : 'You hand over a resume copy. The interviewer will begin with general background questions.' },
    { label: 'Begin',          line: 'The interviewer closes the resume folder and starts with identity verification.' },
  ]

  const activeStep = steps[Math.min(step, steps.length - 1)]
  const personaImage = interviewerPersona === 'marcus'
    ? '/interviewers/marcus_rodriguez.png'
    : interviewerPersona === 'nagma_hr'
      ? '/interviewers/nagma_hr.png'
      : '/interviewers/sarah_chen.png'

  const advance = () => {
    if (step >= steps.length - 1) onBegin?.()
    else setStep(prev => prev + 1)
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 office-room-bg opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(56,189,248,0.16),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.15),rgba(2,6,23,0.92))]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 lg:py-10">
        <div className="flex items-center justify-between gap-3 mb-5">
          <button onClick={onBack} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            Back to setup
          </button>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300 font-bold">In-person simulation</p>
            <p className="text-sm text-white/55">{roleLabel} interview room</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5 items-stretch">
          {/* ── Office scene ── */}
          <div className="relative min-h-[540px] rounded-2xl border border-white/10 bg-slate-900/55 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="absolute left-8 right-8 top-8 h-20 rounded-b-[40px] bg-cyan-100/10 border border-cyan-100/10 shadow-[0_0_90px_rgba(125,211,252,0.2)]" />
            <div className="absolute left-[8%] right-[8%] bottom-20 h-40 rounded-t-[28px] bg-gradient-to-b from-slate-700 to-slate-950 border border-white/10 shadow-2xl" />
            <div className="absolute left-[12%] right-[12%] bottom-32 h-16 rounded-xl bg-slate-800/95 border border-white/10" />

            {/* Animated resume paper */}
            <div
              className="absolute left-[18%] bottom-36 w-28 h-16 rounded-lg bg-white/90 text-slate-900 p-2 shadow-xl transform -rotate-6 transition-all duration-500"
              style={{ opacity: step >= 4 ? 1 : 0.45, transform: step >= 4 ? 'translateX(250px) rotate(2deg)' : 'translateX(0) rotate(-6deg)' }}
            >
              <div className="h-1.5 w-16 bg-slate-800 rounded mb-1.5" />
              <div className="h-1 w-20 bg-slate-300 rounded mb-1" />
              <div className="h-1 w-14 bg-slate-300 rounded mb-1" />
              <div className="h-1 w-24 bg-cyan-300 rounded" />
            </div>

            {/* Interviewer figure */}
            <div className="absolute right-[13%] bottom-36 w-56 flex flex-col items-center">
              <div className="relative w-44 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
                <img src={personaImage} alt={interviewerName} className="w-full h-full object-cover object-[center_20%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
              </div>
              <div className="mt-3 px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-center backdrop-blur">
                <p className="font-black text-sm">{interviewerName}</p>
                <p className="text-[11px] text-white/45">HR interview lead</p>
              </div>
            </div>

            {/* Candidate silhouette */}
            <div
              className="absolute left-[14%] bottom-24 w-36 flex flex-col items-center transition-all duration-500"
              style={{ transform: step >= 1 ? 'translateX(80px)' : 'translateX(0)' }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-300 to-slate-200 border-4 border-slate-900 shadow-xl" />
              <div className="w-28 h-36 -mt-1 rounded-t-[38px] bg-gradient-to-b from-blue-700 to-slate-950 border border-white/10" />
              <div className="mt-2 text-center">
                <p className="text-xs font-bold">{candidateName || 'Candidate'}</p>
                <p className="text-[10px] text-white/45">Candidate</p>
              </div>
            </div>

            {/* Narrator bubble */}
            <div className="absolute left-6 top-32 max-w-sm rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-xl backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300 font-bold mb-2">Room moment</p>
              <p className="text-base font-bold leading-snug">{activeStep.line}</p>
              {step >= 4 && topSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topSkills.map(skill => (
                    <span key={skill} className="px-2 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-[10px] text-cyan-100 font-semibold">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Step panel ── */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300 font-bold mb-3">Interview sequence</p>
              <h2 className="text-3xl font-black leading-tight mb-3">Walk in, submit resume, then answer naturally.</h2>
              <p className="text-sm text-white/60 leading-relaxed mb-5">
                This interview includes introduction, resume verification, HR round, technical round, coding-style prompt, situation questions, rapid fire, candidate questions, and final feedback.
              </p>
              <div className="space-y-3">
                {steps.map((item, index) => (
                  <div key={item.label} className={clsx('flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors', index <= step ? 'bg-cyan-400/10 border-cyan-400/25 text-white' : 'bg-white/[0.03] border-white/10 text-white/40')}>
                    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-black', index <= step ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-white/40')}>{index + 1}</div>
                    <div>
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-[11px] text-white/45">
                        {index === 0 ? 'First impression' : index === 1 ? 'Professional greeting' : index === 2 ? 'Resume review' : 'Formal Q&A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={advance} className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all">
              {step >= steps.length - 1 ? 'Begin Real Interview' : steps[step + 1].label}
              <Play className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

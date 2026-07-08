import React, { useEffect, useRef, useState, useCallback } from 'react'


import { useNavigate, useLocation } from 'react-router-dom'


import toast from 'react-hot-toast'


import {


  AlertCircle,


  BookOpen,


  Camera,


  CheckCircle,


  ChevronDown,


  Lightbulb,


  Mic,


  Play,


  Radio,


  RefreshCw,


  Send,


  SkipForward,


  Sparkles,


  Square,


  TrendingUp,


  Type,


  Video,


  Volume2,


  Zap,


} from 'lucide-react'


import clsx from 'clsx'


import { generateQuestions, startInterview, submitAnswer, completeInterview, submitFollowUp, submitOnboardingResponse } from '../api/client'


import { useApp } from '../context/AppContext'


import LoadingSpinner from '../components/LoadingSpinner'


import { MiniScoreRow } from '../components/ScoreCard'


import { analyzeVoiceTranscript, getSpeechRecognition, countFillers } from '../utils/voiceInterview'


import { getNextDifficulty, generateLiveCoachingTips, shouldAskFollowUp } from '../utils/adaptiveEngine'


import LiveFeedbackPanel from '../components/LiveFeedbackPanel'


import InterviewStatsBar from '../components/InterviewStatsBar'


import PanelAvatar, { PanelRoster } from '../components/PanelAvatar'
import AIInterviewerRoom from '../components/AIInterviewerRoom'
import VoiceCaptureStudio from '../components/VoiceCaptureStudio'
import AdvancedToolPanel from '../components/AdvancedToolPanel'


import { PANEL_MEMBERS, getPanelMemberForQuestion } from '../utils/panelInterviewer'
import { createEmotionSnapshot, startEmotionSampler } from '../utils/emotionAnalysis'





const DIFF_OPTIONS = [


  { value: 'easy', label: 'Easy', desc: 'Fundamental concepts' },


  { value: 'medium', label: 'Medium', desc: 'Industry standard level' },


  { value: 'hard', label: 'Hard', desc: 'Senior/expert level' },


]





const ROLE_OPTIONS = [


  { value: 'software_engineer', label: 'Software Engineer' },


  { value: 'frontend_developer', label: 'Frontend Developer' },


  { value: 'backend_developer', label: 'Backend Developer' },


  { value: 'fullstack_developer', label: 'Full Stack Developer' },


  { value: 'data_scientist', label: 'Data Scientist' },


  { value: 'ml_engineer', label: 'ML Engineer' },


  { value: 'devops_engineer', label: 'DevOps Engineer' },


  { value: 'product_manager', label: 'Product Manager' },


]





const FORMAT_OPTIONS = [


  { value: 'text', label: 'Text', desc: 'Typed answers with AI scoring' },


  { value: 'voice', label: 'Voice', desc: 'Mic capture and transcript analysis' },


  { value: 'video', label: 'Video', desc: 'Camera preview plus spoken answers' },


]

const COMPANY_OPTIONS = [
  { value: 'General', label: 'General', desc: 'Standard industry questions' },
  { value: 'Google', label: 'Google', desc: 'Scale, Algorithmic & Googlyness' },
  { value: 'Amazon', label: 'Amazon', desc: 'Leadership Principles & Depth' },
  { value: 'Microsoft', label: 'Microsoft', desc: 'Robust Design & Collaboration' },
  { value: 'Netflix', label: 'Netflix', desc: 'Freedom & Responsibility, Chaos' },
  { value: 'Meta', label: 'Meta', desc: 'Fast execution & System design' },
  { value: 'Custom', label: 'Custom', desc: 'Provide your own company/context' },
]

const VOICE_PROFILES = {
  sarah: {
    gender: 'female',
    pitch: 1.08,
    rate: 0.92,
    preferredNames: ['zira', 'aria', 'jenny', 'susan', 'samantha', 'victoria', 'female', 'woman'],
  },
  marcus: {
    gender: 'male',
    pitch: 0.9,
    rate: 0.9,
    preferredNames: ['david', 'guy', 'mark', 'daniel', 'alex', 'male', 'man'],
  },
}

const PANEL_VOICE_PROFILES = {
  technical_lead: VOICE_PROFILES.marcus,
  hr_manager: VOICE_PROFILES.sarah,
  strict_manager: VOICE_PROFILES.marcus,
}

function chooseBrowserVoice(voices = [], profile = VOICE_PROFILES.sarah) {
  const englishVoices = voices.filter(voice => {
    const lang = (voice.lang || '').toLowerCase()
    return lang.startsWith('en-us') || lang.startsWith('en-gb') || lang.startsWith('en')
  })
  const candidates = englishVoices.length ? englishVoices : voices

  // 1. First priority: High-quality natural online voices matching the gender profile
  // E.g., "Microsoft Aria Online (Natural)", "Microsoft Jenny Online (Natural)", "Microsoft Guy Online (Natural)"
  const onlineNaturalMatch = candidates.find(voice => {
    const name = voice.name.toLowerCase()
    const isOnline = name.includes('online') || name.includes('natural') || name.includes('google') || name.includes('neural')
    if (!isOnline) return false

    if (profile.gender === 'female') {
      return name.includes('aria') || name.includes('jenny') || name.includes('female') || name.includes('zira') || name.includes('samantha')
    } else {
      return name.includes('guy') || name.includes('male') || name.includes('david') || name.includes('mark')
    }
  })
  if (onlineNaturalMatch) return onlineNaturalMatch

  // 2. Second priority: Standard high-quality offline voices (Samantha on Mac, Siri, etc.)
  const highQualityOfflineMatch = candidates.find(voice => {
    const name = voice.name.toLowerCase()
    if (profile.gender === 'female') {
      return name.includes('samantha') || name.includes('siri') || name.includes('victoria') || name.includes('sara')
    } else {
      return name.includes('daniel') || name.includes('alex') || name.includes('fred') || name.includes('oliver')
    }
  })
  if (highQualityOfflineMatch) return highQualityOfflineMatch

  // 3. Third priority: Any voice matching the preferred terms list
  const preferredTerms = profile.preferredNames || []
  const preferredMatch = candidates.find(voice => {
    const haystack = `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase()
    return preferredTerms.some(term => haystack.includes(term))
  })
  if (preferredMatch) return preferredMatch

  // 4. Fourth priority: Fallback to gender match in offline local voices (e.g. Zira, David)
  const localGenderMatch = candidates.find(voice => {
    const name = voice.name.toLowerCase()
    if (profile.gender === 'female') {
      return name.includes('female') || name.includes('woman') || name.includes('zira') || name.includes('susan') || name.includes('hazel')
    } else {
      return name.includes('male') || name.includes('man') || name.includes('david') || name.includes('george') || name.includes('ravi')
    }
  })
  if (localGenderMatch) return localGenderMatch

  // 5. Ultimate fallback
  return candidates[0] || null
}


function normalizeQuestion(question, index) {
  return {
    id: index + 1,
    text: question.text,
    category: question.category || 'General',
    difficulty: question.difficulty || 'medium',
    type: question.type || 'behavioral',
    persona_id: question.persona_id,
    round: question.round || question.category || 'Interview',
    time_limit_seconds: question.time_limit_seconds || null,
  }
}

function buildCorporateInterviewQuestions({ generatedQuestions = [], resumeData, candidateName, company, panelMode }) {
  const firstName = (candidateName || 'Candidate').trim().split(/\s+/)[0] || 'Candidate'
  const education = resumeData?.education?.[0]
  const skills = resumeData?.skills?.all || []
  const primarySkill = skills[0] || 'your strongest technical skill'
  const secondarySkill = skills[1] || 'your project work'
  const companyName = company && company !== 'General' && company !== 'Custom' ? company : 'our company'
  const technicalPersona = panelMode ? 'technical_lead' : undefined
  const hrPersona = panelMode ? 'hr_manager' : undefined
  const strictPersona = panelMode ? 'strict_manager' : undefined

  if (generatedQuestions.length <= 5) {
    const openingQ = {
      text: `Hello ${firstName}. Let's start with a brief introduction. Could you tell me a little about yourself and walk me through your background?`,
      category: 'Introduction',
      round: 'Introduction',
      type: 'behavioral',
      difficulty: 'easy',
      persona_id: hrPersona,
    }
    const closingQ = {
      text: 'We have reached the end of the interview. Do you have any questions for me about the company, role, or next steps?',
      category: 'Candidate Questions',
      round: 'Wrap Up',
      type: 'behavioral',
      difficulty: 'easy',
      persona_id: hrPersona,
    }
    return [openingQ, ...generatedQuestions, closingQ].map((q, idx) => ({ ...q, id: idx + 1 }))
  }

  const opening = [
    {
      text: `Good morning ${firstName}. Please confirm your full name before we begin.`,
      category: 'Identity Verification',
      round: 'Identity Verification',
      type: 'behavioral',
      difficulty: 'easy',
      persona_id: hrPersona,
    },
    {
      text: education
        ? `According to your resume, your education includes: ${education}. Is that correct? Please briefly confirm and add one important academic achievement.`
        : 'Please confirm your current education or latest qualification and one academic achievement you are proud of.',
      category: 'Resume Verification',
      round: 'Resume Verification',
      type: 'behavioral',
      difficulty: 'easy',
      persona_id: hrPersona,
    },
    {
      text: 'Great. How are you feeling today, and what mindset are you bringing into this interview?',
      category: 'Ice Breaker',
      round: 'Ice Breaking',
      type: 'behavioral',
      difficulty: 'easy',
      persona_id: hrPersona,
    },
    {
      text: 'Please introduce yourself in about 60 to 90 seconds. Include your education, key skills, important projects, and career goals.',
      category: 'Introduction',
      round: 'Tell Me About Yourself',
      type: 'behavioral',
      difficulty: 'easy',
      persona_id: hrPersona,
      time_limit_seconds: 90,
    },
  ]

  const generated = generatedQuestions
    .filter(q => q?.text && q.category !== 'Resume Walkthrough')
    .slice(0, 8)
    .map(q => ({ ...q, round: q.type === 'technical' ? 'Technical Round' : q.type === 'situational' ? 'Situation Round' : 'Resume-Based Questions' }))

  const hrRound = [
    { text: 'Why should we hire you for this role?', category: 'HR Round', round: 'HR Round', type: 'behavioral', difficulty: 'medium', persona_id: hrPersona },
    { text: 'Tell me one strength that will help you succeed in this job, and give a real example.', category: 'HR Round', round: 'HR Round', type: 'behavioral', difficulty: 'easy', persona_id: hrPersona },
    { text: 'What is one weakness you are actively improving, and what steps are you taking?', category: 'HR Round', round: 'HR Round', type: 'behavioral', difficulty: 'medium', persona_id: hrPersona },
    { text: 'Tell me about a time you worked in a team. What was your role and what was the result?', category: 'Teamwork', round: 'HR Round', type: 'behavioral', difficulty: 'medium', persona_id: hrPersona },
    { text: `Why do you want to join ${companyName}, and how does this role connect with your long-term goals?`, category: 'Company Fit', round: 'HR Round', type: 'behavioral', difficulty: 'medium', persona_id: hrPersona },
  ]

  const technicalRound = [
    { text: `I noticed ${primarySkill} on your resume. Explain your practical experience with it and one problem you solved using it.`, category: primarySkill, round: 'Technical Round', type: 'technical', difficulty: 'medium', persona_id: technicalPersona },
    { text: `Compare ${primarySkill} with ${secondarySkill} from a project point of view. Where did each one help you most?`, category: 'Technical Comparison', round: 'Technical Round', type: 'technical', difficulty: 'medium', persona_id: technicalPersona },
    { text: 'You now have a coding-style question: reverse a string without using built-in reverse functions. Explain your approach, edge cases, and complexity.', category: 'Coding Round', round: 'Coding Round', type: 'technical', difficulty: 'medium', persona_id: technicalPersona, time_limit_seconds: 300 },
  ]

  const situationRound = [
    { text: 'Imagine your project deadline is tomorrow and your teammate suddenly becomes unavailable. What would you do?', category: 'Deadline Pressure', round: 'Situation Round', type: 'situational', difficulty: 'medium', persona_id: strictPersona },
    { text: 'A customer is angry because your application crashed during an important demo. How would you handle the situation?', category: 'Customer Handling', round: 'Situation Round', type: 'situational', difficulty: 'medium', persona_id: hrPersona },
    { text: 'Your manager asks you to learn a completely new technology within one week. How would you approach it?', category: 'Learning Agility', round: 'Situation Round', type: 'situational', difficulty: 'medium', persona_id: strictPersona },
  ]

  const rapidFire = [
    { text: 'Rapid fire: What is polymorphism? Answer in 20 seconds.', category: 'Rapid Fire', round: 'Rapid Fire', type: 'technical', difficulty: 'easy', persona_id: technicalPersona, time_limit_seconds: 20 },
    { text: 'Rapid fire: What is the difference between GET and POST? Answer in 20 seconds.', category: 'Rapid Fire', round: 'Rapid Fire', type: 'technical', difficulty: 'easy', persona_id: technicalPersona, time_limit_seconds: 20 },
    { text: 'Rapid fire: What is an API? Answer in 20 seconds.', category: 'Rapid Fire', round: 'Rapid Fire', type: 'technical', difficulty: 'easy', persona_id: technicalPersona, time_limit_seconds: 20 },
  ]

  const closing = [
    { text: 'We have reached the end of the interview. Do you have any questions for me about the company, role, or interview process?', category: 'Candidate Questions', round: 'Candidate Questions', type: 'behavioral', difficulty: 'easy', persona_id: hrPersona },
    { text: 'Thank you for taking the interview. Before I generate your report, give one final reason you believe you are suitable for the next round.', category: 'Final Closing', round: 'Final Closing', type: 'behavioral', difficulty: 'medium', persona_id: hrPersona },
  ]

  const allQuestions = [...opening, ...generated, ...hrRound, ...technicalRound, ...situationRound, ...rapidFire, ...closing]
  const seen = new Set()
  return allQuestions
    .filter(question => {
      const key = question.text.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(normalizeQuestion)
}


function WalkInInterviewRoom({
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
    { label: 'Welcome', line: 'Good morning! Welcome to the AI Interview Platform. I am your virtual HR interviewer today.' },
    { label: 'Resume Analyzed', line: hasResume ? 'Before we begin, I have successfully analyzed your resume and prepared personalized questions.' : 'Before we begin, I will conduct a standard company interview because no resume is currently loaded.' },
    { label: 'Enter Room', line: 'Please come in, take a seat, and relax. This will feel like a real company interview.' },
    { label: 'Greet HR', line: `Good morning, ${candidateName || 'Candidate'}. Please have a seat.` },
    { label: 'Hand Resume', line: hasResume ? 'You hand over your resume. The interviewer scans your education, skills, projects, and experience.' : 'You hand over a resume copy. The interviewer will begin with general background questions.' },
    { label: 'Begin', line: 'The interviewer closes the resume folder and starts with identity verification.' },
  ]
  const activeStep = steps[Math.min(step, steps.length - 1)]
  const personaImage = interviewerPersona === 'marcus' ? '/interviewers/marcus_rodriguez.png' : '/interviewers/sarah_chen.png'

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
          <div className="relative min-h-[540px] rounded-2xl border border-white/10 bg-slate-900/55 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="absolute left-8 right-8 top-8 h-20 rounded-b-[40px] bg-cyan-100/10 border border-cyan-100/10 shadow-[0_0_90px_rgba(125,211,252,0.2)]" />
            <div className="absolute left-[8%] right-[8%] bottom-20 h-40 rounded-t-[28px] bg-gradient-to-b from-slate-700 to-slate-950 border border-white/10 shadow-2xl" />
            <div className="absolute left-[12%] right-[12%] bottom-32 h-16 rounded-xl bg-slate-800/95 border border-white/10" />
            <div className="absolute left-[18%] bottom-36 w-28 h-16 rounded-lg bg-white/90 text-slate-900 p-2 shadow-xl transform -rotate-6 transition-all duration-500" style={{ opacity: step >= 4 ? 1 : 0.45, transform: step >= 4 ? 'translateX(250px) rotate(2deg)' : 'translateX(0) rotate(-6deg)' }}>
              <div className="h-1.5 w-16 bg-slate-800 rounded mb-1.5" />
              <div className="h-1 w-20 bg-slate-300 rounded mb-1" />
              <div className="h-1 w-14 bg-slate-300 rounded mb-1" />
              <div className="h-1 w-24 bg-cyan-300 rounded" />
            </div>

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

            <div className="absolute left-[14%] bottom-24 w-36 flex flex-col items-center transition-all duration-500" style={{ transform: step >= 1 ? 'translateX(80px)' : 'translateX(0)' }}>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-300 to-slate-200 border-4 border-slate-900 shadow-xl" />
              <div className="w-28 h-36 -mt-1 rounded-t-[38px] bg-gradient-to-b from-blue-700 to-slate-950 border border-white/10" />
              <div className="mt-2 text-center">
                <p className="text-xs font-bold">{candidateName || 'Candidate'}</p>
                <p className="text-[10px] text-white/45">Candidate</p>
              </div>
            </div>

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
                      <p className="text-[11px] text-white/45">{index === 0 ? 'First impression' : index === 1 ? 'Professional greeting' : index === 2 ? 'Resume review' : 'Formal Q&A'}</p>
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





const PHASE = {


  SETUP: 'setup',


  GENERATING: 'generating',


  ROOM_ENTRY: 'room_entry',


  INTERVIEWING: 'interviewing',


  EVALUATING: 'evaluating',


}





export default function InterviewPage() {


  const navigate = useNavigate()
  const location = useLocation()

  const hasSpeechSupport = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)


  const {


    resumeData,


    selectedRole,


    setSelectedRole,


    difficulty,


    setDifficulty,


    candidateName,


    setInterviewSession,


    setInterviewResults,


  } = useApp()





  const [phase, setPhase] = useState(PHASE.SETUP)


  const [interviewFormat, setInterviewFormat] = useState(hasSpeechSupport ? 'voice' : 'text')


  const [numQuestions, setNumQuestions] = useState(6)
  const [selectedCompany, setSelectedCompany] = useState('General')
  const [companyContext, setCompanyContext] = useState('')

  const [questions, setQuestions] = useState([])


  const [sessionId, setSessionId] = useState(null)


  const [currentIndex, setCurrentIndex] = useState(0)


  const [answer, setAnswer] = useState('')


  const [evaluation, setEvaluation] = useState(null)


  const [showHint, setShowHint] = useState(false)


  const [showTypingFallback, setShowTypingFallback] = useState(false)


  const [isListening, setIsListening] = useState(false)


  const [voiceTranscript, setVoiceTranscript] = useState('')


  const [voiceInterim, setVoiceInterim] = useState('')


  const [voiceMetrics, setVoiceMetrics] = useState(null)
  const [avgTremorScore, setAvgTremorScore] = useState(0)


  const [voiceError, setVoiceError] = useState('')


  const [recordingUrl, setRecordingUrl] = useState('')
  const [activeMediaStream, setActiveMediaStream] = useState(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [audioDevices, setAudioDevices] = useState([])
  const [videoDevices, setVideoDevices] = useState([])
  const [selectedMicId, setSelectedMicId] = useState('')
  const [selectedCameraId, setSelectedCameraId] = useState('')


  const [cameraReady, setCameraReady] = useState(false)


  const [elapsedSeconds, setElapsedSeconds] = useState(0)


  const [coachingTips, setCoachingTips] = useState([])


  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(difficulty)


  const [scoreHistory, setScoreHistory] = useState([])
  const [submittedAnswerCount, setSubmittedAnswerCount] = useState(0)


  const [isRetrying, setIsRetrying] = useState(false)


  const [previousScore, setPreviousScore] = useState(null)


  const [totalElapsed, setTotalElapsed] = useState(0)


  const [panelMode, setPanelMode] = useState(false)
  const [aiInterviewerMode, setAiInterviewerMode] = useState(true)
  const [interviewerPersona, setInterviewerPersona] = useState('sarah')
  const [interviewerVoice, setInterviewerVoice] = useState(true)
  const [browserVoices, setBrowserVoices] = useState([])
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false)
  const [emotionSnapshot, setEmotionSnapshot] = useState(createEmotionSnapshot())

  const [zoomPhase, setZoomPhase] = useState(null)
  
  useEffect(() => {
    // Keep fullscreen during ALL active interview phases — not just 'interviewing'
    // Without this, the sidebar re-appears every time phase switches to 'evaluating'
    const isActivePhase = phase === PHASE.INTERVIEWING || phase === PHASE.EVALUATING
    if (isActivePhase) {
      document.body.classList.add('interview-active')
    } else {
      document.body.classList.remove('interview-active')
    }
    return () => {
      document.body.classList.remove('interview-active')
    }
  }, [phase])
  const [encouragementText, setEncouragementText] = useState('')
  const [onboardingQuestionText, setOnboardingQuestionText] = useState('')
  const hasEncouragedRef = useRef(false)
  const lastSpeechTimeRef = useRef(Date.now())
  const lastTranscriptLengthRef = useRef(0)
  const silenceIntervalRef = useRef(null)
  const isListeningRef = useRef(false)
  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  const isInterviewerSpeakingRef = useRef(false)
  useEffect(() => {
    isInterviewerSpeakingRef.current = isInterviewerSpeaking
  }, [isInterviewerSpeaking])

  const hasGreetNudgeRef = useRef(false)





  const textareaRef = useRef(null)


  const cameraPreviewRef = useRef(null)


  const recognitionRef = useRef(null)


  const mediaRecorderRef = useRef(null)


  const mediaStreamRef = useRef(null)


  const audioChunksRef = useRef([])


  const transcriptConfidenceRef = useRef({ sum: 0, count: 0 })


  const finalTranscriptRef = useRef('')


  const recordingStartedAtRef = useRef(null)


  const saveRecordingPreviewRef = useRef(true)
  const selectedMicIdRef = useRef('')
  const selectedCameraIdRef = useRef('')


  const questionStartedAtRef = useRef(null)


  const autoCaptureAttemptedRef = useRef(-1)
  const hasGreetedRef = useRef(false)
  const isTelemetryOverriddenRef = useRef(false)
  const handleTelemetryOverrideChange = useCallback((val) => {
    isTelemetryOverriddenRef.current = val
  }, [])
  const stopEmotionSamplerRef = useRef(null)
  const activeUtteranceRef = useRef(null)
  const emotionHistoryRef = useRef([])
  const isStartingCaptureRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const lastInterviewerSpeechEndTimeRef = useRef(0)





  const currentQuestion = questions[currentIndex]


  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0
  const activePanelMember = panelMode ? getPanelMemberForQuestion(currentQuestion) : null
  const interviewerName = activePanelMember?.name || (interviewerPersona === 'marcus' ? 'Marcus Rodriguez' : 'Sarah Chen')
  const selectedRoleLabel = ROLE_OPTIONS.find(option => option.value === selectedRole)?.label || 'Candidate'





  const handleStartPregenerated = async (pregenerated) => {
    hasGreetedRef.current = false
    setPhase(PHASE.GENERATING)
    const toastId = toast.loading('Initializing personalized interview from resume...')
    try {
      const interviewQuestions = buildCorporateInterviewQuestions({
        generatedQuestions: pregenerated,
        resumeData: resumeData || {},
        candidateName: candidateName || 'Candidate',
        company: selectedCompany,
        panelMode,
      })

      setQuestions(interviewQuestions)

      const { data: startData } = await startInterview({
        questions: interviewQuestions,
        resume_data: resumeData || {},
        role: selectedRole,
        candidate_name: candidateName || 'Candidate',
        interview_format: interviewFormat,
        difficulty: difficulty,
        panel_mode: panelMode,
      })

      setSessionId(startData.session_id)
      setInterviewSession(startData)
      setCurrentIndex(0)
      setEvaluation(null)
      setAnswer('')
      setVoiceTranscript('')
      setVoiceInterim('')
      setVoiceMetrics(null)
      setVoiceError('')
      setEmotionSnapshot(createEmotionSnapshot())
      isTelemetryOverriddenRef.current = false
      setShowHint(false)
      setShowTypingFallback(false)
      setPhase(PHASE.INTERVIEWING)
      if (typeof window !== 'undefined') {
        window._heardHello = false
      }
      if (interviewFormat !== 'text') {
        setZoomPhase('connecting')
        setOnboardingQuestionText('')
        hasGreetedRef.current = false
        hasEncouragedRef.current = false
        hasGreetNudgeRef.current = false
        lastSpeechTimeRef.current = Date.now()
        setEncouragementText('')
      }
      toast.success(`Mock interview session started!`, { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed to start personalized interview.', { id: toastId })
      setPhase(PHASE.SETUP)
    }
  }

  useEffect(() => {
    if (location.state?.pregeneratedQuestions && location.state.pregeneratedQuestions.length > 0) {
      const q = location.state.pregeneratedQuestions
      // Clear location state to prevent double-firing
      window.history.replaceState({}, document.title)
      handleStartPregenerated(q)
    }
  }, [location.state])

  useEffect(() => {





    return () => {


      if (recognitionRef.current) {


        recognitionRef.current.onresult = null


        recognitionRef.current.onerror = null


        recognitionRef.current.onend = null


        try {


          recognitionRef.current.stop()


        } catch (_) {
          void _
        }


        recognitionRef.current = null


      }





      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {


        try {


          mediaRecorderRef.current.stop()


        } catch (_) {
          void _
        }


      }





      if (mediaStreamRef.current) {


        mediaStreamRef.current.getTracks().forEach(track => track.stop())


        mediaStreamRef.current = null


      }





      if (cameraPreviewRef.current) {


        cameraPreviewRef.current.srcObject = null


      }

      stopEmotionSamplerRef.current?.()
      stopEmotionSamplerRef.current = null
      window.speechSynthesis?.cancel()


    }


  }, [])





  useEffect(() => {


    if (phase === PHASE.INTERVIEWING && (interviewFormat === 'text' || showTypingFallback)) {


      textareaRef.current?.focus()


    }


  }, [phase, currentIndex, interviewFormat, showTypingFallback])

  useEffect(() => {
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTop = 0
    }
  }, [phase])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined

    const synth = window.speechSynthesis
    const loadVoices = () => setBrowserVoices(synth.getVoices())
    loadVoices()
    synth.addEventListener?.('voiceschanged', loadVoices)
    synth.onvoiceschanged = loadVoices

    return () => {
      synth.removeEventListener?.('voiceschanged', loadVoices)
      if (synth.onvoiceschanged === loadVoices) synth.onvoiceschanged = null
    }
  }, [])


  useEffect(() => {
    if (!interviewerVoice || phase !== PHASE.INTERVIEWING || typeof window === 'undefined') {
      return undefined
    }

    if (interviewFormat === 'text') {
      return undefined
    }

    if (zoomPhase === 'connecting') {
      return undefined
    }

    // If we are not in greeting phase and there is no question, return
    if (!zoomPhase && !currentQuestion?.text) {
      return undefined
    }

    // Cleanly stop any existing capture before speaking the question
    stopVoiceCapture({ keepTranscript: true }).catch(() => {})

    const synth = window.speechSynthesis
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return undefined

    synth.cancel()
    
    let textToSpeak = ''

    if (onboardingQuestionText && zoomPhase && zoomPhase !== 'greet_mic') {
      textToSpeak = onboardingQuestionText
    } else if (zoomPhase === 'greet_mic') {
      textToSpeak = "Hello, good morning! Welcome to the interview. Can you hear and see me clearly?"
    } else if (zoomPhase === 'small_talk') {
      textToSpeak = "Wonderful. Thank you for joining on time. How has your day been so far?"
    } else if (zoomPhase === 'identity_confirm') {
      textToSpeak = "Before we begin, could you please introduce yourself, confirm your full name, and walk me through your background?"
    } else if (zoomPhase === 'candidate_questions') {
      textToSpeak = "We've covered all of my questions. Before we conclude, do you have any questions for me about the role or the interview process?"
    } else if (zoomPhase === 'closing') {
      textToSpeak = "Thank you for your question. We have a highly collaborative, fast-paced culture where we support each other. It was a pleasure speaking with you today. Your interview has been completed successfully. You'll receive your performance report shortly."
    } else {
      textToSpeak = currentQuestion.text
      if (currentIndex === 0 && !hasGreetedRef.current) {
        // After onboarding already covered self-introduction, transition naturally to Q1
        textToSpeak = "Thank you for the introduction. That's a great background. Now, let's move into the interview questions. " + currentQuestion.text
        hasGreetedRef.current = true
      } else {
        const connectors = [
          "Thank you. Let's move on to the next question. ",
          "Interesting. Now, let's discuss: ",
          "That's a good point. Next, ",
          "I understand. Let's transition to the next topic. ",
          "Good explanation. Let's discuss: ",
          "Makes sense. Moving forward: "
        ]
        const conn = connectors[currentIndex % connectors.length]
        textToSpeak = conn + textToSpeak
      }
    }

    const voiceProfile = panelMode
      ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
      : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
    const selectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), voiceProfile)

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    activeUtteranceRef.current = utterance
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.lang = selectedVoice?.lang || 'en-US'
    utterance.rate = voiceProfile.rate
    utterance.pitch = voiceProfile.pitch
    utterance.onstart = () => {
      setIsInterviewerSpeaking(true)
      // Mute the mic hardware track while Sarah/Marcus is speaking
      // This prevents the speakers from being picked up by the microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      }
    }

    let fallbackTimeout = null
    const handleSpeechEnd = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      setIsInterviewerSpeaking(false)
      lastInterviewerSpeechEndTimeRef.current = Date.now()
      // Re-enable mic track and give 600ms for echo to clear before listening again
      setTimeout(() => {
        if (mediaStreamRef.current && micEnabled) {
          mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
        }
        // Clear any transcript captured while AI was speaking before restarting
        finalTranscriptRef.current = ''
        setVoiceTranscript('')
        setVoiceInterim('')
        if (zoomPhase === 'identity_confirm') {
          setZoomPhase(null)
        } else if (zoomPhase === 'closing') {
          handleFinish()
        }
        startVoiceCapture().catch(() => {})
      }, 600)
    }

    utterance.onend = handleSpeechEnd
    utterance.onerror = (err) => {
      console.warn('SpeechSynthesis error:', err)
      handleSpeechEnd()
    }

    const durationEstimate = (textToSpeak.length * 80) + 4000
    const timer = window.setTimeout(() => {
      // Don't speak if the tab is hidden — it wastes TTS quota and the mic would capture silence
      if (document.hidden) {
        handleSpeechEnd()
        return
      }
      synth.speak(utterance)
      fallbackTimeout = setTimeout(() => {
        console.warn('SpeechSynthesis onend failed to fire within estimate. Force triggering end handler.')
        synth.cancel()
        handleSpeechEnd()
      }, durationEstimate)
    }, 400)

    return () => {
      window.clearTimeout(timer)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      synth.cancel()
      setIsInterviewerSpeaking(false)
      lastInterviewerSpeechEndTimeRef.current = Date.now()
    }
  }, [phase, currentIndex, currentQuestion?.text, interviewerVoice, panelMode, activePanelMember?.id, interviewerPersona, browserVoices, zoomPhase, interviewFormat, onboardingQuestionText])





  useEffect(() => {


    if (phase !== PHASE.INTERVIEWING) {


      setElapsedSeconds(0)


      questionStartedAtRef.current = null


      autoCaptureAttemptedRef.current = -1


      return undefined


    }





    questionStartedAtRef.current = Date.now()


    setElapsedSeconds(0)


    const timer = setInterval(() => {


      if (questionStartedAtRef.current) {


        setElapsedSeconds(Math.floor((Date.now() - questionStartedAtRef.current) / 1000))


      }


    }, 1000)





    return () => clearInterval(timer)


  }, [phase, currentIndex])





  // Total elapsed timer


  useEffect(() => {


    if (phase !== PHASE.INTERVIEWING && phase !== PHASE.EVALUATING) return


    const timer = setInterval(() => {


      setTotalElapsed(prev => prev + 1)


    }, 1000)


    return () => clearInterval(timer)


  }, [phase])

  const speakEncouragement = async (phrase) => {
    // 1. Stop listening
    await stopVoiceCapture({ keepTranscript: true })

    const synth = window.speechSynthesis
    if (!synth) return

    synth.cancel()
    const voiceProfile = panelMode
      ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
      : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
    const selectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), voiceProfile)

    const utterance = new SpeechSynthesisUtterance(phrase)
    activeUtteranceRef.current = utterance
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.lang = selectedVoice?.lang || 'en-US'
    utterance.rate = voiceProfile.rate
    utterance.pitch = voiceProfile.pitch

    utterance.onstart = () => {
      setIsInterviewerSpeaking(true)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      }
    }
    utterance.onend = () => {
      setIsInterviewerSpeaking(false)
      setTimeout(() => {
        if (mediaStreamRef.current && micEnabled) {
          mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
        }
        startVoiceCapture().catch(() => {})
        lastSpeechTimeRef.current = Date.now()
      }, 500)
    }
    utterance.onerror = () => {
      setIsInterviewerSpeaking(false)
      if (mediaStreamRef.current && micEnabled) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
      }
      startVoiceCapture().catch(() => {})
      lastSpeechTimeRef.current = Date.now()
    }

    if (document.hidden) {
      setIsInterviewerSpeaking(false)
      startVoiceCapture().catch(() => {})
      lastSpeechTimeRef.current = Date.now()
      return
    }
    synth.speak(utterance)
  }

  const speakTransitionAndSkip = async () => {
    // Stop listening
    await stopVoiceCapture({ keepTranscript: true })

    const synth = window.speechSynthesis
    if (!synth) {
      handleSkip()
      return
    }

    synth.cancel()
    const voiceProfile = panelMode
      ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
      : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
    const selectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), voiceProfile)

    const transitionPhrase = "No worries at all. Let's move on to the next question to keep the momentum going."
    const utterance = new SpeechSynthesisUtterance(transitionPhrase)
    activeUtteranceRef.current = utterance
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.lang = selectedVoice?.lang || 'en-US'
    utterance.rate = voiceProfile.rate
    utterance.pitch = voiceProfile.pitch

    utterance.onstart = () => {
      setIsInterviewerSpeaking(true)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      }
    }
    utterance.onend = () => {
      setIsInterviewerSpeaking(false)
      setTimeout(() => {
        if (mediaStreamRef.current && micEnabled) {
          mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
        }
        handleSkip()
      }, 400)
    }
    utterance.onerror = () => {
      setIsInterviewerSpeaking(false)
      if (mediaStreamRef.current && micEnabled) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
      }
      handleSkip()
    }

    if (document.hidden) {
      setIsInterviewerSpeaking(false)
      if (mediaStreamRef.current && micEnabled) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
      }
      handleSkip()
      return
    }
    synth.speak(utterance)
  }



  // Zoom Phase and Speech-Driven Transitions
  useEffect(() => {
    if (phase !== PHASE.INTERVIEWING || !zoomPhase || interviewFormat === 'text') return undefined

    if (zoomPhase === 'connecting') {
      // Proactively request media so camera/mic turn on immediately — no deadlock
      if (!activeMediaStream) {
        startVoiceCapture().catch((err) => {
          console.error('Media capture failed during connecting:', err)
          setZoomPhase(null) // escape spinner if permissions denied
        })
      } else if (interviewFormat !== 'video' || cameraReady) {
        setZoomPhase('greet_mic')
      }
      return undefined
    }
  }, [zoomPhase, phase, interviewFormat, activeMediaStream, cameraReady])

  useEffect(() => {
    // Silence timer and automatic skipping disabled to ensure the candidate has full manual control and isn't interrupted.
    return undefined
  }, [])

  useEffect(() => {
    if (interviewFormat === 'video' && activeMediaStream && cameraPreviewRef.current) {
      const videoEl = cameraPreviewRef.current
      if (videoEl.srcObject !== activeMediaStream) {
        videoEl.srcObject = activeMediaStream
        
        stopEmotionSamplerRef.current?.()
        emotionHistoryRef.current = []
        setEmotionSnapshot(createEmotionSnapshot())
        isTelemetryOverriddenRef.current = false
        
        const beginEmotionSampling = () => {
          stopEmotionSamplerRef.current?.()
          stopEmotionSamplerRef.current = startEmotionSampler({
            video: videoEl,
            onUpdate: snapshot => {
              emotionHistoryRef.current = [...emotionHistoryRef.current.slice(-79), snapshot]
              if (!isTelemetryOverriddenRef.current) {
                setEmotionSnapshot(snapshot)
              } else {
                setEmotionSnapshot(prev => ({
                  ...prev,
                  raw_landmarks: snapshot.raw_landmarks,
                  raw_stats: snapshot.raw_stats
                }))
              }
            }
          })
        }
        
        if (videoEl.readyState >= 2) {
          beginEmotionSampling()
        } else {
          videoEl.onloadedmetadata = beginEmotionSampling
        }
      }
    }
  }, [activeMediaStream, cameraPreviewRef.current, interviewFormat])





  // Live coaching tip updates


  const elapsedSecondsRef = useRef(elapsedSeconds)
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds
  }, [elapsedSeconds])

  const currentQuestionRef = useRef(currentQuestion)
  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])

  const voiceInterimRef = useRef(voiceInterim)
  useEffect(() => {
    voiceInterimRef.current = voiceInterim
  }, [voiceInterim])

  const handleSubmitAnswerRef = useRef(null)
  useEffect(() => {
    handleSubmitAnswerRef.current = handleSubmitAnswer
  })

  // Track zoomPhase in a ref so the interval can read it without re-creating
  const zoomPhaseRef = useRef(zoomPhase)
  useEffect(() => {
    zoomPhaseRef.current = zoomPhase
  }, [zoomPhase])

  useEffect(() => {
    if (phase !== 'interviewing' || !isListening) {
      return
    }

    const interval = setInterval(() => {
      const transcript = `${finalTranscriptRef.current} ${voiceInterimRef.current || ''}`.trim()
      const fillerCount = countFillers(transcript)
      const tips = generateLiveCoachingTips(
        transcript,
        elapsedSecondsRef.current,
        currentQuestionRef.current?.type || 'technical',
        fillerCount
      )
      setCoachingTips(tips)

      if (transcript.length > lastTranscriptLengthRef.current) {
        lastTranscriptLengthRef.current = transcript.length
        lastSpeechTimeRef.current = Date.now()
        setEncouragementText('')
      } else if (transcript.length > 3) {
        // Automatically submit onboarding responses after 3.5s of silence
        // Automatically submit interview questions after 5.0s of silence
        const isOnboarding = !!zoomPhaseRef.current
        const threshold = isOnboarding ? 3500 : 5000
        const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current
        if (timeSinceLastSpeech > threshold) {
          console.log(`Candidate finished speaking. Silence threshold of ${threshold}ms reached. Automatically submitting.`);
          lastTranscriptLengthRef.current = 0
          handleSubmitAnswerRef.current?.()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, isListening])











  const stopVoiceCapture = async ({ keepTranscript = true, saveRecordingPreview = true, persistMetrics = true, stopCamera = false } = {}) => {
    setIsListening(false)
    const recognition = recognitionRef.current

    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.stop()
      } catch (_) {
        void _
      }
      recognitionRef.current = null
    }





    const recorder = mediaRecorderRef.current


    if (recorder && recorder.state !== 'inactive') {


      try {


        recorder.stop()


      } catch (_) {
        void _
      }


    }


    mediaRecorderRef.current = null



    stopEmotionSamplerRef.current?.()
    stopEmotionSamplerRef.current = null



    if (stopCamera) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      setActiveMediaStream(null)
      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = null
      }
      setCameraReady(false)
    }


    saveRecordingPreviewRef.current = saveRecordingPreview


    setIsListening(false)





    const startedAt = recordingStartedAtRef.current


    const durationSeconds = startedAt ? (Date.now() - startedAt) / 1000 : 0


    recordingStartedAtRef.current = null





    const transcript = finalTranscriptRef.current.trim()


    const averageConfidence = transcriptConfidenceRef.current.count > 0


      ? transcriptConfidenceRef.current.sum / transcriptConfidenceRef.current.count


      : 0


    const metrics = analyzeVoiceTranscript({


      transcript,


      durationSeconds,


      recognitionConfidence: averageConfidence,


    })





    if (keepTranscript && transcript) {


      setAnswer(transcript)


      setVoiceTranscript(transcript)


    }





    if (persistMetrics) {


      setVoiceMetrics(metrics)


    }


    setVoiceInterim('')


    transcriptConfidenceRef.current = { sum: 0, count: 0 }





    return metrics
  }

  const handleMicChange = async (deviceId) => {
    setSelectedMicId(deviceId)
    selectedMicIdRef.current = deviceId
    if (recognitionRef.current || mediaStreamRef.current) {
      toast.loading('Switching microphone...', { id: 'device-switch', duration: 1000 })
      await stopVoiceCapture({ keepTranscript: true, persistMetrics: false })
      setTimeout(() => {
        startVoiceCapture()
      }, 400)
    }
  }

  const handleCameraChange = async (deviceId) => {
    setSelectedCameraId(deviceId)
    selectedCameraIdRef.current = deviceId
    if (recognitionRef.current || mediaStreamRef.current) {
      toast.loading('Switching camera...', { id: 'device-switch', duration: 1000 })
      await stopVoiceCapture({ keepTranscript: true, persistMetrics: false })
      setTimeout(() => {
        startVoiceCapture()
      }, 400)
    }
  }
  const handleCameraToggle = () => {
    const nextVal = !cameraEnabled
    setCameraEnabled(nextVal)
    if (activeMediaStream) {
      activeMediaStream.getVideoTracks().forEach(track => { track.enabled = nextVal })
    }
  }

  const handleMicToggle = async () => {
    const nextVal = !micEnabled
    setMicEnabled(nextVal)
    if (activeMediaStream) {
      activeMediaStream.getAudioTracks().forEach(track => { track.enabled = nextVal })
    }
    if (!nextVal) {
      await stopVoiceCapture({ keepTranscript: true })
    } else {
      if (!isInterviewerSpeaking) {
        startVoiceCapture().catch(() => {})
      }
    }
  }





  const getFriendlyVoiceErrorMessage = (error) => {
    const errorStr = typeof error === 'string' ? error : (error?.name || error?.message || '');
    const err = errorStr.toLowerCase();

    if (err.includes('notallowed') || err.includes('not-allowed') || err.includes('permission')) {
      return 'Microphone or Speech Recognition access denied. Please ensure microphone permissions are granted in your browser settings (click the padlock/site settings icon in the URL bar).';
    }
    if (err.includes('timeout')) {
      return 'Camera/Microphone request timed out. Another application (e.g. Teams, Zoom, or another browser tab) might be locking your camera. Please release the device or grant permissions and reload.';
    }
    if (err.includes('network')) {
      return 'Network communication failed. Browser speech recognition (especially in Chrome/Edge) requires an active internet connection to Google/Microsoft recognition servers.';
    }
    if (err.includes('no-speech') || err.includes('nospeech')) {
      return 'No speech detected. Please verify your microphone is active and speak clearly.';
    }
    if (err.includes('notfound') || err.includes('not-found') || err.includes('device')) {
      return 'No microphone detected. Please plug in a microphone or headset and try again.';
    }
    if (err.includes('notreadable') || err.includes('already in use') || err.includes('track')) {
      return 'Microphone is already in use by another application (e.g. Zoom, Teams, or another browser tab).';
    }
    if (err.includes('aborted')) {
      return 'Voice recognition was aborted.';
    }
    return `Voice capture failed: ${errorStr}`;
  }

  const startVoiceCapture = async () => {
    if (!micEnabled) return
    if (isStartingCaptureRef.current) return
    isStartingCaptureRef.current = true

    const Recognition = getSpeechRecognition()
    if (!Recognition || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Voice recognition is not supported in this browser.')
      setShowTypingFallback(true)
      isStartingCaptureRef.current = false
      return
    }

    try {
      setVoiceError('')
      setVoiceMetrics(null)
      setVoiceTranscript('')
      setVoiceInterim('')
      setShowTypingFallback(false)
      finalTranscriptRef.current = ''
      transcriptConfidenceRef.current = { sum: 0, count: 0 }
      audioChunksRef.current = []

      const useVideo = interviewFormat === 'video'
      const activeMicId = selectedMicIdRef.current
      const activeCameraId = selectedCameraIdRef.current

      const audioConstraints = activeMicId
        ? { deviceId: { exact: activeMicId } }
        : true;
      const videoConstraints = useVideo
        ? (activeCameraId ? { deviceId: { exact: activeCameraId } } : true)
        : false;

      let stream = mediaStreamRef.current
      const hasActiveTracks = stream && stream.active && stream.getAudioTracks().length > 0 && (!useVideo || stream.getVideoTracks().length > 0)
      
      if (!hasActiveTracks) {
        if (stream) {
          try { stream.getTracks().forEach(t => t.stop()) } catch(e) { console.warn('Failed to stop existing media stream:', e) }
        }
        const mediaPromise = navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        })
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MediaDeviceTimeout: Camera or microphone request timed out. Please check permissions.')), 7500)
        )
        stream = await Promise.race([mediaPromise, timeoutPromise])
        mediaStreamRef.current = stream
        setActiveMediaStream(stream)
      }

      // If the AI is currently speaking, mute the microphone tracks immediately
      // to prevent picking up the speaker sound during startup latency
      if (isInterviewerSpeakingRef.current) {
        stream.getAudioTracks().forEach(t => { t.enabled = false })
      }

      // Enumerate devices once permission is granted
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioDevs = devices.filter(d => d.kind === 'audioinput')
        const videoDevs = devices.filter(d => d.kind === 'videoinput')
        setAudioDevices(audioDevs)
        setVideoDevices(videoDevs)

        // Sync selected ids if empty
        if (audioDevs.length > 0 && !selectedMicIdRef.current) {
          const activeTrack = stream.getAudioTracks()[0]
          const activeId = activeTrack?.getSettings()?.deviceId || audioDevs[0].deviceId
          setSelectedMicId(activeId)
          selectedMicIdRef.current = activeId
        }
        if (videoDevs.length > 0 && !selectedCameraIdRef.current && useVideo) {
          const activeTrack = stream.getVideoTracks()[0]
          const activeId = activeTrack?.getSettings()?.deviceId || videoDevs[0].deviceId
          setSelectedCameraId(activeId)
          selectedCameraIdRef.current = activeId
        }
      } catch (err) {
        console.warn('Failed to enumerate media devices:', err)
      }

      mediaStreamRef.current = stream
      setActiveMediaStream(stream)


      recordingStartedAtRef.current = Date.now()


      saveRecordingPreviewRef.current = true





      if (useVideo) {
        setCameraReady(true)
      }





      if (typeof MediaRecorder !== 'undefined') {


        const recorder = new MediaRecorder(stream)


        mediaRecorderRef.current = recorder


        recorder.ondataavailable = event => {


          if (event.data && event.data.size > 0) {


            audioChunksRef.current.push(event.data)


          }


        }


        recorder.onstop = () => {


          if (saveRecordingPreviewRef.current && audioChunksRef.current.length > 0) {


            const blobType = useVideo ? 'video/webm' : 'audio/webm'


            const mediaBlob = new Blob(audioChunksRef.current, { type: blobType })


            const nextUrl = URL.createObjectURL(mediaBlob)


            setRecordingUrl(previousUrl => {


              if (previousUrl) URL.revokeObjectURL(previousUrl)


              return nextUrl


            })


          } else {


            setRecordingUrl(previousUrl => {


              if (previousUrl) URL.revokeObjectURL(previousUrl)


              return ''


            })


          }


          audioChunksRef.current = []


        }


        recorder.start()


      }





      let recognition = recognitionRef.current
      if (recognition) {
        finalTranscriptRef.current = ''
        setVoiceTranscript('')
        setVoiceInterim('')
        setAnswer('')
        lastSpeechTimeRef.current = Date.now()
        lastTranscriptLengthRef.current = 0
        setIsListening(true)
        isStartingCaptureRef.current = false
        return
      }

      recognition = new Recognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = event => {
        if (!isListeningRef.current || isInterviewerSpeakingRef.current) {
          return
        }
        // Discard any echo or delayed speech recognition events within 1.2 seconds of AI stopping speech
        if (Date.now() - lastInterviewerSpeechEndTimeRef.current < 1200) {
          return
        }

        let interimText = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          const transcript = result[0]?.transcript || ''

          if (result.isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim()
            const confidence = result[0]?.confidence ?? 0
            transcriptConfidenceRef.current.sum += confidence
            transcriptConfidenceRef.current.count += 1
          } else {
            interimText += transcript
          }
        }

        const liveTranscript = `${finalTranscriptRef.current} ${interimText}`.trim()
        setVoiceTranscript(finalTranscriptRef.current)
        setVoiceInterim(interimText.trim())

        if (liveTranscript) {
          setAnswer(liveTranscript)
          lastSpeechTimeRef.current = Date.now()
          if (liveTranscript.toLowerCase().includes('hello') && !window._heardHello) {
            window._heardHello = true
            toast.success('Mic Check: Heard you say "hello"! Voice recognition is working.', { id: 'hello-check', duration: 5000 })
          }
        }
      }

      recognition.onerror = event => {
        const errorType = event.error;
        console.warn(`Speech recognition error: ${errorType}`);

        if (errorType === 'no-speech' || errorType === 'aborted') {
          return;
        }

        const msg = getFriendlyVoiceErrorMessage(event.error);
        setVoiceError(msg)
        toast.error('Voice capture stopped.')
        stopVoiceCapture({ keepTranscript: true }).catch(() => {})
      }

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          try {
            recognition.start()
          } catch (err) {
            console.error('Failed to restart speech recognition:', err)
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
      setIsListening(true)
      recognition.start()

      isStartingCaptureRef.current = false
    } catch (error) {
      isStartingCaptureRef.current = false
      const msg = getFriendlyVoiceErrorMessage(error);
      setVoiceError(msg)
      toast.error('Could not access microphone or webcam. Falling back to text mode.')
      setShowTypingFallback(true)
      setZoomPhase(null)
      await stopVoiceCapture({ keepTranscript: false })
    }


  }





  const handleGenerate = async () => {

    hasGreetedRef.current = false
    setPhase(PHASE.GENERATING)


    const toastId = toast.loading('Generating AI questions...')


    try {


      const { data } = await generateQuestions({
        resume_data: resumeData || {},
        role: selectedRole,
        difficulty,
        num_questions: numQuestions,
        panel_mode: panelMode,
        company: selectedCompany,
        company_context: companyContext,
      })


      if (data.success && data.questions.length > 0) {


        const interviewQuestions = buildCorporateInterviewQuestions({
          generatedQuestions: data.questions,
          resumeData: resumeData || {},
          candidateName: candidateName || 'Candidate',
          company: selectedCompany,
          panelMode,
        })


        setQuestions(interviewQuestions)


        const { data: startData } = await startInterview({


          questions: interviewQuestions,


          resume_data: resumeData || {},


          role: selectedRole,


          candidate_name: candidateName || 'Candidate',


          interview_format: interviewFormat,


          difficulty: difficulty,


          panel_mode: panelMode,


        })


        setSessionId(startData.session_id)


        setInterviewSession(startData)


        setCurrentIndex(0)


        setEvaluation(null)


        setAnswer('')


        setVoiceTranscript('')


        setVoiceInterim('')


        setVoiceMetrics(null)


        setVoiceError('')
        setEmotionSnapshot(createEmotionSnapshot())
        isTelemetryOverriddenRef.current = false


        setShowHint(false)


        setShowTypingFallback(false)


        setPhase(PHASE.INTERVIEWING)
        if (typeof window !== 'undefined') {
          window._heardHello = false
        }
        if (interviewFormat !== 'text') {
          setZoomPhase('connecting')
          setOnboardingQuestionText('')
          hasGreetedRef.current = false
          hasEncouragedRef.current = false
          hasGreetNudgeRef.current = false
          lastSpeechTimeRef.current = Date.now()
          setEncouragementText('')
        }
        toast.success(`Mock interview session started!`, { id: toastId })


      } else {


        throw new Error('No questions generated')


      }


    } catch (error) {


      toast.error(error.response?.data?.error || 'Failed to generate questions', { id: toastId })


      setPhase(PHASE.SETUP)


    }


  }





  const handleSubmitAnswer = async () => {
    // Guard against double-fire (double-click or rapid re-invocation during API latency)
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (zoomPhase) {
      const finalAnswer = (answer.trim() || `${finalTranscriptRef.current} ${voiceInterim}`.trim() || "[No verbal response captured]").trim()
      const nextPhaseMap = {
        'greet_mic': 'small_talk',
        'small_talk': 'identity_confirm',
        'identity_confirm': null,
        'candidate_questions': 'closing'
      }
      const nextPhase = nextPhaseMap[zoomPhase]
      
      await stopVoiceCapture({ keepTranscript: true })
      
      try {
        const { data } = await submitOnboardingResponse({
          session_id: sessionId,
          current_phase: zoomPhase,
          answer: finalAnswer
        })
        if (data?.success && data?.response) {
          setOnboardingQuestionText(data.response)
        } else {
          setOnboardingQuestionText('')
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic onboarding transition:', err)
        setOnboardingQuestionText('')
      }

      if (nextPhase !== undefined) {
        setZoomPhase(nextPhase)
      }
      setVoiceTranscript('')
      setVoiceInterim('')
      setAnswer('')
      lastTranscriptLengthRef.current = 0
      isSubmittingRef.current = false
      return
    }

    const draftAnswer = answer.trim() || `${voiceTranscript} ${voiceInterim}`.trim()

    if (!draftAnswer && interviewFormat === 'text') {
      toast.error('Please write an answer before submitting.')
      isSubmittingRef.current = false
      return
    }

    let latestVoiceMetrics = voiceMetrics

    if (isListening) {
      latestVoiceMetrics = await stopVoiceCapture({ keepTranscript: true })
    }

    const finalAnswer = (answer.trim() || `${finalTranscriptRef.current} ${voiceInterim}`.trim() || draftAnswer || "[No verbal response captured]").trim()


    setPhase(PHASE.EVALUATING)
    lastTranscriptLengthRef.current = 0
    try {


      const { data } = await submitAnswer({


        session_id: sessionId,


        answer: finalAnswer,


        question_index: currentIndex,


        voice_metrics: latestVoiceMetrics || voiceMetrics ? {
          ...(latestVoiceMetrics || voiceMetrics || {}),
          tremor_score: avgTremorScore
        } : null,


        emotion_metrics: interviewFormat === 'video' ? emotionSnapshot : null,


      })


      setEvaluation(data.evaluation)
      setSubmittedAnswerCount(count => count + 1)





      // Track score history for adaptive difficulty


      const newScore = data.evaluation?.overall_score || 0


      const newHistory = [...scoreHistory, newScore]


      setScoreHistory(newHistory)





      // Update adaptive difficulty


      const nextDiff = getNextDifficulty(newHistory, adaptiveDifficulty)


      if (nextDiff !== adaptiveDifficulty) {


        setAdaptiveDifficulty(nextDiff)


        toast(`Difficulty adjusted to ${nextDiff}`)


      }





      if (data.updated_questions) {


        setQuestions(data.updated_questions)


      }





      setCoachingTips([])
      
      // Auto-advance loop: Only auto-advance in voice/video modes, leave text mode on evaluation feedback
      if (interviewFormat === 'text') {
        setPhase(PHASE.EVALUATING)
      } else {
        setPhase(PHASE.INTERVIEWING)
        // Speak the AI HR's natural response to the answer, then advance
        const hrReply = data.evaluation?.interviewer_response
        if (hrReply && interviewerVoice && window.speechSynthesis) {
          const synth = window.speechSynthesis
          const hrVoiceProfile = panelMode
            ? PANEL_VOICE_PROFILES[activePanelMember?.id] || VOICE_PROFILES.marcus
            : VOICE_PROFILES[interviewerPersona] || VOICE_PROFILES.sarah
          const hrSelectedVoice = chooseBrowserVoice(browserVoices.length ? browserVoices : synth.getVoices(), hrVoiceProfile)
          synth.cancel()
          const replyUtterance = new SpeechSynthesisUtterance(hrReply)
          activeUtteranceRef.current = replyUtterance
          if (hrSelectedVoice) replyUtterance.voice = hrSelectedVoice
          replyUtterance.lang = hrSelectedVoice?.lang || 'en-US'
          replyUtterance.rate = 0.92
          replyUtterance.pitch = 1.05
          setIsInterviewerSpeaking(true)
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
          }
          let replyDone = false
          const doNext = () => {
            if (replyDone) return
            replyDone = true
            setIsInterviewerSpeaking(false)
            if (mediaStreamRef.current && micEnabled) {
              mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
            }
            setTimeout(() => { handleNextQuestion() }, 400)
          }
          replyUtterance.onend = () => doNext()
          replyUtterance.onerror = () => doNext()
          setTimeout(() => {
            if (document.hidden) {
              doNext()
            } else {
              synth.speak(replyUtterance)
            }
          }, 300)
        } else {
          setTimeout(() => {
            handleNextQuestion()
          }, 1200)
        }
      }


    } catch (error) {


      toast.error('Evaluation failed')
      setPhase(PHASE.INTERVIEWING)
      isSubmittingRef.current = false
    }


  }





  const handleNextQuestion = async () => {


    await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => {})


    const nextIndex = currentIndex + 1


    if (nextIndex >= questions.length) {
      if (interviewFormat !== 'text') {
        setPhase(PHASE.INTERVIEWING)
        setZoomPhase('candidate_questions')
        setVoiceTranscript('')
        setVoiceInterim('')
        setAnswer('')
      } else {
        handleFinish()
      }
      return
    }





    setCurrentIndex(nextIndex)


    setAnswer('')


    setEvaluation(null)


    setShowHint(false)


    setShowTypingFallback(false)


    setVoiceTranscript('')


    setVoiceInterim('')


    setVoiceMetrics(null)
    setAvgTremorScore(0)


    setVoiceError('')
    setEmotionSnapshot(createEmotionSnapshot())
    isTelemetryOverriddenRef.current = false


    if (recordingUrl) {


      URL.revokeObjectURL(recordingUrl)


      setRecordingUrl('')


    }


    setPhase(PHASE.INTERVIEWING)


  }





  const handleSkip = async () => {


    const latestVoiceMetrics = await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => null)


    try {


      await submitAnswer({


        session_id: sessionId,


        answer: '[SKIPPED]',


        question_index: currentIndex,


        voice_metrics: latestVoiceMetrics || voiceMetrics || null,


        emotion_metrics: interviewFormat === 'video' ? emotionSnapshot : null,


      })
      setSubmittedAnswerCount(count => count + 1)


    } catch (_) {
      void _
    }


    await handleNextQuestion()


  }





  const handleFinish = async () => {


    await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false, stopCamera: true }).catch(() => {})
    window.speechSynthesis?.cancel()
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
    }

    const hasSubmittedAnswers = submittedAnswerCount > 0 || scoreHistory.length > 0 || currentIndex > 0 || evaluation

    if (!hasSubmittedAnswers) {
      setPhase(PHASE.SETUP)
      setAnswer('')
      setVoiceTranscript('')
      setVoiceInterim('')
      setRecordingUrl('')
      setQuestions([])
      setCurrentIndex(0)
      setElapsedSeconds(0)
      setTotalElapsed(0)
      setIsInterviewerSpeaking(false)
      toast.success('Interview ended. You are back at setup.')
      return
    }


    const toastId = toast.loading('Completing interview...')


    try {


      const { data } = await completeInterview(sessionId)


      setInterviewResults(data.results)


      toast.success('Interview completed!', { id: toastId })


      navigate(`/dashboard/results/${sessionId}`)


    } catch (error) {


      toast.error(error?.message || 'Failed to complete interview', { id: toastId })


    }


  }





  const handleRetryAnswer = () => {


    setPreviousScore(evaluation?.overall_score || null)


    setIsRetrying(true)


    setEvaluation(null)


    setAnswer('')


    setVoiceTranscript('')


    setVoiceInterim('')


    setVoiceMetrics(null)
    setAvgTremorScore(0)


    setVoiceError('')
    setEmotionSnapshot(createEmotionSnapshot())
    isTelemetryOverriddenRef.current = false


    setCoachingTips([])


    if (recordingUrl) {


      URL.revokeObjectURL(recordingUrl)


      setRecordingUrl('')


    }


    setPhase(PHASE.INTERVIEWING)


    toast('Retry mode - give a better answer!')


  }





  const handleFollowUp = async () => {


    if (!evaluation || !currentQuestion) return


    const toastId = toast.loading('Generating follow-up...')


    try {


      const { data } = await submitFollowUp({


        session_id: sessionId,


        question: currentQuestion,


        answer: answer,


        evaluation: evaluation,


      })


      if (data.follow_up_question) {


        // Insert follow-up as next question


        const updatedQuestions = [...questions]


        updatedQuestions.splice(currentIndex + 1, 0, {


          ...data.follow_up_question,


          id: questions.length + 1,


        })


        setQuestions(updatedQuestions)


        toast.success('Follow-up question added!', { id: toastId })


      } else {


        toast.dismiss(toastId)


      }


    } catch {


      toast.error('Could not generate follow-up', { id: toastId })


    }


  }





  if (phase === PHASE.SETUP) {
    return (
      <div className="space-y-0 animate-in">

        {/* ━━━ HERO ENTRY CARD ━━━ */}
        <div className="card bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden text-white mb-6">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(34,197,94,0.1),transparent_26%)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {aiInterviewerMode && (
                <div className="relative shrink-0">
                  <img
                    src={interviewerPersona === 'marcus' ? '/interviewers/marcus_rodriguez.png' : '/interviewers/sarah_chen.png'}
                    alt={interviewerName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400/40 shadow-xl shadow-cyan-500/20"
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] block mb-1">
                  AI Video Interview
                </span>
                <h1 className="text-2xl font-black leading-tight">
                  {interviewerName} is ready to interview you
                </h1>
                <p className="text-sm text-white/55 mt-1">
                  Camera and mic will turn on automatically when you start. Speak naturally — the AI listens, records, and responds like a real HR.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> AI Engine Active
              </div>
              {resumeData
                ? <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Resume loaded</div>
                : <button onClick={() => navigate('/dashboard/resume')} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-300 text-xs font-semibold hover:bg-white/10 transition-colors"><BookOpen className="w-3.5 h-3.5" /> Upload resume</button>
              }
            </div>
          </div>

          {/* Resume skill tags */}
          {resumeData?.skills?.all?.length > 0 && (
            <div className="relative z-10 mt-4 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
              <span className="text-[10px] text-gray-500 mr-1 self-center">Your skills:</span>
              {resumeData.skills.all.slice(0, 8).map(skill => (
                <span key={skill} className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold">{skill}</span>
              ))}
              {resumeData.skills.all.length > 8 && <span className="text-[10px] text-white/35 self-center">+{resumeData.skills.all.length - 8} more</span>}
            </div>
          )}
        </div>

        {/* ━━━ MAIN CONFIG GRID ━━━ */}
        <div className="grid md:grid-cols-[1fr_290px] gap-5 items-start">

          {/* LEFT col */}
          <div className="space-y-4">

            {/* Role */}
            <div className="card !p-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Target Role</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROLE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedRole(value)}
                    className={clsx(
                      'px-3 py-2.5 rounded-xl text-sm font-semibold text-left border-2 transition-all',
                      selectedRole === value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty + Mode in one row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card !p-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Difficulty</label>
                <div className="flex flex-col gap-2">
                  {DIFF_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setDifficulty(value)}
                      className={clsx(
                        'p-2.5 rounded-xl text-left border-2 transition-all',
                        difficulty === value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25'
                          : 'border-gray-200 dark:border-gray-700/70 hover:border-indigo-400'
                      )}
                    >
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card !p-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Interview Mode</label>
                <div className="flex flex-col gap-2">
                  {FORMAT_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => { if (phase === PHASE.SETUP) setInterviewFormat(value) }}
                      className={clsx(
                        'p-2.5 rounded-xl text-left border-2 transition-all',
                        interviewFormat === value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25'
                          : 'border-gray-200 dark:border-gray-700/70 hover:border-indigo-400'
                      )}
                    >
                      <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        {value === 'text' ? <Type className="w-3.5 h-3.5" /> : value === 'voice' ? <Mic className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                        {label}
                        {interviewFormat === value && <span className="ml-auto text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">Selected</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
                {!hasSpeechSupport && (
                  <p className="text-[10px] text-amber-500 mt-2">Voice/Video needs Chrome or Edge</p>
                )}
              </div>
            </div>

            {/* Company */}
            <div className="card !p-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Target Company</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {COMPANY_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setSelectedCompany(value); if (value === 'General') setCompanyContext('') }}
                    className={clsx(
                      'p-2 rounded-xl text-center border-2 transition-all text-xs font-semibold',
                      selectedCompany === value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 hover:border-indigo-400'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedCompany !== 'General' && (
                <textarea
                  value={companyContext}
                  onChange={(e) => setCompanyContext(e.target.value)}
                  placeholder="Optional: describe the team, role, or domain..."
                  className="mt-3 w-full p-3 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              )}
            </div>

            {/* Questions slider */}
            <div className="card !p-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Questions: <span className="text-indigo-500 normal-case font-black">{numQuestions}</span>
              </label>
              <input type="range" min={3} max={10} value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full accent-indigo-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>3 — Quick</span><span>5 — Standard</span><span>10 — Thorough</span></div>
            </div>

          </div>

          {/* RIGHT col — settings + CTA */}
          <div className="space-y-4 md:sticky md:top-4">

            {/* Interviewer picker */}
            <div className="card bg-gradient-to-br from-slate-950 to-slate-900 border border-white/10 !p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-3">Your AI Interviewer</p>
              <div className="flex gap-2">
                {['sarah', 'marcus'].map(p => {
                  const isSelected = interviewerPersona === p
                  const name = p === 'sarah' ? 'Sarah Chen' : 'Marcus Rodriguez'
                  const img = p === 'sarah' ? '/interviewers/sarah_chen.png' : '/interviewers/marcus_rodriguez.png'
                  return (
                    <button
                      key={p}
                      onClick={() => setInterviewerPersona(p)}
                      className={clsx('flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all', isSelected ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-white/5 hover:border-white/25')}
                    >
                      <div className="relative">
                        <img src={img} alt={name} className="w-14 h-14 rounded-xl object-cover" />
                        {isSelected && <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950" />}
                      </div>
                      <span className="text-xs font-bold text-white">{name.split(' ')[0]}</span>
                      <span className="text-[9px] text-gray-500">HR Lead</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="card bg-gradient-to-br from-slate-950 to-slate-900 border border-white/10 !p-4 text-white space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-1">Interview Settings</p>

              {[
                { label: 'AI Interviewer Room', desc: 'Live camera & emotion tracking', value: aiInterviewerMode, toggle: () => setAiInterviewerMode(!aiInterviewerMode), color: 'bg-cyan-600' },
                { label: 'Spoken Questions', desc: 'AI reads questions aloud', value: interviewerVoice, toggle: () => setInterviewerVoice(!interviewerVoice), color: 'bg-amber-500' },
                { label: 'Panel Mode', desc: '3 AI interviewers take turns', value: panelMode, toggle: () => setPanelMode(!panelMode), color: 'bg-violet-600' },
              ].map(({ label, desc, value, toggle, color }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">{label}</p>
                    <p className="text-[10px] text-gray-500">{desc}</p>
                  </div>
                  <button onClick={toggle} className={clsx('relative w-11 h-6 rounded-full transition-colors shrink-0', value ? color : 'bg-gray-700')}>
                    <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', value ? 'translate-x-5' : 'translate-x-0')} />
                  </button>
                </div>
              ))}

              {panelMode && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  {PANEL_MEMBERS.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-[9px] font-black text-white shrink-0`}>{m.initials}</div>
                      <div>
                        <p className="text-[10px] font-semibold text-white leading-tight">{m.name}</p>
                        <p className="text-[9px] text-gray-600">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="card bg-gradient-to-br from-slate-950 to-slate-900 border border-white/10 !p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">How it works</p>
              <div className="space-y-2.5">
                {[
                  { step: '1', text: 'Click Start → browser asks for camera & mic', color: 'bg-cyan-500' },
                  { step: '2', text: 'AI HR greets you and asks questions aloud', color: 'bg-indigo-500' },
                  { step: '3', text: 'You speak → AI records and transcribes live', color: 'bg-violet-500' },
                  { step: '4', text: 'AI analyzes your answer and responds instantly', color: 'bg-emerald-500' },
                ].map(({ step, text, color }) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5`}>{step}</div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* START CTA */}
            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-base shadow-2xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Video className="w-5 h-5" />
              Start Interview
            </button>

          </div>
        </div>
      </div>
    )
  }



  if (phase === PHASE.ROOM_ENTRY) {
    return (
      <WalkInInterviewRoom
        candidateName={candidateName || 'Candidate'}
        roleLabel={selectedRoleLabel}
        resumeData={resumeData}
        interviewerPersona={interviewerPersona}
        interviewerName={interviewerName}
        onBack={() => setPhase(PHASE.SETUP)}
        onBegin={() => {
          setPhase(PHASE.INTERVIEWING)
          if (typeof window !== 'undefined') {
            window._heardHello = false
          }
          if (interviewFormat !== 'text') {
            setZoomPhase('connecting')
            setOnboardingQuestionText('')
            hasGreetedRef.current = false
            hasEncouragedRef.current = false
            hasGreetNudgeRef.current = false
            lastSpeechTimeRef.current = Date.now()
            setEncouragementText('')
          }
        }}
      />
    )
  }


  if (phase === PHASE.GENERATING) {


    return (


      <div className="flex flex-col items-center justify-center py-24 animate-in">


        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mb-6 animate-bounce-slow">


          <Mic className="w-10 h-10 text-primary-600" />


        </div>


        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Preparing Your Interview</h2>


        <p className="text-gray-500 text-sm mb-8">Gemini AI is crafting personalized questions...</p>


        <LoadingSpinner size="lg" color="primary" />


      </div>


    )
  }


  // Render the full-screen interview room for BOTH interviewing and evaluating phases.
  // Previously only rendered for 'interviewing' — so during evaluation the room
  // would unmount, the sidebar would pop back in, and the layout would shrink.
  if (
    (phase === PHASE.INTERVIEWING || phase === PHASE.EVALUATING) &&
    (interviewFormat === 'video' || interviewFormat === 'voice')
  ) {
    return (
      <AIInterviewerRoom
        cameraPreviewRef={cameraPreviewRef}
        currentQuestion={currentQuestion}
        interviewerName={interviewerName}
        interviewerPersona={interviewerPersona}
        isListening={isListening}
        isSpeaking={isInterviewerSpeaking}
        cameraReady={cameraReady}
        emotionSnapshot={emotionSnapshot}
        onEmotionSnapshotChange={setEmotionSnapshot}
        onTelemetryOverrideChange={handleTelemetryOverrideChange}
        voiceTranscript={voiceTranscript}
        onVoiceTranscriptChange={setVoiceTranscript}
        voiceInterim={voiceInterim}
        voiceMetrics={voiceMetrics}
        elapsedSeconds={elapsedSeconds}
        totalElapsed={totalElapsed}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onSubmitAnswer={handleSubmitAnswer}
        onIsSpeakingChange={setIsInterviewerSpeaking}
        onSkipQuestion={handleSkip}
        onEndInterview={handleFinish}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedMicId={selectedMicId}
        selectedCameraId={selectedCameraId}
        onMicChange={handleMicChange}
        onCameraChange={handleCameraChange}
        activeMediaStream={activeMediaStream}
        zoomPhase={zoomPhase}
        onboardingQuestionText={onboardingQuestionText}
        encouragementText={encouragementText}
        cameraEnabled={cameraEnabled}
        onCameraToggle={handleCameraToggle}
        micEnabled={micEnabled}
        onMicToggle={handleMicToggle}
        showTypingFallback={showTypingFallback}
        onShowTypingFallbackChange={setShowTypingFallback}
        answer={answer}
        onAnswerChange={setAnswer}
        isEvaluating={phase === PHASE.EVALUATING}
      />
    )
  }


  return (


    <div className="space-y-4 animate-in max-w-7xl mx-auto">


      {/* - Mode Tabs - */}


      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/80 border border-white/[0.06] w-fit">


        {FORMAT_OPTIONS.map(({ value, label }) => (


          <button


            key={value}


            className={clsx(


              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',


              interviewFormat === value


                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'


                : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'


            )}


            onClick={() => { if (phase === PHASE.SETUP) setInterviewFormat(value) }}


          >


            {value === 'text' ? <Type className="w-4 h-4" /> : value === 'voice' ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}


            {label} Mode


          </button>


        ))}


      </div>





      {/* - Stats Bar - */}


      <InterviewStatsBar


        currentIndex={currentIndex}


        totalQuestions={questions.length}


        elapsedSeconds={elapsedSeconds}


        totalElapsed={totalElapsed}


        interviewFormat={interviewFormat}


        difficulty={adaptiveDifficulty}


        progress={progress}


      />





      {/* - Main 2-Column Layout - */}


      <div className="grid lg:grid-cols-[1fr_340px] gap-4">


        {/* LEFT COLUMN */}


        <div className="space-y-4">


          {interviewFormat === 'video' && aiInterviewerMode && (
            <AIInterviewerRoom
              cameraPreviewRef={cameraPreviewRef}
              currentQuestion={currentQuestion}
              interviewerName={interviewerName}
              interviewerPersona={interviewerPersona}
              isListening={isListening}
              isSpeaking={isInterviewerSpeaking}
              cameraReady={cameraReady}
              emotionSnapshot={emotionSnapshot}
              onEmotionSnapshotChange={setEmotionSnapshot}
              onTelemetryOverrideChange={handleTelemetryOverrideChange}
              voiceTranscript={voiceTranscript}
              onVoiceTranscriptChange={setVoiceTranscript}
              onIsSpeakingChange={setIsInterviewerSpeaking}
              onEndInterview={handleFinish}
            />
          )}



          {/* Question Card */}


          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-xl">


            <div className="flex items-center justify-between mb-3">


              <div className="flex items-center gap-3">


                {panelMode ? (


                  <PanelAvatar member={getPanelMemberForQuestion(currentQuestion)} isActive showIntro={currentIndex === 0} />


                ) : (


                  <>


                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">


                      <Sparkles className="w-5 h-5 text-white" />


                    </div>


                    <div>


                      <p className="text-xs text-gray-400">Interviewer</p>


                      <p className="text-sm font-bold text-white">Hiring Manager</p>


                    </div>


                  </>


                )}


              </div>


              <div className="flex items-center gap-2">


                {panelMode && <PanelRoster members={PANEL_MEMBERS} activeId={getPanelMemberForQuestion(currentQuestion)?.id} />}


                {isRetrying && <span className="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">RETRY</span>}


                {currentQuestion?.is_follow_up && <span className="px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-[10px] font-bold text-violet-300">FOLLOW-UP</span>}


                <span className="flex items-center gap-1.5 text-[11px] text-red-300 font-semibold"><Radio className="w-3 h-3 animate-pulse" /> Live</span>


              </div>


            </div>





            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Question {currentIndex + 1} of {questions.length}</p>


            <p className="text-lg font-semibold text-white leading-relaxed mb-3">{currentQuestion?.text}</p>


            <div className="flex flex-wrap gap-2">


              {currentQuestion?.round && <span className="badge badge-green">{currentQuestion.round}</span>}


              {currentQuestion?.category && <span className="badge badge-blue">{currentQuestion.category}</span>}


              {currentQuestion?.time_limit_seconds && <span className="badge badge-red">{currentQuestion.time_limit_seconds}s</span>}


              {currentQuestion?.difficulty && (


                <span className={clsx('badge', {


                  'badge-green': currentQuestion.difficulty === 'easy',


                  'badge-orange': currentQuestion.difficulty === 'medium',


                  'badge-red': currentQuestion.difficulty === 'hard',


                })}>{currentQuestion.difficulty}</span>


              )}


            </div>


            <button onClick={() => setShowHint(v => !v)} className="mt-3 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">


              <Lightbulb className="w-3.5 h-3.5" /> {showHint ? 'Hide hint' : 'Show hint'}


            </button>


            {showHint && (


              <div className="mt-2 p-3 bg-amber-500/10 rounded-xl text-xs text-amber-200 border border-amber-500/20">


                <Lightbulb className="w-3.5 h-3.5 inline mr-1" /> This is a <strong>{currentQuestion?.type}</strong> question about <strong>{currentQuestion?.category}</strong>. Structure your answer: context, approach, outcome.


              </div>


            )}


          </div>





          {/* Recording / Input Area */}


          {interviewFormat !== 'text' && (


            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">


              {interviewFormat === 'video' && !aiInterviewerMode && (


                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black mb-4">


                  <video ref={cameraPreviewRef} autoPlay muted playsInline className="w-full aspect-video object-cover bg-black" />


                  {!cameraReady && (


                    <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm bg-black/70">Camera activates when recording starts.</div>


                  )}


                  {isListening && <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/80 text-[10px] font-bold text-white"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE</div>}


                </div>


              )}





              <div className="flex items-center justify-between mb-3">


                <p className="text-sm font-semibold text-white flex items-center gap-2">


                  {interviewFormat === 'video' ? <Camera className="w-4 h-4 text-cyan-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}


                  {isListening ? 'Listening...' : 'Mic capture'}


                </p>


                <div className="flex gap-2">


                  {!isListening && (


                    <button onClick={startVoiceCapture} className="px-3 py-1.5 rounded-xl bg-green-500/15 border border-green-500/30 text-xs font-semibold text-green-300 hover:bg-green-500/25 transition-colors flex items-center gap-1.5">


                      <Play className="w-3 h-3" /> Start


                    </button>


                  )}


                  {isListening && (


                    <button onClick={() => stopVoiceCapture({ keepTranscript: true })} className="px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition-colors flex items-center gap-1.5">


                      <Square className="w-3 h-3" /> Stop


                    </button>


                  )}


                  <button onClick={() => setShowTypingFallback(v => !v)} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10 transition-colors">


                    <Type className="w-3 h-3" />


                  </button>


                </div>


              </div>





              <VoiceCaptureStudio
                stream={activeMediaStream}
                isListening={isListening}
                transcript={voiceTranscript}
                interimTranscript={voiceInterim}
                voiceMetrics={voiceMetrics}
                elapsedSeconds={elapsedSeconds}
                recordingUrl={recordingUrl}
                interviewFormat={interviewFormat}
                onVoiceTelemetryUpdate={(tel) => setAvgTremorScore(tel.avg_tremor)}
                audioDevices={audioDevices}
                videoDevices={videoDevices}
                selectedMicId={selectedMicId}
                selectedCameraId={selectedCameraId}
                onMicChange={handleMicChange}
                onCameraChange={handleCameraChange}
              />





              {voiceError && (


                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200 mb-3 space-y-2">
                  <div className="font-bold text-red-300">Voice Recognition Issue:</div>
                  <div>{voiceError}</div>
                  <div className="pt-1.5 text-[11px] text-gray-400 border-t border-white/5 space-y-1">
                    <p className="font-semibold text-gray-300">💡 Quick Troubleshooting Tips:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Use a supported browser like <strong className="text-gray-300">Google Chrome</strong> or <strong className="text-gray-300">Microsoft Edge</strong>.</li>
                      <li>Ensure you are accessing the app via <code className="bg-white/5 px-1 rounded text-gray-300">http://localhost:5173</code> (IP address access requires HTTPS for media devices).</li>
                      <li>Click the site settings/padlock icon next to the URL in your browser address bar and verify Microphone permission is set to <strong>Allow</strong>.</li>
                      <li>If you still experience issues, click the <strong>Keyboard/Type icon (⌨️)</strong> above to enable the <strong className="text-gray-300">Typed Fallback mode</strong> and type your answers.</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-red-500/10">
                    <button
                      onClick={startVoiceCapture}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Retry Mic Capture</span>
                    </button>
                    <button
                      onClick={() => {
                        setVoiceError('')
                        setShowTypingFallback(true)
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-lg border border-white/10 transition-colors text-[11px]"
                    >
                      Use Typed Input
                    </button>
                  </div>
                </div>


              )}





            </div>


          )}





          {/* Typed answer area */}


          {(showTypingFallback || interviewFormat === 'text') && (


            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">


              <label className="block text-sm font-semibold text-white mb-2">


                {interviewFormat === 'text' ? 'Your Answer' : 'Typed Fallback'}


              </label>


              <textarea


                ref={textareaRef}


                className="w-full rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-gray-500 p-3 resize-none h-32 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all"


                placeholder="Type your answer here..."


                value={answer}


                onChange={e => setAnswer(e.target.value)}


                disabled={phase === PHASE.EVALUATING}


              />


              <div className="flex items-center justify-between mt-2">


                <span className="text-xs text-gray-500">{answer.split(/\s+/).filter(Boolean).length} words</span>


              </div>


            </div>


          )}





          {/* Action buttons */}


          <div className="flex items-center gap-3">


            <button onClick={handleSkip} disabled={phase === PHASE.EVALUATING} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:bg-white/[0.08] transition-colors flex items-center gap-2">


              <SkipForward className="w-4 h-4" /> Skip


            </button>


            <button


              onClick={handleSubmitAnswer}


              disabled={!(answer.trim() || voiceTranscript.trim()) || phase === PHASE.EVALUATING}


              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"


            >


              {phase === PHASE.EVALUATING


                ? <><LoadingSpinner size="sm" color="white" /> Evaluating...</>


                : <><Send className="w-4 h-4" /> Submit Answer</>


              }


            </button>


            {evaluation && (


              <button onClick={handleNextQuestion} className="px-4 py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-sm font-semibold text-cyan-300 hover:bg-cyan-600/30 transition-colors flex items-center gap-2">


                {currentIndex + 1 >= questions.length ? <><TrendingUp className="w-4 h-4" /> Results</> : <><ChevronDown className="w-4 h-4" /> Next</>}


              </button>


            )}


          </div>





          {/* Bottom Metrics Bar */}


          {(isListening || voiceMetrics) && (


            <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/[0.06]">


              <MetricChip label="WPM" value={voiceMetrics?.speaking_pace_wpm || '-'} status={voiceMetrics?.speaking_pace_wpm >= 110 && voiceMetrics?.speaking_pace_wpm <= 170 ? 'good' : voiceMetrics?.speaking_pace_wpm ? 'warn' : 'idle'} />


              <MetricChip label="Fillers" value={voiceMetrics?.filler_count ?? '-'} status={voiceMetrics?.filler_count <= 3 ? 'good' : voiceMetrics?.filler_count ? 'warn' : 'idle'} />


              <MetricChip label="Words" value={voiceMetrics?.word_count || answer.split(/\s+/).filter(Boolean).length || '-'} status="idle" />


              <MetricChip label="Clarity" value={evaluation?.clarity_score ? `${evaluation.clarity_score}` : '-'} status={evaluation?.clarity_score >= 70 ? 'good' : evaluation?.clarity_score ? 'warn' : 'idle'} />


              <MetricChip label="Confidence" value={evaluation?.confidence_score ? `${evaluation.confidence_score}` : '-'} status={evaluation?.confidence_score >= 70 ? 'good' : evaluation?.confidence_score ? 'warn' : 'idle'} />


            </div>


          )}





          {/* Evaluation Result (inline) */}


          {evaluation && phase !== PHASE.INTERVIEWING && (


            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 space-y-4">


              <div className="flex items-center justify-between">


                <h3 className="font-bold text-white flex items-center gap-2">


                  {evaluation.overall_score >= 70 ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-orange-500" />}


                  Evaluation


                  {isRetrying && previousScore !== null && (


                    <span className={clsx('text-xs ml-2 px-2 py-0.5 rounded-full', evaluation.overall_score > previousScore ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>


                      {evaluation.overall_score > previousScore ? `+${evaluation.overall_score - previousScore}` : evaluation.overall_score - previousScore} from retry


                    </span>


                  )}


                </h3>


                <span className={clsx('text-2xl font-black', evaluation.overall_score >= 70 ? 'text-green-500' : evaluation.overall_score >= 50 ? 'text-yellow-500' : 'text-red-500')}>


                  {evaluation.overall_score}/100


                </span>


              </div>





              <div className="grid grid-cols-2 gap-2">


                <MiniScoreRow label="Technical" score={evaluation.technical_score} />


                <MiniScoreRow label="Clarity" score={evaluation.clarity_score} />


                <MiniScoreRow label="Relevance" score={evaluation.relevance_score || evaluation.technical_score} />


                <MiniScoreRow label="Depth" score={evaluation.depth_score || evaluation.completeness_score} />


              </div>





              {evaluation.feedback && (


                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-gray-300">


                  <p className="font-semibold text-white mb-1 flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Feedback</p>


                  {evaluation.feedback}


                </div>


              )}





              {evaluation.ideal_answer_hints && (


                <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-sm text-violet-300">


                  <p className="font-semibold text-violet-200 mb-1 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Ideal Answer</p>


                  {evaluation.ideal_answer_hints}


                </div>


              )}





              {/* Strengths / Weaknesses */}


              <div className="flex gap-3">


                {evaluation.strong_areas?.length > 0 && (


                  <div className="flex-1">


                    <p className="text-[10px] font-bold uppercase text-green-400 mb-1.5 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Strengths</p>


                    <div className="flex flex-wrap gap-1">{evaluation.strong_areas.map(a => <span key={a} className="badge badge-green">{a}</span>)}</div>


                  </div>


                )}


                {evaluation.weak_areas?.length > 0 && (


                  <div className="flex-1">


                    <p className="text-[10px] font-bold uppercase text-orange-400 mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Improve</p>


                    <div className="flex flex-wrap gap-1">{evaluation.weak_areas.map(a => <span key={a} className="badge badge-orange">{a}</span>)}</div>


                  </div>


                )}


              </div>





              {/* Action buttons */}


              <div className="flex gap-2">


                <button onClick={handleRetryAnswer} className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5">


                  <RefreshCw className="w-3.5 h-3.5" /> Retry Answer


                </button>


                {shouldAskFollowUp(evaluation) && (


                  <button onClick={handleFollowUp} className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center gap-1.5">


                    <Zap className="w-3.5 h-3.5" /> Follow-Up Question


                  </button>


                )}


              </div>


            </div>


          )}


        </div>





        {/* RIGHT COLUMN - Live Feedback Panel */}


        <div className="hidden lg:block">


          <div className="sticky top-4 rounded-2xl border border-white/10 bg-slate-950 p-5">


            <LiveFeedbackPanel


              evaluation={evaluation}


              coachingTips={coachingTips}


              voiceMetrics={voiceMetrics}
              emotionSnapshot={emotionSnapshot}


              isLive={isListening}


              questionType={currentQuestion?.type || 'technical'}


            />


          </div>


        </div>


      </div>


    </div>


  )


}





/* - Metric Chip (bottom bar) - */


function MetricChip({ label, value, status = 'idle' }) {


  const color = status === 'good' ? 'text-green-400' : status === 'warn' ? 'text-yellow-400' : 'text-gray-400'


  return (


    <div className="flex items-center gap-2">


      <div>


        <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>


        <p className={`text-sm font-bold text-white`}>{value}</p>


      </div>


      <span className={`text-[10px] font-semibold ${color}`}>


        {status === 'good' ? 'Good' : status === 'warn' ? 'Avg' : ''}


      </span>


    </div>


  )


}












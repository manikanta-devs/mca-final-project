import React, { useEffect, useRef, useState, useCallback } from 'react'


import { useNavigate } from 'react-router-dom'


import toast from 'react-hot-toast'


import { motion, AnimatePresence } from 'framer-motion'


import {


  AlertCircle,


  BookOpen,


  Camera,


  CheckCircle,


  ChevronDown,


  Clock,


  Lightbulb,


  Mic,


  Play,


  Radio,


  RefreshCw,


  RotateCcw,


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


import { generateQuestions, startInterview, submitAnswer, completeInterview, submitFollowUp } from '../api/client'


import { useApp } from '../context/AppContext'


import LoadingSpinner from '../components/LoadingSpinner'


import ProgressBar from '../components/ProgressBar'


import Timer from '../components/Timer'


import { MiniScoreRow } from '../components/ScoreCard'


import { analyzeVoiceTranscript, formatSeconds, getSpeechRecognition, countFillers } from '../utils/voiceInterview'


import { getNextDifficulty, generateLiveCoachingTips, shouldAskFollowUp, getFollowUpPrompt, getDifficultyLabel } from '../utils/adaptiveEngine'


import LiveFeedbackPanel from '../components/LiveFeedbackPanel'


import InterviewStatsBar from '../components/InterviewStatsBar'


import PanelAvatar, { PanelRoster } from '../components/PanelAvatar'


import { PANEL_MEMBERS, getPanelMemberForQuestion, adjustFeedbackForPersona } from '../utils/panelInterviewer'





const DIFF_OPTIONS = [


  { value: 'easy', label: '🟢 Easy', desc: 'Fundamental concepts' },


  { value: 'medium', label: '🟡 Medium', desc: 'Industry standard level' },


  { value: 'hard', label: '🔴 Hard', desc: 'Senior/expert level' },


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





const PHASE = {


  SETUP: 'setup',


  GENERATING: 'generating',


  INTERVIEWING: 'interviewing',


  EVALUATING: 'evaluating',


}





export default function InterviewPage() {


  const navigate = useNavigate()


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


  const [interviewFormat, setInterviewFormat] = useState('voice')


  const [numQuestions, setNumQuestions] = useState(6)


  const [questions, setQuestions] = useState([])


  const [sessionId, setSessionId] = useState(null)


  const [currentIndex, setCurrentIndex] = useState(0)


  const [answer, setAnswer] = useState('')


  const [evaluation, setEvaluation] = useState(null)


  const [showHint, setShowHint] = useState(false)


  const [showTypingFallback, setShowTypingFallback] = useState(false)


  const [timerKey, setTimerKey] = useState(0)


  const [skipped, setSkipped] = useState(0)


  const [voiceSupported, setVoiceSupported] = useState(false)


  const [isListening, setIsListening] = useState(false)


  const [voiceTranscript, setVoiceTranscript] = useState('')


  const [voiceInterim, setVoiceInterim] = useState('')


  const [voiceMetrics, setVoiceMetrics] = useState(null)


  const [voiceError, setVoiceError] = useState('')


  const [recordingUrl, setRecordingUrl] = useState('')


  const [cameraReady, setCameraReady] = useState(false)


  const [elapsedSeconds, setElapsedSeconds] = useState(0)


  const [coachingTips, setCoachingTips] = useState([])


  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(difficulty)


  const [scoreHistory, setScoreHistory] = useState([])


  const [isRetrying, setIsRetrying] = useState(false)


  const [previousScore, setPreviousScore] = useState(null)


  const [totalElapsed, setTotalElapsed] = useState(0)


  const [followUpQuestion, setFollowUpQuestion] = useState(null)


  const [panelMode, setPanelMode] = useState(false)





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


  const questionStartedAtRef = useRef(null)


  const autoCaptureAttemptedRef = useRef(-1)





  const currentQuestion = questions[currentIndex]


  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0





  useEffect(() => {


    const Recognition = getSpeechRecognition()


    setVoiceSupported(Boolean(Recognition) && Boolean(navigator.mediaDevices?.getUserMedia))





    return () => {


      if (recognitionRef.current) {


        recognitionRef.current.onresult = null


        recognitionRef.current.onerror = null


        recognitionRef.current.onend = null


        try {


          recognitionRef.current.stop()


        } catch (_) {}


        recognitionRef.current = null


      }





      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {


        try {


          mediaRecorderRef.current.stop()


        } catch (_) {}


      }





      if (mediaStreamRef.current) {


        mediaStreamRef.current.getTracks().forEach(track => track.stop())


        mediaStreamRef.current = null


      }





      if (cameraPreviewRef.current) {


        cameraPreviewRef.current.srcObject = null


      }


    }


  }, [])





  useEffect(() => {


    if (phase === PHASE.INTERVIEWING && (interviewFormat === 'text' || showTypingFallback)) {


      textareaRef.current?.focus()


    }


  }, [phase, currentIndex, interviewFormat, showTypingFallback])





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





  // Live coaching tip updates


  useEffect(() => {


    if (phase !== PHASE.INTERVIEWING || !isListening) {


      return


    }


    const interval = setInterval(() => {


      const transcript = `${finalTranscriptRef.current} ${voiceInterim}`.trim()


      const fillerCount = countFillers(transcript)


      const tips = generateLiveCoachingTips(


        transcript,


        elapsedSeconds,


        currentQuestion?.type || 'technical',


        fillerCount


      )


      setCoachingTips(tips)


    }, 3000)


    return () => clearInterval(interval)


  }, [phase, isListening, elapsedSeconds, voiceInterim, currentQuestion])





  useEffect(() => {


    if (phase !== PHASE.INTERVIEWING) return


    if (interviewFormat === 'text') return


    if (isListening) return


    if (autoCaptureAttemptedRef.current === currentIndex) return





    autoCaptureAttemptedRef.current = currentIndex


    const timer = window.setTimeout(() => {


      startVoiceCapture().catch(() => {})


    }, 350)





    return () => window.clearTimeout(timer)


  }, [phase, currentIndex, interviewFormat, isListening])





  const stopVoiceCapture = async ({ keepTranscript = true, saveRecordingPreview = true, persistMetrics = true } = {}) => {


    const recognition = recognitionRef.current


    if (recognition) {


      recognition.onresult = null


      recognition.onerror = null


      recognition.onend = null


      try {


        recognition.stop()


      } catch (_) {}


      recognitionRef.current = null


    }





    const recorder = mediaRecorderRef.current


    if (recorder && recorder.state !== 'inactive') {


      try {


        recorder.stop()


      } catch (_) {}


    }


    mediaRecorderRef.current = null





    if (mediaStreamRef.current) {


      mediaStreamRef.current.getTracks().forEach(track => track.stop())


      mediaStreamRef.current = null


    }





    if (cameraPreviewRef.current) {


      cameraPreviewRef.current.srcObject = null


    }


    setCameraReady(false)


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





  const startVoiceCapture = async () => {


    const Recognition = getSpeechRecognition()


    if (!Recognition || !navigator.mediaDevices?.getUserMedia) {


      setVoiceSupported(false)


      toast.error('Voice recognition is not supported in this browser.')


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


      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: useVideo })


      mediaStreamRef.current = stream


      recordingStartedAtRef.current = Date.now()


      saveRecordingPreviewRef.current = true





      if (useVideo && cameraPreviewRef.current) {


        cameraPreviewRef.current.srcObject = stream


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





      const recognition = new Recognition()


      recognition.continuous = true


      recognition.interimResults = true


      recognition.lang = 'en-US'





      recognition.onresult = event => {


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


        if (liveTranscript) setAnswer(liveTranscript)


      }





      recognition.onerror = event => {


        setVoiceError(event.error || 'Voice capture failed.')


        toast.error('Voice capture stopped.')


        stopVoiceCapture({ keepTranscript: true }).catch(() => {})


      }





      recognition.onend = () => {


        setIsListening(false)


      }





      recognitionRef.current = recognition


      setIsListening(true)


      recognition.start()


      toast.success(useVideo ? 'Video interview started' : 'Voice capture started')


    } catch (error) {


      setVoiceError(error.response?.data?.error || error.message || 'Unable to start voice capture.')


      toast.error('Could not access the microphone')


      await stopVoiceCapture({ keepTranscript: false })


    }


  }





  const handleGenerate = async () => {


    setPhase(PHASE.GENERATING)


    const toastId = toast.loading('Generating AI questions...')


    try {


      const { data } = await generateQuestions({


        resume_data: resumeData || {},


        role: selectedRole,


        difficulty,


        num_questions: numQuestions,


        panel_mode: panelMode,


      })


      if (data.success && data.questions.length > 0) {


        setQuestions(data.questions)


        const { data: startData } = await startInterview({


          questions: data.questions,


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


        setSkipped(0)


        setVoiceTranscript('')


        setVoiceInterim('')


        setVoiceMetrics(null)


        setVoiceError('')


        setShowHint(false)


        setShowTypingFallback(false)


        setPhase(PHASE.INTERVIEWING)


        toast.success(`${data.questions.length} questions ready!`, { id: toastId })


      } else {


        throw new Error('No questions generated')


      }


    } catch (error) {


      toast.error(error.response?.data?.error || 'Failed to generate questions', { id: toastId })


      setPhase(PHASE.SETUP)


    }


  }





  const handleSubmitAnswer = async () => {


    const draftAnswer = answer.trim() || `${voiceTranscript} ${voiceInterim}`.trim()


    if (!draftAnswer) {


      toast.error('Please write an answer before submitting.')


      return


    }





    let latestVoiceMetrics = voiceMetrics


    if (isListening) {


      latestVoiceMetrics = await stopVoiceCapture({ keepTranscript: true })


    }





    const finalAnswer = (answer.trim() || `${finalTranscriptRef.current} ${voiceInterim}`.trim() || draftAnswer).trim()


    setPhase(PHASE.EVALUATING)


    const toastId = toast.loading('AI is evaluating your answer...')


    try {


      const { data } = await submitAnswer({


        session_id: sessionId,


        answer: finalAnswer,


        question_index: currentIndex,


        voice_metrics: latestVoiceMetrics || voiceMetrics || null,


      })


      setEvaluation(data.evaluation)





      // Track score history for adaptive difficulty


      const newScore = data.evaluation?.overall_score || 0


      const newHistory = [...scoreHistory, newScore]


      setScoreHistory(newHistory)





      // Update adaptive difficulty


      const nextDiff = getNextDifficulty(newHistory, adaptiveDifficulty)


      if (nextDiff !== adaptiveDifficulty) {


        setAdaptiveDifficulty(nextDiff)


        toast(`Difficulty adjusted to ${nextDiff}`, { icon: '📊' })


      }





      if (data.updated_questions) {


        setQuestions(data.updated_questions)


      }





      setCoachingTips([])


      toast.success('Answer evaluated!', { id: toastId })


    } catch (error) {


      toast.error('Evaluation failed', { id: toastId })


      setPhase(PHASE.INTERVIEWING)


    }


  }





  const handleNextQuestion = async () => {


    await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => {})


    const nextIndex = currentIndex + 1


    if (nextIndex >= questions.length) {


      handleFinish()


      return


    }





    setCurrentIndex(nextIndex)


    setAnswer('')


    setEvaluation(null)


    setShowHint(false)


    setShowTypingFallback(false)


    setTimerKey(key => key + 1)


    setVoiceTranscript('')


    setVoiceInterim('')


    setVoiceMetrics(null)


    setVoiceError('')


    if (recordingUrl) {


      URL.revokeObjectURL(recordingUrl)


      setRecordingUrl('')


    }


    setPhase(PHASE.INTERVIEWING)


  }





  const handleSkip = async () => {


    setSkipped(count => count + 1)


    const latestVoiceMetrics = await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => null)


    try {


      await submitAnswer({


        session_id: sessionId,


        answer: '[SKIPPED]',


        question_index: currentIndex,


        voice_metrics: latestVoiceMetrics || voiceMetrics || null,


      })


    } catch (_) {}


    await handleNextQuestion()


  }





  const handleFinish = async () => {


    await stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => {})


    const toastId = toast.loading('Completing interview...')


    try {


      const { data } = await completeInterview(sessionId)


      setInterviewResults(data.results)


      toast.success('Interview completed!', { id: toastId })


      navigate(`/dashboard/results/${sessionId}`)


    } catch (error) {


      toast.error('Failed to complete interview', { id: toastId })


    }


  }





  const handleReset = () => {


    stopVoiceCapture({ keepTranscript: false, saveRecordingPreview: false, persistMetrics: false }).catch(() => {})


    setPhase(PHASE.SETUP)


    setQuestions([])


    setSessionId(null)


    setCurrentIndex(0)


    setAnswer('')


    setEvaluation(null)


    setShowHint(false)


    setShowTypingFallback(false)


    setSkipped(0)


    setVoiceTranscript('')


    setVoiceInterim('')


    setVoiceMetrics(null)


    setVoiceError('')


    if (recordingUrl) {


      URL.revokeObjectURL(recordingUrl)


      setRecordingUrl('')


    }


  }





  const handleTimerExpire = () => {


    toast("Time's up! Auto-submitting...", { icon: '⏱️' })


    if (answer.trim()) handleSubmitAnswer()


    else handleSkip()


  }





  const handleRetryAnswer = () => {


    setPreviousScore(evaluation?.overall_score || null)


    setIsRetrying(true)


    setEvaluation(null)


    setAnswer('')


    setVoiceTranscript('')


    setVoiceInterim('')


    setVoiceMetrics(null)


    setVoiceError('')


    setCoachingTips([])


    if (recordingUrl) {


      URL.revokeObjectURL(recordingUrl)


      setRecordingUrl('')


    }


    setPhase(PHASE.INTERVIEWING)


    toast('Retry mode — give a better answer!', { icon: '📄' })


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


        setFollowUpQuestion(data.follow_up_question)


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


      <div className="max-w-3xl mx-auto space-y-5 animate-in">


        <div className="card">


          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Configure Your Interview</h2>


          <p className="text-sm text-gray-500 mb-2">


            {resumeData


              ? <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 inline" /> Resume loaded — questions will be tailored to your skills.</span>


              : <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-400 inline" /> No resume uploaded — using generic role-based questions.</span>


            }


          </p>





          {resumeData?.skills?.all?.length > 0 && (


            <div className="flex flex-wrap gap-1.5 mb-4">


              <span className="text-xs text-gray-400 mr-1">Detected skills:</span>


              {resumeData.skills.all.slice(0, 8).map(skill => (


                <span key={skill} className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs font-medium border border-primary-200 dark:border-primary-800">{skill}</span>


              ))}


              {resumeData.skills.all.length > 8 && <span className="text-xs text-gray-400">+{resumeData.skills.all.length - 8} more</span>}


            </div>


          )}





          {!resumeData && (


            <button onClick={() => navigate('/dashboard/resume')} className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">


              <BookOpen className="w-4 h-4" /> Upload your resume for personalized questions


            </button>


          )}





          <div className="rounded-2xl border border-white/10 bg-slate-950 text-white p-4 mb-6 shadow-xl shadow-black/20">


            <div className="flex items-center justify-between gap-3 mb-2">


              <div>


                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300 mb-1">Interview room</p>


                <h3 className="text-lg font-black">Pressure mode</h3>


              </div>


              <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-300">


                Camera and mic preferred


              </div>


            </div>


            <p className="text-sm text-gray-300 leading-relaxed">


              Voice and video mode use free browser APIs and start capture automatically once the question appears. Keep your camera framed and answer like you are in front of a real hiring panel.


            </p>


          </div>





          <div className="mb-5">


            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Target Role</label>


            <div className="grid grid-cols-2 gap-2">


              {ROLE_OPTIONS.map(({ value, label }) => (


                <button


                  key={value}


                  onClick={() => setSelectedRole(value)}


                  className={clsx(


                    'p-3 rounded-xl text-sm font-medium text-left border-2 transition-all',


                    selectedRole === value


                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'


                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'


                  )}


                >


                  {label}


                </button>


              ))}


            </div>


          </div>





          <div className="mb-5">


            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Difficulty Level</label>


            <div className="grid grid-cols-3 gap-3">


              {DIFF_OPTIONS.map(({ value, label, desc }) => (


                <button


                  key={value}


                  onClick={() => setDifficulty(value)}


                  className={clsx(


                    'p-3 rounded-xl text-left border-2 transition-all',


                    difficulty === value


                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'


                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'


                  )}


                >


                  <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{label}</div>


                  <div className="text-xs text-gray-400 mt-0.5">{desc}</div>


                </button>


              ))}


            </div>


          </div>





          <div className="mb-5">


            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Interview Task</label>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">


              {FORMAT_OPTIONS.map(({ value, label, desc }) => (


                <button


                  key={value}


                  onClick={() => setInterviewFormat(value)}


                  className={clsx(


                    'p-3 rounded-xl text-left border-2 transition-all',


                    interviewFormat === value


                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'


                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'


                  )}


                >


                  <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">


                    {value === 'video' ? <Video className="w-4 h-4" /> : value === 'voice' ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}


                    {label}


                  </div>


                  <div className="text-xs text-gray-400 mt-0.5">{desc}</div>


                </button>


              ))}


            </div>


          </div>





          <div className="mb-6">


            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">


              Number of Questions: <span className="text-primary-600">{numQuestions}</span>


            </label>


            <input


              type="range"


              min={3}


              max={10}


              value={numQuestions}


              onChange={e => setNumQuestions(Number(e.target.value))}


              className="w-full accent-primary-600"


            />


            <div className="flex justify-between text-xs text-gray-400 mt-1">


              <span>3 (Quick)</span><span>5 (Standard)</span><span>10 (Thorough)</span>


            </div>


          </div>





          {/* Panel Interview Toggle */}


          <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950 text-white p-4">


            <div className="flex items-center justify-between">


              <div>


                <p className="text-sm font-bold">Panel Interview Mode</p>


                <p className="text-xs text-gray-400 mt-0.5">3 AI interviewers with different personalities ask questions in rotation</p>


              </div>


              <button


                onClick={() => setPanelMode(!panelMode)}


                className={clsx(


                  'relative w-12 h-6 rounded-full transition-colors',


                  panelMode ? 'bg-violet-600' : 'bg-gray-700'


                )}


              >


                <span className={clsx(


                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',


                  panelMode ? 'translate-x-6' : 'translate-x-0.5'


                )} />


              </button>


            </div>


            {panelMode && (


              <div className="mt-3 flex items-center gap-3">


                {PANEL_MEMBERS.map(m => (


                  <div key={m.id} className="flex items-center gap-2">


                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] font-black text-white`}>{m.initials}</div>


                    <div>


                      <p className="text-xs font-semibold text-white">{m.name}</p>


                      <p className="text-[10px] text-gray-500">{m.role}</p>


                    </div>


                  </div>


                ))}


              </div>


            )}


          </div>





          <button onClick={handleGenerate} className="btn-primary w-full justify-center py-3 text-base">


            <Play className="w-5 h-5" /> Start Interview


          </button>


        </div>


      </div>


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





  return (


    <div className="space-y-4 animate-in max-w-7xl mx-auto">


      {/* â”€â”€ Mode Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


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





      {/* â”€â”€ Stats Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


      <InterviewStatsBar


        currentIndex={currentIndex}


        totalQuestions={questions.length}


        elapsedSeconds={elapsedSeconds}


        totalElapsed={totalElapsed}


        interviewFormat={interviewFormat}


        difficulty={adaptiveDifficulty}


        progress={progress}


      />





      {/* â”€â”€ Main 2-Column Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


      <div className="grid lg:grid-cols-[1fr_340px] gap-4">


        {/* LEFT COLUMN */}


        <div className="space-y-4">


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


              {currentQuestion?.category && <span className="badge badge-blue">{currentQuestion.category}</span>}


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


                <Lightbulb className="w-3.5 h-3.5 inline mr-1" /> This is a <strong>{currentQuestion?.type}</strong> question about <strong>{currentQuestion?.category}</strong>. Structure your answer: context â†’ approach â†’ outcome.


              </div>


            )}


          </div>





          {/* Recording / Input Area */}


          {interviewFormat !== 'text' && (


            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">


              {interviewFormat === 'video' && (


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





              {/* Live Transcript */}


              {(voiceTranscript || voiceInterim) && (


                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-white mb-3">


                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1 flex items-center gap-1.5">


                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live Transcription


                  </p>


                  <p>{voiceTranscript || 'Listening...'}</p>


                  {voiceInterim && <p className="mt-1 italic text-cyan-200/60">{voiceInterim}</p>}


                </div>


              )}





              {voiceError && (


                <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-200 mb-3">{voiceError}</div>


              )}





              {recordingUrl && (


                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-3">


                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Answer Preview</p>


                  {interviewFormat === 'video' ? (


                    <video controls src={recordingUrl} className="w-full rounded-lg max-h-48 bg-black" />


                  ) : (


                    <audio controls src={recordingUrl} className="w-full" />


                  )}


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


              <MetricChip label="WPM" value={voiceMetrics?.speaking_pace_wpm || '—'} status={voiceMetrics?.speaking_pace_wpm >= 110 && voiceMetrics?.speaking_pace_wpm <= 170 ? 'good' : voiceMetrics?.speaking_pace_wpm ? 'warn' : 'idle'} />


              <MetricChip label="Fillers" value={voiceMetrics?.filler_count ?? '—'} status={voiceMetrics?.filler_count <= 3 ? 'good' : voiceMetrics?.filler_count ? 'warn' : 'idle'} />


              <MetricChip label="Words" value={voiceMetrics?.word_count || answer.split(/\s+/).filter(Boolean).length || '—'} status="idle" />


              <MetricChip label="Clarity" value={evaluation?.clarity_score ? `${evaluation.clarity_score}` : '—'} status={evaluation?.clarity_score >= 70 ? 'good' : evaluation?.clarity_score ? 'warn' : 'idle'} />


              <MetricChip label="Confidence" value={evaluation?.confidence_score ? `${evaluation.confidence_score}` : '—'} status={evaluation?.confidence_score >= 70 ? 'good' : evaluation?.confidence_score ? 'warn' : 'idle'} />


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





        {/* RIGHT COLUMN — Live Feedback Panel */}


        <div className="hidden lg:block">


          <div className="sticky top-4 rounded-2xl border border-white/10 bg-slate-950 p-5">


            <LiveFeedbackPanel


              evaluation={evaluation}


              coachingTips={coachingTips}


              voiceMetrics={voiceMetrics}


              isLive={isListening}


              questionType={currentQuestion?.type || 'technical'}


            />


          </div>


        </div>


      </div>


    </div>


  )


}





/* â”€â”€ Metric Chip (bottom bar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */


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






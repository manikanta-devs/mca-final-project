import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, Circle, Clock3, Lightbulb, Play, RotateCcw, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { getQuizTopics, startQuiz, submitQuizAnswer, completeQuiz, getQuizSessions } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import AdvancedToolPanel from '../components/AdvancedToolPanel'

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export default function QuizPage() {
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [topics, setTopics] = useState([])
  const [sessions, setSessions] = useState([])
  const [topic, setTopic] = useState('python')
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(5)
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [results, setResults] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [topicsRes, sessionsRes] = await Promise.allSettled([getQuizTopics(), getQuizSessions()])
      if (topicsRes.status === 'fulfilled') setTopics(topicsRes.value.data.topics || [])
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data.sessions || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleStart = async () => {
    setStarting(true)
    try {
      const { data } = await startQuiz({ topic, difficulty, num_questions: numQuestions })
      setSessionId(data.session_id)
      setQuestions(data.questions || [])
      setCurrentIndex(0)
      setSelectedIndex(null)
      setResults(null)
      setFeedback(null)
      toast.success('Quiz started')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start quiz')
    } finally {
      setStarting(false)
    }
  }

  const handleSubmit = async () => {
    if (selectedIndex === null) {
      toast.error('Choose an answer first')
      return
    }
    try {
      const { data } = await submitQuizAnswer({
        session_id: sessionId,
        question_index: currentIndex,
        selected_index: selectedIndex,
      })
      setFeedback(data)
      if (data.is_complete || currentIndex + 1 >= questions.length) {
        const { data: completeData } = await completeQuiz(sessionId)
        setResults(completeData.results)
        await loadData()
        return
      }
      setCurrentIndex(prev => prev + 1)
      setSelectedIndex(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit answer')
    }
  }

  const handleReset = () => {
    setSessionId(null)
    setQuestions([])
    setCurrentIndex(0)
    setSelectedIndex(null)
    setResults(null)
    setFeedback(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading quiz platform..." /></div>
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <AdvancedToolPanel type="quiz" />

      <div className="card bg-gradient-to-br from-slate-950 via-primary-950 to-slate-900 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold mb-4">
              <Target className="w-3.5 h-3.5" />
              Quiz platform for interview practice and coding drills
            </div>
            <h2 className="text-3xl md:text-5xl font-black leading-tight mb-3">Train with topic-based quizzes before the interview</h2>
            <p className="text-white/75 max-w-2xl leading-relaxed">
              Use short quizzes to strengthen weak areas like coding, Python, SQL, aptitude, and HR prep.
              This is designed for users who want to practice in a lighter format before the mock interview.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
              <div className="text-3xl font-black">{sessions.length}</div>
              <div className="text-xs uppercase tracking-wide text-white/70 mt-1">Quiz sessions</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
              <div className="text-3xl font-black">{topics.length}</div>
              <div className="text-xs uppercase tracking-wide text-white/70 mt-1">Topics</div>
            </div>
          </div>
        </div>
      </div>

      {!sessionId && (
        <div className="card grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">Start a new quiz</h3>
            <p className="text-sm text-gray-500 mb-5">Pick a topic, difficulty, and question count.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Topic</label>
                <select value={topic} onChange={e => setTopic(e.target.value)} className="input-base w-full">
                  {(topics.length > 0 ? topics : ['coding', 'python', 'sql', 'aptitude', 'hr']).map(item => (
                    <option key={item} value={item}>{item.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setDifficulty(option.value)}
                      className={clsx('p-3 rounded-xl border-2 text-sm font-medium', difficulty === option.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700')}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Questions: {numQuestions}</label>
                <input type="range" min={3} max={10} value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full accent-primary-600" />
              </div>

              <button onClick={handleStart} disabled={starting} className="btn-primary w-full justify-center py-3">
                {starting ? <LoadingSpinner size="sm" color="white" /> : <><Play className="w-4 h-4" /> Start quiz</>}
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-gray-950 text-white p-6">
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary-300" /> Why quizzes help</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li>• Reinforce fundamentals before the mock interview.</li>
              <li>• Detect weak topics early and measure progress.</li>
              <li>• Build confidence with short, low-pressure practice sessions.</li>
              <li>• Review explanations after each answer to learn quickly.</li>
            </ul>
          </div>
        </div>
      )}

      {sessionId && !results && questions[currentIndex] && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Question {currentIndex + 1} of {questions.length}</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{questions[currentIndex].question}</h3>
            </div>
            <button onClick={handleReset} className="btn-ghost text-sm"><RotateCcw className="w-4 h-4" /> Reset</button>
          </div>

          <div className="grid gap-3">
            {questions[currentIndex].options.map((option, index) => (
              <button
                key={option}
                onClick={() => setSelectedIndex(index)}
                className={clsx('text-left p-4 rounded-2xl border-2 transition-all', selectedIndex === index ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {selectedIndex === index ? <CheckCircle className="w-5 h-5 text-primary-600" /> : <Circle className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Option {index + 1}</div>
                    <div className="text-sm text-gray-500">{option}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-500 flex items-center gap-2"><Clock3 className="w-4 h-4" /> Quick practice improves speed and recall.</div>
            <button onClick={handleSubmit} className="btn-primary">Submit answer</button>
          </div>

          {feedback && (
            <div className={clsx('rounded-2xl p-4 border', feedback.is_correct ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800')}>
              <div className="font-bold mb-1">{feedback.is_correct ? 'Correct answer' : 'Review this one'}</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{feedback.explanation}</p>

              <div className="grid md:grid-cols-2 gap-3 text-sm mb-3">
                <div className="rounded-xl bg-white/70 dark:bg-black/20 p-3 border border-white/50 dark:border-white/10">
                  <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Your choice</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{feedback.selected_option || 'No selection captured'}</div>
                  {!feedback.is_correct && feedback.selected_reason && <div className="text-gray-600 dark:text-gray-300 mt-1">Why this was weak: {feedback.selected_reason}</div>}
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-black/20 p-3 border border-white/50 dark:border-white/10">
                  <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Correct choice</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{feedback.correct_option || 'Unavailable'}</div>
                  {feedback.correct_reason && <div className="text-gray-600 dark:text-gray-300 mt-1">Why it works: {feedback.correct_reason}</div>}
                </div>
              </div>

              <p className="text-sm text-gray-500">{feedback.is_correct ? 'Good work. Move to the next question.' : 'Use the explanation, then re-read the question and compare the options again.'}</p>
            </div>
          )}
        </div>
      )}

      {results && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quiz completed</h3>
              <p className="text-sm text-gray-500">{results.candidate_name} scored {results.score}% on {results.topic.toUpperCase()}.</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-primary-600">{results.score}%</div>
              <div className="text-xs text-gray-400">Accuracy</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase text-gray-400 font-semibold mb-1">Correct</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{results.correct_answers}/{results.total_questions}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase text-gray-400 font-semibold mb-1">Difficulty</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white capitalize">{results.difficulty}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="text-xs uppercase text-gray-400 font-semibold mb-1">Weak topics</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{results.weak_topics?.length || 0}</div>
            </div>
          </div>

          <button onClick={handleReset} className="btn-secondary w-full justify-center"><RotateCcw className="w-4 h-4" /> Take another quiz</button>
        </div>
      )}

      <div className="card">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3">Recent quiz history</h3>
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white capitalize">{item.topic}</div>
                  <div className="text-sm text-gray-500 capitalize">{item.difficulty} • {item.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-primary-600">{item.score ?? 0}%</div>
                  <div className="text-xs text-gray-400">{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'In progress'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No quiz attempts yet.</p>
        )}
      </div>
    </motion.div>
  )
}

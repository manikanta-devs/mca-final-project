/**
 * VideoInterviewPage.jsx
 * 
 * Entry point for the Video Interview feature.
 * Renders inside the Dashboard layout at route /dashboard/video-interview.
 * 
 * IMPORTANT: This is a PRESENTATION LAYER. It does not change how questions
 * are generated, how answers are evaluated, how sessions are stored, or how
 * interview history works. The Video Interview page only consumes the
 * existing interview APIs and state.
 * 
 * Flow:
 *   1. No Resume Guard → if no resumeData, prompt user to upload
 *   2. Interview Setup → select interviewer, configure difficulty
 *   3. Interview Room → delegates to VideoInterviewRoom
 * 
 * @module VideoInterviewPage
 */
import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  ArrowRight,
  Video,
  Shield,
  Clock,
  Globe,
  CheckCircle,
  User,
  Sparkles,
  ChevronRight,
  Star,
  Zap,
  Target,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import VideoInterviewRoom from './components/VideoInterviewRoom'

// ─── Persona Data ────────────────────────────────────────────
const PERSONAS = {
  sarah: {
    id: 'sarah',
    name: 'Sarah Chen',
    title: 'Senior HR Director',
    company: 'TalentForge AI',
    photo: '/interviewers/sarah_chen.png',
    focus: 'Focuses on cultural alignment, core motivations, leadership qualities, and structured behavioral scenarios.',
    accentColor: '#8B5CF6',
    accentBg: 'rgba(139,92,246,0.15)',
    skills: ['Behavioral', 'Leadership', 'Culture Fit', 'Soft Skills'],
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus Rodriguez',
    title: 'Technical Lead',
    company: 'TalentForge AI',
    photo: '/interviewers/marcus_rodriguez.png',
    focus: 'Dives deep into software engineering workflows, systems design choices, bug diagnosis, and project architecture.',
    accentColor: '#06B6D4',
    accentBg: 'rgba(6,182,212,0.15)',
    skills: ['Technical', 'System Design', 'Debugging', 'Architecture'],
  },
}

const DIFFICULTIES = [
  { value: 'Easy', color: '#22c55e', label: 'Easy', desc: 'Introductory questions' },
  { value: 'Medium', color: '#eab308', label: 'Medium', desc: 'Standard interview' },
  { value: 'Hard', color: '#ef4444', label: 'Hard', desc: 'Senior-level depth' },
]

// ─── Shared Styles ───────────────────────────────────────────
const glassCard = {
  background: 'rgba(15,23,42,0.7)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
}

const pageContainer = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '24px',
  gap: '24px',
  overflowY: 'auto',
}

// ─── No Resume Guard Screen ─────────────────────────────────
function NoResumeScreen() {
  const navigate = useNavigate()

  return (
    <motion.div
      style={{
        ...pageContainer,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        style={{
          ...glassCard,
          padding: '48px',
          maxWidth: '480px',
          width: '100%',
        }}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <FileText style={{ width: '32px', height: '32px', color: '#8B5CF6' }} />
        </div>

        <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#e2e8f0',
          marginBottom: '12px',
        }}>
          Resume Required
        </h2>

        <p style={{
          fontSize: '14px',
          color: '#94a3b8',
          lineHeight: '1.6',
          marginBottom: '32px',
        }}>
          To conduct a personalized AI interview, we need your resume data. 
          Please upload and analyze your resume first in the Resume Analysis module.
        </p>

        <motion.button
          onClick={() => navigate('/dashboard/resume')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '14px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(139,92,246,0.3)' }}
          whileTap={{ scale: 0.98 }}
        >
          Go to Resume Analysis
          <ArrowRight style={{ width: '16px', height: '16px' }} />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ─── Interviewer Card ────────────────────────────────────────
function InterviewerCard({ persona, isSelected, onSelect }) {
  const data = PERSONAS[persona]
  
  return (
    <motion.button
      onClick={() => onSelect(persona)}
      style={{
        ...glassCard,
        padding: '24px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'left',
        width: '100%',
        border: isSelected
          ? `2px solid ${data.accentColor}`
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isSelected
          ? `0 0 30px ${data.accentColor}22, inset 0 0 30px ${data.accentColor}08`
          : 'none',
        transition: 'all 0.3s ease',
      }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Selected badge */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: data.accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle style={{ width: '16px', height: '16px', color: '#fff' }} />
        </motion.div>
      )}

      {/* Avatar + Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: `2px solid ${isSelected ? data.accentColor : 'rgba(255,255,255,0.1)'}`,
          flexShrink: 0,
        }}>
          <img
            src={data.photo}
            alt={data.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#e2e8f0', marginBottom: '2px' }}>
            {data.name}
          </h3>
          <p style={{ fontSize: '12px', fontWeight: '600', color: data.accentColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {data.title}
          </p>
          <p style={{ fontSize: '11px', color: '#64748b' }}>{data.company}</p>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '12px' }}>
        {data.focus}
      </p>

      {/* Skills tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {data.skills.map(skill => (
          <span
            key={skill}
            style={{
              fontSize: '10px',
              fontWeight: '600',
              padding: '3px 8px',
              borderRadius: '6px',
              background: data.accentBg,
              color: data.accentColor,
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '16px',
        padding: '10px',
        borderRadius: '10px',
        background: isSelected
          ? `linear-gradient(135deg, ${data.accentColor}dd, ${data.accentColor})`
          : 'rgba(255,255,255,0.04)',
        color: isSelected ? '#fff' : '#94a3b8',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'all 0.3s',
      }}>
        {isSelected ? 'Selected' : 'Select & Start Interview'}
        <ChevronRight style={{ width: '14px', height: '14px' }} />
      </div>
    </motion.button>
  )
}

// ─── Interview Setup Screen ──────────────────────────────────
function InterviewSetup({ resumeData, candidateName, onStart }) {
  const [selectedPersona, setSelectedPersona] = useState('sarah')
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium')
  const [numQuestions, setNumQuestions] = useState(5)

  const resumeScore = resumeData?.coach_report?.current_score
    || resumeData?.resume_score?.total
    || resumeData?.score
    || null

  const handleStart = useCallback(() => {
    onStart({
      persona: selectedPersona,
      difficulty: selectedDifficulty,
      numQuestions,
    })
  }, [selectedPersona, selectedDifficulty, numQuestions, onStart])

  return (
    <motion.div
      style={pageContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <Sparkles style={{ width: '24px', height: '24px', color: '#8B5CF6' }} />
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#e2e8f0' }}>
            AI Video Interview Room
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '36px' }}>
          Conduct a dynamic voice-driven mock interview with our interactive virtual recruiters.
        </p>
      </div>

      {/* Main Grid: Interviewers + Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '20px', flex: 1 }}>
        {/* Interviewer Cards */}
        {Object.keys(PERSONAS).map(key => (
          <InterviewerCard
            key={key}
            persona={key}
            isSelected={selectedPersona === key}
            onSelect={setSelectedPersona}
          />
        ))}

        {/* Configuration Panel */}
        <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target style={{ width: '16px', height: '16px', color: '#8B5CF6' }} />
            Interview Configuration
          </h3>

          {/* Interview Type */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
              Interview Type
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}>
              <Video style={{ width: '14px', height: '14px', color: '#8B5CF6' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#A78BFA' }}>Video Interview</span>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
              Difficulty
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {DIFFICULTIES.map(d => (
                <motion.button
                  key={d.value}
                  onClick={() => setSelectedDifficulty(d.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: selectedDifficulty === d.value
                      ? `1px solid ${d.color}`
                      : '1px solid rgba(255,255,255,0.06)',
                    background: selectedDifficulty === d.value
                      ? `${d.color}18`
                      : 'rgba(255,255,255,0.03)',
                    color: selectedDifficulty === d.value ? d.color : '#94a3b8',
                    transition: 'all 0.2s',
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {d.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Number of Questions */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
              Questions
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[3, 5, 7, 10].map(n => (
                <motion.button
                  key={n}
                  onClick={() => setNumQuestions(n)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: numQuestions === n
                      ? '1px solid #8B5CF6'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: numQuestions === n
                      ? 'rgba(139,92,246,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    color: numQuestions === n ? '#A78BFA' : '#94a3b8',
                    transition: 'all 0.2s',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {n}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Duration Estimate */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
            <Clock style={{ width: '14px', height: '14px', color: '#64748b' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Est. Duration:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>
              {numQuestions * 3} min
            </span>
          </div>

          {/* Language */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
            <Globe style={{ width: '14px', height: '14px', color: '#64748b' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Language:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>English</span>
          </div>

          {/* Resume Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.15)',
          }}>
            <CheckCircle style={{ width: '16px', height: '16px', color: '#22c55e' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#22c55e' }}>Resume Analyzed</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {candidateName || 'Candidate'}
                {resumeScore ? ` • Score: ${resumeScore}/100` : ''}
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Start Button */}
          <motion.button
            onClick={handleStart}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${PERSONAS[selectedPersona].accentColor}dd, ${PERSONAS[selectedPersona].accentColor})`,
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${PERSONAS[selectedPersona].accentColor}33`,
              transition: 'all 0.2s',
            }}
            whileHover={{ scale: 1.02, boxShadow: `0 6px 30px ${PERSONAS[selectedPersona].accentColor}44` }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap style={{ width: '18px', height: '18px' }} />
            Start Interview
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page Component ─────────────────────────────────────
export default function VideoInterviewPage() {
  const { resumeData, candidateName } = useApp()
  
  // Page state: 'setup' | 'room'
  const [pageState, setPageState] = useState('setup')
  const [interviewConfig, setInterviewConfig] = useState(null)

  const handleStart = useCallback((config) => {
    setInterviewConfig(config)
    setPageState('room')
  }, [])

  const handleExit = useCallback(() => {
    setPageState('setup')
    setInterviewConfig(null)
  }, [])

  // ─── No Resume Guard ───────────────────────────────────
  if (!resumeData) {
    return <NoResumeScreen />
  }

  // ─── Interview Room ────────────────────────────────────
  if (pageState === 'room' && interviewConfig) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="room"
          style={{ height: '100%', width: '100%' }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          <VideoInterviewRoom
            persona={interviewConfig.persona}
            difficulty={interviewConfig.difficulty}
            numQuestions={interviewConfig.numQuestions}
            onExit={handleExit}
          />
        </motion.div>
      </AnimatePresence>
    )
  }

  // ─── Interview Setup ───────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="setup"
        style={{ height: '100%', width: '100%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <InterviewSetup
          resumeData={resumeData}
          candidateName={candidateName}
          onStart={handleStart}
        />
      </motion.div>
    </AnimatePresence>
  )
}

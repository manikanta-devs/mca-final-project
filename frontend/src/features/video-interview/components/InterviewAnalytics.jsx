/**
 * InterviewAnalytics.jsx
 * 
 * Right-side analytics panel showing real-time interview performance metrics.
 * Uses existing evaluation values whenever available.
 * Only shows placeholders ("—") when no live metric exists.
 * 
 * @component
 */
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Brain,
  Eye,
  Gauge,
  MessageSquare,
  Timer,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

// ─── Styles ──────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  headerIcon: {
    color: '#8B5CF6',
    width: '18px',
    height: '18px',
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  metricCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '12px',
  },
  metricRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  metricLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#94a3b8',
  },
  metricValue: {
    fontSize: '13px',
    fontWeight: '700',
    fontVariantNumeric: 'tabular-nums',
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  overallCard: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  overallGauge: {
    position: 'relative',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallValue: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#e2e8f0',
    fontVariantNumeric: 'tabular-nums',
  },
  overallLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  progressSection: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '12px',
  },
  naText: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
  },
}

// ─── Helper: Color from percentage ──────────────────────────
function getColor(value) {
  if (value === null || value === undefined) return '#64748b'
  if (value >= 80) return '#22c55e'
  if (value >= 60) return '#eab308'
  if (value >= 40) return '#f97316'
  return '#ef4444'
}

function getScoreLabel(value) {
  if (value === null || value === undefined) return '—'
  if (value >= 90) return 'Excellent'
  if (value >= 80) return 'Very Good'
  if (value >= 70) return 'Good'
  if (value >= 60) return 'Fair'
  if (value >= 40) return 'Needs Work'
  return 'Poor'
}

// ─── Progress Bar Sub-Component ─────────────────────────────
function MetricBar({ icon: Icon, label, value, tooltip }) {
  const isAvailable = value !== null && value !== undefined
  const color = getColor(value)

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricRow}>
        <span style={styles.metricLabel}>
          <Icon style={{ width: '14px', height: '14px', color }} />
          {label}
        </span>
        <span style={{ ...styles.metricValue, color }}>
          {isAvailable ? `${Math.round(value)}%` : '—'}
        </span>
      </div>
      <div style={styles.progressBarBg}>
        {isAvailable ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, value)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: '2px',
              background: `linear-gradient(90deg, ${color}88, ${color})`,
            }}
          />
        ) : (
          <div style={{ height: '100%', width: '100%', background: 'rgba(100,116,139,0.15)' }} />
        )}
      </div>
      {!isAvailable && tooltip && (
        <p style={{ ...styles.naText, marginTop: '4px', fontSize: '10px' }}>
          {tooltip}
        </p>
      )}
    </div>
  )
}

// ─── Circular Gauge SVG ─────────────────────────────────────
function CircularGauge({ value, size = 80 }) {
  const isAvailable = value !== null && value !== undefined
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = isAvailable
    ? circumference - (value / 100) * circumference
    : circumference
  const color = getColor(value)

  return (
    <div style={styles.overallGauge}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        {/* Value arc */}
        {isAvailable && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}
      </svg>
      <span style={styles.overallValue}>
        {isAvailable ? Math.round(value) : '—'}
      </span>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────
export default function InterviewAnalytics({
  // Real metrics from existing evaluation (backend scores)
  confidenceScore = null,       // from backend evaluation if available
  grammarScore = null,          // from Gemini evaluation if returned
  communicationScore = null,    // from backend evaluation if available
  
  // Live-calculated metrics
  speakingSpeedWPM = null,      // calculated from transcript word count / elapsed time
  fillerWordCount = 0,          // real-time count of "um", "uh", "like", "you know"
  totalWords = 0,               // total words spoken by candidate
  
  // Interview progress
  currentIndex = 0,
  totalQuestions = 5,
  elapsedTime = 0,
}) {
  // Filler word percentage (real metric): filler words as % of total words
  const fillerPct = totalWords > 10
    ? Math.min(100, Math.round((fillerWordCount / totalWords) * 100))
    : null

  // Speaking speed score: ideal is 120-160 WPM
  const speedScore = speakingSpeedWPM !== null
    ? Math.max(0, Math.min(100, 100 - Math.abs(speakingSpeedWPM - 140) * 1.5))
    : null

  // Overall score: average of AVAILABLE real scores only
  const availableScores = [
    confidenceScore,
    grammarScore,
    communicationScore,
    speedScore,
    fillerPct !== null ? Math.max(0, 100 - fillerPct * 5) : null, // inverse: fewer fillers = better
  ].filter(s => s !== null && s !== undefined)

  const overallScore = availableScores.length > 0
    ? Math.round(availableScores.reduce((a, b) => a + b, 0) / availableScores.length)
    : null

  const progressPct = totalQuestions > 0
    ? Math.round((currentIndex / totalQuestions) * 100)
    : 0

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div style={styles.header}>
        <Activity style={styles.headerIcon} />
        <span style={styles.headerTitle}>Live Analytics</span>
      </div>

      {/* Overall Score Gauge */}
      <motion.div
        style={styles.overallCard}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <CircularGauge value={overallScore} />
        <span style={{
          ...styles.overallLabel,
          color: getColor(overallScore),
        }}>
          {overallScore !== null ? getScoreLabel(overallScore) : 'Awaiting Data'}
        </span>
        <span style={{ fontSize: '10px', color: '#64748b' }}>Overall Score</span>
      </motion.div>

      {/* Individual Metrics */}
      <MetricBar
        icon={TrendingUp}
        label="Confidence"
        value={confidenceScore}
        tooltip="Available after evaluation"
      />
      <MetricBar
        icon={Eye}
        label="Eye Contact"
        value={null}
        tooltip="Not available — requires camera analysis"
      />
      <MetricBar
        icon={Gauge}
        label="Speaking Speed"
        value={speedScore}
        tooltip={speakingSpeedWPM !== null ? `${Math.round(speakingSpeedWPM)} WPM` : 'Start speaking to measure'}
      />
      <MetricBar
        icon={Brain}
        label="Grammar"
        value={grammarScore}
        tooltip="Available after evaluation"
      />
      <MetricBar
        icon={MessageSquare}
        label="Communication"
        value={communicationScore}
        tooltip="Available after evaluation"
      />
      <MetricBar
        icon={AlertCircle}
        label="Filler Words"
        value={fillerPct !== null ? Math.max(0, 100 - fillerPct * 5) : null}
        tooltip={fillerWordCount > 0 ? `${fillerWordCount} filler words detected` : 'Tracking "um", "uh", "like"...'}
      />

      {/* Interview Progress */}
      <div style={styles.progressSection}>
        <div style={styles.metricRow}>
          <span style={styles.metricLabel}>
            <Timer style={{ width: '14px', height: '14px', color: '#8B5CF6' }} />
            Interview Progress
          </span>
          <span style={{ ...styles.metricValue, color: '#8B5CF6' }}>
            {currentIndex} / {totalQuestions}
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #8B5CF688, #8B5CF6)',
            }}
          />
        </div>
      </div>
    </motion.div>
  )
}

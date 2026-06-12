import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BookOpen, CheckCircle, TrendingUp } from 'lucide-react'

const STUDY_RESOURCES = {
  'Python': 'Practice on LeetCode, review Python docs for advanced patterns',
  'JavaScript': 'Study async patterns, closures, and prototype chain',
  'React': 'Build small projects, review React docs on hooks and performance',
  'System Design': 'Study Grokking System Design, practice diagramming',
  'SQL': 'Practice on HackerRank SQL, review joins, window functions',
  'Docker': 'Build multi-container apps, study Docker networking',
  'AWS': 'Use AWS Free Tier, study Solutions Architect Associate',
  'Data Structures': 'Practice daily on LeetCode/HackerRank, study trees and graphs',
  'Algorithms': 'Focus on sorting, searching, dynamic programming',
  'Architecture': 'Study SOLID principles, read Clean Architecture',
  'API Design': 'Study REST/GraphQL best practices, build a mock API',
  'Security': 'Review OWASP Top 10, study auth patterns',
  'Leadership': 'Read The Manager\'s Path, practice STAR storytelling',
  'Communication': 'Practice structured responses, record yourself speaking',
  'default': 'Review fundamentals and practice with mock interviews',
}

function getResourceForTopic(topic) {
  const key = Object.keys(STUDY_RESOURCES).find(k =>
    topic.toLowerCase().includes(k.toLowerCase())
  )
  return STUDY_RESOURCES[key] || STUDY_RESOURCES.default
}

export default function SkillGapReport({ answers = [] }) {
  // Build topic scores from answers
  const topicScores = {}
  answers.forEach(ans => {
    const topic = ans.evaluation?.topic || ans.question?.category || 'General'
    if (!topicScores[topic]) {
      topicScores[topic] = { total: 0, count: 0, scores: [] }
    }
    const score = ans.evaluation?.overall_score || 0
    topicScores[topic].total += score
    topicScores[topic].count += 1
    topicScores[topic].scores.push(score)
  })

  const topics = Object.entries(topicScores)
    .map(([topic, data]) => ({
      topic,
      average: Math.round(data.total / data.count),
      count: data.count,
      scores: data.scores,
      resource: getResourceForTopic(topic),
    }))
    .sort((a, b) => a.average - b.average)

  const weakTopics = topics.filter(t => t.average < 70)
  const strongTopics = topics.filter(t => t.average >= 70)

  if (topics.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyan-500" />
        Skill Gap Analysis
      </h3>

      {/* Priority Study List */}
      {weakTopics.length > 0 && (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
          <p className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Priority Topics ({weakTopics.length})
          </p>
          <div className="space-y-3">
            {weakTopics.map((t, i) => (
              <motion.div
                key={t.topic}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{t.topic}</span>
                  <span className={`text-sm font-black ${t.average >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {t.average}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${t.average >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${t.average}%` }}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-400">{t.resource}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Strong Topics */}
      {strongTopics.length > 0 && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Strong Topics ({strongTopics.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {strongTopics.map(t => (
              <span key={t.topic} className="px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30 text-xs font-semibold text-green-300">
                {t.topic} — {t.average}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full Topic Breakdown Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="text-left p-3 text-xs font-semibold text-gray-400 uppercase">Topic</th>
              <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase">Qs</th>
              <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase">Avg</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {topics.map(t => (
              <tr key={t.topic} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-3 text-white font-medium">{t.topic}</td>
                <td className="p-3 text-center text-gray-400">{t.count}</td>
                <td className="p-3 text-center">
                  <span className={`font-bold ${t.average >= 70 ? 'text-green-400' : t.average >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {t.average}%
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    t.average >= 70 ? 'bg-green-500/15 text-green-400' :
                    t.average >= 50 ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {t.average >= 70 ? 'Strong' : t.average >= 50 ? 'Review' : 'Study'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

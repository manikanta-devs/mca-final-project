/**
 * Utility functions for interview question handling.
 * Extracted from InterviewPage.jsx.
 */

/**
 * Normalises a raw question object from the API into a consistent shape.
 */
export function normalizeQuestion(question, index) {
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

/**
 * Builds the ordered question list for a corporate-style interview
 * from the AI-generated question set.
 */
export function buildCorporateInterviewQuestions({ generatedQuestions = [] }) {
  return (generatedQuestions || []).map((q, idx) => normalizeQuestion(q, idx))
}

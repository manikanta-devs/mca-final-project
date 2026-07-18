/**
 * confidenceScore.js
 *
 * Combines the real-time signals produced by:
 *  - MediaPipe Face Landmarker (eye contact %, stress blendshapes)
 *  - faster-whisper transcription (words per minute, filler word count)
 *  - Web Audio AnalyserNode (pitch/volume variance)
 *
 * into a single 0-100 confidence score that drives the existing
 * ConfidenceDial / gauge component. Pure function, no side effects,
 * so it's easy to unit test independently of the media pipeline.
 */

// Tune these if the score feels too harsh/lenient once you see real sessions.
const WEIGHTS = {
  eyeContact: 0.35,
  stress: 0.20,       // lower stress -> higher confidence, inverted below
  paceStability: 0.25,
  fillerWords: 0.20,  // fewer fillers -> higher confidence, inverted below
};

const IDEAL_WPM = 140; // conversational average; deviation lowers paceStability
const WPM_TOLERANCE = 40; // +/- range still considered "stable"

/**
 * @param {number} eyeContactPct        0-100, from MediaPipe gaze angle
 * @param {number} stressBlendshapeAvg  0-1, average of browDown/lipPress/etc blendshapes
 * @param {number} currentWpm           words per minute over the last rolling window
 * @param {number} fillerWordsPerMin    filler word occurrences per minute of speech
 * @returns {{score: number, breakdown: object}}
 */
export function computeConfidenceScore({
  eyeContactPct = 0,
  stressBlendshapeAvg = 0,
  currentWpm = 0,
  fillerWordsPerMin = 0,
} = {}) {
  const eyeContactScore = clamp(eyeContactPct, 0, 100);

  const stressScore = clamp(100 - stressBlendshapeAvg * 100, 0, 100);

  const wpmDeviation = Math.abs(currentWpm - IDEAL_WPM);
  const paceStabilityScore = clamp(
    100 - (wpmDeviation / WPM_TOLERANCE) * 50,
    0,
    100
  );

  // 0 fillers/min = 100, 6+ fillers/min = 0, linear in between
  const fillerScore = clamp(100 - (fillerWordsPerMin / 6) * 100, 0, 100);

  const score =
    eyeContactScore * WEIGHTS.eyeContact +
    stressScore * WEIGHTS.stress +
    paceStabilityScore * WEIGHTS.paceStability +
    fillerScore * WEIGHTS.fillerWords;

  return {
    score: Math.round(clamp(score, 0, 100)),
    breakdown: {
      eyeContactScore: Math.round(eyeContactScore),
      stressScore: Math.round(stressScore),
      paceStabilityScore: Math.round(paceStabilityScore),
      fillerScore: Math.round(fillerScore),
    },
  };
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

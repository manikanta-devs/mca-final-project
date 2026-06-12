const EMOTION_LABELS = {
  focused: 'Focused',
  calm: 'Calm',
  energetic: 'Energetic',
  nervous: 'Nervous',
  disengaged: 'Disengaged',
  uncertain: 'Uncertain',
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function createEmotionSnapshot(history = []) {
  if (!history.length) {
    return {
      primary_emotion: 'uncertain',
      emotion_label: EMOTION_LABELS.uncertain,
      confidence: 0,
      engagement_score: 0,
      eye_contact_score: 0,
      movement_level: 0,
      lighting_score: 0,
      sample_count: 0,
      summary: 'Camera emotion signals were not captured.',
    }
  }

  const recent = history.slice(-24)
  const brightness = average(recent.map(sample => sample.brightness))
  const motion = average(recent.map(sample => sample.motion))
  const centerBias = average(recent.map(sample => sample.centerBias))
  const lightingScore = clampScore(100 - Math.abs(brightness - 118) * 0.65)
  const eyeContactScore = clampScore(centerBias * 100)
  const movementLevel = clampScore(motion * 100)
  const engagementScore = clampScore(eyeContactScore * 0.46 + lightingScore * 0.24 + (100 - movementLevel) * 0.3)

  let primaryEmotion = 'focused'
  if (lightingScore < 35 || eyeContactScore < 35) primaryEmotion = 'disengaged'
  else if (movementLevel > 62) primaryEmotion = 'nervous'
  else if (movementLevel > 38 && eyeContactScore > 55) primaryEmotion = 'energetic'
  else if (engagementScore > 74 && movementLevel < 24) primaryEmotion = 'calm'

  return {
    primary_emotion: primaryEmotion,
    emotion_label: EMOTION_LABELS[primaryEmotion],
    confidence: clampScore((lightingScore + eyeContactScore) / 2),
    engagement_score: engagementScore,
    eye_contact_score: eyeContactScore,
    movement_level: movementLevel,
    lighting_score: lightingScore,
    sample_count: history.length,
    summary: `${EMOTION_LABELS[primaryEmotion]} presence with ${engagementScore}/100 engagement.`,
  }
}

export function startEmotionSampler({ video, onUpdate, intervalMs = 900 }) {
  if (!video) return () => {}

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  let previousFrame = null
  let stopped = false
  const history = []

  const sample = () => {
    if (stopped || !context || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return

    canvas.width = 96
    canvas.height = 54
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frame = context.getImageData(0, 0, canvas.width, canvas.height).data

    let brightnessSum = 0
    let centerBrightnessSum = 0
    let centerPixels = 0
    let motionSum = 0
    let motionPixels = 0

    for (let index = 0; index < frame.length; index += 4) {
      const pixel = index / 4
      const x = pixel % canvas.width
      const y = Math.floor(pixel / canvas.width)
      const brightness = (frame[index] + frame[index + 1] + frame[index + 2]) / 3
      brightnessSum += brightness

      const inCenter = x > canvas.width * 0.28 && x < canvas.width * 0.72 && y > canvas.height * 0.18 && y < canvas.height * 0.82
      if (inCenter) {
        centerBrightnessSum += brightness
        centerPixels += 1
      }

      if (previousFrame) {
        const previousBrightness = (previousFrame[index] + previousFrame[index + 1] + previousFrame[index + 2]) / 3
        motionSum += Math.abs(brightness - previousBrightness)
        motionPixels += 1
      }
    }

    const brightness = brightnessSum / (frame.length / 4)
    const centerBrightness = centerPixels ? centerBrightnessSum / centerPixels : brightness
    const centerBias = Math.max(0, Math.min(1, centerBrightness / Math.max(brightness, 1)))
    const motion = previousFrame ? Math.min(1, motionSum / Math.max(motionPixels, 1) / 28) : 0

    previousFrame = new Uint8ClampedArray(frame)
    history.push({ brightness, centerBias, motion, captured_at: Date.now() })
    if (history.length > 80) history.shift()
    onUpdate?.(createEmotionSnapshot(history))
  }

  const timer = window.setInterval(sample, intervalMs)
  sample()

  return () => {
    stopped = true
    window.clearInterval(timer)
  }
}

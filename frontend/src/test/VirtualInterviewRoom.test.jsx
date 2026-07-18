import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import VirtualInterviewRoom from '../components/VirtualInterviewRoom';
import DOMPurify from 'dompurify';

// Mock custom hooks
vi.mock('../hooks/useSoundDesign', () => ({
  default: () => ({
    playJoinChime: vi.fn(),
    playTyping: vi.fn(),
    stopTyping: vi.fn(),
    playEndChime: vi.fn(),
    startAmbience: vi.fn(),
    stopAmbience: vi.fn(),
    playToggleMic: vi.fn(),
    playToggleVideo: vi.fn(),
    playClick: vi.fn(),
  }),
}));

vi.mock('../hooks/useInterviewStageEngine', () => ({
  default: () => ({
    subStage: 'idle',
    currentClip: 'intro.mp4',
    micOpen: false,
    isGeminiThinking: false,
    currentQuestion: { text: 'Test question' },
    conversationHistory: [],
    geminiQuestionIdx: 0,
    onVideoEnded: vi.fn(),
    onIdleEnded: vi.fn(),
    onSilenceDetected: vi.fn(),
    onGeminiTTSEnded: vi.fn(),
    dequeueGeminiQuestion: vi.fn(),
    enqueueGeminiQuestion: vi.fn(),
    setGeminiThinking: vi.fn(),
    startInterview: vi.fn(),
    transcriptBufferRef: { current: '' },
  }),
  HR_CLIPS: {},
}));

vi.mock('../hooks/useBackgroundAnalysis', () => ({
  default: () => ({
    analyzeAndPrefetch: vi.fn(),
  }),
}));

vi.mock('../components/HRVideoPlayer', () => ({
  default: () => <div data-testid="mock-hr-video-player">HR Video Player</div>,
}));

// Mock window.fetch for network quality check
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
  })
);

describe('Accessibility controls', () => {
  test('mic button has an aria-label', () => {
    const onMicToggle = vi.fn();
    render(<VirtualInterviewRoom micEnabled={true} onMicToggle={onMicToggle} />);
    const micButton = screen.getByLabelText(/mute microphone|unmute microphone/i);
    expect(micButton).toBeInTheDocument();
  });

  test('camera button has an aria-label', () => {
    const onCameraToggle = vi.fn();
    render(<VirtualInterviewRoom cameraEnabled={true} onCameraToggle={onCameraToggle} />);
    const cameraButton = screen.getByLabelText(/turn off camera|turn on camera/i);
    expect(cameraButton).toBeInTheDocument();
  });

  test('quit button has an aria-label', () => {
    render(<VirtualInterviewRoom />);
    expect(screen.getByLabelText(/end interview session/i)).toBeInTheDocument();
  });

  test('pressing "m" toggles the microphone', () => {
    const onMicToggle = vi.fn();
    render(<VirtualInterviewRoom micEnabled={true} onMicToggle={onMicToggle} />);
    
    fireEvent.keyDown(window, { key: 'm' });
    expect(onMicToggle).toHaveBeenCalled();
  });

  test('keyboard shortcuts are ignored while typing in a text field', () => {
    const onMicToggle = vi.fn();
    render(
      <div>
        <input type="text" data-testid="test-input" />
        <VirtualInterviewRoom micEnabled={true} onMicToggle={onMicToggle} />
      </div>
    );
    const input = screen.getByTestId('test-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'm' });
    expect(onMicToggle).not.toHaveBeenCalled();
  });
});

describe('Responsive layout', () => {
  test('container stacks vertically on mobile viewport', () => {
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<VirtualInterviewRoom />);
    const container = screen.getByTestId('interview-room-container');
    expect(container.className).toMatch(/flex-col/);
  });
});

describe('DOMPurify sanitization', () => {
  test('script tags in AI recommendations are stripped before rendering', () => {
    const maliciousText = '<script>window.hacked = true</script>**bold text**';
    const sanitized = DOMPurify.sanitize(maliciousText);
    render(<div dangerouslySetInnerHTML={{ __html: sanitized }} />);
    expect(document.body.innerHTML).not.toContain('<script>');
    expect(window.hacked).toBeUndefined();
  });
});

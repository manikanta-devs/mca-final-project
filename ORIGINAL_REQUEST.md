# Original User Request

## Initial Request — 2026-07-16T14:08:14Z

Perform a brutal, honest, detailed, and specific QA and product review of the NexHire interview platform (Flask + React/Vite + SQLite + Gemini API) acting as a senior QA engineer and product reviewer.

Working directory: C:\anime\ai-interview-system

## Requirements

### R1. Onboarding, First Impressions & Content Quality
- Evaluate signup/login flow, resume upload, load times, empty states, and first-time user confusion.
- Assess the relevance, repetitiveness, and generic nature of Gemini-generated questions.

### R2. Core Interview Flow, Avatar & Captions
- Evaluate the question generation quality, "broadcast studio" UI, 3D avatar (rendering, lip-sync, latency, glitches), live caption accuracy, and confidence scoring believability.

### R3. Edge Cases, Error Handling & Security
- Test bad resume uploads, blocked camera/mic permissions, mid-interview network drop simulations, browser navigation/refresh, empty/long answers.
- Review security issues (client-side tokens/keys exposed, IDOR risks on reports, auth bypass, CSRF/XSS).

### R4. Performance, Mobile/Responsive, Accessibility & Polish
- Check page load speeds, 3D lag, memory leaks, slow connections.
- Test responsive breakpoints for the broadcast studio UI.
- Verify accessibility (keyboard navigation, screen reader support, color contrast).
- Identify UX inconsistencies (spacing, mismatched fonts, dead-ends).

## Acceptance Criteria

### Comprehensive Beta Test Report
- [ ] Provide a structured findings report in the workspace containing `🔴 Must-Fix`, `🟠 Should-Fix`, `🟡 Polish`, and `🟢 What's Working Well`.
- [ ] Every finding must document: "What I did", "What happened vs what should happen", "Why it matters", and "A concrete fix/direction".
- [ ] End the report with a single paragraph identifying the top 3 critical things to fix before submission.

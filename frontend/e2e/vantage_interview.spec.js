import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const screenshotDir = path.resolve('../docs/test-reports/screenshots/vantage');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test('Take Vantage Emma Vance Session Screenshots', async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1280, height: 800 });

  // 1. Register a test user
  const apiContext = page.request;
  const username = `vantage_user_${Date.now().toString().slice(-4)}`;
  
  await apiContext.post('http://localhost:5000/api/auth/register', {
    data: { username, password: 'password123' }
  }).catch(() => {});

  const loginRes = await apiContext.post('http://localhost:5000/api/auth/login', {
    data: { username, password: 'password123' }
  });
  const { token } = await loginRes.json();

  await page.goto('/auth');
  await page.evaluate(({ token, username }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
  }, { token, username });

  // 2. Go to Mock Interview Page
  await page.goto('/dashboard/interview');
  await page.waitForTimeout(1000);

  // Configure setup: Select Video Interview mode
  const videoBtn = page.locator('button:has-text("Video Interview")').first();
  await videoBtn.click();
  await page.waitForTimeout(500);

  // Configure setup: Select Emma (labeled "Emma" / "AI Recruiter")
  const emmaCard = page.locator('button:has-text("Emma")');
  await emmaCard.click();
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: path.join(screenshotDir, '01_setup_emma.png') });

  // Start Video Interview button
  const startBtn = page.locator('button:has-text("Start Video Interview")');
  await startBtn.click();

  // Wait for Lobby "Begin Mock Session" button to appear (Gemini question generation can take up to 25s) and click it
  const beginMockBtn = page.locator('button:has-text("Begin Mock Session")');
  await beginMockBtn.waitFor({ state: 'visible', timeout: 60000 });
  await beginMockBtn.click();
  await page.waitForTimeout(2000);

  // Walk through lobby simulation buttons if they appear
  for (const stepLabel of ["Resume Analyzed", "Enter Room", "Greet HR", "Hand Resume", "Begin", "Begin Real Interview"]) {
    const btn = page.locator(`button:has-text("${stepLabel}")`);
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(400);
    }
  }

  // Gaze calibrating screenshot
  await page.screenshot({ path: path.join(screenshotDir, '02_interview_started.png') });

  // Wait for Emma Vance to load in the virtual room
  await expect(page.locator('text=Emma Vance').first()).toBeVisible({ timeout: 35000 });
  await page.screenshot({ path: path.join(screenshotDir, '03_first_question.png') });

  // Wait for Emma to finish speaking and candidate's turn to start (mic and input open)
  // Headless browser speech synthesis fallback timeout is ~25s, so we wait up to 55s
  await expect(page.locator('text=Recording your response').first()).toBeVisible({ timeout: 55000 });

  // Wait for fallback input to become visible and fill it
  const inputEl = page.locator('input[placeholder="Type response here if voice recognition fails..."]');
  await inputEl.waitFor({ state: 'visible', timeout: 15000 });
  await inputEl.fill('Hello Emma, I am a senior software engineer. I build high-performance React applications, optimize state management, and coordinate system architectures with Node backends.');
  await page.screenshot({ path: path.join(screenshotDir, '04_typed_response.png') });
  await page.click('button:has-text("Send")');

  // Wait for evaluation processing to complete and Emma to start asking Question 2 (up to 85s due to Gemini API response latency)
  await expect(page.locator('text=Emma is speaking').first()).toBeVisible({ timeout: 85000 });
  await page.screenshot({ path: path.join(screenshotDir, '05_sidebar_evaluating.png') });

  // Finish session by clicking End button
  const endCallBtn = page.locator('button:has-text("End")').first();
  await endCallBtn.click();

  // Wait for results redirect
  await expect(page).toHaveURL(/\/dashboard\/results/, { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '06_results_dossier.png') });
});

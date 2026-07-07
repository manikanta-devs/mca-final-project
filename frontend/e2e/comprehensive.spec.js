import { test, expect } from '@playwright/test';

test('AI Interview System Comprehensive E2E Test', async ({ page }) => {
  // 1. Navigate to Landing Page
  await page.goto('/');

  // Register and Login to get a real signed JWT
  const apiContext = page.request;
  const ts = Date.now();
  const username = `janedoe_${ts}`;
  const password = 'TestPassword123!';

  await apiContext.post('http://localhost:5000/api/auth/register', {
    data: { username, password }
  });

  const loginRes = await apiContext.post('http://localhost:5000/api/auth/login', {
    data: { username, password }
  });
  const { token } = await loginRes.json();

  // Set signed token in localStorage
  await page.evaluate(({ token, username }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
  }, { token, username });

  await expect(page.locator('h1')).toContainText('AstraPrep');

  // Click "Start Interview" or "Open Dashboard" to navigate to dashboard overview
  await page.locator('text=Open Dashboard').or(page.locator('text=Start Interview')).first().click();
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Verify Resume Page
  await page.click('text=Resume Analysis');
  await expect(page).toHaveURL(/\/dashboard\/resume/);
  await page.waitForTimeout(1000); // let page animation settle

  // Fill candidate name
  await page.fill('input[placeholder="Enter your name (optional)"]', 'Jane Doe');

  // Switch tab to Paste Text
  await page.click('text=Paste Text');

  // Input resume content (must be >= 50 characters to enable button)
  await page.fill(
    'textarea[placeholder="Paste your resume text here..."]',
    'Jane Doe is a Software Engineer with 5 years of experience in JavaScript, React, Tailwind CSS, Node.js, and Python. She builds scalable, premium user interfaces and optimizes web application load times.'
  );

  // Trigger analysis
  await page.click('button:has-text("Analyze Text")');

  // Wait for resume analysis to complete
  await expect(page.getByRole('heading', { name: 'Resume Score', exact: true })).toBeVisible({ timeout: 45000 });

  // Paste a job description to test 2027 Job Match (must be >= 80 characters to enable button)
  await page.fill(
    'textarea[placeholder="Paste a target job description here to compare against your resume..."]',
    'Looking for a Frontend Web Developer with professional experience in React, JavaScript, HTML, CSS, and Tailwind CSS. The candidate will build high fidelity UI components, optimize bundle sizes, and collaborate with product teams.'
  );

  // Click Analyze Fit
  await page.click('button:has-text("Analyze Fit")');

  // Wait for job match analysis to complete
  await expect(page.getByRole('heading', { name: 'Matched Skills', exact: true })).toBeVisible({ timeout: 30000 });

  // 3. Verify Quiz Practice Page
  await page.click('text=Quiz Practice');
  await expect(page).toHaveURL(/\/dashboard\/quiz/);
  await page.waitForTimeout(1000); // let page animation settle

  // Click Start Practice Quiz
  await page.click('button:has-text("Start quiz")');

  // Wait for the quiz screen to load
  await expect(page.locator('text=Question 1 of')).toBeVisible({ timeout: 35000 });

  // Select Option 1 and submit answers for the 5 questions
  for (let i = 1; i <= 5; i++) {
    // Select Option 1
    await page.locator('.space-y-3 button').first().click();
    await page.click('button:has-text("Submit answer")');
    await page.waitForTimeout(500); // short wait for state update
    const nextBtn = page.locator('button:has-text("Next Question"), button:has-text("Finish Drill")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Quiz completion should load
  await expect(page.locator('text=Quiz completed')).toBeVisible({ timeout: 35000 });
  await page.click('button:has-text("Take another quiz")');

  // 4. Verify Coach Page
  await page.click('text=Coach');
  await expect(page).toHaveURL(/\/dashboard\/coach/);
  await page.waitForTimeout(1000); // let page animation settle
  await expect(page.locator('text=Interactive Guideline Center')).toBeVisible({ timeout: 10000 });

  // 5. Verify Analytics Page
  await page.click('text=Analytics');
  await expect(page).toHaveURL(/\/dashboard\/analytics/);
  await page.waitForTimeout(1000); // let page animation settle
  await expect(page.getByRole('heading', { name: 'Performance Analytics' }).first()).toBeVisible({ timeout: 10000 });

  // 6. Test Theme Toggle (Dark/Light mode)
  // Default is light mode
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  // Switch to Dark Mode
  await page.click('button:has-text("Dark Mode")');
  await expect(page.locator('html')).toHaveClass(/dark/);

  // Switch back to Light Mode
  await page.click('button:has-text("Light Mode")');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

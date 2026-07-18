import { test, expect } from '@playwright/test';

test('AI Interview Full Flow Test', async ({ page }) => {
  test.setTimeout(150000);
  // 1. Navigate to Landing Page
  await page.goto('/');

  // Register and Login to get a real signed JWT
  const apiContext = page.request;
  const ts = Date.now();
  const username = `candidate_${ts}`;
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

  // Verify Landing Page loaded
  await expect(page.locator('h1')).toContainText(/AstraPrep|TalentForge/);

  // 2. Click "Start Interview" to navigate to Interview Page
  await page.click('text=Start Interview');

  // Verify we are on the Interview Page Setup
  await expect(page).toHaveURL(/\/dashboard\/interview/);
  
  // Use specific heading locator to avoid strict mode violations during transition
  await expect(page.getByRole('heading', { name: 'Configure Your Interview' })).toBeVisible();

  // 3. Configure the Interview
  // Select Target Role: Product Manager (to test custom role selection)
  await page.click('button:has-text("Product Manager")');

  // Select Difficulty Level: Easy
  await page.click('button:has-text("Fundamental concepts")');

  // Select Interview Format: Text
  await page.click('button:has-text("Typed answers with AI scoring")');

  // Adjust number of questions to 3
  const slider = page.locator('input[type="range"]');
  await slider.fill('3');

  // Wait a moment for react state updates
  await page.waitForTimeout(500);

  // 4. Start the Interview (generate questions)
  await page.click('button:has-text("Start Interview")');

  // Walk through WalkIn office simulation steps
  for (const stepLabel of ["Resume Analyzed", "Enter Room", "Greet HR", "Hand Resume", "Begin", "Begin Real Interview"]) {
    await page.click(`button:has-text("${stepLabel}")`);
    await page.waitForTimeout(300);
  }

  // Wait for the interview phase to transition (Wait for "Question 1" to be visible)
  await expect(page.locator('text=Question 1')).toBeVisible({ timeout: 25000 });

  // Get total questions dynamically from the page text
  const textContent = await page.locator('p.text-xs.uppercase.tracking-\\[0\\.2em\\]').first().innerText();
  const match = textContent.match(/of\s+(\d+)/i);
  const total = match ? parseInt(match[1], 10) : 23;

  // Loop through all questions dynamically
  for (let i = 1; i <= total; i++) {
    // Check if the current question text is visible
    await expect(page.locator(`text=Question ${i}`)).toBeVisible();

    // Type the answer
    await page.fill('textarea[placeholder="Type your answer here..."]', `This is my comprehensive answer for mock question number ${i}. I will structure my approach, handle product trade-offs, and outline metrics to track performance.`);

    // Click Submit Answer
    await page.click('button:has-text("Submit Answer")');

    // Wait for the evaluation to finish and display
    await expect(page.locator('text=Evaluation')).toBeVisible({ timeout: 35000 });

    // Click Next or Results
    if (i < total) {
      await page.click('button:has-text("Next")');
    } else {
      await page.click('button:has-text("Results")');
    }
  }

  // 5. Verify results page loads
  await expect(page).toHaveURL(/\/dashboard\/results/);
  // Expect to see Candidate name (default is Candidate) on the results header card
  await expect(page.getByRole('heading', { name: 'Candidate' })).toBeVisible({ timeout: 10000 });
});

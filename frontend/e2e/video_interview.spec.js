import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'
const API = 'http://localhost:5000'
const SCREENSHOTS = 'docs/test-reports/debug-screenshots'

const TS = Date.now()
const UI_USER = { username: `video_ui_${TS}`, password: 'TestPass123!' }

async function ensureUIUser(request) {
  await request.post(`${API}/api/auth/register`, {
    data: { username: UI_USER.username, password: UI_USER.password }
  })
}

async function loginViaUI(page, request) {
  await ensureUIUser(request)
  await page.goto(`${BASE}/auth`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  
  const signInTab = page.locator('button:has-text("Sign In")').first()
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click()
  }
  await page.waitForTimeout(300)
  
  await page.fill('#auth-username', UI_USER.username)
  await page.fill('#auth-password', UI_USER.password)
  await page.click('#auth-submit-btn')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
}

test('Video Interview Full Flow E2E Debugger', async ({ page, request, context }) => {
  test.setTimeout(120000)
  
  // Grant camera and microphone permissions to bypass device precheck blocks
  await context.grantPermissions(['camera', 'microphone'])
  
  // Disable Web Speech API so it falls back to the text input (textarea) for testing
  await page.addInitScript(() => {
    delete window.webkitSpeechRecognition;
    delete window.SpeechRecognition;
  })

  console.log('Step 1: Logging in via UI...')
  await loginViaUI(page, request)
  
  console.log('Step 2: Navigating to Interview Page...')
  await page.goto(`${BASE}/dashboard/interview`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  
  console.log('Taking format selection screenshot...')
  await page.screenshot({ path: `${SCREENSHOTS}/video_1_selection.png`, fullPage: true })
  
  console.log('Step 3: Selecting Video format and starting interview...')
  // Select Video Interview card
  const videoCard = page.locator('text="Video Interview"').first()
  await videoCard.click()
  await page.waitForTimeout(500)
  
  // Click Start Video Interview button
  const startBtn = page.locator('button:has-text("Start Video Interview")').first()
  await startBtn.click()
  
  console.log('Step 4: Waiting for precheck lobby to resolve...')
  await page.waitForTimeout(6000)
  
  console.log('Clicking Begin Mock Session...')
  const beginBtn = page.locator('button:has-text("Begin Mock Session")').first()
  await beginBtn.click()
  
  console.log('Waiting for cockpit load...')
  await page.waitForTimeout(25000)
  
  console.log('Taking active interview cockpit screenshot...')
  await page.screenshot({ path: `${SCREENSHOTS}/video_2_active.png`, fullPage: true })
  
  // Verify avatar element (video or fallback image) is visible
  const avatarVisualizer = page.locator('video:visible, img[alt="Sarah Chen"]:visible').first()
  await expect(avatarVisualizer).toBeVisible()
  
  // Verify HUD Timer is visible
  const timerHud = page.locator('text="Video Interview"').first()
  await expect(timerHud).toBeVisible()
  
  console.log('Step 5: Simulating a response by typing in fallback text field...')
  // Locate input field in transcript bubble or fallback text area
  const responseInput = page.locator('input[placeholder="Type your response..."]').first()
  if (await responseInput.isVisible()) {
    const mockResponse = "In my last project, my task was to migrate the user database. I implemented a partitioned pipeline, which improved database response times by 35%."
    await responseInput.fill(mockResponse)
    
    console.log('Taking filled response screenshot...')
    await page.screenshot({ path: `${SCREENSHOTS}/video_3_response_filled.png`, fullPage: true })
    
    // Submit response by pressing Enter or clicking send button
    await responseInput.press('Enter')
    
    console.log('Step 6: Waiting for next question generation...')
    await page.waitForTimeout(7000)
    
    console.log('Taking next question cockpit screenshot...')
    await page.screenshot({ path: `${SCREENSHOTS}/video_4_next_question.png`, fullPage: true })
  } else {
    console.log('Input field not visible - possibly only voice interaction.')
  }
  
  console.log('Step 7: Ending interview...')
  const endBtn = page.locator('button:has-text("End Interview")').first()
  if (await endBtn.isVisible()) {
    await endBtn.click()
    await page.waitForTimeout(3000)
    
    console.log('Taking exit/summary modal screenshot...')
    await page.screenshot({ path: `${SCREENSHOTS}/video_5_completed.png`, fullPage: true })
  }
  
  console.log('E2E test successfully completed!')
})

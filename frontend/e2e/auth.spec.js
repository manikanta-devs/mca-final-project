import { test, expect } from '@playwright/test';

test('Authentication Flow Test (Register, Login, Redirect, Logout)', async ({ page }) => {
  // 1. Attempt to navigate directly to dashboard
  await page.goto('/dashboard');

  // Expect redirection to /auth
  await expect(page).toHaveURL(/\/auth/);
  await expect(page.locator('h1')).toContainText(/AstraPrep AI|TalentForge AI/);
  await expect(page.getByRole('button', { name: 'Sign In', exact: true }).first()).toBeVisible();

  // Generate a unique username
  const uniqueUsername = `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const password = 'securepassword123';

  // 2. Click "Create Account" tab
  await page.click('text=Create Account');

  // Fill in registration form
  await page.fill('#auth-username', uniqueUsername);
  await page.fill('#auth-password', password);
  await page.fill('#auth-confirm-password', password);

  // Click Register
  await page.click('#auth-submit-btn');

  // After registration, wait for the form to transition to the Login mode
  await expect(page.locator('#auth-submit-btn')).toContainText('Sign In');

  // 3. Fill in login form
  await page.fill('#auth-username', uniqueUsername);
  await page.fill('#auth-password', password);

  // Click Sign In
  await page.click('#auth-submit-btn');

  // Should navigate to /dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // Sidebar should be visible with Logout button
  await expect(page.locator('text=Logout')).toBeVisible();

  // 4. Click Logout
  await page.click('text=Logout');

  // Should redirect to Landing Page (/)
  await expect(page).toHaveURL(/\/$/);

  // localStorage should be cleared of token
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeNull();
});

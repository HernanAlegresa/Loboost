---
name: qa
description: Layer 2 E2E testing protocol for LoBoost — Playwright tests for critical golden paths. Manual use only. Run after done when you want to validate critical flows before a release or major merge.
---

# QA — E2E Testing Protocol (Playwright)

## When to use

**Manual only.** This skill is never automatically suggested. Invoke it when you explicitly want E2E validation:
- After a change that touches auth, session flows, or coach/client navigation
- Before a release or major merge
- When a bug was reported on a golden path and you want to confirm it's fixed

This skill does not replace `done`. Run `done` first (Layer 1 static checks), then `qa` when E2E coverage is needed.

---

## First-time setup

If `playwright.config.ts` doesn't exist yet, run:

```bash
npm init playwright@latest -- --quiet --browser=chromium --no-examples --lang=ts
```

Then replace the generated config with the one below.

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },   // 390×844, isMobile: true
      dependencies: ['setup'],
    },
  ],
})
```

### File structure

```
e2e/
  .auth/
    coach.json        # saved auth state — gitignored
    client.json
  setup/
    auth.setup.ts     # one-time login per role
  auth.spec.ts
  coach.spec.ts
  training.spec.ts
playwright.config.ts
.env.local            # E2E credentials — never commit
```

Add to `.gitignore`:
```
e2e/.auth/
playwright-report/
test-results/
```

### Auth setup

Authenticates once per role and saves browser storage state. All other tests load the state — no repeated logins.

```ts
// e2e/setup/auth.setup.ts
import { test as setup } from '@playwright/test'
import path from 'path'

const coachAuthFile = path.join(__dirname, '../.auth/coach.json')
const clientAuthFile = path.join(__dirname, '../.auth/client.json')

setup('authenticate as coach', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_COACH_EMAIL!)
  await page.getByLabel('Contraseña').fill(process.env.E2E_COACH_PASSWORD!)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('**/coach/**')
  await page.context().storageState({ path: coachAuthFile })
})

setup('authenticate as client', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_CLIENT_EMAIL!)
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLIENT_PASSWORD!)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('**/client/**')
  await page.context().storageState({ path: clientAuthFile })
})
```

Add to `.env.local`:
```
E2E_COACH_EMAIL=coach@test.com
E2E_COACH_PASSWORD=...
E2E_CLIENT_EMAIL=client@test.com
E2E_CLIENT_PASSWORD=...
```

---

## Selector strategy (enforced)

Priority order — never skip to a lower priority without documenting why:

| Priority | Method | When to use |
|----------|--------|-------------|
| 1 | `getByRole('button', { name: /guardar/i })` | Interactive elements with a clear ARIA role |
| 2 | `getByLabel('Email')` | Form fields |
| 3 | `getByTestId('session-start-btn')` | When role+name is ambiguous or non-unique |
| ❌ | `getByText('Guardar')` | Never as primary selector for interactive elements |
| ❌ | `.locator('.some-class')` | Never — breaks on any refactor |

When adding `data-testid`, apply only to elements where the ARIA role is genuinely not sufficient. Keep the attribute semantic: `data-testid="complete-session-btn"`, not `data-testid="btn-1"`.

---

## Golden path tests

### `e2e/auth.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('login — coach authenticates and lands on dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_COACH_EMAIL!)
  await page.getByLabel('Contraseña').fill(process.env.E2E_COACH_PASSWORD!)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await expect(page).toHaveURL(/\/coach\//)
})

test('session persistence — reload keeps authenticated state', async ({ page }) => {
  await page.goto('/coach/dashboard')
  await page.reload()
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByRole('main')).toBeVisible()
})
```

### `e2e/coach.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/coach.json' })

test('coach can see the client list', async ({ page }) => {
  await page.goto('/coach/clients')
  // List renders with at least one client
  await expect(page.getByRole('listitem').first()).toBeVisible()
})

test('coach can open a client profile', async ({ page }) => {
  await page.goto('/coach/clients')
  await page.getByRole('listitem').first().click()
  await expect(page).toHaveURL(/\/coach\/clients\/[a-z0-9-]+$/)
  // Profile content visible (not an error or blank page)
  await expect(page.getByRole('main')).toBeVisible()
})

test('coach can view client session history', async ({ page }) => {
  await page.goto('/coach/clients')
  await page.getByRole('listitem').first().click()
  await expect(page).toHaveURL(/\/coach\/clients\/[a-z0-9-]+$/)
  await page.goto(page.url() + '/sessions')
  await expect(page.getByRole('main')).toBeVisible()
})
```

### `e2e/training.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/client.json' })

test('client can navigate to today\'s session', async ({ page }) => {
  await page.goto('/client/dashboard')
  // Click the primary CTA for today's session (adjust selector to match actual element)
  await page.getByTestId('today-session-cta').click()
  await expect(page).toHaveURL(/\/client\/training\/[a-z0-9-]+/)
})

test('client can complete a training session', async ({ page }) => {
  // Assumes the test account has an in-progress session
  // Navigate directly to the training session page
  await page.goto('/client/training')   // redirects to active session if one exists
  await expect(page).toHaveURL(/\/client\/training\/[a-z0-9-]+/)

  // Complete the session
  await page.getByTestId('complete-session-btn').click()

  // Confirm the success state — adjust to what the app shows after completion
  await expect(
    page.getByRole('heading', { name: /sesión completada/i })
  ).toBeVisible()
})
```

> **Note on training tests:** These tests depend on the test account having an active session. Keep a dedicated test account with a recurring plan so the state is predictable. If the test account gets into a bad state, reset it via the coach interface.

---

## Rules for writing new tests

**Write tests that survive refactors:**
- Assert on the **final state** — never on loading states that resolve in milliseconds
- Use `await expect(locator).toBeVisible()` — not `await locator.isVisible()` (no auto-retry)
- Use `page.waitForURL()` after navigation actions — don't assume the navigation is instant
- Each test must be independent — no test should depend on state left by another

**Never do:**
- `page.waitForTimeout(2000)` — always wrong; replace with a condition-based wait
- Assert on CSS class names — they change with refactors
- Use text as the primary selector for buttons or links
- Mutate shared data without cleanup (use isolated test accounts instead)

**Console error detection — add to critical flows:**

```ts
test('no JS errors during session completion', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/client/training')
  // ... exercise the flow ...

  // Filter known non-issues (e.g., favicon 404)
  const realErrors = errors.filter(e => !e.includes('favicon'))
  expect(realErrors).toHaveLength(0)
})
```

---

## Running the suite

```bash
# Ensure the dev server is running first
npm run dev

# Full suite
npx playwright test

# Single spec file
npx playwright test e2e/training.spec.ts

# Interactive UI (recommended for debugging)
npx playwright test --ui

# View the last HTML report
npx playwright show-report
```

---

## Output

After running, produce this block:

---
**QA run — [feature or reason]**
**Date:** [YYYY-MM-DD]
**Scope:** [spec files that ran]
**Viewport:** 390×844 (iPhone 14)

**Results:**
- `auth.spec.ts`: ✅ 2/2
- `coach.spec.ts`: ✅ 3/3
- `training.spec.ts`: ❌ 1/2

**Failures:**
- **Test:** [exact test name]
- **Error:** [Playwright error message — first line only]
- **Screenshot:** captured at `test-results/[path]`
- **Likely cause:** [navigation timeout | element not found | assertion mismatch | test account state]
- **Suggested fix:** [specific action]

**Console errors detected:** [none | list]
---

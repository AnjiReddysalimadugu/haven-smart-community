/**
 * Phase 0 visual baseline — Playwright capture only (no UI redesign).
 * Outputs PNGs + inventory JSON under docs/phase0-screenshots/
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'phase0-screenshots')
const API = process.env.HAVEN_API || 'http://127.0.0.1:8080/api/v1'
const WEB = process.env.HAVEN_WEB || 'http://127.0.0.1:5173'
const RN = process.env.HAVEN_RN || 'http://127.0.0.1:8081'

const VIEWPORTS = [
  { id: 'd1440', w: 1440, h: 900, label: 'Desktop 1440x900' },
  { id: 'd1366', w: 1366, h: 768, label: 'Desktop 1366x768' },
  { id: 't768', w: 768, h: 1024, label: 'Tablet 768x1024' },
  { id: 'm390', w: 390, h: 844, label: 'Mobile 390x844' },
  { id: 'm360', w: 360, h: 800, label: 'Mobile 360x800' },
]

const ROLES = [
  { key: 'SUPER_ADMIN', email: 'anji99121640@gmail.com' },
  { key: 'APARTMENT_ADMIN', email: 'admin@haven.local' },
  { key: 'STAFF', email: 'staff@haven.local' },
  { key: 'SECURITY', email: 'security@haven.local' },
  { key: 'RESIDENT', email: 'resident@haven.local' },
]

/** Routes to attempt per role (access may redirect — recorded). */
const ROUTES_BY_ROLE = {
  SUPER_ADMIN: [
    '/', '/property', '/residents', '/occupancy', '/users',
    '/billing/maintenance', '/billing/water', '/billing/electricity',
    '/billing/outstanding', '/billing/receipts', '/payments', '/receipts',
    '/parking', '/visitors', '/security', '/complaints', '/notices',
    '/family', '/emergency', '/reports', '/more', '/more/notifications',
    '/more/audit', '/settings', '/profile',
  ],
  APARTMENT_ADMIN: [
    '/', '/property', '/residents', '/occupancy', '/users',
    '/billing/maintenance', '/payments', '/receipts', '/parking',
    '/visitors', '/security', '/complaints', '/notices', '/family',
    '/emergency', '/reports', '/more', '/more/notifications',
    '/more/audit', '/settings', '/profile',
  ],
  STAFF: [
    '/', '/tasks', '/complaints', '/payments', '/receipts',
    '/billing/maintenance', '/visitors', '/notices', '/profile',
  ],
  SECURITY: [
    '/security', '/visitors', '/complaints', '/notices', '/emergency', '/profile',
  ],
  RESIDENT: [
    '/m', '/payments', '/receipts', '/billing/maintenance', '/visitors',
    '/complaints', '/occupancy', '/parking', '/notices', '/family',
    '/emergency', '/more/notifications', '/profile',
  ],
}

const inventory = []

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

async function login(email) {
  const req = await fetch(`${API}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!req.ok) throw new Error(`OTP request failed ${req.status} for ${email}`)
  const { devOtp } = await req.json()
  if (!devOtp) throw new Error(`No devOtp for ${email} — OTP_EXPOSE must be true`)
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: devOtp }),
  })
  if (!loginRes.ok) throw new Error(`Login failed ${loginRes.status} for ${email}`)
  return loginRes.json()
}

function slug(s) {
  return s.replace(/^\//, 'home').replace(/\//g, '_') || 'home'
}

async function injectAuth(page, data) {
  await page.addInitScript((payload) => {
    localStorage.setItem('haven.auth.token', payload.accessToken)
    localStorage.setItem('haven.auth.user', JSON.stringify(payload.user))
  }, data)
}

async function captureWeb(browser) {
  for (const role of ROLES) {
    let auth
    try {
      auth = await login(role.email)
    } catch (e) {
      inventory.push({
        platform: 'web', role: role.key, viewport: '*', route: '*',
        status: 'BLOCKED', blocker: String(e.message || e), file: null,
      })
      continue
    }

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await injectAuth(page, auth)

      // Login screen (unauthenticated) once per role at primary viewports
      if (vp.id === 'd1440' || vp.id === 'm390') {
        const loginCtx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
        const loginPage = await loginCtx.newPage()
        try {
          await loginPage.goto(`${WEB}/login`, { waitUntil: 'networkidle', timeout: 30000 })
          await loginPage.waitForTimeout(400)
          const dir = path.join(OUT, 'web', role.key, vp.id)
          ensureDir(dir)
          const file = path.join(dir, 'login.png')
          await loginPage.screenshot({ path: file, fullPage: false })
          inventory.push({
            platform: 'web', role: role.key, viewport: vp.label, route: '/login',
            status: 'CAPTURED', blocker: null, file: path.relative(OUT, file),
          })
        } catch (e) {
          inventory.push({
            platform: 'web', role: role.key, viewport: vp.label, route: '/login',
            status: 'FAILED', blocker: String(e.message || e), file: null,
          })
        }
        await loginCtx.close()
      }

      const routes = ROUTES_BY_ROLE[role.key] || []
      for (const route of routes) {
        const dir = path.join(OUT, 'web', role.key, vp.id)
        ensureDir(dir)
        const base = slug(route)
        try {
          const res = await page.goto(`${WEB}${route}`, { waitUntil: 'networkidle', timeout: 45000 })
          await page.waitForTimeout(700)
          const finalUrl = page.url().replace(WEB, '')
          const statusCode = res?.status() ?? 0
          const file = path.join(dir, `${base}.png`)
          await page.screenshot({ path: file, fullPage: false })
          inventory.push({
            platform: 'web',
            role: role.key,
            viewport: vp.label,
            route,
            finalUrl,
            http: statusCode,
            status: 'CAPTURED',
            blocker: finalUrl.startsWith('/login') ? 'redirected-to-login' : null,
            file: path.relative(OUT, file),
          })

          // Open primary create / dialog affordances once at d1440 + m390
          if ((vp.id === 'd1440' || vp.id === 'm390') && ['/', '/residents', '/users', '/visitors', '/complaints', '/property', '/billing/maintenance', '/notices', '/tasks'].includes(route)) {
            const buttons = page.getByRole('button').filter({ hasText: /^(New|Add|Create|Invite|Record|Issue|Raise|Compose)/i })
            const count = await buttons.count()
            if (count > 0) {
              try {
                await buttons.first().click({ timeout: 3000 })
                await page.waitForTimeout(500)
                const dlg = path.join(dir, `${base}__dialog.png`)
                await page.screenshot({ path: dlg, fullPage: false })
                inventory.push({
                  platform: 'web', role: role.key, viewport: vp.label, route: `${route}#dialog`,
                  status: 'CAPTURED', blocker: null, file: path.relative(OUT, dlg),
                })
                await page.keyboard.press('Escape')
                await page.waitForTimeout(200)
              } catch {
                /* no dialog */
              }
            }
          }
        } catch (e) {
          inventory.push({
            platform: 'web', role: role.key, viewport: vp.label, route,
            status: 'FAILED', blocker: String(e.message || e).slice(0, 300), file: null,
          })
        }
      }
      await context.close()
    }
  }
}

async function captureRnWeb(browser) {
  // Expo RN web — login + MPIN surfaces + home after auth for each role at m390 + d1440
  for (const role of ROLES) {
    for (const vp of [VIEWPORTS.find((v) => v.id === 'm390'), VIEWPORTS.find((v) => v.id === 'd1440')]) {
      const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
      const page = await context.newPage()
      const dir = path.join(OUT, 'rn-web', role.key, vp.id)
      ensureDir(dir)
      try {
        await page.goto(RN, { waitUntil: 'networkidle', timeout: 60000 })
        await page.waitForTimeout(1200)
        const loginFile = path.join(dir, 'login.png')
        await page.screenshot({ path: loginFile, fullPage: false })
        inventory.push({
          platform: 'rn-web', role: role.key, viewport: vp.label, route: 'login',
          status: 'CAPTURED', blocker: null, file: path.relative(OUT, loginFile),
        })

        // Select demo chip if present, else type email
        const chip = page.getByText(role.key === 'SUPER_ADMIN' ? 'Super Admin' : role.key === 'APARTMENT_ADMIN' ? 'Admin' : role.key === 'SECURITY' ? 'Gate' : role.key === 'STAFF' ? 'Desk' : 'Resident', { exact: false }).first()
        try {
          await chip.click({ timeout: 4000 })
        } catch {
          /* ignore */
        }
        await page.waitForTimeout(300)

        // Send OTP
        const sendBtn = page.getByText(/Send OTP/i).first()
        if (await sendBtn.isVisible().catch(() => false)) {
          await sendBtn.click()
          await page.waitForTimeout(1500)
          const otpFile = path.join(dir, 'otp.png')
          await page.screenshot({ path: otpFile, fullPage: false })
          inventory.push({
            platform: 'rn-web', role: role.key, viewport: vp.label, route: 'otp',
            status: 'CAPTURED', blocker: null, file: path.relative(OUT, otpFile),
          })

          // Dev OTP may auto-fill; click verify/continue
          const verify = page.getByText(/Verify|Continue|Sign in/i).first()
          if (await verify.isVisible().catch(() => false)) {
            await verify.click()
            await page.waitForTimeout(2000)
          }
        }

        const postFile = path.join(dir, 'post-auth.png')
        await page.screenshot({ path: postFile, fullPage: false })
        const bodyText = await page.locator('body').innerText().catch(() => '')
        const mpin = /Create MPIN|Confirm MPIN|Enter MPIN|Unlock/i.test(bodyText)
        inventory.push({
          platform: 'rn-web', role: role.key, viewport: vp.label, route: 'post-auth',
          status: 'CAPTURED',
          blocker: mpin ? 'MPIN overlay (expected security gate)' : null,
          notes: mpin ? 'MPIN setup/unlock visible' : 'app shell or other',
          file: path.relative(OUT, postFile),
        })

        // If MPIN create, capture keypad then Sign out
        if (mpin) {
          const signOut = page.getByText('Sign out').first()
          if (await signOut.isVisible().catch(() => false)) {
            const soFile = path.join(dir, 'mpin-with-signout.png')
            await page.screenshot({ path: soFile, fullPage: false })
            inventory.push({
              platform: 'rn-web', role: role.key, viewport: vp.label, route: 'mpin-signout',
              status: 'CAPTURED', blocker: null, file: path.relative(OUT, soFile),
            })
            await signOut.click()
            await page.waitForTimeout(800)
          }
        }
      } catch (e) {
        inventory.push({
          platform: 'rn-web', role: role.key, viewport: vp.label, route: '*',
          status: 'FAILED', blocker: String(e.message || e).slice(0, 300), file: null,
        })
      }
      await context.close()
    }
  }
}

async function main() {
  ensureDir(OUT)
  const browser = await chromium.launch({ headless: true })
  console.log('Capturing Web…')
  await captureWeb(browser)
  console.log('Capturing RN web…')
  await captureRnWeb(browser)
  await browser.close()

  const summary = {
    generatedAt: new Date().toISOString(),
    webBase: WEB,
    rnBase: RN,
    apiBase: API,
    totals: {
      entries: inventory.length,
      captured: inventory.filter((i) => i.status === 'CAPTURED').length,
      failed: inventory.filter((i) => i.status === 'FAILED').length,
      blocked: inventory.filter((i) => i.status === 'BLOCKED').length,
    },
    inventory,
  }
  fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary.totals, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

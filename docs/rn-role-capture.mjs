/**
 * RN role screenshots via token + seeded MPIN (skips flaky OTP UI).
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'phase0-screenshots', 'rn-roles')
const API = 'http://127.0.0.1:8080/api/v1'
const RN = 'http://127.0.0.1:8081'
const PIN = '2580'
const SALT = 'haven-capture-salt-v1'
const HASH = crypto.createHash('sha256').update(`${SALT}:${PIN}`).digest('hex')

const ROLES = [
  { key: 'SUPER_ADMIN', email: 'anji99121640@gmail.com', tabs: ['Societies', 'Users', 'Residents', 'Flats', 'You'] },
  { key: 'APARTMENT_ADMIN', email: 'admin@haven.local', tabs: ['Ops', 'Users', 'Residents', 'Flats', 'You'] },
  { key: 'STAFF', email: 'staff@haven.local', tabs: ['Desk', 'Pay', 'Tickets', 'Guests', 'You'] },
  { key: 'SECURITY', email: 'security@haven.local', tabs: ['Gate', 'Passes', 'Scan', 'You'] },
  { key: 'RESIDENT', email: 'resident@haven.local', tabs: ['Home', 'Bills', 'Guests', 'Help', 'You'] },
]

const inventory = []
function ensure(p) { fs.mkdirSync(p, { recursive: true }) }

async function apiLogin(email) {
  const req = await fetch(`${API}/auth/otp/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const { devOtp } = await req.json()
  if (!devOtp) throw new Error(`no otp ${email}`)
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: devOtp }),
  })
  if (!login.ok) throw new Error(`login ${login.status}`)
  return login.json()
}

async function shot(page, dir, name, meta = {}) {
  ensure(dir)
  const file = path.join(dir, `${name}.png`)
  await page.waitForTimeout(500)
  await page.screenshot({ path: file, fullPage: false })
  inventory.push({
    file: path.relative(OUT, file),
    name,
    text: (await page.locator('body').innerText().catch(() => '')).slice(0, 180),
    ...meta,
  })
  console.log('  ✓', name)
}

async function tapDigits(page, pin) {
  for (const d of pin.split('')) {
    const ok = await page.evaluate((digit) => {
      const nodes = [...document.querySelectorAll('div,span,button')]
      const hits = nodes.filter((el) => {
        if ((el.textContent || '').trim() !== digit) return false
        const r = el.getBoundingClientRect()
        return r.width >= 40 && r.height >= 40 && r.top > window.innerHeight * 0.32
      })
      const el = hits.sort((a, b) => b.getBoundingClientRect().area - a.getBoundingClientRect().area)[0]
        || hits[0]
      if (!el) return false
      ;['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))
      })
      return true
    }, d)
    if (!ok) throw new Error(`digit ${d}`)
    await page.waitForTimeout(140)
  }
}

async function seedSession(page, auth) {
  await page.goto(RN, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(({ token, userId, salt, hash }) => {
    localStorage.clear()
    localStorage.setItem('haven.mobile.token', token)
    localStorage.setItem('haven.mpin.salt', salt)
    localStorage.setItem('haven.mpin.hash', hash)
    localStorage.setItem('haven.mpin.userId', userId)
  }, {
    token: auth.accessToken,
    userId: auth.user.id,
    salt: SALT,
    hash: HASH,
  })
  await page.goto(RN, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
}

async function unlockIfNeeded(page, dir, role) {
  const text = await page.locator('body').innerText()
  if (/Create MPIN|Enter MPIN|Confirm MPIN/i.test(text)) {
    await shot(page, dir, '00-mpin', { role })
    if (/Create MPIN/i.test(text)) {
      await tapDigits(page, PIN)
      await page.waitForTimeout(500)
      const t2 = await page.locator('body').innerText()
      if (/Confirm MPIN/i.test(t2)) {
        await tapDigits(page, PIN)
        await page.waitForTimeout(1000)
      }
    } else {
      await tapDigits(page, PIN)
      await page.waitForTimeout(1000)
    }
  }
}

async function main() {
  ensure(OUT)
  const browser = await chromium.launch({ headless: true })
  for (const role of ROLES) {
    console.log('\n===', role.key, '===')
    const dir = path.join(OUT, role.key)
    ensure(dir)
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
    const page = await context.newPage()
    try {
      const auth = await apiLogin(role.email)
      await seedSession(page, auth)
      await unlockIfNeeded(page, dir, role.key)
      await shot(page, dir, '01-home', { role: role.key })

      for (const tab of role.tabs) {
        const el = page.getByText(tab, { exact: true }).first()
        if (!(await el.isVisible().catch(() => false))) {
          inventory.push({ role: role.key, tab, status: 'TAB_MISSING' })
          continue
        }
        await el.click()
        await page.waitForTimeout(900)
        await shot(page, dir, `tab-${tab.toLowerCase().replace(/\s+/g, '-')}`, { role: role.key, tab })
      }

      // scroll profile
      if (await page.getByText('You', { exact: true }).first().isVisible().catch(() => false)) {
        await page.getByText('You', { exact: true }).first().click()
        await page.waitForTimeout(500)
        await page.mouse.wheel(0, 700)
        await page.waitForTimeout(400)
        await shot(page, dir, 'profile-more', { role: role.key })
      }

      // open one sheet if possible
      for (const re of [/Add /i, /\+ Add/i, /New /i, /Create /i, /Invite/i, /Scan QR/i]) {
        const btn = page.getByText(re).first()
        if (await btn.isVisible().catch(() => false)) {
          try {
            await btn.click({ timeout: 2000 })
            await page.waitForTimeout(700)
            await shot(page, dir, 'sheet', { role: role.key })
            const close = page.getByText(/Close|Cancel|Dismiss/i).first()
            if (await close.isVisible().catch(() => false)) await close.click()
          } catch { /* */ }
          break
        }
      }
    } catch (e) {
      console.error('FAIL', role.key, e.message)
      await shot(page, dir, 'zz-error', { role: role.key, error: String(e.message) }).catch(() => {})
    }
    await context.close()
  }
  await browser.close()
  fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: inventory.length,
    inventory,
  }, null, 2))
  console.log('\nDone', inventory.length, '→', OUT)
}

main().catch((e) => { console.error(e); process.exit(1) })

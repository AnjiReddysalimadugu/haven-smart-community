# SUPER_ADMIN Mobile PWA — Test Report

Date: 2026-11-18  
App: Haven AMS frontend (`frontend/`) + Spring Boot API (`:8080`)  
Verified against live Postgres demo data (no mocks).

## Environment

| Item | Result |
|---|---|
| Frontend | Vite `http://127.0.0.1:5173` with `vite-plugin-pwa` (dev SW enabled) |
| API | `http://127.0.0.1:8080/api/v1` — Flyway `V8__audit_and_web_push` applied |
| Auth | OTP login `superadmin@haven.local` |
| Viewport | Emulated iPhone 16 CSS size **393×852**, `deviceScaleFactor=3`, `mobile=true` |

## Shell & navigation

| Check | Result |
|---|---|
| SUPER_ADMIN on ≤960px uses `AdminMobileShell` | Pass — floating glass tab bar |
| Tabs: Home · Properties · Finance · Users · More | Pass |
| Desktop ≥961px still uses `Layout` sidebar | Pass (code path preserved in `AppShell`) |
| Society switcher on Home | Pass — All societies + 3 live societies |
| Safe-area padding on content / tab bar | Pass — `env(safe-area-inset-*)` in CSS; content `padding-bottom` clears floating tabs |

## Live Home dashboard (API)

Observed after login (All societies scope):

| Metric | Live value |
|---|---|
| Societies | 3 |
| Admins | 8 |
| Residents | 3 |
| Flats | 6 |
| Occupied | 3 |
| Collected | ₹13,400 |
| Outstanding | ₹700 |
| Tickets | 2 |
| Passes | 5 |

Outstanding queue, open tickets, and recent activity rendered from `billingApi` / `complaintApi` / `visitorApi`.

## Modules

| Area | Result |
|---|---|
| Properties (societies / flats segments + create/archive sheets) | Pass — wired to `propertyApi` |
| Finance (dues / receipts / bills + payment sheet) | Pass — wired to `billingApi` / `receiptApi` |
| Users (filters + create + activate/deactivate) | Pass — wired to `userApi` |
| More hub | Pass — Visitors, Parking, Complaints, Reports, Notifications, Audit, Settings, Profile |
| Theme light/dark from More | Pass — `useTheme` |

## PWA

| Check | Result |
|---|---|
| `manifest.webmanifest` id `/haven-ams`, standalone, theme `#061511` | Pass |
| Icons 192 / 512 / apple-touch | Pass under `public/icons/` |
| `viewport-fit=cover`, apple-mobile-web-app meta | Pass in `index.html` |
| Service worker registration (`virtual:pwa-register`) | Pass in `main.tsx` |
| Offline banner + invalidate-on-`online` | Pass (`OnlineBanner` / `useOnlineSync`) |
| IndexedDB dashboard snapshot helper | Pass (`pwa/idb.ts`) |
| Install: Chromium BIP hook + iOS Share guidance (no BIP claim on iOS) | Pass (`InstallBanner`) |
| App badge helper | Pass (`updateAppBadge`) — supported browsers only |

## Backend additives

| Endpoint | Result |
|---|---|
| `GET /api/v1/audit-events` (SUPER_ADMIN) | Pass — returns `[]` until mutations; apartment create/archive & user activate/deactivate write events |
| `GET /api/v1/devices/vapid-public-key` | Pass — `publicKey: null` until `VAPID_PUBLIC_KEY` env is set |
| `POST /api/v1/devices/push-token` with `platform=WEB` | Ready — token column widened to TEXT (Flyway V8) |

## Auth / API smoke

| Check | Result |
|---|---|
| OTP request + login | Pass |
| Bearer `dashboard/summary` | Pass |
| Unauthorized without token | Pass (401) |

## Known limits (honest)

1. **VAPID delivery**: registration + public-key endpoint ship; actual WEB push *send* logs a note until VAPID private key + a Java web-push sender are configured in ops env.
2. **Audit volume**: initially empty until SUPER_ADMIN mutates apartments/users (or other hooked writers).
3. **iOS Home Screen**: cannot be fully automated in desktop Chromium; meta + install guidance verified; validate manually on a device Safari → Share → Add to Home Screen.
4. **Background Sync**: intentionally not required; reconnect uses `window` `online` event only.

## Manual device checklist (operator)

- [ ] iPhone Safari: login, confirm floating tabs clear home indicator
- [ ] Add to Home Screen; reopen standalone; confirm no browser chrome
- [ ] Android Chrome: install prompt (BIP) when available
- [ ] Toggle airplane mode → offline banner → restore → queries refresh
- [ ] Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` → Notifications → Enable push alerts

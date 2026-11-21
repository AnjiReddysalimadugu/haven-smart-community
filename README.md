# Smart Community Platform

A full-stack starter for a multi-apartment management platform.

## Stack
- Backend: Java 21, Spring Boot 3.5, Spring Data JPA, Hibernate, PostgreSQL, Flyway, Bean Validation
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios, Recharts, Lucide
- API prefix: `/api/v1`

## Included in this starter
- Apartment → Block → Floor → Flat hierarchy
- Dashboard summary
- Monthly bill creation and payment recording
- Visitor pass creation and QR-token validation endpoint
- Parking slot management
- Complaint lifecycle
- Global exception handling and request validation
- Flyway schema migration
- Responsive admin dashboard UI with navigation and starter screens

## Important scope note
This is a runnable MVP foundation, not a finished production SaaS. Before public deployment, complete JWT/OIDC authentication, enforce apartment-level authorization on every endpoint, integrate a real payment gateway and SMS/WhatsApp provider, add automated tests, rate limits, backups/restore drills, observability, and security review. The visitor QR endpoint uses random opaque tokens; add a QR rendering/scanning client and resident approval workflow before production.

## Run locally

### 1. Environment
Copy `.env.example` to `.env` and set secrets (required — no hardcoded JWT/DB passwords in `application.yml`):
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET` (≥ 32 chars), `JWT_EXPIRATION_MINUTES`
- `DEMO_PASSWORD` (demo account seeding)
- `POSTGRES_PASSWORD` (Docker Postgres)

### 2. PostgreSQL
```bash
docker compose up -d postgres
```

### 3. Backend
Requires Java 21 and Maven. Load `.env` then run (or use `scripts/run-backend.ps1`):
```bash
cd backend
mvn spring-boot:run
```
Backend: `http://localhost:8080` · Health: `/actuator/health`

Demo login is **email + OTP** (SMTP delivery):
1. Configure SMTP in `.env` (`SMTP_ENABLED=true`, host/user/password/from)
2. `POST /api/v1/auth/otp/request` `{ "email": "you@example.com" }` → OTP emailed
3. `POST /api/v1/auth/login` `{ "email": "you@example.com", "otp": "123456" }`

Validation: 6-digit code, hashed at rest, single-use, TTL + attempt limits.
`OTP_EXPOSE=true` is a local-only fallback when SMTP is off (returns `devOtp` in JSON).

Seeded demo emails (`@haven.local`) cannot receive real SMTP mail — create a user with your real inbox via **Users**, or keep `OTP_EXPOSE=true` for those accounts while testing.

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173` (Vite proxies `/api` → `:8080`).

## API overview
- `POST /api/v1/apartments` (SUPER_ADMIN only) · `GET /api/v1/apartments`
- Blocks / floors / flats create+list under `/api/v1/...`
- Residents: `GET/POST /api/v1/residents`, `GET/PUT /api/v1/residents/{id}`, `POST .../deactivate`
- Occupancy: `POST /api/v1/flats/{id}/occupancy`, `POST .../release`, `GET .../occupancy`, `GET .../history`, `GET /api/v1/occupancies`
- `GET/POST /api/v1/bills` · `POST /api/v1/bills/{id}/payments`
- `GET/POST /api/v1/visitors` · `POST /api/v1/visitors/validate`
- `GET/POST /api/v1/parking-slots`
- `GET/POST /api/v1/complaints` · `PATCH /api/v1/complaints/{id}/status`
- `GET /api/v1/dashboard/summary`

See `docs/API.md` and `docs/ARCHITECTURE.md`.

## Design principles
- Keep entities inside the persistence layer; expose DTOs from controllers.
- Use service classes for business rules and repositories for persistence.
- Use Flyway as the schema source of truth.
- Use `BigDecimal` for money.
- Keep visitor tokens opaque and store only SHA-256 hashes.
- Never trust apartment or flat IDs supplied by a client without authorization checks.

# Haven API on Render

## 1. Postgres
Create Free Postgres. Copy **Internal Database URL**.

Convert to JDBC:

```text
postgres://USER:PASS@HOST/DB
→
jdbc:postgresql://HOST/DB?sslmode=require
```

Env:

- `DB_URL` — JDBC URL with `?sslmode=require`
- `DB_USERNAME` / `DB_PASSWORD`

## 2. Web Service (Docker)

| Field | Value |
|--------|--------|
| Runtime | **Docker** |
| Root Directory | `backend` |
| Instance | Free (or Starter if OOM) |
| Health check | `/actuator/health` |

Also set: `JWT_SECRET`, `DEMO_PASSWORD`, `OTP_EXPOSE=true` (until SMTP), `SMTP_ENABLED=false`.

## 3. After first deploy

Flyway runs migrations. Login with seeded Super Admin email + OTP (or `OTP_EXPOSE` in logs if SMTP off).

Turn on SMTP / Google with the same env keys as local `.env`.

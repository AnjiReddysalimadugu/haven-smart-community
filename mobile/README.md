# Haven Mobile (Expo)

Native Android / iOS app for Haven AMS — same JWT + OTP API as the web PWA.
Visual identity matches web: **midnight navy + emerald**.

## Roles

| Role | Workspace | Screens |
|------|-----------|---------|
| `RESIDENT` | Home | Bills (UPI self-pay), guest passes, help tickets |
| `SECURITY` | Dark gate | Paste token, **QR camera scan**, live passes |
| `STAFF` | Desk | Collect payments, ticket queue |
| `ADMIN` / `APARTMENT_ADMIN` | Desk + ops | Flats occupancy, parking allocate/release |

## Configure API + EAS

```powershell
cd smart-community-platform/mobile
copy .env.example .env
# Edit .env:
# EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8080/api/v1
# EXPO_PUBLIC_EAS_PROJECT_ID=<from eas init>
```

- **Android emulator** defaults to `http://10.0.2.2:8080/api/v1` when env is unset.
- **iOS simulator** defaults to `http://127.0.0.1:8080/api/v1`.
- **Physical device** must set `EXPO_PUBLIC_API_URL` to your PC LAN IP.

### EAS project id

```powershell
npm i -g eas-cli
eas login
eas init   # writes project id — also set EXPO_PUBLIC_EAS_PROJECT_ID in .env
```

Push registration is skipped until a real project id is set (no more hardcoded `00000000-…`).

## Run (Expo Go)

1. Start Postgres + Spring Boot on your LAN.
2. Set `EXPO_PUBLIC_API_URL` and start:

```powershell
cd smart-community-platform/mobile
npm start
```

## EAS build

```powershell
eas build -p android --profile preview   # APK
eas build -p android --profile production  # AAB
```

## Demo accounts

`resident@haven.local` · `security@haven.local` · `staff@haven.local` · `admin@haven.local` · `superadmin@haven.local`

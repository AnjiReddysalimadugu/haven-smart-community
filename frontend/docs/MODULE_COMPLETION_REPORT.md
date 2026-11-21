# AMS Module Completion Report

Date: 2026-11-19  
Inventory: `frontend/docs/SCREEN_INVENTORY.md`  
Migration: Flyway **V9** applied (`family_members`, `notices`, `emergency_contacts`, visitor approval columns, complaint status history, parking vehicle unique index).

## Role CRUD verification (live API)

| Role | Result | Evidence |
|---|---|---|
| SUPER_ADMIN | Pass | Notice create, emergency create, audit list |
| APARTMENT_ADMIN | Pass | Notices list; apartment create forbidden |
| RESIDENT | Pass | Family create + duplicate blocked; parking scoped to own flat; visitor approve; audit denied |
| SECURITY | Pass | Walk-in visitor → PENDING; validate after approve; checkout |
| STAFF | Pass | Assigned via admin; `GET /complaints?mine=true`; evidence URL; invalid status transition blocked |
| Cross-cutting | Pass | Duplicate active parking vehicle blocked (`KA01AB1234`) |

Frontend `npm run build` succeeded (includes Family, Notices, Emergency, StaffTasks, Security QR scanner).

## Module status by role

### SUPER_ADMIN / APARTMENT_ADMIN
| Module | Status | Notes |
|---|---|---|
| Apartments / property tree | Complete | Existing |
| Admins / users | Complete | Users screen; role filter |
| Residents / occupancy | Complete | History preserved |
| Billing M/W/E + payments + receipts | Complete | Append-only payments + receipts; audited |
| Parking | Complete | Slot uniqueness + **active vehicle uniqueness** |
| Visitors | Complete | Create + optional approval + gate validate/exit; audited |
| Complaints | Complete | Transitions enforced; status history; evidence URL; assign |
| Notices | **New** | Publish / deactivate |
| Family (admin view) | **New** | List/create via API |
| Emergency contacts | **New** | CRUD for admins |
| Reports / settings | Complete / Partial | Settings = theme + society; not full platform config console |
| Audit logs | Improved | Writers on bills, parking, visitors, complaints, notices, family, emergency; APARTMENT_ADMIN scoped read |

### RESIDENT
| Module | Status | Notes |
|---|---|---|
| Home / bills / pay / receipts | Complete | **`bill.pay` unlocked** for RESIDENT |
| Family | **New** | CRUD own flat |
| Visitors + approvals | Complete | Create invite; approve/reject pending |
| Complaints | Complete | Create + comment |
| Notices | **New** | Read board |
| Parking | Complete | List own allocations |
| Profile / notifications route | Complete / Partial | Notifications page accessible; push depends on VAPID config |

### SECURITY
| Module | Status | Notes |
|---|---|---|
| Gate dashboard | Complete | Validate / exit / history |
| QR camera scan | **New** | `BarcodeDetector` + camera; paste fallback |
| Manual / walk-in entry | Complete | Create pass → PENDING approval |
| Emergency contacts | **New** | SOS tab + dial |
| Deliveries | Partial | Filter by visit type on visitors list (no separate module) |

### STAFF
| Module | Status | Notes |
|---|---|---|
| Mobile shell | **New** | Floating tabs: Tasks / Desk / Pay / Guests / You |
| My tasks | **New** | Assigned complaints + evidence + history |
| Payments / visitors / complaints desk | Complete | Existing APIs |

## Business rules enforced (backend)

- Duplicate family member (name+relation) blocked  
- Duplicate active parking vehicle per society blocked (DB unique index + service check)  
- Visitor QR: expiry, reuse, and **approval required** before entry  
- Visitor entry/exit tracked; checkout requires prior check-in  
- Complaint status transition graph; history rows; assignee role/apartment checks  
- Payments append-only; amount ≤ balance; resident own-flat only  
- Audit on sensitive mutations; apartment isolation via `AccessGuard` (not UI-only)

## Remaining issues

1. **No binary photo upload** — staff evidence is URL-based until file storage is added.  
2. **QR camera** needs Chromium `BarcodeDetector` + HTTPS/secure context; Safari may need paste fallback.  
3. **OTP rate limits** (`OTP_MAX_REQUESTS`) can throttle rapid multi-role scripted tests.  
4. **Dedicated Staff/Security admin directories** still share the Users screen (filter by role) rather than separate top-level modules.  
5. **Global platform settings** beyond theme/society archive still thin for SUPER_ADMIN.  
6. **Delivery workflow** is visitType=`DELIVERY`, not a separate package-tracking entity.  
7. **Resident notifications inbox** still leans on push registration / More hub rather than a full event feed.  

## Demo accounts (local)

`superadmin@haven.local`, `admin@haven.local`, `staff@haven.local`, `security@haven.local`, `resident@haven.local` — password from `DEMO_PASSWORD` / OTP via `OTP_EXPOSE`.

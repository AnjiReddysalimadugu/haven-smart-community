# AMS Screen Inventory (5 Roles)

Generated from codebase inspection. **EXISTING** = functional with live APIs. **PARTIAL** = present but incomplete. **MISSING** = not implemented.

## SUPER_ADMIN / APARTMENT_ADMIN

| Screen | Data | Actions | CRUD | APIs | Rules | Status |
|---|---|---|---|---|---|---|
| Home / Dashboard | KPI summary, dues, tickets | Navigate | R | `/dashboard/summary`, bills, complaints | Scope by society | EXISTING |
| Apartments / Properties | Tree apt→block→floor→flat | Create apt/block/floor/flat, archive apt | C R U(archive) | `/apartments`, `/blocks`, `/floors`, `/flats` | Super create/archive only | EXISTING |
| Residents | Directory | Register, edit, deactivate | C R U D(soft) | `/residents` | Flat blocks deactivate | EXISTING |
| Users (admins/staff/security) | Users by role | Create, edit, activate/deactivate | C R U | `/users` | Role hierarchy; apartment isolation | PARTIAL (no dedicated Staff/Security screens) |
| Occupancy | Active links | Allocate, release, history | C R U | `/occupancies`, `/flats/{id}/occupancy*` | One active per flat/resident | EXISTING |
| Billing M/W/E | Bills by type | Create, pay | C R | `/bills` | Unique period+type per flat | EXISTING |
| Payments | Outstanding | Record payment | C R | `/bills/{id}/payments` | Balance cap; append-only | EXISTING |
| Receipts | Ledger | List | R | `/receipts` | No edit API | EXISTING |
| Parking | Slots | Create, allocate, release | C R U | `/parking-slots` | Slot uniqueness; need vehicle uniqueness | PARTIAL |
| Visitors | Passes | Create, validate | C R | `/visitors*` | QR hash/expiry/reuse | PARTIAL (no approval workflow) |
| Complaints | Tickets | Create, status, assign, comment | C R U | `/complaints*` | Status enum; weak transitions | PARTIAL |
| Reports | Charts | View | R | dashboard + lists | — | EXISTING |
| Audit logs | Events | View | R | `/audit-events` | Super + apartment admin scoped; broad writers | EXISTING |
| Settings | Society + theme | Update/archive society | U | `/apartments/{id}` | Super archive | PARTIAL (not full global settings) |
| Notices | Society notices | Publish / deactivate | C R U | `/notices` | Apartment scoped | EXISTING |
| Family (admin view) | Flat family | Create / edit / deactivate | C R U | `/family-members` | Duplicate name+relation blocked | EXISTING |
| Emergency | Gate contacts | Create / deactivate | C R U | `/emergency-contacts` | Duplicate phone blocked | EXISTING |

## RESIDENT

| Screen | Status | Notes |
|---|---|---|
| Home | EXISTING | Flat label, dues, tickets, guests + deep links |
| Own flat detail | PARTIAL | Display only |
| Family | EXISTING | Own-flat CRUD |
| Bills / Payments | EXISTING | Pay unlocked via `bill.pay` |
| Receipts | EXISTING | List |
| Visitor create | EXISTING | Auto-approved invites |
| Visitor approvals | EXISTING | Approve/reject pending gate walk-ins |
| Complaints | EXISTING | Create + comment |
| Notices | EXISTING | Read board |
| Parking | EXISTING | Own allocations |
| Notifications | PARTIAL | Route allowed; push needs VAPID |
| Profile | EXISTING | Read-only |

## SECURITY

| Screen | Status | Notes |
|---|---|---|
| Gate dashboard | EXISTING | Validate/exit |
| QR camera scan | EXISTING | BarcodeDetector + paste fallback |
| Verification / check-in/out | EXISTING | |
| Approvals queue | EXISTING | Pending until resident approves |
| Manual entry | EXISTING | Walk-in create → PENDING |
| Deliveries | PARTIAL | visitType filter only |
| History | EXISTING | Gate activity table |
| Emergency contacts | EXISTING | SOS tab |

## STAFF

| Screen | Status | Notes |
|---|---|---|
| Desk dashboard | PARTIAL | Collections KPIs remain on `/` |
| Assigned tasks | EXISTING | `/tasks` + `?mine=true` |
| Task detail / updates | EXISTING | Status + notes + comments |
| Photos / evidence | PARTIAL | Evidence URL (no binary upload) |
| History | EXISTING | Complaint status history |
| Mobile shell | EXISTING | Role tab bar |

## This pass delivered

See `MODULE_COMPLETION_REPORT.md` for API test results and remaining issues.

# Haven AMS — Complete Screen-by-Screen Functional Specification

**Purpose:** Source of truth for functional screens. A screen is **not done** if it only shows a list — every required action, filter, form, permission, and state below must be present.  
**Security:** Backend enforces role + apartment isolation. UI never substitutes for authorization.  
**Ledger rule:** Posted payments / receipts are **never silently edited**. Audit trail is compulsory for sensitive admin actions.

**Status legend**

| Tag | Meaning |
|---|---|
| **DONE** | Live UI + API for required actions |
| **PARTIAL** | Core works; some required actions missing or thin |
| **GAP** | Spec requires it; not shipped yet |

---

## 0. Common UI structure (every CRUD screen)

```
[Title]
[One-line purpose]
[Search…]                              [+ Add / Create]

  KPI  ·  KPI  ·  KPI

  Row primary text
  Secondary meta (block · floor · flat)     [Status]
  [View] [Edit] […role actions…] [Deactivate]
```

**Mandatory on every CRUD list**

1. Search + filters  
2. Add/Create primary CTA (if role permitted)  
3. View details  
4. Edit (if permitted)  
5. Delete/Deactivate only when permitted + confirm dialog  
6. Pagination or lazy load  
7. Form validation  
8. Loading / empty / error states  
9. Mobile bottom sheets; desktop table/layout  
10. Real API actions + success/error feedback (no fake success)

---

## 1. SUPER_ADMIN — Full platform access

Global data. Must use society scope when acting on apartment-bound modules.

| Screen | Display | Required actions | Route | Status |
|---|---|---|---|---|
| Dashboard | Apartments, admins, residents, revenue, occupancy, alerts | View details, filters | `/` | **DONE** |
| Apartments | Name, location, blocks, flats, status | Create, View, Edit, Activate/Deactivate (archive) | `/property` | **DONE** (archive = deactivate) |
| Apartment Details | Overview, blocks, floors, flats, admins | Edit, Assign Admin | `/property` + `/users` | **PARTIAL** — edit tree **DONE**; assign admin via Users, not inline on details |
| Apartment Admins | Name, email, phone, assigned apartment, status | Create, View, Edit, Assign, Deactivate | `/users` | **PARTIAL** — no phone field in model; View/Edit/Assign/Deactivate **DONE** |
| Residents | Name, flat, apartment, phone, status | Create, View, Edit, Deactivate | `/residents` | **DONE** (+ Allocate, Release, History) — phone **GAP** if not in API |
| Blocks | Block name, apartment, floors | Create, View, Edit, Delete if unused | `/property` | **PARTIAL** — C/V/E **DONE**; delete-if-unused **GAP** |
| Floors | Floor number, block, flat count | Create, View, Edit, Delete if unused | `/property` | **PARTIAL** — C/V/E **DONE**; delete-if-unused **GAP** |
| Flats | Flat number, floor, type, occupancy | Create, View, Edit, Allocate, Release | `/property` | **DONE** |
| Occupancy | Resident, flat, move-in, move-out | Allocate, Release, History | `/occupancy` | **DONE** |
| Billing | Type, amount, due, status | Generate, View, Edit draft, Cancel | `/billing/*` | **PARTIAL** — Generate/View/Pay **DONE**; draft edit + cancel **GAP** |
| Payments | Amount, method, txn ID, date | View, Verify, Refund if supported | `/payments` | **PARTIAL** — View/Record **DONE**; verify workflow + refund **GAP** (no silent edit) |
| Receipts | Receipt #, resident, amount | View, Download, Share | `/receipts` | **PARTIAL** — View **DONE**; download/share print helpers **GAP/thin** |
| Parking | Slots, allocations, charges | Create, Edit, Allocate, Release | `/parking` | **PARTIAL** — Create/Allocate/Release **DONE**; slot Edit **GAP** |
| Visitors | Visitor, resident, approval, entry/exit | View, Search, Verify | `/visitors`, `/security` | **DONE** (+ approve/reject policy) |
| Complaints | Category, resident, priority, status | View, Assign, Update, Resolve | `/complaints` | **PARTIAL** — priority field **GAP**; assign/update/resolve **DONE** |
| Reports | Revenue, occupancy, dues, visitor stats | Filter, Export | `/reports` | **PARTIAL** — filter/view **DONE**; export CSV **GAP** |
| Staff & Security | User details, assignments | Create, Edit, Assign, Deactivate | `/users` | **DONE** (role filter) |
| Notices | Title, body, expiry | Publish, Edit, Deactivate | `/notices` | **DONE** |
| Emergency | Name, role, phone | Create, Edit, Deactivate | `/emergency` | **PARTIAL** — create/deactivate **DONE**; edit form **thin** |
| Family (admin) | Flat household | Create, Edit, Deactivate | `/family` | **DONE** |
| Settings | Global configurations | View, Edit | `/settings` | **PARTIAL** — theme + society; full global config **GAP** |
| Audit Logs | User, action, date, module | Search, Filter, View | `/more/audit` | **DONE** |

**SUPER_ADMIN non-negotiables**

- Global apartment switcher / `apartmentId` on scoped APIs  
- No silent ledger edits  
- Audit on create/archive society, user activate/deactivate, bills, payments, parking, visitors, complaints, notices, property edits  

---

## 2. APARTMENT_ADMIN — Own apartment only

Same common UI; data pre-scoped to `actor.apartmentId`. Cross-society → 403.

| Screen | Display | Required actions | Route | Status |
|---|---|---|---|---|
| Dashboard | Occupancy, residents, collections, pending dues | View, Filter | `/` | **DONE** |
| Property | Apartment, blocks, floors | View, Edit permitted | `/property` | **DONE** |
| Blocks | Block name, floors | Create, Edit, View | `/property` | **DONE** |
| Floors | Floor number, flat count | Create, Edit, View | `/property` | **DONE** |
| Flats | Flat number, type, occupancy | Create, Edit, Allocate, Release | `/property` | **DONE** |
| Residents | Details, flat, owner/tenant | Create, View, Edit, Deactivate | `/residents` | **DONE** (+ Allocate / Release / History) |
| Occupancy | Current + historical | Allocate, Release, View History | `/occupancy` | **DONE** |
| Maintenance | Monthly bills | Generate, View, Edit draft, Cancel | `/billing/maintenance` | **PARTIAL** — generate/view **DONE**; draft edit/cancel **GAP** |
| Water Bills | Consumption, rate, amount | Generate, View, Edit draft | `/billing/water` | **PARTIAL** — amount/period model; consumption fields **GAP** |
| Electricity | Meter, units, amount | Generate, View, Edit draft | `/billing/electricity` | **PARTIAL** — same as water |
| Payments | Collected + pending | View, Verify, Reconcile | `/payments` | **PARTIAL** — view/record **DONE** |
| Receipts | Ledger | View, Download | `/receipts` | **PARTIAL** |
| Parking | Slots + flats | Create, Allocate, Release, Charge | `/parking` | **PARTIAL** — charge displayed; slot edit **GAP** |
| Visitors | Expected / approved / active | View, Approve/Reject where permitted | `/visitors` | **DONE** |
| Complaints | Pending + assigned | Assign, Update, Resolve | `/complaints` | **DONE** |
| Staff | Assigned staff | Create, Assign, Edit, Deactivate | `/users` | **DONE** |
| Security | Gate users | Create, Assign, Deactivate | `/users` | **DONE** |
| Reports | Apt financial + ops | Filter, Export | `/reports` | **PARTIAL** — export **GAP** |
| Notices / Emergency | Board / contacts | Manage | `/notices`, `/emergency` | **DONE** / **PARTIAL** |
| Settings | Apt-specific + theme | Edit authorized | `/settings` | **PARTIAL** |
| Audit | Own apartment events | Search, Filter, View | `/more/audit` | **DONE** |

**Residents completeness checklist (example of “not list-only”)**

| Action | Status |
|---|---|
| Add / Register | **DONE** |
| View detail | **DONE** |
| Edit profile | **DONE** |
| Allocate Flat | **DONE** |
| Release Flat | **DONE** |
| Occupancy History | **DONE** |
| Deactivate (after release) | **DONE** |
| Search + Active/Inactive KPIs | **DONE** |

---

## 3. RESIDENT — Own flat only

| Screen | Display | Required actions | Route | Status |
|---|---|---|---|---|
| Home | Flat, dues, notices teaser | View + deep links | `/m` | **DONE** |
| My Flat | Apartment, block, floor, flat | View | Home / Profile | **PARTIAL** — flat/apartment shown; full block/floor path **thin** |
| Family | Linked members | Add, Edit, Remove | `/family` | **DONE** |
| Bills | M / W / E | View, Download | `/payments` | **PARTIAL** — view **DONE**; download **GAP** |
| Payments | Pending + paid | Pay, View history | `/payments` | **DONE** |
| Receipts | Receipts | Download, Share | `/receipts` | **PARTIAL** |
| Visitors | List + approvals | Create, Approve, Reject, Cancel | `/visitors` | **PARTIAL** — create/approve/reject **DONE**; cancel unused **GAP** |
| Complaints | Status + comments | Create, View, Comment, Reopen if allowed | `/complaints` | **PARTIAL** — reopen only via allowed transitions for staff; resident reopen **GAP** |
| Notices | Announcements | View | `/notices` | **DONE** |
| Parking | Assigned slots | View, Request additional | `/parking` | **PARTIAL** — view **DONE**; request flow **GAP** |
| Profile | Contact | Edit permitted | `/profile` | **GAP** — view only today |
| Notifications | Alerts | View, Mark read | `/more/notifications` | **PARTIAL** |
| Emergency | Contacts | View | `/emergency` | **DONE** |

**Forbidden:** Other flats’ data, gate validate, bill generation, user management.

---

## 4. SECURITY — Gate only

| Screen | Display | Required actions | Route | Status |
|---|---|---|---|---|
| Gate Dashboard | Entries, exits, pending | View | `/security` | **DONE** |
| QR Scanner | Camera | Scan, Validate | `/security` | **DONE** (BarcodeDetector + paste) |
| Visitor Verification | Name, phone, flat, approval | Verify, Allow/Deny | `/security` | **DONE** |
| Check-in | Approved visitor | Record Entry | validate API | **DONE** |
| Check-out | Active inside | Record Exit | `/security` | **DONE** |
| Manual Entry | Visitor + purpose | Create Entry (policy) | `/visitors` | **DONE** → PENDING approval |
| Deliveries | Delivery, flat, time | Record, Complete | `/visitors` | **PARTIAL** — visitType; dedicated module **GAP** |
| Visitor History | Past records | Search, Filter, View | `/security` | **DONE** |
| Emergency | Contacts / procedures | View | `/emergency` | **DONE** |
| Profile | Account | Edit permitted | `/profile` | **GAP** — view only |

**Forbidden:** Edit approvals as final authority beyond create-pending; payments; receipts; resident finances; property CRUD.

---

## 5. STAFF — Work management

| Screen | Display | Required actions | Route | Status |
|---|---|---|---|---|
| Dashboard | Assigned / pending / completed | View | `/tasks` KPIs | **DONE** |
| My Tasks | Name, priority, due | View, Accept | `/tasks` | **PARTIAL** — status update **DONE**; explicit priority/due **GAP** |
| Task Details | Description, location, assigned | Start, Update status | modal | **DONE** |
| Complaints | Assigned | View, Update | `/complaints`, `/tasks` | **DONE** |
| Work Updates | Notes + photos | Add, Edit own draft | comments + evidence URL | **PARTIAL** — notes **DONE**; binary photos **GAP** |
| Completion | Evidence | Submit completion | evidence URL + RESOLVED | **PARTIAL** |
| History | Completed work | View, Filter | `/tasks` filters | **PARTIAL** |
| Payments (desk) | Outstanding | Record if policy | `/payments` | **DONE** |
| Notifications | Assignments | View, Mark read | push / page | **PARTIAL** |
| Profile | Staff info | Edit permitted | `/profile` | **GAP** |

**Mobile tabs:** Tasks · Desk · Pay · Guests · You — **DONE**

---

## 6. Cross-role permission matrix

| Module | SUPER | APT_ADMIN | STAFF | SECURITY | RESIDENT |
|---|---|---|---|---|---|
| Apartments | CRUD+Archive | R / limited U | — | — | — |
| Blocks/Floors/Flats | CRUD | CRUD own | — | — | R own flat |
| Residents | CRUD soft | CRUD soft | — | — | — |
| Occupancy | Alloc/Release/Hist | Same | — | — | R own |
| Bills | Create | Create | — | — | R + Pay own |
| Payments | Record | Record | Record | — | Pay own |
| Receipts | R | R | R | — | R own |
| Parking | CRUD alloc | CRUD alloc | — | — | R own |
| Visitors | Full | Full own | Assist | Validate/Exit + pending create | Create + Approve own |
| Complaints | Full | Full | Update assigned | — | Create/Comment |
| Notices | CRUD | CRUD | R | R | R |
| Users Staff/Sec | CRUD | CRUD own apt | — | — | — |
| Audit | R global | R own | — | — | — |
| Reports | R | R own | — | — | — |

---

## 7. Business rules (all related screens)

1. No duplicate active occupancy (flat / resident)  
2. Occupancy history preserved on release  
3. No duplicate active parking vehicle per society  
4. Payment ledger append-only; receipt refs immutable  
5. Unique bill per flat + type + period  
6. Visitor QR: expiry, single use, approval before entry when PENDING  
7. Entry/exit tracked; exit requires check-in  
8. Complaint status transitions + history  
9. Audit sensitive mutations  
10. Role + apartment isolation in API  

---

## 8. Priority backlog (from this spec)

### P0 — Spec completeness for admin day-to-day
1. Block/Floor **Delete if unused**  
2. Parking slot **Edit**  
3. Billing **draft edit + cancel** (or explicitly mark “no draft; create-only”)  
4. Receipts **Download / Share**  
5. Reports **Export**  
6. Profile **Edit permitted fields** (all roles)  

### P1 — Resident / staff polish
7. Resident **cancel** visitor pass  
8. Parking **request additional slot**  
9. Staff binary **photo evidence** upload  
10. Complaint **priority** field  
11. Water/Electricity consumption/meter fields (or document amount-only model)  

### P2 — Platform
12. Dedicated **Assign Admin** on Apartment Details  
13. Phone on resident/user models if required by display columns  
14. Full **global settings** console for SUPER_ADMIN  
15. Dedicated **Deliveries** module vs visitType filter  

---

## 9. Routes

| Path | Intent |
|---|---|
| `/` | Admin / staff overview |
| `/m` | Resident home |
| `/property` | Apartments → blocks → floors → flats |
| `/residents` | Residents CRUD + occupancy actions |
| `/occupancy` | Occupancy allocate / release / history |
| `/users` | Admins, staff, security |
| `/billing/maintenance\|water\|electricity` | Bills |
| `/payments` `/receipts` | Money |
| `/parking` `/visitors` `/security` | Ops / gate |
| `/complaints` `/tasks` | Tickets / staff work |
| `/notices` `/family` `/emergency` | Comms / household / SOS |
| `/reports` `/settings` `/more/audit` | Insights / config / compliance |
| `/profile` `/more/notifications` | Account |

---

## 10. Related docs

- `SCREEN_INVENTORY.md` — earlier gap scan  
- `MODULE_COMPLETION_REPORT.md` — delivery & API test notes  

**Definition of Done:** For a screen in §§1–5, every cell under **Required actions** is **DONE** (or explicitly waived in product policy), plus §0 common UI contract.

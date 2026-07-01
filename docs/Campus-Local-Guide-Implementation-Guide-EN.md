# Campus Local Guide — Implementation Guide (WDP backlog) [EN, agent-oriented]

> **Audience:** (1) a developer picking up one ticket, (2) an AI coding agent (Claude Code / Cursor) executing one ticket.
> **How to use:** 1 ticket = 1 feature `Fxx` = 1 Jira issue `WDP-xx`. Find your ticket in **§4**, read the block top to bottom, build, verify against **Definition of Done (DoD)**.
> **Read before touching any ticket:** §1 (global context) + §2 (invariants). These are non-negotiable.
> **References:** `BR-xx` -> see `Campus-Local-Guide-SPECS-EN.md` §9 · `UC` -> SPECS · `HF-x` -> the detailed flow in SPECS §6 (ownership/verification) · `M1-M5` -> §1.3 below.
> **Task source:** Jira project **WDP** (site `fptp.atlassian.net`), 35 tasks `WDP-5 -> WDP-39`.
> **Jira status mapping (board is in Vietnamese):** `Đã xong! = Done` · `Đang làm = In Progress` · `Đang test = In Testing` · `Cần làm = To Do`. Owner names and the importance label (`Core / High / Medium`) are kept as the author wrote them.

---

## 0. Conventions & execution protocol

### 0.1 General conventions
- The **owner** in each block is the primary responsible person, **not the only one allowed to touch it** — any agent/dev can build it after reading the full block.
- **Status** comes live from Jira (at time of writing: `Done / In Progress / In Testing / To Do`). When reading, prefer the live Jira status.
- Every ticket is a **flat Task** (no subtasks). Dependencies live in §3, not in the `parent` field.

### 0.2 Protocol for an AI agent (follow this order when picking up a ticket)
1. **Read §1 + §2** (if not already in context).
2. Open the ticket block in §4 -> read `Depends`. If a dependency is **not built yet** -> stub the interface against **API contract v1** (F01), build your part, and mark the seam with `// TODO: depends on Fxx`. **Do not** invent the logic of another ticket.
3. **Never invent a new BR.** If a rule is ambiguous -> choose the **stricter** (safer) interpretation and leave a `// RULE-AMBIGUOUS: <description>` comment for the reviewer.
4. Build per `Notes` -> enforce every item in `Rules` -> self-test against `DoD`.
5. Before closing: re-run the §2 invariant checklist against the code you just wrote.

### 0.3 Priority (from Jira field "Quan trọng")
`Core` > `High` > `Medium`. When short on time, cut from `Medium` upward; **never** cut `Core`.

---

## 1. Global context (read once before coding)

### 1.1 Repo layout (pnpm monorepo)
```
campus-local-guide/
├── api/         # NestJS (Flat MVC) — backend, REST, business logic
├── web/         # Next.js 15 + MUI v6 — admin/web client
├── mobile/      # Expo / React Native — main app (Customer/Vendor/Admin)
└── packages/
    └── shared/  # TypeScript types shared across all 3 apps (DTO, enum, contract)
```
- **Database:** MongoDB + Mongoose. Schema follows the ERD (locked in F01).
- **Auth:** JWT, role-based (Customer/Vendor/Admin) + guest read-only.
- **Map:** Goong Maps (Google Maps API-compatible format).
- **Files/images:** Supabase Storage.

### 1.2 Per-app conventions
| App | Convention |
|---|---|
| `api` | NestJS Flat MVC: one module per domain (controller -> service -> mongoose model). DTO + validation in `shared`. Every response follows **API contract v1**. |
| `web` | Next.js 15 (App Router) + MUI v6. Mainly for **Admin** (moderation queues, dashboards, management). |
| `mobile` | Expo. Navigation by 3 roles + auth guard (F02). Mainly for **Customer + Vendor**. |
| `shared` | Single source of truth for **types/enums/DTOs**. Change a status/enum here; never hardcode it across apps. |

> **Golden rule for agents:** every `status`, `role`, `trust_level`, report type, notification type, etc. must be an **enum in `shared`**, not a magic string. If the enum doesn't exist yet -> create it in `shared` first.

### 1.3 Shared mechanisms (M1-M5) — build once, reuse everywhere
These are **not** standalone features; they are **shared services**. Do not reimplement them per ticket — call the service.

| ID | Service | Built in ticket | Callers |
|---|---|---|---|
| **M1** | Duplicate detection (string similarity + Haversine < 50m) | **F14 / WDP-18** | F13 (submit), F25 (vendor register) |
| **M2** | Trust engine (TrustEvent + scoring + level + gating) | **F29 / WDP-33** | F15, F22, F27 (everywhere content is resolved) |
| **M3** | Notification (email + SMS/OTP + in-app) | **F03 / WDP-7** | F04, F06, F15, F22, F23, F24, F26, F27, F28, F31 |
| **M4** | Location handling (fused location + accuracy + manual pin + reverse geocode) | shared inside **F08/F13** | F13, F25 (record pin<->device distance) |
| **M5** | Geographic scoping (reject outside the Hòa Lạc radius) | shared validation | F13, F25 (at location creation) |

> **Audit log** (BR-43) should also be a **shared utility from S1** (every Admin action logged), even though the *dashboard* to view logs is only built in F35/S4. Do not defer audit to S4 — you'd miss logs for S2/S3 actions.

### 1.4 Domain objects & status — quick reference
Full detail in SPECS §7-8. Condensed so the agent doesn't have to look it up:

- **Location.status:** `SUBMITTED -> PUBLISHED -> HIDDEN/PENDING_RE_APPROVAL -> ...`; `REJECTED`; `DELETED` (soft).
- **Ownership:** `no-owner` (tier B) <-> `owned` (tier C). Set via claim/register/transfer; removed via release/revoke.
- **Review.status:** `PUBLISHED / DELETED / REMOVED_BY_ADMIN`.
- **Claim.status:** `PENDING / APPROVED / REJECTED / REVOKED / RELEASED`.
- **Report.status:** `PENDING / RESOLVED / DISMISSED`.
- **Dispute.status:** `OPEN / RESOLVED_KEEP / RESOLVED_TRANSFER / RESOLVED_REVOKE`.
- **User:** `ACTIVE / WARNED / BANNED`; `trust_level: RESTRICTED / NEW / TRUSTED` (T=30).
- **RequestAccess:** `PENDING / GRANTED / REJECTED / EXPIRED->AUTO_GRANTED / ESCALATED`.
- **EditSuggestion:** `PENDING / APPLIED / DISCARDED / VOIDED`.
- **OwnershipHold:** `ACTIVE / EXPIRED`.

---

## 2. Non-negotiable invariants (every ticket must hold — checklist before closing)

This is the section **agents violate most often**. Read carefully. One violation = ticket fails review.

| # | Invariant | BR | Anti-pattern to avoid |
|---|---|---|---|
| I1 | **No hard delete** of business data (Location, Review). Only set status `DELETED/HIDDEN/REMOVED`. | BR-35, BR-47 | `Model.deleteOne()` on Location/Review |
| I2 | **Only `PUBLISHED`** appears publicly / in search / share / trending. | BR-11 | a query that forgets the status filter |
| I3 | **Guests are read-only.** Every write action (bookmark/review/report/claim/submit) -> require login. | BR-21 | a write endpoint with no auth guard |
| I4 | **Every Admin action writes an AuditLog** (who/what/when/why); logs are immutable. | BR-43 | resolving a report / banning without logging |
| I5 | **"Creating data != ownership".** Submit/contribute does **not** assign an owner. Ownership comes only from claim/register-with-proof/transfer. | §3, BR-60 | setting `owner` when a Customer submits |
| I6 | **1 location = 1 owner; 1 PENDING slot** (claim **or** request-access) at a time. | BR-28, BR-61 | two PENDING claims in parallel |
| I7 | **Every price field** carries a locked "Reference price" disclaimer. | BR-16 | rendering a bare price |
| I8 | **All ownership/content changes emit a TrustEvent via M2**; never add/subtract points ad hoc. | §10 | `user.trust_score += 5` in a controller |
| I9 | **Locations outside the Hòa Lạc radius are rejected.** | BR-40 (M5) | creating a location without validating coordinates |
| I10 | **Vendors cannot delete customer reviews**; only Admin removes. Vendors **cannot** review their own location. | BR-18, BR-48 | an endpoint letting a vendor delete a review |

> **Reversibility (founding principle #4):** every destructive action must be reversible + leave a trace. When unsure "delete or hide?" -> **always hide (soft)**.

---

## 3. Build order & dependency map

### 3.1 Sprint order (already on Jira)
| Sprint | Goal | Tickets |
|---|---|---|
| **S1** | Foundation + Auth | WDP-5, 6, 7, 8, 9, 10 |
| **S2** | Discovery + contribution core + Trust | WDP-11, 12, 13, 14, 15, 17, 18, 19, 23, 33, 34 |
| **S3** | Ownership + Report + Admin/Vendor management | WDP-16, 25, 26, 27, 28, 29, 30, 35, 36, 37 |
| **S4** | Advanced moderation + Dashboards | WDP-20, 21, 22, 24, 31, 32, 38, 39 |

### 3.2 Key dependencies (what blocks what)
```
F01 (repo/contract/schema, WDP-5) ─── blocks EVERYTHING
F03 (notification, WDP-7) ─── blocks every flow that notifies: F04,F06,F15,F22,F23,F24,F26,F27,F28,F31
F04+F05 (auth) ─── block every feature that needs login
F29 (trust M2, WDP-33) ─── shared service, build early in S2 -> called by F15,F22,F27
F14 (dedup M1, WDP-18) ─── shared service -> called by F13,F25

F13 (submit) -> needs F14 (M1) + F08 (pin/map) -> creates SUBMITTED -> F15 (admin approve)
F19 (review) -> needs location/detail + F29 (trust +2)
F23 (claim) -> needs F03 (OTP) + code issuance -> F24 (admin review claim)
F25 (vendor register) -> needs F13(form) + F23 proof mechanism + F15(approve)
F26 (request-access) -> needs ownership to exist (F24/F25) + F03
F27 (dispute) -> needs F21/F22 (report routing) + F26 + F03
F28 (appeal) -> needs the decisions it can appeal: F16,F24,F15,F27,F22,F31  (build last)
F16 (confirm duplicate) -> needs F14 (suspected flag) + F28 (appeal hook)
F17+F18 (suggest-edit) -> needs F10(detail) + F24(ownership for routing) + F15(re-approval mechanism)
F32 (vendor manage) -> needs ownership + F15 (re-approval)
F33 (products) -> needs F32
F34 (vendor dashboard) -> needs F32 + review/view stats
F35 (audit+dashboard) -> audit LOGGING shared from S1; dashboard VIEW in S4
```

### 3.3 Critical path (the chain that must not slip)
`F01 -> F03 -> F04/F05 -> F13+F14 -> F15 -> F23+F24 -> F26 -> F27`. This is the ownership backbone — slipping it slips the demo.

---

## 4. Per-ticket implementation specs

> Each block, in order: **Goal** · **Depends** · **Touches** · **Rules** · **Notes** · **DoD** · **Avoid**.

---

### SPRINT 1 — Foundation + Auth

#### WDP-5 · F01 — Project bootstrap + API contract + DB schema  `Done` · owner: Dương · **Core**
- **Goal:** Stand up the monorepo (api/mobile/web/shared), DB per ERD, **lock API contract v1** so the team can build in parallel; CI lint+test green.
- **Depends:** none (root).
- **Touches:** whole repo + `shared` (types/enums/DTOs) + Mongoose models.
- **Rules:** every status enum from §1.4 must be declared in `shared` right here.
- **Notes:** contract v1 must be published to the team (Swagger/openapi or a `shared` file). One `GET /health` endpoint.
- **DoD:** clone-and-run works; contract published; health-check returns 200.
- **Avoid:** scattering types across apps — everything lives in `shared`.

#### WDP-6 · F02 — Mobile app shell + navigation  `Done` · owner: Minh · **High**
- **Goal:** Expo: navigation for 3 roles (Customer/Vendor/Admin), theme, **auth guard**, env config, error boundary.
- **Depends:** F01.
- **Touches:** `mobile`.
- **Rules:** I3 (guest read-only): screens that need login must be blocked when unauthenticated.
- **DoD:** screens switch by role; login-required screens blocked for guests.

#### WDP-7 · F03 — Notification service (Email + SMS/OTP + in-app)  `In Progress` · owner: Đăng · **High**
- **Goal:** Adapter to send email, **send OTP via SMS**, in-app inbox + mark-as-read; templates per the notification catalog (SPECS §14).
- **Depends:** F01.
- **Touches:** `api` (Notification module = **M3**), `mobile`/`web` (inbox UI).
- **Rules:** this is **M3** — every other flow **calls this service**, never sends directly.
- **Notes:** design a stable interface: `notify(recipient, eventType, payload)`. OTP: 5-minute expiry, max 5 wrong attempts (BR-03).
- **DoD:** real OTP sends; inbox shows + marks read; other flows can call it through the interface.
- **Avoid:** hardcoding content in each caller — centralize templates by eventType.

#### WDP-8 · F04 — Registration + OTP for Vendor  `In Progress` · owner: Đăng · **Core**
- **Goal:** Two-role form; **Vendor must verify phone** (OTP); email unique; password hashed.
- **Depends:** F03 (OTP), F01.
- **Touches:** `api` (Auth), `mobile`.
- **Rules:** BR-01 (email unique), BR-02 (Vendor verifies phone, Customer optional), BR-03 (OTP 5min/5 attempts), BR-04 (hash password).
- **Notes:** a Vendor **without OTP cannot create an account**. A Customer who skips phone -> skips OTP (AF01.1).
- **DoD:** both account types can be created; a Vendor missing OTP is rejected.
- **Avoid:** storing plaintext passwords.

#### WDP-9 · F05 — Login / Logout  `Done` · owner: Minh · **Core**
- **Goal:** JWT; `BANNED` accounts blocked with a reason.
- **Depends:** F04, F01.
- **Rules:** BR-05 (5 wrong attempts -> 15-min lock), BR-06 (BANNED gets no session).
- **DoD:** login by correct role; logout destroys the session; BANNED blocked with reason.

#### WDP-10 · F06 — Forgot / reset password  `In Testing` · owner: Đăng · **High**
- **Goal:** Email reset link, 15-min expiry, single use; on reset, **invalidate all old sessions**.
- **Depends:** F03 (email), F04.
- **Rules:** BR-07 (invalidate old sessions), BR-08 (link 15min/single use).
- **Notes:** nonexistent email -> still respond "sent if it exists" (AF03.1, anti-enumeration).
- **DoD:** receive link -> reset -> old link is dead; old sessions logged out.

---

### SPRINT 2 — Discovery + contribution core + Trust

#### WDP-11 · F07 — Manage profile  `In Testing` · owner: Đăng · **Medium**
- **Goal:** Edit name/avatar (Supabase)/phone; **Vendor changing phone must re-verify via OTP**; email cannot change.
- **Depends:** F04, F03 (OTP), Supabase.
- **Rules:** BR-09 (Vendor phone change -> OTP on new number), BR-10 (no email change).
- **DoD:** info saves; avatar uploads; Vendor phone change requires OTP.

#### WDP-12 · F08 — Core map (Goong + clustering)  `In Testing` · owner: Minh · **Core**
- **Goal:** Map with **viewport-based loading + clustering** to prevent lag on zoom-out; marker -> open detail.
- **Depends:** F01, Goong.
- **Touches:** `mobile`/`web` + an endpoint returning locations by bounding box.
- **Rules:** BR-41 (viewport + clustering — **mandatory**, do not load all points), I2 (only PUBLISHED).
- **Notes:** this is the case the project notes flagged: **no clustering = lag during the demo when zoomed out**. The API takes `bbox` + zoom, returns clusters at low zoom and points at high zoom.
- **DoD:** zoom-out doesn't stutter; clusters render; tapping a cluster zooms in.
- **Avoid:** `find(all locations)` then rendering everything.

#### WDP-13 · F09 — Search + filter + list  `To Do` · owner: Minh · **Core**
- **Goal:** Keyword + filter by category/subcategory/tag/area; **only PUBLISHED**; empty state suggests contributing.
- **Depends:** F08, F30 (categories/tags to filter on).
- **Rules:** BR-11 (I2).
- **DoD:** search + filter correct; list paginates; empty -> CTA to contribute (UC07).

#### WDP-14 · F10 — Location detail + share  `In Progress` · owner: Minh · **Core**
- **Goal:** Photos, hours, products (price disclaimer), reviews + avg rating, **Verified badge**, dedup-safe view count, deeplink share.
- **Depends:** F08; integrates output of F19 (reviews), F33 (products) — can stub first.
- **Rules:** BR-12 (1 view per open, deduped within a short window), BR-16 (price disclaimer), I2 (HIDDEN/DELETED -> "unavailable").
- **Notes:** the "Verified" badge shows only when `owned` (tier C). Use placeholders for reviews/products if those tickets aren't done.
- **DoD:** full info renders; view_count increments dedup-safe; deeplink copies.

#### WDP-15 · F11 — Bookmark  `To Do` · owner: Đăng · **Medium**
- **Goal:** Save/unsave, a "Saved" page; one pair per user; guest -> login.
- **Depends:** F04, F10.
- **Rules:** BR-23 (one pair per user), BR-21 (I3).
- **DoD:** add/remove bookmark; list correct; guest pushed to login.

#### WDP-17 · F13 — Submit location (Customer)  `To Do` · owner: Long · **Core**
- **Goal:** Form + **drop pin** (accuracy > 50m forces manual drag, **record pin<->device distance**) + 1-5 photos + 3/day quota -> create `SUBMITTED`. *(HF-1)*
- **Depends:** F08 (map/pin = M4), **F14 (M1 dedup)**, F04.
- **Touches:** `api` (Location), `mobile`.
- **Rules:** BR-22 (3/day), BR-42 (accuracy>50m -> drag pin), BR-59 (record distance -> soft flag), **I5 (DO NOT assign owner)**, BR-26 (RESTRICTED blocked from submit), BR-40/M5 (within radius).
- **Notes:** call **M1 (F14)** before creating: on suspected duplicate -> offer "not a duplicate" (flag it) or view the original. TRUSTED -> fast-track (still no-owner, BR-25).
- **DoD:** submit works -> status `SUBMITTED`, owner = null; over quota is blocked; poor accuracy forces a pin drag.
- **Avoid:** **never** set owner here (I5). Don't create a location outside the radius (I9).

#### WDP-18 · F14 — Duplicate detection (M1)  `To Do` · owner: Long · **Core**
- **Goal:** String similarity + Haversine; **similarity > 0.8 AND distance < 50m -> warn**; rule-based, **no AI**.
- **Depends:** F01.
- **Touches:** `api` (shared **M1** service).
- **Rules:** BR-13 (threshold), BR-58 (suspected != confirmed-duplicate — warn only, **do not auto-hide**).
- **Notes:** return a list of duplicate candidates + score; never auto-block. Use a string-similarity lib; Haversine from coordinates.
- **DoD:** a nearby + similar-name submit warns at the right threshold; far or different name -> no warning.
- **Avoid:** calling any LLM/AI. Changing the location status yourself.

#### WDP-19 · F15 — Admin approve locations  `To Do` · owner: Dương · **High**
- **Goal:** Queue of `SUBMITTED` + `PENDING_RE_APPROVAL`; **approve/reject with a reason**; show suspected-duplicate + far-pin flags; hook trust +/-. *(HF-1)*
- **Depends:** F13 (something to approve), **F03 (notify)**, **F29 (M2 trust)**.
- **Touches:** `web` (Admin queue), `api`.
- **Rules:** BR-44 (approve -> +points; reject for violation -> -points via **M2**), BR-43 (I4 audit), BR-30 (approving `PENDING_RE_APPROVAL` -> apply the new info).
- **Notes:** approve -> `PUBLISHED` + M2 +15 + M3 "approved". Reject -> `REJECTED` + reason + M3 + allow edit & resubmit. Reject-as-duplicate -> attach the original link.
- **DoD:** approval changes status correctly; submitter notified; audit written; trust updated.

#### WDP-23 · F19 — Review  `To Do` · owner: Long · **Core**
- **Goal:** Create/edit/delete; rating 1-5 + content >= 20 chars + <= 3 photos; **1 review/user/location**; block reviewing your own location; recompute avg rating.
- **Depends:** F10 (detail), F29 (trust +2), F04.
- **Rules:** BR-17 (1/user/location, update not duplicate), BR-18 (Vendor can't review own location — **I10**), BR-19 (surviving review -> M2 +2), BR-48 (Vendor can't delete customer reviews).
- **Notes:** banned words -> still display + flag for UC22. Author delete -> `DELETED` + recompute rating; Admin remove -> `REMOVED_BY_ADMIN`.
- **DoD:** constraints hold; avg rating updates on add/edit/delete.
- **Avoid:** letting a Vendor delete customer reviews; reviewing your own location.

#### WDP-33 · F29 — Trust engine (M2)  `In Progress` · owner: Trung · **Core**
- **Goal:** `TrustEvent` + scoring (**+15 / +5 / +2, -10 / -10**); levels `RESTRICTED/NEW/TRUSTED` (T=30); gating: block submit when RESTRICTED, fast-track when TRUSTED. *(HF-9)*
- **Depends:** F01.
- **Touches:** `api` (shared **M2** service).
- **Rules:** BR-25/26/51 (level -> permissions), §10 scoring table, **I8 (all points via M2)**.
- **Notes:** interface: `recordTrustEvent(userId, eventType)` -> updates `trust_score` -> derives `trust_level`. Gating reads the level. Admin can adjust manually (via F31).
- **DoD:** score updates per event; crossing thresholds changes permissions (RESTRICTED blocks submit, TRUSTED auto-publishes).
- **Avoid:** adding/subtracting points outside this service.

#### WDP-34 · F30 — Manage categories  `In Progress` · owner: Trung · **Medium**
- **Goal:** CRUD category/subcategory; **hide instead of hard delete**.
- **Depends:** F01.
- **Rules:** BR-52 (visibility flag), I1 (soft).
- **Notes:** deleting a category in use -> warn with the count of affected locations (EF24.1).
- **DoD:** full CRUD; hide a category instead of hard delete.

---

### SPRINT 3 — Ownership + Report + management

#### WDP-16 · F12 — Top trending  `To Do` · owner: Đăng · **Medium**
- **Goal:** Sort by views + review count + recency, filter by category; missing data -> fallback to "newest".
- **Depends:** F10, F19.
- **Rules:** BR-11 (I2 — only PUBLISHED enters trending).
- **DoD:** leaderboard updates from real data; missing data -> newest.

#### WDP-25 · F21 — Report location / review  `To Do` · owner: Long · **High**
- **Goal:** Report by type (wrong info/spam/closed/**wrong owner**/other); 1 PENDING per target per type; "wrong owner" routes to a dispute.
- **Depends:** F10, F04.
- **Rules:** BR-24 (1 PENDING per target per type), I3 (guest -> login).
- **Notes:** the "wrong owner" type creates a path to **F27 (Dispute)** (AF11.1).
- **DoD:** report works; duplicate reports blocked; "wrong owner" routes correctly.

#### WDP-26 · F22 — Admin handle reports  `To Do` · owner: Trung · **High**
- **Goal:** Queue -> resolve/dismiss; remove review (recompute rating); **trust hook** (+5 correct / -10 malicious); escalate to user ban when severe.
- **Depends:** F21, **F03**, **F29 (M2)**, F31 (ban).
- **Rules:** BR-27 (malicious -> -10 reporter), BR-48 (only Admin removes reviews), BR-43 (I4 audit).
- **Notes:** remove review -> `REMOVED_BY_ADMIN` + recompute rating. Correct report -> +5 reporter; malicious -> -10. Severe violation -> F31.
- **DoD:** handling changes status; trust updates; audit written.

#### WDP-27 · F23 — Claim location + verification  `To Do` · owner: Dương · **Core**
- **Goal:** **OTP to listing phone** + system-**issued one-time code** + upload **geotagged on-site proof** (signboard + code + timestamp) + optional license; block when a PENDING request already exists. *(HF-3)*
- **Depends:** **F03 (OTP)**, F10, F04.
- **Touches:** `api` (Claim), `mobile`.
- **Rules:** BR-14 (OTP + on-site proof **mandatory**), BR-15 (license optional, verification = physical control), **BR-61/I6 (1 PENDING slot)**, BR-02 (Vendor verified).
- **Notes:** 3 independent factors: **geotag + timestamp + one-time code**. Listing with no phone yet -> skip OTP, rely on on-site proof + closer Admin scrutiny. Already owned -> block, suggest a report if owner looks wrong (-> UC25).
- **DoD:** the claim can only be sent with **all 3 factors**; a duplicate PENDING slot is blocked.
- **Avoid:** allowing a claim missing OTP/proof. Assigning owner at this step (owner is set in F24).

#### WDP-28 · F24 — Admin review claim  `To Do` · owner: Dương · **High**
- **Goal:** Cross-check OTP + on-site proof; **approve -> assign owner + badge**; reject -> new claim without overwrite; allow requesting more evidence.
- **Depends:** F23, **F03**.
- **Rules:** BR-45 (approve only when OTP verified + proof matches), BR-46 (reject -> new claim, **no overwrite**), BR-29 (assign owner), BR-43 (I4).
- **Notes:** approve -> set `owner` + "Verified" badge + M3. If a different owner exists at review time -> route to **F27 (Dispute)** (EF20.1). License -> fast-track.
- **DoD:** approve sets the owner; reject opens a new claim (old record preserved).

#### WDP-29 · F25 — Vendor register new location (auto-own)  `To Do` · owner: Minh · **High**
- **Goal:** Form like F13 + **mandatory on-site proof** to auto-own after approval; **no proof -> falls back to no-owner**, must claim later. *(HF-2)*
- **Depends:** F13 (form), F23 (proof mechanism), **F14 (M1)**, F15 (approve).
- **Rules:** **BR-60/I5 (this is the closed "registering = owning" loophole)**, BR-29 (approve -> assign owner), BR-13 (dedup).
- **Notes:** with proof -> after Admin approval, **auto-own**. Without proof -> created at tier B (no-owner), Vendor must claim (F23) later. Duplicate of an unowned location -> suggest using claim (AF14.1).
- **DoD:** with proof -> auto-own after Admin approval; without proof -> no-owner.
- **Avoid:** **do not** auto-own without on-site proof (this is the "dodge claiming by registering new" attack).

#### WDP-30 · F26 — Request-access + transfer + hold  `To Do` · owner: Dương · **Core**
- **Goal:** **1 PENDING slot per location** (others blocked); notify owner, **3-day deadline (lazy-check)**; grant / reject->appeal / silence->verify-to-claim; **7-day hold** when granted without Admin. *(HF-4)*
- **Depends:** ownership exists (F24/F25), **F03**, F23 (proof).
- **Touches:** `api` (RequestAccess + OwnershipHold), `mobile`.
- **Rules:** BR-61/I6 (1 PENDING slot), BR-56 (7-day hold on auto-transfer / still-appealable), BR-55 (MVP uses **lazy-timeout**, no cron).
- **Notes:** **3-day lazy-check:** compute the deadline on access / when B taps "verify to take ownership" — **no cron job**. Three branches: (a) owner Grants -> transfer + hold; (b) owner Rejects -> B appeals -> open Dispute (F27); (c) owner stays silent past deadline -> B verifies -> auto-transfer + **mandatory hold**. The hold blocks: hiding the location / mass-deleting products / changing core info; benign edits still allowed.
- **DoD:** all 3 response branches work; the hold blocks the right destructive actions; only 1 PENDING slot.
- **Avoid:** building a real-time cron (that's Phase 2). Enabling the hold when the transfer is decided directly by Admin (see F27).

#### WDP-35 · F31 — Admin manage accounts  `To Do` · owner: Trung · **High**
- **Goal:** Ban/warn/change role/**manual trust adjust**; can't self-ban; always >= 2 Admins.
- **Depends:** **F29 (M2 for trust adjust)**, F03.
- **Rules:** BR-49 (no self-ban), BR-50 (>= 2 Admins), BR-51 (level -> permissions), BR-43 (I4).
- **Notes:** manual trust adjust still goes through M2 (emit a TrustEvent of type "admin_adjust"). Demoting the last Admin -> warn (EF23.2).
- **DoD:** user status changes + audit written; self-ban blocked; dropping below 2 Admins blocked.

#### WDP-36 · F32 — Vendor manage owned locations  `To Do` · owner: Minh · **High**
- **Goal:** Edit hours/description/photos/phone; **name/address change -> `PENDING_RE_APPROVAL`** (public keeps the old version); hide instead of delete; release ownership.
- **Depends:** ownership (F24/F25), F15 (re-approval).
- **Rules:** BR-30 (name/address change -> re-approval, public keeps old info), BR-35/I1 (hide, no hard delete).
- **Notes:** benign edits (hours/description) -> apply immediately. Major edits (name/address) -> create a pending version, public keeps the old one until Admin approves. If ownership is revoked -> block editing. **During a hold (F26)** -> block destructive actions.
- **DoD:** benign edits apply immediately; major edits wait for approval; release -> no-owner.
- **Avoid:** hard-deleting a location (only hide).

#### WDP-37 · F33 — Vendor manage products  `To Do` · owner: Trung · **Medium**
- **Goal:** CRUD <= 50 products/location; **price optional + locked disclaimer**; no cart.
- **Depends:** F32 (ownership).
- **Rules:** BR-37 (<= 50), BR-16/I7 (locked price disclaimer), BR-36 (no commerce).
- **DoD:** CRUD; price always carries "reference price"; over 50 is blocked.

---

### SPRINT 4 — Advanced moderation + Dashboards

#### WDP-20 · F16 — Confirm duplicate + hide  `To Do` · owner: Long · **High**
- **Goal:** Admin confirms a real duplicate -> **`HIDDEN`** + notify with an appeal button; distinguish suspected vs confirmed-duplicate. *(HF-7)*
- **Depends:** F14 (suspected flag), F15 (Admin tooling), **F28 (appeal hook)**.
- **Rules:** BR-58 (two duplicate levels), I1 (HIDDEN, no hard delete), I4 (audit).
- **Notes:** **merge is deferred to Phase 2** — MVP only hides, no merge/review-transfer/view-sum. Hidden -> can open an appeal to F28.
- **DoD:** hidden from search; appeal can be opened.
- **Avoid:** building a merge engine (Phase 2).

#### WDP-21 · F17 — Suggest-edit (submit suggestion)  `To Do` · owner: Long · **High**
- **Goal:** Customer suggests **field-level** edits (hours, phone, drag pin, flags "closed"/"duplicate"/"nonexistent") -> create `EditSuggestion PENDING`. *(HF-8)*
- **Depends:** F10 (detail), F04.
- **Touches:** `api` (EditSuggestion), `mobile`.
- **Rules:** (routing in F18). I3 (guest -> login).
- **DoD:** suggestion submits; lands in the correct queue (per F18).

#### WDP-22 · F18 — Suggest-edit (routing & review)  `To Do` · owner: Long · **Core**
- **Goal:** **Claimed -> Vendor inbox** (Apply/Discard); **no-owner -> Admin queue**; Apply to sensitive fields (name/address) -> re-approval; "duplicate" flag -> push to F16.
- **Depends:** F17, **F24 (ownership for routing)**, F15 (re-approval).
- **Rules:** BR-57 (routing by ownership, **no crowd-voting**), BR-30 (name/address -> re-approval).
- **Notes:** **two ratified spec gaps (see §5):**
  - **Auto-void:** location moves to `HIDDEN`/`DELETED` while a suggestion is still `PENDING` -> set the suggestion `VOIDED` (keep the record for audit), **do not** keep it pending.
  - **Re-route on ownership change:** ownership changes mid-process (claim approved / revoke / release) -> a `PENDING` suggestion **re-routes** to the correct inbox/queue for the new owner, not the stale route.
- **DoD:** routes correctly by ownership state; Apply updates info (name/address -> awaits approval); auto-void & re-route work.
- **Avoid:** crowd-voting. Applying an edit to an already `HIDDEN/DELETED` location.

#### WDP-24 · F20 — Vendor reply to review  `To Do` · owner: Minh · **Medium**
- **Goal:** Vendor views reviews on owned locations, **replies once per review**, can edit the reply; notify on a new review.
- **Depends:** F19, F32 (ownership), F03.
- **Rules:** BR-38 (1 reply/review), BR-39 (owned locations only).
- **DoD:** reply shows under the review; a second reply is blocked.

#### WDP-31 · F27 — Resolve dispute  `To Do` · owner: Dương · **Core**
- **Goal:** Two-party case + evidence from the report; decide **keep / transfer / revoke**; revoke -> no-owner reopens claim; **Admin-decided transfer -> NO hold**. *(HF-5)*
- **Depends:** F21/F22 (report routing), F26 (transfer), F03.
- **Rules:** BR-53 (physical control > license), BR-54 (revoke -> no-owner, reopen claim), BR-56 (Admin-decided transfer has **no** hold), I4 (audit).
- **Notes:** three outcomes: `RESOLVED_KEEP` / `RESOLVED_TRANSFER` (set new owner, **no hold** since Admin vetted) / `RESOLVED_REVOKE` (no-owner, reopen claim). Both sides weak -> keep no-owner. Fraudulent owner -> revoke + consider ban (F31).
- **DoD:** all 3 outcomes work; audit written; Admin-decided transfer does not enable a hold.

#### WDP-32 · F28 — Appeal  `To Do` · owner: Dương · **High**
- **Goal:** **Once per decision, 14-day window, a DIFFERENT Admin reviews**; applies to duplicate-hide / claim reject / location reject / revoke / review removal / ban; `OVERTURNED` -> restore. *(HF-6)*
- **Depends:** the decisions: F16, F24, F15, F27, F22, F31; F03.
- **Rules:** **BR-63..67** (appeal rule set — see Warning below), I4 (audit).
- **Notes:** the appeal must be reviewed by a **different Admin** than the one who made the original decision (anti-bias). `OVERTURNED` -> restore the prior state (un-hide / re-publish / restore owner / un-ban / restore review). One appeal per decision.
- **DoD:** submit with evidence; a decision can be overturned -> restored.
- **Warning:** this ticket references **BR-63..67** but the SPECS currently has only **BR-63** (appeal as a single line). **Expand the SPECS to BR-63..67** before the defense (proposed split: BR-63 scope / BR-64 "once per decision" / BR-65 "different Admin reviews" / BR-66 "14-day window" / BR-67 "OVERTURNED -> restore"). Otherwise the committee finds a ticket citing rules the spec lacks.

#### WDP-38 · F34 — Vendor dashboard + stats  `To Do` · owner: Trung · **Medium**
- **Goal:** List of owned locations; stats for views / review count / avg rating, filter 7/30 days.
- **Depends:** F32, F19 (reviews/rating), F14/F10 (views).
- **Rules:** I2 (stats only from the vendor's PUBLISHED locations).
- **DoD:** stats render correctly per location; 7/30-day filter works.

#### WDP-39 · F35 — Audit log + Admin dashboard  `To Do` · owner: Trung · **Medium**
- **Goal:** Log **every Admin action** (who/what/when/why); dashboard counts users, locations by status, reviews.
- **Depends:** cross-cutting (every Admin feature: F15,F16,F22,F24,F27,F28,F30,F31).
- **Rules:** BR-43/I4 (logs are immutable).
- **Notes:** **audit *logging* must be a shared utility from S1** — this S4 ticket is mostly the **dashboard VIEW + a log table**. If S2/S3 tickets didn't log -> go back and add the logging calls; don't leave the dashboard empty.
- **DoD:** logs cannot be deleted; overview dashboard shows correct counts by status.

---

## 5. Two ratified spec gaps (encoded into F18/WDP-22)

These two decisions are **final** and embedded in ticket F18. This is the official behavior of `EditSuggestion`:

**(1) Auto-void when a location leaves `PUBLISHED`.** An EditSuggestion in `PENDING` whose location becomes `HIDDEN`/`DELETED` -> the suggestion moves to **`VOIDED`** (record kept for audit), not kept pending.

**(2) Re-route when ownership changes mid-process.** A `PENDING` EditSuggestion whose ownership changes (claim approved / revoke / release) -> **re-route** to the correct inbox/queue for the new owner (claimed->Vendor, no-owner->Admin), handled by the new route.

Final EditSuggestion state machine:
```
PENDING ──Apply──────────────────────────────> APPLIED
PENDING ──Discard────────────────────────────> DISCARDED
PENDING ──location HIDDEN/DELETED────────────> VOIDED       (auto, record kept)
PENDING ──ownership change───────────────────> PENDING      (re-route, state unchanged)
```

> The defense argument for **auto-void vs keeping pending** is in the chat answer (kept out of the build guide on purpose).

---

*Implementation Guide (EN) — Campus Local Guide (WDP backlog). Tracks all 35 Jira tickets; detailed rules in `Campus-Local-Guide-SPECS-EN.md`. When a ticket and the SPECS diverge -> build to the ticket (build target) and flag the SPECS for fixing. Already flagged: (a) the correct Jira cloud ID is `bdacd6a5-...` (not the one in older memory); (b) appeals require expanding the SPECS BR-63 -> BR-63..67.*

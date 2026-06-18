# TradeSync Pro System Contract Matrix

Single source of truth for cross-project integration contracts between:
- trade-sync-backend
- trade-sync-frontend
- trade-sync-client

Use this file to prevent drift when adding features with AI or human contributors.

---

## Current Delivery Scope (Locked)

This repository currently includes implemented Phase 1 stabilization, Phase 2 desktop UI shell/view refactor work, and **Phase 3 backend** features: master profile **analytics** (`riskMetrics`, `equitySparkline`, `activeHoursSummary` from capped CLOSED `TradeLogs`) and the **public** `POST /auth/node-action/revoke-subscriber` endpoint (master auth via license key; unsubscribes slave from master, no JWT).

In scope now:
- End-to-end contract tests for critical flows only
- Structured logging with trace IDs across master, backend, and slave
- Reconnect and health-state handling across client and backend
- Phase 3 master profile analytics and desktop subscriber revoke (as implemented in backend)

Out of scope for now (deferred):
- Contract-breaking API/socket changes
- Backend/Frontend feature tracks not merged in this repo yet
- Delivery expansion items beyond current stabilization + UI refactor + Phase 3 backend scope

Compatibility rule for this phase:
- No contract-breaking changes are allowed while implementing stabilization.

Implemented stabilization notes:
1. `trace_id` is now propagated as an optional cross-layer field for observability.
2. Required payload keys remain unchanged and still mandatory.
3. Client reconnect flow now re-emits `register_node` on reconnect.
4. `/auth/verify-node` now returns `id` for direct master/slave user resolution.
5. `TradeLogs.slaveId` supports per-subscriber copied count and P&L once new rows are tagged.
6. `node_registered` confirms socket room assignment back to the registering client.
7. Master desktop shell migration delivered: custom `TitleBar` + `WindowShell` navigation for `broadcast`, `subscribers`, and `performance` views.
8. Master subscriber UI now uses design-system `SubscribersView` (`StatusPill`, activity log, table actions) instead of legacy panel wiring.
9. Master performance UI now uses unified trade aggregation by `master_ticket` so OPEN/CLOSE lifecycle renders as one row with final P&L state.
10. **Phase 3 (backend):** `GET /auth/masters/:id/profile` includes implemented `riskMetrics`, `equitySparkline`, and `activeHoursSummary` when the capped CLOSED `TradeLogs` sample has data.
11. **Phase 3 (backend):** `POST /auth/node-action/revoke-subscriber` lets an active master remove a subscriber’s subscription using `masterLicenseKey` + `slaveId` (clears `subscribedToId`; public route, no JWT).

---

## 1) Service Topology

| Layer | Tech | Default URL/Host | Primary Contract Types |
|---|---|---|---|
| Backend | NestJS + Socket.IO + MSSQL | http://localhost:3000 | REST + WebSocket |
| Frontend | Next.js (App Router) | http://localhost:3001 (expected by backend CORS) | REST consumer + WebSocket consumer |
| Client | Python (PySide6 + MT5) | Local desktop app | REST consumer + WebSocket producer/consumer |
---

## 2) Identity and Role Contract

| Role | Where Defined | Verification Identifier | Verify Endpoint Payload |
|---|---|---|---|
| MASTER | backend Users.role | licenseKey | { "role": "MASTER", "identifier": "<license-key>" } |
| SLAVE | backend Users.role | email | { "role": "SLAVE", "identifier": "<email>" } |
| ADMIN | backend Users.role | login email/password (web) | via /auth/login |

Rules:
- MASTER node registration and verification must use license key.
- SLAVE node registration and verification must use email.
- Changing this identity mapping is a breaking change for both Python client and backend gateway routing.

### JWT (HTTP web API)

- `POST /auth/login` returns `{ access_token: string, user: UserPublic }` (password is never returned). `POST /auth/register` now returns `{ message, email, requiresOtp: true }` and emails a SIGNUP OTP; the access token is issued by `POST /auth/otp/verify-signup` after the user confirms the code. Passwords are stored with bcrypt; legacy plaintext rows in `Users.password` are re-hashed on the next successful login.
- Email verification gate: `register` sets `Users.isEmailVerified = false`; `login` returns **403 `{ requiresOtp: true, email }`** only when the value is explicitly `false`. Existing rows default to `true` (DB-level default), so they are never gated.
- Password reset tokens are signed by the existing `JwtService` with a `purpose: 'PASSWORD_RESET'` claim and TTL `PASSWORD_RESET_TOKEN_TTL`. `JwtStrategy.validate` rejects any token carrying a `purpose` claim, so reset tokens cannot be replayed as access tokens.
- Set env `JWT_SECRET` (required) and optional `JWT_EXPIRES_IN` (default `7d`) on the backend.
- Global `JwtAuthGuard` applies to all routes except those marked `@Public()` in code. Protected routes expect header `Authorization: Bearer <access_token>`.
- **401** when the token is missing, invalid, or expired; **403** when the token is valid but the caller is not allowed (e.g. non-admin calling admin routes, or wrong user id on subscribe/profile/dashboard).

---

## 3) HTTP Contract Matrix

### 3.1 Authentication and User Management

JWT enforcement contract for web REST:
- Protected routes require `Authorization: Bearer <access_token>`.
- Public routes are explicitly marked `Public` in the Notes column.
- Error semantics remain stable: `401` for missing/invalid/expired token, `403` for valid token without permission.

| Route | Method | Backend Handler | Called By | Request Body | Success Response (shape) | Notes |
|---|---|---|---|---|---|---|
| /auth/register | POST | AuthController.register | Frontend register forms | { fullName, email, password, role, licenseKey? } | { message, email, requiresOtp: true } | Public. Creates user with `isEmailVerified=false` and emails a 6-digit SIGNUP OTP. **No `access_token` returned** until OTP is verified. Role is MASTER or SLAVE from frontend forms |
| /auth/login | POST | AuthController.login | Frontend LoginForm | { email, password } | { access_token, user } | Public. Populates Redux auth user + `tsp_access_token`. **403 `{ message, requiresOtp: true, email }`** when `isEmailVerified === false` (only new unverified accounts); frontend redirects to `/verify-email` and resends a SIGNUP OTP |
| /auth/otp/verify-signup | POST | AuthController.verifySignupOtp | Frontend `/verify-email` | { email, code } | { access_token, user } | Public. Verifies the SIGNUP OTP, sets `isEmailVerified=true`, returns the old register session shape (auto-login). Bad/expired code → 400/401 |
| /auth/otp/resend | POST | AuthController.resendOtp | Frontend `/verify-email`, `/forgot-password`, login gate | { email, purpose: 'SIGNUP' \| 'PASSWORD_RESET' } | { message } | Public. Server-side 30s resend throttle; invalidates prior unconsumed codes; sends a new one. Generic message (no existence leak) for PASSWORD_RESET |
| /auth/password-reset/request | POST | AuthController.requestPasswordReset | Frontend `/forgot-password` | { email } | { message } | Public. **Always** returns a generic message; emails a PASSWORD_RESET OTP only when an active user exists |
| /auth/password-reset/verify | POST | AuthController.verifyResetOtp | Frontend `/forgot-password` | { email, code } | { resetToken } | Public. Verifies the PASSWORD_RESET OTP and returns a short-lived single-use JWT carrying `purpose: 'PASSWORD_RESET'` (TTL `PASSWORD_RESET_TOKEN_TTL`) |
| /auth/password-reset/confirm | POST | AuthController.confirmPasswordReset | Frontend `/forgot-password` | { resetToken, newPassword } | { message } | Public. Validates the reset token (must carry `purpose: 'PASSWORD_RESET'`), writes a new bcrypt hash, invalidates related OTPs. Reset tokens are rejected as Bearer access tokens by `JwtStrategy` |
| /auth/users | GET | AuthController.getAllUsers | Frontend admin page | none | user[] (id, fullName, email, role, isActive, licenseKey, createdAt, subscribedToId) | **JWT required.** Role ADMIN only. `subscribedToId` supports admin **Active Subscriptions** KPI (copiers with a non-null master id). |
| /auth/users/:id/license | POST | AuthController.generateLicense | Frontend admin page | none | { message, licenseKey } | **JWT required.** Role ADMIN only |
| /auth/users/:id/toggle-status | PATCH | AuthController.toggleStatus | Frontend admin page | none | { message, isActive } | **JWT required.** Role ADMIN only |
| /auth/verify-node | POST | AuthController.verifyNode | Python Master/Slave controllers | { role, identifier, trace_id? } | { message, role, fullName, id, trace_id? } | **Public.** Pre-flight gate before MT5 operations |
| /auth/node-action/revoke-subscriber | POST | AuthController.revokeSubscriber | Python MasterController (SubscribersView revoke button) | { masterLicenseKey: string, slaveId: string } | { message, slaveId } | **Public.** Desktop-auth via license key. Clears `Users.subscribedToId` for that slave (unsubscribe from this master). Does not change `isActive`. No JWT. |
| /auth/masters | GET | AuthController.getActiveMasters | Frontend SlaveDashboard | none | active master[] | **Public.** Marketplace source |
| /auth/masters/live | GET | AuthController.getLiveMasters | Frontend trader cards | none | { liveIds: string[] } | **Public.** Returns currently connected master socket user IDs. Used for real LIVE badges. |
| /auth/users/:id/subscribe | PATCH | AuthController.updateSubscription | Frontend SlaveDashboard | { masterId: string|null } | { message, subscribedToId } | **JWT required.** Authenticated user id must match `:id`, or caller is ADMIN. null means unsubscribe |
| /auth/masters/:id/profile | GET | AuthController.getMasterProfile | Frontend `/traders` marketplace page (`marketplaceService.getMasterProfile`); Frontend `/traders/:id` detail page; Frontend `CopierDashboard` (`profileService.getMasterProfile` per master on mount); Frontend `ProviderDashboard` (via `getMasterDashboard` response; standalone profile calls via `profileService`); Python `SlaveController._fetch_master_profile` (slave header avatar + name after `node_registered`); Python `MasterWindow.load_performance_stats` (called on dashboard show) | none | { id, fullName, createdAt, totalTrades, closedTrades, winRate, totalPnL, avgVolume, bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime, subscriberCount, isLive, avatarUrl?, riskMetrics?, equitySparkline?, activeHoursSummary? } | **Public.** Returns aggregate stats, live socket status, and public profile fields for one active master. `avatarUrl` is an optional relative path with `?v=` cache-bust query (e.g. `/uploads/avatars/{id}.png?v=...`) or null when no photo. Added Phase 6, isLive added Phase 9. **Phase 3:** When the capped CLOSED sample is non-empty, `riskMetrics`, `equitySparkline`, and `activeHoursSummary` are **implemented** (from the last **2000** CLOSED `TradeLogs`, newest by `COALESCE(closedAt, createdAt)`, via `buildAnalytics`). Fields omitted when there are no rows in that sample or when a given analytic has insufficient data (e.g. sparkline needs ≥2 closes). |
| /auth/masters/:masterId/subscribers | GET | AuthController.getMasterSubscribers | Python MasterController.fetch_subscribers | none | { id, fullName, email, isActive, totalCopied, totalPnL }[] | **Public.** Returns per-slave trade summary using TradeLogs.slaveId. Historical records show 0 until slaveId is populated. |
| /auth/masters/:id/profile | PATCH | AuthController.updateMasterProfile | Frontend MasterProfileSetup; Frontend `ProviderDashboard` (`ProviderProfileForm`) | { bio?, tradingPlatform?, instruments?, strategyDescription?, riskLevel?, typicalHoldTime? } | updated user object | **JWT required.** Caller must be master `:id` or ADMIN |
| /auth/masters/:id/avatar | POST | AuthController.uploadMasterAvatar | Frontend `ProviderDashboard` Profile Setup (`profileService.uploadMasterAvatar`) | multipart field `file` (JPEG/PNG/WebP, max 3 MB) | { avatarUrl: string } | **JWT required.** Caller must be master `:id` or ADMIN. Saves to `uploads/avatars/{masterId}.{ext}` (ext from MIME). Updates `Users.avatarUrl` with path + new `?v=` timestamp on each upload. Replaces prior file; deletes old extension on format change. Multer via `@nestjs/platform-express` `FileInterceptor('file')`. |
| /uploads/* | GET | Express `useStaticAssets` in `main.ts` (not a Nest controller) | Frontend `resolveMediaUrl`; Python `AvatarLabel` (slave header) | none | static file bytes | **Public.** Serves `./uploads` at `/uploads/` without JWT. Registered before Nest guards; avatar images load in marketplace, provider pages, and logged-out smoke tests. |
| /auth/masters/:id/dashboard | GET | AuthController.getMasterDashboard | Frontend `ProviderDashboard` (`profileService.getMasterDashboard`, on mount and after profile save) | none | { profile, recentTrades, subscriberCount, openTrades, totalSignalsSent } | **JWT required.** Caller must be master `:id` or ADMIN |
| /auth/top-masters | GET | AuthController.getTopMasters | Frontend `VerifiedProviderShowcaseBlock` (client component on landing page, `profileService.getTopMasters`) | none | enriched master array (max 3) | **Public.** Top 3 most active masters. Added Phase 7. |

### 3.2 Trade REST

| Route | Method | Backend Handler | Called By | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| /trades/history | GET | TradeController.getTradeHistory | Frontend landing page `LiveTradeFeedCard` (server-side fetch, 60s revalidation); dashboards (potential) | none | latest logs array | **Public.** Returns top 50 via TradeService (`getLatestLogs`; legacy raw `TradeLog` table shape may differ from `TradeLogs` entity rows) |
| /trades/stats | GET | TradeController.getStats | Frontend dashboards (potential) | none | placeholder stats object | **Public.** Currently stub/static |
| /trades/master/:masterId/history | GET | TradeController.getMasterHistory | Frontend `CopierDashboard` — `ProviderTradeHistoryTable` (up to 10 rows for subscribed master, reloads when subscription changes); Frontend `/traders/:id` detail page (full history for PnL chart + last 10 in recent signals table + `TradeHistoryModal`) | none | { id, symbol, action, volume, status, pnl, createdAt, closedAt }[] | **Public.** Returns last 50 trades per master (OPEN + CLOSED). Added Phase 6. |

### 3.3 Status Code Tolerance Matrix

| Contract | Backend Current Behavior | Frontend Expectation | Client Expectation | Risk |
|---|---|---|---|---|
| /auth/login | standard Nest success; **403** for unverified email | success → session; 403 `requiresOtp` → redirect to `/verify-email` | not used | low |
| /auth/register | standard Nest success; returns `{ message, email, requiresOtp }` | redirects to `/verify-email?email=...` | not used | low |
| /auth/otp/* | 200/201 success; 400/401/429 on bad/expired/throttled code | toast error, keep user on OTP screen | not used | low |
| /auth/password-reset/* | 200/201 success; 400/401 on bad/expired code or token | toast error, stay on current reset step | not used | low |
| /auth/verify-node | Nest success (commonly 200/201 in current flow) | not used | Master and Slave accept 200 or 201 | low |

Compatibility recommendation:
- Keep /auth/verify-node success compatible with 200/201 handling in Python controllers.

---

## 4) WebSocket Contract Matrix

### 4.1 Event Names and Direction

| Event Name | Direction | Producer | Consumer | Purpose |
|---|---|---|---|---|
| register_node | client -> backend | Python Master/Slave nodes; Frontend `useIncomingSignals` hook (role=SLAVE, identifier=email) | Backend TradeGateway | Role + identifier registration and room join |
| node_registered | backend -> client | Backend TradeGateway | Python SocketManager | Confirms successful room join after register_node |
| test_signal | client -> backend | Python Master node (MasterRecorder) | Backend TradeGateway | Raw trade lifecycle signal ingestion |
| trade_execution | backend -> clients | Backend TradeGateway | Python Slave; Frontend `useIncomingSignals` hook (CopierDashboard) | Fanout execution signal stream |
| trade_execution_ack | client -> backend | Python Slave (SlaveController) | Backend TradeGateway | Slave reports OPEN execution result (executed/blocked/failed) + copier-side slippage diagnostics |
| subscriber_update | backend -> master client | Backend TradeGateway | Python MasterController (+ `MasterWindow` / `SubscribersView`) | Notifies master when a subscribed slave connects or disconnects |

### 4.2 Payload Schemas

#### register_node payload

```json
{
  "role": "MASTER | SLAVE",
  "identifier": "string"
}
```

#### node_registered payload

Success (MASTER always; SLAVE when subscribed):

```json
{
  "success": true,
  "role": "MASTER | SLAVE",
  "room": "room_master_<id>",
  "timestamp": "ISO string"
}
```

Failure (SLAVE only, when `subscribedToId` is null at registration time):

```json
{
  "success": false,
  "role": "SLAVE",
  "error": "Room assignment failed",
  "timestamp": "ISO string"
}
```

Note: A SLAVE that receives `success: false` is connected to the socket but not in any master room. It will not receive `trade_execution` events until it subscribes to a master (via `PATCH /auth/users/:id/subscribe`) and reconnects or re-emits `register_node`.

#### test_signal payload (from MasterRecorder)

```json
{
  "event": "OPEN | CLOSE",
  "master_ticket": 123456,
  "symbol": "XAUUSD",
  "action": "BUY | SELL | CLOSE",
  "volume": 0.1,
  "pnl": 0.0,
  "masterPrice": 2418.40,
  "trace_id": "uuid-optional"
}
```

`masterPrice` — Optional float. Added in slippage hardening. OPEN uses the master position open price (`pos.price_open`); CLOSE uses the captured closing deal price. Omitted when unavailable. Used by the slave slippage drift guard and persisted on the OPEN `TradeLog` row.

#### trade_execution payload (to consumers)

Current backend emits original signal plus optional server-side additions:

```json
{
  "event": "OPEN | CLOSE",
  "master_ticket": 123456,
  "symbol": "XAUUSD",
  "action": "BUY | SELL | CLOSE",
  "volume": 0.1,
  "pnl": 0.0,
  "masterPrice": 2418.40,
  "trace_id": "uuid-optional",
  "signalId": 101,
  "server_ts": 1748000000000
}
```

Consumer-required keys (must remain stable):
- event
- master_ticket
- symbol
- action
- volume

Optional compatibility keys:
- trace_id (for observability only)
- pnl — Optional float. Present on CLOSE signals from MasterRecorder (sum of MT5 deal profits). Slave `on_trade_signal` reads this as `data.get('pnl', 0.0)` for `daily_pnl` accumulation and loss-limit triggering. Frontend may use for display. Defaults to `0.0` if absent.
- masterPrice — Optional float. Passed through unchanged from `test_signal` (gateway spreads `...data`). The slave drift guard reads it as `data.get('masterPrice')`; absent means the guard skips and the copy proceeds.
- signalId (server-side trade log linkage when present)
- server_ts — Optional. Unix millisecond timestamp. Added Phase 5. Used by frontend for latency display. All existing consumers safely ignore unknown fields.

Note:
- Backend tags TradeLogs.slaveId when exactly one slave is in the room.

#### trade_execution_ack payload (from Slave to backend)

Additive event. The slave reports its OPEN execution result so the backend can persist copier-side pricing and slippage diagnostics on the matching OPEN `TradeLog` row.

```json
{
  "master_ticket": 123456,
  "slave_ticket": 555,
  "symbol": "XAUUSD.m",
  "status": "EXECUTED | BLOCKED_SLIPPAGE | FAILED",
  "masterPrice": 2418.40,
  "copierPrice": 2418.55,
  "slippagePointsConfigured": 20.0,
  "slippagePointsActual": 1.5,
  "slippageBlocked": false,
  "trace_id": "uuid"
}
```

Backend resolves `masterId` from the slave socket's room context, finds the newest OPEN `TradeLog` for (`masterId`, `master_ticket`), and updates `copierPrice`, `slippagePointsConfigured`, `slippagePointsActual`, `slippageBlocked`, and `masterPrice` (only if still null).

Multi-slave caveat: a single master OPEN row is shared across all subscribed slaves, so ACK diagnostics are exact for single-slave rooms and best-effort (last writer) otherwise. Per-slave rows are a future enhancement (mirrors the existing `slaveId` single-slave limitation).

#### subscriber_update payload

```json
{
  "slaveEmail": "string",
  "online": true,
  "timestamp": "ISO string"
}
```

---

## 5) Room Routing and Subscription Contract

| Flow Step | System | Contract |
|---|---|---|
| Slave picks a master | Frontend | PATCH /auth/users/:slaveId/subscribe with masterId |
| Backend stores relation | Backend | Users.subscribedToId updated |
| Slave connects socket | Client | emits register_node with role=SLAVE, identifier=email |
| Backend room assignment | Backend | joins slave socket to room_master_<subscribedToId> |
| Master sends signal | Client | emits test_signal |
| Backend fanout | Backend | emits trade_execution to room_master_<masterId> |

Breaking impact warning:
- Any change to room naming convention room_master_<id> must be coordinated with backend gateway logic and all client registration assumptions.

---

## 6) Data Field Compatibility Matrix

| Concept | Backend Field | Frontend Usage | Client Usage |
|---|---|---|---|
| User ID | Users.id | Redux user.id, admin actions, subscription patch path | not used directly in verify payload |
| Role | Users.role | route guards and dashboard selection | determines verify/register role |
| Master License | Users.licenseKey | admin generated/displayed | MASTER verify identifier |
| Slave Subscription | Users.subscribedToId | Redux and marketplace UI state | backend uses it for room join |
| Active Status | Users.isActive | admin toggle UI | verify-node gate blocks disabled nodes |
| Email Verified | Users.isEmailVerified | drives `/verify-email` flow; login 403 `requiresOtp` gate | not used (verify-node still gates only on `isActive`/role) |
| Email OTP | EmailOtps (email, codeHash, purpose, expiresAt, consumedAt, attempts) | never read directly; consumed via `/auth/otp/*` and `/auth/password-reset/*` | not used |
| Trade Ticket (master) | master_ticket | live table display | ticket_map key for copy/close symmetry |
| Slave Trade ID | TradeLogs.slaveId | not used | recorded by TradeGateway on slave copy confirmation |
| Trade Volume | volume | live table display | risk multiplier input for execution |
| PnL | pnl | optionally displayable | currently generated by MasterRecorder on CLOSE |
| Bio | Users.bio | MasterProfileSetup, MasterProfileCard, TopTradersSection | optionally displayed in marketplace cards |
| Trading Platform | Users.tradingPlatform | MasterProfileSetup, MasterProfileCard, TopTradersSection | marketplace and dashboard identity display |
| Instruments | Users.instruments | MasterProfileSetup, MasterProfileCard, TopTradersSection | slave symbol mapping guidance |
| Strategy Description | Users.strategyDescription | MasterProfileSetup, MasterProfileCard, MasterDashboard | public identity and dashboard preview |
| Risk Level | Users.riskLevel | MasterProfileSetup, MasterProfileCard, TopTradersSection | marketplace risk badge and filtering context |
| Typical Hold Time | Users.typicalHoldTime | MasterProfileSetup, MasterProfileCard, MasterDashboard | identity and trading style context |
| Subscriber Count | derived from Users.subscribedToId | MasterProfileCard, MasterDashboard, TopTradersSection | popularity and social proof display |
| Master entry price | TradeLogs.masterPrice (from `masterPrice` payload) | not used | MasterRecorder emits; slave drift guard input |
| Copier fill price | TradeLogs.copierPrice (from `trade_execution_ack`) | not used | slave reports its fill-side quote |
| Slippage threshold | TradeLogs.slippagePointsConfigured | not used | slave `max_slippage_points` setting (0.0 = disabled) |
| Slippage actual | TradeLogs.slippagePointsActual | not used | computed drift `abs(copier-master)/point` |
| Slippage blocked | TradeLogs.slippageBlocked | not used | true when slave hard-blocked the OPEN |

---

## 7) State Synchronization Matrix

| State Domain | Source of Truth | Updated By | Consumed By |
|---|---|---|---|
| Web auth state | Frontend Redux authSlice | LoginForm, SlaveDashboard subscription update | Navbar, Dashboard page, SlaveDashboard |
| Node execution state | Python AppState.is_running | Master/Slave UI controllers | MasterUI/SlaveUI controls and logs |
| Node health state | Python AppState.health_state | SocketManager callbacks via controllers | MasterUI/SlaveUI logs/status views |
| Symbol map | Python AppState.symbol_map | Slave UI add/remove map actions | SlaveController.on_trade_signal |
| Ticket map | Python SlaveController.ticket_map | OPEN/CLOSE signal handling | Slave close execution logic |
| Trade lifecycle logs | Backend DB + Python logs | TradeGateway/TradeService + controllers | Admin/dashboard APIs + UI logs |
| Risk settings state | Python AppState | RiskPanel UI ↔ SlaveController guards | on_trade_signal() execution path |
| Daily PnL tracker | Python AppState.daily_pnl | SlaveController CLOSE handler | RiskPanel display, loss limit trigger |
| Copy mode settings | Python AppState (copy_mode, fixed_lot_size, reverse_copy) | Copy Mode UI in slave window Tab 1 | on_trade_signal() volume + action calculation |
| MT5 fill tolerance | Python AppState.slippage_points | no UI (fixed default 10; control removed) | passed as `deviation` to MT5 `execute_trade` on OPEN |
| Session tracking | Python AppState (session_pnl, open_trades, closed_trades) | SlaveController toggle_listening + on_trade_signal | TradesPanel display |
| Equity protection | Python AppState.equity_floor | RiskPanel equity section | Guard -1 in on_trade_signal() |
| Unmapped symbol behavior | Python AppState.unmapped_symbol_behavior | SymbolMapPanel dropdown | on_trade_signal() symbol mapping logic |
| Max slippage drift | Python AppState.max_slippage_points (points) | CopyView "Max Slippage Drift" spinbox (pips; stored as points × 100) | Guard 4 in on_trade_signal() hard-blocks OPEN on breach |
| Subscriber online status | Python AppState.subscriber_online_status | MasterController on_subscriber_update handler | `SubscribersView` STATUS column (design-system `StatusPill`) |

---

## 8) Non-Negotiable Compatibility Rules

1. Do not rename socket events: register_node, test_signal, trade_execution.
2. Do not remove required payload keys event/master_ticket/symbol/action/volume.
3. Preserve MASTER=licenseKey and SLAVE=email identity semantics.
4. Preserve /auth/users/:id/subscribe request shape with masterId nullable.
5. Preserve backend role values MASTER, SLAVE, ADMIN as exact uppercase strings.
6. Preserve backend verify-node role and identifier contract.
7. Preserve magic number loop-prevention behavior in Python trading logic unless system-wide reviewed.

---

## 9) Change Management Checklist (Before Merge)

If any contract changes, update all rows below before merging:

| Changed Surface | Backend Updated | Frontend Updated | Client Updated | Docs Updated |
|---|---|---|---|---|
| REST route path/method | [ ] | [ ] | [ ] (if applicable) | [ ] |
| REST request/response schema | [ ] | [ ] | [ ] (if applicable) | [ ] |
| Socket event name | [ ] | [ ] | [ ] | [ ] |
| Socket payload fields | [ ] | [ ] | [ ] | [ ] |
| Role/identity logic | [ ] | [ ] | [ ] | [ ] |
| Room routing rule | [ ] | [ ] | [ ] | [ ] |
| Email OTP signup + password reset (`/auth/otp/*`, `/auth/password-reset/*`, `Users.isEmailVerified`, `EmailOtps`) | [x] | [x] | [x] n/a | [x] |

---

## 10) Canonical Reference Files

- Root context: README.md
- Backend contracts: trade-sync-backend/backendReadme.md
- Frontend contracts: trade-sync-frontend/frontendReadme.md
- Client contracts: trade-sync-client/clientReadme.md

Keep this matrix synchronized with those docs whenever integration behavior changes.

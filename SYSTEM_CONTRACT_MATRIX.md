# TradeSync Pro System Contract Matrix

Single source of truth for cross-project integration contracts between:
- trade-sync-backend
- trade-sync-frontend
- trade-sync-client

Use this file to prevent drift when adding features with AI or human contributors.

---

## Current Delivery Scope (Locked)

This repository is currently locked to Phase 1 from README_NEXT_STEPS.md: Immediate Priority: Stabilization.

In scope now:
- End-to-end contract tests for critical flows only
- Structured logging with trace IDs across master, backend, and slave
- Reconnect and health-state handling across client and backend

Out of scope for now (deferred):
- High-Value Product Features
- Backend Feature Track items
- Frontend Feature Track items
- Python Client Feature Track items
- Delivery Approach expansion items beyond stabilization
- 30/60/90 day items beyond the 30-day stabilization essentials

Compatibility rule for this phase:
- No contract-breaking changes are allowed while implementing stabilization.

Implemented stabilization notes:
1. `trace_id` is now propagated as an optional cross-layer field for observability.
2. Required payload keys remain unchanged and still mandatory.
3. Client reconnect flow now re-emits `register_node` on reconnect.
4. `/auth/verify-node` now returns `id` for direct master/slave user resolution.
5. `TradeLogs.slaveId` supports per-subscriber copied count and P&L once new rows are tagged.
6. `node_registered` confirms socket room assignment back to the registering client.

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

---

## 3) HTTP Contract Matrix

### 3.1 Authentication and User Management

| Route | Method | Backend Handler | Called By | Request Body | Success Response (shape) | Notes |
|---|---|---|---|---|---|---|
| /auth/register | POST | AuthController.register | Frontend register forms | { fullName, email, password, role, licenseKey? } | saved user object | Role is MASTER or SLAVE from frontend forms |
| /auth/login | POST | AuthController.login | Frontend LoginForm | { email, password } | user without password | Used to populate Redux auth user |
| /auth/users | GET | AuthController.getAllUsers | Frontend admin page | none | user[] (selected fields only) | Frontend uses for admin table |
| /auth/users/:id/license | POST | AuthController.generateLicense | Frontend admin page | none | { message, licenseKey } | Valid only for MASTER role |
| /auth/users/:id/toggle-status | PATCH | AuthController.toggleStatus | Frontend admin page | none | { message, isActive } | ADMIN cannot be disabled |
| /auth/verify-node | POST | AuthController.verifyNode | Python Master/Slave controllers | { role, identifier, trace_id? } | { message, role, fullName, id, trace_id? } | Pre-flight gate before MT5 operations |
| /auth/masters | GET | AuthController.getActiveMasters | Frontend SlaveDashboard | none | active master[] | Marketplace source |
| /auth/users/:id/subscribe | PATCH | AuthController.updateSubscription | Frontend SlaveDashboard | { masterId: string|null } | { message, subscribedToId } | null means unsubscribe |
| /auth/masters/:id/profile | GET | AuthController.getMasterProfile | Frontend SlaveDashboard (MasterProfileCard) | none | { id, fullName, createdAt, totalTrades, closedTrades, winRate, totalPnL, avgVolume, bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime, subscriberCount } | Returns aggregate stats and public profile fields for one active master. Added Phase 6. |
| /auth/masters/:masterId/subscribers | GET | AuthController.getMasterSubscribers | Python MasterController.fetch_subscribers | none | { id, fullName, email, isActive, totalCopied, totalPnL }[] | Returns per-slave trade summary using TradeLogs.slaveId. Historical records show 0 until slaveId is populated. |
| /auth/masters/:id/profile | PATCH | AuthController.updateMasterProfile | Frontend MasterProfileSetup | { bio?, tradingPlatform?, instruments?, strategyDescription?, riskLevel?, typicalHoldTime? } | updated user object | Master self-updates trading identity. Added Phase 7. |
| /auth/masters/:id/dashboard | GET | AuthController.getMasterDashboard | Frontend MasterDashboard | none | { profile, recentTrades, subscriberCount, openTrades, totalSignalsSent } | Master's own dashboard data. Added Phase 7. |
| /auth/top-masters | GET | AuthController.getTopMasters | Frontend TopTradersSection (landing page) | none | enriched master array (max 3) | Public endpoint. Top 3 most active masters. Added Phase 7. |

### 3.2 Trade REST

| Route | Method | Backend Handler | Called By | Request Body | Response | Notes |
|---|---|---|---|---|---|---|
| /trades/history | GET | TradeController.getTradeHistory | Frontend dashboards (potential) | none | latest logs array | Returns top 50 via TradeService |
| /trades/stats | GET | TradeController.getStats | Frontend dashboards (potential) | none | placeholder stats object | Currently stub/static |
| /trades/master/:masterId/history | GET | TradeController.getMasterHistory | Frontend SlaveDashboard (TradeHistoryModal) | none | { symbol, action, status, pnl, createdAt, closedAt }[] | Returns last 50 trades per master (OPEN + CLOSED). Added Phase 6. |

### 3.3 Status Code Tolerance Matrix

| Contract | Backend Current Behavior | Frontend Expectation | Client Expectation | Risk |
|---|---|---|---|---|
| /auth/login | standard Nest success | expects success, no strict code check | not used | low |
| /auth/register | standard Nest success | expects success, no strict code check | not used | low |
| /auth/verify-node | Nest success (commonly 200/201 in current flow) | not used | Master and Slave accept 200 or 201 | low |

Compatibility recommendation:
- Keep /auth/verify-node success compatible with 200/201 handling in Python controllers.

---

## 4) WebSocket Contract Matrix

### 4.1 Event Names and Direction

| Event Name | Direction | Producer | Consumer | Purpose |
|---|---|---|---|---|
| register_node | client -> backend | Python Master/Slave nodes | Backend TradeGateway | Role + identifier registration and room join |
| node_registered | backend -> client | Backend TradeGateway | Python SocketManager | Confirms successful room join after register_node |
| test_signal | client -> backend | Python Master node (MasterRecorder) | Backend TradeGateway | Raw trade lifecycle signal ingestion |
| trade_execution | backend -> clients | Backend TradeGateway | Python Slave + Frontend LiveTradeTable | Fanout execution signal stream |
| subscriber_update | backend -> master client | Backend TradeGateway | Python SubscribersPanel via MasterController | Notifies master when a subscribed slave connects or disconnects |

### 4.2 Payload Schemas

#### register_node payload

```json
{
  "role": "MASTER | SLAVE",
  "identifier": "string"
}
```

#### node_registered payload

```json
{
  "success": true,
  "role": "MASTER | SLAVE",
  "room": "room_master_<id>",
  "timestamp": "ISO string"
}
```

#### test_signal payload (from MasterRecorder)

```json
{
  "event": "OPEN | CLOSE",
  "master_ticket": 123456,
  "symbol": "XAUUSD",
  "action": "BUY | SELL | CLOSE",
  "volume": 0.1,
  "pnl": 0.0,
  "trace_id": "uuid-optional"
}
```

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
  "trace_id": "uuid-optional",
  "signalId": 101
}
```

Consumer-required keys (must remain stable):
- event
- master_ticket
- symbol
- action
- volume

Optional compatibility key:
- trace_id (for observability only)

Note:
- Backend tags TradeLogs.slaveId when exactly one slave is in the room.

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
| Copy mode settings | Python AppState (copy_mode, fixed_lot_size, reverse_copy, slippage_points) | Copy Mode UI in slave window Tab 1 | on_trade_signal() volume + action calculation |
| Session tracking | Python AppState (session_pnl, open_trades, closed_trades) | SlaveController toggle_listening + on_trade_signal | TradesPanel display |
| Equity protection | Python AppState.equity_floor | RiskPanel equity section | Guard -1 in on_trade_signal() |
| Unmapped symbol behavior | Python AppState.unmapped_symbol_behavior | SymbolMapPanel dropdown | on_trade_signal() symbol mapping logic |
| Subscriber online status | Python AppState.subscriber_online_status | MasterController on_subscriber_update handler | SubscribersPanel STATUS column |

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

---

## 10) Canonical Reference Files

- Root context: README.md
- Backend contracts: trade-sync-backend/backendReadme.md
- Frontend contracts: trade-sync-frontend/frontendReadme.md
- Client contracts: trade-sync-client/clientReadme.md

Keep this matrix synchronized with those docs whenever integration behavior changes.

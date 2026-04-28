# TradeSync Pro Backend — Deep Technical Documentation

This document is the authoritative engineering guide for the `trade-sync-backend` service.  
It is written so a human engineer or an AI coding model can safely extend the backend without breaking existing behavior.

---

## Scope Lock (Current Phase)

Current implementation scope is Phase 1 only from README_NEXT_STEPS.md: Immediate Priority: Stabilization.

Backend work allowed in this phase:
1. Contract-focused tests for critical flow only
2. Structured logging with trace IDs
3. Reconnect and health-state support at socket/backend integration points

Backend work deferred for later phases:
1. Multi-tenant routing
2. Idempotency keys and duplicate-prevention redesign beyond stabilization fixes
3. Retry/dead-letter pipelines
4. Admin observability platform features beyond basic stabilization visibility

Lightweight testing policy for this project stage:
- Prefer a minimal fundamental suite over broad coverage
- Add only tests that protect critical contract behavior
- Avoid large-scale refactors unless required to preserve current logic

Implemented in current Phase 1 backend scope:
1. Trace-aware structured logs in `trade.gateway.ts`
2. Optional `trace_id` handling for `/auth/verify-node`
3. Minimal contract tests:
	- `src/auth/auth.service.spec.ts`
	- `src/trade/trade.gateway.spec.ts`

Manual smoke expectation (backend side):
1. On initial client connect, backend logs `client_connected`
2. On registration, backend logs `register_node_master_joined` or `register_node_slave_joined`
3. On signal ingestion, backend logs `test_signal_received` then `trade_execution_broadcasted`
4. On forced restart, clients reconnect and backend receives fresh `register_node` events

---

## 1) Project Identity

- **Project Name:** `trade-sync-backend`
- **Version:** `0.0.1`
- **Framework:** NestJS (v11.x)
- **Language:** TypeScript
- **Runtime:** Node.js
- **Database:** Microsoft SQL Server via TypeORM + mssql driver
- **Realtime Layer:** Socket.IO through Nest WebSocket gateway

Primary responsibilities of this backend:

1. User authentication and registration (basic email/password model)
2. Admin controls (user listing, license generation, enable/disable users)
3. Node verification for desktop clients (MASTER/SLAVE)
4. Slave marketplace functions (list active masters, subscribe/unsubscribe)
5. Trade signal ingestion and broadcasting to subscribed slaves
6. Trade history retrieval for dashboard consumption

---

## 2) Backend File Structure and Responsibilities

```text
trade-sync-backend/
├─ backendReadme.md            # This document
├─ README.md                   # Default Nest starter README (not project-specific)
├─ package.json                # Scripts, deps, toolchain versions
├─ package-lock.json           # Resolved dependency graph (lockfile v3)
├─ nest-cli.json               # Nest CLI config
├─ tsconfig.json               # TS compiler options
├─ tsconfig.build.json         # Build-time excludes
├─ eslint.config.mjs           # ESLint + TypeScript + Prettier rules
├─ .prettierrc                 # Prettier formatting rules
├─ .gitignore                  # Ignored files/folders
├─ src/
│  ├─ main.ts                  # App bootstrap + CORS + port
│  ├─ app.module.ts            # Root module wiring
│  ├─ auth/
│  │  ├─ auth.module.ts        # Auth module + repository registration
│  │  ├─ auth.controller.ts    # REST routes under /auth
│  │  ├─ dto/
│  │  │  └─ auth.dto.ts        # Auth response interfaces and profile update DTO
│  │  └─ auth.service.ts       # Auth business logic + admin + marketplace
│  ├─ trade/
│  │  ├─ trade.module.ts       # Trade module + providers
│  │  ├─ trade.controller.ts   # REST routes under /trades
│  │  ├─ trade.service.ts      # SQL write/read methods (raw queries)
│  │  └─ trade.gateway.ts      # Socket event handlers + room routing
│  └─ database/
│     ├─ database.module.ts    # Global TypeORM MSSQL connection
│     ├─ user.entity.ts        # Users table entity
│     └─ tradelog.entity.ts    # TradeLogs table entity
└─ test/
	├─ app.e2e-spec.ts          # E2E scaffold test (currently stale)
	└─ jest-e2e.json            # E2E Jest config
```

---

## 3) Runtime Architecture Overview

### Module Graph

- `AppModule` imports:
  - `DatabaseModule`
  - `TradeModule`
  - `AuthModule`

`DatabaseModule` is marked `@Global()`, so TypeORM connection services are available app-wide without re-importing this module in every feature module.

### Communication Types

1. **HTTP (REST)**
	- `/auth/*` → auth/admin/marketplace operations
	- `/trades/*` → trade history + stub stats

2. **WebSocket (Socket.IO)**
	- Event `register_node` → binds clients to role-specific context/rooms
	- Event `test_signal` → validates master, logs signal, emits `trade_execution`

3. **Database Interactions**
	- Repository pattern for `User` and `TradeLog`
	- Raw SQL queries through `DataSource` for `TradeLog` and `ExecutionLog` legacy-style writes/reads

---

## 4) Bootstrap and Environment Behavior

### `src/main.ts`

Boot process:

1. Creates Nest app with `AppModule`
2. Enables CORS with:
	- origin: `http://localhost:3001`
	- methods: `GET,HEAD,PUT,PATCH,POST,DELETE`
	- credentials: `true`
3. Listens on `process.env.PORT` or fallback `3000`

Impact:

- Frontend expected at `localhost:3001`
- Backend default at `localhost:3000`

---

## 5) Database Layer Deep Dive

### `src/database/database.module.ts`

TypeORM config:

- `type: 'mssql'`
- `host: 'localhost'`
- `port: 1433`
- `username: 'tsp_admin'`
- `password: 'StrongPassword123!'`
- `database: 'TradeSyncPro'`
- `autoLoadEntities: true`
- `synchronize: true`
- MSSQL options:
  - `encrypt: false`
  - `trustServerCertificate: true`

Important implications:

- `synchronize: true` auto-migrates schema from entities on boot (safe for dev, risky for production).
- Credentials are hardcoded in source (should be moved to env variables for production security).

### Entity: `User` (`src/database/user.entity.ts`)

Maps to table: `Users`

Columns:

- `id: uuid` (PK)
- `email: string` (unique)
- `password: string`
- `fullName: string`
- `role: 'MASTER' | 'SLAVE' | 'ADMIN'` default `SLAVE`
- `licenseKey: string | null`
- `bio: string | null`
- `tradingPlatform: string | null`
- `instruments: string | null`
- `strategyDescription: string | null`
- `riskLevel: string | null` default `MEDIUM`
- `typicalHoldTime: string | null`
- `isActive: boolean` default `true`
- `subscribedToId: string | null` (`varchar`, nullable)
- `createdAt: Date` (auto timestamp)

### Entity: `TradeLog` (`src/database/tradelog.entity.ts`)

Maps to table: `TradeLogs`

Columns:

- `id: uuid` (PK)
- `masterId: string`
- `slaveId (nullable string): UUID of the slave who copied this trade. Added in Phase 9. Null for historical records.`
- `masterName: string`
- `symbol: string`
- `action: string`
- `volume: number` (float)
- `ticketNumber: string`
- `pnl: number | null` (float)
- `status: 'OPEN' | 'CLOSED'` default `OPEN`
- `createdAt: Date`
- `closedAt: Date | null`

Phase 6 Note on pnl and closedAt:
- The `pnl` field is set when a CLOSE event is handled in `trade.gateway.ts` via `handleTestSignal`
- The `closedAt` timestamp is also recorded on CLOSE events (Phase 6 implementation)
- This allows the PnLChart and TradeHistoryModal components to display cumulative performance and trade lifecycle data

Phase 9 Note on slaveId:
- The `slaveId` field is nullable for historical rows.
- New OPEN rows are tagged with `slaveId` only when exactly one subscribed slave is connected in the master's room.
- `GET /auth/masters/:masterId/subscribers` uses `TradeLogs.slaveId` for per-subscriber copied count and P&L.

---

## 6) Auth Module Deep Dive

### File: `src/auth/auth.module.ts`

- Registers TypeORM repository for `User` and `TradeLog`
- Configures `PassportModule` and `JwtModule` with `JWT_SECRET` / `JWT_EXPIRES_IN` from `ConfigModule`
- Provides `AuthService`, `JwtStrategy`, and the **global** `APP_GUARD` `JwtAuthGuard` (routes opt out with `@Public()`)
- Exposes `AuthController` and re-exports `AuthService` / `JwtModule` for other modules if needed

### File: `src/auth/decorators/public.decorator.ts`

- Exports `@Public()`; when set on a handler (or class), the global JWT guard does not require a Bearer token

### File: `src/auth/guards/jwt-auth.guard.ts`

- Extends `AuthGuard('jwt')` and skips authentication when `@Public()` is present

### File: `src/auth/strategies/jwt.strategy.ts`

- `passport-jwt` with `ExtractJwt.fromAuthHeaderAsBearerToken()`; `validate` loads the user by `sub` and rejects inactive users

### File: `src/auth/auth.controller.ts`

Base route prefix: `/auth`

#### Route Map

1. `POST /auth/register`
	- Body: loosely typed (`any`), expected user fields
	- Calls `AuthService.register(body)`
	- Wraps errors as `BadRequestException('Registration Failed: ...')`

2. `POST /auth/login`
	- Body expected: `{ email, password }`
	- Calls `AuthService.login(email, password)`

3. `GET /auth/users`
	- Admin user listing
	- Calls `AuthService.getAllUsers()`

4. `POST /auth/users/:id/license`
	- Generates master license key
	- Calls `AuthService.generateLicense(id)`

5. `PATCH /auth/users/:id/toggle-status`
	- Activates/deactivates non-admin user
	- Calls `AuthService.toggleUserStatus(id)`

6. `POST /auth/verify-node`
	- Body: `{ role, identifier }`
	- Used by Python node clients before MT5 connection
	- Calls `AuthService.verifyNode(role, identifier)`

7. `GET /auth/masters`
	- Fetches active masters for slave marketplace
	- Calls `AuthService.getActiveMasters()`

8. `PATCH /auth/users/:id/subscribe`
	- Body: `{ masterId }`, where `masterId` can be UUID or `null`
	- Calls `AuthService.updateSubscription(slaveId, masterId)`

9. `GET /auth/masters/:id/profile`
	- Path param: `id` (masterId)
	- Calls `AuthService.getMasterProfile(id)`
	- Returns aggregate master statistics plus public identity fields (Phase 6)
	- Response shape: `{ id, fullName, createdAt, totalTrades, closedTrades, winRate, totalPnL, avgVolume, bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime, subscriberCount }`

10. `PATCH /auth/masters/:id/profile`
	- Path param: `id` (masterId)
	- Body: `{ bio?, tradingPlatform?, instruments?, strategyDescription?, riskLevel?, typicalHoldTime? }`
	- Calls `AuthService.updateMasterProfile(id, body)`
	- Updates the master's public trading identity profile

11. `GET /auth/masters/:id/dashboard`
	- Path param: `id` (masterId)
	- Calls `AuthService.getMasterDashboard(id)`
	- Returns master dashboard data: `{ profile, recentTrades, subscriberCount, openTrades, totalSignalsSent }`

12. `GET /auth/top-masters`
	- Public endpoint
	- Calls `AuthService.getTopMasters()`
	- Returns top 3 active masters sorted by total trades

### File: `src/auth/auth.service.ts`

#### Method Inventory

1. `register(userData: Partial<User>)`
	- Requires a non-empty password string
	- Hashes password with **bcrypt** before `save`
	- Returns full saved user entity (controller wraps with `buildAuthResponse` for `{ access_token, user }`)

2. `login(email: string, pass: string)`
	- Looks up user by email
	- Verifies password with **bcrypt** when stored value is a bcrypt hash; otherwise compares plaintext once for **legacy** rows and then re-hashes and saves (lazy migration)
	- Throws `UnauthorizedException` if not found/invalid
	- Returns `{ access_token, user }` via `buildAuthResponse` (JWT payload includes `sub`, `email`, `role`)

3. `getAllUsers()`
	- Returns selected fields only:
	  - `id, fullName, email, role, isActive, licenseKey, createdAt`
	- Excludes password
	- Sorts newest first

4. `generateLicense(userId: string)`
	- Validates user exists
	- Validates role is `MASTER`
	- Creates license like `TSP-ABCD-EFGH`
	- Saves and returns `{ message, licenseKey }`

5. `toggleUserStatus(userId: string)`
	- Validates user exists
	- Blocks disabling admins
	- Toggles `isActive`
	- Returns `{ message, isActive }`

6. `verifyNode(role: string, identifier: string)`
	- MASTER lookup: `licenseKey + role=MASTER`
	- SLAVE lookup: `email + role=SLAVE`
	- Requires `isActive=true`
	- Returns `{ message: 'Node Verified', role, fullName }`
	- Response now includes id field for direct master_user_id resolution.

7. `getActiveMasters()`
	- Filters `role=MASTER` + `isActive=true`
	- Returns selected fields: `id, fullName, email, createdAt`

8. `updateSubscription(slaveId: string, masterId: string | null)`
	- Validates slave user exists (`id + role=SLAVE`)
	- Sets `slave.subscribedToId = masterId`
	- Returns message + current subscription target

9. `updateMasterProfile(masterId: string, dto: UpdateMasterProfileDto)`
	- Validates master exists (`id + role=MASTER`)
	- Partially updates public profile fields
	- Returns updated master object without password

10. `getMasterDashboard(masterId: string)`
	- Builds master profile + recent trade history snapshot
	- Returns profile, recentTrades, subscriberCount, openTrades, totalSignalsSent

11. `getTopMasters()`
	- Loads active masters only
	- Computes stats and returns top 3 masters sorted by totalTrades descending

#### Auth Service Behavioral Notes

- No DTO validation pipeline is currently present beyond ad-hoc checks.
- Passwords are stored as **bcrypt** hashes; legacy plaintext passwords are upgraded on successful login.
- **JWT access tokens** are issued on login/register; protected routes require `Authorization: Bearer <token>` unless `@Public()`.
- Copy `.env.example` and set `JWT_SECRET`. In **non-production** (`NODE_ENV` not `production`), if `JWT_SECRET` is missing, a fixed development default is used (see `src/auth/jwt-secret.util.ts`); production **must** set `JWT_SECRET`.
- Service relies heavily on console logging for traceability.

---

## 7) Trade Module Deep Dive

### File: `src/trade/trade.module.ts`

- Registers repositories for `User` and `TradeLog`
- Provides:
  - `TradeGateway` (WebSocket)
  - `TradeService` (DB operations)
- Exposes `TradeController`
- Exports `TradeService`

### File: `src/trade/trade.controller.ts`

Base route prefix: `/trades`

Routes:

1. `GET /trades/history`
	- Calls `TradeService.getLatestLogs(50)`
	- Returns last 50 rows from SQL `TradeLog` table (legacy raw query table name)

2. `GET /trades/stats`
	- Returns hardcoded placeholder:
	  - `activeSlaves: 1`
	  - `totalSignals: 100`
	  - `status: 'Healthy'`

3. `GET /trades/master/:masterId/history`
	- Calls `TradeService.getMasterHistory(masterId)`
	- Returns last 50 trades (OPEN + CLOSED) for one master
	- Used by SlaveDashboard TradeHistoryModal component
	- Response shape: `{ symbol, action, status, pnl, createdAt, closedAt }[]`

### File: `src/trade/trade.service.ts`

Uses `DataSource` for raw SQL queries.

Methods:

1. `logSignal(data: any): Promise<number>`
	- Inserts into table `TradeLog` (singular) with SQL:
	  - columns: `MasterID, Symbol, ActionType, Price, Volume`
	- Uses SQL Server parameter tokens `@0..@3`
	- Returns inserted ID from `SCOPE_IDENTITY()`

2. `logExecution(userId: number, signalId: number, status: string, latency: number)`
	- Inserts into `ExecutionLog` table

3. `getLatestLogs(limit: number)`
	- Executes `SELECT TOP (@0) * FROM TradeLog ORDER BY SignalTimestamp DESC`
	- Returns array of rows

Critical consistency note:

- Entity uses `TradeLogs` table (plural), but raw SQL uses `TradeLog` (singular).  
  This may be intentional for backward compatibility with an existing legacy table.

### File: `src/trade/trade.gateway.ts`

Gateway config:

- `@WebSocketGateway({ cors: { origin: '*' } })`

Implemented interfaces/events:

#### `handleConnection(client)`
- Logs socket connection metadata

#### Event: `register_node`
Payload: `{ role: string; identifier: string }`

Flow:

1. If role is MASTER:
	- lookup by `licenseKey + role=MASTER`
	- join room `room_master_${user.id}`
	- attach user context on socket: `client.data.user = user`

2. If role is SLAVE:
	- lookup by `email + role=SLAVE`
	- if `subscribedToId` exists → join `room_master_${subscribedToId}`
	- else logs no active subscription

#### Event: `test_signal`
Payload: dynamic trade signal object (`any`)

Flow:

1. Authorization guard:
	- requires `client.data.user` present and role MASTER
	- unauthorized signals are ignored

2. Legacy logging:
	- transforms input to `logData`
	- calls `tradeService.logSignal(logData)`
	- stores resulting ID as `oldSignalId`

3. New `TradeLogs` write/update:
	- on `event === 'OPEN'`:
	  - insert new `TradeLog` entity row with status `OPEN`
	- on `event === 'CLOSE'`:
	  - find open row by `masterId + ticketNumber`
	  - update status `CLOSED`, set `pnl`, set `closedAt`

4. Broadcast:
	- emits `trade_execution` to room `room_master_${masterUser.id}`
	- payload: original data + `signalId: oldSignalId`

This creates a room-based fanout model where each master has an isolated channel and subscribed slaves listen to that channel.

---

## 8) End-to-End Request/Event Flows

### A) Registration and Login

1. Client calls `POST /auth/register`
2. Controller forwards body to service
3. Service writes `Users` row
4. Client later calls `POST /auth/login`
5. Service validates email/password and returns profile minus password

### B) Master License Lifecycle

1. Admin requests `POST /auth/users/:id/license`
2. Service ensures user exists and is MASTER
3. Service generates `TSP-XXXX-XXXX`
4. License stored in `Users.licenseKey`
5. Desktop master node uses this key in `verify-node` and `register_node`

### C) Slave Subscription Lifecycle

1. Slave UI fetches active masters via `GET /auth/masters`
2. Slave selects master and calls `PATCH /auth/users/:slaveId/subscribe`
3. Service writes `Users.subscribedToId`
4. Slave socket registers via `register_node`
5. Gateway joins slave to selected master room

### D) Trade Signal Fanout

1. Master socket sends `test_signal`
2. Gateway authorizes based on socket-attached MASTER identity
3. Gateway logs signal (legacy and new table workflows)
4. Gateway emits `trade_execution` in master room
5. Connected slaves in that room receive same signal payload

### F) Master Profile Setup

1. Master opens the Profile Setup tab in `MasterDashboard`
2. Frontend submits `PATCH /auth/masters/:id/profile`
3. `AuthService` finds the master user and updates profile fields
4. Service returns the updated user record
5. Frontend updates local dashboard state and shows the saved state

### G) Slave Online Notification

1. Slave Python app connects socket and emits `register_node` with `role=SLAVE`
2. `TradeGateway` stores `socket.id -> { role, email, subscribedMasterId }`
3. Gateway looks up `subscribedMasterId` from the slave `Users.subscribedToId`
4. Gateway emits `subscriber_update { online: true }` to `room_master_<id>`
5. Master Python app receives the event and updates `AppState.subscriber_online_status`
6. `SubscribersPanel.refresh_display()` shows `● LIVE` next to that subscriber

### H) Socket Registration Acknowledgement

1. Client emits `register_node`
2. Gateway processes room join
3. Gateway emits `node_registered` back to that socket
4. Client `SocketManager` logs confirmation or failure

---

## 9) Routing and API Surface (Complete)

### HTTP Routes

#### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/users`
- `POST /auth/users/:id/license`
- `PATCH /auth/users/:id/toggle-status`
- `POST /auth/verify-node`
- `GET /auth/masters`
- `PATCH /auth/users/:id/subscribe`
- `GET /auth/masters/:id/profile`
- `GET /auth/masters/:masterId/subscribers`
- `PATCH /auth/masters/:id/profile`
- `GET /auth/masters/:id/dashboard`
- `GET /auth/top-masters`

#### Trades

- `GET /trades/history`
- `GET /trades/stats`

### WebSocket Events

- Incoming from clients:
  - `register_node`
  - `test_signal`
- Outgoing from server:
  - `node_registered`
  - `trade_execution`

Phase 9 documented surfaces:
- `/auth/verify-node` returns `id` for direct `master_user_id` resolution.
- `/auth/masters/:masterId/subscribers` returns per-slave stats using `TradeLogs.slaveId`.
- `TradeLogs.slaveId` stores the copied slave UUID when the gateway can identify exactly one slave in the room.
- `node_registered` confirms room assignment back to the registering socket.
- `src/auth/dto/auth.dto.ts` contains typed response interfaces for Phase 6-8 auth/profile/subscriber endpoints.

---

## 10) Scripts, Tooling, and Versions

### NPM Scripts (`package.json`)

- `build` → `nest build`
- `start` → `nest start`
- `start:dev` → watch mode
- `start:debug` → debug + watch
- `start:prod` → run compiled `dist/main`
- `lint` → ESLint with `--fix`
- `format` → Prettier on `src` and `test`
- `test`, `test:watch`, `test:cov`, `test:e2e`

### Core Runtime Dependencies

- `@nestjs/common` `^11.0.1`
- `@nestjs/core` `^11.0.1`
- `@nestjs/platform-express` `^11.0.1`
- `@nestjs/platform-socket.io` `^11.1.12`
- `@nestjs/typeorm` `^11.0.0`
- `@nestjs/websockets` `^11.1.12`
- `typeorm` `^0.3.28`
- `mssql` `^12.2.0`
- `msnodesqlv8` `^5.1.3`
- `socket.io` `^4.8.3`
- `reflect-metadata` `^0.2.2`
- `rxjs` `^7.8.1`

### TypeScript/Compiler Behavior

From `tsconfig.json`:

- `module` and `moduleResolution` are `NodeNext`
- `target` is `ES2022`
- Decorators enabled (`emitDecoratorMetadata`, `experimentalDecorators`)
- Strict mode mostly relaxed (`strict: false`, `noImplicitAny: false`)
- `strictNullChecks: true`

### Lint/Format

- ESLint + TypeScript recommended config
- Prettier integrated via plugin
- Some strict TS lint rules intentionally relaxed for velocity
- Prettier: single quotes + trailing commas all

---

## 11) Testing Status and Gaps

### Existing E2E Test

`test/app.e2e-spec.ts` expects:

- `GET /` returns status 200 and body `Hello World!`

Current codebase does **not** define a root `/` route/controller, so this test is stale and likely fails if executed unchanged.

### Practical implication for future contributors

- Do not treat current tests as authoritative behavior coverage.
- Add/repair tests when adding features.

---

## 12) Known Risks and Design Constraints

1. **Security**
	- Passwords are plaintext in DB and compared plaintext.
	- Hardcoded DB credentials in source.
	- No authentication token/session guard on admin routes.

2. **Data Modeling Drift**
	- `TradeLogs` entity table vs raw SQL `TradeLog` table naming mismatch.
	- Mixed ORM + raw SQL approach requires care when evolving schema.

3. **Validation Gaps**
	- Controller bodies are not validated with DTOs/class-validator.
	- Several payloads are typed `any`.

4. **Operational Gaps**
	- `synchronize: true` risky outside development.
	- Limited automated test confidence.

These are current realities and should be preserved unless intentionally refactored with migration plan.

---

## 13) Safe Extension Rules for AI Coding Models

When generating or modifying backend code, follow these rules to avoid breakage:

1. **Do not rename existing routes/events** unless explicitly requested.
2. **Preserve room naming contract** `room_master_${id}` in socket logic.
3. **Keep verify-node semantics intact**:
	- MASTER identified by license key
	- SLAVE identified by email
4. **Do not remove fields currently consumed by clients** (`fullName`, `role`, `licenseKey`, `subscribedToId`, etc.).
5. **If refactoring password/auth**, provide backward-compatible migration path.
6. **If changing DB tables**, account for both legacy raw SQL and TypeORM entity usage.
7. **Prefer additive changes** (new methods/routes) over breaking changes.
8. **Update this README whenever contracts change**.

---

## 14) Quick Reference: File-to-File Communication Map

1. `main.ts` boots `AppModule`
2. `AppModule` imports `DatabaseModule`, `AuthModule`, `TradeModule`
3. `DatabaseModule` creates global TypeORM connection
4. `AuthModule` exposes `/auth` routes via `AuthController`
5. `AuthController` delegates to `AuthService`
6. `AuthService` reads/writes `User` repository
7. `TradeModule` exposes `/trades` routes and `TradeGateway`
8. `TradeController` delegates to `TradeService`
9. `TradeService` executes raw SQL via `DataSource`
10. `TradeGateway` uses:
	 - `TradeService` (legacy signal logging)
	 - `User` repository (node identity + subscription lookup)
	 - `TradeLog` repository (OPEN/CLOSE lifecycle)
11. `TradeGateway` emits `trade_execution` events to per-master rooms

---

## 15) Local Run Checklist

1. Ensure SQL Server is running with expected DB/user credentials.
2. In `trade-sync-backend`, install packages.
3. Start in dev mode.
4. Ensure frontend or clients use:
	- HTTP base: `http://localhost:3000`
	- Socket endpoint: same backend host
5. Ensure frontend origin is `http://localhost:3001` or update CORS config.

---

## 16) Suggested Immediate Improvements (Non-Breaking Roadmap)

1. Introduce DTOs + validation pipes for all controller inputs.
2. Move DB config and CORS origin to environment variables.
3. Add password hashing (bcrypt/argon2) with migration strategy.
4. Add auth guard for admin-only routes.
5. Align trade table naming strategy (`TradeLog` vs `TradeLogs`).
6. Replace stale e2e root test with real route coverage.

---

## 17) Canonical Contract Pointer

For cross-project integration contracts (backend + frontend + client), use:

- `SYSTEM_CONTRACT_MATRIX.md` (workspace root)

If any REST route, socket event, payload field, role identity rule, or room-routing behavior changes, update the matrix and then synchronize this backend guide.

---

If you are extending this backend with AI assistance, treat this file as the source of truth for current behavior contracts and integration boundaries.

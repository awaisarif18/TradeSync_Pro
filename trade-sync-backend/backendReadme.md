# TradeSync Pro Backend — Deep Technical Documentation

This document is the authoritative engineering guide for the `trade-sync-backend` service.  
It is written so a human engineer or an AI coding model can safely extend the backend without breaking existing behavior.

---

## Scope Lock (Current Phase)

Current implementation scope includes Phase 1 stabilization, Phase 3 backend analytics, and ongoing Phase 9 web UI support work.

Backend work delivered and stable:
1. Contract-focused tests for critical flows (co-located spec files in `src/`)
2. Structured logging with trace IDs across gateway and auth service
3. Reconnect and health-state support at socket/backend integration points
4. Global JWT guard with `@Public()` opt-out for public endpoints
5. Phase 3 analytics: `riskMetrics`, `equitySparkline`, `activeHoursSummary` from capped CLOSED `TradeLogs`
6. Live master socket tracking (`connectedMasters` set, `isMasterConnected()`)
7. Per-subscriber `slaveId` tagging on `TradeLogs` for copy P&L attribution
8. `subscriber_update` emitted both on slave connect and on slave disconnect

Backend work deferred for later phases:
1. Multi-tenant routing
2. Idempotency keys and duplicate-prevention redesign
3. Retry/dead-letter pipelines
4. Admin observability platform features

Lightweight testing policy:
- Prefer a minimal fundamental suite over broad coverage
- Co-locate spec files in `src/` alongside the units they test
- Avoid large-scale refactors unless required to preserve current logic

---

## 1) Project Identity

- **Project Name:** `trade-sync-backend`
- **Version:** `0.0.1`
- **Framework:** NestJS (v11.x)
- **Language:** TypeScript
- **Runtime:** Node.js
- **Database:** Microsoft SQL Server via TypeORM + mssql driver
- **Realtime Layer:** Socket.IO through Nest WebSocket gateway

Primary responsibilities:

1. User authentication and registration (bcrypt + JWT)
2. Admin controls (user listing, license generation, enable/disable users)
3. Node verification for desktop clients (MASTER/SLAVE)
4. Slave marketplace functions (list active masters, subscribe/unsubscribe)
5. Trade signal ingestion and broadcasting to subscribed slaves via room routing
6. Trade history and master profile analytics retrieval for dashboard consumption
7. Live master socket presence tracking for `isLive` badges on the frontend

---

## 2) Backend File Structure and Responsibilities

```text
trade-sync-backend/
├─ backendReadme.md                        # This document
├─ README.md                               # Default Nest starter README (not project-specific)
├─ .env.example                            # Example env vars (JWT_SECRET, JWT_EXPIRES_IN)
├─ package.json                            # Scripts, deps, toolchain versions
├─ package-lock.json                       # Resolved dependency graph (lockfile v3)
├─ nest-cli.json                           # Nest CLI config
├─ tsconfig.json                           # TS compiler options
├─ tsconfig.build.json                     # Build-time excludes
├─ eslint.config.mjs                       # ESLint + TypeScript + Prettier rules
├─ .prettierrc                             # Prettier formatting rules
├─ .gitignore                              # Ignored files/folders
├─ src/
│  ├─ main.ts                              # App bootstrap + CORS + port
│  ├─ app.module.ts                        # Root module wiring (ConfigModule, DatabaseModule, TradeModule, AuthModule)
│  ├─ auth/
│  │  ├─ auth.module.ts                    # Auth module: JWT, Passport, global JwtAuthGuard, forwardRef TradeModule
│  │  ├─ auth.controller.ts               # REST routes under /auth; injects TradeGateway for /masters/live
│  │  ├─ avatar-storage.util.ts           # MIME→ext map, disk paths, upload validation for provider avatars
│  │  ├─ auth.service.ts                  # Auth business logic + admin + marketplace + analytics + OTP/reset flows
│  │  ├─ auth.service.spec.ts             # Co-located unit tests for AuthService.verifyNode
│  │  ├─ otp.service.ts                   # Email OTP issue/verify/invalidate (bcrypt-hashed, TTL, attempt cap, resend throttle)
│  │  ├─ jwt-secret.util.ts               # Resolves JWT secret with non-production dev fallback
│  │  ├─ master-analytics.util.ts         # computeRiskMetrics, computeEquitySparkline, computeActiveHours, buildAnalytics, computeMasterAnalytics
│  │  ├─ master-analytics.util.spec.ts    # Co-located unit tests for analytics util functions
│  │  ├─ decorators/
│  │  │  └─ public.decorator.ts           # @Public() — marks routes as JWT-exempt
│  │  ├─ dto/
│  │  │  └─ auth.dto.ts                   # VerifyNodeResponse, MasterProfileResponse, SubscriberSummary, MasterRiskMetricsDto, UpdateMasterProfileDto, OTP/password-reset DTOs
│  │  ├─ guards/
│  │  │  └─ jwt-auth.guard.ts             # Global JwtAuthGuard — skips when @Public() present
│  │  ├─ strategies/
│  │  │  └─ jwt.strategy.ts               # passport-jwt strategy; validates sub, rejects inactive users
│  │  └─ types/
│  │     └─ jwt-user.ts                   # JwtUser = Omit<User, 'password'>; attached to req.user by JwtStrategy
│  ├─ mail/
│  │  ├─ mail.module.ts                   # Provides + exports MailService
│  │  └─ mail.service.ts                  # nodemailer SMTP transport; sendOtpEmail(to, code, purpose)
│  ├─ trade/
│  │  ├─ trade.module.ts                  # Trade module: forwardRef AuthModule, exports TradeGateway + TradeService
│  │  ├─ trade.controller.ts              # REST routes under /trades (all @Public())
│  │  ├─ trade.service.ts                 # SQL write/read methods; exports MasterHistoryEntry interface
│  │  ├─ trade.gateway.ts                 # Socket event handlers + room routing + live master tracking
│  │  └─ trade.gateway.spec.ts            # Co-located unit tests for register_node and test_signal flows
│  └─ database/
│     ├─ database.module.ts               # Global TypeORM MSSQL connection
│     ├─ user.entity.ts                   # Users table entity (now includes isEmailVerified)
│     ├─ otp.entity.ts                    # EmailOtps table entity (signup + password-reset codes)
│     └─ tradelog.entity.ts               # TradeLogs table entity
└─ test/
   ├─ app.e2e-spec.ts                     # E2E scaffold test (stale — expects GET / to return "Hello World!")
   └─ jest-e2e.json                       # E2E Jest config
```

---

## 3) Runtime Architecture Overview

### Module Graph

- `AppModule` imports:
  - `ConfigModule` (global, reads `.env` from `cwd()` and `__dirname/../`)
  - `DatabaseModule`
  - `TradeModule`
  - `AuthModule`

- `AuthModule` imports:
  - `TypeOrmModule.forFeature([User, TradeLog])`
  - `PassportModule` (default strategy: `jwt`)
  - `JwtModule.registerAsync` (via `ConfigModule`/`ConfigService` + `resolveJwtSecret`)
  - `forwardRef(() => TradeModule)` — breaks circular dependency with `TradeGateway`

- `TradeModule` imports:
  - `TypeOrmModule.forFeature([User, TradeLog])`
  - `forwardRef(() => AuthModule)` — breaks circular dependency with `AuthService`
  - Exports: `TradeService`, `TradeGateway`

`DatabaseModule` is marked `@Global()`, making the TypeORM connection available app-wide.

### Circular Dependency Between AuthModule and TradeModule

`AuthService` injects `TradeGateway` (to call `isMasterConnected()` in `getMasterProfile`).  
`TradeGateway` injects `AuthService` (to call `getSlaveIdByEmail()` during SLAVE `register_node`).  
Both use `forwardRef()` + `@Inject(forwardRef(() => ...))` to resolve this at runtime.

### Global JWT Guard

`AuthModule` registers `JwtAuthGuard` as `APP_GUARD` globally. Every route requires a valid Bearer JWT unless the handler (or controller class) is decorated with `@Public()`. The guard reads `IS_PUBLIC_KEY` metadata set by `@Public()`.

### Communication Types

1. **HTTP (REST)**
   - `/auth/*` → auth/admin/marketplace/analytics operations
   - `/trades/*` → trade history + stub stats

2. **WebSocket (Socket.IO)**
   - Event `register_node` → binds clients to role-specific rooms; emits `node_registered` ack
   - Event `test_signal` → validates master, logs signal, emits `trade_execution`

3. **Database Interactions**
   - TypeORM repository pattern for `User` and `TradeLog`
   - Raw SQL queries through `DataSource` for legacy `TradeLog` (singular) table in `TradeService`

---

## 4) Bootstrap and Environment Behavior

### `src/main.ts`

Boot process:

1. Creates Nest app as `NestExpressApplication` with `AppModule`
2. Registers static files: `useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' })` — public avatar reads bypass JWT guards
3. Enables CORS:
   - `origin: 'http://localhost:3001'`
   - `methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'`
   - `credentials: true`
3. Listens on `process.env.PORT ?? 3000`

Runtime avatar files live under `./uploads/avatars/` (gitignored). TypeORM `synchronize: true` adds nullable `Users.avatarUrl`.

### `src/app.module.ts`

- Mounts `ConfigModule.forRoot({ isGlobal: true })` with two `envFilePath` candidates:
  - `join(process.cwd(), '.env')` — works when running from repo root
  - `join(__dirname, '..', '.env')` — works when running compiled output from `dist/`

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP listen port |
| `JWT_SECRET` | Yes (production) | Dev fallback string | JWT signing secret (min 32 chars recommended) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry duration string |
| `NODE_ENV` | No | — | Set to `production` to require `JWT_SECRET` strictly |
| `SMTP_HOST` | Yes (for email) | — | SMTP server host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | No | `587` | SMTP port; `465` uses implicit TLS, otherwise STARTTLS |
| `SMTP_SECURE` | No | derived | Informational; transport derives `secure` from port `465` |
| `SMTP_USER` | Yes (for email) | — | SMTP auth username |
| `SMTP_PASS` | Yes (for email) | — | SMTP auth password / app password |
| `MAIL_FROM` | No | `SMTP_USER` | From header; Gmail rewrites mismatched addresses (warns on boot) |
| `OTP_TTL_MINUTES` | No | `10` | OTP validity window in minutes |
| `OTP_RESEND_SECONDS` | No | `30` | Minimum seconds between OTP resends (server-enforced) |
| `OTP_MAX_ATTEMPTS` | No | `5` | Failed verify attempts before an OTP is locked |
| `PASSWORD_RESET_TOKEN_TTL` | No | `10m` | `expiresIn` for the signed password-reset token |

### `src/auth/jwt-secret.util.ts`

`resolveJwtSecret(config: ConfigService): string`

- Reads `JWT_SECRET` from `ConfigService` then `process.env.JWT_SECRET`
- Trims whitespace
- In non-production (`NODE_ENV !== 'production'`): falls back to a hardcoded development default and logs a `console.warn` once
- In production: throws `Error('JWT_SECRET environment variable is required')` if unset
- The dev fallback is `'development-only-jwt-secret-min-32-chars-replace-in-env!!!!'`

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
- MSSQL options: `encrypt: false`, `trustServerCertificate: true`

Important implications:

- `synchronize: true` auto-migrates schema from entities on boot (safe for dev, risky for production).
- Credentials are hardcoded in source (should be moved to env variables for production).

### Entity: `User` (`src/database/user.entity.ts`)

Maps to table: `Users`

| Column | TypeScript Type | DB Type | Constraints |
|---|---|---|---|
| `id` | `string` | `uuid` | PK, auto-generated |
| `email` | `string` | `varchar` | Unique |
| `password` | `string` | `varchar` | bcrypt hash at rest |
| `fullName` | `string` | `varchar` | Not null |
| `role` | `'MASTER' \| 'SLAVE' \| 'ADMIN'` | `varchar` | Default `'SLAVE'` |
| `licenseKey` | `string` | `varchar` | Nullable |
| `bio` | `string \| null` | `nvarchar` | Nullable |
| `tradingPlatform` | `string \| null` | `nvarchar` | Nullable |
| `instruments` | `string \| null` | `nvarchar` | Nullable |
| `strategyDescription` | `string \| null` | `nvarchar` | Nullable |
| `riskLevel` | `string \| null` | `varchar` | Nullable, default `'MEDIUM'` |
| `typicalHoldTime` | `string \| null` | `nvarchar` | Nullable |
| `avatarUrl` | `string \| null` | `nvarchar` | Nullable. Public path with optional `?v=` cache bust, e.g. `/uploads/avatars/{id}.png?v=...` |
| `isActive` | `boolean` | `bit` | Default `true` |
| `isEmailVerified` | `boolean` | `bit` | Default `true` (DB-level). New `register` rows set `false`; login gate blocks only explicit `false`, so existing rows stay verified. |
| `subscribedToId` | `string \| null` | `varchar` | Nullable (explicit type prevents MSSQL TypeORM confusion) |
| `createdAt` | `Date` | `datetime2` | Auto timestamp |

### Entity: `EmailOtp` (`src/database/otp.entity.ts`)

Maps to table: `EmailOtps`. Stores one-time codes for signup verification and password reset. Codes are bcrypt-hashed at rest; only the newest unconsumed, non-expired row for an `(email, purpose)` pair is valid.

| Column | TypeScript Type | DB Type | Constraints |
|---|---|---|---|
| `id` | `string` | `uuid` | PK, auto-generated |
| `email` | `string` | `varchar` | Indexed |
| `codeHash` | `string` | `varchar` | bcrypt hash of the 6-digit code |
| `purpose` | `'SIGNUP' \| 'PASSWORD_RESET'` | `varchar` | Flow selector |
| `expiresAt` | `Date` | `datetime2` | `now + OTP_TTL_MINUTES` |
| `consumedAt` | `Date \| null` | `datetime2` | Set when verified, invalidated, or locked |
| `attempts` | `number` | `int` | Default `0`; locked at `OTP_MAX_ATTEMPTS` |
| `createdAt` | `Date` | `datetime2` | Auto timestamp; drives resend throttle |

### Entity: `TradeLog` (`src/database/tradelog.entity.ts`)

Maps to table: `TradeLogs`

| Column | TypeScript Type | DB Type | Constraints |
|---|---|---|---|
| `id` | `string` | `uuid` | PK, auto-generated |
| `masterId` | `string` | `varchar` | Nullable |
| `slaveId` | `string \| null` | `varchar` | Nullable. UUID of slave who copied. Null for pre-Phase 9 rows or rooms with multiple slaves. |
| `masterName` | `string` | `varchar` | Not null |
| `symbol` | `string` | `varchar` | Not null |
| `action` | `string` | `varchar` | `'BUY' \| 'SELL' \| 'CLOSE'` |
| `volume` | `number` | `float` | Not null |
| `ticketNumber` | `string` | `varchar` | Master MT5 ticket as string |
| `pnl` | `number \| null` | `float` | Nullable. Set on CLOSE event. |
| `status` | `'OPEN' \| 'CLOSED'` | `varchar` | Default `'OPEN'` |
| `createdAt` | `Date` | `datetime2` | Auto timestamp |
| `closedAt` | `Date \| null` | `datetime2` | Nullable. Set on CLOSE event. |
| `masterPrice` | `number \| null` | `float` | Nullable. Master entry/close reference price from `masterPrice` payload key. Saved on OPEN. |
| `copierPrice` | `number \| null` | `float` | Nullable. Slave fill-side quote, set by `trade_execution_ack`. |
| `slippagePointsConfigured` | `number \| null` | `float` | Nullable. Slave `max_slippage_points` setting at execution time (0.0 = disabled), set by ACK. |
| `slippagePointsActual` | `number \| null` | `float` | Nullable. Computed drift `abs(copier-master)/point`, set by ACK. |
| `slippageBlocked` | `boolean` | `bit` | Nullable, default `false`. True when the slave hard-blocked the OPEN on slippage, set by ACK. |

`slaveId` note: Set by `TradeGateway.handleTestSignal` on OPEN only when exactly one subscribed slave is currently in the master room. When multiple slaves occupy the room, `slaveId` is `null` because a single master `TradeLogs` row cannot represent multiple slave executions.

Slippage columns note: `masterPrice` is saved on OPEN from the signal payload. `copierPrice`, `slippagePointsConfigured`, `slippagePointsActual`, and `slippageBlocked` are populated by the additive `trade_execution_ack` event from the slave. Same single-slave fidelity caveat as `slaveId`: the shared master OPEN row holds exact diagnostics for single-slave rooms and best-effort (last writer) values otherwise. All columns are nullable so `synchronize: true` adds them without touching historical rows.

---

## 6) Auth Module Deep Dive

### File: `src/auth/auth.module.ts`

- Registers TypeORM repositories for `User` and `TradeLog`
- Configures `PassportModule` (default strategy `jwt`)
- Configures `JwtModule.registerAsync`:
  - Reads secret via `resolveJwtSecret(config)` from `jwt-secret.util.ts`
  - Reads expiry from `JWT_EXPIRES_IN` env var, defaults to `'7d'`
- Provides `AuthService`, `JwtStrategy`
- Registers `JwtAuthGuard` as global `APP_GUARD` via `APP_GUARD` token
- Uses `forwardRef(() => TradeModule)` to resolve the circular dependency with `TradeGateway`
- Exports `AuthService` and `JwtModule` for other modules

### File: `src/auth/decorators/public.decorator.ts`

Exports `@Public()` and `IS_PUBLIC_KEY = 'isPublic'`. When set on a handler or class, the global `JwtAuthGuard` skips JWT validation entirely.

### File: `src/auth/guards/jwt-auth.guard.ts`

Extends `AuthGuard('jwt')`. In `canActivate`, reads `IS_PUBLIC_KEY` from handler and class metadata via `Reflector.getAllAndOverride`. Returns `true` immediately for public routes; otherwise delegates to `passport-jwt` base guard.

### File: `src/auth/strategies/jwt.strategy.ts`

- Extends `PassportStrategy(Strategy)` from `passport-jwt`
- Extracts token from `Authorization: Bearer <token>` header
- `ignoreExpiration: false` — expired tokens are rejected
- `validate(payload: { sub: string; purpose?: string }): Promise<JwtUser>`:
  - Rejects with `UnauthorizedException` when the token carries a `purpose` claim (password-reset tokens cannot act as access tokens)
  - Loads `User` by `payload.sub` from the DB
  - Throws `UnauthorizedException` if user not found or `isActive === false`
  - Strips `password` before returning; result is attached to `req.user` as `JwtUser`

### File: `src/auth/otp.service.ts`

`OtpService` injects `Repository<EmailOtp>`, `MailService`, and `ConfigService`.

- `generateCode()` — 6-digit numeric, `crypto.randomInt`, zero-padded.
- `issueOtp(email, purpose)` — enforces the `OTP_RESEND_SECONDS` throttle against the newest unconsumed row, invalidates prior unconsumed codes, bcrypt-hashes and persists the new code, then emails it.
- `verifyOtp(email, purpose, code)` — loads the newest unconsumed, non-expired row; rejects on miss/expiry; increments `attempts` and locks at `OTP_MAX_ATTEMPTS`; on bcrypt match, sets `consumedAt`.
- `invalidateOtps(email, purpose)` — marks all unconsumed rows consumed.

### File: `src/mail/mail.service.ts`

`MailService` builds one `nodemailer` SMTP transport from `SMTP_*` + `MAIL_FROM`. `secure` is derived from port `465`. On boot it warns when `MAIL_FROM` does not contain `SMTP_USER` (Gmail rewrites mismatched From). `sendOtpEmail(to, code, purpose)` sends a branded inline-HTML email with copy that differs per purpose. Provider-agnostic: switching to Resend/SES/Brevo is an env-only change.

### File: `src/auth/types/jwt-user.ts`

```ts
export type JwtUser = Omit<User, 'password'>;
```

Attached to `req.user` after JWT validation passes. All protected controller handlers cast request as `Request & { user: JwtUser }`.

### File: `src/auth/auth.controller.ts`

Base route prefix: `/auth`

Constructor injects `AuthService` and `TradeGateway` (for the `/masters/live` route).

All protected routes extract `req.user: JwtUser` using the `RequestWithJwtUser` type alias (`Request & { user: JwtUser }`).

#### Route Map

| # | Route | Method | Auth | Role Guard | Notes |
|---|---|---|---|---|---|
| 1 | `/auth/register` | POST | `@Public()` | — | Body: `Record<string, unknown>`. Calls `authService.register()`. Creates `isEmailVerified=false` and emails a SIGNUP OTP. Returns `{ message, email, requiresOtp: true }` (no token yet). |
| 2 | `/auth/login` | POST | `@Public()` | — | Body: `{ email?, password? }`. Returns `{ access_token, user }`. Throws `403 { message, requiresOtp: true, email }` when `isEmailVerified === false`. |
| 1a | `/auth/otp/verify-signup` | POST | `@Public()` | — | Body: `{ email, code }`. Verifies SIGNUP OTP, sets `isEmailVerified=true`, returns `{ access_token, user }`. |
| 1b | `/auth/otp/resend` | POST | `@Public()` | — | Body: `{ email, purpose }`. Resends an OTP with a 30s server-side throttle. Generic message. |
| 1c | `/auth/password-reset/request` | POST | `@Public()` | — | Body: `{ email }`. Always returns a generic message; emails a reset OTP only when an active user exists. |
| 1d | `/auth/password-reset/verify` | POST | `@Public()` | — | Body: `{ email, code }`. Returns `{ resetToken }` (short-lived JWT with `purpose: 'PASSWORD_RESET'`). |
| 1e | `/auth/password-reset/confirm` | POST | `@Public()` | — | Body: `{ resetToken, newPassword }`. Validates token, writes a new bcrypt hash, invalidates OTPs. Returns `{ message }`. |
| 3 | `/auth/users` | GET | JWT required | `ADMIN` only | Returns user array (no passwords). |
| 4 | `/auth/users/:id/license` | POST | JWT required | `ADMIN` only | Generates `TSP-XXXX-XXXX` license key. |
| 5 | `/auth/users/:id/toggle-status` | PATCH | JWT required | `ADMIN` only | Flips `isActive`. Cannot disable `ADMIN` users. |
| 6 | `/auth/verify-node` | POST | `@Public()` | — | Body: `{ role, identifier, trace_id? }`. Desktop pre-flight gate. Returns `{ message, role, fullName, id, trace_id }`. |
| 7 | `/auth/node-action/revoke-subscriber` | POST | `@Public()` | — | Body: `{ masterLicenseKey, slaveId }`. Desktop master auth via license key. Clears `subscribedToId`. |
| 8 | `/auth/masters` | GET | `@Public()` | — | Returns active masters: `{ id, fullName, email, createdAt }[]`. |
| 9 | `/auth/masters/live` | GET | `@Public()` | — | Calls `tradeGateway.getConnectedMasterIds()`. Returns `{ liveIds: string[] }`. |
| 10 | `/auth/masters/:id/profile` | GET | `@Public()` | — | Returns full profile + analytics. See §6 AuthService for shape. |
| 11 | `/auth/masters/:masterId/subscribers` | GET | `@Public()` | — | Returns per-subscriber `TradeLogs`-derived stats. |
| 12 | `/auth/masters/:id/profile` | PATCH | JWT required | ADMIN or self | Body: `UpdateMasterProfileDto`. Updates public identity fields. |
| 12a | `/auth/masters/:id/avatar` | POST | JWT required | ADMIN or self | Multipart field `file` (JPEG/PNG/WebP, max 3 MB). Saves avatar to disk, returns `{ avatarUrl }` with `?v=` cache bust. |
| 13 | `/auth/masters/:id/dashboard` | GET | JWT required | ADMIN or self | Returns `MasterDashboardData`. |
| 14 | `/auth/top-masters` | GET | `@Public()` | — | Returns top 3 active masters by total trades. |
| 15 | `/auth/users/:id/subscribe` | PATCH | JWT required | ADMIN or self | Body: `{ masterId: string \| null }`. Subscribe or unsubscribe slave. |

"ADMIN or self" means: `req.user.role !== 'ADMIN' && req.user.id !== id` throws `ForbiddenException`.

### File: `src/auth/auth.service.ts`

#### Private Helpers

- `isBcryptHash(value: string): boolean` — Checks if stored password starts with `$2` (bcrypt prefix)
- `hashPassword(plain: string): Promise<string>` — `bcrypt.hash(plain, 10)`
- `verifyPlainAgainstStored(plain, stored)` — bcrypt compare when stored is a hash; falls back to direct equality for legacy plaintext rows

#### Public Methods

**1. `issueAccessToken(userId, email, role): Promise<string>`**
- Signs JWT with payload `{ sub: userId, email, role }` via `JwtService.signAsync`

**2. `buildAuthResponse(user: User): Promise<LoginResponse>`**
- Strips `password` field from user
- Issues access token via `issueAccessToken`
- Returns `{ access_token, user }` (password-free)

**3. `register(userData: Partial<User>)`**
- Requires non-empty password string; throws `BadRequestException` otherwise
- Hashes password with bcrypt before `save`
- Returns saved user entity (controller wraps with `buildAuthResponse` for `{ access_token, user }`)

**4. `login(email: string, pass: string): Promise<LoginResponse>`**
- Looks up user by email; throws `UnauthorizedException` if not found
- Verifies password via `verifyPlainAgainstStored`
- **Lazy migration:** if stored password is plaintext, re-hashes with bcrypt and saves before returning
- Re-fetches user after potential save to ensure freshness
- Returns `buildAuthResponse(fresh)`

**5. `getAllUsers()`**
- Selects: `id, fullName, email, role, isActive, licenseKey, createdAt, subscribedToId`
- Excludes `password`
- Orders newest first

**6. `generateLicense(userId: string)`**
- Validates user exists and `role === 'MASTER'`
- Generates `TSP-${randomPart1}-${randomPart2}` (4 uppercase alphanumeric chars per part)
- Returns `{ message, licenseKey }`

**7. `toggleUserStatus(userId: string)`**
- Validates user exists; blocks toggling `ADMIN` users
- Flips `isActive`; returns `{ message, isActive }`

**8. `verifyNode(role, identifier, traceId?): Promise<VerifyNodeResponse>`**
- Generates `resolvedTraceId = traceId || randomUUID()`
- MASTER: looks up by `licenseKey + role='MASTER'`
- SLAVE: looks up by `email + role='SLAVE'`
- Throws `UnauthorizedException` if not found or `isActive === false`
- Returns `{ message: 'Node Verified', trace_id, role, fullName, id }`

**9. `revokeSubscriber(masterLicenseKey, slaveId): Promise<{ message, slaveId }>`**
- Looks up active MASTER by `licenseKey`; throws `UnauthorizedException` if not found or inactive
- Requires slave exists and `slave.subscribedToId === master.id`; throws `ForbiddenException` otherwise
- Sets `slave.subscribedToId = null` and saves; does not disable the slave account
- Returns `{ message: 'Subscriber revoked', slaveId }`

**10. `getSlaveIdByEmail(email: string): Promise<string | null>`**
- Looks up SLAVE user by email; returns `user.id` or `null`
- Used internally by `TradeGateway.handleRegisterNode` to populate `slaveId` on `connectedClients`

**11. `getActiveMasters()`**
- Filters `role='MASTER' + isActive=true`; returns `{ id, fullName, email, createdAt }[]`

**12. `getMasterProfile(masterId): Promise<MasterProfileResponse>`**
- Requires active MASTER; throws `NotFoundException` if not found
- Computes aggregates from `TradeLogs`:
  - `totalTrades`, `closedTrades`, `winningTrades`, `totalPnL`, `avgVolume`, `winRate`, `subscriberCount`
- Loads up to `MASTER_ANALYTICS_CLOSED_CAP` (2000) newest CLOSED rows ordered by `COALESCE(closedAt, createdAt) DESC`
- Reverses to chronological order and calls `buildAnalytics()`
- Calls `tradeGateway.isMasterConnected(master.id)` for `isLive`
- Returns `MasterProfileResponse` including optional `avatarUrl`, `riskMetrics`, `equitySparkline`, `activeHoursSummary`

**13. `uploadMasterAvatar(masterId, file): Promise<{ avatarUrl: string }>`**
- JWT-protected via controller; validates MIME (JPEG/PNG/WebP) and 3 MB max via `avatar-storage.util`
- Writes `uploads/avatars/{masterId}.{ext}` (ext from MIME); deletes prior file when extension changes
- Sets `Users.avatarUrl` to `/uploads/avatars/{masterId}.{ext}?v={timestamp}` and returns `{ avatarUrl }`

**14. `getMasterSubscribers(masterId): Promise<SubscriberSummary[]>`**
- Finds all slaves with `subscribedToId === masterId`
- For each subscriber, joins `TradeLogs` by `slaveId` to compute `totalCopied` and `totalPnL` (CLOSED rows only)
- Returns `{ id, fullName, email, isActive, totalCopied, totalPnL }[]`

**15. `updateMasterProfile(masterId, dto: UpdateMasterProfileDto): Promise<Omit<User, 'password'>>`**
- Validates master exists; partially updates only fields present in dto (bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime)
- Returns saved master without password

**16. `getMasterDashboard(masterId): Promise<MasterDashboardData>`**
- Calls `getMasterProfile` + fetches last 10 trades + counts open trades
- Returns `{ profile, recentTrades, subscriberCount, openTrades, totalSignalsSent }`

**17. `getTopMasters(): Promise<TopMasterProfile[]>`**
- Fetches all active masters; calls `getMasterProfile` for each; adds `openTrades` count
- Sorts descending by `totalTrades`; returns top 3

**18. `updateSubscription(slaveId, masterId: string | null)`**
- Validates slave user exists; sets `subscribedToId`; returns `{ message, subscribedToId }`

#### Exported Interfaces (from `auth.service.ts`)

```ts
interface LoginResponse {
  access_token: string;
  user: Omit<User, 'password'>;
}

interface MasterDashboardData {
  profile: MasterProfileResponse;
  recentTrades: MasterHistoryEntry[];
  subscriberCount: number;
  openTrades: number;
  totalSignalsSent: number;
}

interface TopMasterProfile extends MasterProfileResponse {
  openTrades: number;
}
```

---

## 7) Trade Module Deep Dive

### File: `src/trade/trade.module.ts`

- Registers TypeORM repositories for `User` and `TradeLog`
- Providers: `TradeGateway`, `TradeService`
- Controller: `TradeController`
- Exports: `TradeService`, `TradeGateway`
- Uses `forwardRef(() => AuthModule)` to break circular dependency with `AuthService`

### File: `src/trade/trade.controller.ts`

Base route prefix: `/trades`. All three routes are `@Public()`.

| Route | Method | Handler | Notes |
|---|---|---|---|
| `/trades/history` | GET | `tradeService.getLatestLogs(50)` | Legacy raw SQL `TradeLog` (singular) table |
| `/trades/master/:masterId/history` | GET | `tradeService.getMasterHistory(masterId)` | TypeORM query on `TradeLogs` entity; last 50 OPEN+CLOSED |
| `/trades/stats` | GET | Hardcoded placeholder | Returns `{ activeSlaves: 1, totalSignals: 100, status: 'Healthy' }` |

### File: `src/trade/trade.service.ts`

Uses `DataSource` for raw SQL (`TradeLog` singular) and TypeORM repository for `TradeLogs` entity.

#### Exported Interface

```ts
interface MasterHistoryEntry {
  id: string;
  symbol: string;
  action: string;
  volume: number;
  status: 'OPEN' | 'CLOSED';
  pnl: number | null;
  createdAt: Date;
  closedAt: Date | null;
}
```

#### Methods

**1. `logSignal(data: any): Promise<number>`**
- Inserts into legacy `TradeLog` (singular) table using raw SQL
- Columns: `MasterID, Symbol, ActionType, Price, Volume`
- Returns `SCOPE_IDENTITY()` as signal ID

**2. `logExecution(userId, signalId, status, latency)`**
- Inserts into `ExecutionLog` table (legacy)

**3. `getLatestLogs(limit: number)`**
- `SELECT TOP (@0) * FROM TradeLog ORDER BY SignalTimestamp DESC`
- Returns raw SQL rows

**4. `getMasterHistory(masterId: string): Promise<MasterHistoryEntry[]>`**
- TypeORM `tradeLogRepository.find` on `TradeLogs` entity
- Filters by `masterId`, orders by `createdAt DESC`, takes last 50
- Returns mapped `MasterHistoryEntry[]`

### File: `src/trade/trade.gateway.ts`

Gateway config: `@WebSocketGateway({ cors: { origin: '*' } })`

Implements `OnGatewayConnection`, `OnGatewayDisconnect`.

#### State

```ts
private connectedClients = new Map<string, ConnectedClientInfo>();
private connectedMasters = new Set<string>();
```

`ConnectedClientInfo` shape:
```ts
type ConnectedClientInfo = {
  role: 'MASTER' | 'SLAVE';
  identifier: string;
  subscribedMasterId?: string;  // master's user ID (set for both MASTER and SLAVE)
  slaveId?: string | null;      // slave's user ID (set for SLAVE only)
};
```

#### Public Methods

- `getConnectedMasterIds(): string[]` — Returns `Array.from(this.connectedMasters)`. Called by `AuthController.getLiveMasters()`.
- `isMasterConnected(masterId: string): boolean` — Returns `this.connectedMasters.has(masterId)`. Called by `AuthService.getMasterProfile()` for `isLive` field.

#### `handleConnection(client: Socket)`

Logs `client_connected` with `clientId`, `handshakeAddress`, `health_state: 'CONNECTED'`.

#### `handleDisconnect(client: Socket)`

1. Looks up disconnecting client in `connectedClients`
2. If MASTER: removes `subscribedMasterId` from `connectedMasters` set
3. If SLAVE: emits `subscriber_update { slaveEmail, online: false, timestamp }` to `room_master_<subscribedMasterId>`
4. Removes client from `connectedClients`
5. Logs `client_disconnected` with `health_state: 'DISCONNECTED'`

#### Event: `register_node`

Payload: `{ role: string; identifier: string }`

**MASTER flow:**
1. Lookup by `licenseKey + role='MASTER'`
2. Join `room_master_${user.id}`
3. Set `client.data.user = user`
4. Add `user.id` to `connectedMasters` set
5. Store in `connectedClients`: `{ role: 'MASTER', identifier, subscribedMasterId: user.id }`
6. Emit `node_registered { success: true, role, room, timestamp }`

**SLAVE flow (subscribed):**
1. Lookup by `email + role='SLAVE'`
2. If `user.subscribedToId` exists:
   - Resolve `slaveId` via `authService.getSlaveIdByEmail(identifier)`
   - Join `room_master_${user.subscribedToId}`
   - Store in `connectedClients`: `{ role: 'SLAVE', identifier, subscribedMasterId: user.subscribedToId, slaveId }`
   - Emit `subscriber_update { slaveEmail: identifier, online: true, timestamp }` to master room
   - Emit `node_registered { success: true, role, room, timestamp }` back to client
3. If no `subscribedToId`:
   - Emit `node_registered { success: false, role, error: 'Room assignment failed', timestamp }` back to client

#### Event: `test_signal`

Payload: dynamic trade signal object

**Flow:**

1. **Authorization guard:** requires `client.data.user` with `role === 'MASTER'`; ignores unauthorized signals

2. **Trace ID resolution:** uses `data?.trace_id || randomUUID()`

3. **Legacy logging:** transforms to `logData` shape; calls `tradeService.logSignal(logData)` to insert into legacy `TradeLog` table; stores result as `oldSignalId`; catches and logs errors without blocking broadcast

4. **TradeLogs entity write:**
   - `event === 'OPEN'`:
     - Counts connected SLAVE clients in master room (from `connectedClients`)
     - Sets `slaveId` only when exactly 1 slave is present; otherwise `null`
     - Saves `masterPrice: data.masterPrice ?? null`
     - Creates and saves new `TradeLog` row with `status: 'OPEN'`
   - `event === 'CLOSE'`:
     - Finds open row by `masterId + ticketNumber + status='OPEN'`
     - Updates `status: 'CLOSED'`, `pnl: data.pnl`, `closedAt: new Date()`
     - Logs warning if no matching open row found

5. **Room broadcast:** emits `trade_execution` to `room_master_${masterUser.id}` with:
   - All original `data` fields spread (includes `masterPrice` when present)
   - `trace_id` (resolved above)
   - `signalId: oldSignalId` (legacy signal ID or null)
   - `server_ts: Date.now()` (Unix ms; used by frontend for latency measurement)

#### Event: `trade_execution_ack` (additive — slippage hardening)

`handleTradeExecutionAck(client, data)` — slave-to-backend execution report for slippage auditability.

1. **Context resolution:** resolves `masterId` from `connectedClients.get(client.id)?.subscribedMasterId`; ignores the message (warn log) when there is no master context or `master_ticket` is missing
2. **Target lookup:** finds the newest OPEN `TradeLog` by `masterId + ticketNumber + status='OPEN'` (`order: { createdAt: 'DESC' }`); warns and returns if none found
3. **Diagnostics update:** sets `copierPrice`, `slippagePointsConfigured`, `slippagePointsActual` (only when present and non-null), `masterPrice` (only if still null), and `slippageBlocked: Boolean(data.slippageBlocked)`; saves the row
4. **Multi-slave caveat:** the master OPEN row is shared across slaves, so values are exact for single-slave rooms and best-effort (last writer) otherwise — same limitation as `slaveId`
5. Wrapped in try/catch with structured `trade_execution_ack_save_failed` logging

ACK payload status values: `EXECUTED`, `BLOCKED_SLIPPAGE`, `FAILED`. Status is informational; `slippageBlocked` is the persisted diagnostic.

---

## 8) Master Analytics Utility (`src/auth/master-analytics.util.ts`)

### Constants

```ts
const MASTER_ANALYTICS_CLOSED_CAP = 2000;  // max closed trades loaded per master
const EQUITY_SPARKLINE_POINTS = 50;         // max points in downsampled sparkline
```

### Exported Types

```ts
interface MasterRiskMetrics {
  maxDrawdownPercent: number;
  avgTradesPerDay: number;
  longestLosingStreakTrades: number;
  bestDayPnl: number;
}

interface MasterAnalyticsResult {
  riskMetrics?: MasterRiskMetrics;
  equitySparkline?: number[];
  activeHoursSummary?: string | null;
}

type ClosedTradeRow = {
  pnl: number | null;
  closedAt: Date | null;
  createdAt: Date;
};
```

### Exported Functions

**`computeRiskMetrics(trades: TradeLog[]): MasterRiskMetrics | null`**
- Input: CLOSED trades, oldest-first
- Returns `null` if empty
- Computes:
  - `maxDrawdownPercent`: peak-to-trough drawdown over cumulative PnL sequence
  - `avgTradesPerDay`: `trades.length / calendarDaysInclusive(first, last)` rounded to 2 dp
  - `longestLosingStreakTrades`: consecutive trades with `pnl < 0`
  - `bestDayPnl`: highest single calendar day cumulative PnL (by UTC date key)

**`computeEquitySparkline(trades: TradeLog[]): number[] | null`**
- Input: CLOSED trades, oldest-first
- Returns `null` if fewer than 2 trades
- Returns full cumulative PnL sequence if ≤ 50 points
- When > 50 trades: downsamples to exactly 50 evenly-spaced points using linear index mapping

**`computeActiveHours(trades: TradeLog[]): number[] | null`**
- Input: CLOSED trades (order irrelevant)
- Returns `null` if empty
- Returns 24-element array counting trades per UTC hour (`closedAt ?? createdAt`)

**`buildAnalytics(trades: TradeLog[]): { riskMetrics, equitySparkline, activeHoursSummary } | null`**
- Input: CLOSED trades, oldest-first (already chronological)
- Returns `null` if empty or `computeRiskMetrics` returns null
- Derives `activeHoursSummary` string: finds the 4-hour UTC window with the most signals, e.g. `"Most signals 09:00–13:00 UTC (from recent closed trades)"`. Returns `null` if no signals in any window.

**`computeMasterAnalytics(closedRowsNewestFirst: ClosedTradeRow[]): MasterAnalyticsResult`**
- Input: newest-first capped query result (as returned by the DB query in `getMasterProfile`)
- Sorts to chronological order internally using `effectiveTime` (closedAt ?? createdAt)
- Calls `buildAnalytics`; returns `{}` if no data or analytics unavailable
- Returns `MasterAnalyticsResult` (all fields optional)

### Usage in `getMasterProfile`

`AuthService.getMasterProfile` uses the TypeORM QueryBuilder to fetch the capped closed-trade sample (newest first), reverses it in memory to chronological order, then calls `buildAnalytics` directly (not `computeMasterAnalytics`). Both paths yield equivalent results.

---

## 9) DTOs (`src/auth/dto/auth.dto.ts`)

```ts
// verify-node response
interface VerifyNodeResponse {
  message: string;
  role: string;
  fullName: string;
  id: string;
  trace_id?: string;
}

// Per-field risk metrics from analytics
interface MasterRiskMetricsDto {
  maxDrawdownPercent: number;
  avgTradesPerDay: number;
  longestLosingStreakTrades: number;
  bestDayPnl: number;
}

// Full master profile response
interface MasterProfileResponse {
  id: string;
  fullName: string;
  createdAt: Date;
  totalTrades: number;
  closedTrades: number;
  winRate: number;       // percentage, 2 dp
  totalPnL: number;      // 2 dp
  avgVolume: number;     // 2 dp
  bio: string | null;
  tradingPlatform: string | null;
  instruments: string | null;
  strategyDescription: string | null;
  riskLevel: string | null;
  typicalHoldTime: string | null;
  subscriberCount: number;
  isLive: boolean;
  avatarUrl?: string | null;                    // optional public avatar path + ?v= query
  riskMetrics?: MasterRiskMetricsDto;           // present when closed sample non-empty
  equitySparkline?: number[];                   // omitted when < 2 closed trades
  activeHoursSummary?: string | null;           // null if insufficient data
}

// Subscriber roster item
interface SubscriberSummary {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  totalCopied: number;
  totalPnL: number;
}

// Profile update body
class UpdateMasterProfileDto {
  bio?: string;
  tradingPlatform?: string;
  instruments?: string;
  strategyDescription?: string;
  riskLevel?: string;
  typicalHoldTime?: string;
}
```

---

## 10) End-to-End Request/Event Flows

### A) Registration and Login

1. Client calls `POST /auth/register`
2. Controller forwards body to service; service hashes password, saves, calls `buildAuthResponse`
3. Returns `{ access_token, user }` (password stripped)
4. Client stores `access_token` in `localStorage` as `tsp_access_token` (frontend convention)
5. Protected subsequent requests include `Authorization: Bearer <access_token>`

### B) Master License Lifecycle

1. Admin calls `POST /auth/users/:id/license` with JWT
2. Service validates MASTER role; generates `TSP-XXXX-XXXX`
3. License stored in `Users.licenseKey`
4. Desktop master uses key in `verify-node` and `register_node`

### C) Slave Subscription Lifecycle

1. Slave UI fetches masters via `GET /auth/masters`
2. Slave subscribes via `PATCH /auth/users/:slaveId/subscribe` with JWT
3. Backend writes `Users.subscribedToId`
4. Slave socket connects and emits `register_node { role: 'SLAVE', identifier: email }`
5. Gateway looks up slave, finds `subscribedToId`, joins `room_master_<id>`
6. Gateway emits `subscriber_update { online: true }` to master's room

### D) Trade Signal Fanout

1. Master socket emits `test_signal`
2. Gateway authorizes via `client.data.user.role === 'MASTER'`
3. Gateway writes to legacy `TradeLog` table (raw SQL)
4. Gateway writes/updates `TradeLogs` entity (OPEN creates row; CLOSE updates status/pnl/closedAt)
5. Gateway emits `trade_execution` to `room_master_<masterId>` with `server_ts`, `signalId`, `trace_id`

### E) Slave Disconnect

1. Slave socket disconnects
2. `handleDisconnect` finds slave in `connectedClients`
3. Emits `subscriber_update { online: false }` to master room
4. Removes from `connectedClients`

### F) Live Master Badge

1. Frontend calls `GET /auth/masters/live`
2. Controller calls `tradeGateway.getConnectedMasterIds()`
3. Returns `{ liveIds: string[] }` — master user IDs currently holding an active socket connection
4. Frontend compares against master profiles to display LIVE badges

### G) Master Profile Analytics

1. Frontend calls `GET /auth/masters/:id/profile`
2. `getMasterProfile` queries up to 2000 newest CLOSED `TradeLogs` via QueryBuilder
3. Reverses to chronological; passes to `buildAnalytics`
4. Calls `tradeGateway.isMasterConnected(id)` for `isLive`
5. Returns `MasterProfileResponse` with optional analytics fields

### H) Socket Registration Acknowledgement

1. Client emits `register_node`
2. Gateway processes room join
3. Emits `node_registered { success: true|false, role, room?, error?, timestamp }` back to that socket
4. Client `SocketManager` logs confirmation or failure

---

## 11) Routing and API Surface (Complete)

### HTTP Routes

#### Auth (prefix `/auth`)

| Route | Method | Auth | Public? |
|---|---|---|---|
| `/auth/register` | POST | — | Yes |
| `/auth/login` | POST | — | Yes |
| `/auth/verify-node` | POST | — | Yes |
| `/auth/node-action/revoke-subscriber` | POST | — | Yes |
| `/auth/masters` | GET | — | Yes |
| `/auth/masters/live` | GET | — | Yes |
| `/auth/masters/:id/profile` | GET | — | Yes |
| `/auth/masters/:masterId/subscribers` | GET | — | Yes |
| `/auth/top-masters` | GET | — | Yes |
| `/auth/users` | GET | JWT + ADMIN | No |
| `/auth/users/:id/license` | POST | JWT + ADMIN | No |
| `/auth/users/:id/toggle-status` | PATCH | JWT + ADMIN | No |
| `/auth/masters/:id/profile` | PATCH | JWT + ADMIN or self | No |
| `/auth/masters/:id/dashboard` | GET | JWT + ADMIN or self | No |
| `/auth/users/:id/subscribe` | PATCH | JWT + ADMIN or self | No |

#### Trades (prefix `/trades`, all `@Public()`)

| Route | Method | Notes |
|---|---|---|
| `/trades/history` | GET | Legacy `TradeLog` raw SQL; last 50 |
| `/trades/master/:masterId/history` | GET | `TradeLogs` entity; last 50 per master |
| `/trades/stats` | GET | Static placeholder |

### WebSocket Events

**Incoming from clients:**
- `register_node` — role + identifier registration
- `test_signal` — master trade lifecycle signal
- `trade_execution_ack` — slave OPEN execution report (slippage diagnostics)

**Outgoing from server:**
- `node_registered` — room join confirmation/failure ack
- `trade_execution` — fan-out trade signal to master room subscribers (passes through `masterPrice`)
- `subscriber_update` — slave connect/disconnect notification to master room

---

## 12) Testing

### Co-located Unit Tests in `src/`

**`src/auth/auth.service.spec.ts`** — Tests `AuthService.verifyNode`:
- Verifies MASTER by license key when active → returns role, fullName, trace_id
- Verifies SLAVE by email when active → returns role, trace_id
- Rejects inactive node → throws `UnauthorizedException`
- Rejects unknown identifier → throws `UnauthorizedException`
- Mocks: `userRepository.findOne`, `jwtService.signAsync`

**`src/auth/master-analytics.util.spec.ts`** — Tests analytics functions:
- Empty input → `{}`
- Single closed trade → no sparkline (needs ≥ 2), correct `bestDayPnl`
- Losing streak computation
- Best calendar day when all negative
- Exports `MASTER_ANALYTICS_CLOSED_CAP === 2000`

**`src/trade/trade.gateway.spec.ts`** — Tests gateway flows:
- `register_node` joins master to correct room and sets `client.data.user`
- `register_node` joins slave to subscribed master room
- `test_signal` saves to `tradeLogRepo` and emits `trade_execution` with all required keys
- Note: test constructor omits `authService` (test gap; gateway works in isolation for these cases)

### E2E Test

`test/app.e2e-spec.ts` expects `GET /` to return `200` with `'Hello World!'`. No root controller exists in the current codebase. This test is stale and fails if run.

---

## 13) Scripts, Tooling, and Versions

### NPM Scripts (`package.json`)

- `build` → `nest build`
- `start` → `nest start`
- `start:dev` → watch mode
- `start:debug` → debug + watch
- `start:prod` → `node dist/main`
- `lint` → ESLint with `--fix`
- `format` → Prettier on `src` and `test`
- `test`, `test:watch`, `test:cov`, `test:debug`, `test:e2e`

### Core Runtime Dependencies

- `@nestjs/common` `^11.0.1`
- `@nestjs/core` `^11.0.1`
- `@nestjs/config` `^4.0.4`
- `@nestjs/jwt` `^11.0.2`
- `@nestjs/passport` `^11.0.5`
- `@nestjs/platform-express` `^11.0.1`
- `@nestjs/platform-socket.io` `^11.1.12`
- `@nestjs/typeorm` `^11.0.0`
- `@nestjs/websockets` `^11.1.12`
- `typeorm` `^0.3.28`
- `mssql` `^12.2.0`
- `msnodesqlv8` `^5.1.3`
- `socket.io` `^4.8.3`
- `bcrypt` `^6.0.0`
- `passport` `^0.7.0`
- `passport-jwt` `^4.0.1`
- `reflect-metadata` `^0.2.2`
- `rxjs` `^7.8.1`

### TypeScript/Compiler Behavior (from `tsconfig.json`)

- `module` and `moduleResolution` are `NodeNext`
- `target` is `ES2022`
- Decorators enabled (`emitDecoratorMetadata`, `experimentalDecorators`)
- Strict mode relaxed: `strict: false`, `noImplicitAny: false`
- `strictNullChecks: true` — kept on
- `skipLibCheck: true` — speeds compile
- `esModuleInterop: true`, `allowSyntheticDefaultImports: true`
- `resolvePackageJsonExports: true`

---

## 14) Known Risks and Design Constraints

1. **JWT/Auth**
   - Passwords stored as bcrypt hashes for current users; legacy plaintext rows migrated lazily on successful login.
   - JWT required on all non-`@Public()` routes via global `JwtAuthGuard`. Missing or expired token → `401`. Valid token but wrong role/ownership → `403`.
   - Database credentials hardcoded in `database.module.ts` — move to env vars for production.

2. **Data Modeling Drift**
   - `TradeLogs` entity (TypeORM) vs legacy `TradeLog` table (raw SQL) — two separate tables. Raw SQL writes still happen for backward compatibility but analytics and history use the TypeORM entity.

3. **Circular Dependencies**
   - `AuthModule ↔ TradeModule` via `forwardRef()`. Fragile if modules are restructured; test carefully if refactoring imports.

4. **Validation Gaps**
   - Controller bodies are not validated with DTOs/class-validator beyond ad-hoc checks.
   - Some payloads typed `any` in `TradeGateway.handleTestSignal`.

5. **Operational Gaps**
   - `synchronize: true` risky outside development.
   - Stale e2e test (`test/app.e2e-spec.ts`) fails if run.
   - `test.gateway.spec.ts` omits `authService` from constructor — safe for tested scenarios but must be updated if tests for SLAVE registration are added.

---

## 15) Safe Extension Rules for AI Coding Models

1. **Do not rename existing routes/events** — `register_node`, `test_signal`, `trade_execution`, `node_registered`, `subscriber_update` are all fixed contracts.
2. **Preserve room naming** `room_master_${id}` in socket logic.
3. **Keep verify-node semantics intact:**
   - MASTER identified by license key
   - SLAVE identified by email
4. **Do not remove fields consumed by clients** (`fullName`, `role`, `licenseKey`, `subscribedToId`, `id`, `trace_id` in verify-node response).
5. **`@Public()` is the JWT opt-out** — do not remove it from public endpoints or add JWT to desktop-facing routes (`verify-node`, `revoke-subscriber`).
6. **`buildAuthResponse` strips the password** — never return raw `User` entities from login/register.
7. **Circular dependency handled via `forwardRef`** — maintain this pattern if adding new cross-module injections between `AuthModule` and `TradeModule`.
8. **`slaveId` on TradeLogs** is set only when exactly 1 slave is in the room — preserve this "exactly one" guard.
9. **`connectedMasters` Set** must be kept in sync: add on MASTER register_node, remove on MASTER disconnect. `isMasterConnected()` and `getConnectedMasterIds()` are consumed by `AuthService` and `AuthController`.
10. **Prefer additive changes** — new methods/routes; no column or route removal.
11. **Update this README whenever contracts change.**

---

## 16) Quick Reference: File-to-File Communication Map

1. `main.ts` boots `AppModule`
2. `AppModule` imports `ConfigModule`, `DatabaseModule`, `AuthModule`, `TradeModule`
3. `DatabaseModule` creates global TypeORM connection
4. `AuthModule` provides global `JwtAuthGuard`; exports `AuthService`, `JwtModule`
5. `AuthController` delegates to `AuthService`; calls `tradeGateway.getConnectedMasterIds()` for `/masters/live`
6. `AuthService` reads/writes `User` and `TradeLog` repositories; calls `tradeGateway.isMasterConnected()` for `isLive`; calls `jwtService.signAsync` for token issuance
7. `TradeModule` provides `TradeGateway`, `TradeService`; exports both
8. `TradeController` delegates to `TradeService`
9. `TradeService` executes raw SQL via `DataSource` (legacy) + TypeORM `tradeLogRepository.find` (history)
10. `TradeGateway` uses:
    - `TradeService` — legacy signal logging
    - `AuthService` — `getSlaveIdByEmail()` during SLAVE registration
    - `userRepo` — identity lookup during `register_node`
    - `tradeLogRepo` — OPEN/CLOSE lifecycle writes
11. `TradeGateway` emits `trade_execution` to per-master rooms; emits `subscriber_update` on slave connect/disconnect; emits `node_registered` ack to registering socket

---

## 17) Local Run Checklist

1. Ensure SQL Server is running with expected DB/user credentials (`TradeSyncPro`, `tsp_admin`, `StrongPassword123!`).
2. Copy `.env.example` to `.env` in `trade-sync-backend/`; set `JWT_SECRET`.
3. In `trade-sync-backend`, run `npm install`.
4. Start in dev mode: `npm run start:dev`.
5. Verify:
   - HTTP base: `http://localhost:3000`
   - Socket endpoint: same backend host
   - Frontend origin: `http://localhost:3001` (CORS configured in `main.ts`)

---

## 18) Canonical Contract Pointer

For cross-project integration contracts (backend + frontend + client), use:

- `SYSTEM_CONTRACT_MATRIX.md` (workspace root)

If any REST route, socket event, payload field, role identity rule, or room-routing behavior changes, update the matrix first, then synchronize this backend guide.

---

Treat this file as the source of truth for current backend behavior contracts and integration boundaries.

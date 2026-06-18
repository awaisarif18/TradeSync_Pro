# TradeSync Pro Frontend — Deep Technical Documentation

This document is the authoritative engineering guide for `trade-sync-frontend`.  
Written for human developers and AI coding agents so new features can be added safely without breaking existing flows.

---

## 1. Project identity

| Field | Value |
|-------|-------|
| Package | `trade-sync-frontend` v0.1.0 |
| Framework | Next.js 16.1.6 (App Router) |
| UI Runtime | React 19.2.3 |
| Language | TypeScript 5 (strict mode) |
| State | Redux Toolkit 2.11.x + React Redux 9.x |
| HTTP client | Axios 1.13.x |
| Realtime | Socket.IO client 4.8.x |
| Styling | Tailwind CSS v4 (PostCSS, no tailwind.config.ts) |
| Charts | Recharts 3.8.x |
| Toasts | Sonner 2.0.x |
| Icons | Lucide React 0.563.x |
| Dev port | `http://localhost:3001` |
| Backend target | `http://localhost:3000` (hardcoded in `services/api.ts`) |

Primary frontend responsibilities:

1. Public marketing landing and traders marketplace (unauthenticated)
2. Login + registration with JWT-based auth persistence
3. Role-gated dashboards: `MASTER` (Provider Console), `SLAVE` (Copier Terminal), `ADMIN` (System Administration)
4. Admin user/license/status management console
5. Copier subscription management with live signal KPIs
6. Realtime `trade_execution` WebSocket feed via `useIncomingSignals`

---

## 2. Complete file structure

```text
trade-sync-frontend/
├── frontendReadme.md
├── README.md                              # Default Next.js starter README (not this doc)
├── package.json
├── package-lock.json
├── next.config.ts                         # Minimal; no custom rewrites or env overrides
├── tsconfig.json                          # strict, baseUrl ".", @/* → ./src/*
├── eslint.config.mjs                      # Next core-web-vitals + TS presets
├── postcss.config.mjs                     # @tailwindcss/postcss (Tailwind v4 entry point)
├── .gitignore                             # Includes .env*, design-source/, *.tsbuildinfo
├── public/
│   ├── file.svg
│   ├── vercel.svg
│   └── window.svg
└── src/
    ├── app/
    │   ├── globals.css                    # @import "tailwindcss"; @theme tokens; fonts; keyframes
    │   ├── layout.tsx                     # Root shell: ReduxProvider + Navbar + main + Toaster
    │   ├── page.tsx                       # Landing (async server component, fetches /trades/history)
    │   ├── not-found.tsx                  # 404 page with design tokens
    │   ├── error.tsx                      # Route error boundary (reset + home link)
    │   ├── global-error.tsx               # Root error boundary (imports globals.css for tokens)
    │   ├── (auth)/
    │   │   ├── layout.tsx                 # Thin wrapper: min-h-screen + dark bg for auth routes
    │   │   ├── login/page.tsx             # Split-screen login at /login (handles 403 requiresOtp gate)
    │   │   ├── register/page.tsx          # Split-screen registration at /register (redirects to /verify-email)
    │   │   ├── verify-email/page.tsx      # Signup OTP entry at /verify-email; auto-login on success
    │   │   └── forgot-password/page.tsx   # 3-step password reset at /forgot-password
    │   ├── dashboard/
    │   │   └── page.tsx                   # Auth gate + role switch → ProviderDashboard or CopierDashboard
    │   ├── admin/
    │   │   ├── layout.tsx                 # min-h-screen wrapper (no tab nav; page owns UI)
    │   │   └── page.tsx                   # Admin console: user table, KPIs, actions
    │   ├── traders/
    │   │   ├── page.tsx                   # Provider marketplace grid at /traders
    │   │   └── [id]/page.tsx              # Public provider detail page at /traders/:id
    │   ├── docs/
    │   │   ├── layout.tsx                 # Docs shell wrapper (.docs-root breakout)
    │   │   └── [[...slug]]/page.tsx       # SSG catch-all MDX docs renderer; /docs redirects to introduction
    │   ├── downloads/
    │   │   └── page.tsx                   # Public Provider + Copier desktop download cards
    │   └── test-ui/
    │       └── page.tsx                   # Internal UI sandbox (no auth guard; dev only)
    ├── components/
    │   ├── ui/                            # Design system primitives (canonical import via index.ts)
    │   │   ├── index.ts                   # Barrel export for all ui/ primitives
    │   │   ├── Avatar.tsx                 # Initials-based avatar with optional src; deterministic color from avatar-color.ts
    │   │   ├── Button.tsx                 # Primary/ghost/ghost-mint/ghost-danger/primary variants; loading; sizes sm/md
    │   │   ├── Card.tsx                   # Container with Card, CardBody, CardHeader; variant="role-violet"|"role-danger"
    │   │   ├── EmptyState.tsx             # Centered empty state: icon, title, description, action slot
    │   │   ├── Input.tsx                  # Input with label, leftIcon, rightIcon, error string
    │   │   ├── Logo.tsx                   # TradeSync Pro wordmark; size="sm|md|lg"; asLink prop
    │   │   ├── Pill.tsx                   # Inline status/label pill; variants: default/mint/danger/violet/outline-*
    │   │   ├── RoleBadge.tsx              # MASTER → "Provider" pill; SLAVE → "Copier" pill; ADMIN → "Admin" pill
    │   │   ├── SectionEyebrow.tsx         # Small uppercase label above headings; color="mint|violet|default"
    │   │   ├── Skeleton.tsx               # Pulsing loading placeholder; variant="line|rect"; width/height props
    │   │   └── StatusPill.tsx             # Live/idle/broadcasting/disconnected/listening pill with dot; mono prop
    │   ├── common/
    │   │   ├── Button.tsx                 # Legacy button (pre-design-system, kept for compatibility)
    │   │   ├── Card.tsx                   # Legacy metric card (pre-design-system, kept for compatibility)
    │   │   ├── Input.tsx                  # Legacy input (pre-design-system, kept for compatibility)
    │   │   └── KpiCard.tsx                # Premium KPI tile: hover lift+glow, icon tint, loading skeleton
    │   ├── layout/
    │   │   ├── ReduxProvider.tsx          # Redux Provider + hydrateAuth on useLayoutEffect
    │   │   ├── Navbar.tsx                 # Legacy top nav (not used in root layout; retained for reference)
    │   │   └── Footer.tsx                 # Legacy footer (not used in root layout; landing uses FooterStrip)
    │   ├── navigation/
    │   │   └── Navbar.tsx                 # Active top nav; role/auth-aware; sticky glassmorphic
    │   ├── charts/
    │   │   └── EquityCurve.tsx            # SVG decorative equity curve (marketing + auth rails)
    │   ├── feed/
    │   │   ├── MarketTicker.tsx           # Live crypto+FX prices; CoinGecko + Frankfurter; 60s refresh
    │   │   └── TradeRow.tsx               # Typed trade row for decorative rails in Hero/login
    │   ├── auth/
    │   │   ├── OtpInput.tsx               # 6-box numeric OTP input (auto-advance, paste, backspace); used by verify-email + forgot-password
    │   │   ├── LoginForm.tsx              # Legacy login form component (not used by /login page; retained)
    │   │   ├── RegisterMasterForm.tsx     # Legacy MASTER registration form (not used by /register; retained)
    │   │   └── RegisterSlaveForm.tsx      # Legacy SLAVE registration form (not used by /register; retained)
    │   ├── docs/
    │   │   ├── Sidebar.tsx                # Generated nav grouped by section; mobile drawer
    │   │   ├── TableOfContents.tsx        # Right-rail h2/h3 anchor links
    │   │   ├── Breadcrumb.tsx             # Docs › section › page
    │   │   ├── PrevNext.tsx               # Footer prev/next from sidebar order
    │   │   └── MdxComponents.tsx          # MDX element overrides (internal Link, code blocks)
    │   ├── downloads/
    │   │   └── DownloadCard.tsx           # Provider/Copier download card (reused on /downloads)
    │   ├── landing/
    │   │   └── TopTradersSection.tsx      # Public landing trader showcase
    │   ├── marketing/
    │   │   ├── Hero.tsx                   # Landing hero section
    │   │   ├── HowItWorks.tsx             # Three-step explainer section
    │   │   ├── ProviderShowcase.tsx        # Landing provider card grid
    │   │   ├── VerifiedProviderShowcaseBlock.tsx  # 'use client'; calls GET /auth/top-masters + /auth/masters
    │   │   ├── LiveTradeFeedCard.tsx       # Server-fed closed-trade table (server component; 5 rows)
    │   │   ├── ContactSection.tsx          # 'use client'; Formspree POST; inline success
    │   │   └── FooterStrip.tsx             # 3-column footer; dynamic copyright year
    │   ├── marketplace/
    │   │   ├── TraderCard.tsx              # Provider profile card; modes: preview/marketplace/subscribed
    │   │   ├── TraderCardSkeleton.tsx      # Skeleton placeholder for TraderCard
    │   │   ├── RiskFilter.tsx              # Risk-level pill filter row (ALL/LOW/MEDIUM/HIGH)
    │   │   ├── ProviderHeroBand.tsx        # Provider detail identity band (name, handle, asset, risk)
    │   │   ├── PerformanceBigCard.tsx      # Provider detail performance card + copy action button
    │   │   ├── RiskProfileCard.tsx         # Risk metrics card (maxDrawdown, avgTrades, streak, bestDay)
    │   │   ├── InstrumentsCard.tsx         # Comma-split instrument pill list from profile.instruments
    │   │   └── TradingHoursCard.tsx        # activeHoursSummary display or fallback copy
    │   ├── dashboard/
    │   │   ├── ProviderDashboard.tsx       # Provider console: overview + profile-setup tabs
    │   │   ├── CopierDashboard.tsx         # Copier terminal: subscriptions + live KPIs + marketplace
    │   │   ├── PnLChart.tsx                # Recharts area chart: cumulative PnL on CLOSED trades
    │   │   ├── TradeHistoryModal.tsx        # Full-screen trade history overlay
    │   │   ├── LiveTradeTable.tsx           # Deprecated WebSocket table wrapper (kept for compat)
    │   │   ├── MasterProfileCard.tsx        # Deprecated profile card (kept for older callers)
    │   │   └── MasterProfileSetup.tsx       # Deprecated standalone profile form (kept for older imports)
    │   └── master/
    │       └── TradeHistoryModal.tsx        # Re-export of dashboard/TradeHistoryModal (canonical import path)
    ├── content/
    │   └── docs/                            # 26 MDX doc pages (source: _docs-source/TradeSyncPro-Docs-Content.md)
    ├── hooks/
    │   └── useIncomingSignals.ts            # Socket: connect → register_node(SLAVE) → trade_execution
    ├── redux/
    │   └── slices/
    │       ├── authSlice.ts                 # Auth state: user, accessToken, isAuthenticated, rehydratedFromStorage
    │       └── store.ts                     # configureStore; exports RootState, AppDispatch
    ├── services/
    │   └── api.ts                           # Axios instance + 4 service objects + TypeScript interfaces
    └── lib/
        ├── cn.ts                            # clsx + tailwind-merge utility
        ├── docs.ts                          # Read MDX content, build nav tree, TOC headings, prev/next
        ├── downloads.ts                     # Provider/Copier Windows download URL constants (placeholders)
        ├── generatePassword.ts              # Crypto-random alphanumeric password generator (≥5 chars) for reset flow
        ├── format.ts                        # formatCurrency, formatPercent, formatVolume, formatDate, formatDateTime, formatTime
        ├── role-display.ts                  # Role → display label and color mapping
        ├── avatar-color.ts                  # Deterministic hue from name string
        ├── media-url.ts                     # resolveMediaUrl — prepends exported API_URL for relative avatar paths
        └── mapMasterToTraderCard.ts         # MasterProfile/TopMaster → TraderCardData + proxyRoi30dFromTotals
```

---

## 3. App Router architecture

### Root layout (`src/app/layout.tsx`)

Every route renders inside the root layout which wraps all content with:

1. `ReduxProvider` — injects Redux store and runs `hydrateAuth()` before first paint
2. `Navbar` from `components/navigation/Navbar.tsx` — sticky, role-aware
3. `<main className="flex-grow container mx-auto px-4 py-8">` — page content slot
4. `<Toaster richColors position="top-right" theme="dark" />` from `sonner`

Fonts loaded via `next/font/google`: **Inter** (`--font-inter`) and **JetBrains Mono** (`--font-jetbrains`).

### Auth hydration timing

`ReduxProvider` uses `useLayoutEffect` (runs synchronously before paint) to dispatch `hydrateAuth()`. This reads `tsp_user` and `tsp_access_token` from `localStorage` and sets `rehydratedFromStorage = true` before any route guard runs.

**Critical:** Every gated page (`/dashboard`, `/admin`) waits for `rehydratedFromStorage` before making redirect decisions. Without this guard, a hard refresh drops logged-in users to `/login`.

### Server vs. client components

Files without `'use client'` are server components by default. All interactive, Redux-reading, or routing components are explicitly marked `'use client'`.

Key server components:
- `src/app/layout.tsx`
- `src/app/page.tsx` (landing — async, fetches from backend)
- `src/components/marketing/LiveTradeFeedCard.tsx`

Key client components:
- All `'use client'` marked files — login/register pages, dashboard pages, admin page, traders pages, all dashboard components, `Navbar`, `MarketTicker`, `ContactSection`, `VerifiedProviderShowcaseBlock`, `ReduxProvider`

---

## 4. Routes — complete behavior map

Auth routes (`/login`, `/register`, `/verify-email`, `/forgot-password`) do not render an in-page `Logo`; branding comes from the global `Navbar` in the root layout only.

### `/docs` — Documentation site

**Type:** SSG server components (`src/app/docs/[[...slug]]/page.tsx`)

- `/docs` redirects to `/docs/getting-started/introduction`.
- Content lives in `src/content/docs/**/*.mdx` (parsed with `gray-matter`, rendered with `next-mdx-remote/rsc`).
- Three-column layout: generated sidebar (by `section` + `order`), MDX article in `.docs-prose`, right-rail TOC from `h2`/`h3`.
- Navbar **Docs** link points to `/docs` (public and authenticated).
- No client-side content fetching; all pages pre-rendered via `generateStaticParams`.

### `/downloads` — Desktop app downloads

**Type:** server component (`src/app/downloads/page.tsx`)

- Public page with two cards: **Provider app** and **Copier app**.
- Download URLs read from `src/lib/downloads.ts` (`PROVIDER_WINDOWS_DOWNLOAD_URL`, `COPIER_WINDOWS_DOWNLOAD_URL` — placeholders to fill in).
- Role-aware dashboard CTAs: Provider dashboard links to the provider installer; Copier dashboard empty state includes a Copier download button.

### `/` — Marketing landing

**Type:** async server component (`src/app/page.tsx`)

**Data fetching:** Calls `GET /trades/history` at `http://localhost:3000` with `next: { revalidate: 60 }` (ISR, 60-second stale window). Normalizes rows keeping only CLOSED trades where action is BUY or SELL. Shows up to 5 rows. Falls back to empty array on fetch error.

**Component composition order:**
1. `Hero` — landing hero with product preview rail
2. `MarketTicker` — live crypto/FX prices (client component, 60s refresh; CoinGecko BTC/ETH/SOL/XRP/ADA/DOGE + Frankfurter EUR/USD and GBP/USD)
3. `VerifiedProviderShowcaseBlock` — client component; calls `GET /auth/top-masters` and `GET /auth/masters`
4. `LiveTradeFeedCard` — receives server-fetched `recentTrades` prop; 6-column table (Time, Symbol, Action, Volume, P&L, Status)
5. `ContactSection` — client; Formspree POST `{name, email, message}`; inline success state
6. `FooterStrip` — 3-column marketing footer with dynamic copyright year

**Note on `LiveTradeFeedCard`:** backend `/trades/history` currently returns `TradeLogs` rows. The normalizer silently drops OPEN trades and any rows with no symbol or unrecognized action, so zero displayed rows is normal when the DB is empty.

---

### `/login` — Login page

**Type:** `'use client'` (`src/app/(auth)/login/page.tsx`)

**Layout:** Split-screen. Left: form. Right: decorative rail (equity curve card, recent-trades card, testimonial quote).

**Flow:**
1. Client-side validation runs on every keystroke (email regex, password ≥ 5 chars)
2. Submit is disabled while validation errors exist or loading is true
3. `authService.login(email, password)` → `POST /auth/login`
4. On success: `dispatch(loginSuccess({ user: session.user, accessToken: session.access_token }))` → `router.push('/dashboard')` + Sonner success toast
5. On **403 `{ requiresOtp: true, email }`** (unverified account): resends a SIGNUP OTP and redirects to `/verify-email?email=...`
6. On other failures: Sonner error toast + inline password field error

**"Forgot?"** links to `/forgot-password`.

---

### `/register` — Registration page

**Type:** `'use client'` (`src/app/(auth)/register/page.tsx`)

**Layout:** Split-screen. Left: form with role toggle. Right: role-contextual decorative rail.

**Role toggle:** UI labels "I'm a Provider" / "I'm a Copier" map to backend values `MASTER` / `SLAVE`. Default is `SLAVE`.

**Flow:**
1. Client-side validation (full name required, email regex, password ≥ 5 chars)
2. `authService.register({ fullName, email, password, role })` → `POST /auth/register`
3. Response is `{ message, email, requiresOtp: true }` (no token yet). Sonner toast → `router.push('/verify-email?email=...')`
4. Auto-login happens after the OTP is verified on `/verify-email`.

---

### `/verify-email` — Signup OTP entry

**Type:** `'use client'` (`src/app/(auth)/verify-email/page.tsx`), wrapped in `Suspense` for `useSearchParams`.

**Flow:**
1. Reads `email` from the query string.
2. `OtpInput` collects the 6-digit code; `onComplete` (or the button) calls `authService.verifySignupOtp(email, code)` → `POST /auth/otp/verify-signup`.
3. On success: `dispatch(loginSuccess({ user, accessToken }))` → `router.push('/dashboard')` (auto-login).
4. **Resend** is gated by a 30s countdown and calls `authService.resendOtp(email, 'SIGNUP')`.

---

### `/forgot-password` — Password reset (single-page, 3 steps)

**Type:** `'use client'` (`src/app/(auth)/forgot-password/page.tsx`)

**Flow (state machine):**
1. **email** → `authService.requestPasswordReset(email)` → `POST /auth/password-reset/request` (always generic response).
2. **code** → `OtpInput` → `authService.verifyResetOtp(email, code)` → `POST /auth/password-reset/verify` → stores `resetToken`. Resend gated by 30s countdown.
3. **password** → two fields with match + `≥5` rule and a **Generate strong password** button (`generatePassword`) → `authService.confirmPasswordReset(resetToken, newPassword)` → `POST /auth/password-reset/confirm`.
4. **done** → animated success tick (`a-tick` / `a-tick-pop` keyframes), then redirect to `/login`.

---

### `/dashboard` — Role-gated dashboard

**Type:** `'use client'` (`src/app/dashboard/page.tsx`)

**Guard logic (`useEffect` on `rehydratedFromStorage`, `isAuthenticated`, `user`, `router`):**
- Wait for `rehydratedFromStorage` before acting
- Not authenticated → `router.push('/login')`
- Authenticated + role `ADMIN` → `router.push('/admin')`
- Returns `null` during hydration or redirects (prevents content flash)

**Renders:**
- `ProviderDashboard` for `MASTER`
- `CopierDashboard` for `SLAVE`

---

### `/admin` — Admin console

**Type:** `'use client'` (`src/app/admin/page.tsx`)

**Guard:** Same `rehydratedFromStorage` wait. Non-`ADMIN` roles are redirected to `/dashboard`.

**Data:** `adminService.getUsers()` → `GET /auth/users` (JWT-protected; backend enforces ADMIN role).

**KPI strip (4 tiles, derived from in-memory `users` array, no extra API calls):**
- Total Users — `users.length`
- Active Subscriptions — `SLAVE` users with truthy `subscribedToId`
- Platform Masters — `MASTER` users with `isActive = true`
- Core Engine — static "Operational"

**User table features:**
- Role filter chips: ALL / Providers (MASTER) / Copiers (SLAVE) / Admins (ADMIN)
- Search across `fullName`, `email`, `licenseKey`
- Per-row actions: MASTER rows get "Issue Key" / "Regenerate Key" (`POST /auth/users/:id/license`), all non-ADMIN rows get "Enable" / "Disable" (`PATCH /auth/users/:id/toggle-status`)
- ADMIN rows show "Protected" with no actions
- Loading state: 8-row skeleton
- Error state: EmptyState with retry button

---

### `/traders` — Provider marketplace

**Type:** `'use client'` (`src/app/traders/page.tsx`)

**Data loading (parallel):**
1. `marketplaceService.getActiveMasters()` → `GET /auth/masters`
2. `marketplaceService.getLiveMasters()` → `GET /auth/masters/live`
3. Per-master `marketplaceService.getMasterProfile(id)` → `GET /auth/masters/:id/profile` (sequential, not parallel)

**Filter:** Client-side risk filter (ALL / LOW / MEDIUM / HIGH) derived from `profile.riskLevel`.

**Cards:** `TraderCard` in `marketplace` mode, with `onAction` navigating to `/traders/:id`.

---

### `/traders/[id]` — Provider detail

**Type:** `'use client'` (`src/app/traders/[id]/page.tsx`)

**Data loading (parallel):**
1. `marketplaceService.getMasterProfile(masterId)` → `GET /auth/masters/:id/profile`
2. `marketplaceService.getMasterHistory(masterId)` → `GET /trades/master/:masterId/history`

**Tabs:** Overview, Trade history, Stats, Reviews.
- Overview and Trade history share the same content panel (2-col layout: chart/history left, risk/instruments/hours right)
- Stats and Reviews render a "Coming soon" `EmptyState` placeholder
- Trade history tab opens `TradeHistoryModal` overlay

**Copy action (`handleCopyProvider`):**
- Unauthenticated → `router.push('/login?next=/traders/:id')`
- MASTER → Sonner error ("Providers can't subscribe to other providers")
- SLAVE, not subscribed → `marketplaceService.updateSubscription(user.id, masterId)` → `PATCH /auth/users/:slaveId/subscribe` with `{ masterId }` → `dispatch(loginSuccess({...user, subscribedToId}))` → Sonner success → `router.push('/dashboard')`
- ADMIN → copy button hidden (`copyHidden={isAdmin}`)

**Sidebar cards:** `RiskProfileCard` (from `profile.riskMetrics`), `InstrumentsCard` (from `profile.instruments`), `TradingHoursCard` (from `profile.activeHoursSummary`)

---

### `/test-ui` — UI sandbox

**Type:** `'use client'` (`src/app/test-ui/page.tsx`)

Internal page for testing UI primitives. No auth guard. Not linked from the navigation.

---

## 5. Redux state management

### Store (`src/redux/slices/store.ts`)

Single reducer: `auth`. Exports `store`, `RootState`, `AppDispatch`.

### Auth slice (`src/redux/slices/authSlice.ts`)

**State shape:**

```ts
interface AuthState {
  user: {
    id: string;
    email: string;
    fullName?: string;
    role: 'MASTER' | 'SLAVE' | 'ADMIN' | null;
    licenseKey?: string | null;       // read by ProviderDashboard LicenseKeyBlock
    subscribedToId?: string | null;   // read by CopierDashboard for subscription routing
  } | null;
  accessToken: string | null;         // JWT; sent as Authorization: Bearer on API calls
  isAuthenticated: boolean;
  rehydratedFromStorage: boolean;     // guards against premature redirects on hard refresh
}
```

**Storage keys:**

| Key | Value |
|-----|-------|
| `tsp_user` | JSON-stringified user object |
| `tsp_access_token` | Raw JWT string |

**Reducers:**

`loginSuccess(payload: { user, accessToken? })`
- Sets `user`, `isAuthenticated = true`, `rehydratedFromStorage = true`
- If `accessToken` is explicitly provided (non-undefined), stores it
- If `accessToken` is omitted (undefined), keeps the existing token — used by subscription updates that patch user without re-issuing JWT
- Persists to `localStorage`

`logout()`
- Clears user, accessToken, isAuthenticated
- Removes `tsp_user` and `tsp_access_token` from `localStorage`
- Sets `rehydratedFromStorage = true`

`hydrateAuth()`
- Reads `tsp_user` and `tsp_access_token` from `localStorage`
- If both exist: restores state; if JSON parsing fails, clears bad data
- If only `tsp_user` exists (no token): clears the orphaned user key
- Always sets `rehydratedFromStorage = true` at the end

**Provider wiring:** `ReduxProvider` wraps the app tree and calls `store.dispatch(hydrateAuth())` in `useLayoutEffect` for synchronous pre-paint hydration.

---

## 6. API service layer

### Axios instance (`src/services/api.ts`)

- `baseURL = 'http://localhost:3000'` (hardcoded)
- Request interceptor: reads `tsp_access_token` from `localStorage` (client-side only), attaches `Authorization: Bearer <token>` when present
- Response interceptor: on `401` for non-login/register URLs, dispatches `logout()` from the Redux store (auto-logout on expired JWT)

### TypeScript interfaces

```ts
MasterRiskMetrics { maxDrawdownPercent, avgTradesPerDay, longestLosingStreakTrades, bestDayPnl }
MasterProfile { id, email?, fullName, createdAt, totalTrades, closedTrades, winRate, avgVolume, totalPnL, bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime, subscriberCount, isLive, riskMetrics?, equitySparkline?, activeHoursSummary? }
UpdateMasterProfileDto { bio?, tradingPlatform?, instruments?, strategyDescription?, riskLevel?, typicalHoldTime? }
RegisterUserData { fullName, email, password, role: 'MASTER' | 'SLAVE' }
AuthSessionUser { id, email, fullName?, role, licenseKey?, subscribedToId? }
AuthSessionResponse { access_token, user: AuthSessionUser }
RegisterResponse { message, email, requiresOtp: true }   // new register shape (no token)
GenericMessageResponse { message }
VerifyResetOtpResponse { resetToken }
OtpPurpose = 'SIGNUP' | 'PASSWORD_RESET'
MasterDashboardData { profile: MasterProfile, recentTrades: TradeHistoryEntry[], subscriberCount, openTrades, totalSignalsSent }
TopMaster extends MasterProfile { openTrades }
TradeHistoryEntry { id, symbol, action, volume, status: 'OPEN'|'CLOSED', pnl: number|null, createdAt, closedAt: string|null }
```

### Service methods

**`authService`**
| Method | HTTP call |
|--------|-----------|
| `login(email, password)` | `POST /auth/login` → `AuthSessionResponse` (403 `requiresOtp` when unverified) |
| `register(userData)` | `POST /auth/register` → `RegisterResponse` (no token; emails SIGNUP OTP) |
| `verifySignupOtp(email, code)` | `POST /auth/otp/verify-signup` → `AuthSessionResponse` (auto-login) |
| `resendOtp(email, purpose)` | `POST /auth/otp/resend` → `GenericMessageResponse` |
| `requestPasswordReset(email)` | `POST /auth/password-reset/request` → `GenericMessageResponse` |
| `verifyResetOtp(email, code)` | `POST /auth/password-reset/verify` → `VerifyResetOtpResponse` |
| `confirmPasswordReset(resetToken, newPassword)` | `POST /auth/password-reset/confirm` → `GenericMessageResponse` |

**`adminService`** (all require ADMIN JWT)
| Method | HTTP call |
|--------|-----------|
| `getUsers()` | `GET /auth/users` |
| `generateLicense(userId)` | `POST /auth/users/:id/license` |
| `toggleUserStatus(userId)` | `PATCH /auth/users/:id/toggle-status` |

**`marketplaceService`**
| Method | HTTP call |
|--------|-----------|
| `getActiveMasters()` | `GET /auth/masters` |
| `getLiveMasters()` | `GET /auth/masters/live` → `{ liveIds: string[] }` |
| `getMasterProfile(masterId)` | `GET /auth/masters/:id/profile` → `MasterProfile` |
| `getMasterHistory(masterId)` | `GET /trades/master/:masterId/history` → `TradeHistoryEntry[]` |
| `updateSubscription(slaveId, masterId\|null)` | `PATCH /auth/users/:id/subscribe` with `{ masterId }` |

**`profileService`**
| Method | HTTP call |
|--------|-----------|
| `getMasterProfile(masterId)` | `GET /auth/masters/:id/profile` → `MasterProfile` |
| `getMasterHistory(masterId)` | `GET /trades/master/:masterId/history` → `TradeHistoryEntry[]` |
| `updateMasterProfile(masterId, dto)` | `PATCH /auth/masters/:id/profile` → `MasterProfileUpdateResult` |
| `uploadMasterAvatar(masterId, file)` | `POST /auth/masters/:id/avatar` (multipart) → `{ avatarUrl }` |
| `getMasterDashboard(masterId)` | `GET /auth/masters/:id/dashboard` → `MasterDashboardData` |
| `getTopMasters()` | `GET /auth/top-masters` → `TopMaster[]` |

**Note:** `marketplaceService.getMasterProfile` and `profileService.getMasterProfile` call the same backend endpoint. The duplication exists because both service objects evolved independently. Prefer `profileService` for dashboard contexts and `marketplaceService` for marketplace contexts.

---

## 7. WebSocket hook — `useIncomingSignals`

**File:** `src/hooks/useIncomingSignals.ts`

**Signature:** `useIncomingSignals(userEmail?: string | null)`

**Returns:** `{ trades, isConnected, connectionState, todayCount, sessionPnl, mirroredTrades, avgLatency }`

### Socket lifecycle

```
mount → io('http://localhost:3000')
  connect event:
    setIsConnected(true)
    setConnectionState('connected')
    if (userEmail) socket.emit('register_node', { role: 'SLAVE', identifier: userEmail })
  disconnect event:
    setIsConnected(false)
    setConnectionState('disconnected')
  trade_execution event:
    prepend { ...data, time: new Date().toLocaleTimeString() } to trades buffer
    cap buffer at 10 entries
    increment sessionSignalTotal (unbounded)
    if data.server_ts is number: compute latency = Date.now() - server_ts
      accept if latency in [0, 60000) ms
      keep rolling window of last 10 samples → update avgLatency
unmount → socket.disconnect()
```

### Derived values

| Return | Derivation |
|--------|------------|
| `todayCount` | `sessionSignalTotal` — monotonic counter, not capped by buffer size |
| `sessionPnl` | `useMemo`: sum of `pnl` on trades where `event.toUpperCase() === 'CLOSE'` and `pnl` is a number |
| `mirroredTrades` | `useMemo`: count of trades where `event.toUpperCase() === 'OPEN'` |
| `avgLatency` | Rolling average of last 10 `server_ts` latency samples; `null` until first valid sample |

### Usage in `CopierDashboard`

`CopierDashboard` passes `user?.email` as identifier. The gateway uses this to join the copier to the room `room_master_<subscribedToId>` where it receives `trade_execution` events from the subscribed master.

The hook emits `register_node` as `SLAVE` (not as a desktop client). This is purely for subscription room routing on the gateway side. The frontend does not trade; it only observes signals.

---

## 8. Dashboard components deep dive

### `ProviderDashboard` (`src/components/dashboard/ProviderDashboard.tsx`)

**Auth requirement:** `user.role === 'MASTER'`. Returns `null` otherwise.

**Data:** `profileService.getMasterDashboard(user.id)` → `GET /auth/masters/:id/dashboard`

**Tabs:** "Overview" and "Profile Setup"

**Overview tab contents:**

1. **LicenseKeyBlock** — reads `user.licenseKey` from Redux state (not from dashboard response). Shows mint-bordered mono key with clipboard copy. Shows "Awaiting admin issuance" warning if key is `null`.

2. **ProviderKpiStrip** — 4 `KpiCard` tiles:
   - Total Signals Sent (`data.totalSignalsSent`)
   - Connected Copiers (`data.subscriberCount`)
   - Open Trades (`data.openTrades`)
   - Win Rate (`profile.winRate`; color: mint if `>50%`, danger if `<40%`, default otherwise; shows `--` if no closed trades)

3. **First-time hero** (when `totalSignalsSent === 0 && profile.bio === null && profile.tradingPlatform === null`): broadcast tower SVG, CTA to download desktop client (points to placeholder `/downloads`) and set up profile.

4. **MyPerformanceCard** — 3 metric cells: Total P&L, Avg Volume, Closed Trades.

5. **RecentSignalHistory** — last 10 trades from `data.recentTrades`. Columns: Symbol, Action (BUY/SELL pills), Volume, P&L, Status, Date.

6. **PublicProfilePreview** — `TraderCard` in `preview` mode using current profile data; "Edit Profile" CTA switches to profile tab.

**Profile Setup tab:**

`ProviderProfileForm` — tracks a `baseline` state (loaded profile) and `form` state (current edits). On submit, `changedProfileFields(baseline, form)` computes a diff and sends only changed keys to `PATCH /auth/masters/:id/profile`. Fields:
- profile photo (hidden file input; `profileService.uploadMasterAvatar`; JPEG/PNG/WebP under 3 MB; preview via `Avatar` + `resolveMediaUrl`)
- bio (textarea, 300 char limit, char counter turns danger at 270)
- tradingPlatform (text input)
- typicalHoldTime (custom `HoldTimeSelect` dropdown: Seconds/Minutes/Hours/Days/Weeks)
- instruments (text input, comma-separated)
- strategyDescription (text input)
- riskLevel (three-button toggle: LOW/MEDIUM/HIGH)

After a successful save, re-fetches dashboard and switches back to overview tab.

**Provider status derivation:** `statusForDashboard` checks if any recent trade has `createdAt` matching today's date OR `subscriberCount > 0`. Returns `"broadcasting"` or `"idle"`. **TODO comment in code:** backend does not yet expose real desktop socket presence; this is a derived proxy.

---

### `CopierDashboard` (`src/components/dashboard/CopierDashboard.tsx`)

**Auth requirement:** `user.role === 'SLAVE'`. Returns `null` otherwise.

**State:**
- `masters: MasterUser[]` — list from `GET /auth/masters`
- `profilesByMaster: Record<string, MasterProfile>` — keyed by master ID
- `currentSubscription: string | null` — initialized from `user.subscribedToId`; kept in sync with Redux via `useEffect`
- `masterHistory: TradeHistoryEntry[]` — trade history for subscribed master (up to 10)
- `historyLoading` — loading state for history

**Data loading:**

1. `fetchMasters` effect (on mount): loads `GET /auth/masters`, then for each master loads profile via `profileService.getMasterProfile` and history via `profileService.getMasterHistory`. Stores in `profilesByMaster` and `historyByMaster` (history by master ID, though only subscribed master's history is displayed).

2. `currentSubscription` effect: when subscription changes, loads `profileService.getMasterHistory(currentSubscription)` → updates `masterHistory`. Cancels via closure flag if subscription changes again before response.

3. `useIncomingSignals(user?.email)` — provides live signal KPIs.

**Dashboard status logic:**

```ts
dashboardStatus =
  !isSubscribed        → 'not-subscribed'
  connectionState === 'connected' → 'listening'
  connectionState === 'connecting' → 'idle'
  else                 → 'disconnected'
```

**Subscribed layout (when `currentSubscription !== null`):**

1. Three KPI tiles: Session P&L, Trades Copied (win rate subtext), Signals Today (avg latency subtext when available)
2. `ActiveSubscriptionCard` — provider identity, stats (Provider's ROI, Today's signals, Session P&L, Mirrored trades), View/Unsubscribe actions
3. Provider marketplace section (all masters, each card in `subscribed` or `marketplace` mode; subscribed master card labeled "View profile")
4. `ProviderTradeHistoryTable` — last 10 rows from `masterHistory`; columns: Time, Symbol, Action, Status, P&L

**Unsubscribed layout:**

1. `CopierKpiStrip` — Active Provider (name + browse CTA), Latency (static `< 20 ms` synthetic estimate), Risk Multiplier (static "Managed by app")
2. Empty state card with bridge illustration
3. Trending providers section (first 3 masters)

**`handleSubscribe(masterId)` flow:**
1. `marketplaceService.updateSubscription(user.id, masterId)`
2. `setCurrentSubscription(response.subscribedToId)`
3. `dispatch(loginSuccess({ ...user, subscribedToId: response.subscribedToId }))` — no `accessToken` in payload, so existing token is preserved
4. Sonner success/error toast

---

## 9. Marketplace components

### `TraderCard` (`src/components/marketplace/TraderCard.tsx`)

**`TraderCardData` interface** (exported):

```ts
{
  id: string;
  fullName: string;
  email?: string;
  instruments: string | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  roi30d?: number;                    // proxy from proxyRoi30dFromTotals; not a true 30d ROI
  winRate: number;
  subscriberCount: number;
  isLive: boolean;
  tradingPlatform: string | null;
  typicalHoldTime: string | null;
  strategyDescription: string | null;
  bio: string | null;
  equitySparkline?: number[];         // from profile analytics; renders mini chart when present
  handle?: string;
  primaryAsset?: string;
}
```

**Modes:**
- `preview` — full card for auth rails and "Your Public Profile" preview in ProviderDashboard
- `marketplace` — card in provider marketplace grid with action button
- `subscribed` — card for currently subscribed provider in CopierDashboard marketplace section

**Props:** `trader: TraderCardData`, `mode`, `onAction?`, `actionLabel?`, `actionVariant?`

### `mapMasterToTraderCard.ts` (`src/lib/mapMasterToTraderCard.ts`)

`mapMasterProfileToTraderCardData(master, profile, liveIds)` — canonical conversion from backend data to `TraderCardData`. Used by `/traders` page and `VerifiedProviderShowcaseBlock`.

`proxyRoi30dFromTotals(totalPnL, closedTrades)` — scales `totalPnL / 75`, clamped to ±99.9%, returns `undefined` if `closedTrades < 1`. Used as a visual proxy until backend exposes a real 30-day ROI field. **Known inaccuracy:** the divisor 75 is arbitrary; displayed ROI% on cards does not represent actual 30-day performance.

---

## 10. `KpiCard` component

**File:** `src/components/common/KpiCard.tsx`

**Props:**

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Label above value |
| `value` | `string \| number` | Displayed in large mono font |
| `subtext` | `string?` | Small text below value |
| `icon` | `ReactNode` | Lucide icon; sized externally (e.g. `<Users size={18} />`) |
| `valueColor` | `'default' \| 'mint' \| 'danger' \| 'violet'` | Maps to design tokens |
| `loading` | `boolean` | Replaces content with pulsing skeleton bars |

**Hover behavior:** `translateY(-4px)`, mint border, mint glow shadow, icon wrapper gets `--color-mint-soft` background and `--color-mint` icon color.

**Import path:** `import { KpiCard } from "@/components/common/KpiCard"` (via `@/*` tsconfig alias)

---

## 11. Navigation

### Active Navbar (`src/components/navigation/Navbar.tsx`)

Imported by root layout. Sticky glassmorphic (`backdrop-filter: blur(12px)`), `z-index: 50`.

**Unauthenticated links:** Discover (`/traders`), How it works, Docs (anchor-only, no page) + "Sign in" ghost button + "Get started" primary button.

**Authenticated links (role-dependent):**

| Role | Center links | Action buttons |
|------|-------------|----------------|
| MASTER | Dashboard | Dashboard (active highlight), Log out |
| SLAVE | Discover, Dashboard | Dashboard, Log out |
| ADMIN | Discover, Dashboard, Admin | Dashboard, Admin (danger highlight when active), Log out |

**Log out flow:** `dispatch(logout())` → Sonner "Signed out" toast → `router.push('/login')`.

**Mobile behavior (< 640px):** center links and action buttons hidden via CSS; compact slot shows Dashboard or Sign in plus Log out.

**TODO in code:** Full mobile navigation is deferred; compact fallback is explicit in the component.

### Legacy Navbar (`src/components/layout/Navbar.tsx`)

Not imported by root layout. Retained in repo. Slate-themed, older design.

---

## 12. Design system (`src/components/ui/`)

All primitives exported from `src/components/ui/index.ts`.

### `Button`

Variants: `primary`, `ghost`, `ghost-mint`, `ghost-danger`. Sizes: `sm`, `md` (default). Props: `loading` (disables + shows spinner), `disabled`, `leftIcon`, `rightIcon`, `fullWidth`, `type`, `style`, `onClick`.

### `Card`

`Card` container with `CardBody` (padded inner) and `CardHeader` sub-components. Variant: `role-violet` (violet border) and `role-danger` (danger border) for subscription and error cards.

### `Input`

Full-width input with optional `label`, `leftIcon`, `rightIcon`, `error` string (shows red helper text below). Passes all standard `<input>` props through.

### `Avatar`

Initials display using `avatar-color.ts` for deterministic hue from name. Optional `src` renders a photo when present (marketplace cards, provider hero, copier KPI/subscription, provider profile upload preview). Props: `name: string`, `size: number` (pixel size), `src?: string`.

### `EmptyState`

Centered layout: `icon` slot (ReactNode), `iconFrame` bool (wraps in bordered circle by default), `title`, `description`, `action` slot. Used throughout for loading errors, empty lists, and placeholder tabs.

### `Pill`

Inline label. Variants: `default`, `mint`, `danger`, `violet`, `outline-mint`, `outline-warn`, `outline-danger`. Thin, capitalized text.

### `RoleBadge`

Accepts `role: 'MASTER' | 'SLAVE' | 'ADMIN'`. Renders:
- MASTER → "Provider" (mint-tinted pill)
- SLAVE → "Copier" (violet-tinted pill)
- ADMIN → "Admin" (danger-tinted pill)

### `SectionEyebrow`

Small all-caps label above section headings. Color: `mint`, `violet`, or uncolored (default).

### `Skeleton`

Pulsing grey bar. Variant `line` (default, short bar) and `rect` (block). Width/height configurable.

### `StatusPill`

Status with colored dot + label. Statuses: `live`, `broadcasting`, `listening`, `idle`, `disconnected`, `not-subscribed`. `mono` prop renders label in monospace.

### `Logo`

TradeSync Pro wordmark. Sizes: `sm`, `md`, `lg`. `asLink` wraps in `<Link href="/">`.

---

## 13. Utility library (`src/lib/`)

### `format.ts`

```ts
formatCurrency(n, { sign?: boolean }) → "+$123.45" or "$123.45"
formatPercent(n, { sign?, fractionDigits? }) → "71.0%" or "+71.0%"
formatVolume(n) → "1.00"  // 2 decimal places
formatDate(d) → en-GB locale date string
formatDateTime(d) → en-GB locale date+time string
formatTime(d) → en-GB 24h time string
```

### `mapMasterToTraderCard.ts`

`proxyRoi30dFromTotals(totalPnL, closedTrades)` — see section 9.

`mapMasterProfileToTraderCardData(master, profile, liveIds)` — merges list row + profile + live status check into `TraderCardData`. Maps optional `avatarUrl`. `isLive` is `true` if master.id is in `liveIds` OR `profile.isLive === true`.

### `media-url.ts`

`resolveMediaUrl(avatarUrl)` — returns `undefined` for empty values; passes through absolute URLs; prepends exported `API_URL` from `services/api.ts` for relative paths (preserves `?v=` cache-bust query).

### `avatar-color.ts`

`getAvatarColor(name)` — returns a hue value (number) by summing char codes of name. Used by `Avatar` component.

### `cn.ts`

`cn(...inputs)` — `clsx` + `tailwind-merge` combination. Use for conditional Tailwind class merging.

### `role-display.ts`

`getRoleLabel(role)` and `getRoleColor(role)` — returns display label and CSS color token for each role.

---

## 14. Styling architecture

### Tailwind v4

No `tailwind.config.ts`. Configured via:
- `postcss.config.mjs` — `@tailwindcss/postcss` plugin
- `src/app/globals.css` — `@import "tailwindcss"` and `@theme { ... }` token definitions

### Design token map (from `globals.css`)

| Token | Purpose |
|-------|---------|
| `--color-bg` | `#0a0e0d` — dark app background |
| `--color-surface` | Card/panel background |
| `--color-surface-2` | Elevated surface |
| `--color-line` | Border/divider |
| `--color-line-2` | Elevated border |
| `--color-text` | Primary text |
| `--color-text-2` | Secondary text |
| `--color-text-3` | Muted/hint text |
| `--color-mint` | `#00c389` — primary accent |
| `--color-mint-soft` | Mint tinted surface |
| `--color-violet` | `#7c5cff` — secondary accent (copier/slave UI) |
| `--color-violet-soft` | Violet tinted surface |
| `--color-danger` | Red — errors and destructive actions |
| `--color-danger-soft` | Danger tinted surface |
| `--color-warn` | Amber — warnings |
| `--color-warn-soft` | Warn tinted surface |
| `--font-inter` | Inter variable |
| `--font-jetbrains` | JetBrains Mono variable |

### Font class

`font-mono-tnum` — applies JetBrains Mono with tabular numbers. Used on all numeric displays (prices, KPIs, ticket numbers).

### Docs prose (`.docs-prose`)

Scoped documentation typography in `globals.css`, built from `@theme` tokens (mint links, dark code blocks, JetBrains Mono inline code). Layout utilities: `.docs-layout`, `.docs-sidebar`, `.docs-toc`, `.docs-prev-next`.

---

## 15. Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.6 | App Router framework |
| `react` | 19.2.3 | UI runtime |
| `react-dom` | 19.2.3 | DOM renderer |
| `@reduxjs/toolkit` | ^2.11.2 | Redux store + slices |
| `react-redux` | ^9.2.0 | React-Redux bindings |
| `axios` | ^1.13.4 | HTTP client |
| `socket.io-client` | ^4.8.3 | WebSocket client |
| `recharts` | ^3.8.1 | PnL area chart in `PnLChart.tsx` |
| `lucide-react` | ^0.563.0 | Icon library |
| `sonner` | ^2.0.7 | Toast notifications |
| `clsx` | ^2.1.1 | Conditional class names |
| `tailwind-merge` | ^3.4.0 | Tailwind class deduplication |
| `next-mdx-remote` | ^5.x | Server-side MDX rendering for `/docs` |
| `gray-matter` | ^4.x | YAML frontmatter parsing for doc pages |
| `remark-gfm` | ^4.x | GFM tables/lists in docs |
| `rehype-slug` | ^6.x | Heading `id` anchors in docs |
| `rehype-autolink-headings` | ^7.x | Clickable heading anchors in docs |

### Dev

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5 | Type checker |
| `tailwindcss` | ^4 | CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS bridge for Tailwind v4 |
| `eslint` | ^9 | Linter |
| `eslint-config-next` | 16.1.6 | Next.js ESLint rules |

---

## 16. File-to-file communication map

```
src/app/layout.tsx
  └─ ReduxProvider (dispatches hydrateAuth on useLayoutEffect)
  └─ Navbar (reads auth from Redux; dispatches logout)
  └─ Toaster (global toast surface)

src/app/(auth)/login/page.tsx
  └─ authService.login() → POST /auth/login
  └─ dispatch(loginSuccess({user, accessToken}))
  └─ router.push('/dashboard')

src/app/(auth)/register/page.tsx
  └─ authService.register() → POST /auth/register
  └─ router.push('/login')  [no auto-login]

src/app/dashboard/page.tsx
  └─ reads Redux { isAuthenticated, user, rehydratedFromStorage }
  └─ renders ProviderDashboard (MASTER) or CopierDashboard (SLAVE)

src/components/dashboard/ProviderDashboard.tsx
  └─ profileService.getMasterDashboard() → GET /auth/masters/:id/dashboard
  └─ profileService.updateMasterProfile() → PATCH /auth/masters/:id/profile
  └─ reads user.licenseKey from Redux

src/components/dashboard/CopierDashboard.tsx
  └─ marketplaceService.getActiveMasters() → GET /auth/masters
  └─ profileService.getMasterProfile(id) per master
  └─ profileService.getMasterHistory(id) per master + subscribed master
  └─ marketplaceService.updateSubscription() → PATCH /auth/users/:id/subscribe
  └─ dispatch(loginSuccess({ ...user, subscribedToId }))  [no accessToken]
  └─ useIncomingSignals(user.email) → WebSocket trade_execution

src/app/traders/page.tsx
  └─ marketplaceService.getActiveMasters() → GET /auth/masters
  └─ marketplaceService.getLiveMasters() → GET /auth/masters/live
  └─ marketplaceService.getMasterProfile(id) per master

src/app/traders/[id]/page.tsx
  └─ marketplaceService.getMasterProfile(id)
  └─ marketplaceService.getMasterHistory(id)
  └─ marketplaceService.updateSubscription() on copy action
  └─ dispatch(loginSuccess({ ...user, subscribedToId }))

src/app/admin/page.tsx
  └─ adminService.getUsers() → GET /auth/users
  └─ adminService.generateLicense(id) → POST /auth/users/:id/license
  └─ adminService.toggleUserStatus(id) → PATCH /auth/users/:id/toggle-status

src/hooks/useIncomingSignals.ts
  └─ io('http://localhost:3000')
  └─ socket.emit('register_node', { role: 'SLAVE', identifier: email })
  └─ socket.on('trade_execution', ...)
```

---

## 17. Known issues and TODOs

The following are real code-level observations, not documentation errors:

1. **Hardcoded backend URL** (`http://localhost:3000`) appears in three places: `services/api.ts`, `useIncomingSignals.ts`, and `app/page.tsx`. No `process.env.NEXT_PUBLIC_API_URL` usage. Moving to an env var requires updating all three and adding a `.env.local` template.

2. **ROI proxy inaccuracy:** `proxyRoi30dFromTotals` divides total P&L by 75 (arbitrary). The displayed "ROI%" on `TraderCard` does not represent actual 30-day returns. A `// TODO` comment in both `ProviderDashboard.tsx` and `CopierDashboard.tsx` notes this.

3. **Provider status is derived, not real:** `statusForDashboard` in `ProviderDashboard` uses today's trade presence as a proxy for "broadcasting." The backend has no endpoint for live desktop socket presence. A `// TODO` comment is present.

4. **Legacy duplicate components:** Three legacy components in `src/components/auth/` (`LoginForm`, `RegisterMasterForm`, `RegisterSlaveForm`) are not imported by the active auth pages. The active pages own their forms inline. These legacy components should not be confused with the active implementation.

5. **Two Navbar files:** `src/components/layout/Navbar.tsx` (legacy, not used) and `src/components/navigation/Navbar.tsx` (active, used by root layout). Only the `navigation/` version should be modified.

6. **`profileService` and `marketplaceService` duplicate profile/history methods:** Both service objects expose `getMasterProfile` and `getMasterHistory` pointing to identical endpoints. This is a historical artifact; they can be safely deduplicated.

7. **`CopierDashboard` fetches all master histories on mount:** The bootstrap `useEffect` loads `profileService.getMasterHistory` for every active master. This causes N+1 requests on load and is a performance concern as the number of masters grows.

8. **Latency KPI is synthetic when `server_ts` is absent:** `useIncomingSignals` shows `< 20 ms` as a static display value in `CopierKpiStrip` regardless of actual latency. The dynamic `avgLatency` from `server_ts` only works when the backend gateway injects `server_ts` into `trade_execution` payloads.

9. **`/downloads` route is a placeholder:** `FirstTimeProviderHero` CTA navigates to `/downloads` which does not exist. A TODO comment is present.

10. **Mobile navigation is incomplete:** A `// TODO` in `Navbar.tsx` marks the compact mobile fallback as a temporary placeholder pending a full mobile nav redesign.

11. **Stats and Reviews tabs are placeholder EmptyState:** `/traders/[id]` tabs for "Stats" and "Reviews" show "Coming soon" with a TODO comment.

12. **`recharts` is used only for `PnLChart.tsx`:** If chart functionality is added elsewhere, import from the existing `recharts` dependency. Do not add a second chart library.

---

## 18. Safe extension rules for AI agents

1. **Never rename socket events.** `register_node` and `trade_execution` are defined in `SYSTEM_CONTRACT_MATRIX.md`. `useIncomingSignals` depends on both.

2. **Never change the Redux user shape without updating all consumers.** `user.licenseKey` is read by `ProviderDashboard`; `user.subscribedToId` is read by `CopierDashboard` and `/traders/[id]`.

3. **Never change storage key names.** `tsp_user` and `tsp_access_token` are read by `api.ts` interceptor and `hydrateAuth`. Changing them silently logs everyone out.

4. **Never call `loginSuccess` without the `accessToken` field when logging in.** On login, include `accessToken: session.access_token`. Omitting `accessToken` (undefined) keeps the old token — this is intentional for subscription updates only.

5. **Always wait for `rehydratedFromStorage` in gated pages.** Adding new gated routes must follow the same pattern as `/dashboard` and `/admin`. Checking only `isAuthenticated` without waiting on `rehydratedFromStorage` redirects users away on hard refresh.

6. **Keep toast as the only user-facing error surface.** No `alert()` or browser dialog calls. Use `toast.error(message)` from `sonner` and `console.error(...)` for logging.

7. **Use `@/...` imports everywhere.** The `tsconfig.json` maps `@/*` to `./src/*`. All component and service imports should use this alias, not relative `../../` paths.

8. **Do not add Tailwind config for new custom values.** Tailwind v4 uses CSS `@theme` tokens in `globals.css`. Add new design tokens there, not in a `tailwind.config.ts` (which does not exist and is not needed).

9. **New admin sub-sections get their own route, not a tab in `admin/page.tsx`.** The admin layout supports nested routing. Add `/admin/nodes`, `/admin/audit`, etc. as new page files.

10. **Do not install a second socket library.** `socket.io-client` is already present. New realtime features should extend `useIncomingSignals` or add a new hook that reuses the same backend namespace.

11. **Update `SYSTEM_CONTRACT_MATRIX.md` and this file whenever an API call, socket event, or route is added.** These two files are the source of truth for inter-service contracts.

---

## 19. Local development

```bash
# from trade-sync-frontend/
npm install
npm run dev      # http://localhost:3001
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

Backend must be running at `http://localhost:3000` for all API calls and WebSocket connections.

---

## 20. Canonical contract pointer

For shared backend/frontend/client integration contracts (REST routes, socket events, payload schemas, auth model):

→ `SYSTEM_CONTRACT_MATRIX.md` at workspace root

When API paths, response schemas, socket event names, or role/identity behavior change, update that matrix first, then align this frontend guide.

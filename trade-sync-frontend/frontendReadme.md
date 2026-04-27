# TradeSync Pro Frontend — Deep Technical Documentation

This document is the authoritative engineering guide for the `trade-sync-frontend` application.  
It is designed for both human developers and AI coding models so new features can be added safely without breaking existing flows.

---

## Scope Lock (Current Phase)

Current implementation scope is Phase 1 only from README_NEXT_STEPS.md: Immediate Priority: Stabilization.

Frontend work allowed in this phase:
1. Maintain compatibility with existing contracts in SYSTEM_CONTRACT_MATRIX.md
2. Support stabilization visibility where needed (existing flows only)
3. Keep live signal behavior compatible while backend/client stabilization changes land

Frontend work deferred for later phases:
1. Real-time operations dashboard expansion
2. Subscription UX hardening enhancements beyond current core flow
3. Incident panel
4. Audit explorer and advanced filtering views

Lightweight testing policy for this project stage:
- Keep frontend testing minimal and practical
- Prioritize manual smoke verification of login, dashboard routing, and live feed behavior
- Avoid broad UI test expansion during Phase 1 stabilization

Phase 1 implementation impact on frontend:
1. No new frontend feature modules were added in this phase
2. Existing live feed remains contract-compatible with backend `trade_execution`
3. Backend now includes optional `trace_id` in payloads; current UI safely ignores extra fields

Manual smoke expectation (frontend-facing behavior):
1. Live trade feed should continue receiving `trade_execution` events
2. No route/Redux contract changes are required for current pages
3. Compatibility remains intact while backend/client stabilization logic runs underneath

---

## 1) Project Identity

- **Project:** `trade-sync-frontend`
- **Version:** `0.1.0`
- **Framework:** Next.js App Router
- **UI Runtime:** React 19
- **Language:** TypeScript
- **State Management:** Redux Toolkit + React Redux
- **Networking:** Axios (HTTP), Socket.IO client (realtime)
- **Styling:** Tailwind CSS v4 (PostCSS plugin)

Primary frontend responsibilities:

1. Public landing, traders marketplace, and auth pages
2. Login + register workflows (Master/Slave)
3. Role-gated dashboards (`MASTER`, `SLAVE`, `ADMIN`)
4. Admin user/license/status management UI
5. Slave marketplace subscription management
6. Realtime trade feed display via WebSocket

---

## 2) Full Frontend File Structure and Responsibilities

```text
trade-sync-frontend/
├─ frontendReadme.md                  # This document
├─ README.md                          # Default Next.js starter README
├─ package.json                       # Scripts, deps, versions
├─ package-lock.json                  # Resolved dependency graph (lockfile v3)
├─ next.config.ts                     # Next config (currently default)
├─ tsconfig.json                      # TypeScript config + path alias
├─ eslint.config.mjs                  # ESLint (Next core-web-vitals + TS)
├─ postcss.config.mjs                 # Tailwind PostCSS plugin wiring
├─ .gitignore                         # Git ignore rules
├─ public/                            # Static starter SVG assets
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
└─ src/
	├─ app/
	│  ├─ globals.css                  # Global CSS + Tailwind theme tokens
	│  ├─ layout.tsx                   # Root app shell: Provider + Navbar + Footer
	│  ├─ page.tsx                     # Marketing landing page
	│  ├─ traders/
	│  │  ├─ page.tsx                  # Provider marketplace grid with risk filter
	│  │  └─ [id]/
	│  │     └─ page.tsx               # Public provider detail page
	│  ├─ login/
	│  │  └─ page.tsx                  # Split-screen login page with Sonner feedback
	│  ├─ register/
	│  │  └─ page.tsx                  # Split-screen Provider/Copier registration page
	│  ├─ dashboard/
	│  │  └─ page.tsx                  # Auth gate + role-based dashboard switch
	│  └─ admin/
	│     ├─ layout.tsx                # Admin shell with horizontal tab navigation
	│     ├─ page.tsx                  # Admin control panel table/actions
	├─ components/
	│  ├─ common/
	│  │  ├─ Button.tsx                # Reusable button with loading state
	│  │  ├─ Input.tsx                 # Reusable input with optional label
	│  │  └─ Card.tsx                  # Metric card used in dashboards
	│  ├─ layout/
	│  │  ├─ ReduxProvider.tsx         # App-level Redux Provider wrapper
	│  │  ├─ Navbar.tsx                # Legacy top nav retained for reference
	│  │  └─ Footer.tsx                # Footer bar
	│  ├─ navigation/
	│  │  └─ Navbar.tsx                # Token-based top nav with role/auth-aware links
	│  ├─ charts/
	│  │  └─ EquityCurve.tsx           # SVG equity curve for cards and marketing previews
	│  ├─ feed/
	│  │  ├─ TradeRow.tsx              # Typed live-trade row display
	│  │  └─ MarketTicker.tsx          # Decorative horizontal market ticker
	│  ├─ marketplace/
	│  │  ├─ TraderCard.tsx            # Provider profile card for marketplace/showcase contexts
	│  │  ├─ TraderCardSkeleton.tsx    # Loading skeleton for provider cards
	│  │  ├─ RiskFilter.tsx            # Risk-level filter pill row
	│  │  ├─ ProviderHeroBand.tsx      # Provider detail identity band
	│  │  ├─ PerformanceBigCard.tsx    # Provider detail performance and copy action
	│  │  ├─ RiskProfileCard.tsx       # Mock risk metrics side card
	│  │  ├─ InstrumentsCard.tsx       # Instrument pill list
	│  │  └─ TradingHoursCard.tsx      # Decorative trading-hours side card
	│  ├─ marketing/
	│  │  ├─ Hero.tsx                  # Landing hero and product preview
	│  │  ├─ HowItWorks.tsx            # Three-card explainer section
	│  │  ├─ ProviderShowcase.tsx      # Landing provider card grid
	│  │  ├─ LiveTradeFeedCard.tsx     # Decorative live-trade feed strip
	│  │  └─ FooterStrip.tsx           # Minimal landing footer strip
	│  ├─ auth/
	│  │  ├─ LoginForm.tsx
	│  │  ├─ RegisterMasterForm.tsx
	│  │  └─ RegisterSlaveForm.tsx
	│  ├─ landing/
	│  │  └─ TopTradersSection.tsx     # Public landing-page trader showcase (Phase 7)
	│  └─ dashboard/
	│     ├─ ProviderDashboard.tsx     # Provider console with overview, profile setup, and empty states
	│     ├─ MasterProfileSetup.tsx   # Deprecated standalone master identity form retained for older imports
	│     ├─ CopierDashboard.tsx      # Copier console with active/empty states and incoming signals
	│     ├─ LiveTradeTable.tsx        # Deprecated WebSocket feed wrapper retained for compatibility
	│     ├─ MasterProfileCard.tsx     # Deprecated dashboard profile card kept for current dashboard callers
	│     ├─ TradeHistoryModal.tsx     # Design-system trade history modal with filters and aggregates
	│     └─ PnLChart.tsx              # Cumulative PnL visualization via recharts (Phase 6)
	├─ hooks/
	│  └─ useIncomingSignals.ts        # Shared trade_execution socket listener for dashboard feeds
	├─ redux/
	│  └─ slices/
	│     ├─ authSlice.ts              # Auth state + reducers
	│     └─ store.ts                  # Redux store + RootState types
	├─ services/
	│  └─ api.ts                       # Axios instance + service wrappers
	└─ lib/
	   ├─ cn.ts                        # clsx + tailwind-merge class helper
	   ├─ role-display.ts              # Role labels and role color mapping
	   ├─ format.ts                    # Currency, percent, volume, and date formatters
	   └─ avatar-color.ts              # Deterministic avatar color helper
```

---

## 3) Runtime Architecture Overview

### App Router Hierarchy

Global app shell (`src/app/layout.tsx`) wraps all routes with:

1. `ReduxProvider` (global Redux store context)
2. `Navbar` (always visible)
3. Central main container (`<main>`)
4. `Footer` (always visible)
5. `Toaster` from `sonner` for dark top-right toast notifications

Admin routes (`/admin/*`) have a nested layout (`src/app/admin/layout.tsx`) that adds horizontal tab navigation above the content region.

### Component Execution Model

- Files without `'use client'` run as server components by default in App Router.
- Interactive/Redux/router/state files explicitly use `'use client'`.

Key client components:

- `register/page.tsx`
- `dashboard/page.tsx`
- `admin/page.tsx`
- `ReduxProvider.tsx`
- `Navbar.tsx`
- all auth forms
- all dashboard widgets including live table

---

## 4) Route-by-Route Behavior

## `/` — Landing (`src/app/page.tsx`)

- Server component landing page using the Phase 2 marketing composites
- Renders the hero/product preview, market ticker, decorative online status strip, how-it-works section, provider showcase, live feed card, and footer strip
- Provider showcase currently uses three mock providers; future real wiring should use `GET /auth/masters` plus per-master profile calls
- Decorative online counts are mock values; only total active providers is currently derivable from existing backend endpoints

## `/traders` — Master Trader Marketplace (`src/app/traders/page.tsx`)

- Client page that fetches active masters via `GET /auth/masters`
- Fetches live master IDs via `GET /auth/masters/live`
- Fetches each master profile via `GET /auth/masters/:id/profile`
- Renders `TraderCard` components in marketplace mode
- Provides client-side risk filters: `All`, `Low Risk`, `Medium Risk`, `High Risk`
- Shows loading skeletons and an empty state when no masters are available

## `/traders/:id` — Public provider detail (`src/app/traders/[id]/page.tsx`)

- Public route with no auth guard
- Fetches provider profile via `GET /auth/masters/:id/profile`
- Fetches trade history via `GET /trades/master/:masterId/history`
- Shows a graceful provider-not-found empty state when the backend returns an error
- Allows unauthenticated visitors to view profile data; copy action redirects them to `/login?next=/traders/:id`
- For authenticated `SLAVE` users, copy action calls `PATCH /auth/users/:slaveId/subscribe` with `{ masterId }`, updates Redux via `loginSuccess`, shows a Sonner toast, and redirects to `/dashboard`
- `MASTER` users receive a Sonner error if they try to copy a provider; `ADMIN` users do not see the copy button

## `/login` — Login page (`src/app/login/page.tsx`)

- Client split-screen auth page with dark token-based inputs and a decorative right rail
- Calls `authService.login(email, password)` and dispatches `loginSuccess(user)` on success
- Redirects to `/dashboard` after login
- Uses `toast.success` / `toast.error` from Sonner instead of `alert()`
- Includes decorative role tabs only; login remains role-agnostic and uses the backend response role

## `/register` — Registration page (`src/app/register/page.tsx`)

- Client split-screen registration page with a role toggle between Provider and Copier
- UI labels are Provider/Copier, but the request payload preserves exact backend role values: `MASTER` or `SLAVE`
- Calls `authService.register({ fullName, email, password, role })`
- Redirects to `/login` after successful registration
- Uses `toast.success` / `toast.error` from Sonner instead of `alert()`

## `/dashboard` — Role-gated dashboard (`src/app/dashboard/page.tsx`)

- Reads Redux auth state (`isAuthenticated`, `user`)
- `useEffect` redirect logic:
  1. not authenticated → `router.push('/login')`
  2. authenticated + role ADMIN → `router.push('/admin')`
- Returns `null` while redirecting (prevents flash)
- Renders:
  - `ProviderDashboard` for role `MASTER`
  - `CopierDashboard` for role `SLAVE`

## `/admin` — Admin panel (`src/app/admin/page.tsx`)

- Fetches users via `adminService.getUsers()` on mount
- Supports client-side role filtering tabs (`ALL`, `MASTER`, `SLAVE`, `ADMIN`)
- Actions per row:
  - generate master license key
  - toggle user active/disabled status
- Uses local state for users/loading/filter

### Admin nested links exposed in horizontal tabs

The admin layout shows:

- active `Users` link to `/admin`
- disabled placeholders for future `Nodes`, `Audit`, and `Settings`

Only `/admin` page exists right now. Future tabs should become links when their pages are added.

---

## 5) State Management (Redux) Deep Dive

### Store (`src/redux/slices/store.ts`)

- Configured with one reducer slice: `auth`
- Exports:
  - `store`
  - `RootState`
  - `AppDispatch`

### Auth Slice (`src/redux/slices/authSlice.ts`)

Auth state shape:

```ts
{
  user: {
	 id: string;
	 email: string;
	 fullName?: string;
	 role: 'MASTER' | 'SLAVE' | 'ADMIN' | null;
	 subscribedToId?: string | null;
  } | null;
  isAuthenticated: boolean;
}
```

Reducers:

1. `loginSuccess(payload)`
	- sets `state.user = payload`
	- sets `state.isAuthenticated = true`

2. `logout()`
	- clears user
	- sets `isAuthenticated = false`

### Store provider wiring

- `src/components/layout/ReduxProvider.tsx` wraps app tree in `<Provider store={store}>`.

### Persistence note

- No persistence layer (localStorage/session) exists.
- Full page reload resets auth state unless new logic is added.

---

## 6) Service Layer and Backend Contracts

### API base (`src/services/api.ts`)

- Shared Axios instance:
  - `baseURL = 'http://localhost:3000'`
  - JSON content-type header

### `authService`

1. `login(email, password)` → `POST /auth/login`
2. `register(userData)` → `POST /auth/register`

### `adminService`

1. `getUsers()` → `GET /auth/users`
2. `generateLicense(userId)` → `POST /auth/users/:id/license`
3. `toggleUserStatus(userId)` → `PATCH /auth/users/:id/toggle-status`

### `marketplaceService`

1. `getActiveMasters()` → `GET /auth/masters`
2. `getLiveMasters()` → `GET /auth/masters/live`
3. `getMasterProfile(masterId)` → `GET /auth/masters/:id/profile`
4. `getMasterHistory(masterId)` → `GET /trades/master/:masterId/history`
5. `updateSubscription(slaveId, masterId)` → `PATCH /auth/users/:id/subscribe`

### `profileService` (Phase 6/7)

1. `getMasterProfile(masterId)` → `GET /auth/masters/:id/profile` — Returns aggregate stats for selected master
2. `getMasterHistory(masterId)` → `GET /trades/master/:masterId/history` — Returns last 50 trades (OPEN + CLOSED)
3. `updateMasterProfile(masterId, dto)` → `PATCH /auth/masters/:id/profile` — Saves master identity fields
4. `getMasterDashboard(masterId)` → `GET /auth/masters/:id/dashboard` — Returns dashboard snapshot for master console
5. `getTopMasters()` → `GET /auth/top-masters` — Returns public top-trader cards for landing page

These endpoints are aligned with the backend behavior documented in `trade-sync-backend/backendReadme.md`.

---

## 7) Auth Forms: Methods and Flows

## `LoginForm` (`src/components/auth/LoginForm.tsx`)

The active `/login` route now owns the split-screen login UI directly. This legacy form is retained for compatibility if reused elsewhere.

Hooks used:

- `useState` for form + loading
- `useDispatch` for Redux update
- `useRouter` for navigation

`handleSubmit` flow:

1. prevent default form submit
2. call `authService.login(email, password)`
3. `dispatch(loginSuccess(user))`
4. redirect to `/dashboard`
5. show Sonner toast on failure

## `RegisterMasterForm`

The active `/register` route now owns the split-screen Provider/Copier registration UI directly. This legacy form is retained for compatibility if reused elsewhere.

`handleSubmit` sends:

```json
{
  "fullName": "...",
  "email": "...",
  "password": "...",
  "role": "MASTER"
}
```

On success: Sonner toast + redirect `/login`.

## `RegisterSlaveForm`

The active `/register` route uses Copier as the UI label, but the backend role value remains `SLAVE`.

`handleSubmit` sends:

```json
{
  "fullName": "...",
  "email": "...",
  "password": "...",
  "role": "SLAVE"
}
```

On success: Sonner toast + redirect `/login`.

---

## 8) Dashboard Components and Realtime Flow

## `ProviderDashboard`

- Two-tab provider console with `Overview` and `Profile Setup`
- Loads `GET /auth/masters/:id/dashboard` on mount using the authenticated master ID from Redux
- Overview tab shows:
	- provider header with derived `broadcasting` or `idle` status
	- read-only license key display with clipboard copy and Sonner feedback
	- 4 stat cards mapped directly from `totalSignalsSent`, `subscriberCount`, `openTrades`, and `profile.winRate`
	- performance boxes for total P&L, average volume, and closed trades
	- recent signal history table for the last 10 trades
	- public profile preview rendered with the shared `TraderCard` in `preview` mode
- Empty overview state appears when `totalSignalsSent === 0`, `profile.bio === null`, and `profile.tradingPlatform === null`
- Profile Setup tab owns the Phase 6 profile form directly. The deprecated `MasterProfileSetup` component remains only for older imports.
- Saving the profile computes a diff against the loaded profile and calls `PATCH /auth/masters/:id/profile` with only changed keys from `{ bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime }`
- `riskLevel` values remain uppercase `LOW`, `MEDIUM`, or `HIGH`; `typicalHoldTime` values match the custom dropdown labels exactly
- Decorative/TODO items:
	- provider status uses `subscriberCount > 0` or recent trades from today until backend exposes real desktop presence
	- connected copiers live sub-count is placeholder copy until backend exposes a live count endpoint
	- 30-day ROI in the preview uses total P&L as a temporary visual proxy until backend exposes real ROI
	- desktop download CTA points to placeholder `/downloads` until desktop packaging is available

## `CopierDashboard`

Core responsibilities:

1. Fetch active providers from backend
2. Track current copier subscription
3. Allow subscribe/unsubscribe actions
4. Sync updated `subscribedToId` back into Redux user state
5. Render active and empty copier dashboard states
6. Show a live incoming-signal table from the shared socket hook

Hooks used:

- `useSelector` → current auth user
- `useDispatch` → update user after subscribe change
- `useState` → masters, loading, current subscription
- `useEffect` → fetch active masters on mount
- `useIncomingSignals` → shared `trade_execution` socket listener and signal counters

Marketplace/profile components:

- Public marketplace pages use `TraderCard` from `src/components/marketplace/TraderCard.tsx`
- Copier dashboard uses `TraderCard` in marketplace and subscribed modes
- Active subscription card shows the selected provider, risk pill, signal count, session P&L, and unsubscribe action
- Empty state shows a provider-selection CTA and a three-card marketplace teaser
- All data fetched via `profileService.getMasterProfile(masterId)` and `profileService.getMasterHistory(masterId)`

`handleSubscribe(masterId)` flow:

1. call `marketplaceService.updateSubscription(user.id, masterId)`
2. update local `currentSubscription`
3. dispatch `loginSuccess({...user, subscribedToId})`
4. show a Sonner toast for success or failure

UI behavior:

- If already subscribed, that provider card renders in subscribed mode and other cards can replace the subscription
- Unsubscribe action uses `masterId = null`

## `useIncomingSignals`

Hooks:

- `useState<Trade[]>`
- `useEffect` for socket lifecycle

Realtime flow:

1. connect to `io('http://localhost:3000')`
2. listen for `trade_execution` events
3. prepend row with local timestamp
4. keep only latest 10 entries
5. disconnect socket on unmount
6. expose connection state plus today count, session P&L, and mirrored-trade count

## `IncomingSignalsTable` and `LiveTradeTable`

- `IncomingSignalsTable` is the Phase 5 visual feed inside `CopierDashboard`
- `LiveTradeTable` is deprecated and retained as a compatibility wrapper around `useIncomingSignals`

Expected trade payload fields consumed:

- `event`
- `symbol`
- `action`
- `volume`
- `master_ticket`

---

## 9) Layout and Navigation Components

## `Navbar` (`src/components/navigation/Navbar.tsx`)

Dynamic navigation logic based on Redux auth state:

- Show `Sign in`/`Get started` when not authenticated
- Show public links `Discover`, `How it works`, `Pricing`, and `Docs` when not authenticated
- Show role-aware links when authenticated:
  - `MASTER` sees `Dashboard`
  - `SLAVE` sees `Discover` and `Dashboard`
  - `ADMIN` sees `Discover`, `Dashboard`, and `Admin`
- Show `Admin` actions only if `user.role === 'ADMIN'`

Other details:

- Uses `usePathname` for active link styles
- Uses the Phase 1 `Logo` and `Button` primitives with Tailwind v4 theme tokens
- Mobile is currently a compact Logo + primary action fallback; full mobile navigation is deferred

## Composite UI Components

- `EquityCurve` renders the deterministic SVG curve used by cards and marketing previews
- `TradeRow` and `MarketTicker` provide decorative feed/ticker display without API calls
- `TraderCard`, `TraderCardSkeleton`, and `RiskFilter` support provider marketplace UI
- `Hero`, `HowItWorks`, `ProviderShowcase`, `LiveTradeFeedCard`, and `FooterStrip` provide reusable landing-page sections

## `Footer`

- Static branding/footer text
- Dynamic year via `new Date().getFullYear()`

## `AdminLayout`

- Renders horizontal admin tabs above the content area
- Keeps `/admin` content full width with no persistent left sidebar

---

## 10) UI Primitive Components

## `Button`

- Variants: `primary`, `secondary`, `danger`
- Supports `isLoading` spinner
- Disables button when `isLoading || props.disabled`

## `Input`

- Optional `label`
- Pass-through of all standard `<input>` props

## `Card`

- Dashboard metric widget
- Color theme union:
  - `blue`, `emerald`, `purple`, `yellow`, `red`
- Accepts Lucide icon component and renders value/title

---

## 11) Styling and Frontend Build Tooling

### `globals.css`

- Imports Tailwind via `@import "tailwindcss"`
- Defines Tailwind v4 `@theme` tokens for dark background, surfaces, text, mint, violet, danger, and warning colors
- Maps `--font-sans` to Inter and `--font-mono` to JetBrains Mono font variables
- Body sets the dark app background, default text color, font smoothing, and global letter spacing
- Includes tabular-number helpers, autofill styling, and shared animation keyframes

### Tailwind/PostCSS

- `postcss.config.mjs` uses `@tailwindcss/postcss`
- Tailwind runtime is v4 (`tailwindcss: ^4`)

### Lint/Type safety

- ESLint uses Next core-web-vitals + TypeScript presets
- TypeScript strict mode is enabled (`strict: true`)

---

## 12) Dependencies and Versions

From `package.json` / lockfile:

### Runtime dependencies

- `next`: `16.1.6`
- `react`: `19.2.3`
- `react-dom`: `19.2.3`
- `@reduxjs/toolkit`: `^2.11.2`
- `react-redux`: `^9.2.0`
- `axios`: `^1.13.4`
- `socket.io-client`: `^4.8.3`
- `lucide-react`: `^0.563.0`
- `clsx`: `^2.1.1`
- `sonner`: `^2.0.7`
- `tailwind-merge`: `^3.4.0`

### Dev dependencies

- `typescript`: `^5`
- `eslint`: `^9`
- `eslint-config-next`: `16.1.6`
- `tailwindcss`: `^4`
- `@tailwindcss/postcss`: `^4`
- React/Node type packages (`@types/*`)

---

## 13) File-to-File Communication Map

1. `src/app/layout.tsx`
	- imports `ReduxProvider`, `Navbar`, `Footer`
2. `ReduxProvider`
	- injects `store` from `redux/slices/store.ts`
3. Auth forms
	- call service layer in `services/api.ts`
	- dispatch `loginSuccess` from `authSlice`
	- navigate with Next router
4. `dashboard/page.tsx`
	- consumes Redux auth state
	- selects provider/copier dashboard component
5. `CopierDashboard`
	- calls `marketplaceService`
	- updates local + Redux subscription state
	- renders `IncomingSignalsTable`
6. `admin/page.tsx`
	- calls `adminService`
	- updates local users table state
7. `useIncomingSignals`
	- opens socket directly to backend
	- listens for incoming `trade_execution` payloads
8. `LiveTradeTable`
	- deprecated compatibility wrapper around `useIncomingSignals`

---

## 14) Current Known Issues / Inconsistencies (Important)

These are present in current source and should be considered before new coding:

1. Admin tabs include disabled placeholders for future pages:
	- `Nodes`, `Audit`, `Settings`

2. `Navbar` mobile menu state exists but no mobile link panel is rendered.

3. Auth state has no persistence across hard refresh.

These are not documentation errors; they reflect current code reality.

---

## 15) Relationship to Backend Contracts

Frontend assumes backend at `http://localhost:3000` and relies on:

- `/auth/register`, `/auth/login`
- `/auth/users`, `/auth/users/:id/license`, `/auth/users/:id/toggle-status`
- `/auth/masters`, `/auth/users/:id/subscribe`
- socket event `trade_execution`

From backend architecture:

- Admin actions have no frontend token guard in this codebase; authorization is effectively backend-dependent.
- Marketplace subscription writes `subscribedToId` in backend user model.
- Trade feed is room/routing-aware in backend, but frontend socket consumer currently just listens globally.

---

## 16) Safe Extension Rules for AI Models

If using AI to generate code changes, apply these constraints:

1. Preserve existing route paths and form submission payload contracts.
2. Keep Redux state shape backward-compatible (`user`, `isAuthenticated`, `subscribedToId`).
3. Do not rename `loginSuccess` reducer without updating all auth forms and marketplace update flow.
4. If moving API base URL to env vars, keep current default behavior for local dev.
5. If adding admin pages (`/nodes`, `/audit`, `/settings`), convert the disabled admin tabs into links.
6. If changing socket logic, preserve display behavior expected by `useIncomingSignals` and `LiveTradeTable`.
7. Prefer additive changes over destructive refactors.
8. Update this document whenever API contracts, state shape, or route behavior changes.

---

## 17) Local Development Commands

From frontend root:

- `npm install`
- `npm run dev` (development)
- `npm run build` (production build)
- `npm run start` (run built app)
- `npm run lint` (ESLint)

Default dev URL: `http://localhost:3001`.

---

## 18) Phase 6: Master Profile & Trading History (Completed)

Phase 6 implementation added the legacy master profile card grid and trade history modal to the former `SlaveDashboard`. Phase 5 of the UI overhaul replaced that screen with `CopierDashboard` and marketplace `TraderCard` rendering.

### New Components

1. **`MasterProfileCard.tsx`** — Displays individual master profile with:
   - Master name, creation date, and subscription buttons
   - Stats grid: total trades, closed trades, win rate, total PnL, average volume
   - Embedded `PnLChart` with cumulative profit/loss visualization
   - "View Trade History" link that triggers `TradeHistoryModal`

2. **`TradeHistoryModal.tsx`** — Full-screen overlay showing:
   - Table of last 50 trades (OPEN and CLOSED status)
   - Columns: Symbol, Action, Status, PnL, Created Date, Closed Date
   - Color-coded rows (green for profitable, red for loss, gray for open)
   - ESC key and backdrop click to close

3. **`PnLChart.tsx`** — Recharts area chart showing:
   - Cumulative PnL evolution over time (filtered to CLOSED trades only)
   - Dynamic gradient color (profit = green, loss = red)
   - Responsive layout with tooltip on hover

### API Integration

- `profileService.getMasterProfile(masterId)` fetches aggregate master stats
- `profileService.getMasterHistory(masterId)` fetches last 50 trades
- Both methods are integrated into `CopierDashboard` via `useEffect` and state management

### Dependencies Added

- `recharts` (`^3.8.1`) for PnL chart visualization

### Integration Pattern

- `CopierDashboard` renders a grid of `TraderCard` components; `MasterProfileCard` remains deprecated for older dashboard callers
- Each card is independent and can fetch/display its own data
- Modal state is scoped to the card component level (no global modal state needed)

---

## 19) Suggested Next Improvements (Non-Breaking)

1. Fix `RootState` import path inconsistencies.
2. Add auth state persistence (or token-based session model).
3. Replace alert-based UX with structured toasts/error banners.
4. Add API request typing instead of broad `any` usage.
5. Implement future admin tabs for nodes, audit logs, and settings.
6. Add route guards for `/admin` based on role at page level.
7. Centralize socket management if multiple realtime widgets are added.

---

## 20) Canonical Contract Pointer

For shared backend/frontend/client integration contracts, use:

- `SYSTEM_CONTRACT_MATRIX.md` (workspace root)

When API paths, response/request schemas, socket events, or role/identity behavior change, update that matrix first, then align this frontend guide.

---

Treat this file as the frontend source-of-truth for architecture and integration behavior when extending `trade-sync-frontend`.

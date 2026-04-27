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
	│  │  └─ page.tsx                  # Master trader marketplace grid
	│  ├─ login/
	│  │  └─ page.tsx                  # Login page wrapper around LoginForm
	│  ├─ register/
	│  │  └─ page.tsx                  # Role toggle + register forms
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
	│  │  ├─ Navbar.tsx                # Top nav with role/auth-aware links
	│  │  └─ Footer.tsx                # Footer bar
	│  ├─ auth/
	│  │  ├─ LoginForm.tsx
	│  │  ├─ RegisterMasterForm.tsx
	│  │  └─ RegisterSlaveForm.tsx
	│  ├─ landing/
	│  │  └─ TopTradersSection.tsx     # Public landing-page trader showcase (Phase 7)
	│  └─ dashboard/
	│     ├─ MasterDashboard.tsx
	│     ├─ MasterProfileSetup.tsx   # Master identity form for profile setup (Phase 7)
	│     ├─ SlaveDashboard.tsx
	│     ├─ LiveTradeTable.tsx        # WebSocket-driven live trade feed
	│     ├─ MasterProfileCard.tsx     # Profile card with stats grid + PnL chart (Phase 6)
	│     ├─ TradeHistoryModal.tsx     # Modal showing last 50 trades (Phase 6)
	│     └─ PnLChart.tsx              # Cumulative PnL visualization via recharts (Phase 6)
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

- Static marketing hero + feature cards
- Links to `/register` and `/login`
- CTA link to `/traders`
- Uses `lucide-react` icons (`ArrowRight`, `ShieldCheck`, `Zap`, `Globe`)

## `/traders` — Master Trader Marketplace (`src/app/traders/page.tsx`)

- Client page that fetches active masters via `GET /auth/masters`
- Fetches each master profile via `GET /auth/masters/:id/profile`
- Renders read-only `MasterProfileCard` components without subscribe/history actions
- Provides client-side risk filters: `All`, `Low Risk`, `Medium Risk`, `High Risk`
- Shows loading skeletons and an empty state when no masters are available

## `/login` — Login page (`src/app/login/page.tsx`)

- Renders card-style wrapper + `LoginForm`
- Link to `/register`

## `/register` — Registration page (`src/app/register/page.tsx`)

- Client state: `role` toggle between `MASTER` and `SLAVE`
- Conditionally renders:
  - `RegisterMasterForm`
  - `RegisterSlaveForm`
- Link to `/login`

## `/dashboard` — Role-gated dashboard (`src/app/dashboard/page.tsx`)

- Reads Redux auth state (`isAuthenticated`, `user`)
- `useEffect` redirect logic:
  1. not authenticated → `router.push('/login')`
  2. authenticated + role ADMIN → `router.push('/admin')`
- Returns `null` while redirecting (prevents flash)
- Renders:
  - `MasterDashboard` for role `MASTER`
  - `SlaveDashboard` otherwise

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
2. `updateSubscription(slaveId, masterId)` → `PATCH /auth/users/:id/subscribe`

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

Hooks used:

- `useState` for form + loading
- `useDispatch` for Redux update
- `useRouter` for navigation

`handleSubmit` flow:

1. prevent default form submit
2. call `authService.login(email, password)`
3. `dispatch(loginSuccess(user))`
4. redirect to `/dashboard`
5. show alert on failure

## `RegisterMasterForm`

`handleSubmit` sends:

```json
{
  "fullName": "...",
  "email": "...",
  "password": "...",
  "role": "MASTER"
}
```

On success: alert + redirect `/login`.

## `RegisterSlaveForm`

`handleSubmit` sends:

```json
{
  "fullName": "...",
  "email": "...",
  "password": "...",
  "role": "SLAVE"
}
```

On success: alert + redirect `/login`.

---

## 8) Dashboard Components and Realtime Flow

## `MasterDashboard`

- Two-tab master console with `Overview` and `Profile Setup`
- Loads `GET /auth/masters/:id/dashboard` on mount using the authenticated master ID from Redux
- Overview tab shows:
	- status badge (`BROADCASTING` or `IDLE`)
	- read-only master license key display with copy action
	- 4 stat cards: total signals sent, connected subscribers, open trades, win rate
	- performance boxes: total PnL, average volume, closed trades
	- recent signal history table for the last 10 trades
	- public profile preview card with bio, platform, instruments, risk badge, and edit button
- Profile Setup tab renders `MasterProfileSetup` with bio, platform, instruments, strategy, risk level, and hold-time fields
- Saving the profile updates local dashboard state and returns to the overview tab

## `SlaveDashboard`

Core responsibilities:

1. Fetch active masters from backend
2. Track current slave subscription
3. Allow subscribe/unsubscribe actions
4. Sync updated `subscribedToId` back into Redux user state
5. Render master profile cards in a grid layout (Phase 6)
6. Show profile stats, PnL chart, and trade history modal per master (Phase 6)

Hooks used:

- `useSelector` → current auth user
- `useDispatch` → update user after subscribe change
- `useState` → masters, loading, current subscription
- `useEffect` → fetch active masters on mount

Phase 6 Enhancements:

- Masters are now displayed as `MasterProfileCard` components (instead of a plain list)
- Each card shows:
  - Master full name and creation date
  - Aggregate stats: total trades, win rate, total PnL, average volume
  - Embedded `PnLChart` with cumulative profit/loss visualization
  - Subscribe/Unsubscribe buttons
  - "View Trade History" link that opens `TradeHistoryModal`
- `TradeHistoryModal` displays a table of the last 50 trades (OPEN + CLOSED) with color-coded statuses and PnL values
- All data fetched via `profileService.getMasterProfile(masterId)` and `profileService.getMasterHistory(masterId)`

`handleSubscribe(masterId)` flow:

1. call `marketplaceService.updateSubscription(user.id, masterId)`
2. update local `currentSubscription`
3. dispatch `loginSuccess({...user, subscribedToId})`
4. alert backend response message

UI behavior:

- If already subscribed, all other subscribe buttons are disabled
- Unsubscribe action uses `masterId = null`

## `LiveTradeTable`

Hooks:

- `useState<Trade[]>`
- `useEffect` for socket lifecycle

Realtime flow:

1. connect to `io('http://localhost:3000')`
2. listen for `trade_execution` events
3. prepend row with local timestamp
4. keep only latest 10 entries
5. disconnect socket on unmount

Expected trade payload fields consumed:

- `event`
- `symbol`
- `action`
- `volume`
- `master_ticket`

---

## 9) Layout and Navigation Components

## `Navbar` (`src/components/layout/Navbar.tsx`)

Dynamic navigation logic based on Redux auth state:

- Show `Login`/`Register` when not authenticated
- Show `Traders` public marketplace link
- Show `Dashboard` when authenticated
- Show `Admin` only if `user.role === 'ADMIN'`

Other details:

- Uses `usePathname` for active link styles
- Includes mobile menu toggle state (`isMobileOpen`) but currently no rendered mobile dropdown panel

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
	- selects master/slave dashboard component
5. `SlaveDashboard`
	- calls `marketplaceService`
	- updates local + Redux subscription state
6. `admin/page.tsx`
	- calls `adminService`
	- updates local users table state
7. `LiveTradeTable`
	- opens socket directly to backend
	- displays incoming `trade_execution` payloads

---

## 14) Current Known Issues / Inconsistencies (Important)

These are present in current source and should be considered before new coding:

1. `RootState` import path mismatches in some files:
	- `Navbar.tsx` imports from `@/redux/store` (path does not exist in current tree)
	- `SlaveDashboard.tsx` imports from `../../redux/store` (path does not exist in current tree)
	- Actual file is `src/redux/slices/store.ts`

2. Admin tabs include disabled placeholders for future pages:
	- `Nodes`, `Audit`, `Settings`

3. `Navbar` mobile menu state exists but no mobile link panel is rendered.

4. Auth state has no persistence across hard refresh.

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
6. If changing socket logic, preserve display behavior expected by `LiveTradeTable`.
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

Phase 6 implementation adds master profile card grid and trade history modal to SlaveDashboard.

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
- Both methods integrated into `SlaveDashboard` via `useEffect` and state management

### Dependencies Added

- `recharts` (`^3.8.1`) for PnL chart visualization

### Integration Pattern

- `SlaveDashboard` renders a grid of `MasterProfileCard` components
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

# TradeSync Pro · Frontend Phase 5 — Implementation Guide

> **Reference hierarchy for every prompt:**
> `frontendReadme.md` + `SYSTEM_CONTRACT_MATRIX.md` → authoritative contracts.
> `backendReadme.md` → authoritative for backend capabilities and what is safe to call.
> Never alter socket event names, Redux shape, or route paths.

---

## Situation Analysis (Read Before Starting)

### The 4.4 Live Trade Feed Problem — Root Cause and Safe Fix

Gemini's attempt broke the backend because it touched `TradeService` which uses **raw SQL against the legacy `TradeLog` (singular) table**. The TypeORM entity is `TradeLogs` (plural). These are separate tables. `synchronize: true` caused column drops when Gemini added TypeORM relations.

**Safe approach:** Do not touch the backend at all. The landing page's live feed can stay on the fallback static data for now. Instead, the **copier dashboard** live feed uses `GET /trades/master/:masterId/history` — that endpoint already works, uses the correct TradeLogs entity via raw SQL in `getMasterHistory`, and returns `{ symbol, action, status, pnl, createdAt, closedAt }[]`. We wire the copier dashboard to this endpoint directly.

### What We're Implementing (Phase 5)

| Feature | Approach | Backend changes? |
|---|---|---|
| Copier dashboard live trade feed | `GET /trades/master/:masterId/history` (already exists) | NONE |
| Latency measurement | Client-side timestamp delta on `trade_execution` socket events | NONE |
| Admin KPI cards | Derive from `GET /auth/users` response (already fetched) | NONE |
| Copier KPI cards | Derive from socket signals + subscription state (already in `useIncomingSignals`) | NONE |
| KPI hover effects | Pure CSS/Tailwind — premium fintech micro-interactions | NONE |

**Zero backend changes in Phase 5.** All data is already available. We just need to surface it.

---

## Phase Sequence

```
5.1 → KpiCard primitive component (shared, hover effects)
5.2 → Admin KPI cards (derive from existing user data)
5.3 → Copier KPI cards (derive from existing signal hook)
5.4 → Copier dashboard live trade history feed
5.5 → Latency measurement in useIncomingSignals hook
5.6 → README update
```

---

## Design Token Cheat Sheet

```
Background:      #0a0e0d   var(--color-bg)
Surface:         #11181a   var(--color-surface)
Surface-2:       #18222a   var(--color-surface-2)
Line:            rgba(255,255,255,0.08)   var(--color-line)
Text:            #e8eef0   var(--color-text)
Text-2:          #8a9ba0   var(--color-text-2)
Text-3:          #5d6d72   var(--color-text-3)
Mint:            #00c389   var(--color-mint)
Mint-soft:       rgba(0,195,137,0.12)
Danger:          #ff5a4a   var(--color-danger)
Violet:          #7c5cff   var(--color-violet)
Border-radius:   12px (cards), 8px (inputs), 999px (pills)
Font-sans:       Inter
Font-mono:       JetBrains Mono
```

---

---

# PHASE 5.1 — KpiCard Primitive Component

**This is the shared building block for both Admin and Copier KPI grids. Build it first so Phases 5.2 and 5.3 can simply import it.**

## Why build a shared component first?

The current `Card.tsx` in `src/components/common/Card.tsx` is a metric card but doesn't have the hover effects or the icon circle pattern Gemini described. Rather than modifying the existing `Card.tsx` (which might break other callers), we create a new `KpiCard.tsx` alongside it. Both admin and copier will use this new component.

## Files to attach
- `src/components/common/Card.tsx` (read-only — understand existing pattern, do not modify)
- `src/app/globals.css` (for token names)
- `frontendReadme.md` § 10 (Card section)

## Prompt

```
# Phase 5.1 · KpiCard Primitive Component

## Reference hierarchy
1. `frontendReadme.md` § 10 (Card section) — understand the existing Card component first.
2. `globals.css` — use these exact CSS variable names in the component.
3. Do NOT modify `Card.tsx`. Create a new file alongside it.

## Scope
Create `src/components/common/KpiCard.tsx` — a premium fintech KPI widget.
This component will be used by both the Admin dashboard and the Copier dashboard.

## Files to create
- CREATE: `src/components/common/KpiCard.tsx`

## Files to NOT touch
- `src/components/common/Card.tsx`
- Any dashboard, admin, or page file

## Props interface
```typescript
interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;        // Lucide icon component
  valueColor?: 'default' | 'mint' | 'danger' | 'violet';
  loading?: boolean;             // Shows skeleton when true
}
```

## Visual design spec

### Base card
```
background: var(--color-surface)   (#11181a)
border: 1px solid var(--color-line)   (rgba(255,255,255,0.08))
border-radius: 12px
padding: 20px
display: flex; flex-direction: column; gap: 12px
```

### Hover effects (apply via Tailwind or inline style transition)
1. **Lift:** `transform: translateY(-4px)` on hover. Use `transition: all 300ms ease`.
2. **Glow border:** `border-color: var(--color-mint)` on hover.
3. **Glow shadow:** `box-shadow: 0 4px 20px rgba(0,195,137,0.10)` on hover.
4. **Icon pop (group hover):** The icon wrapper changes background from `var(--color-surface-2)` to `rgba(0,195,137,0.12)` and icon color changes from `var(--color-text-2)` to `var(--color-mint)`.

### Icon wrapper
```
width: 36px; height: 36px
border-radius: 8px
background: var(--color-surface-2)   (#18222a)
display: flex; align-items: center; justify-content: center
color: var(--color-text-2)
transition: background 300ms ease, color 300ms ease
```

### Title
```
font-size: 11px
text-transform: uppercase
letter-spacing: 0.6px
color: var(--color-text-3)   (#5d6d72)
font-weight: 600
```

### Value
```
font-size: 24px
font-weight: 700
font-family: JetBrains Mono
color: depends on `valueColor` prop:
  'mint'   → #00c389
  'danger' → #ff5a4a
  'violet' → #7c5cff
  'default' → #e8eef0
```

### Subtext
```
font-size: 12px
color: var(--color-text-2)
```

### Skeleton loading state (when loading === true)
Show pulsing placeholder bars instead of actual content:
```
Title: gray bar, 60% width, height 10px, border-radius 4px, opacity-pulse animation
Value: gray bar, 50% width, height 24px, border-radius 4px
Subtext: gray bar, 80% width, height 10px, border-radius 4px
```
Use Tailwind `animate-pulse` and `bg-[rgba(255,255,255,0.08)]` for the skeleton bars.

## Implementation approach
Use a `group` Tailwind class on the outer div for group-hover to work on the icon wrapper.
Use `transition-all duration-300 ease-in-out` on the outer div for lift and border.
Use inline style for the hover-dependent values that can't be done in Tailwind (border-color, box-shadow) — wrap in a `useState` for `isHovered` and apply on `onMouseEnter`/`onMouseLeave`.

Alternatively (simpler): Use only Tailwind classes for everything that maps to Tailwind. For border glow and box-shadow that can't be done in static Tailwind, use the hover state pattern:
```tsx
const [hovered, setHovered] = useState(false);
<div
  style={{
    border: `1px solid ${hovered ? 'var(--color-mint)' : 'var(--color-line)'}`,
    boxShadow: hovered ? '0 4px 20px rgba(0,195,137,0.10)' : 'none',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'all 300ms ease',
    // ... other static styles
  }}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
>
```

## DO NOT
- Modify Card.tsx
- Import from recharts or any charting library
- Add any data-fetching logic — this component only renders what it receives as props
- Add 'use client' only if you use useState (which you do for hovered state) — yes, add it

## Acceptance (manual)
- [ ] `import { KpiCard } from '@/components/common/KpiCard'` works without errors
- [ ] Component renders title, value, subtext, and icon
- [ ] Hovering lifts the card 4px, adds mint border glow
- [ ] Icon background and color change on hover
- [ ] `loading={true}` shows pulsing skeleton bars
```

---

### Manual Testing 5.1
Import the component into any page temporarily to eyeball it. Example:
```tsx
// Temporary test in any page
import { KpiCard } from '@/components/common/KpiCard';
import { Users } from 'lucide-react';
<KpiCard title="Test" value="123" subtext="sub text" icon={<Users size={16} />} valueColor="mint" />
```
Hover it — confirm lift + glow + icon color change.

---

---

# PHASE 5.2 — Admin KPI Cards

**Derives all data from `GET /auth/users` which the admin page already fetches on mount. Zero new API calls.**

## Context
The admin page (`src/app/admin/page.tsx`) already fetches all users via `adminService.getUsers()` and stores them in local state. We can derive all 4 KPI values from that same user array:
- Total Users → `users.length`
- Total Masters → `users.filter(u => u.role === 'MASTER').length`
- Total Slaves → `users.filter(u => u.role === 'SLAVE').length`
- Active Subscriptions → `users.filter(u => u.subscribedToId && u.role === 'SLAVE').length`
- **System Health / Avg Latency** → Static "Operational" for now (latency is client-side only, not available in admin). This is Phase 5.5 data that can be wired later.

## Files to attach
- `src/app/admin/page.tsx`
- `src/components/common/KpiCard.tsx` (just created in 5.1)
- `frontendReadme.md` § 4 (Admin section)

## Prompt

```
# Phase 5.2 · Admin KPI Cards

## Reference hierarchy
1. `frontendReadme.md` § 4 (Admin section) — authoritative for admin page behavior and user state shape.
2. `src/app/admin/page.tsx` — read the existing code fully before making any change.
3. `KpiCard.tsx` — the new KPI card component from Phase 5.1.

## Scope
Add a 4-card KPI grid at the top of the admin page, above the existing filter/search/table.
Derive all values from the `users` array that is already fetched and stored in local state.
Do NOT add any new API calls.

## Files to modify
- MODIFY: `src/app/admin/page.tsx` — add KPI grid at the top of the rendered content

## Files to NOT touch
- Any service file
- Any other component
- Redux state

## KPI cards to add (all derived from `users` local state)
1. **Total Users**
   - Value: `users.length`
   - Subtext: `${masters} Masters / ${slaves} Copiers`
   - Icon: `Users` from lucide-react
   - valueColor: 'default'
   
2. **Active Subscriptions**
   - Value: `users.filter(u => u.role === 'SLAVE' && u.subscribedToId).length`
   - Subtext: `Copiers actively mirroring`
   - Icon: `Link` from lucide-react
   - valueColor: 'mint'

3. **Platform Masters**
   - Value: `users.filter(u => u.role === 'MASTER' && u.isActive).length`
   - Subtext: `Active signal providers`
   - Icon: `Zap` from lucide-react
   - valueColor: 'violet'

4. **Core Engine**
   - Value: `Operational`
   - Subtext: `All systems normal`
   - Icon: `Server` from lucide-react
   - valueColor: 'mint'

## Loading state
Pass `loading={loading}` to each KpiCard where `loading` is the existing loading boolean from the admin page state.

## Layout
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  marginBottom: '24px',
}}>
  <KpiCard ... />
  ...
</div>
```

Add `@media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }` as an inline style or Tailwind equivalent.

## Placement
Insert the KPI grid AFTER the page heading and BEFORE the role filter chips / search bar. Preserve all existing tab logic, filter chips, search, and user table exactly as-is.

## DO NOT
- Add any new API call or fetch
- Change the user table, filter chips, or search behavior
- Change the Redux state or service layer
- Add new admin tabs or change routing

## Acceptance (manual)
- [ ] Admin page shows 4 KPI cards at the top.
- [ ] Card values update when users load (not hardcoded).
- [ ] "Loading..." skeleton shows while users are fetching.
- [ ] Existing user table + filters still work exactly as before.
- [ ] Hover effects work on all 4 cards.
```

---

### Manual Testing 5.2
1. Log in as admin → go to `/admin`.
2. Confirm 4 KPI cards appear above the user table.
3. Check values match what you see in the table (e.g. Total Users count equals the number of table rows).
4. Hover each card — confirm lift + mint border glow + icon color change.
5. Filter chips and user table still work.

---

---

# PHASE 5.3 — Copier KPI Cards

**Derives from data already available: the `useIncomingSignals` hook + Redux user subscription state.**

## Context
The `CopierDashboard.tsx` already has access to:
- `useIncomingSignals` hook → provides `signals` array, `todayCount`, `sessionPnL`, `mirroredCount`
- Redux `user.subscribedToId` → current master subscription
- `masters` fetched from `GET /auth/masters` on mount

The 4 KPI cards for the copier are:
1. **Session P&L** → `sessionPnL` from `useIncomingSignals` (already computed)
2. **Trades Copied** → `mirroredCount` from `useIncomingSignals` (already computed)
3. **Win Rate** → compute from `signals` array: count where `pnl > 0` / total CLOSED signals
4. **Bridge Connection** → derive from whether `currentSubscription` is set + signals are coming in

## Files to attach
- `src/components/dashboard/CopierDashboard.tsx`
- `src/hooks/useIncomingSignals.ts`
- `src/components/common/KpiCard.tsx`
- `frontendReadme.md` § 8 (CopierDashboard section)

## Prompt

```
# Phase 5.3 · Copier KPI Cards

## Reference hierarchy
1. `frontendReadme.md` § 8 (CopierDashboard) — authoritative for existing copier state and hooks.
2. `useIncomingSignals.ts` — read the full hook to understand what it already exposes (signals array, sessionPnL, mirroredCount, todayCount).
3. `CopierDashboard.tsx` — read fully before touching. Understand existing layout and state.
4. `KpiCard.tsx` — use this for all 4 cards.

## Scope
Add a 4-card KPI grid at the top of the CopierDashboard active state.
Only show the KPI grid when the copier has an active subscription (not in the empty state).
All values derived from existing hooks and state — no new API calls.

## Files to modify
- MODIFY: `src/components/dashboard/CopierDashboard.tsx` — add KPI grid to the active state section only

## Files to NOT touch
- `src/hooks/useIncomingSignals.ts` (Phase 5.5 will modify this; touch it in that phase only)
- `src/services/api.ts`
- Redux files

## KPI cards (all values already available in component state/hooks)

1. **Session P&L**
   ```
   title: "Session P&L"
   value: format sessionPnL as "+$X.XX" or "-$X.XX" (check the format.ts lib)
   subtext: "Since session started"
   icon: <LineChart size={16} /> from lucide-react
   valueColor: sessionPnL >= 0 ? 'mint' : 'danger'
   ```

2. **Trades Copied**
   ```
   title: "Trades Copied"
   value: mirroredCount
   subtext: compute win rate: `Win rate: ${winRate}%` 
   icon: <Copy size={16} /> from lucide-react
   valueColor: 'default'
   ```
   Win rate computation:
   ```typescript
   const closedSignals = signals.filter(s => s.event === 'CLOSE' || s.pnl !== undefined);
   const wins = closedSignals.filter(s => (s.pnl ?? 0) > 0).length;
   const winRate = closedSignals.length > 0 ? Math.round((wins / closedSignals.length) * 100) : 0;
   ```

3. **Today's Signals**
   ```
   title: "Signals Today"
   value: todayCount
   subtext: "From your provider"
   icon: <Activity size={16} /> from lucide-react
   valueColor: 'violet'
   ```

4. **Bridge Status**
   ```
   title: "Bridge Status"
   value: currentSubscription ? "Connected" : "Not connected"
   subtext: currentSubscription ? `Mirroring ${providerName}` : "Subscribe to a provider"
   icon: <Wifi size={16} /> from lucide-react
   valueColor: currentSubscription ? 'mint' : 'danger'
   ```
   `providerName`: look up the master name from the `masters` array using `currentSubscription?.id` or fall back to "Provider".

## Layout (same as admin — 4-col grid)
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  marginBottom: '24px',
}}>
  {/* 4 KpiCard components */}
</div>
```

## Placement
Inside the ACTIVE state render path only (when `currentSubscription !== null`), add the KPI grid as the FIRST element, above the existing provider card and signal table.

Do NOT show the KPI grid in the empty/no-subscription state.

## DO NOT
- Modify useIncomingSignals.ts (Phase 5.5 only)
- Change the signal table
- Change subscribe/unsubscribe logic
- Add any new API calls

## Acceptance (manual)
- [ ] Subscribe to a provider → 4 KPI cards appear at top of dashboard.
- [ ] Session P&L shows with correct color (green if positive, red if negative).
- [ ] Bridge Status shows "Connected" with provider name.
- [ ] Unsubscribe → KPI grid disappears (no subscription = empty state, no grid).
- [ ] Hover effects work on all cards.
```

---

### Manual Testing 5.3
1. Log in as a SLAVE user.
2. Go to `/dashboard`. If no subscription: empty state — no KPI cards. ✓
3. Subscribe to a provider.
4. KPI cards appear: P&L (starts at $0.00 green), Trades Copied (0), Signals Today (0), Bridge Connected.
5. Trigger a test signal from the master desktop app — Signals Today should increment.
6. Hover cards — confirm micro-interactions work.

---

---

# PHASE 5.4 — Copier Dashboard Live Trade History Feed

**Uses the existing `GET /trades/master/:masterId/history` endpoint — already implemented, safe, no backend changes needed.**

## Context

The copier dashboard currently has a signals feed powered by the `useIncomingSignals` socket hook — this shows LIVE incoming signals as they arrive. What's MISSING is the historical trade table showing the copier's actual trade history with their current provider.

When a copier subscribes to master Pablo, they should be able to see Pablo's last 50 trades. This endpoint already exists: `GET /trades/master/:masterId/history` returns `{ symbol, action, status, pnl, createdAt, closedAt }[]`.

We add a "Trade History" tab or section below the live signal feed. We do NOT replace the live feed — we ADD the history section.

## Files to attach
- `src/components/dashboard/CopierDashboard.tsx`
- `src/services/api.ts`
- `src/components/dashboard/TradeHistoryModal.tsx` (read-only — understand the existing trade display pattern)
- `frontendReadme.md` §§ 6, 8

## Prompt

```
# Phase 5.4 · Copier Dashboard Live Trade History Feed

## Reference hierarchy
1. `frontendReadme.md` § 8 (CopierDashboard) — understand current component structure.
2. `frontendReadme.md` § 6 (Service layer) — `profileService.getMasterHistory(masterId)` already exists.
3. `src/services/api.ts` — verify the exact name of getMasterHistory and its call signature.
4. `TradeHistoryModal.tsx` — read to understand the existing trade row display pattern and status coloring. Replicate the same visual style but as an inline table (not a modal).

## Scope
Add a "Provider Trade History" section below the existing live signals feed in CopierDashboard.
Show only when the copier has an active subscription.
Fetch `GET /trades/master/:masterId/history` using the subscribed master's ID.
Display the last 10 trades (or all if fewer than 10) in a compact inline table.

## Files to modify
- MODIFY: `src/components/dashboard/CopierDashboard.tsx`
  - Add state: `masterHistory`, `historyLoading`
  - Add useEffect: when `currentSubscription` changes, fetch master history
  - Add render: inline trade history table below existing signals section

## Files to NOT touch
- `src/services/api.ts` (use existing `profileService.getMasterHistory`)
- `TradeHistoryModal.tsx`
- `useIncomingSignals.ts`
- Redux files

## State additions (add to CopierDashboard state)
```typescript
const [masterHistory, setMasterHistory] = useState<MasterHistoryRow[]>([]);
const [historyLoading, setHistoryLoading] = useState(false);

interface MasterHistoryRow {
  symbol: string;
  action: string;
  status: string;
  pnl: number | null;
  createdAt: string;
  closedAt: string | null;
}
```

## Fetch logic (add to existing useEffect or create a new one)
```typescript
useEffect(() => {
  if (!currentSubscription) {
    setMasterHistory([]);
    return;
  }
  setHistoryLoading(true);
  profileService.getMasterHistory(currentSubscription.id)
    .then(data => {
      const rows = Array.isArray(data) ? data.slice(0, 10) : [];
      setMasterHistory(rows);
    })
    .catch(() => setMasterHistory([]))
    .finally(() => setHistoryLoading(false));
}, [currentSubscription]);
```

Note: check the actual field used for master ID in `currentSubscription`. It may be `currentSubscription.id` or `currentSubscription.masterId`. Match whatever the existing subscription object shape is in this component.

## Render — Trade History Section (add AFTER the live signals table)

```
Section heading: "Provider Trade History" (same micro-label style as other section headings in this dashboard)
```

Table columns (match the style from TradeHistoryModal.tsx):
| Time | Symbol | Action | Status | P&L |

Row styling rules (match TradeHistoryModal pattern):
- Status OPEN → no color or muted
- Status CLOSED with pnl > 0 → mint/green text for P&L
- Status CLOSED with pnl < 0 or pnl === 0 → danger/red text for P&L
- Status CLOSED with pnl === null → show `—`
- Action BUY → small mint-soft chip (same as live feed BUY chip)
- Action SELL → small danger-soft chip

Loading state: 3 rows of skeleton placeholders (pulsing gray bars).

Empty state: "No trade history yet for this provider." in muted text.

## DO NOT
- Change or remove the existing live signals IncomingSignalsTable
- Call any endpoint other than `profileService.getMasterHistory`
- Make any changes to the backend
- Change subscribe/unsubscribe logic or Redux state

## Acceptance (manual)
- [ ] Subscribe to a provider who has trade history in the DB.
- [ ] "Provider Trade History" section appears below the live feed.
- [ ] Table shows up to 10 trades with symbol, action chip, status, P&L.
- [ ] P&L is colored correctly (mint=profit, red=loss, dash=null).
- [ ] historyLoading shows skeleton rows while fetching.
- [ ] When unsubscribed, history section disappears.
```

---

### Manual Testing 5.4
1. Make sure backend is running and Pablo (or any master) has trades in TradeLogs.
2. Log in as a copier. Subscribe to Pablo.
3. Scroll to the bottom of the active dashboard state.
4. Confirm the "Provider Trade History" table shows trades with correct P&L coloring.
5. Unsubscribe → history table disappears.
6. Resubscribe → history loads again.

---

---

# PHASE 5.5 — Latency Measurement

**Purely client-side. No backend changes. Measures the time between when a `trade_execution` event is emitted by the backend and when the frontend receives it.**

## How latency is measured

The `trade_execution` socket payload has a `signalId` but no server-side timestamp in the payload contract. However, the backend logs show the time signals are processed. We can't use server timestamps without adding them to the payload (which would be a contract change).

**Safe approach:** The backend already fires `trade_execution` immediately after processing `test_signal`. The Python master sends `test_signal` with a local timestamp. The frontend doesn't have access to that.

**What we CAN do (pure frontend, no contract change):**
- Record `Date.now()` when the socket emits `trade_execution`
- Record `Date.now()` when the frontend receives it
- These two values are always the same event — but we can compute a rolling average of inter-signal arrival deltas and display that as a "signal latency" proxy

**More useful approach:** Add an optional `server_ts` field to the payload on the backend and measure client-receipt delta. BUT this would modify the socket payload — and the non-negotiable rules say "do not add fields that break consumers." Adding an **optional** `server_ts` field is safe (existing consumers ignore unknown fields).

**Decision:** Add `server_ts: Date.now()` to the `trade_execution` emit in the backend gateway (1-line change). Frontend reads it and computes latency. This is additive and safe — all existing socket consumers safely ignore unknown fields per the contract compatibility rules.

## Files needed

**Backend (1-line change):**
- `src/trade/trade.gateway.ts`

**Frontend:**
- `src/hooks/useIncomingSignals.ts`
- `src/components/dashboard/CopierDashboard.tsx`

---

## PROMPT 5.5a — Backend: Add server_ts to trade_execution payload

**Files to attach in Cursor:**
- `src/trade/trade.gateway.ts`
- `SYSTEM_CONTRACT_MATRIX.md` (§ 4.2 — to confirm optional fields are safe)

```
# Phase 5.5a · Backend: Add server_ts to trade_execution

## Reference hierarchy
1. `SYSTEM_CONTRACT_MATRIX.md` § 4.2 (trade_execution payload) — authoritative. The contract says consumer-required keys are event/master_ticket/symbol/action/volume. All other fields are optional additions.
2. `trade.gateway.ts` — find the exact line where `trade_execution` is emitted and add one field.

## Scope
Add `server_ts: Date.now()` to the `trade_execution` emit payload.
This is an additive optional field — existing consumers (Python slave client) safely ignore it.

## Files to modify
- MODIFY: `src/trade/trade.gateway.ts` — ONE LINE CHANGE ONLY

## Implementation
Find the line that emits `trade_execution` (something like):
```typescript
this.server.to(room).emit('trade_execution', { ...data, signalId: oldSignalId });
```

Change it to:
```typescript
this.server.to(room).emit('trade_execution', { ...data, signalId: oldSignalId, server_ts: Date.now() });
```

`Date.now()` returns a Unix timestamp in milliseconds.

## Files to NOT touch
- Any other method in trade.gateway.ts
- trade.service.ts
- trade.controller.ts
- auth.controller.ts
- Any entity files
- Any frontend files

## Acceptance (manual)
- `npm run build` — zero TypeScript errors.
- No other changes.
```

### Manual Testing 5.5a
In browser DevTools → Network → WS tab, watch the `trade_execution` event payload. After this change, the payload should include `server_ts: 1748000000000` (a Unix ms timestamp).

---

## PROMPT 5.5b — Frontend: Latency computation in useIncomingSignals

**Files to attach in Cursor:**
- `src/hooks/useIncomingSignals.ts`
- `frontendReadme.md` § 8 (useIncomingSignals section)

```
# Phase 5.5b · Frontend: Latency measurement in useIncomingSignals

## Reference hierarchy
1. `frontendReadme.md` § 8 (useIncomingSignals) — authoritative for hook structure.
2. `useIncomingSignals.ts` — read the full file before modifying.

## Scope
Add latency computation to useIncomingSignals hook.
When a trade_execution event arrives, if it has `server_ts`, compute:
  `latency = Date.now() - server_ts` (milliseconds)
Track a rolling average of the last 10 latency measurements.
Expose `avgLatency: number | null` from the hook.

## Files to modify
- MODIFY: `src/hooks/useIncomingSignals.ts` — additive changes only

## Files to NOT touch
- CopierDashboard.tsx (will use the new value in Phase 5.5c)
- Any other file

## Implementation

### New state inside the hook
```typescript
const latencyWindowRef = useRef<number[]>([]);  // rolling window of last 10 readings
const [avgLatency, setAvgLatency] = useState<number | null>(null);
```

### Inside the `trade_execution` socket listener (add after existing signal processing)
```typescript
// Latency measurement
if (signal.server_ts && typeof signal.server_ts === 'number') {
  const latency = Date.now() - signal.server_ts;
  if (latency >= 0 && latency < 60000) {  // sanity check: ignore > 1 minute
    latencyWindowRef.current = [...latencyWindowRef.current.slice(-9), latency];
    const avg = Math.round(
      latencyWindowRef.current.reduce((a, b) => a + b, 0) / latencyWindowRef.current.length
    );
    setAvgLatency(avg);
  }
}
```

### Expose from hook return
Add `avgLatency` to the hook's return object alongside the existing exports (signals, todayCount, sessionPnL, mirroredCount).

## TypeScript
The `signal` object already has a dynamic type. Just add an optional field check: `(signal as any).server_ts` if the type doesn't include it, rather than changing the type definition broadly.

## DO NOT
- Change how signals are stored or processed
- Change sessionPnL or mirroredCount computation
- Change the socket connection logic
- Touch any dashboard component

## Acceptance (manual)
- `npm run build` or `npm run dev` — no TypeScript errors.
- `avgLatency` is exported from the hook.
- Existing hook behavior is unchanged.
```

---

## PROMPT 5.5c — Display Latency in Copier Dashboard

**Files to attach in Cursor:**
- `src/components/dashboard/CopierDashboard.tsx`
- `src/hooks/useIncomingSignals.ts` (read-only — to see the new avgLatency export)

```
# Phase 5.5c · Display latency in Copier Dashboard

## Scope
Read `avgLatency` from the `useIncomingSignals` hook and display it in the "Bridge Status" KpiCard we added in Phase 5.3.

## Files to modify
- MODIFY: `src/components/dashboard/CopierDashboard.tsx` — update the Bridge Status KpiCard subtext only

## Implementation
The Bridge Status card currently shows:
```tsx
subtext={currentSubscription ? `Mirroring ${providerName}` : "Subscribe to a provider"}
```

Update to:
```tsx
subtext={
  currentSubscription
    ? avgLatency !== null
      ? `Avg latency: ${avgLatency}ms`
      : `Mirroring ${providerName}`
    : "Subscribe to a provider"
}
```

This shows the latency once signals start arriving, or falls back to the provider name if no signals yet.

## DO NOT
- Change any other KpiCard
- Change the hook
- Change any other logic

## Acceptance (manual)
- [ ] After receiving a test signal from the master app, the Bridge Status card subtext updates to show "Avg latency: Xms".
- [ ] Before any signals arrive, it shows "Mirroring [Provider Name]".
```

---

### Manual Testing 5.5 (combined)
1. Start backend, master app, and slave/copier frontend.
2. Log in as copier, subscribe to Pablo's master.
3. From master desktop app, trigger a test signal.
4. Watch the Bridge Status KPI card in the copier dashboard.
5. It should update to show `Avg latency: Xms` (typical: 5–50ms on localhost).
6. Trigger more signals — the average should stabilize.

---

---

# PHASE 5.6 — README Update

**Files to attach:**
- `frontendReadme.md`
- `SYSTEM_CONTRACT_MATRIX.md`
- `backendReadme.md`

```
# Phase 5.6 · Documentation Sync — Phase 5

## Scope
Update docs only. No code changes.

## Files to modify
- MODIFY: `frontendReadme.md`
- MODIFY: `SYSTEM_CONTRACT_MATRIX.md`
- MODIFY: `backendReadme.md`

## frontendReadme.md changes
1. In § 2 (file structure), add:
   `KpiCard.tsx — Shared premium KPI widget with hover effects (lift + glow + icon pop + skeleton). Used by admin and copier dashboards.`

2. In § 8 (CopierDashboard), add:
   - KPI grid (4 cards: Session P&L, Trades Copied, Signals Today, Bridge Status with avg latency)
   - Provider trade history inline table (from GET /trades/master/:masterId/history)
   - avgLatency exposed by useIncomingSignals hook, displayed in Bridge Status card subtext

3. In § 4 (admin page), add:
   - KPI grid (4 cards: Total Users, Active Subscriptions, Platform Masters, Core Engine) derived from existing user fetch.

4. Add "## 23) Phase 5: KPI Dashboards + Live Trade History + Latency Measurement (Completed)" section.

## SYSTEM_CONTRACT_MATRIX.md changes
In § 4.2 (trade_execution payload), update the payload schema to add:
```json
"server_ts": 1748000000000
```
And note: "Optional. Unix millisecond timestamp. Added Phase 5. Used by frontend for latency display. All existing consumers safely ignore unknown fields."

## backendReadme.md changes
In § 7 (trade.gateway.ts), update the `trade_execution` broadcast description:
"Payload now includes optional `server_ts: Date.now()` for client-side latency measurement (Phase 5, additive). All existing consumers are safe — required payload keys unchanged."
```

---

---

# Legacy Code You Can Delete

After completing Phase 5, these files are confirmed safe to remove:

## 1. `src/components/layout/Navbar.tsx`
**Why:** The frontendReadme notes this as "Legacy top nav retained for reference." The active navbar is at `src/components/navigation/Navbar.tsx`. Confirmed by `layout.tsx` which imports from the `navigation/` path.
**Before deleting:** Run `grep -r "layout/Navbar" src/` to confirm zero imports. If zero hits → safe to delete.

## 2. `src/components/layout/Footer.tsx`
**Why:** frontendReadme notes this as "Optional/legacy layout footer (not used in root layout)." The active footer is `FooterStrip.tsx`. Root `layout.tsx` imports from `marketing/FooterStrip`, not this file.
**Before deleting:** Run `grep -r "layout/Footer" src/` to confirm zero imports. If zero hits → safe to delete.

## 3. `src/components/dashboard/LiveTradeTable.tsx`
**Why:** Marked as "Deprecated WebSocket feed wrapper retained for compatibility." The active component is `IncomingSignalsTable` inside `CopierDashboard`. frontendReadme confirms it's a compatibility wrapper only.
**Before deleting:** Run `grep -r "LiveTradeTable" src/` to confirm no active imports.

## 4. `src/components/dashboard/MasterProfileCard.tsx`
**Why:** Marked as "Deprecated dashboard profile card kept for current dashboard callers." Phase 6 and 8 migrated to `TraderCard` in marketplace mode.
**Before deleting:** Run `grep -r "MasterProfileCard" src/` to confirm no active imports (there may be one in `MasterProfileSetup` — check carefully).

## 5. `src/components/dashboard/MasterProfileSetup.tsx`
**Why:** Marked as "Deprecated standalone master identity form retained for older imports." The active setup is inline in `ProviderDashboard.tsx`.
**Before deleting:** Run `grep -r "MasterProfileSetup" src/` to confirm no active imports.

## How to delete safely
For each file, run the grep check. If zero hits:
```
1. Delete the file
2. Run `npm run build`
3. Confirm no TypeScript errors
```
Delete one file at a time. Don't batch-delete — if something breaks, you know exactly which file caused it.

---

## Summary

| Phase | Files touched | Data source | Backend changes? |
|---|---|---|---|
| 5.1 | KpiCard.tsx (new) | Props only | No |
| 5.2 | admin/page.tsx | Existing user fetch | No |
| 5.3 | CopierDashboard.tsx | useIncomingSignals hook | No |
| 5.4 | CopierDashboard.tsx | GET /trades/master/:id/history (exists) | No |
| 5.5a | trade.gateway.ts | server_ts additive | Yes — 1 line |
| 5.5b | useIncomingSignals.ts | server_ts from payload | No |
| 5.5c | CopierDashboard.tsx | avgLatency from hook | No |
| 5.6 | 3 readme files | Docs only | No |

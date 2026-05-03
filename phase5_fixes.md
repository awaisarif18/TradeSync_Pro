# TradeSync Pro · Phase 5 Fixes

Based on the screenshots and your findings, here is the exact diagnosis and a precise prompt for each fix.

---

## Diagnosis Map

| # | Problem | Root Cause | Fix Phase |
|---|---|---|---|
| 1 | Admin "Active Subscriptions" = 0 even when broadcasting | Correct behavior — socket register_node does NOT set DB subscribedToId. Only web Subscribe button does. | No code change needed — test correctly |
| 2 | Provider KPI cards no hover effect | Phase 5.2 added hover to Admin only. ProviderDashboard was never touched. | Fix 5-D |
| 3 | Copier has 7 KPI cards (3 old + 4 new) | Phase 5.3 added 4 new cards but old 3 (Active Provider, Latency <20ms, Risk Multiplier) were never removed | Fix 5-A |
| 4 | Bridge Status KpiCard is redundant | Pablo card already shows connected + provider name below | Fix 5-A (remove Bridge Status from the 4 new) |
| 5 | Session P&L static, never updates | Pablo card stats not wired to useIncomingSignals hook | Fix 5-C |
| 6 | Latency shows static "< 20 ms" and never changes | Old static card was not removed. avgLatency hook value not moved to Signals Today | Fix 5-A removes static card; Fix 5-A also moves avgLatency to Signals Today subtext |
| 7 | Empty "Waiting for signals..." table above history | IncomingSignalsTable never removed; Provider Trade History already provides the data | Fix 5-B |
| 8 | Pablo card stats static (Today Signals, Session PnL, Mirrored) | Not wired to useIncomingSignals hook | Fix 5-C |

---

## Target Copier Dashboard Layout After Fixes

```
COPIER TERMINAL header  (STATUS: LISTENING badge top-right)

[3 KpiCards: Session P&L | Trades Copied | Signals Today (subtext: "Avg latency: Xms")]

[Pablo card with violet border:
  Pablo Escobar · @pablo · BTCUSD · Medium Risk    [View Profile] [Unsubscribe]
  ─────────────────────────────────────────────────────────────────────────────
  PROVIDER 30D ROI: -$133.77  |  TODAY'S SIGNALS: [live]  |  SESSION P&L: [live]  |  MIRRORED: [live]
]

[Provider Trade History table — real rows from backend]
```

Gone: Static Latency card, Risk Multiplier card, Active Provider card, Bridge Status card, empty IncomingSignals table.

---

---

# FIX 5-A — Remove 3 Old Cards + Bridge Status Card from Copier Dashboard

**Files to attach:**
- `src/components/dashboard/CopierDashboard.tsx`

---

```
# Fix 5-A · Copier Dashboard Card Cleanup

## Context
The copier dashboard currently shows 7 cards in the active/subscribed state:

OLD cards (present before Phase 5.3 — must be DELETED):
  1. "Active Provider" card — showing Pablo Escobar with a broadcast icon
  2. "Latency" card — showing "< 20 ms" static value
  3. "Risk Multiplier" card — showing "Managed by app / Configure in desktop client"

NEW KpiCards (added in Phase 5.3 — 4 total, but one must be removed):
  4. Session P&L
  5. Trades Copied
  6. Signals Today
  7. Bridge Status ← REMOVE this one (redundant with Pablo card below)

After this fix: only 3 KpiCards remain (Session P&L · Trades Copied · Signals Today).

## Files to modify
- MODIFY: `src/components/dashboard/CopierDashboard.tsx`

## Files to NOT touch
- useIncomingSignals.ts
- KpiCard.tsx
- Any other file

## Step 1: Delete the 3 old static card blocks
In the SUBSCRIBED/ACTIVE render branch, find and delete each of:
- The card/div showing "ACTIVE PROVIDER" label + master name avatar
- The card/div showing "LATENCY" label + "< 20 ms" text
- The card/div showing "RISK MULTIPLIER" label + "Managed by app" text
These 3 may be in a shared row container — delete the entire container div too.

## Step 2: Delete the Bridge Status KpiCard
In the 4-KpiCard grid, find the KpiCard with title="Bridge Status" (or containing "BRIDGE").
Delete that KpiCard entry.

Change the grid from 4 columns to 3:
```tsx
gridTemplateColumns: 'repeat(3, 1fr)',
```

## Step 3: Move avgLatency to Signals Today subtext
Find the Signals Today KpiCard. Its subtext is currently "From your provider".
Update it:
```tsx
subtext={avgLatency !== null ? `Avg latency: ${avgLatency}ms` : 'From your provider'}
```
avgLatency comes from the useIncomingSignals destructure already at the top of the component.

## DO NOT
- Remove the Pablo provider card (the large violet-bordered card below the KPI row)
- Remove ProviderTradeHistoryTable
- Remove or modify useIncomingSignals hook call
- Change the empty/no-subscription state

## Acceptance (manual)
- [ ] Active copier state shows exactly 3 KpiCards: Session P&L | Trades Copied | Signals Today
- [ ] No Active Provider, Latency, Risk Multiplier, or Bridge Status cards
- [ ] Signals Today subtext shows "Avg latency: Xms" after first signal, else "From your provider"
- [ ] Pablo provider card and trade history table still present below
- [ ] Hover effects work on all 3 cards
```

---

### Manual Testing Fix 5-A
1. Log in as copier, subscribe to Pablo.
2. Count cards at top: exactly 3 (Session P&L, Trades Copied, Signals Today).
3. No static latency or risk multiplier cards anywhere.
4. Hover the 3 cards — lift + glow confirms.

---

---

# FIX 5-B — Remove IncomingSignals Table

**Files to attach:**
- `src/components/dashboard/CopierDashboard.tsx`

---

```
# Fix 5-B · Remove IncomingSignals Empty Table

## Context
The copier dashboard active state currently renders two table sections:
1. IncomingSignalsTable — shows "Waiting for live market signals..." (empty, useless)
2. ProviderTradeHistoryTable — shows real trade history from the backend (working)

Remove #1 entirely. The ProviderTradeHistoryTable is sufficient.

## Files to modify
- MODIFY: `src/components/dashboard/CopierDashboard.tsx`

## Files to NOT touch
- useIncomingSignals.ts (still used for KPI card data — just don't render the table)
- Any other file

## Implementation
In the SUBSCRIBED/ACTIVE render branch, find the JSX that renders:
- `<IncomingSignalsTable ... />` or a section with heading "INCOMING SIGNALS" / "Live feed from your provider"
Delete the entire block including any wrapping section, card, or eyebrow label.

Keep ProviderTradeHistoryTable exactly as-is.
Keep the useIncomingSignals hook call (it feeds the 3 KpiCards).

## DO NOT
- Remove ProviderTradeHistoryTable
- Remove useIncomingSignals hook usage
- Change the empty/no-subscription state

## Acceptance (manual)
- [ ] Active state shows one table section: "Provider Trade History"
- [ ] No "Waiting for live market signals..." or "Live feed from your provider" section
- [ ] Trade history rows still show correctly
```

---

### Manual Testing Fix 5-B
1. Subscribe to Pablo.
2. Scroll down past the Pablo card — only one table section visible: "Provider Trade History".
3. Real trade rows (ETHUSDm, BTCUSDm etc.) visible.

---

---

# FIX 5-C — Wire Pablo Card Stats to Live Hook Data

**Files to attach:**
- `src/components/dashboard/CopierDashboard.tsx`
- `src/hooks/useIncomingSignals.ts` (read-only — to confirm export names)

---

```
# Fix 5-C · Wire Pablo Provider Card Stats to useIncomingSignals

## Context
The large Pablo provider card (violet left border) shows a 4-stat bottom row:
- PROVIDER'S 30D ROI → comes from API profile, keep static
- TODAY'S SIGNALS → should be `todayCount` from hook (currently static/0)
- YOUR SESSION P&L → should be `sessionPnl` from hook (currently static/+$0.00 not updating)
- MIRRORED TRADES → should be `mirroredTrades` or `mirroredCount` from hook (currently static/0)

## Files to modify
- MODIFY: `src/components/dashboard/CopierDashboard.tsx`

## Files to NOT touch
- useIncomingSignals.ts
- Any other file

## Step 1: Read what useIncomingSignals exports
At the top of CopierDashboard, find the existing destructure of useIncomingSignals. It should look like:
```tsx
const { trades, sessionPnl, mirroredTrades, todayCount, avgLatency, connectionState } = useIncomingSignals(...);
```
Note the EXACT field names for todayCount, sessionPnl, and the mirrored trade count.
If the hook is called with a masterId argument, confirm it's receiving the current subscription's master ID.

## Step 2: Find the Pablo card stats row
Find 4 stat columns inside the Pablo card. They show labels like:
"PROVIDER'S 30D ROI" / "TODAY'S SIGNALS" / "YOUR SESSION P&L" / "MIRRORED TRADES"

## Step 3: Replace static values with live hook values

TODAY'S SIGNALS — replace its value display with:
```tsx
{todayCount}
```

YOUR SESSION P&L — replace its value display with:
```tsx
<span style={{
  color: (sessionPnl ?? 0) >= 0 ? 'var(--color-mint)' : 'var(--color-danger)',
}}>
  {(sessionPnl ?? 0) >= 0 ? '+' : ''}${Math.abs(sessionPnl ?? 0).toFixed(2)}
</span>
```

MIRRORED TRADES — replace with (use exact field name from hook):
```tsx
{mirroredTrades ?? 0}
```
or if the field is named mirroredCount:
```tsx
{mirroredCount ?? 0}
```

## DO NOT
- Change PROVIDER'S 30D ROI — this comes from API, leave as-is
- Change View Profile button or Unsubscribe button
- Change any styling or layout of the Pablo card
- Touch useIncomingSignals.ts

## Acceptance (manual)
- [ ] Pablo card: Today's Signals starts at 0, increments when master fires test signal
- [ ] Pablo card: Session P&L is green "+$0.00" initially
- [ ] After a CLOSE signal with PnL, Session P&L value updates and colors correctly
- [ ] Mirrored Trades increments when trades are copied
```

---

### Manual Testing Fix 5-C
1. Subscribe to Pablo on the web. All 4 stats: ROI from API, others show 0/$0.00.
2. Start the master desktop app, connect Pablo.
3. Start the slave Python app with copier's email.
4. Fire a test signal from master.
5. Today's Signals on Pablo card should → 1.
6. After CLOSE event: Session P&L should update.

---

---

# FIX 5-D — Add Hover Effects to Provider Dashboard KPI Cards

**Files to attach:**
- `src/components/dashboard/ProviderDashboard.tsx`
- `src/components/common/KpiCard.tsx` (read-only — as the hover pattern reference)

---

```
# Fix 5-D · Provider Dashboard KPI Card Hover Effects

## Context
The Provider/Master dashboard Overview tab shows 4 KPI cards:
- TOTAL SIGNALS SENT
- CONNECTED COPIERS
- OPEN TRADES
- WIN RATE

These are plain cards with NO hover effect. We need to replace them with KpiCard components
(or add the same hover style inline) so they match the admin and copier dashboard quality.

## Files to modify
- MODIFY: `src/components/dashboard/ProviderDashboard.tsx`

## Files to NOT touch
- Any other file

## Step 1: Read the existing KPI card rendering code
Find the 4-card grid in the Overview tab render section.
Note the exact variable/prop names for each value (e.g. stats.totalSignalsSent, stats.winRate, etc.).

## Step 2: Replace with KpiCard
Add import at top:
```tsx
import { KpiCard } from '@/components/common/KpiCard';
import { Activity, Users, Clock, BarChart2 } from 'lucide-react';
```

Replace the 4 existing plain cards with KpiCards:
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  marginBottom: '24px',
}}>
  <KpiCard
    title="Total Signals Sent"
    value={/* use exact existing variable */}
    icon={<Activity size={16} />}
    valueColor="default"
    loading={loading}
  />
  <KpiCard
    title="Connected Copiers"
    value={/* use exact existing variable */}
    subtext="Active subscribers"
    icon={<Users size={16} />}
    valueColor="mint"
    loading={loading}
  />
  <KpiCard
    title="Open Trades"
    value={/* use exact existing variable */}
    icon={<Clock size={16} />}
    valueColor="default"
    loading={loading}
  />
  <KpiCard
    title="Win Rate"
    value={/* use exact existing variable, format as "45.7%" */}
    icon={<BarChart2 size={16} />}
    valueColor="mint"
    loading={loading}
  />
</div>
```

IMPORTANT: Use the EXACT same data variables that the existing cards already use.
Do NOT change where the data comes from — only the visual wrapper changes.

If there is no `loading` state on the provider dashboard, pass `loading={false}`.

## Fallback (if KpiCard import causes issues)
Instead of replacing the cards, add hover state to the existing cards:
1. Add `const [hoveredIdx, setHoveredIdx] = useState<number>(-1);` at top
2. On each card's wrapping div:
   ```tsx
   onMouseEnter={() => setHoveredIdx(i)}
   onMouseLeave={() => setHoveredIdx(-1)}
   style={{
     transition: 'all 300ms ease',
     transform: hoveredIdx === i ? 'translateY(-4px)' : 'none',
     border: hoveredIdx === i
       ? '1px solid var(--color-mint)'
       : '1px solid rgba(255,255,255,0.08)',
     boxShadow: hoveredIdx === i ? '0 4px 20px rgba(0,195,137,0.10)' : 'none',
   }}
   ```

Use the KpiCard approach first. Only fall back to inline hover if KpiCard causes build errors.

## DO NOT
- Change the Overview / Profile Setup tab logic
- Change the license key card
- Change charts or signal history below the KPI row
- Add any API calls

## Acceptance (manual)
- [ ] 4 KPI cards show same values as before (71 signals, 2 copiers, 1 open, 45.7% win rate)
- [ ] Hover on each: lifts 4px, mint border glow
- [ ] No broken layout or TypeScript errors
```

---

### Manual Testing Fix 5-D
1. Log in as Provider → dashboard.
2. See the 4 KPI cards — values unchanged.
3. Hover each card — lift + glow confirms.

---

---

## Clarification: Admin "Active Subscriptions = 0"

**This is not a bug.** Here is exactly why it shows 0:

The admin KPI reads `users.filter(u => u.role === 'SLAVE' && u.subscribedToId)` from the database. Your test worked by running the Python slave app which sends `register_node` via socket — this joins a memory room but does NOT write `subscribedToId` to the database.

To get the count to show > 0:
1. Log in as a **Copier on the web frontend** (not the Python app)
2. Go to `/traders` marketplace
3. Click **Subscribe** on Pablo's card
4. Now `Users.subscribedToId` is set in the DB
5. Refresh Admin page → "Active Subscriptions" shows 1

The code is correct. The test method was bypassing the web subscription flow.

---

## Run Order

```
Fix 5-A (CopierDashboard — remove cards)
Fix 5-B (CopierDashboard — remove empty table)   ← can combine with 5-A in one Cursor session
Fix 5-C (CopierDashboard — wire Pablo stats)     ← separate Cursor session
Fix 5-D (ProviderDashboard — add hover)          ← separate Cursor session
```

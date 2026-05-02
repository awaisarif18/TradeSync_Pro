# TradeSync Pro · Frontend Phase 4 — Implementation Guide

> **Reference hierarchy for every Cursor/Antigravity prompt:**
> `frontendReadme.md` + `SYSTEM_CONTRACT_MATRIX.md` → authoritative architecture contracts.
> Design files (`direction-a.jsx`, `landing-a-v2.jsx`, `styles.css`) → visual fallback for tokens and layout patterns.
> Never break existing Redux shape, route paths, or socket contract.

---

## What You Have vs What We Need

| Requirement | Current state | What changes |
|---|---|---|
| Market ticker (price bar) | Static hardcoded prices | Fetch real prices from CoinGecko/Binance (free, no API key) |
| Live trade feed (landing page) | Static fake trades | Pull last 5 real trades from `GET /trades/history` |
| Footer | `FooterStrip.tsx` — minimal one-liner | Replace with full designed footer |
| Contact / email form | Not built | New section above footer, sends to m.awaisarif16@gmail.com |
| Login form — role tabs + Google button | Present but non-functional | Remove both, simplify the form |
| Navbar — "Pricing" link | Present | Remove from public nav links |

---

## Design Token Reference (from `styles.css` + `globals.css`)

Use these in all Tailwind classes. The `globals.css` already maps them:
- Background: `--color-bg` (`#0a0e0d`) → `bg-[var(--color-bg)]` or `bg-app`
- Surface: `--color-surface` (`#11181a`)
- Accent (mint): `--color-mint` (`#00c389`) → `text-mint`, `bg-mint`, `border-mint`
- Text primary: `--color-text` (`#e8eef0`)
- Text secondary: `--color-text-2` (`#8a9ba0`)
- Text muted: `--color-text-3` (`#5d6d72`)
- Danger: `--color-danger` (`#ff5a4a`)
- Violet: `--color-violet` (`#7c5cff`)
- Line: `rgba(255,255,255,0.08)`

Font classes: `font-sans` (Inter), `font-mono` (JetBrains Mono)

---

## Prompt Sequence

```
4.1 → Remove Pricing from Navbar
4.2 → Simplify Login form (remove role tabs + Google button)
4.3 → Dynamic Market Ticker (real prices)
4.4 → Dynamic Live Trade Feed (real backend data)
4.5 → Full Footer
4.6 → Contact Section with email form
4.7 → Wire landing page sections together + README update
```

---

---

# PHASE 4.1 — Remove "Pricing" from Navbar

**Estimated Cursor tokens:** Very low. Single file, additive-minus change.

## Files to attach
- `src/components/navigation/Navbar.tsx`
- `frontendReadme.md` (§ 9 — Navbar section)

## Prompt

```
# Phase 4.1 · Remove Pricing link from Navbar

## Reference hierarchy
1. `frontendReadme.md` § 9 (Navbar section) — authoritative for existing nav behavior.
2. Do NOT reference any design JSX files for this change.

## Scope
Remove the "Pricing" link from the public navigation links in Navbar.tsx.
The public nav currently shows: Discover, How it works, Pricing, Docs.
After this change it should show: Discover, How it works, Docs.

## Files to modify
- MODIFY: `src/components/navigation/Navbar.tsx`

## Files to NOT touch
- Any other file in the project

## Implementation
1. Find the array or JSX block that renders the public nav links (visible when unauthenticated).
2. Remove only the Pricing entry. Do NOT remove or reorder Discover, How it works, or Docs.
3. Preserve all authentication-conditional rendering logic, mobile handling, active link styles, and the logout flow exactly as they are.

## DO NOT
- Change any route path
- Change the authenticated nav links
- Change the logo, sign in, or get started buttons
- Run any tests or build commands

## Acceptance (manual)
- [ ] Visit `/` while logged out. Navbar shows: Discover · How it works · Docs. No "Pricing" entry.
- [ ] All other nav items and auth buttons still work.
```

---

### Manual Testing 4.1
1. `npm run dev` — open `http://localhost:3001`
2. While logged out: confirm navbar shows Discover, How it works, Docs. No Pricing.
3. Log in as any user: confirm authenticated nav still works normally.

---

---

# PHASE 4.2 — Simplify Login Form

**Estimated tokens:** Low-medium. One file, removing UI elements.

## Files to attach
- `src/app/(auth)/login/page.tsx`
- `frontendReadme.md` (§ 4 — Login page section, § 7 — LoginForm section)

## Prompt

```
# Phase 4.2 · Simplify Login Form

## Reference hierarchy
1. `frontendReadme.md` §§ 4, 7 — authoritative for login flow. The login is role-agnostic (backend determines role from credentials).
2. Do not reference direction-a.jsx for this change.

## Scope
Remove two decorative non-functional UI elements from the login page:
1. The "Copier / Provider" role tab switcher (decorative only — login is role-agnostic)
2. The "Continue with Google" button (non-functional)

Keep everything else exactly as-is: email input, password input, submit button, form validation, Redux dispatch, Sonner toasts, redirect to /dashboard, split-screen layout, right rail decoration.

## Files to modify
- MODIFY: `src/app/(auth)/login/page.tsx`

## Files to NOT touch
- `src/components/auth/LoginForm.tsx` (legacy, do not touch)
- Any other file

## Implementation
1. Locate and DELETE the role tab switcher component/JSX (the Copier/Provider tabs). This is purely decorative.
2. Locate and DELETE the "Continue with Google" button and any surrounding divider text (e.g. "or continue with", separator line).
3. Do NOT remove or alter: email input, password input, submit button, form state, validation logic, handleSubmit, dispatch(loginSuccess), toast calls, router.push('/dashboard'), split-screen layout structure.

## DO NOT
- Change the form submission logic
- Change the Redux dispatch
- Change any API call
- Add any new UI elements
- Run tests

## Acceptance (manual)
- [ ] Login page shows: email field, password field, login button. No tabs. No Google button.
- [ ] Submitting with wrong credentials shows an error toast.
- [ ] Submitting with correct credentials redirects to /dashboard.
- [ ] Split-screen layout (if present) is visually intact.
```

---

### Manual Testing 4.2
1. Go to `http://localhost:3001/login`
2. Confirm: no role tabs at top, no Google button. Only email + password + login button.
3. Login with bad credentials → error toast appears.
4. Login with good credentials → redirected to /dashboard.

---

---

# PHASE 4.3 — Dynamic Market Ticker

**This is the most technically interesting one. Read carefully before prompting.**

## Context

The current `MarketTicker` component in `src/components/feed/MarketTicker.tsx` is a decorative animated strip with hardcoded prices. We need to replace it with real prices from a free public API — no API key required.

**Free API choice: CoinGecko + Frankfurter**
- Crypto prices (BTC, ETH, SOL): `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true`
- Forex (EUR/USD, GBP/USD): `https://api.frankfurter.app/latest?from=USD&to=EUR,GBP` (free, no key)
- Gold (XAU): Use a simple metals API or fallback to static if unavailable
- Indices (NQ, WTI): These are harder to get for free; we will use fallback static values for NQ and WTI but mark them clearly

**Design pattern:** The ticker still auto-scrolls left. Prices update every 60 seconds. If fetch fails, shows last known price with a muted `(delayed)` note.

**Important:** This is a `'use client'` component (it uses state and useEffect). The current component likely already handles this. If it's a server component, it needs `'use client'` added.

## Files to attach
- `src/components/feed/MarketTicker.tsx`
- `src/app/globals.css` (for token reference)
- `direction-a.jsx` (for the original MarketTicker design and animation pattern — lines 22–57)
- `styles.css` (for CSS variable names)

## Prompt

```
# Phase 4.3 · Dynamic Market Ticker

## Reference hierarchy
1. `src/components/feed/MarketTicker.tsx` — existing component. Preserve the scrolling animation style.
2. `direction-a.jsx` lines 22–57 — the original MarketTicker design pattern. Match the visual layout: symbol · price · colored percent change.
3. `globals.css` + `styles.css` — use existing Tailwind tokens and CSS variables for colors.

## Scope
Replace the static hardcoded price data in MarketTicker.tsx with real-time prices fetched from free public APIs. Keep the visual design and scroll animation identical to the current design.

## Files to modify
- MODIFY: `src/components/feed/MarketTicker.tsx`

## Files to NOT touch
- Any other file

## Add 'use client' directive at the top if not already present.

## Data sources (fetch both on mount, then refresh every 60 seconds)

### Source 1 — Crypto (no API key needed):
URL: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true`
Response shape: `{ bitcoin: { usd: number, usd_24h_change: number }, ethereum: { ... }, solana: { ... } }`
Maps to: BTC, ETH, SOL ticker items

### Source 2 — Forex (no API key needed):
URL: `https://api.frankfurter.app/latest?from=USD&to=EUR,GBP`
Response shape: `{ rates: { EUR: number, GBP: number } }`
EUR/USD = 1 / rates.EUR (since API gives USD→EUR, we invert for EUR/USD display)
GBP/USD = 1 / rates.GBP

### Source 3 — Static fallbacks (no free API for these):
XAU/USD: static value 2418.10, change 0.00 — label as `XAU*`
NQ: static value 23184.5, change 0.00 — label as `NQ*`
WTI: static value 71.42, change 0.00 — label as `WTI*`
Add a tiny asterisk note: `* price may be delayed` below the ticker strip (very small, muted color)

## State shape
```typescript
type TickerItem = {
  symbol: string;
  price: number;
  change24h: number;
  isLive: boolean;
};
const [items, setItems] = useState<TickerItem[]>(defaultItems); // default = last known or static
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
```

## Implementation pattern
1. Define `defaultItems` array with the static fallback values for all 8 symbols.
2. `fetchPrices()` async function: fetch both APIs with `Promise.allSettled`. On success, merge live data into items. On fail, keep previous values.
3. `useEffect`: call `fetchPrices()` on mount. Set interval to call it every 60 seconds. Clear interval on unmount.
4. Render: same scrolling strip as current, with live items. Use `--a-accent` / `--a-danger` (or Tailwind `text-mint` / `text-danger`) for positive/negative change color.
5. If `isLive === false` for a static item, show the symbol with a muted `*` suffix.

## Visual requirements (match direction-a.jsx pattern)
- Same scrolling animation: items duplicated 3x, `animation: a-scroll 50s linear infinite`
- Each item: `[symbol] [price formatted with toLocaleString()] [+/-change%]`
- Positive change: mint/accent color. Negative: danger color.
- Price format: use `minimumFractionDigits: 2, maximumFractionDigits: 4` (same as design).

## DO NOT
- Add any npm packages
- Change the animation style
- Use any paid or key-required API
- Make this a server component

## Acceptance (manual)
- [ ] Ticker bar shows 8 symbols scrolling.
- [ ] BTC, ETH, SOL show real-time prices (should differ from hardcoded values if crypto markets are moving).
- [ ] EUR/USD and GBP/USD show real forex rates.
- [ ] XAU, NQ, WTI show static values with * suffix.
- [ ] After 60 seconds, prices refresh (check by watching the values update).
- [ ] If browser is offline or API fails, old prices remain visible — no crash.
```

---

### Manual Testing 4.3
1. Run dev server. Open `http://localhost:3001`.
2. Look at the ticker bar. BTC should show ~current market price (not the hardcoded 109,842.50 from design).
3. EUR/USD and GBP/USD should be close to current forex rates.
4. XAU, NQ, WTI show with `*`.
5. Wait 60 seconds — confirm prices refresh (open DevTools Network tab and watch for coingecko and frankfurter requests).
6. Disconnect internet → refresh page → old prices still show (no blank/crash).

---

---

# PHASE 4.4 — Dynamic Live Trade Feed

**This pulls real trade data from the backend.**

## Context

The `LiveTradeFeedCard` (or equivalent component used on the landing page) currently shows 5 static hardcoded trades. We need to:
1. Call `GET /trades/history` on the server side (public endpoint, no auth needed)
2. Take the last 5 results
3. Render them using the existing `TradeRow`-style layout

The landing page `src/app/page.tsx` is a **server component**. We can `fetch()` directly in it and pass data down to the `LiveTradeFeedCard` as props. This is the cleanest approach — no client-side fetching, no state.

**Backend response shape** from `GET /trades/history`:
```json
[
  {
    "id": "uuid",
    "masterId": "uuid",
    "masterName": "Sasha Ng",
    "symbol": "XAUUSD",
    "action": "BUY",
    "volume": 0.50,
    "ticketNumber": "12345",
    "pnl": 0.42,
    "status": "CLOSED",
    "createdAt": "2026-05-01T14:22:08.000Z",
    "closedAt": "..."
  }
]
```

**What each trade row needs to display** (matching direction-a.jsx TradeRow layout):
- Time: `createdAt` formatted as HH:MM:SS
- Side: `action` (BUY or SELL)
- Symbol: `symbol`
- Provider: `masterName`
- Qty: `volume` formatted as string
- Price: not available from history — show `—` or omit (this column is optional)
- PnL: `pnl` (nullable — if null, show `—`)

## Files to attach
- `src/app/page.tsx` (landing page — server component)
- `src/components/marketing/LiveTradeFeedCard.tsx`
- `src/services/api.ts`
- `direction-a.jsx` (lines 142–172 for TradeRow visual pattern)
- `styles.css`

## Prompt

```
# Phase 4.4 · Dynamic Live Trade Feed

## Reference hierarchy
1. `src/app/page.tsx` — server component. Use Next.js server-side fetch() directly here.
2. `src/components/marketing/LiveTradeFeedCard.tsx` — modify to accept trades as props.
3. `direction-a.jsx` lines 142–172 (TradeRow) — visual pattern for each row.
4. `styles.css` — CSS variable names for colors.

## Scope
Replace static trade data in the landing page live feed card with real data from GET /trades/history.

## Files to modify
- MODIFY: `src/app/page.tsx` — fetch trades server-side, pass to LiveTradeFeedCard
- MODIFY: `src/components/marketing/LiveTradeFeedCard.tsx` — accept `trades` prop, render real rows

## Files to NOT touch
- `src/services/api.ts`
- Any other component
- `src/components/feed/TradeRow.tsx` (use it as-is if it already exists; if it doesn't, build the row inline)
- Any auth, dashboard, or admin files

## Step 1: In src/app/page.tsx
Add a server-side fetch at the top of the page component:

```typescript
// Fetch last 5 trades from backend. Revalidate every 60 seconds.
// If fetch fails, use empty array (graceful fallback).
let recentTrades: TradeHistoryItem[] = [];
try {
  const res = await fetch('http://localhost:3000/trades/history', {
    next: { revalidate: 60 },
  });
  if (res.ok) {
    const all = await res.json();
    recentTrades = Array.isArray(all) ? all.slice(0, 5) : [];
  }
} catch {
  recentTrades = [];
}
```

Define `TradeHistoryItem` type inline in page.tsx (or as a local interface):
```typescript
interface TradeHistoryItem {
  id: string;
  masterName: string;
  symbol: string;
  action: string;
  volume: number;
  pnl: number | null;
  status: string;
  createdAt: string;
}
```

Pass to LiveTradeFeedCard: `<LiveTradeFeedCard trades={recentTrades} />`

## Step 2: In LiveTradeFeedCard.tsx
Update the component signature to accept: `trades: TradeHistoryItem[]`

Render each trade row matching the direction-a.jsx TradeRow pattern:
- Time column: format `trade.createdAt` as local time string HH:MM:SS using `new Date(createdAt).toLocaleTimeString()`
- Side chip: `trade.action` (BUY = mint-soft bg + mint text, SELL = danger-soft bg + danger text)
- Symbol: `trade.symbol`
- Provider: `· {trade.masterName}` in muted text
- Qty: `trade.volume` as string
- P&L: if `trade.pnl !== null`, format as `+0.42%` (mint) or `-0.24%` (danger). If null: `—` in muted color.

If `trades` is empty (backend offline or no trades yet), show the existing static fallback trades so the landing page never looks empty.

## Fallback static trades (use when trades.length === 0)
```typescript
const FALLBACK_TRADES = [
  { id: '1', masterName: 'Sasha Ng',      symbol: 'XAUUSD',  action: 'BUY',  volume: 0.50, pnl: 0.42,  createdAt: new Date().toISOString(), status: 'CLOSED' },
  { id: '2', masterName: 'Sasha Ng',      symbol: 'EURUSD',  action: 'SELL', volume: 1.00, pnl: 0.18,  createdAt: new Date().toISOString(), status: 'CLOSED' },
  { id: '3', masterName: 'Marco Aurelio', symbol: 'BTCUSDT', action: 'BUY',  volume: 0.12, pnl: -0.24, createdAt: new Date().toISOString(), status: 'CLOSED' },
  { id: '4', masterName: 'Liu Chen',      symbol: 'NQ',      action: 'BUY',  volume: 2,    pnl: 0.86,  createdAt: new Date().toISOString(), status: 'CLOSED' },
  { id: '5', masterName: 'Sasha Ng',      symbol: 'GBPUSD',  action: 'SELL', volume: 0.75, pnl: 0.31,  createdAt: new Date().toISOString(), status: 'CLOSED' },
];
```

## Column header row
The feed card has a column header row (Time / Order / Qty / P&L). Keep it exactly as-is.

## DO NOT
- Remove the "Live trade feed" card header (the pulsing dot + title + "487 trades today" pill)
- Add any socket/real-time logic (static server-render with 60s revalidation is enough for the landing page)
- Change any other section on the landing page
- Touch auth or dashboard files

## Acceptance (manual)
- [ ] Landing page live feed shows real trade data from the backend (if backend is running and has trades).
- [ ] If backend is offline, fallback static rows show — page does not error or go blank.
- [ ] Row layout matches design: time · BUY/SELL chip · symbol · provider name · volume · P&L.
```

---

### Manual Testing 4.4
1. Make sure backend is running and has some trade logs in the DB (run a test signal from master app).
2. Load `http://localhost:3001` — live feed should show real trade data.
3. Check the time column: it should show the actual trade timestamp, not a hardcoded `14:22:08`.
4. Stop the backend. Refresh the landing page. The fallback trades should appear — no blank or error.

---

---

# PHASE 4.5 — Full Footer

**Replaces `FooterStrip.tsx` with a proper full-width footer.**

## Design reference (from direction-a.jsx and landing-a-v2.jsx)
The current design has only a minimal strip at the bottom. We need a 3-column footer in the Direction A style. Here's the target layout:

```
┌─────────────────────────────────────────────────────────┐
│  [Logo + tagline]       [Product]        [Company]      │
│  TradeSync.Pro          Discover         About           │
│  Mirror the world's     Dashboard        Contact         │
│  best traders.          How it works     Documentation   │
│                         Register                         │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  © 2026 TradeSync Pro. All rights reserved.              │
│  Trading involves risk. Past performance does not…       │
└─────────────────────────────────────────────────────────┘
```

**Styling tokens to use:**
- Background: `var(--color-surface)` or `bg-[#11181a]`
- Border top: `border-t border-white/[0.08]`
- Heading: `text-[#e8eef0]` font-semibold
- Body links: `text-[#8a9ba0]` hover `text-[#e8eef0]`
- Logo accent dot: `text-mint`
- Disclaimer text: `text-[#5d6d72]` text-xs

## Files to attach
- `src/components/marketing/FooterStrip.tsx`
- `src/app/layout.tsx`
- `landing-a-v2.jsx` (the footer section at the very bottom — visual reference)
- `styles.css`

## Prompt

```
# Phase 4.5 · Full Footer

## Reference hierarchy
1. `src/app/layout.tsx` — shows where Footer is imported. The import path must remain compatible.
2. `src/components/marketing/FooterStrip.tsx` — REPLACE the contents of this file entirely.
3. `landing-a-v2.jsx` last section (lines ~220 onward) — visual design direction. Translate the dark fintech style to Tailwind.
4. `styles.css` — CSS variable names. Map --a-* tokens to Tailwind classes using CSS variable syntax.

## Scope
Replace the content of FooterStrip.tsx with a full-width 3-column footer.
The component name stays FooterStrip so layout.tsx import doesn't break.

## Files to modify
- MODIFY: `src/components/marketing/FooterStrip.tsx` — replace content, keep component name

## Files to NOT touch
- `src/app/layout.tsx` (import path must remain valid)
- All other files

## Implementation

Build a footer with this structure:

```tsx
'use client' is NOT needed — this can be a server component (no state/hooks).

export default function FooterStrip() {
  const year = new Date().getFullYear();
  return (
    <footer>
      <div className="max-w-[1240px] mx-auto px-8 py-16">
        {/* 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 48 }}>
          {/* Col 1: Brand */}
          {/* Col 2: Product links */}
          {/* Col 3: Company links */}
        </div>
        {/* Divider + legal strip */}
      </div>
    </footer>
  );
}
```

### Column 1 — Brand block
- Logo: same as Navbar (bolt icon in mint square + "TradeSync.Pro" with mint dot)
- Tagline: "Mirror the world's best traders, in milliseconds."
- Subtext color: `--a-text-2` (`#8a9ba0`)

### Column 2 — Product links
Heading: "Product" (uppercase, 10px, letter-spacing, muted)
Links (use Next.js `<Link>`):
- Discover → `/traders`
- Dashboard → `/dashboard`
- How it works → `/#how`
- Get started → `/register`

### Column 3 — Company links
Heading: "Company" (same micro-heading style)
Links:
- About → `#` (placeholder)
- Contact → `#contact` (anchor to contact section we build in 4.6)
- Documentation → `#docs`

### Bottom strip
Divider: `border-t border-white/[0.08]` with `mt-12 pt-8`
Left: `© {year} TradeSync Pro. All rights reserved.`
Right: `Trading involves risk. Past performance does not guarantee future results.`
Both in `text-[#5d6d72] text-xs`

## Styling rules (all inline styles or Tailwind — pick whichever matches existing patterns in the file)
- Footer background: `background: var(--a-surface)` i.e. `#11181a`
- Border top on the footer element: `border-top: 1px solid rgba(255,255,255,0.08)`
- Link hover: use a hover style that changes color from `--a-text-2` to `--a-text`
- Micro heading: `font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--a-text-3); margin-bottom: 16px`

## DO NOT
- Add any icon library calls beyond what Lucide-React already provides
- Add any form or interactive elements (contact form is Phase 4.6)
- Change layout.tsx

## Acceptance (manual)
- [ ] Footer shows 3 columns: brand + tagline, Product links, Company links.
- [ ] All links are Next.js Link components (no raw <a> with full URL for internal links).
- [ ] Legal disclaimer shows at the bottom.
- [ ] Design matches the dark fintech style (dark surface, muted text, mint accent on logo).
```

---

### Manual Testing 4.5
1. Load `http://localhost:3001`. Scroll to the bottom.
2. Footer should show the 3-column layout on desktop.
3. Check mobile: the 3 columns should stack vertically (grid handles this — if they don't, add `grid-cols-1 md:grid-cols-3` equivalent).
4. Click each link — internal links navigate correctly.

---

---

# PHASE 4.6 — Contact Section

**New section on the landing page. Email sent via Resend or EmailJS — or the simplest approach: Formspree (no backend needed, free tier).**

## Simplest approach: Formspree
- Sign up free at formspree.io
- Create a form → get a form endpoint like `https://formspree.io/f/xyzabc`
- POST to it with `{ name, email, message }` → email is delivered to `m.awaisarif16@gmail.com`
- No API key in code (the form ID is public)
- Free tier: 50 submissions/month

**Alternative if you don't want Formspree:** EmailJS (also free, also no backend). But Formspree is simpler.

**Before running this prompt:** Create a Formspree account and get your form endpoint URL. Replace `YOUR_FORMSPREE_ENDPOINT` in the prompt.

## Files to attach
- `src/app/page.tsx`
- `direction-a.jsx` (for card/input/button styling patterns)
- `styles.css`
- `src/app/globals.css`

## Prompt

```
# Phase 4.6 · Contact Section

## Reference hierarchy
1. `src/app/page.tsx` — add the contact section here, above the FooterStrip.
2. `direction-a.jsx` — visual tokens and input/button styling (.a-input, .a-btn, .a-card patterns). Translate to Tailwind.
3. `globals.css` + `styles.css` — CSS variables and Tailwind token names.

## Scope
Add a new contact section to the landing page (src/app/page.tsx or as a new component ContactSection imported into it).
Place it between the live trade feed section and the FooterStrip.

## Files to create OR modify
Option A (preferred): CREATE `src/components/marketing/ContactSection.tsx` and import it in `src/app/page.tsx`.
Option B: Add the section directly in `src/app/page.tsx`.
Use Option A.

## Files to NOT touch
- Any auth, dashboard, admin, or services files
- FooterStrip.tsx
- Any existing component beyond page.tsx (for the import addition)

## ContactSection.tsx

This must be a 'use client' component because it has form state.

### Layout (full-width section, centered content)
```
id="contact"
Max width: 1240px, centered, padding: 64px 32px

Heading: "Get in touch"
Subheading: "Have questions about TradeSync Pro? Send us a message."
```

### Form fields
1. Name — text input (required)
2. Email — email input (required)
3. Message — textarea, ~5 rows (required)
4. Submit button: "Send message" (primary style, shows loading state while submitting)

### Submission logic
POST to Formspree endpoint (hardcode the string):
```typescript
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORMSPREE_ENDPOINT';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });
    if (res.ok) {
      setSuccess(true);
      setName(''); setEmail(''); setMessage('');
    } else {
      setError('Something went wrong. Please try again.');
    }
  } catch {
    setError('Could not send message. Check your connection.');
  } finally {
    setLoading(false);
  }
};
```

After successful send: replace the form with a success message: "✓ Message sent! We'll get back to you soon." in mint color.

### Styling (translate direction-a.jsx patterns to Tailwind)
Input styles (match `.a-input` from styles.css):
```
background: #18222a (--a-surface-2)
border: 1px solid rgba(255,255,255,0.08)
border-radius: 10px
color: #e8eef0
font-family: Inter
font-size: 15px
padding: 14px
outline: none
on focus: border-color: #00c389 (mint)
placeholder: color #5d6d72
```

Button style: match existing primary button patterns in the codebase (look at how other landing CTAs are styled).

Section background: same as landing page background (`var(--a-bg)` / `#0a0e0d`).

The form itself sits inside an `.a-card` style container (background: `#11181a`, border: `1px solid rgba(255,255,255,0.08)`, border-radius: 14px), max-width ~560px, centered.

### Section heading style (match other landing section headings)
- Small micro-label above: "Contact" in uppercase, 12px, muted color, letter-spacing
- Main heading: 36px, font-weight 600, letter-spacing tight

## DO NOT
- Use any email library or npm package
- Add any backend route
- Use react-hook-form or any form library
- Add recaptcha or spam protection (for now)

## Acceptance (manual)
- [ ] Contact section appears above the footer on the landing page.
- [ ] Form has name, email, message fields.
- [ ] Clicking Send with valid data submits to Formspree and shows success state.
- [ ] Button shows loading state while submitting.
- [ ] Error state shows a readable message if submission fails.
```

---

### Manual Testing 4.6
1. Set up Formspree: go to formspree.io, create a free account, create a form for `m.awaisarif16@gmail.com`. Copy the endpoint URL (looks like `https://formspree.io/f/xpznqabc`). Replace `YOUR_FORMSPREE_ENDPOINT` in the code.
2. Run dev server. Scroll to the contact section.
3. Fill in name, email, message. Click Send.
4. Check `m.awaisarif16@gmail.com` — you should receive the submission.
5. The form should show "✓ Message sent!" after success.
6. Try submitting with no internet → error message appears.

---

---

# PHASE 4.7 — README Update

## Files to attach
- `frontendReadme.md`
- `SYSTEM_CONTRACT_MATRIX.md`

## Prompt

```
# Phase 4.7 · Documentation Sync — Frontend Phase 4

## Scope
Update documentation files to reflect Phase 4 changes. No code changes.

## Files to modify
- MODIFY: `frontendReadme.md`
- MODIFY: `SYSTEM_CONTRACT_MATRIX.md`

## Files to NOT touch
- Any .tsx, .ts, or .css files

## Changes to frontendReadme.md

1. In § 2 (file structure), add to `src/components/marketing/`:
   `ContactSection.tsx — 'use client' contact form section; POSTs to Formspree; rendered on landing page`
   Update `FooterStrip.tsx` note: `Full 3-column footer with brand, product links, and company links. Dynamic copyright year.`

2. In § 4 (/ landing route), update the description:
   - Add: "Market ticker fetches live BTC/ETH/SOL prices from CoinGecko and EUR/USD, GBP/USD from Frankfurter API; refreshes every 60s."
   - Add: "Live trade feed fetches last 5 trades from GET /trades/history with 60s revalidation; falls back to static data if backend is offline."
   - Add: "Contact section above footer uses Formspree for email delivery."

3. In § 9 (Navbar), update public nav links list: remove Pricing. Current public links: Discover, How it works, Docs.

4. Add a new section "## 22) Phase 4: Landing Page Dynamism (Completed)" with a brief summary of what was implemented.

## Changes to SYSTEM_CONTRACT_MATRIX.md

In § 3.2 Trade REST table, confirm that `GET /trades/history` is consumed by the frontend landing page (add "Frontend landing page LiveTradeFeedCard (server-side, 60s revalidation)" to the Called By column if not already there).
```

---

## Summary Table

| Phase | File(s) | What changes | Testing method |
|---|---|---|---|
| 4.1 | `Navbar.tsx` | Remove "Pricing" link | Visual check on `/` |
| 4.2 | `login/page.tsx` | Remove role tabs + Google button | Visual check on `/login` + submit test |
| 4.3 | `MarketTicker.tsx` | Live prices from CoinGecko + Frankfurter | Check prices vs market, watch 60s refresh |
| 4.4 | `page.tsx` + `LiveTradeFeedCard.tsx` | Real trade data from backend | Backend running → check trade rows have real timestamps |
| 4.5 | `FooterStrip.tsx` | Full 3-column footer | Visual check, click links |
| 4.6 | `ContactSection.tsx` + `page.tsx` | Contact form → Formspree → your email | Submit form → check email |
| 4.7 | `frontendReadme.md` + `SYSTEM_CONTRACT_MATRIX.md` | Docs update | Read the files |

---

## Design Files You Need Per Phase

| Phase | Which design files to look at | Why |
|---|---|---|
| 4.1 | None needed | Simple deletion |
| 4.2 | `auth-a.jsx` — see the login form without tabs for reference | Cleanup |
| 4.3 | `direction-a.jsx` lines 22–57 | MarketTicker scrolling pattern |
| 4.4 | `direction-a.jsx` lines 142–172 | TradeRow visual layout |
| 4.5 | `landing-a-v2.jsx` last section (footer) | Footer 3-col layout reference |
| 4.6 | `direction-a.jsx` (.a-input, .a-card, .a-btn patterns), `styles.css` | Input/card styling |
| 4.7 | None | Docs only |

---

## Token Cheat Sheet (for Cursor when it needs color values)

```
Background:     #0a0e0d   (--a-bg / --color-bg)
Surface:        #11181a   (--a-surface / --color-surface)
Surface darker: #18222a   (--a-surface-2)
Line/border:    rgba(255,255,255,0.08)  (--a-line)
Line hover:     rgba(255,255,255,0.14)  (--a-line-2)
Text primary:   #e8eef0   (--a-text / --color-text)
Text secondary: #8a9ba0   (--a-text-2)
Text muted:     #5d6d72   (--a-text-3)
Accent mint:    #00c389   (--a-accent / --color-mint)
Accent hover:   #00a378   (--a-accent-2)
Accent soft:    rgba(0,195,137,0.12)
Danger:         #ff5a4a   (--a-danger / --color-danger)
Warn:           #ffb547
Violet:         #7c5cff   (--a-violet / --color-violet)
Font sans:      'Inter'
Font mono:      'JetBrains Mono'
Border radius:  14px (cards), 10px (inputs), 999px (pills/buttons)
```

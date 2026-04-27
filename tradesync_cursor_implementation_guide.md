# TradeSync Pro — Cursor Implementation Playbook

Step-by-step guide to translate the Direction A design files into your production Next.js 16 / Tailwind v4 / Redux Toolkit codebase, **without changing any backend contracts, socket events, or business logic**.

You'll do this in **6 phases**, top to bottom. Each phase is one Cursor session — open Composer (Cmd/Ctrl+I) for multi-file work, paste the prompt, attach the listed files, run, review, commit. Don't merge phases — small reviewable diffs are the discipline that prevents the redesign from breaking a working app.

---

## Strategic overview — read first

**What changes:** every visible surface (colors, typography, layout, components, copy from "Master/Slave" → "Provider/Copier"). The CSS layer goes from blue-leaning Tailwind defaults to a token-driven system rooted at `#00c389` mint with violet `#7c5cff` for Copier identity.

**What stays untouched:**

- All API endpoints (`/auth/*`, `/trades/*`)
- All Socket.IO event names (`register_node`, `trade_execution`, `subscriber_update`, `node_registered`, `test_signal`)
- All Redux slices (`authSlice`, `tradeSlice`) and their action signatures
- Backend role enums in payloads (`MASTER`, `SLAVE`, `ADMIN`) — the Provider/Copier relabel is **purely visual**, applied via a `roleDisplay()` helper at render time
- Route paths (`/`, `/login`, `/register`, `/dashboard`, `/admin`, `/traders`)
- The desktop client's contract with the backend

**One new route is added:** `/traders/[id]` for the provider detail page, which is additive.

**Things you'll fix while you're in there** (technical debt the redesign naturally surfaces):

- The `RootState` import path bug in `Navbar.tsx` and `SlaveDashboard.tsx`
- All `alert()` calls replaced with toast notifications
- Auth state persistence across hard refresh (currently lost — Redux state lives in memory only)
- The white/light input bug on login/register (browser autofill or wrong CSS)

---

## Tooling decisions (locked)

**CSS strategy:** Port the design's CSS variables into Tailwind v4's `@theme` block in `globals.css`. This makes `bg-bg`, `text-mint`, `border-line`, `bg-violet-soft` work as native Tailwind utilities — consistent with the rest of your Tailwind workflow. Where the design uses `style={{ background: 'var(--a-bg)' }}`, you'll write `className="bg-bg"`.

**Component strategy:** The design defines shared components via `window.TraderCard`, `window.EquityCurve` etc. Replace these with proper TypeScript modules under `src/components/ui/` and `src/components/marketplace/`.

**No new dependencies except these three (lightweight, common):**

- `sonner` — toast notifications (replaces all `alert()` calls)
- `lucide-react` — already used by the design (it imports a "lucide-ish" inline icon set, but the real lucide-react is cleaner)
- `clsx` — conditional className helper (you may already have this)

**File system additions:**

```
src/
├── components/
│   ├── ui/                 ← NEW: design primitives (Button, Pill, Card, Logo, ...)
│   ├── charts/             ← NEW: EquityCurve, PnLChart (move existing PnLChart here)
│   ├── marketplace/        ← NEW: TraderCard, RiskFilter, ProviderEmptyCard
│   ├── feed/               ← NEW: TradeRow, IncomingSignalsTable, MarketTicker
│   ├── marketing/          ← NEW: Hero, HowItWorks, ProviderShowcase, FooterStrip
│   ├── auth/               ← existing
│   ├── dashboard/          ← existing (rename SlaveDashboard → CopierDashboard)
│   ├── master/             ← existing (consider renaming to provider/ in a later pass)
│   └── navigation/         ← existing
├── lib/
│   ├── api.ts              ← existing
│   ├── role-display.ts     ← NEW: ROLE_DISPLAY map + helper
│   ├── format.ts           ← NEW: number/currency/percent/date formatters
│   └── avatar-color.ts     ← NEW: deterministic color from name
├── design-source/          ← NEW: drop the Claude Design JSX here for Cursor reference (.gitignore)
└── ...
```

**Cursor workflow basics:**

- Drop all 5 design JSX files (`direction-a.jsx`, `landing-a-v2.jsx`, `auth-a.jsx`, `marketplace-a.jsx`, `copier-dashboard-a.jsx`, `provider-dashboard-a.jsx`) plus `styles.css` into a new top-level folder `design-source/` and add it to `.gitignore`. They're reference, not shipped code.
- Reference files in prompts with `@filename` (e.g., `@design-source/landing-a-v2.jsx`).
- Pin `frontendReadme.md` and `SYSTEM_CONTRACT_MATRIX.md` to context throughout — they're your guardrails.
- Each phase below assumes you started a **fresh Cursor Composer session** so context isn't polluted by the previous phase.

---

## PHASE 0 — Foundation

> One session. Sets up everything subsequent phases depend on. Do not skip.

### What this phase produces

- Tokens in `globals.css` via Tailwind v4 `@theme`
- Inter + JetBrains Mono fonts loaded in `layout.tsx`
- `roleDisplay()` and `format()` helpers
- `<Toaster />` mounted in root layout
- `design-source/` folder gitignored

### Files to attach in Cursor

- `@design-source/styles.css` (the design's tokens)
- Your current `@src/app/layout.tsx`
- Your current `@src/app/globals.css`
- Your current `@package.json`
- Your current `@tailwind.config.ts` if it exists (Tailwind v4 may use globals.css only)

### Cursor prompt

```
We're starting a UI overhaul. This phase only sets up tokens, fonts, helpers, and toasts — no visible UI changes yet beyond the new fonts loading.

Tasks:

1. Install three packages: `sonner`, `lucide-react`, `clsx`.

2. In `src/app/globals.css`, replace the existing token / theme block with a Tailwind v4 @theme block based on the CSS variables in @design-source/styles.css (the `--a-*` set). Map them to Tailwind tokens like this:

   :root tokens to migrate (use these exact hex values):
   --color-bg          #0a0e0d
   --color-surface     #11181a
   --color-surface-2   #18222a
   --color-line        rgba(255,255,255,0.08)
   --color-line-2      rgba(255,255,255,0.14)
   --color-text        #e8eef0
   --color-text-2      #8a9ba0
   --color-text-3      #5d6d72
   --color-mint        #00c389
   --color-mint-2      #00a378
   --color-mint-soft   rgba(0,195,137,0.12)
   --color-violet      #7c5cff
   --color-violet-2    #6a48f0
   --color-violet-soft rgba(124,92,255,0.12)
   --color-danger      #ff5a4a
   --color-danger-soft rgba(255,90,74,0.12)
   --color-warn        #ffb547
   --color-warn-soft   rgba(255,181,71,0.12)

   Set body { background: var(--color-bg); color: var(--color-text); font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased; }

   Add a `.tabular` utility: `font-variant-numeric: tabular-nums;`
   Add a `.font-mono-tnum` utility class scoped to JetBrains Mono with `font-feature-settings: "tnum"`.

   Add the @keyframes for `a-pulse` and `a-scroll` (see direction-a.jsx for definitions — used by ticker and live dot).

3. In `src/app/layout.tsx`, replace any existing font setup with next/font/google for both Inter and JetBrains_Mono. Expose them as CSS variables `--font-sans` and `--font-mono`. Apply `--font-sans` to body class. Mount `<Toaster richColors position="top-right" theme="dark" />` from sonner inside the body, after children.

4. Create `src/lib/role-display.ts`:
   - Export `ROLE_DISPLAY: Record<'MASTER' | 'SLAVE' | 'ADMIN', string>` mapping to 'Provider' | 'Copier' | 'Admin'.
   - Export `roleDisplay(role: string): string` that handles the mapping with a fallback to the raw role.
   - Export `roleColor(role: string): 'mint' | 'violet' | 'danger' | 'neutral'` returning the role's identity color: MASTER → 'mint', SLAVE → 'violet', ADMIN → 'danger'.

5. Create `src/lib/format.ts` with these functions, all returning strings:
   - formatCurrency(n: number, opts?: { sign?: boolean }) → e.g., "+$184.50" or "$184.50"
   - formatPercent(n: number, opts?: { sign?: boolean, fractionDigits?: number }) → "+42.8%" / "42.8%"
   - formatVolume(n: number) → fixed 2 decimals
   - formatDate(d: string | Date) → "27/04/2026" (DD/MM/YYYY, locale-stable)
   - formatDateTime(d: string | Date) → "27/04/2026, 15:55:50"
   - formatTime(d: string | Date) → "15:55:50" (24h)

6. Create `src/lib/avatar-color.ts`:
   - Export `avatarColorFor(name: string): string` returning one of a fixed palette of 6 muted colors derived from a hash of the name. Palette (use these exact hex):
     ['#7ee5ad','#ffb547','#7cc4ff','#c79bff','#ff9b8a','#94e0d4']

7. Create the folder `design-source/` at repo root and add it to `.gitignore`. (User has already populated it with the JSX files.)

Constraints:
- Do not change anything in src/app/page.tsx, src/components/**, src/redux/**, src/services/**.
- Do not modify any API call.
- The app should still run after this phase — only with new fonts and dark token defaults.
- Match Tailwind v4 syntax exactly (@theme inline { ... } inside @layer is wrong — use @theme at top level).

After applying changes, run `npm run dev` mentally — confirm there are no TypeScript errors and the body now renders on the dark token #0a0e0d.
```

### Verification checklist

- [ ] `npm run dev` starts without errors
- [ ] Body background is now near-black `#0a0e0d`
- [ ] Inter loads (paragraph text feels different vs the previous default)
- [ ] `<Toaster />` is mounted in `layout.tsx`
- [ ] `roleDisplay('MASTER')` returns `'Provider'` if you sanity-test in console
- [ ] `design-source/` is in `.gitignore`

---

## PHASE 1 — UI primitives library

> One session. Builds the small reusable building blocks every page consumes.

### What this phase produces

`src/components/ui/` populated with: `Logo`, `Button`, `Input`, `Pill`, `StatusPill`, `Card`, `Avatar`, `RoleBadge`, `SectionEyebrow`, `Skeleton`, `EmptyState`. Plus `src/lib/cn.ts` for `clsx` re-export.

### Files to attach in Cursor

- `@design-source/direction-a.jsx` (defines `.a-btn`, `.a-card`, `.a-pill`, the Logo pattern)
- `@design-source/styles.css` (the class definitions)
- `@src/lib/role-display.ts` (just created)
- `@src/lib/format.ts` (just created)

### Cursor prompt

```
Build the design system primitives library. Create one TypeScript file per component under src/components/ui/. Use `'use client'` only when the component uses state or event handlers — most are pure.

Tokens reminder (already in globals.css from Phase 0):
- bg, surface, surface-2, line, line-2 → backgrounds and borders
- text, text-2, text-3 → text hierarchy
- mint, mint-soft → primary accent
- violet, violet-soft → COPIER role identity
- danger, danger-soft, warn, warn-soft → status

Reference: see @design-source/styles.css for the .a-btn, .a-card, .a-input, .a-pill class definitions, and @design-source/direction-a.jsx for how the logo, .a-btn-primary, .a-btn-ghost, EquityCurve, etc. compose.

Components to build:

1. src/lib/cn.ts
   Re-export clsx as `cn`. Use clsx, not twMerge. (Tailwind v4 + a clean class strategy means we don't need merge.)

2. src/components/ui/Logo.tsx
   Default export. Props: { size?: 'sm' | 'md' | 'lg', asLink?: boolean, className?: string }.
   sm: 22px square, 14px wordmark; md: 26px square, 16px wordmark; lg: 32px square, 20px wordmark.
   - Mint square (rounded-lg, bg-mint, flex centered) containing a Lightning bolt SVG (use lucide-react Zap icon, color #02110b).
   - Wordmark "TradeSync" + period in mint + "Pro", font-bold, tight tracking (-0.02em).
   - When asLink is true, wrap in <Link href="/">.

3. src/components/ui/Button.tsx
   Variants: 'primary' (mint bg + ink #02110b text), 'ghost' (transparent + line-2 border + text-1), 'ghost-mint' (transparent + mint border + mint text), 'ghost-danger' (transparent + danger border + danger text), 'ghost-violet' (transparent + violet border + violet text).
   Sizes: 'sm' (py-2 px-3.5 text-[13px]), 'md' (py-3 px-4.5 text-sm), 'lg' (py-3.5 px-5 text-sm).
   Props: { variant, size, fullWidth?, leftIcon?, rightIcon?, loading?, ...HTMLButtonAttributes }.
   Border radius rounded-[10px], font-weight 600, letter-spacing -0.005em. Active-state translate-y-px. Loading shows a spinner from lucide-react Loader2 + disables button.

4. src/components/ui/Input.tsx
   Filled-dark variant (bg-surface-2, border border-line, rounded-[10px], py-3.5 px-3.5, text-[15px], placeholder text-text-3).
   Props: { label?, error?, success?, hint?, leftIcon?, rightIcon?, ...HTMLInputAttributes }.
   Focus state: border-mint + slightly lighter bg (#14202b — define a new token if needed, otherwise use a focus:bg-[#14202b] arbitrary).
   Error state: border-danger, error message below in danger color 12px with an alert icon.
   Success state: border-mint, success message below in mint with check icon.
   Hint message: below in text-3 12px when no error/success.
   IMPORTANT: explicit `autoComplete="off"` if no autoComplete is passed — and for password fields when autoComplete is "current-password" or "new-password", add inline style overrides for `-webkit-autofill` to prevent the white/light bg bug currently affecting login/register.

   Add this CSS to globals.css too (Phase 0 already runs but you can append):
   input:-webkit-autofill,
   input:-webkit-autofill:hover,
   input:-webkit-autofill:focus,
   textarea:-webkit-autofill {
     -webkit-text-fill-color: var(--color-text);
     -webkit-box-shadow: 0 0 0 1000px var(--color-surface-2) inset;
     transition: background-color 5000s ease-in-out 0s;
   }

5. src/components/ui/Pill.tsx
   Generic pill — rounded-full, px-2.5 py-1, text-xs font-medium.
   Props: { variant: 'default' | 'mint' | 'violet' | 'danger' | 'warn' | 'outline-mint' | 'outline-violet' | 'outline-danger' | 'outline-warn', icon?, children }.
   Filled variants use {color}-soft bg + {color} text. Outline variants use transparent bg + {color} border + {color} text.

6. src/components/ui/StatusPill.tsx
   Specialised pill with a leading dot. Props: { status: 'live' | 'idle' | 'broadcasting' | 'listening' | 'not-subscribed' | 'disconnected', label?: string, mono?: boolean }.
   Renders the dot (pulsing or hollow) + status label.
   - live / broadcasting / listening → mint pulsing dot (use the a-pulse keyframe)
   - idle / not-subscribed → text-3 hollow dot (transparent bg + 1.5px text-3 border)
   - disconnected → danger dot
   When mono is true, label uses font-mono-tnum.

7. src/components/ui/Card.tsx
   Default export Card + named subcomponents CardHeader, CardBody, CardFooter.
   Card: rounded-[14px] border border-line bg-surface.
   Variants prop: 'default' | 'role-mint' | 'role-violet' | 'role-danger' — adds a 4px left border in the role color. Used for the active-subscription card on copier dashboard.

8. src/components/ui/Avatar.tsx
   Props: { name: string, size?: number (default 38), src?: string, color?: string }.
   If src is provided, render an img. Otherwise, a circle filled with `color` (or `avatarColorFor(name)` from src/lib/avatar-color.ts) showing the initials in ink (#000), font-bold, sized proportionally (size / 2.7 for font-size).

9. src/components/ui/RoleBadge.tsx
   Props: { role: 'MASTER' | 'SLAVE' | 'ADMIN' }.
   Renders an outline pill with the role's identity color and the relabeled text. Uses roleDisplay() and roleColor() from src/lib/role-display.ts.
   - MASTER → outline-mint, label "PROVIDER"
   - SLAVE → outline-violet, label "COPIER"
   - ADMIN → outline-danger, label "ADMIN"

10. src/components/ui/SectionEyebrow.tsx
    Just a styled <div> for the eyebrow label pattern.
    Props: { children, color?: 'text-3' | 'mint' | 'violet' | 'danger', className? }.
    text-[12px] uppercase tracking-[0.08em] font-medium. Default color text-3.

11. src/components/ui/Skeleton.tsx
    Props: { variant?: 'line' | 'rect' | 'circle', width?, height?, className? }.
    Animated horizontal sweep gradient from rgba(255,255,255,0.04) → rgba(255,255,255,0.08) → rgba(255,255,255,0.04), 1.5s infinite linear. Add the keyframes to globals.css.

12. src/components/ui/EmptyState.tsx
    Props: { icon?: ReactNode, title: string, description?: string, action?: ReactNode, className? }.
    Centered vertical layout, max-w-md, generous vertical padding (py-20 px-8). icon area is 64×64, mint-tinted bg-mint-soft, rounded-2xl. title h3 22px, description text-2 15px line-height 1.6.

Constraints:
- Use TypeScript with strict prop typing
- All components forwarded refs where it makes sense (Button, Input)
- No "any" types
- No external state — these are pure
- Include displayName on every component for React DevTools
- Each file: default export + types exported as `<ComponentName>Props`

After applying, sanity-check: build a tiny scratch page at src/app/_scratch/page.tsx that imports every primitive and renders one of each, just to confirm typecheck and visual baseline. Delete this scratch page when verified — DON'T ship it.
```

### Verification checklist

- [ ] All 12 files created, no TypeScript errors
- [ ] Scratch page renders Logo, Button (5 variants), Input (3 states), Pill (8 variants), StatusPill (6 statuses), Card (4 variants), Avatar, RoleBadge (3 roles), Skeleton (3 variants), EmptyState
- [ ] No autofill white-bg bug in the Input scratch test
- [ ] `RoleBadge` for MASTER renders "PROVIDER" not "MASTER"
- [ ] Scratch page deleted before commit

---

## PHASE 2 — Composite components & layout chrome

> One session. Builds the bigger reusables (charts, feed rows, trader cards, ticker, navbar).

### What this phase produces

- `src/components/charts/EquityCurve.tsx`
- `src/components/feed/TradeRow.tsx`, `MarketTicker.tsx`
- `src/components/marketplace/TraderCard.tsx`, `TraderCardSkeleton.tsx`, `RiskFilter.tsx`
- `src/components/marketing/HowItWorks.tsx`, `ProviderShowcase.tsx`, `LiveTradeFeedCard.tsx`, `Hero.tsx`, `FooterStrip.tsx`
- `src/components/navigation/Navbar.tsx` — refactored using new primitives

### Files to attach

- `@design-source/direction-a.jsx`
- `@design-source/landing-a-v2.jsx`
- `@design-source/marketplace-a.jsx`
- `@src/components/ui/` (the whole folder Cursor will read for context)
- `@src/components/navigation/Navbar.tsx` (the existing one, to refactor)
- `@src/lib/role-display.ts`, `@src/lib/format.ts`, `@src/lib/avatar-color.ts`
- `@frontendReadme.md` (so Cursor knows the existing nav has Redux state, route checks, etc.)

### Cursor prompt

```
Phase 2 of the UI overhaul. Build the composite components and refactor the Navbar.

Reference design source files:
- @design-source/direction-a.jsx — base components (EquityCurve, TraderCard, TradeRow, MarketTicker)
- @design-source/landing-a-v2.jsx — uses the components in landing context (Hero, HowItWorks, ProviderShowcase, LiveTradeFeedCard)
- @design-source/marketplace-a.jsx — TraderCard with enriched profile metadata + RiskFilter

Reuse the primitives we built in Phase 1 — DO NOT inline buttons or pills, always use Button/Pill/Card/etc.

Components to build:

1. src/components/charts/EquityCurve.tsx
   Direct port of EquityCurve from @design-source/direction-a.jsx.
   Props: { width?: number, height?: number, accent?: string, data?: number[] }.
   - When data is omitted, generate the same deterministic synthetic curve as the design.
   - When data is provided (real backend data later), use it directly.
   - Mint gradient fill (35% → 0% opacity), dashed gridlines at 25/50/75% in rgba(255,255,255,0.05), 1.6px stroke.
   - Accept accent for danger-color curves (negative ROI traders).
   Use SVG, no external chart library.

2. src/components/feed/TradeRow.tsx
   Direct port of TradeRow from @design-source/direction-a.jsx, but typed.
   Type a Trade interface: { time: string; side: 'BUY' | 'SELL'; sym: string; who?: string; qty: string | number; px: string | number; pnl: number }.
   Props: { trade: Trade, columns?: 'standard' | 'compact' }.
   - Standard: 5-col grid `70px 1fr 90px 90px 60px` (used on landing live feed).
   - Compact: same grid but smaller padding for embed in cards.
   All numbers in font-mono-tnum.

3. src/components/feed/MarketTicker.tsx
   Direct port from @design-source/direction-a.jsx.
   No props for now — ticker data is hardcoded as decorative content. Accept an optional `items` prop for future real-data wiring.

4. src/components/marketplace/TraderCard.tsx
   The richest reused component. Define a TraderCardData interface that matches the backend MasterProfile shape (per @frontendReadme.md). Use these field names exactly — they map to backend:
     {
       id: string,
       fullName: string,
       handle?: string,        // OPTIONAL — backend doesn't have this yet, render @ + first part of email if missing
       primaryAsset?: string,  // OPTIONAL — derive from instruments[0] if missing
       riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
       roi30d?: number,        // OPTIONAL — backend doesn't expose this directly yet
       winRate: number,
       subscriberCount: number,
       isLive: boolean,
       tradingPlatform?: string,
       typicalHoldTime?: string,
       strategyDescription?: string,
       bio?: string | null,
     }
   Props: { trader: TraderCardData, mode: 'marketplace' | 'showcase' | 'subscribed' | 'preview', onAction?: () => void, actionLabel?: string }.

   Layout per the marketplace artboard:
   - Top row: 38px Avatar + name + mint check (lucide BadgeCheck) + handle/asset line + RiskBadge in top-right + live status dot in absolute top-right corner.
   - Mini equity curve (height 64). Accent depends on roi30d: positive → mint, negative → danger, missing → mint.
   - Three-stat row using a small reusable inline (eyebrow + mono number): "30d ROI" / "Win rate" / "Copiers".
     - When roi30d is missing, render "—" em-dash.
     - Win rate as fraction percent. Copiers via toLocaleString.
   - Metadata two-line in text-3 13px: `Platform {tradingPlatform} · Hold {typicalHoldTime} · Strategy {strategyDescription}`. Hide entire row if all 3 are null/empty.
   - Bio italic Text-2 13px line, truncated to 2 lines with ellipsis (line-clamp-2). Hide if bio is null.
   - Bottom action: full-width ghost Button. Label and behaviour controlled by mode + onAction:
     - 'marketplace' → "View profile"
     - 'showcase' → "Copy trader"
     - 'subscribed' → "View profile" + a violet "● Subscribed" chip rendered absolute top-right
     - 'preview' → no button (used inside provider dashboard)

   Empty profile variant: when bio is null AND tradingPlatform is null AND strategyDescription is null, render the card at 0.7 opacity with em-dash stats and an italic Text-2 line "This provider hasn't set up their profile yet" in place of bio. Bottom action becomes disabled "Profile incomplete".

5. src/components/marketplace/TraderCardSkeleton.tsx
   Skeleton matching TraderCard layout. Use Skeleton primitives.

6. src/components/marketplace/RiskFilter.tsx
   Horizontal pill row: All / Low Risk / Medium Risk / High Risk. Each pill takes a count via props.
   Props: { value: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH', counts: { all: number, low: number, medium: number, high: number }, onChange: (v) => void }.
   Active pill uses outline-mint variant with mint-soft background; inactive use outline ghost (line-2 border).
   Counts in JetBrains Mono parentheses next to label.

7. src/components/marketing/Hero.tsx
   Lifted directly from @design-source/landing-a-v2.jsx hero section. Uses Button, EquityCurve, TradeRow, StatusPill.
   The right-side product preview card has a hardcoded mock equity curve and 3 mock TradeRows — that's intentional decoration on the public landing page. NO Redux, NO API calls.

8. src/components/marketing/HowItWorks.tsx
   The 3-card explainer section from @design-source/landing-a-v2.jsx. Pure presentation.

9. src/components/marketing/ProviderShowcase.tsx
   The "Top this month" 3-card grid from landing-a-v2.jsx.
   Props: { providers: TraderCardData[] }. If providers length is 0, hide the section entirely (don't render anything).
   The landing page can pass either real data (from GET /auth/masters + per-master profile) or hardcoded mock for v1. We'll wire real data in Phase 3 — for now accept the array as-is.

10. src/components/marketing/LiveTradeFeedCard.tsx
    The bottom strip from landing-a-v2.jsx. Pure decoration, hardcoded TradeRows for now.

11. src/components/marketing/FooterStrip.tsx
    Top 1px line, padding 32, centered Text-3 12px copy.

12. src/components/navigation/Navbar.tsx — REFACTOR EXISTING
    The current Navbar has the RootState import path bug (per @frontendReadme.md §14) — fix the import to `@/redux/slices/store` (or wherever RootState actually lives — verify).

    New Navbar visual:
    - Sticky, bg-bg/85 + backdrop-blur-md, border-b border-line.
    - Container max-w-[1240px], padding 16px 32px.
    - Left: <Logo size="md" asLink />
    - Center (when not authenticated): nav links — Discover (→ /traders), How it works (→ /#how on landing only), Pricing (placeholder #), Docs (placeholder #). Inter 14, text-2, hover text.
    - Center (when authenticated): different links based on role:
      - role MASTER → "Dashboard" link with active state if route starts with /dashboard
      - role SLAVE → "Discover" (→ /traders) + "Dashboard"
      - role ADMIN → "Discover" + "Dashboard" + "Admin"
    - Right (unauth): ghost Button "Sign in" → /login + primary Button "Get started" → /register
    - Right (auth): the active dashboard / admin button uses Button variant 'ghost' but with bg-mint-soft + mint border to indicate active route. For ADMIN it's ghost + bg-danger-soft + danger border.

    Use usePathname() from next/navigation to determine active state.
    Read user from useAppSelector((state: RootState) => state.auth.user).
    Keep the existing logout flow if there is one — don't change auth dispatch logic.

    Mobile: drop the broken hamburger from the current build; for v1 the mobile nav shows just Logo + a mint "Sign in" button (text-only at <640px). We'll properly redesign mobile in a later phase — note this with a TODO comment.

Constraints:
- All numbers in any rendered component must use font-mono-tnum or the .a-mono class
- All button instances must use the Button component, never inline <button>
- All pills must use Pill or StatusPill
- All cards must use Card primitive (not raw div with bg)
- Where the design uses inline styles for unique one-off layout (grid templates, spacing), keep them as inline style — don't force everything into Tailwind. Inline style is fine for non-reusable layout. The rule is: tokens through Tailwind, layout through inline style or Tailwind based on what's clearer at the call site.

After applying, build a verification scratch page at src/app/_scratch/page.tsx that renders:
- One of each ProviderShowcase / HowItWorks / LiveTradeFeedCard
- A 3x3 grid of TraderCard at every mode (marketplace, showcase, subscribed, preview, empty)
- The new Navbar at top

Delete _scratch before commit.
```

### Verification checklist

- [ ] All 12 components compile without errors
- [ ] EquityCurve renders the same deterministic curve as the design
- [ ] TraderCard handles missing fields (no `handle`, no `bio`, no `roi30d`) without crashing
- [ ] TraderCard "empty" mode renders at 0.7 opacity with em-dashes and italic message
- [ ] RiskFilter active pill is mint-bordered, not blue
- [ ] Navbar `RootState` import path bug is FIXED
- [ ] Navbar shows correct active state on /dashboard and /admin
- [ ] Scratch page deleted

---

## PHASE 3 — Public pages: Landing, Login, Register

> One session. First user-visible surfaces in production paths.

### What this phase produces

- `src/app/page.tsx` — full landing
- `src/app/(auth)/login/page.tsx` — split-screen login
- `src/app/(auth)/register/page.tsx` — split-screen register with role toggle (Provider/Copier)
- Replaces every `alert()` in auth flows with `toast.success()` / `toast.error()` from sonner

### Files to attach

- `@design-source/landing-a-v2.jsx`
- `@design-source/auth-a.jsx`
- `@src/app/page.tsx` (existing landing)
- `@src/app/(auth)/login/page.tsx` (existing — adjust path if yours differs)
- `@src/app/(auth)/register/page.tsx` (existing)
- `@src/redux/slices/authSlice.ts`
- `@src/redux/services/api.ts` (or wherever your RTK Query / fetch logic lives)
- `@src/components/marketing/`, `@src/components/ui/`
- `@frontendReadme.md`

### Cursor prompt

```
Phase 3 of the UI overhaul. Replace the landing page and the two auth pages.

CRITICAL: Keep all existing logic intact:
- Redux dispatches (loginSuccess from authSlice)
- API endpoints (/auth/login POST, /auth/register POST)
- Router pushes (login → /dashboard, register → /login)
- Form field names (email, password, fullName, role with values 'MASTER' | 'SLAVE')
- The role values sent to backend stay 'MASTER' / 'SLAVE' even though UI says "Provider" / "Copier"

Replace alert() calls with toast.success/error from sonner.

Tasks:

1. src/app/page.tsx — REPLACE
   Use components from @src/components/marketing/. Layout per @design-source/landing-a-v2.jsx:
   - Sticky <Navbar />
   - <Hero />
   - <MarketTicker />
   - Online status strip (3 stats: traders online, verified providers, trades mirrored today). Currently DECORATIVE; render mock counts. Add a TODO comment listing the eventual data sources from frontendReadme — total providers from GET /auth/masters length, the rest are not in backend yet.
   - <HowItWorks />
   - <ProviderShowcase providers={mockProviders} /> — for now pass a hardcoded mockProviders array of 3 TraderCardData objects (Sasha Ng / Marco Aurelio / Liu Chen, exact data per @design-source/landing-a-v2.jsx). TODO comment: "Replace with real fetch GET /auth/masters?limit=3 + per-master profile in Phase 5".
   - <LiveTradeFeedCard /> — fully decorative
   - <FooterStrip />

   Do NOT add any 'use client' to this page. The landing should be a server component except where individual children must be client (Navbar reads Redux → it's client-only).

2. src/app/(auth)/login/page.tsx — REPLACE
   This stays a client component. The visual layout follows @design-source/auth-a.jsx LoginAv2.

   Top-level structure: full-bleed dark, 50/50 split-screen at lg+, single column on smaller. Right rail hidden below lg. Left side max-w-[460px] centered vertically.

   Form structure:
   - <Logo size="md" asLink /> top-left of the left half
   - h1 "Welcome back." — text-text 32px font-semibold tracking-[-0.025em]
   - subhead text-2 15px: "Sign in to your TradeSync account to mirror trades or publish your strategy."
   - Role tabs (segmented): "Copier · Mirror providers" (active = violet bg + ink text) | "Provider · Publish strategies" (inactive = transparent + line-2 border + text-2). The role tab is decorative on login — clicking changes the styling but doesn't change the actual login flow (login is role-agnostic, the user's role comes from the response). Add a TODO comment.
   - Ghost Button fullWidth with Google G icon (lucide): "Continue with Google" — DECORATIVE, button is disabled with title="Coming soon"
   - Divider with text "or with email"
   - Input (label="Email", type="email", placeholder="you@firm.com")
   - Input (label="Password", type="password", placeholder="••••••••") with eye toggle on right via rightIcon prop. Above the input, in the label row, a mint Link "Forgot?" — DECORATIVE, href="#"
   - Mint-accent Checkbox "Keep me signed in on this device" — DECORATIVE, no persistence
   - Primary Button fullWidth: "Sign in →"
   - Below: "Don't have an account? Create one" (link to /register, "Create one" in mint)
   - Footer text-3 11px centered: "Protected by 2FA · SOC 2 Type II · Your MT5 credentials never leave your device"

   Submit handler:
   - On submit, call existing login flow (RTK mutation or fetch). Wrap in try/catch.
   - Success: dispatch loginSuccess(response.user), toast.success("Welcome back, " + response.user.fullName), router.push('/dashboard').
   - Error: toast.error(err.message || "Invalid credentials"). Also set inline error state on Input components (Input has an `error` prop).
   - During request, Button shows loading state.

   Right rail (hidden on <lg):
   - bg-surface, border-l border-line, padding 40, overflow-hidden. Subtle radial mint glow from top-right via inline style.
   - StatusPill status="live" label="1,284 traders online" (decorative)
   - A metric Card "Today's PnL +$2,184.50" with mint pill "+4.74%" + a 120px <EquityCurve />
   - A second Card "Just executed" with eyebrow + 3 <TradeRow /> entries (decorative)
   - A blockquote testimonial 17px + Avatar + name + "Copying since Jan 2026 · +38.2% YTD" — decorative

3. src/app/(auth)/register/page.tsx — REPLACE
   Client component. Visual layout follows @design-source/auth-a.jsx RegisterProviderA / RegisterCopierA.

   The page has a single role state controlling which "side" of the artboard renders. Use useState<'MASTER' | 'SLAVE'>('SLAVE'). Default to Copier (the more common path).

   Left side:
   - Logo top-left
   - h1 "Create your account."
   - subhead: "Join the network — mirror verified strategies or publish your own."
   - Role toggle (segmented):
     - "I'm a Provider" — when active: bg-mint, text-[#02110b]. When inactive: transparent, text-2.
     - "I'm a Copier" — when active: bg-violet, text-white. When inactive: transparent, text-2.
     - 13px label + 11px description on each
   - Role info Card directly below the toggle:
     - When MASTER: border-mint, bg-mint-soft tinted (use rgba), eyebrow mint "PROVIDER ACCOUNT"
       Body: "You'll broadcast your trades. After registration, an admin will issue your license key — required to activate broadcasting from your desktop terminal."
     - When SLAVE: border-violet, bg-violet-soft tinted, eyebrow violet "COPIER ACCOUNT"
       Body: "You'll mirror trades from verified providers. After registration, browse the marketplace, pick a provider, and run our desktop client to start copying — your MT5 credentials stay on your machine."
   - Form fields:
     - Input label="Full Name" placeholder={role === 'MASTER' ? 'John Doe' : 'Jane Smith'}
     - Input label="Email" type="email" placeholder="you@firm.com"
     - Input label="Password" type="password" with eye toggle
   - Primary Button fullWidth — text changes per role:
     - MASTER → "Create Provider account →"
     - SLAVE → "Create Copier account →"
   - Below: "Already have an account? Sign in" (mint link to /login)
   - Footer text-3 11px: "By creating an account you agree to our Terms and Privacy Policy."

   Right side rail — switches per role:
   - When MASTER:
     - Eyebrow "PROVIDER PERSPECTIVE", h2 "Publish once. Earn while you trade."
     - 3 benefit rows with mint check icons
     - A mock TraderCard preview (mode="preview") with a small "your future profile" annotation pill
   - When SLAVE:
     - Eyebrow "COPIER PERSPECTIVE", h2 "Find your edge. Mirror it automatically."
     - 3 benefit rows with VIOLET check icons
     - A mock copier-dashboard preview card with a violet equity curve and "your future dashboard" pill

   Submit handler:
   - POST to existing register endpoint with body { fullName, email, password, role } where role is 'MASTER' | 'SLAVE' uppercase.
   - Success: toast.success("Account created — sign in to continue"), router.push('/login')
   - Error: toast.error(err.message || "Registration failed")

4. Find every alert() call in src/app/(auth)/** and src/components/auth/** and replace with the appropriate toast.success / toast.error. Do NOT touch alert() in src/components/dashboard/** or src/app/admin/** in this phase — they'll be handled later.

5. Verify the Input autofill bug is gone — type into the email field, watch it stay dark. If browser autofill still bleeds through, double-check the -webkit-autofill CSS landed in globals.css from Phase 0.

6. Per @frontendReadme.md, auth state persistence across hard-refresh is a known gap. We're NOT fixing that in this phase. Add a TODO comment in src/redux/slices/authSlice.ts noting "TODO: persist to localStorage with redux-persist or similar — currently lost on F5".

Constraints:
- Submit handlers must call the EXACT same Redux/API code paths the current login.tsx and register.tsx call. If the existing code uses a custom fetch helper or RTK Query mutation, reuse it. Don't reimplement.
- The role values sent to /auth/register are 'MASTER' or 'SLAVE' — the relabeled UI strings ("Provider", "Copier") never travel over the wire.
- Server components by default; only mark 'use client' where state or event handlers require it.

Output: a summary of the 3 page files modified, list of components imported, and any decorative elements you added with TODO comments for future wiring.
```

### Verification checklist

- [ ] `/` renders the new landing with mint accents only — no residual blue
- [ ] Market ticker animates left (50s linear loop)
- [ ] `/login` renders 50/50 split-screen at lg+, dark inputs (no white autofill)
- [ ] Login submit calls the same Redux action as before
- [ ] Toast appears on login success/failure (sonner)
- [ ] `/register` toggles between Provider (mint) and Copier (violet) info cards
- [ ] Role value sent to backend is `MASTER` / `SLAVE` (verify in Network tab)
- [ ] All numbers render in JetBrains Mono on these pages
- [ ] No `alert()` calls remain in the auth flow

---

## PHASE 4 — Marketplace + Provider detail page

> One session. The full discovery surface, plus the new `/traders/[id]` route.

### What this phase produces

- `src/app/traders/page.tsx` — refactored marketplace
- `src/app/traders/[id]/page.tsx` — NEW provider detail page
- Real data wiring (no more mock providers in this phase)
- `src/components/marketplace/ProviderHeroBand.tsx`, `PerformanceBigCard.tsx`, `RiskProfileCard.tsx`, `InstrumentsCard.tsx`, `TradingHoursCard.tsx`

### Files to attach

- `@design-source/marketplace-a.jsx` (both `MarketplaceA` and `ProviderDetailA`)
- `@src/app/traders/page.tsx` (existing)
- `@src/components/master/MasterProfileCard.tsx` (existing — to be deprecated/replaced by TraderCard)
- `@src/components/master/TradeHistoryModal.tsx` (existing)
- `@src/components/master/PnLChart.tsx` (existing)
- `@src/redux/services/api.ts`
- `@src/lib/api.ts`
- `@src/components/marketplace/`, `@src/components/ui/`
- `@frontendReadme.md`, `@backendReadme.md`

### Cursor prompt

```
Phase 4 of the UI overhaul. Implement the marketplace listing and the new provider detail page.

CRITICAL: All API calls remain identical:
- GET /auth/masters returns active masters list
- GET /auth/masters/live returns { liveIds: string[] }
- GET /auth/masters/:id/profile returns full enriched profile
- GET /trades/master/:masterId/history returns trade list
- PATCH /auth/users/:slaveId/subscribe { masterId } subscribes (only if user is logged in as SLAVE)

The detail page route /traders/[id] is NEW — additive, no contract impact. Public — no auth required to view.

Tasks:

1. src/app/traders/page.tsx — REPLACE
   Server component if possible (it just fetches public data); otherwise client.
   Structure per @design-source/marketplace-a.jsx MarketplaceA:
   - <Navbar />
   - Page header card: eyebrow "MARKETPLACE", h1 "Browse Providers" 36px, subhead, and on the right side <RiskFilter />.
   - 3-column grid (gap 20, max-w-[1240px], padding 0 32 80) of TraderCard components.

   Data fetching:
   - Use the existing service (RTK Query or fetch) to GET /auth/masters and GET /auth/masters/live in parallel.
   - For each master id, GET /auth/masters/:id/profile. Use Promise.all and combine into TraderCardData[].
   - While loading: render 6 <TraderCardSkeleton />.
   - On error: render an EmptyState with title "Couldn't load providers" + a Retry button.

   Filter:
   - useState for risk: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'
   - Client-side filter on profile.riskLevel
   - When filter excludes all results: render EmptyState "No providers match your filter" + ghost button "Clear filters"
   - Counts on RiskFilter pills computed from the unfiltered list

   Card mode: 'marketplace'. onAction navigates to /traders/{id}.

   IMPORTANT — handle missing fields:
   - If a master has no profile data (totally new account): TraderCard mode "marketplace" but renders the empty-profile state. Card opacity 0.7. Bottom action disabled "Profile incomplete".
   - If profile.bio is null: render the empty-profile italic line in place of bio.

2. src/app/traders/[id]/page.tsx — NEW
   Server component if possible (just public profile data).
   Layout per @design-source/marketplace-a.jsx ProviderDetailA:
   - <Navbar />
   - Container max-w-[1240px], a back link "← Back to marketplace" → /traders, text-2 14px

   - <ProviderHeroBand /> (NEW component)
     Two-column 1fr/1fr inside max-w-[1240px], padding 48 32. Subtle mint radial glow inline style.
     Left column:
       - 64px Avatar + name 40px font-semibold + mint check icon
       - sub-line: "@{handle} · {primaryAsset} · Joined {createdAt}" with date in font-mono-tnum
       - Pill row: StatusPill status="live", Pill outline-warn "Med risk" (or whichever level), Pill outline-mint "Verified by TradeSync"
       - Bio paragraph 17px max-w-[460px]
       - Metadata row: "Platform {tradingPlatform} | Typical hold {typicalHoldTime} | Strategy {strategyDescription} | License {licenseKey}"
     Right column:
       - <PerformanceBigCard /> (NEW)
         Eyebrow "30-DAY PERFORMANCE", big mono ROI 48px mint
         2×2 sub-stats: Win rate, Total trades, Avg volume, Total PnL — all mono
         220px tall <EquityCurve />
         Primary Button fullWidth: "Copy this provider →"
         Below: ghost Button "Add to watchlist" — DECORATIVE, no action

   - Tab bar: Overview (active, mint underline) | Trade history | Stats | Reviews
     For v1: "Overview" is the only functional tab. Trade history opens existing <TradeHistoryModal />. Stats and Reviews show "Coming soon" empty states. Add TODO comments.

   - Overview content (when on Overview tab):
     2-col grid 2fr/1fr inside max-w-[1240px], padding 32.
     Left wide column:
       - Eyebrow "RECENT SIGNALS" + h3 "Last 10 trades" + right link "View full history →" (opens TradeHistoryModal)
       - 6-col table from real GET /trades/master/:id/history (use the existing endpoint, slice last 10): Time / Symbol / Action pill / Volume / P&L / Status pill
       - Below: a "Cumulative P&L (90 days)" Card containing the existing <PnLChart /> (don't redesign it in this phase — separate task). Style the card shell only.
     Right rail:
       - <RiskProfileCard /> (NEW): drawdown, avg trades/day, longest losing streak, sharpest gain. For v1 use mock numbers + TODO since these aren't computed in backend yet.
       - <InstrumentsCard /> (NEW): wraps profile.instruments (split by comma, trim) into Pill outline list
       - <TradingHoursCard /> (NEW): for v1 just plain text "London + NY overlap (12:00–17:00 GMT)" — not in backend, decorative

   "Copy this provider" button behavior:
   - If user is unauthenticated: redirect to /login with a `?next=/traders/{id}` query param
   - If user.role === 'SLAVE': call PATCH /auth/users/{user.id}/subscribe { masterId: id }, dispatch loginSuccess({...user, subscribedToId: id}), toast.success "Subscribed to {name}", redirect to /dashboard
   - If user.role === 'MASTER': toast.error "Providers can't subscribe to other providers", button disabled
   - If user.role === 'ADMIN': button hidden
   - If user.subscribedToId === id: button text becomes "Already subscribed", disabled

3. Update existing TradeHistoryModal styling to match design system:
   - Card shell with rounded-[18px], padding 0
   - Header strip with name + license key in mono
   - Filter chips (All time / 7d / 30d / 90d) - new addition
   - 6-col table reusing TradeRow patterns
   - Footer aggregate row: "Total trades 50 · Total P&L +$X · Win rate Y%"
   - Use Card primitive shell, Pill primitives
   - Don't change the underlying open/close logic or data fetching

   This is a redesign of an existing component. Keep the props signature compatible.

4. Mark the existing src/components/master/MasterProfileCard.tsx as deprecated:
   - Add a JSDoc @deprecated comment at top: "Replaced by src/components/marketplace/TraderCard.tsx — kept temporarily for any callers we haven't migrated."
   - In a future cleanup phase we'll delete it. For now find all imports and switch to TraderCard.

5. Replace any alert() in marketplace flow (subscribe action, error handling) with toast.

Constraints:
- All real backend data flows through the existing API service. Don't introduce a new fetch layer.
- All numbers in font-mono-tnum.
- The Provider detail page must work for any master id, including masters without a profile filled in (graceful empty state for missing bio/instruments/etc.)
- The new route `/traders/[id]` is public — don't put it behind ProtectedRoute.
- Add a graceful 404 for /traders/[id] when the master id doesn't exist (catch the API 404 and render a "Provider not found" empty state).

Output: a list of created/modified files, the decorative items left as TODO, and confirmation that all existing API calls go through unchanged.
```

### Verification checklist

- [ ] `/traders` shows real masters from the backend (verify in Network tab)
- [ ] Live status dot is real (matches `/auth/masters/live` response)
- [ ] Risk filter actually filters
- [ ] Empty profile masters show the 0.7-opacity card with em-dashes
- [ ] Clicking a card navigates to `/traders/[id]`
- [ ] Detail page loads profile + recent trades
- [ ] "Copy this provider" works for SLAVE users (subscribes successfully)
- [ ] "Copy this provider" rejects for MASTER users (toast)
- [ ] TradeHistoryModal opens and renders the new style
- [ ] No JetBrains Mono numbers escaped to Inter

---

## PHASE 5 — Copier Dashboard

> One session. The signed-in copier's home base, both active and empty states.

### What this phase produces

- `src/components/dashboard/CopierDashboard.tsx` (renamed from `SlaveDashboard.tsx`)
- New sub-components: `ActiveSubscriptionCard`, `CopierKpiStrip`, `IncomingSignalsTable`
- Real socket integration preserved
- Empty state for new copiers
- Updated `src/app/dashboard/page.tsx` if needed to route role correctly

### Files to attach

- `@design-source/copier-dashboard-a.jsx`
- `@src/components/dashboard/SlaveDashboard.tsx` (existing)
- `@src/components/trades/LiveTradeTable.tsx` (existing socket consumer)
- `@src/services/socket.ts`
- `@src/redux/slices/authSlice.ts`, `@src/redux/slices/tradeSlice.ts`
- `@src/components/marketplace/TraderCard.tsx` (just built)
- `@src/components/ui/`, `@src/components/feed/`
- `@frontendReadme.md`, `@SYSTEM_CONTRACT_MATRIX.md`

### Cursor prompt

```
Phase 5 of the UI overhaul. Redesign the copier dashboard while preserving ALL socket and Redux logic.

CRITICAL — must not break:
- Socket.IO event names (`trade_execution`, `register_node`, `node_registered`)
- Room subscription pattern (subscribed to room_master_<subscribedToId>)
- The register_node payload shape required by backend (NODE_TYPE: 'SLAVE', email: user.email)
- Auto re-register-on-reconnect behavior in SocketManager
- LiveTradeTable's socket listener
- The Redux subscribe/unsubscribe action that updates user.subscribedToId

Tasks:

1. RENAME src/components/dashboard/SlaveDashboard.tsx → src/components/dashboard/CopierDashboard.tsx
   - Update the component name from SlaveDashboard to CopierDashboard
   - Find all import sites and update them (likely src/app/dashboard/page.tsx)
   - This is purely a rename — internal logic stays identical for now, then you'll redesign it in step 2

2. Redesign src/components/dashboard/CopierDashboard.tsx
   Layout per @design-source/copier-dashboard-a.jsx CopierDashboardActiveA + CopierDashboardEmptyA.

   The component is one client component that branches:
   - If user.subscribedToId === null → render the empty state
   - Else → render the active state

   Active state structure:
   - Page header (max-w-[1240px], padding 32 32 24, two-column flex):
     - Left: <SectionEyebrow>COPIER CONSOLE</SectionEyebrow>, h1 "Copier Terminal" 32px font-semibold, subhead text-2 "Browse providers, inspect their identity, and subscribe with confidence."
     - Right: <StatusPill status="listening" label="STATUS: LISTENING" mono /> — but DERIVE the status from real socket connection state. If socket connected AND user.subscribedToId !== null → "listening". If socket disconnected → status="disconnected" label="STATUS: DISCONNECTED". If subscribed but socket has not yet emitted node_registered → "idle" label="CONNECTING…"

   - <CopierKpiStrip /> (NEW) — 3-col grid gap 16:
     - Card "Active Provider": eyebrow + provider full name (from a fetched profile, shown next to a small Avatar inline). 36px right-side icon square (bg-surface-2, text-3 broadcast icon).
     - Card "Latency": eyebrow + "< 20 ms" mono mint + sub-text-3 "synthetic estimate". (Latency is decorative for v1 — no real measurement endpoint. Add TODO.)
     - Card "Risk Multiplier": eyebrow + "Managed by app" italic + text-3 "Configure in desktop client".
     ALL ICONS muted text-3, never colorful.

   - <ActiveSubscriptionCard /> (NEW) — wide Card with variant="role-violet" (4px violet left edge):
     - Top row: Avatar + name + mint check + "@{handle} · {asset}" + Risk Pill + right-aligned text-3 "Subscribed {time ago}". (The "time ago" relative format is decorative until we have a real subscribedAt timestamp — for now show "subscribed".)
     - Body: 4-stat horizontal row — eyebrow + mono value:
       "Provider's 30d ROI" / "Today's signals" / "Your session P&L" / "Mirrored trades"
       For v1, "Provider's 30d ROI" can come from profile.totalPnL via a 30d filter (or hardcode a TODO). "Today's signals" from socket-emitted count or trade history filtered to today. "Your session P&L" from tradeSlice. "Mirrored trades" from session count.
     - Right: ghost Button "View provider profile" → /traders/{subscribedToId} + ghost-danger Button "Unsubscribe"

     Unsubscribe handler: PATCH /auth/users/{user.id}/subscribe { masterId: null }, dispatch loginSuccess({...user, subscribedToId: null}), toast.success "Unsubscribed", page re-renders empty state.

   - Marketplace section: SectionEyebrow "BROWSE OTHER PROVIDERS" + h2 "Master Marketplace" + right link "See all 247 →" (real count from GET /auth/masters length when fetched).
     3-col grid of TraderCard components. For each card:
     - if trader.id === subscribedToId: mode="subscribed" (renders "Subscribed" violet chip + "View profile" button)
     - else: mode="marketplace" with an action label "Subscribe" (primary mint button override — let the TraderCard accept actionLabel prop)
     Subscribe action: same PATCH endpoint, replaces current subscription.

   - <IncomingSignalsTable /> (NEW) — Card containing:
     - Header: eyebrow "INCOMING SIGNALS" + h3 "Live feed from your provider" + right Pill "{n} today" mono
     - 5-col header: Time | Order | Symbol | Volume | Status
     - Rows from tradeSlice.trades (fed by socket events).
     - Status mapping (DERIVE from each trade):
       - event === 'CLOSE' && pnl !== null → CLOSED gray pill + mono color-coded P&L
       - event === 'OPEN' && status not yet closed → OPEN mint pulsing dot
       - other (future ENRICHMENT): IGNORED (gray dot + italic "Symbol unmapped"), FAILED (danger dot + italic "Insufficient margin"). For v1, IGNORED and FAILED don't exist in backend — leave TODO comments.

   The IncomingSignalsTable replaces the current <LiveTradeTable />. Keep the socket subscription logic (move it from LiveTradeTable into IncomingSignalsTable, or keep LiveTradeTable as a hook-only data layer and IncomingSignalsTable as the view). Decision: extract a `useIncomingSignals()` hook in src/hooks/ that wraps the socket subscription, returns trades + signal counts. Both old and new components can read from it. Mark LiveTradeTable @deprecated.

   Empty state structure (when user.subscribedToId === null):
   - Same page header but StatusPill status="not-subscribed" label="STATUS: NOT SUBSCRIBED"
   - <CopierKpiStrip /> with empty values: Active Provider "None selected" italic + inline ghost Button "Browse marketplace →", Latency "—", Risk Multiplier unchanged
   - <EmptyState />:
     - Custom mint-outline SVG illustration of two terminals connected by a dotted line (simple SVG, no external asset)
     - title: "Pick a provider to start mirroring."
     - description: "You're connected to TradeSync. Browse verified providers, subscribe to one, and your desktop client will start mirroring within seconds."
     - action: primary Button "Browse providers →" → /traders
   - Below: 3 trust signals row (mint check icons): KYC verified providers · Audited 90-day history · Sub-second mirror lag
   - Marketplace teaser: SectionEyebrow "TOP PROVIDERS THIS MONTH" + h3 "Trending now" + 3 TraderCard (mode="marketplace" with "Subscribe" primary action)

3. Mark old src/components/master/MasterProfileCard.tsx @deprecated if not done in Phase 4.

4. Audit alert() calls in any copier-related file and replace with toast.

5. Verify the Redux subscribe action still passes the correct masterId. Check the Network tab for the PATCH call after redesign.

Constraints:
- The socket connection lifecycle (connect on mount, register_node, listen for trade_execution, cleanup on unmount) must remain intact. The redesign is purely visual.
- The trade_execution payload contract is fixed: { event, master_ticket, symbol, action, volume, pnl?, signalId?, trace_id? }. Don't change consumers.
- ProtectedRoute wrapper: ensure /dashboard for SLAVE role still uses the role check at the page level (src/app/dashboard/page.tsx).
- Do not rename SLAVE in any backend payload, Redux state field, or socket event.

Output: file list, hook extracted, status of LiveTradeTable deprecation, real-vs-decorative annotation for KPI strip values.
```

### Verification checklist

- [ ] Subscribed copier sees the violet-edged active card
- [ ] Unsubscribed copier sees the empty state with "Browse providers" CTA
- [ ] Real-time signals still appear in IncomingSignalsTable on socket events
- [ ] Subscribe action from a marketplace card on the dashboard still works
- [ ] Unsubscribe wipes subscription and re-renders empty state
- [ ] Latency shows "< 20 ms" with `synthetic estimate` subtext
- [ ] StatusPill correctly reflects socket state
- [ ] No `LiveTradeTable` rendered alongside `IncomingSignalsTable` (deprecate properly)
- [ ] All numbers mono

---

## PHASE 6 — Provider Dashboard

> One session. The signed-in provider's home base — Overview tab, Profile Setup tab, empty state.

### What this phase produces

- `src/components/dashboard/ProviderDashboard.tsx` (renamed from `MasterDashboard.tsx`)
- New sub-components: `LicenseKeyBlock`, `ProviderKpiStrip`, `MyPerformanceCard`, `RecentSignalHistory`, `PublicProfilePreview`
- Profile Setup form — refactored existing `MasterProfileSetup.tsx`
- Empty state for first-time providers

### Files to attach

- `@design-source/provider-dashboard-a.jsx`
- `@src/components/dashboard/MasterDashboard.tsx` (existing)
- `@src/components/master/MasterProfileSetup.tsx` (existing)
- `@src/components/master/PnLChart.tsx`
- `@src/redux/services/api.ts`
- `@src/components/marketplace/TraderCard.tsx`
- `@src/components/ui/`, `@src/components/feed/`
- `@frontendReadme.md`, `@backendReadme.md`

### Cursor prompt

```
Phase 6 of the UI overhaul. Redesign the provider dashboard.

CRITICAL — preserved logic:
- GET /auth/masters/:id/dashboard returns the profile + recentTrades + counters
- PATCH /auth/masters/:id/profile updates nullable fields
- License key on user.licenseKey is generated by admin via POST /auth/users/:id/license
- Master broadcasts via desktop client; backend tracks isActive via socket presence
- The 4 KPI cards values map directly: totalSignalsSent, subscriberCount, openTradesCount, winRate

Tasks:

1. RENAME src/components/dashboard/MasterDashboard.tsx → src/components/dashboard/ProviderDashboard.tsx
   Update the export name and find/update import sites (src/app/dashboard/page.tsx).

2. Redesign ProviderDashboard.tsx per @design-source/provider-dashboard-a.jsx (Overview, Profile Setup, Empty).

   The component shell:
   - Same page header pattern — SectionEyebrow "PROVIDER CONSOLE", h1 "Provider Performance Dashboard", subhead, right side StatusPill.
     - Status "broadcasting" (mint pulsing) when desktop client is connected (derive from a future API or socket presence event; for v1, if profile.subscriberCount > 0 OR there are any recentTrades from today → "broadcasting"; else "idle"). Add TODO to wire this to real connection state once backend exposes it.
   - Tab bar with two tabs: Overview (default active) | Profile Setup
     Use a useState<'overview' | 'profile'> tab controller.

   Overview tab content:
   - <LicenseKeyBlock /> (NEW): wide card padding 20.
     - Left: eyebrow "YOUR LICENSE KEY" + small mint-soft outlined chip with mono key value.
     - Right: ghost Button with copy icon "Copy". On click, write user.licenseKey to clipboard via navigator.clipboard.writeText, toast.success "Copied", icon flips to check for 1.5s.
     - If user.licenseKey is null: render "—" + Pill outline-warn "Awaiting admin issuance" + tooltip explanation. (This shouldn't happen in practice for an active provider, but handle gracefully.)

   - <ProviderKpiStrip /> (NEW): 4-col grid gap 16. Each card padding 20, eyebrow + huge mono value + small icon top-right.
     ALL ICONS MUTED text-3 — never colorful (the current build's biggest visual drift is multi-color KPI icons).
     - "Total Signals Sent": totalSignalsSent count. Icon: signal/pulse line (lucide Activity).
     - "Connected Copiers": subscriberCount. Sub-text "{liveCount} currently live" if you have it (likely needs a future backend endpoint — TODO). Icon: lucide Users.
     - "Open Trades": openTradesCount. Icon: lucide CircleDot.
     - "Win Rate": profile.winRate as percent. Icon: lucide BarChart3.
       CONDITIONAL COLOR: mint when winRate > 50, danger when < 40, default text-1 otherwise.

   - <MyPerformanceCard /> (NEW): wide card.
     Header h3 "My Performance".
     3-col subdivision:
     - "TOTAL P&L": totalPnL mono. Color mint if positive, danger if negative.
     - "AVG VOLUME": avgVolume mono.
     - "CLOSED TRADES": closedTrades mono.

   - <RecentSignalHistory /> (NEW): wide card padding 0 (table fills).
     Header strip: title "Recent Signal History" + right eyebrow "LAST 10 TRADES".
     6-col table from dashboardData.recentTrades:
     Symbol | Action (BUY mint pill / SELL danger pill) | Volume | P&L (mono color-coded) | Status (CLOSED gray pill / OPEN mint pill) | Date (mono).

   - <PublicProfilePreview /> (NEW): wide card padding 24, two-column flex.
     - Left: h3 "Your Public Profile" + subhead "Preview the profile card copiers will see in the marketplace."
     - Right: ghost-mint Button "Edit Profile" → switches the active tab to 'profile'.
     - Below the header, EMBEDDED inside this card: render an actual <TraderCard mode="preview" trader={...this provider's data} />.

   Profile Setup tab content:
   - Refactor src/components/master/MasterProfileSetup.tsx into a form that lives inside this tab.
     The existing form has the right fields (about/bio, broker/platform, hold time, instruments, strategy, riskLevel) — the design only changes visual presentation.
     New visual structure: one wide Card padding 32, with:
     - Eyebrow "PROVIDER IDENTITY" + h2 "Profile Setup" + subhead "Tell copiers who you are, how you trade, and what they can expect."
     - Field: "About Your Trading" — textarea, 4 rows, max 300 chars. Char counter bottom-right `13 / 300` mono text-3, goes danger when >270.
     - Two-col row: "Broker / Platform" text Input + "Typical Trade Duration" custom dropdown (NOT browser-default — build a styled dropdown using a click-toggle div or a small popover. Options: Seconds, Minutes, Hours, Days, Weeks).
     - "Instruments You Trade" Input + below text-3 hint "Comma-separated. This helps copiers set up their symbol mapping."
     - "Trading Strategy" Input + below text-3 hint
     - "Risk Level" — three Pills row, single-select. Selected pill has filled bg-{color}-soft + {color} border + {color} text. Hovers same. Use proper aria-pressed.
     - Save bar (sticky inside card at bottom, top 1px line, padding 16 0):
       - Left: text-3 "Saved profile updates will appear on the dashboard and in the public marketplace."
       - Right: primary Button "Save Profile" (loading state during the PATCH).

   Submit handler:
   - PATCH /auth/masters/{user.id}/profile with the changed fields only (compute diff against initial values to send minimal payload).
   - Success: toast.success "Profile saved", refetch the dashboard data so the preview updates, switch back to Overview tab.
   - Error: toast.error.

   Empty state structure (first-time provider — no signals, no profile):
   Detection: dashboard.totalSignalsSent === 0 && profile.bio === null && profile.tradingPlatform === null.
   - Same page header but StatusPill status="idle" label="STATUS: IDLE"
   - <LicenseKeyBlock /> renders normally (still has license)
   - <ProviderKpiStrip /> with all values "0" mono. winRate shows "—" em-dash.
   - Replace MyPerformance + RecentSignalHistory with a single <EmptyState /> hero:
     - Custom broadcast-tower SVG illustration in mint outline
     - title: "Start broadcasting to attract copiers."
     - description: "Run the TradeSync desktop client, sign in with your license key, and click START BROADCASTING. Your first signal will appear here within seconds."
     - action: primary Button "Download desktop client →" (link to a placeholder /downloads route — DECORATIVE for now, add TODO) + ghost Button "Set up your profile" (switches tab to Profile Setup)
   - <PublicProfilePreview /> still renders, but the embedded TraderCard renders in incomplete state with em-dash stats and italic "Set up your profile to appear in the marketplace." Below the card, mint link "Complete profile setup →" → switches tab.

3. Mark src/components/master/MasterProfileSetup.tsx as @deprecated; the new form lives inside ProviderDashboard.tsx as a sub-component. (Or keep MasterProfileSetup as a stand-alone client component imported by the tab.) Whichever is cleaner.

4. Find every alert() call in src/components/dashboard/MasterDashboard.tsx (now ProviderDashboard) and replace with toast.

5. Per @frontendReadme.md, the existing dashboard fetch happens in a useEffect — keep that pattern. Loading state should render skeleton variants of the KPI cards / table rows / card rows, NOT a spinner. Use Skeleton primitives.

Constraints:
- Do not change ANY field name in the PATCH body. The backend expects { bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime } with those exact keys.
- riskLevel values must be 'LOW' | 'MEDIUM' | 'HIGH' uppercase in the request body.
- typicalHoldTime values must match the dropdown labels exactly.
- The license key value is read-only — don't expose any UI to edit it.
- No alert(); every notification flows through sonner.
- All numbers mono.

Output: file list, components extracted, list of decorative items with TODOs (latency, "currently live" sub-count, downloads link).
```

### Verification checklist

- [ ] Provider dashboard renders Overview tab by default with real data
- [ ] All 4 KPI icons are muted Text-3 — no rainbow icons
- [ ] Win rate value is mint-colored when >50%, danger when <40%
- [ ] Total P&L is danger-colored when negative
- [ ] Profile Setup tab loads with current values pre-filled
- [ ] Save Profile triggers PATCH with only changed fields
- [ ] Public Profile Preview embeds an actual TraderCard
- [ ] Empty state hero appears for first-time providers (test with a fresh master account if possible)
- [ ] License key copy button works
- [ ] No alert() calls remain in provider flows

---

## PHASE 7 — Admin Dashboard

> One session. Built directly from system patterns since Claude Design hit limit. No design JSX file to attach.

### What this phase produces

- `src/app/admin/page.tsx` — refactored
- New sub-components: `AdminTabs`, `UserFilterChips`, `UserTable`, `UserTableRow`
- Stub designs for the 3 disabled sub-tabs

### Files to attach

- `@src/app/admin/page.tsx` (existing)
- `@design-source/marketplace-a.jsx` (reference for filter chips pattern)
- `@design-source/copier-dashboard-a.jsx` (reference for table treatment)
- `@src/components/ui/`, `@src/components/feed/`
- `@frontendReadme.md`, `@backendReadme.md`

### Cursor prompt

```
Phase 7 of the UI overhaul. Build the Admin / Users page directly from the design system patterns we've established (no design JSX attached — derive from the marketplace and copier dashboard treatments).

CRITICAL — preserved logic:
- GET /auth/users returns the user list (admin only, role check at server)
- POST /auth/users/:id/license generates TSP-XXXX-XXXX (only when role is MASTER)
- PATCH /auth/users/:id/toggle-status flips isActive (BLOCKED for ADMIN by backend)
- ADMIN role badge stays danger-red identity
- The page is wrapped in a ProtectedRoute that requires user.role === 'ADMIN'

Visual style — derive from system:
- Page header pattern same as marketplace page (eyebrow, h1, subhead, right-side stats)
- Filter chips same row pattern as RiskFilter
- Table treatment same row dividers / hover pattern as RecentSignalHistory in the provider dashboard, but full-bleed inside a Card
- All destructive buttons use Button variant="ghost-danger" — NEVER filled red
- All key-management buttons use Button variant="ghost-mint"
- Role badges via <RoleBadge /> primitive

Tasks:

1. src/app/admin/page.tsx — REPLACE
   Layout structure:
   - <Navbar /> (already shows the Admin button when user.role === 'ADMIN', from Phase 2)
   - <AdminTabs /> (NEW): horizontal text tabs — Users (active mint underline) | Nodes (disabled italic) | Audit (disabled italic) | Settings (disabled italic). Below 1px line. Inter 14 medium. Routing TBD; for v1 only Users renders content; the others render the "Coming soon" stub when clicked.
   - Page header:
     - Left: 32px danger-tinted square + lucide ShieldAlert icon, h1 "System Administration", subhead "Manage users, licenses, and platform access."
     - Right: 3-col mini-stats row — eyebrow + mono value: TOTAL USERS / ACTIVE TODAY / DISABLED. Compute these from the fetched user list.
   - <UserFilterChips /> (NEW): pill row — All Users (active mint-soft + mint border + mint text) | Providers (count) | Copiers (count) | Admins (count). Counts in mono parens.
     - Right side of row: a filled-dark search Input (with magnifier lucide Search icon as leftIcon), placeholder "Search by name, email, or license key…"
   - <UserTable /> (NEW): wide Card padding 0 (table fills). Internal row padding 16 24.
     - Column headers row: User | Role | License Key | Status | Actions. Eyebrow style 11px uppercase tracking-1. 1px bottom line.
     - Rows from the filtered/searched user list. Use <UserTableRow /> (NEW) for each.
     - Row dividers 1px line. Hover: bg-white/2.

2. <UserTableRow /> per-user logic:
   Props: { user, onIssueLicense, onRegenerate, onToggleStatus }.

   User column: full name + email below in text-2 small.
   Role column: <RoleBadge role={user.role} />
   License Key column logic:
     - role === 'MASTER' && licenseKey !== null → mint-soft tinted Pill with mono key
     - role === 'MASTER' && licenseKey === null → "—" + below in text-3 italic small "not issued"
     - role !== 'MASTER' → "—"
   Status column:
     - isActive === true → "● Active" with mint dot + mint mono text
     - isActive === false → "○ Disabled" with hollow text-3 dot + text-3 (entire row gets opacity 0.6)
   Actions column logic:
     - role === 'ADMIN' → text-3 italic "Protected" — no buttons (backend blocks disabling admins anyway)
     - role === 'MASTER' && !licenseKey → ghost-mint "Issue Key" + ghost-danger "Disable"
     - role === 'MASTER' && licenseKey → ghost-mint "Regenerate Key" + ghost-danger "Disable"
     - role === 'SLAVE' → ghost-danger "Disable" only
     - if isActive === false → "Disable" button label flips to "Enable" (still ghost-mint, since enabling is constructive)

3. Action handlers (in the page component, passed down):
   - onIssueLicense / onRegenerate: POST /auth/users/{id}/license. Loading state on the button. On success: toast.success "License key generated: {key}", refetch user list. On error: toast.error.
   - onToggleStatus: PATCH /auth/users/{id}/toggle-status. On success: toast.success ("User disabled" / "User enabled"), refetch.

4. Replace any alert() calls in the existing admin code with toast.

5. <AdminStubs /> (NEW component) — a single component used when a disabled tab is "clicked". Renders a 3-column row of grayed-out preview cards for Nodes / Audit / Settings:
   - Each panel uses Card with opacity 0.5 and a top-right text-3 italic "disabled" tag.
   - Small lucide icon top-center, h3 "Coming soon", text-2 description specific to that tab:
     - Nodes: "Real-time view of every connected desktop client, their health state, last signal received, and reconnect history."
     - Audit: "Searchable log of every privileged action — license generations, status toggles, profile changes — with operator attribution and timestamps."
     - Settings: "Platform-wide controls: license key prefix, default risk caps, broadcast policies, and CORS origin allowlist."

   For v1, you can render these all together below the user table when the user clicks any disabled tab, or keep them gated by tab state. Easiest: keep tab state, when activeTab !== 'users' render <AdminStubs />.

6. Loading & error states:
   - While fetching the user list: render a skeleton table (8 rows of <Skeleton variant="line"> with appropriate widths)
   - On error: <EmptyState> with retry button

Constraints:
- Backend role enums in payloads remain MASTER / SLAVE / ADMIN. Filter chip values are 'ALL' | 'MASTER' | 'SLAVE' | 'ADMIN'. The DISPLAY uses roleDisplay() to show "Provider" / "Copier" / "Admin".
- License key column NEVER shows the key in plain text — always inside a mono mint-soft Pill.
- Destructive buttons NEVER use filled red — only ghost-danger.
- Search filters by case-insensitive substring match against fullName, email, or licenseKey (when present).

Output: file list, the 5 row variations rendered correctly, confirmation no alert() calls remain in admin flow.
```

### Verification checklist

- [ ] Admin page loads the user list via real API
- [ ] All role badges show relabeled text (PROVIDER, COPIER, ADMIN)
- [ ] License keys render as mint-soft mono chips
- [ ] Super Admin row shows "Protected" instead of action buttons
- [ ] Disabled users render at 0.6 opacity with "Enable" button
- [ ] Filter chips correctly count and filter
- [ ] Search filters by name/email/license
- [ ] Issue Key, Regenerate Key, Disable, Enable all work via real API
- [ ] Toast notifications replace alerts
- [ ] Disabled tabs show coming-soon stubs

---

## PHASE 8 — Errors, modals, polish, gap closure

> One session. Final cleanup and polish.

### What this phase produces

- `src/app/not-found.tsx` (404 page)
- `src/app/error.tsx` (error boundary)
- `src/app/(auth)/layout.tsx` if not present (for split-screen)
- Client-side validation polish on auth forms
- Auth state persistence
- The redesigned `TradeHistoryModal` from Phase 4 wired in
- Final audit

### Files to attach

- `@src/app/layout.tsx`
- `@src/redux/slices/authSlice.ts`
- `@src/redux/slices/store.ts`
- `@src/app/(auth)/login/page.tsx`, `@src/app/(auth)/register/page.tsx`
- `@src/components/master/TradeHistoryModal.tsx`
- `@frontendReadme.md`

### Cursor prompt

```
Phase 8 of the UI overhaul. Final polish: error pages, validation, persistence, audit.

Tasks:

1. src/app/not-found.tsx — NEW
   Simple centered layout, dark token bg.
   - Big mono "404" 64px text-3
   - h1 32px "We couldn't find that page."
   - text-2 max-w-[360px] centered: "The provider, page, or resource you requested doesn't exist or has been removed."
   - Two buttons row: primary "Browse providers →" → /traders + ghost "Back to home" → /

2. src/app/error.tsx — NEW
   Next.js error boundary. Same layout style as 404 but with "Something went wrong" h1, the err.message in mono text-3 small (or a generic message in production), and a "Try again" primary button calling reset(), plus ghost "Back to home".

3. Optional: src/app/global-error.tsx — only if needed for root-level errors. Same pattern.

4. src/app/(auth)/layout.tsx — NEW (or modify existing)
   The layout for /login and /register only. Just renders children inside a min-h-screen flex container with the dark bg. The 50/50 split is implemented IN each page, not the layout — this layout is just bg + min-height.
   If a layout already exists with different content, keep its functional parts (e.g., metadata) and just ensure styling.

5. Persistence (long-overdue from frontendReadme):
   In src/redux/slices/authSlice.ts, add localStorage persistence:
   - On loginSuccess, save user to localStorage as 'tsp_user'
   - On logout, remove 'tsp_user'
   - In an init reducer, hydrate from localStorage
   - In src/app/providers.tsx (or wherever the Redux store is configured), dispatch the hydrate action on mount
   Use the existing patterns — don't introduce redux-persist as a dependency unless it's already there.

6. Auth form validation polish:
   - Email format regex validation
   - Password min length 5 (matches backend's current loose check; bump if backend tightens)
   - Required field check
   - Show inline error on the relevant Input (use the error prop) — not just toast
   - Form's primary Button is disabled when validation fails OR while loading

7. TradeHistoryModal — final polish from Phase 4 design:
   The modal should be wired in:
   - On copier dashboard (subscribed state) — accessible from "View provider profile" → details page tab
   - On marketplace cards — there's no direct "View Trade History" affordance currently; either add a small ghost link inside the TraderCard (in showcase mode) or only expose the modal via the provider detail page.
   Decision: only expose TradeHistoryModal via the Provider Detail page, route's "Trade history" tab. Remove the modal trigger from the dashboard cards.

8. Final visual audit pass:
   - grep the codebase for any remaining `style={{` containing `blue` or `#` blue values — replace per system
   - grep for `alert(` — should be zero matches outside test files
   - Search for non-mono numbers in user-facing components — confirm Pills and percentages all use font-mono-tnum
   - Verify the JetBrains Mono font is loaded (next/font/google config in layout.tsx)
   - Look for any leftover "Master" / "Slave" copy in user-facing strings — convert to "Provider" / "Copier" via roleDisplay()
   - Check that the mobile breakpoint at <lg degrades gracefully (collapsing to single-column on auth pages, hiding right-rail, stacking dashboard KPI strip etc.)

9. Add a `<Toaster />` audit — confirm toast.success/error/info/warning all render correctly with the new dark theme.

Output: a final summary list of files created/modified, all alert() removed, persistence working across hard refresh, 404/error pages live, and a "ship" checklist that goes through every page screenshot from the original frontendReadme to confirm parity.
```

### Verification checklist (final ship)

- [ ] Hard refresh while logged in keeps you logged in
- [ ] Hard refresh on `/dashboard` while logged out redirects to `/login`
- [ ] `/some-bad-url` shows the 404 page
- [ ] Login form validates email format and password length client-side
- [ ] No `alert()` anywhere in `src/`
- [ ] No leftover blue (`#3B82F6`, `bg-blue-`, etc.) in components
- [ ] All user-facing text uses "Provider" / "Copier" via `roleDisplay()`
- [ ] All numbers across the app use JetBrains Mono
- [ ] All 6 main routes load: `/`, `/login`, `/register`, `/traders`, `/traders/[id]`, `/dashboard`, `/admin`
- [ ] All real backend API calls in Network tab match the original endpoints

---

## Cross-cutting Cursor tips

**Use Composer (Cmd/Ctrl+I) for every phase.** Each phase is multi-file. Chat is for one-file iteration after the Composer pass.

**Pin context across messages.** Click the pin icon next to file references so they persist.

**When Cursor "forgets" the system.** If a generated component starts using `bg-blue-500` or `text-gray-400`, paste this back at it: *"You're drifting from the design system. Use only tokens defined in @globals.css — bg-bg, bg-surface, bg-mint, text-text, text-text-2 etc. No Tailwind defaults."*

**When numbers come back in Inter.** *"Every number rendered in this component must use the .font-mono-tnum class or className='a-mono'. Currently {component} renders {value} in Inter. Fix."*

**When Cursor wants to add libraries.** Reject anything not on the approved list (sonner, lucide-react, clsx). The whole point of a token-driven system is you don't need a UI library on top.

**When Cursor proposes radical refactors.** Decline politely: *"Keep the existing logic and Redux paths intact. The redesign is purely visual."* The contract matrix is your defense.

**Commit boundaries.** One commit per phase. If a phase produces too many changes for review, commit by file group within it (primitives, then page, then wiring) but never mix across phases.

---

## Companion document

The `tradesync_gap_inventory.md` file (separate) lists every decorative element across all 6 redesigned pages that currently has no real backend, with the eventual data source if one exists. Consult it when you're ready to wire a specific decorative element to real data — it's not blocking the redesign itself.

---

## What's NOT in this guide (intentional out-of-scope)

- Mobile-first deep redesign — Phase 8 collapses gracefully but a mobile-native treatment is its own design phase.
- The desktop client (Python / PySide6) — pure backend-facing, no UI overhaul applies.
- Backend hardening (JWT, password hashing, DTO validation) — separate workstream tracked in your existing `frontendReadme.md` "next improvements" section.
- The `TradeLog` vs `TradeLogs` table-name drift in backend — also a separate workstream.

If you hit something unexpected during a phase, stop the phase, commit what works, and ask before improvising. Mid-phase improvisation is how design systems drift.

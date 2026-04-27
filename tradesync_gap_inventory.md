# TradeSync Pro — Gap Inventory

Companion to the Cursor Implementation Playbook. For every page in the redesign, this lists which UI elements are **REAL** (wired to backend), **DERIVED** (computed client-side from real data), or **DECORATIVE** (mock data with no backend yet).

The redesign ships with all decoratives in place — they're polished mock content that tells the right product story. Use this doc when you're ready to wire any specific decorative item to real data.

Legend:
- 🟢 **REAL** — wired to existing endpoint
- 🟡 **DERIVED** — computed client-side from real data
- 🔵 **DECORATIVE** — mock; no backend yet (or aspirational)
- ⚠️  **GAP** — needed for full functional parity but currently missing in backend

---

## `/` — Landing page

| Element | Status | Source / TODO |
|---|---|---|
| Sticky nav logo, links, CTAs | 🟢 | All static; routes go to existing pages |
| Hero headline + subhead + CTAs | 🟢 | Static copy |
| Hero status pill `MT5 bridge · sub-second sync` | 🔵 | Marketing copy |
| Hero product preview card — portfolio balance `$48,217.04` | 🔵 | Mock only — public landing has no logged-in user context |
| Hero product preview card — `Today's PnL +$2,184.50 +4.74%` | 🔵 | Mock; aspirational sample value |
| Hero product preview card — equity curve | 🔵 | Synthetic curve from `EquityCurve` component (deterministic noise function) |
| Hero product preview card — 3 trade rows under "MIRRORING · 3 PROVIDERS" | 🔵 | Hardcoded mock TradeRows |
| Hero trust signals (`Regulated · KYC verified` / `Direct MT5 bridge`) | 🔵 | Marketing copy |
| MarketTicker prices (BTC/ETH/EUR-USD/XAU/NQ/SOL/GBP-USD/WTI) | 🔵 | Hardcoded array. ⚠️ GAP: no market-data feed integrated. Eventual fix: subscribe to a public ticker feed (Binance, OANDA) and wire via a small route handler |
| Online status strip — `1,284 traders online` | 🔵 | Mock. ⚠️ GAP: backend has no "currently online users" endpoint. Eventual fix: add `GET /metrics/online` returning a count of socket-connected sessions |
| Online status strip — `247 verified providers` | 🟡 | Could be real — derive from `GET /auth/masters` length. TODO in Phase 3: wire this to a real fetch in a server component |
| Online status strip — `487 trades mirrored today` | 🔵 | Mock. ⚠️ GAP: would require an aggregated count from `TradeLogs` filtered by createdAt today. Eventual fix: add `GET /trades/today/count` |
| HowItWorks 3-card explainer | 🟢 | Static product copy |
| ProviderShowcase 3 cards | 🔵→🟢 | Hardcoded for v1. Phase 3 TODO: replace with `GET /auth/masters?limit=3&sort=top` (the backend doesn't currently sort by ROI — would need to add). For v1, fetch top 3 by `subscriberCount` desc as a proxy |
| LiveTradeFeedCard 5 trade rows | 🔵 | Pure decoration. ⚠️ GAP: no global "live trades stream" endpoint exists; per-master rooms only. Eventual fix: add a public socket room `room_global_recent` that backend emits a redacted version of each trade to (no master_ticket, only symbol/action/qty/anonymous handle) |
| LiveTradeFeedCard `487 trades today` pill | 🔵 | Same as online strip |
| FooterStrip © copyright | 🟢 | Static |

---

## `/login`

| Element | Status | Source / TODO |
|---|---|---|
| Logo, headline, subhead | 🟢 | Static |
| Role tabs (Copier / Provider) | 🔵 | Visual only on login. The user's actual role comes from `/auth/login` response — the tabs are a visual nicety. |
| Continue with Google button | 🔵 | DECORATIVE, disabled. ⚠️ GAP: no OAuth integration on backend. Eventual fix: NextAuth + a Google strategy on backend |
| Email + Password inputs | 🟢 | POST `/auth/login` |
| Forgot? link | 🔵 | DECORATIVE, `href="#"`. ⚠️ GAP: no password-reset flow. Eventual fix: backend `POST /auth/forgot` + `POST /auth/reset` with email tokens |
| Keep me signed in checkbox | 🔵 | DECORATIVE. ⚠️ GAP: no session/cookie tied to this. Eventual fix: extend localStorage persistence (Phase 8) with a session expiry vs always-persist toggle |
| Sign in button | 🟢 | POST `/auth/login` → dispatch loginSuccess → router.push('/dashboard') |
| Footer 2FA / SOC 2 / KYC trust copy | 🔵 | Aspirational compliance. ⚠️ GAP: none of these implemented |
| Right rail — `1,284 traders online` pill | 🔵 | Same mock as landing |
| Right rail — Today's PnL `+$2,184.50` card | 🔵 | Mock for an unauthenticated viewer |
| Right rail — Just executed 3 trade rows | 🔵 | Hardcoded |
| Right rail — testimonial blockquote + Daniel R. avatar | 🔵 | Marketing copy |

---

## `/register`

| Element | Status | Source / TODO |
|---|---|---|
| Role toggle (Provider/Copier) | 🟢 | Controls the role value sent in POST `/auth/register` (`MASTER` / `SLAVE`) |
| Role info card content | 🟢 | Static copy per role |
| Full Name / Email / Password inputs | 🟢 | POST `/auth/register` |
| Submit button | 🟢 | POST `/auth/register` → router.push('/login') |
| Right rail benefit rows | 🟢 | Static product copy |
| Right rail mock TraderCard / mock dashboard preview | 🔵 | Pure visual preview |

---

## `/traders` (marketplace)

| Element | Status | Source / TODO |
|---|---|---|
| Page header (eyebrow, title, subhead) | 🟢 | Static |
| RiskFilter pill counts | 🟡 | Computed client-side from the unfiltered list of profiles |
| TraderCard: name, fullName | 🟢 | `GET /auth/masters` |
| TraderCard: avatar (color from name) | 🟡 | `avatarColorFor(name)` deterministic palette |
| TraderCard: verified mint check | 🔵 | Always shown for any active master. ⚠️ GAP: no real "verified" flag in backend yet. Eventual fix: add `User.isVerified` boolean, set true after KYC review |
| TraderCard: `@handle` | ⚠️ GAP | Backend has no handle field. For v1, derive as `@{email.split('@')[0]}` or hide. Eventual fix: add `User.handle` unique field, prompt during onboarding |
| TraderCard: asset class line `Forex · Gold` | 🟡 | Derive from `profile.instruments` (first 1-2 entries). Hide if empty |
| TraderCard: live status dot | 🟢 | `GET /auth/masters/live` returns array of currently socket-connected master ids |
| TraderCard: risk pill | 🟢 | `profile.riskLevel` |
| TraderCard: mini equity curve | 🔵 | Synthetic — no daily P&L history endpoint exists. ⚠️ GAP: backend stores trade-level P&L only (closedAt, pnl on each trade). Eventual fix: add `GET /trades/master/:id/equity?days=30` returning aggregated daily cumulative P&L |
| TraderCard: 30d ROI value | ⚠️ GAP | No 30-day window calculation in backend. For v1: compute client-side from `GET /trades/master/:id/history` filtered to last 30 days, summed P&L / starting balance. Eventual fix: add `profile.roi30d` server-computed field |
| TraderCard: Win rate | 🟢 | `profile.winRate` |
| TraderCard: Copiers count | 🟢 | `profile.subscriberCount` |
| TraderCard: metadata row (Platform/Hold/Strategy) | 🟢 | `profile.tradingPlatform`, `profile.typicalHoldTime`, `profile.strategyDescription` |
| TraderCard: bio line | 🟢 | `profile.bio` |
| TraderCard: Empty profile state | 🟡 | Detected when `bio === null && tradingPlatform === null && strategyDescription === null` |
| TraderCard: View profile button → /traders/[id] | 🟢 | Routing |
| EmptyState (no providers match) | 🟡 | Computed from filter + search results |

---

## `/traders/[id]` (provider detail — NEW route)

| Element | Status | Source / TODO |
|---|---|---|
| Back link → /traders | 🟢 | Static |
| Hero band — avatar, name, mint check | 🟢 | Avatar derived from name; verified currently always-on (see /traders gap) |
| Hero band — `@handle · Forex · Gold · Joined Jan 2026` | 🟡 | Joined date from `createdAt`. Asset derived from instruments. Handle missing |
| Hero band — pill row (live, risk, verified) | 🟢 | Same sources as marketplace card |
| Hero band — bio paragraph | 🟢 | `profile.bio` |
| Hero band — metadata row (Platform / Hold / Strategy / License) | 🟢 | All from profile + `profile.licenseKey` |
| PerformanceBigCard — 30d ROI big number | ⚠️ GAP | Same as TraderCard. For v1, compute client-side or show "—" |
| PerformanceBigCard — Win rate / Total trades / Avg volume / Total PnL | 🟢 | All from `profile.*` |
| PerformanceBigCard — equity curve | 🔵 | Synthetic. Same gap as TraderCard mini |
| Copy this provider button | 🟢 | PATCH `/auth/users/:slaveId/subscribe` |
| Add to watchlist button | 🔵 | DECORATIVE. ⚠️ GAP: no watchlist feature. Eventual fix: add `User.watchlistIds: string[]` and `PATCH /auth/users/:id/watchlist` |
| Tab bar — Overview tab | 🟢 | Functional |
| Tab bar — Trade history tab | 🟢 | Opens existing `TradeHistoryModal`, fetches `GET /trades/master/:id/history` |
| Tab bar — Stats tab | 🔵 | Coming soon stub |
| Tab bar — Reviews tab | 🔵 | DECORATIVE. ⚠️ GAP: no review/rating system. Eventual fix: separate `Reviews` table with rating + comment + reviewerId |
| Recent signals table — last 10 trades | 🟢 | `GET /trades/master/:id/history` sliced to 10 |
| Cumulative P&L (90 days) chart | 🔵 | Existing PnLChart component reused — currently uses synthetic data. ⚠️ GAP: same as equity curve |
| Risk profile card — drawdown / avg trades-day / streak / sharpest gain | 🔵 | All mock. ⚠️ GAP: backend doesn't compute these. Eventual fix: server-side calculation in `getMasterProfile` extending the existing computed fields |
| Instruments card — pills | 🟢 | `profile.instruments` split by comma |
| Trading hours card | 🔵 | Hardcoded `London + NY overlap (12:00–17:00 GMT)`. ⚠️ GAP: no trading-hours field. Eventual fix: add `profile.tradingHours` text or structured |

---

## `/dashboard` — Copier view

| Element | Status | Source / TODO |
|---|---|---|
| Page header eyebrow / title / subhead | 🟢 | Static |
| StatusPill (LISTENING / NOT SUBSCRIBED / DISCONNECTED) | 🟡 | Derived from socket connection state + user.subscribedToId. ⚠️ Note: socket-disconnect detection requires Phase 5 to attach a listener to the socket disconnect event |
| KPI strip — Active Provider name | 🟢 | Fetched from `GET /auth/masters/:subscribedToId/profile` |
| KPI strip — Latency `< 20 ms` | 🔵 | Mock with "synthetic estimate" subtext. ⚠️ GAP: no real latency measurement. Eventual fix: backend emits a periodic ping with server timestamp, frontend computes round-trip and exposes via socket event |
| KPI strip — Risk Multiplier "Managed by app" | 🟢 | Static copy — risk is genuinely set in the desktop client, not the web app |
| Active subscription card — provider info | 🟢 | From the active master's profile |
| Active subscription card — "Subscribed {time ago}" | ⚠️ GAP | No `subscribedAt` field in user. For v1: render just "Subscribed" or "Active subscription". Eventual fix: add `User.subscribedAt: Date \| null` updated alongside `subscribedToId` |
| Active subscription card — 4-stat row | mixed | Provider's 30d ROI 🔵 (gap) · Today's signals 🟡 (count from tradeSlice filtered to today) · Your session P&L 🟡 (sum from tradeSlice) · Mirrored trades 🟡 (count from tradeSlice) |
| Marketplace section TraderCards | 🟢 | Same as /traders |
| Marketplace card "Subscribe" action | 🟢 | PATCH subscribe endpoint |
| IncomingSignalsTable — rows | 🟢 | From tradeSlice fed by Socket.IO `trade_execution` events |
| IncomingSignalsTable — `n today` pill | 🟡 | Computed from tradeSlice filtered to today |
| IncomingSignalsTable — IGNORED status (Symbol unmapped) | ⚠️ GAP | Backend doesn't emit this. ⚠️ Required for full UX. Eventual fix: when desktop client receives a signal it can't map, emit `signal_ignored` event with reason. Until then, this status is unused but the design accommodates it |
| IncomingSignalsTable — FAILED status (Insufficient margin) | ⚠️ GAP | Same — desktop client should emit `trade_failed` event with reason. Until then unused |
| Empty-state hero "Pick a provider" | 🟢 | Visual when `subscribedToId === null` |

---

## `/dashboard` — Provider view

| Element | Status | Source / TODO |
|---|---|---|
| Page header | 🟢 | Static |
| StatusPill BROADCASTING / IDLE | 🟡 | For v1, "broadcasting" if `subscriberCount > 0 \|\| recentTrades has any from today`, else "idle". ⚠️ GAP: no real socket-presence flag for masters in current backend. Eventual fix: backend tracks master desktop client connections and exposes via `GET /auth/masters/:id/presence` or an `isBroadcasting` flag on the dashboard endpoint |
| LicenseKeyBlock — value | 🟢 | `user.licenseKey` |
| LicenseKeyBlock — Copy button | 🟢 | navigator.clipboard.writeText |
| ProviderKpiStrip — Total Signals Sent | 🟢 | `dashboard.totalSignalsSent` |
| ProviderKpiStrip — Connected Copiers count | 🟢 | `dashboard.subscriberCount` |
| ProviderKpiStrip — Connected Copiers "currently live" sub-count | ⚠️ GAP | No "live copier" count. Eventual fix: backend tracks copier socket-connected status, exposes count |
| ProviderKpiStrip — Open Trades | 🟢 | `dashboard.openTradesCount` |
| ProviderKpiStrip — Win Rate | 🟢 | `dashboard.profile.winRate` |
| MyPerformanceCard — Total P&L / Avg Volume / Closed Trades | 🟢 | All from profile |
| RecentSignalHistory — 10 rows | 🟢 | `dashboard.recentTrades` |
| PublicProfilePreview — embedded TraderCard | 🟢 | Renders the provider's own profile |
| Profile Setup — bio textarea | 🟢 | PATCH `/auth/masters/:id/profile` field `bio` |
| Profile Setup — Broker/Platform | 🟢 | field `tradingPlatform` |
| Profile Setup — Typical Trade Duration | 🟢 | field `typicalHoldTime`, dropdown values 'Seconds' \| 'Minutes' \| 'Hours' \| 'Days' \| 'Weeks' |
| Profile Setup — Instruments | 🟢 | field `instruments`, comma-separated string |
| Profile Setup — Trading Strategy | 🟢 | field `strategyDescription` |
| Profile Setup — Risk Level pills | 🟢 | field `riskLevel` enum 'LOW' \| 'MEDIUM' \| 'HIGH' |
| Save Profile button | 🟢 | PATCH endpoint with diff payload |
| Empty state — "Start broadcasting" hero | 🟢 | Visual when `totalSignalsSent === 0` |
| Empty state — "Download desktop client" CTA | 🔵 | Currently links to placeholder `/downloads`. ⚠️ GAP: no downloads page exists yet. Eventual fix: add `/downloads` page with platform-specific binaries / installer instructions |

---

## `/admin`

| Element | Status | Source / TODO |
|---|---|---|
| Page header — Total Users / Active Today / Disabled | 🟡 | Computed client-side from user list. "Active Today" requires a `User.lastSeenAt` field which doesn't exist. ⚠️ GAP: for v1, compute "Active Today" from users with `isActive === true` (technically not "today" semantics but close); add TODO. Eventual fix: backend tracks `lastSeenAt` from auth/socket activity, expose via the user list |
| User filter chip counts | 🟡 | Computed from list |
| Search input | 🟡 | Client-side substring match |
| User row — name + email | 🟢 | `GET /auth/users` |
| User row — RoleBadge | 🟢 | `user.role` mapped via `roleDisplay()` |
| User row — License Key column | 🟢 | `user.licenseKey` |
| User row — Status column | 🟢 | `user.isActive` |
| Issue Key / Regenerate Key | 🟢 | POST `/auth/users/:id/license` |
| Disable / Enable | 🟢 | PATCH `/auth/users/:id/toggle-status` |
| Admin row — "Protected" no-action | 🟢 | Backend blocks toggle for ADMIN, frontend reflects |
| Nodes / Audit / Settings tab stubs | 🔵 | All coming-soon. Each is a real future feature: backend instrumentation needed |

---

## States & Overlays

| Element | Status | Source / TODO |
|---|---|---|
| TradeHistoryModal — open/close | 🟢 | Existing modal, redesigned shell |
| TradeHistoryModal — date filter (All/7d/30d/90d) | 🟡 | Client-side filter on `createdAt` |
| TradeHistoryModal — status dropdown | 🟡 | Client-side filter |
| TradeHistoryModal — aggregate footer | 🟡 | Computed from filtered set |
| Toast notifications | 🟢 | sonner replaces every alert() |
| Skeleton loading variants | 🟢 | Shown during all useEffect fetches |
| 404 page | 🟢 | Built in Phase 8 |
| Error boundary | 🟢 | Next.js `error.tsx` |
| 401 unauthorized | 🟡 | Custom rendering when API returns 401 — currently not gracefully handled. ⚠️ GAP: add an axios/fetch interceptor that redirects to /login on 401 |
| Form validation states (default/error/success) | 🟢 | Client-side regex + required checks |

---

## Backend gaps that should eventually be addressed

Ranked by user-visible impact:

1. **Master `isBroadcasting` flag** — drives the StatusPill on Provider Dashboard accurately. Currently faked via signal-count heuristics.
2. **`User.lastSeenAt`** — drives the admin "Active Today" count and could power a "last seen" line on TraderCards.
3. **`User.handle`** — the design uses `@sasha_fx`-style handles everywhere. Currently faked from email prefix. Adding this requires onboarding flow extension.
4. **`profile.roi30d`** — server-computed. Currently has to be calculated client-side from full trade history per master, which is a lot of data on the marketplace page.
5. **Equity curve daily-aggregation endpoint** — `GET /trades/master/:id/equity?days=N`. Currently every equity curve in the app is synthetic.
6. **`signal_ignored` and `trade_failed` socket events** from desktop client — would unlock the IGNORED/FAILED status rendering on the Copier dashboard's IncomingSignalsTable.
7. **Subscribe timestamp `User.subscribedAt`** — drives the "Subscribed 2 hours ago" line on the active subscription card.
8. **OAuth (Google) + password reset + 2FA** — auth-side compliance / convenience. Visual hooks already in place.
9. **Reviews/ratings system** — for the Reviews tab on Provider Detail page.
10. **Public global trade feed** — for the live trade feed on landing. Privacy-redacted.
11. **Watchlist** — `User.watchlistIds[]` and corresponding endpoints.
12. **Trading hours field on profile** — for the Trading Hours card on Provider Detail.

---

## How to use this doc during the build

When you finish a phase and want to start swapping decoratives for real data:

1. Find the page's section above
2. Look for items marked 🔵 or ⚠️
3. If marked ⚠️ GAP — that's a backend change before the frontend can be wired. File a backend issue first.
4. If marked 🔵 only — the frontend can be wired as soon as you decide the source. Many of these are decorative and **probably should stay decorative** until the product justifies the data work (e.g., do you really need a real "online traders" count, or is the mock pill sufficient marketing color?).

Don't try to make every 🔵 real. Many of them are intentionally aspirational and look better as polished mocks than as bare numbers. Consult product priorities, not engineering instinct.

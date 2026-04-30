# TradeSync Pro Desktop · Backend Gap Inventory

Every design feature classified by backend readiness.
Use this to decide what gets built in Phase 3.x vs what's already live.

---

## Category A — Already supported, no work needed

These features work today. The backend already returns the data; you just need to wire the new UI to the existing endpoints.

| Feature | UI Location | Data Source | Notes |
|---|---|---|---|
| License key display | Master BROADCAST view → License Key card | `verify-node` response | Mask as `TSP-XXXX-····` in UI |
| MT5 account info (balance, server, type) | Both BROADCAST view Account card | `MT5Adapter.get_account_info()` or `mt5.account_info()` | Read locally from MT5; no backend call |
| Subscribers list with totalCopied + totalPnL | Master SUBSCRIBERS view | `GET /auth/masters/:masterId/subscribers` | Already implemented |
| Subscriber online/offline status | SUBSCRIBERS view status dot | `subscriber_update` socket event | Update dot color on event |
| Core performance stats | Master PERFORMANCE view KPI grid | `GET /auth/masters/:id/profile` → totalTrades, closedTrades, winRate, totalPnL, avgVolume, subscriberCount | Already implemented in Phase 6 |
| Recent broadcasts table | Master PERFORMANCE view | `GET /auth/masters/:id/dashboard` → recentTrades | Already implemented |
| Live signals feed (event log) | Slave EventLog | `trade_execution` socket event | Already implemented |
| Session tracking (timer, counts, P&L) | Slave TRADES view + KPI strip | Local AppState | Already implemented |

---

## Category B — Optional fields in API contract, backend computation needed (no schema change)

The contract matrix already declares these as **nullable** in `/auth/masters/:id/profile`. The response just returns `null` today. Backend needs to compute and populate them.

| Feature | UI Location | Field Name | SQL Work Needed | Effort |
|---|---|---|---|---|
| Risk metrics | Master PERFORMANCE → analytics card | `riskMetrics: { maxDrawdownPercent, avgTradesPerDay, longestLosingStreakTrades, bestDayPnl }` | Aggregations over last 2000 CLOSED TradeLogs rows | **Low** — SQL window functions |
| Active hours histogram | Master PERFORMANCE → histogram card | `activeHoursSummary: number[]` (24 elements, UTC) | `GROUP BY DATEPART(HOUR, closedAt)` → normalize to 0–max | **Low** — single GROUP BY |
| Equity sparkline | Master PERFORMANCE → sparkline card | `equitySparkline: number[]` (~50 downsampled points) | Running SUM(pnl) ORDER BY closedAt, then downsample | **Medium** — running sum + downsampling logic |

**Implementation note:** All three are computed in `getMasterProfile()` in `auth.service.ts`. The computation cap is the last 2000 CLOSED rows per master (already documented in SYSTEM_CONTRACT_MATRIX.md). UI handles null gracefully — analytics cards are hidden if null.

---

## Category C — Net-new functionality (new endpoints or schema changes)

| Feature | UI Location | What's Needed | Decision |
|---|---|---|---|
| Subscriber Revoke | Master SUBSCRIBERS → × button | Reuse existing `PATCH /auth/users/:id/toggle-status`. Add `MasterController.revoke_subscriber()` client method. Needs master to send auth token. | **Keep** — minimal work, reuses existing endpoint |
| License Key Rotation | Master BROADCAST → License Key card | `POST /auth/users/:id/rotate-license` new endpoint. New `generateLicense()` call, overwrites existing key. | **Dropped** per your decision |
| Per-signal ack tracking | KPI strip "5 acked", SUBSCRIBERS "X/Y acked" | New `SignalAcks` table or `TradeLogs.ackCount` field. Socket event `signal_ack` from slave to backend. | **Defer** — significant scope |
| License tier + seats | Master event log ("tier: Master · seats: 5") | `User.tier` + `User.seats` DB columns. License issuance logic update. | **Defer** — static display for now, hardcode "Master" |

---

## Category D — Pure client-local (no backend needed)

| Feature | UI Location | Implementation |
|---|---|---|
| Latency display (ms) | Slave HeaderStrip + COPY view | Client-side: timestamp `trade_execution` receive vs emit delta. Wire to HeaderStrip `latency` param. |
| Session timer (elapsed HH:MM:SS) | Slave TRADES view + COPY view | `QTimer` ticking every second from `start_session()`. Already partially in AppState. |
| Session signal count | Slave KPI strip | `AppState.signals_received` counter, incremented in `on_trade_signal()` |
| RECONNECTING blinking state | Slave/Master HeaderStrip pill | `SocketManager` health callbacks → `QTimer` 500ms toggle on pill text |

---

## Phase 3 Build Order (recommended)

1. **Phase 3.1** — `riskMetrics` + `activeHoursSummary` (cheap, high value for PERFORMANCE view)
2. **Phase 3.2** — `equitySparkline` (slightly more complex, but the sparkline widget is already built)
3. **Phase 3.3** — Subscriber revoke wiring (reuses existing endpoint, 1–2 hours)
4. **Latency display** — client-only, can be done in Phase 1.2b alongside COPY view

## Things explicitly dropped (your decision)
- License key rotation → dropped
- Per-signal ack tracking → deferred
- License tier/seats → deferred (static text acceptable for now)

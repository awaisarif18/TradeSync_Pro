# TradeSync Pro · Phase 3 Backend — Implementation Guide

> **Reference hierarchy for every Cursor prompt:**
> `backendReadme.md` + `SYSTEM_CONTRACT_MATRIX.md` → authoritative contracts.
> Never alter socket event names, room naming, or verify-node semantics.

---

## Your Questions Answered First

### Q: What is JWT actually doing in your project?

Right now the JWT guard protects a small set of admin-only routes:
- `GET /auth/users` — list all users
- `POST /auth/users/:id/license` — generate a license key
- `PATCH /auth/users/:id/toggle-status` — enable/disable a user
- `PATCH /auth/users/:id/subscribe` — subscribe a slave to a master
- `PATCH /auth/masters/:id/profile` — update master profile
- `GET /auth/masters/:id/dashboard` — master dashboard data

When you log in on the frontend (`POST /auth/login`), the backend returns `access_token`. The frontend stores this token in Redux and in a cookie (`tsp_access_token`). Every time the frontend calls one of the above routes, it attaches `Authorization: Bearer <token>` in the request header. The backend's `JwtAuthGuard` verifies the token signature before letting the request through.

**What changed vs before JWT?** The routes above were previously either public or unguarded. Now they require a valid token. In your day-to-day workflow (login → dashboard → admin) you probably don't notice the difference because the frontend handles attaching the token automatically. If you ever got a 401 on admin actions after a long idle session, that would be the expired token kicking in.

**Your OTP and forgot-password plans:** Those are additive. OTP during login would add a verification step before the token is issued. Forgot password would add a separate flow to reset credentials. Neither breaks the JWT structure already in place.

**Your chatbot RAG:** It would likely call your backend REST endpoints. Depending on which endpoints it needs, it may or may not need a token. Public endpoints (marketplace, profile, trade history) need no token. If it needs to act on behalf of a user, you would issue it a token during a setup phase.

---

### Q: Your preferred approach for desktop client authorization (no JWT for desktop apps)

Your instinct is correct and cleaner than the alternative. The plan:

- Keep `POST /auth/verify-node` exactly as it is (public, license key / email based). Desktop apps call this on startup as they do today.
- Add a new dedicated endpoint `POST /auth/node-action` (or similar) for privileged desktop actions (currently: subscriber revoke). This endpoint authenticates via **license key + role** from the request body — no JWT needed.
- This keeps the desktop apps completely decoupled from the JWT system. The JWT system remains exclusively a web frontend concern.

---

## The Three Backend Gaps

| Gap | What it is | Complexity |
|---|---|---|
| **A** | Analytics engine — compute `riskMetrics`, `equitySparkline`, `activeHoursSummary` from TradeLogs | Medium |
| **B** | Desktop node action auth — allow Master desktop to revoke a subscriber without JWT | Low |
| **C** | (Additive) Make `GET /auth/masters/:id/profile` return real analytics data | Trivial once A is done |

---

## Phase 3 Prompt Sequence

```
Phase 3.1 → master-analytics.util.ts (the SQL engine)
Phase 3.2 → auth.service.ts (wire analytics into getMasterProfile)
Phase 3.3 → auth.controller.ts + auth.service.ts (node-action endpoint for revoke)
Phase 3.4 → README and matrix updates
```

---

---

# PHASE 3.1 — Analytics Utility

## Context
`master-analytics.util.ts` already exists in `src/auth/`. It currently returns null/empty for all analytics fields. We need to implement the four computation functions inside it using raw SQL against the `TradeLogs` table.

---

## Prompt 3.1

**Files to attach in Cursor:**
- `src/auth/master-analytics.util.ts`
- `src/database/tradelog.entity.ts`
- `backendReadme.md` (§§ 5, 12, 13 are the relevant sections)

**Paste this prompt into Cursor:**

```
# Phase 3.1 · Analytics Utility

## Reference hierarchy
1. `backendReadme.md` §§ 5 (database layer), 12, 13 — authoritative. Do not break existing entity structure.
2. `tradelog.entity.ts` — the TypeORM entity. Table name is `TradeLogs`. Columns: id, masterId, slaveId, masterName, symbol, action, volume, ticketNumber, pnl (float|null), status ('OPEN'|'CLOSED'), createdAt, closedAt (Date|null).

## Scope
Implement four helper functions inside `src/auth/master-analytics.util.ts`.
All four operate on a pre-fetched array of TradeLog rows (already filtered to last 2000 CLOSED rows for a specific masterId). The parent service does the DB fetch; these are pure computation functions.

## Files to modify
- MODIFY: `src/auth/master-analytics.util.ts` — implement the four functions below

## Files to NOT touch
- `auth.service.ts` (will be touched in Phase 3.2, not this phase)
- `auth.controller.ts`
- `auth.module.ts`
- `trade.gateway.ts`
- `tradelog.entity.ts`
- `user.entity.ts`
- Any frontend or client files

## Function 1: computeRiskMetrics(trades: TradeLog[])
Input: array of CLOSED TradeLog rows, sorted oldest-first by closedAt.
Returns: { maxDrawdownPercent: number, avgTradesPerDay: number, longestLosingStreakTrades: number, bestDayPnl: number } | null

Implementation:
- If trades.length === 0, return null.
- maxDrawdownPercent: build running cumulative PnL array. Track peak. At each point, compute (peak - current) / Math.abs(peak) * 100 if peak > 0, else 0. Return the maximum of all these values, rounded to 2 decimal places.
- avgTradesPerDay: compute the number of calendar days between the earliest and latest closedAt in the array (minimum 1 day). Divide trades.length by that day count. Round to 2.
- longestLosingStreakTrades: iterate through trades sorted by closedAt. Count consecutive rows where pnl < 0 (treat null pnl as 0). Track the max streak seen.
- bestDayPnl: group trades by UTC date string (closedAt.toISOString().slice(0,10)). Sum pnl for each date. Return the maximum group sum, rounded to 2.

## Function 2: computeEquitySparkline(trades: TradeLog[])
Input: same CLOSED array, sorted oldest-first.
Returns: number[] | null

Implementation:
- If trades.length < 2, return null.
- Build a full cumulative PnL array: start at 0, add each trade's pnl (treat null as 0).
- Downsample to at most 50 points using evenly-spaced index sampling:
  - If cumulative array length <= 50, return it as-is.
  - Else: pick indices: for i from 0 to 49, pick index = Math.round(i * (length - 1) / 49).
- Round each point to 2 decimal places.

## Function 3: computeActiveHours(trades: TradeLog[])
Input: same CLOSED array.
Returns: number[] (always 24 elements, one per UTC hour) | null

Implementation:
- If trades.length === 0, return null.
- Create an array of 24 zeros.
- For each trade, read closedAt (or createdAt as fallback). Get getUTCHours(). Increment that bucket.
- Return the 24-element array.

## Function 4: buildAnalytics(trades: TradeLog[])
A convenience wrapper that calls all three and returns { riskMetrics, equitySparkline, activeHoursSummary } or null if trades is empty.

## TypeScript requirements
- Import TradeLog from `../database/tradelog.entity` (check the exact import path used in the existing file and match it).
- Export all four functions.
- Use strict null checks. If pnl is null, treat it as 0 in all calculations.
- Do NOT use any external libraries. Only native JS/TS math and Date methods.
- Do NOT add any NestJS decorators, @Injectable, or DI. These are plain utility functions.

## Acceptance (manual — I will verify, do not run tests)
- `npm run build` completes without TypeScript errors.
- Functions are exported and importable in auth.service.ts.
- No changes to any other file.
```

---

### Manual Testing for Phase 3.1

You cannot test utility functions directly from the frontend. Verification at this phase is build-only:

1. In the `trade-sync-backend` directory, run:
   ```
   npm run build
   ```
2. Confirm zero TypeScript errors.
3. The functions will be tested implicitly when Phase 3.2 wires them into the profile endpoint.

---

---

# PHASE 3.2 — Wire Analytics into getMasterProfile

## Context
`auth.service.ts` already has `getMasterProfile()`. It currently queries TradeLogs but returns `riskMetrics: null`, `equitySparkline: null`, `activeHoursSummary: null`. We need to fetch the last 2000 CLOSED rows and call our new utility functions.

---

## Prompt 3.2

**Files to attach in Cursor:**
- `src/auth/auth.service.ts`
- `src/auth/master-analytics.util.ts`
- `src/database/tradelog.entity.ts`
- `SYSTEM_CONTRACT_MATRIX.md` (§§ 3.1 profile endpoint row, for response shape reference)

**Paste this prompt into Cursor:**

```
# Phase 3.2 · Wire Analytics into getMasterProfile

## Reference hierarchy
1. `SYSTEM_CONTRACT_MATRIX.md` § 3.1 row for GET /auth/masters/:id/profile — authoritative for response shape.
2. `auth.service.ts` existing getMasterProfile() — modify only the analytics section inside it.
3. `master-analytics.util.ts` — the utility functions built in Phase 3.1. Import and call them.

## Scope
Inside `auth.service.ts`, update `getMasterProfile(masterId)` to:
1. Query TradeLogs for the last 2000 CLOSED rows for this master, sorted newest-first by COALESCE(closedAt, createdAt).
2. Reverse the array to oldest-first before passing to analytics functions (the utility expects oldest-first).
3. Call `buildAnalytics(closedTrades)` from master-analytics.util.ts.
4. Include the result in the returned profile object as `riskMetrics`, `equitySparkline`, `activeHoursSummary`.
5. If buildAnalytics returns null (no trades), these fields are omitted or null in the response — that is acceptable.

## Files to modify
- MODIFY: `src/auth/auth.service.ts` — only inside getMasterProfile() method

## Files to NOT touch
- `auth.controller.ts`
- `auth.module.ts`
- `trade.gateway.ts`
- `tradelog.entity.ts`
- `user.entity.ts`
- `master-analytics.util.ts` (read-only in this phase)

## Implementation detail — the TradeLogs query
The service currently uses either TypeORM repository or raw DataSource queries. Match whichever approach getMasterProfile() already uses for its existing TradeLogs query. Do not switch from one approach to the other.

The query needs:
- Filter: masterId = :masterId AND status = 'CLOSED'
- Sort: COALESCE(closedAt, createdAt) DESC
- Limit: 2000 rows

Example if using TypeORM repository (adjust to match existing style):
```typescript
const closedTrades = await this.tradeLogRepository.find({
  where: { masterId, status: 'CLOSED' },
  order: { closedAt: 'DESC' },
  take: 2000,
});
closedTrades.reverse(); // now oldest-first for the utility
```

If closedAt column can be null, handle the sort with COALESCE in a raw query approach if the TypeORM approach doesn't support it cleanly.

## Response shape addition
The existing return object gains three fields:
```typescript
{
  // ... all existing fields unchanged ...
  riskMetrics: analytics?.riskMetrics ?? null,
  equitySparkline: analytics?.equitySparkline ?? null,
  activeHoursSummary: analytics?.activeHoursSummary ?? null,
}
```

## Acceptance (manual — I will verify, do not run tests)
- `npm run build` — no TypeScript errors.
- No other methods in auth.service.ts are touched.
```

---

### Manual Testing for Phase 3.2

Test through the frontend:

1. Start the backend: `npm run start:dev`
2. Log in on the frontend as a Slave user.
3. Go to the Traders marketplace and click on a Master who has trade history.
4. Open the browser DevTools → Network tab → filter for `profile`.
5. You should see a request to `GET /auth/masters/:id/profile`.
6. In the response JSON, check for the three new fields:
   - If the master has CLOSED trades in the DB: `riskMetrics` should be an object, `equitySparkline` should be an array of numbers, `activeHoursSummary` should be an array of 24 integers.
   - If the master has no CLOSED trades: all three should be `null`.
7. The existing fields (`totalTrades`, `winRate`, `totalPnL`, etc.) should be unchanged.

**Also test the Python Master desktop app:**
- The Master PERFORMANCE view calls `fetch_master_profile()` which hits this same endpoint. After the backend update, the analytics cards in the PERFORMANCE tab should populate instead of being hidden.

---

---

# PHASE 3.3 — Desktop Node Action Endpoint (Subscriber Revoke)

## Context
The Master desktop app's `SubscribersView` has a Revoke button. It needs to disable a subscriber (set `isActive = false` on their User record). The existing `PATCH /auth/users/:id/toggle-status` endpoint does exactly this, but it is protected by `JwtAuthGuard` — desktop apps don't have a JWT.

Your preferred solution: a new endpoint `POST /auth/node-action/revoke-subscriber` that authenticates the master via their license key (same pattern as `verify-node`). No JWT involved.

---

## Prompt 3.3

**Files to attach in Cursor:**
- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.module.ts`
- `src/database/user.entity.ts`
- `backendReadme.md` (§§ 6, 13)
- `SYSTEM_CONTRACT_MATRIX.md` (§ 2, § 8 non-negotiable rules)

**Paste this prompt into Cursor:**

```
# Phase 3.3 · Desktop Node Action Endpoint

## Reference hierarchy
1. `backendReadme.md` § 13 safe extension rules — authoritative. Prefer additive changes.
2. `SYSTEM_CONTRACT_MATRIX.md` § 2 identity contract — MASTER is identified by licenseKey.
3. `auth.controller.ts` + `auth.service.ts` — existing patterns. Match the code style exactly.

## Scope
Add a new public endpoint `POST /auth/node-action/revoke-subscriber` that:
1. Accepts body: `{ masterLicenseKey: string, slaveId: string }`
2. Finds the master user by licenseKey. If not found or not isActive: throws 401.
3. Verifies the slave (by slaveId) is actually subscribed to this master (Users.subscribedToId === master.id). If not: throws 403.
4. Sets slave.isActive = false and saves.
5. Returns: `{ message: 'Subscriber revoked', slaveId }`

This endpoint must be marked @Public() so it does NOT require a JWT. It authenticates exclusively via the master's licenseKey.

## Files to modify
- MODIFY: `src/auth/auth.service.ts` — add `revokeSubscriber(masterLicenseKey, slaveId)` method
- MODIFY: `src/auth/auth.controller.ts` — add the new route, mark @Public()

## Files to NOT touch
- `auth.module.ts` (no new providers needed — User repository is already registered)
- `trade.gateway.ts`
- `tradelog.entity.ts`
- Any existing route handler (do not modify toggleStatus, verifyNode, or any other existing method)
- Frontend files
- Client Python files

## Implementation in auth.service.ts — revokeSubscriber method
```typescript
async revokeSubscriber(masterLicenseKey: string, slaveId: string) {
  // 1. Find master by licenseKey
  const master = await this.userRepository.findOne({
    where: { licenseKey: masterLicenseKey, role: 'MASTER' },
  });
  if (!master || !master.isActive) {
    throw new UnauthorizedException('Invalid or inactive master license');
  }

  // 2. Find slave and verify they are subscribed to this master
  const slave = await this.userRepository.findOne({
    where: { id: slaveId },
  });
  if (!slave || slave.subscribedToId !== master.id) {
    throw new ForbiddenException('Slave is not subscribed to this master');
  }

  // 3. Revoke
  slave.isActive = false;
  await this.userRepository.save(slave);
  return { message: 'Subscriber revoked', slaveId };
}
```

## Implementation in auth.controller.ts — new route
Add after the existing verifyNode route (keep the same import and decorator style):
```typescript
@Public()
@Post('node-action/revoke-subscriber')
async revokeSubscriber(@Body() body: { masterLicenseKey: string; slaveId: string }) {
  return this.authService.revokeSubscriber(body.masterLicenseKey, body.slaveId);
}
```

## TypeScript requirements
- Import UnauthorizedException and ForbiddenException from @nestjs/common if not already imported.
- Do not add class-validator decorators (consistent with existing codebase style).
- Keep types consistent with existing service methods (return plain objects, no DTOs needed).

## Acceptance (manual — I will verify, do not run tests)
- `npm run build` — no TypeScript errors.
- No existing routes are modified.
- The new route is listed in the controller below the verify-node handler.
```

---

### Manual Testing for Phase 3.3

This endpoint is called by the Python desktop app, not the frontend. To test it without the desktop app running, you can use the browser fetch console or any HTTP client:

**Option A — Browser console test (while frontend is open):**
```javascript
fetch('http://localhost:3000/auth/node-action/revoke-subscriber', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    masterLicenseKey: 'TSP-XXXX-XXXX',  // replace with a real license key from admin panel
    slaveId: 'paste-a-real-slave-uuid-here'  // from admin panel user list
  })
}).then(r => r.json()).then(console.log)
```

**What to verify:**
1. With a valid license key and a slave that IS subscribed → response `{ message: 'Subscriber revoked', slaveId: '...' }`, HTTP 200/201.
2. With a wrong license key → HTTP 401.
3. With a valid key but a slave who is NOT subscribed to that master → HTTP 403.
4. After a successful revoke: go to the admin panel → the slave's status should show as disabled.

**To get real test values:**
- Open admin panel in your frontend → copy a master's license key.
- From the same panel, find a slave user subscribed to that master and copy their ID from the URL or from the user table.

---

---

# PHASE 3.4 — README and Matrix Updates

## Prompt 3.4

**Files to attach in Cursor:**
- `backendReadme.md`
- `SYSTEM_CONTRACT_MATRIX.md`

**Paste this prompt into Cursor:**

```
# Phase 3.4 · Documentation Sync

## Scope
Update documentation to reflect Phase 3 additions. Code changes only in documentation files.

## Files to modify
- MODIFY: `backendReadme.md`
- MODIFY: `SYSTEM_CONTRACT_MATRIX.md`

## Files to NOT touch
- Any .ts source files
- Any frontend or client files

## Changes to backendReadme.md
1. In § 9 (HTTP Routes), add to the Auth section:
   `POST /auth/node-action/revoke-subscriber`

2. In § 2 (File Structure), add to the auth/ section:
   `master-analytics.util.ts` now has a note: "Implements computeRiskMetrics, computeEquitySparkline, computeActiveHours, buildAnalytics — called from getMasterProfile"

3. Add a new Phase 3 note under § 6 (Phase notes) or at the top of the relevant section:
   "Phase 3: Analytics engine implemented. GET /auth/masters/:id/profile now returns live riskMetrics, equitySparkline, and activeHoursSummary when closed trades exist. New public endpoint POST /auth/node-action/revoke-subscriber added for desktop master clients — authenticates via license key, no JWT required."

## Changes to SYSTEM_CONTRACT_MATRIX.md
1. In § 3.1 table: add a new row for the revoke endpoint:
   | /auth/node-action/revoke-subscriber | POST | AuthController.revokeSubscriber | Python MasterController (SubscribersView revoke button) | { masterLicenseKey: string, slaveId: string } | { message, slaveId } | **Public.** Desktop-auth via license key. Sets slave.isActive=false. No JWT. |

2. In the GET /auth/masters/:id/profile row: update the Notes column to confirm that riskMetrics, equitySparkline, and activeHoursSummary are now implemented (remove any "stub/null" language if present).

3. Update "Current Delivery Scope" to include Phase 3 analytics + revoke endpoint as implemented.
```

---

### Manual Testing for Phase 3.4

No runtime testing needed — this is documentation only. Verify by reading the updated files and confirming the new route and analytics description appear correctly.

---

---

# PHASE 3.5 — Client Wiring: MasterController revoke method

## Context
The backend revoke endpoint exists. Now wire the Python desktop client to call it when the Revoke button is pressed in `SubscribersView`.

---

## Prompt 3.5

**Files to attach in Cursor:**
- `controllers/ui_controllers/master_controller.py`
- `views/qt/views/subscribers_view.py`
- `clientReadme.md` (§§ 8, 12A — HTTP contracts)

**Paste this prompt into Cursor:**

```
# Phase 3.5 · Client Revoke Wiring

## Reference hierarchy
1. `clientReadme.md` § 12A — HTTP contract. Backend base URL is http://localhost:3000.
2. `master_controller.py` — existing controller patterns. Match the requests.post() style already used in login_mt5().

## Scope
Add a revoke_subscriber method to MasterController and wire it to the SubscribersView revoke button.

## Files to modify
- MODIFY: `controllers/ui_controllers/master_controller.py` — add revoke_subscriber method
- MODIFY: `views/qt/views/subscribers_view.py` — connect revoke button signal to controller

## Files to NOT touch
- `models/` (any)
- `master_recorder.py`
- `socket_manager.py`
- `mt5_adapter.py`
- `slave_controller.py`
- Any other view files

## In master_controller.py — add revoke_subscriber method

Add after the existing fetch_subscribers method:

```python
def revoke_subscriber(self, slave_id: str):
    """
    Calls POST /auth/node-action/revoke-subscriber with the master's license key.
    Updates UI log on success or failure.
    """
    license_key = self.state.license_key  # the key stored at login time
    if not license_key:
        self.state.add_log('[REVOKE] No license key stored. Login again.')
        self._emit_ui_update()
        return

    try:
        resp = requests.post(
            'http://localhost:3000/auth/node-action/revoke-subscriber',
            json={'masterLicenseKey': license_key, 'slaveId': slave_id},
            timeout=10,
        )
        if resp.status_code in (200, 201):
            self.state.add_log(f'[REVOKE] Subscriber {slave_id[:8]}... revoked.')
        else:
            self.state.add_log(f'[REVOKE] Failed: {resp.status_code} {resp.text}')
    except Exception as e:
        self.state.add_log(f'[REVOKE] Error: {e}')

    self._emit_ui_update()
    # Refresh the subscribers list after revoke
    self.fetch_subscribers()
```

Note: Check what field stores the license key in AppState/MasterState and use the correct attribute name. Look for how it is set during login_mt5 in master_controller.py. If stored as self.state.license_key or self.state.master_license, use whichever exists.

## In subscribers_view.py — wire the revoke button

The revoke button's clicked signal currently has no connection. Find where the revoke GhostIconBtn (or equivalent) is created in the table rows. Connect its clicked signal:

```python
revoke_btn.clicked.connect(lambda _, sid=slave_id: self._controller.revoke_subscriber(sid))
```

Where `slave_id` is the subscriber's id value from the row data (the UUID string). Make sure the variable is captured by value with the default argument lambda pattern (as shown), not by reference.

## Acceptance (manual — I will verify, do not run tests)
- `python main_master.py` launches without import errors.
- No controller logic (recording, broadcasting) is changed.
- Only revoke_subscriber method added to master_controller.py.
- Only button signal connection changed in subscribers_view.py.
```

---

### Manual Testing for Phase 3.5

1. Start backend: `npm run start:dev`
2. Launch master desktop app: `python main_master.py`
3. Log in with valid license key and MT5 credentials.
4. Navigate to the SUBSCRIBERS tab.
5. If a subscriber is shown, click their Revoke (×) button.
6. **Expected:** Event log shows `[REVOKE] Subscriber abc123... revoked.` and the subscriber list refreshes.
7. Open the frontend admin panel and verify the revoked subscriber's status is now disabled.
8. If no subscribers are in the list, add a slave subscription via the frontend first (Traders page → subscribe).

---

---

# Summary Table

| Phase | File(s) changed | What it does | How to test |
|---|---|---|---|
| 3.1 | `master-analytics.util.ts` | Pure analytics computation functions | `npm run build` — zero errors |
| 3.2 | `auth.service.ts` | Profile endpoint returns real analytics | Frontend → Traders page → click a master → DevTools Network → profile response |
| 3.3 | `auth.service.ts`, `auth.controller.ts` | New revoke endpoint, license-key auth | Browser fetch console test (see instructions above) |
| 3.4 | `backendReadme.md`, `SYSTEM_CONTRACT_MATRIX.md` | Documentation sync | Read the files |
| 3.5 | `master_controller.py`, `subscribers_view.py` | Desktop revoke button wired | Master app → Subscribers tab → Revoke → check admin panel |

---

# Notes for Future Phases (OTP / Forgot Password / RAG Chatbot)

**OTP login:** Add a `POST /auth/request-otp` and `POST /auth/verify-otp` endpoint pair. The `POST /auth/login` flow would return a partial token or a session ID, then OTP verification completes it. No changes to existing JWT structure needed.

**Forgot password:** Add `POST /auth/forgot-password` (sends reset email) and `POST /auth/reset-password` (validates reset token, updates hash). These are additive — no existing endpoints change.

**RAG chatbot:** If your friend's chatbot needs to call backend data (trade history, master profiles), point it at the existing public endpoints. They need no token. If it needs user-specific data, issue it a JWT via a dedicated service account.

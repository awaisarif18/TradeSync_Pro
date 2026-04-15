# TradeSync Pro Next Steps Roadmap

This document captures recommended post-migration priorities after the Python desktop client UI migration from CustomTkinter to PySide6.

The goal is to stabilize the system first, then scale safely with stronger risk controls, observability, and product capabilities.

---

## Implementation Status (April 2026)

Phase 1 only has been implemented. Phases 2 to 9 remain intentionally deferred.

Completed in Phase 1:
1. Minimal contract tests for critical flows
2. Structured logging with trace IDs across backend and Python client paths
3. Reconnect and health-state handling in client socket flow with backend disconnect visibility

Manual smoke test outcome:
- Passed: signal propagation before and after backend restart
- Passed: reconnect + re-registration behavior for both master and slave socket clients
- Passed: second post-reconnect signal reached slave with new trace_id

What to expect in manual testing now:
1. First signal should be received normally with trace_id
2. On backend restart, clients disconnect then reconnect automatically
3. After reconnect, register_node is re-emitted automatically
4. New signal after reconnect should be delivered without changing event names or required payload keys

---

## 1) Immediate Priority: Stabilization

1. Add end-to-end contract tests for critical flows.
2. Introduce structured logging with trace IDs across master, backend, and slave.
3. Implement reconnect and health-state handling across client and backend.

Critical flows to cover in tests:
- Node verification
- Node socket registration
- Master OPEN and CLOSE signal propagation
- Slave OPEN and CLOSE execution

---

## 2) High-Value Product Features

1. Risk guardrails
- Max lot cap
- Max concurrent copied trades
- Daily loss stop
- Symbol whitelist and blacklist
- Pause copy on spread or slippage threshold

2. Copy modes
- Exact copy mode
- Equity-ratio proportional mode
- Fixed lot mode
- Per-symbol risk multiplier mode

3. Signal replay and audit
- Store normalized signals and execution outcomes
- Replay in paper mode
- Show reason codes when not executed

4. Broker execution intelligence
- Fill latency tracking
- Reject-rate tracking
- Slippage tracking
- Broker-specific execution profile

---

## 3) Backend Feature Track

1. Multi-tenant readiness with organization scoped routing.
2. Idempotency keys for signals to prevent duplicate processing.
3. Retry and dead-letter handling for repeated execution failures.
4. Admin observability endpoints for sessions, room state, and pipeline stats.

---

## 4) Frontend Feature Track

1. Real-time operations dashboard
- Signal throughput
- Active listener counts
- Success and failure rates
- Top error reasons

2. Subscription UX hardening
- Dry-run check before subscription
- Symbol mapping compatibility hints

3. Incident panel
- Live warning stream from backend and client logs

4. Audit explorer
- Filter by master, symbol, event type, outcome, and time window

---

## 5) Python Client Feature Track

1. Profile management for multiple MT5 and node setups.
2. Persistent local settings for risk and symbol mappings.
3. Telemetry buffering when backend is temporarily unavailable.
4. Graceful shutdown for recorder thread, socket, and MT5 cleanup.

---

## 6) Delivery Approach

1. Contract-first development
- Treat SYSTEM_CONTRACT_MATRIX.md as canonical.
- Any payload, event, role, or identity change requires synchronized updates across all layers.

2. Vertical-slice implementation
- Deliver each feature across client, backend, frontend, tests, and docs in one pull request.

3. Release train discipline
- Use recurring releases with smoke tests, compatibility checks, and rollback notes.

4. SLO-driven engineering
- Define and monitor targets for latency, success rate, reconnect recovery, and duplicate prevention.

5. Environment progression
- Development environment
- Staging environment with paper-trading simulation
- Production environment

---

## 7) 30 / 60 / 90 Day Plan

30-day focus:
1. Contract tests
2. Structured logs
3. Reconnect behavior
4. Core risk caps

60-day focus:
1. Operations dashboard
2. Signal replay and audit
3. Idempotency and reason codes

90-day focus:
1. Advanced copy modes
2. Multi-tenant hardening
3. Performance and SLO tuning

---

## 8) Suggested Backlog Format

For each feature, capture:
1. Scope and objective
2. Contract impact
3. Client changes
4. Backend changes
5. Frontend changes
6. Test plan
7. Rollback plan
8. Owner and estimated effort

---

## 9) Execution Principle

Stability before expansion.

Any feature that changes trade execution behavior should be gated behind explicit testing, observability, and contract verification before release.

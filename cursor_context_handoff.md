# TradeSync Pro — Cursor Context Handoff

## Completed Phases
- Phase 1-5: Core system, sockets, auth, stabilization
- Phase 6: Master profiles + trading history (web frontend)
- Phase 7: Slave risk management + Bloomberg UI (Python desktop)
- Phase 8: Master subscriber view (Python desktop + backend)

## Current State (April 26 2026)
All features working and tested. Minor UI polish remaining.

## Key Files Modified Recently
- trade-sync-client/views/qt/master_window.py (3-tab Bloomberg UI)
- trade-sync-client/views/qt/subscribers_panel.py (NEW)
- trade-sync-client/controllers/ui_controllers/master_controller.py
- trade-sync-client/models/app_state.py
- trade-sync-backend/src/auth/auth.service.ts
- trade-sync-backend/src/auth/auth.controller.ts
- trade-sync-backend/src/trade/trade.gateway.ts

## Known Issues (Not Bugs, Just Notes)
1. master_user_id resolved by fullName match from /auth/masters — fragile if duplicate names
2. totalCopied/totalPnL per subscriber is master-level aggregate, not per-slave (no slaveId in TradeLogs)
3. Recent Signals TIME column truncated — column too narrow
4. Subscribers STATUS column crowded — needs column width rebalancing
5. Stat cards in Performance tab too tall — too much internal padding

## Bloomberg Theme Constants
Background: #0a0a0a, Surface: #1a1a1a, Border: #2a2a2a
Accent/Positive: #00d4aa, Negative/Error: #ff4444, Warning: #ffaa00
Text primary: #c8c8c8, Text muted: #666666, Text dim: #444444
Font numbers: Consolas, Font labels: Segoe UI 9pt
# TradeSync Pro - Advanced Copy Trading Infrastructure

## 📖 Project Overview
TradeSync Pro is a high-performance, real-time copy trading ecosystem built for MetaTrader 5 (MT5). It allows "Master" traders to broadcast their live trades to a central cloud server, which instantly routes those signals to multiple connected "Slave" (Copier) accounts. Slaves can apply custom risk multipliers and dynamic symbol mapping.

## ✅ Current Delivery Status (April 2026)

Current work is intentionally locked to Phase 1 stabilization only.

Implemented:
1. Minimal contract tests for critical backend/client flows
2. Structured trace_id logging across master, backend, and slave paths
3. Client reconnect and health-state behavior with auto re-registration

Phase 7.1: Slave UI Overhaul + Advanced Copy Features (COMPLETED)
1. Bloomberg Terminal-inspired minimal dark theme across all slave panels
2. 4-tab layout: COPY / SYMBOLS / RISK / TRADES
3. Fixed Lot copy mode alongside existing Multiplier mode
4. Reverse Copy: auto-flips BUY/SELL direction
5. Slippage control: configurable deviation points passed to MT5 orders
6. Equity Protection: account equity floor guard before each OPEN
7. Dual broker symbol preset: Master broker + Your broker → auto-fills table
8. Unmapped symbol behavior: configurable (ignore vs copy-as-is)
9. TradesPanel: live open positions table + session history table
10. Session tracking: session PnL, elapsed time, trade count
11. Connection status indicator with live dot

Deferred:
1. High-Value Product Features
2. Backend/Frontend/Python feature-track expansions
3. Broader roadmap work beyond Phase 1

Manual smoke test summary (socket simulation with real master/slave identities):
1. Signal delivered before backend restart
2. Clients disconnected and reconnected after backend restart
3. Post-reconnect signal delivered successfully
4. Trace IDs present and changed per signal lifecycle

The system is distributed across three distinct environments:
1. **Frontend (Web Dashboard):** A Next.js web application for user authentication, registration, and real-time monitoring of trades.
2. **Backend (Cloud Brain):** A NestJS server utilizing WebSockets (Socket.io) for ultra-low latency signal routing, and SQL Server for user management.
3. **Client (Desktop Node):** A Python-based desktop application (using PySide6) that runs on the user's machine to interface directly with the MT5 Terminal via the official `MetaTrader5` API.

---

## 🏗️ System Architecture & Logic

### 1. The Master Node Logic (Python)
* **Role:** Signal Provider.
* **Authentication:** Users log in dynamically by providing their MT5 Account ID, Password, Broker Path, and exact Server String (e.g., `VantageInternational-Demo`).
* **Workflow:** The Master Python script (`master_recorder.py`) runs a background thread that continuously monitors active positions in the MT5 terminal using `mt5.positions_get()`.
* **Identification:** It ignores trades placed by the system itself by checking the `magic` number. It tracks trades using a local dictionary mapped to MT5 `ticket` numbers.
* **Execution:** * When a *new* ticket appears, it broadcasts an `OPEN` event (with Symbol, Action, Volume, and Master Ticket) to the NestJS socket.
    * When a *tracked* ticket disappears from the active positions list, it broadcasts a `CLOSE` event.

### 2. The Cloud Brain Logic (NestJS)
* **Role:** The Router & Authenticator.
* **Workflow:** Receives WebSocket events from the Master Node (`test_signal`). It instantly broadcasts that exact payload to all connected listeners via the `trade_execution` event.
* **Auth:** Handles JWT/Session generation and validates user roles (`MASTER`, `SLAVE`, `ADMIN`) against an MSSQL Database using TypeORM. Cross-Origin Resource Sharing (CORS) is explicitly enabled to allow Next.js communication.

### 3. The Slave Node Logic (Python)
* **Role:** The Copier.
* **Authentication:** Matches Master's dynamic login architecture, attaching to specific terminal paths based on user input.
* **Workflow:** Listens to the `trade_execution` WebSocket event.
* **Symbol Mapping:** Before execution, checks the local `symbol_map`. If a map exists (e.g., `GOLD` -> `XAUUSD`), it translates the master's symbol to the local symbol. Unmapped symbols are either ignored or passed through as-is, configurable via `unmapped_symbol_behavior`. Dual broker preset loading allows cross-referencing master broker and slave broker symbol naming conventions.
* **Copy Modes:** Two volume calculation modes — MULTIPLIER (master volume × multiplier) and FIXED_LOT (fixed lot regardless of master volume). Both enforce minimum lot 0.01 and optional max lot cap.
* **Reverse Copy:** Optionally flips BUY→SELL and SELL→BUY before execution.
* **Risk Guards:** Five-guard chain runs before each OPEN: equity floor check, daily loss pause, concurrent trade cap, symbol whitelist, and lot size clamping.
* **Ticket Mapping (Crucial):** When a trade opens, the Slave records the Master's Ticket Number and maps it to the newly generated Slave MT5 Ticket Number. When a `CLOSE` signal arrives for the Master Ticket, the Slave looks up the corresponding Slave Ticket and executes a close request (incorporating `type_time` and `type_filling` policies).
* **Session Tracking:** Tracks open/closed trades per listening session with PnL accumulation. TradesPanel displays live positions and session history.

---

## 💻 Tech Stack & Dependencies

### Frontend (`trade-sync-frontend`)
* **Framework:** Next.js (App Router paradigm)
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **State Management:** Redux Toolkit (`authSlice.ts`)
* **Networking:** Axios (REST API), Socket.io-client (Real-time feed)
* **Key Packages:** `react`, `react-dom`, `socket.io-client`, `axios`, `@reduxjs/toolkit`

### Backend (`trade-sync-backend`)
* **Framework:** NestJS
* **Database:** SQL Server (MSSQL) via TypeORM (`typeorm`, `@nestjs/typeorm`)
* **WebSockets:** `@nestjs/websockets`, `@nestjs/platform-socket.io`
* **Key Modules:** `AuthModule`, `DatabaseModule`, `TradeModule`

### Desktop Client (`trade-sync-client`)
* **Language:** Python 3.9+
* **Broker API:** `MetaTrader5`
* **Networking:** `python-socketio[client]`
* **GUI:** `PySide6`
* **Threading:** Standard Python `threading` for non-blocking UI.

---

## 🚀 Current Project Progress
* **Phase 1: Core Trade Execution & Sockets (COMPLETED)**
    * MT5 Adapter built. "Double Open" bug resolved using direct dictionary mapping.
* **Phase 2: UI & Desktop App (COMPLETED)**
    * Next.js Dashboards built. Python CLI replaced with PySide6 GUI.
* **Phase 3: Database & Auth Integration (COMPLETED)**
    * NestJS connected to MSSQL. Next.js forms successfully register and login users based on actual DB records. Admin account manually injected.
* **Phase 3.5: Client Customization & Stability (COMPLETED)**
    * Implemented dynamic MT5 login (ID, Password, Server) replacing hardcoded attachments.
    * Added Symbol Mapping and Risk Multipliers to the Slave UI.
    * Fixed MT5 Order Close failures by restoring `ORDER_TIME_GTC` and `ORDER_FILLING_IOC`.
* **Phase 4: Admin Controls & License Management (COMPLETED)**
    * Next.js `/admin` dashboard built with a persistent layout and `AdminSidebar`.
    * Backend API implemented to fetch all users, generate unique `TSP-XXXX-XXXX` License Keys for Masters, and toggle `isActive` status.
    * **The Kill Switch:** Python Desktop Clients now execute a pre-flight `requests.post` to `/auth/verify-node`. They strictly enforce DB rules: blocking login if the account is disabled or if the identifier (License Key/Email) is invalid.
* **Phase 1 Stabilization (COMPLETED - April 2026)**
    * Minimal contract tests for authentication, socket registration, and trade signal flows
    * Structured trace_id logging across backend and client layers
    * Reconnect behavior with auto re-registration on socket reconnect
    * Manual smoke test validation with backend restart simulation
* **Phase 6: Master Profile & Trading History (COMPLETED - April 2026)**
    * Backend: Added `GET /auth/masters/:id/profile` returning aggregate master stats (totalTrades, winRate, totalPnL, avgVolume)
    * Backend: Added `GET /trades/master/:masterId/history` returning last 50 trades per master
    * Frontend: Created `MasterProfileCard` component with profile stats grid and embedded PnL chart
    * Frontend: Created `TradeHistoryModal` component displaying last 50 trades in table format
    * Frontend: Created `PnLChart` component using recharts for cumulative profit/loss visualization
    * Frontend: Refactored `SlaveDashboard` from plain list to profile card grid with integrated profile modal
    * Contract Matrix: Added 2 new HTTP routes to authentication and trade sections
    * All dependencies installed (recharts ^3.8.1)
* **Phase 7: Master Identity + Dashboard Completion (COMPLETED - April 2026)**
    * Added 6 new nullable master profile fields to the User entity: bio, tradingPlatform, instruments, strategyDescription, riskLevel, typicalHoldTime
    * Backend: Added master profile update endpoint plus master dashboard and top-traders endpoints
    * Frontend: Added MasterProfileSetup form for self-service trading identity setup
    * Frontend: Rebuilt MasterDashboard with overview and profile setup tabs, recent trades, and profile preview
    * Frontend: Added public TopTradersSection on the landing page and enriched marketplace cards with profile identity data
    * Contract Matrix and backend/frontend READMEs updated for all Phase 7 routes and fields
* **Phase 8: Slave Risk Management + Symbol Map Enhancement (COMPLETED - April 2026)**
    * 4 risk guards in on_trade_signal(): loss pause, concurrent cap, whitelist, lot cap
    * Colorama-colored terminal logging for all risk events
    * RiskPanel QWidget (views/qt/risk_panel.py): daily PnL tracker, auto-pause
    * SymbolMapPanel QWidget (views/qt/symbol_map_panel.py): table view with broker presets
    * Broker preset mappings for Vantage, XM, Exness, IC Markets, Pepperstone
    * Slave dashboard now has 3 tabs: Copy Settings, Symbol Map, Risk Management
* **Phase 8.1: Master Subscriber View (COMPLETED)**
    * GET /auth/masters/:masterId/subscribers endpoint with trade summary
    * subscriber_update WebSocket event when slave connects/disconnects
    * master_window.py rebuilt: 3-tab Bloomberg layout (BROADCAST/SUBSCRIBERS/PERFORMANCE)
    * SubscribersPanel: real-time subscriber table with LIVE/OFFLINE status
    * Performance tab: master's own aggregate stats from Phase 6 profile endpoint
    * Session tracking: signals sent count, session elapsed time
* **Phase 8.3: Architecture Hardening (COMPLETED)**
    * verify-node response now returns id for direct master_user_id resolution
    * TradeLogs.slaveId column added — per-subscriber P&L now tracked correctly
    * AppState split into BaseState + MasterState + SlaveState using composition
    * Backend DTOs added for type safety on all Phase 6-8 endpoints
    * Socket registration acknowledgement: node_registered event confirms room join
* **Phase 9: Web UI Overhaul (IN PROGRESS)**
    * Complete redesign of Next.js web frontend
    * New design system: Inter + JetBrains Mono, mint-green accent
    * Landing page with live market ticker, hero chart, trader showcase
    * Dedicated /traders page replacing landing page top-traders section
    * Master detail page with full profile and trade history
    * Admin panel streamlined: sidebar removed, single-page layout
    * Master license keys shown on master's own dashboard
    * LIVE badge based on real socket connection, not isActive flag

---

## 🗄️ Database Schema (TypeORM)
**Table: `Users`**
| Column | Type | Constraints/Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Auto-gen | Unique identifier |
| `email` | String | Unique | Login email |
| `password` | String | Plain (Requires bcrypt) | Login password |
| `fullName` | String | Not Null | User's display name |
| `role` | Enum | Default: 'SLAVE' | 'MASTER', 'SLAVE', 'ADMIN' |
| `licenseKey`| String | Nullable | Required for Masters |
| `isActive` | Boolean| Default: true | Used for admin kill-switch |
| `createdAt` | Date | Auto-gen | Registration timestamp |

---

## 🌐 API Routes & Socket Events

### REST API (NestJS - `localhost:3000`)
* `POST /auth/register`: Expects `{ email, password, fullName, role, licenseKey? }`. Returns User object.
* `POST /auth/login`: Expects `{ email, password }`. Returns User object.
* `POST /auth/verify-node`: Expects `{ role, identifier, trace_id? }`. Used by Python clients for pre-MT5 auth.
* `GET /auth/users`: Returns array of all users (Admin only).
* `POST /auth/users/:id/license`: Generates a random License Key for a Master.
* `PATCH /auth/users/:id/toggle-status`: Flips the `isActive` boolean for the Kill Switch.

### WebSockets (`localhost:3000`)
* **Client Emits:** `test_signal` (Payload: `{ event: 'OPEN'|'CLOSE', symbol, action, volume, master_ticket }`)
* **Server Broadcasts:** `trade_execution` (Room-routed fanout to subscribed listeners, preserving required payload keys).

---

## 📂 Exact File Structure

```text
TRADESYNC_PRO/
├── trade-sync-backend/
│   ├── src/
│   │   ├── auth/                 # AuthController, AuthService, AuthModule
│   │   ├── database/             # DatabaseModule, user.entity.ts
│   │   ├── trade/                # TradeController, TradeGateway (Sockets), TradeModule
│   │   ├── app.module.ts         # Root module (autoLoadEntities: true)
│   │   └── main.ts               # Entry point (CORS enabled for port 3001)
│   └── package.json
│
├── trade-sync-frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/            # page.tsx, AdminSidebar.tsx
│   │   │   ├── dashboard/        # page.tsx (Role router)
│   │   │   ├── login/            # page.tsx
│   │   │   ├── register/         # page.tsx
│   │   │   ├── layout.tsx        # ReduxProvider wrapper
│   │   │   └── globals.css       # Tailwind directives
│   │   ├── components/
│   │   │   ├── auth/             # LoginForm.tsx, RegisterMasterForm.tsx, RegisterSlaveForm.tsx
│   │   │   ├── common/           # Button.tsx, Input.tsx, Card.tsx
│   │   │   └── dashboard/        # MasterDashboard.tsx, SlaveDashboard.tsx, LiveTradeTable.tsx
│   │   ├── redux/
│   │   │   ├── slices/authSlice.ts
│   │   │   └── store.ts
│   │   └── services/
│   │       └── api.ts            # Axios instances
│   └── package.json
│
└── trade-sync-client/            # Python Desktop App
    ├── controllers/
    │   ├── ui_controllers/
    │   │   ├── master_controller.py # Bridges master_ui and MT5 logic
    │   │   └── slave_controller.py  # Bridges slave_ui and MT5 logic
    │   ├── mt5_adapter.py           # Core MetaTrader5 integration functions
    │   └── socket_manager.py        # Socket.io connection class
    ├── models/
    │   ├── __init__.py              # Exposes classes
    │   ├── app_state.py             # Shared state for GUI updates (logs, connection status)
    │   └── trade_signal.py          # Data structure for trades
    ├── views/
    │   └── qt/
    │       ├── master_window.py     # PySide6 interface for Broadcaster
    │       └── slave_window.py      # PySide6 interface for Copier
    ├── main_master.py               # Entry point for Master Node
    ├── main_slave.py                # Entry point for Slave Node
    └── master_recorder.py           # Background thread logic for tracking MT5 positions

```
---

## 📚 Comprehensive Method Reference

### Python Desktop Client (`trade-sync-client`)

**1. `MT5Adapter` (`controllers/mt5_adapter.py`)**
* `__init__()`: Stores connection state and hardcoded broker terminal paths to prevent MT5 instance confusion.
* `connect(broker_name, login, password, server)`: Launches the specific MT5 terminal and explicitly logs in using the exact server string.
* `execute_trade(symbol, action, volume)`: Sends an `ORDER_TYPE_BUY` or `SELL` request to MT5 using `symbol_info_tick` for pricing.
* `close_trade(ticket, symbol)`: Looks up an active position by ticket, calculates the reverse action, and sends a close request with strict filling policies.

**2. `SlaveController` (`controllers/ui_controllers/slave_controller.py`)**
* `login_mt5(...)`: The dual-auth gateway. 
    1. First, uses `requests.post` to hit `/auth/verify-node`. It passes the License Key (Master) or Registered Email (Slave). If the backend returns `401 Unauthorized` (due to invalid key or `isActive=false`), it blocks access entirely.
    2. If verified, it passes the MT5 credentials to `MT5Adapter.connect()`.
* `connect_cloud()`: Initializes `SocketManager` and binds the `trade_execution` listener.
* `toggle_listening()`: Flips the `is_running` state to allow or block incoming socket trades.
* `add_symbol_mapping(master_sym, slave_sym)` / `remove_mapping()`: Manages the dynamic translation dictionary.
* `on_trade_signal(data)`: The core execution loop. Filters symbols, applies risk math, routes OPEN requests to the adapter, and handles CLOSE requests by looking up the local ticket in `ticket_map`.

**3. `MasterController` (`controllers/ui_controllers/master_controller.py`)**
* `login_mt5(...)`: Authenticates the signal provider.
* `toggle_broadcasting()`: Initializes and starts the `MasterRecorder` thread.
* `_run_recorder()`: Background wrapper to prevent UI freezing while monitoring MT5.

**4. UIs (`views/master_ui.py` & `views/slave_ui.py`)**
* `show_login()`: Renders the dynamic credential input frame.
* `on_login_submit()`: Captures inputs, triggers controller login, updates UI state (success/fail).
* `show_dashboard()` / `build_dashboard()`: Destroys login frame and builds the main operational console (Logs, Risk Sliders, Mappings).
* `update_ui()`: Thread-safe log box updater utilizing `AppState` arrays.

**5. `MasterRecorder` (`master_recorder.py`)**
* `start_monitoring()`: A continuous `while` loop running in a daemon thread. Uses set logic (`current_tickets - known_tickets`) to detect opens and (`known_tickets - current_tickets`) to detect closes. Emits `test_signal` via Socket.io.

### NestJS Backend (`trade-sync-backend`)

**1. `AuthService` & `AuthController` (`src/auth/`)**
* `register()` / `login()`: Standard DB authentication.
* `verifyNode(role, identifier)`: The desktop-to-cloud security layer. Validates the License Key or Email and strictly checks `if (!user.isActive) throw UnauthorizedException`.
* `getAllUsers()`: Retrieves the user list for the admin table.
* `generateLicense(userId)`: Creates a `TSP-XXXX-XXXX` string and saves it to a Master user.
* `toggleUserStatus(userId)`: Inverts the `isActive` boolean (The Kill Switch).

**2. `TradeGateway` (`src/trade/trade.gateway.ts`)**
* `handleTestSignal(client, payload)`: `@SubscribeMessage('test_signal')`. Receives raw JSON from the Master Python Node and uses `this.server.emit('trade_execution', payload)` to broadcast it globally.

### NextJS Frontend (`trade-sync-frontend`)

**1. `authService` (`src/services/api.ts`)**
* `login(email, password)`: Axios POST to `/auth/login`.
* `register(userData)`: Axios POST to `/auth/register`.

**2. Auth Forms (`src/components/auth/`)**
* `handleSubmit(e: React.FormEvent<HTMLFormElement>)`: Awaits `authService`, dispatches user object to Redux (`loginSuccess`), and pushes router to `/dashboard`. Handles standard 400/401 API errors gracefully.
  
**3. `adminService` (`src/services/api.ts`)**
* `getUsers()`, `generateLicense()`, `toggleUserStatus()`: Axios wrappers pointing to the NestJS `/auth/users/...` endpoints.

**4. Admin Dashboard (`src/app/admin/`)**
* `layout.tsx`: Wraps the admin pages, ensuring the `AdminSidebar` component is persistently rendered alongside the `children`.
* `page.tsx`: The main system administration table. Maps through users, displays role badges, and handles the UI state for generating keys and disabling users.

---

## 🔎 Current-State Corrections (Feb 2026)

The sections above are preserved for project history. The following items reflect the **current implementation** and override older wording where they differ.

1. **Backend auth model:** Current backend does **not** use JWT/session guards yet; login is basic email/password validation and node verification is handled by `/auth/verify-node`.
2. **Socket fanout model:** Backend now uses **room-based routing** (per master) via `register_node` and `room_master_<id>` rather than unrestricted global broadcast behavior.
3. **Frontend source of truth:** The production-grade frontend details (routing/state/contracts) are maintained in `trade-sync-frontend/frontendReadme.md`.
4. **Client source of truth:** The Python desktop details are maintained in `trade-sync-client/clientReadme.md`; `main.py` is legacy/stale and `main_master.py` + `main_slave.py` are active GUI entry points.
5. **Verify-node status handling:** Client-side status handling is currently not fully symmetric (Master is stricter than Slave), documented in `trade-sync-client/clientReadme.md` and matrix file.

---

## 🧭 Documentation Flow (Human + AI)

When onboarding a new engineer or AI model (e.g., Gemini 3 Pro), use this order:

1. `README.md` (this file) — high-level system context and project history.
2. `SYSTEM_CONTRACT_MATRIX.md` — canonical cross-layer REST/socket/identity contracts.
3. `trade-sync-backend/backendReadme.md` — backend architecture, routes, services, and DB behavior.
4. `trade-sync-frontend/frontendReadme.md` — frontend routing, Redux state, service calls, and UI boundaries.
5. `trade-sync-client/clientReadme.md` — Python master/slave runtime, MT5 logic, and socket lifecycle.

Recommended rule for all contributors:

- If a contract changes (API path/schema, socket event/payload, role identity, room routing), update `SYSTEM_CONTRACT_MATRIX.md` first, then synchronize all layer-specific READMEs.

---

## 📌 Canonical Contract Pointer

Cross-project integration source of truth:

- `SYSTEM_CONTRACT_MATRIX.md`

This file exists to prevent context loss during AI-assisted coding and to reduce breakage during feature additions and UI revamp phases.

---
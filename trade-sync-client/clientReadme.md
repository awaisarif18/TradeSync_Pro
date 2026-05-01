# TradeSync Pro Client — Deep Technical Documentation

This document is the authoritative engineering guide for `trade-sync-client` (Python desktop node).  
It is written so humans and AI coding models can extend the client safely without breaking backend/frontend interoperability.

---

## Scope Lock (Current Phase)

Current implementation scope includes Phase 1 stabilization and implemented Phase 2 desktop UI refactor milestones.

Client work allowed in this phase:
1. Critical-flow contract stabilization (MASTER/SLAVE verify + socket registration + OPEN/CLOSE handling)
2. Structured logging with trace IDs across master and slave paths
3. Reconnect and health-state handling for practical runtime resilience

Client work deferred for later phases:
1. Multi-profile MT5/node management at scale
2. Persistent local settings for advanced preferences
3. Telemetry buffering platform features beyond current delivery
4. Full graceful-shutdown hardening expansion beyond immediate recorder/socket safety

Lightweight testing policy for this project stage:
- Keep automated tests focused on core execution logic with mocks
- Prefer a small reliable suite over extensive coverage
- Ensure no contract drift from SYSTEM_CONTRACT_MATRIX.md

Implemented in Phase 1 and Phase 2 client scope:
1. `SocketManager` reconnect/backoff configuration with health callbacks
2. Auto `register_node` on every connect/reconnect
3. Duplicate listener protection via `register_handler`
4. Trace-aware logs and `trace_id` propagation in master/slave paths
5. Shared state includes `health_state` in `models/app_state.py`
6. Minimal client tests in `tests/test_slave_controller.py` for OPEN/CLOSE ticket-map behavior
7. Master shell refactor delivered: frameless `TitleBar` + `WindowShell(role='master')` with injected `BroadcastView`, `SubscribersView`, and `PerformanceView`
8. Master `EventLog` filters are role-aware (`ALL`, `SIGNAL`, `SESSION`, `MT5`, `ERR`), while slave keeps copy-centric filters
9. `PerformanceView` now aggregates recent raw signals by `master_ticket`, so OPEN/CLOSE lifecycle updates one row with final closed P&L

Manual smoke expectation (client side):
1. Clients move through `CONNECTED`, `RECONNECTING`, `DISCONNECTED` transitions in logs
2. After backend restart, both master and slave reconnect automatically
3. First post-reconnect signal is executed/received without manual socket restart

---

## 1) Project Identity

- **Project:** `trade-sync-client`
- **Language:** Python
- **UI Framework:** PySide6
- **Broker Bridge:** MetaTrader 5 (`MetaTrader5` package)
- **Realtime Transport:** Socket.IO client (`python-socketio[client]`)
- **Cloud Verification:** HTTP `requests` to backend
- **Terminal Logging:** `colorama` for colored CLI output

Primary responsibilities:

1. Run Master/Slave desktop terminals
2. Authenticate node identity with cloud (`/auth/verify-node`)
3. Connect to MT5 terminal and execute trading actions
4. Handle realtime socket communication with NestJS backend
5. Broadcast master events (`OPEN`/`CLOSE`) and consume copied events on slave
6. Provide operator UI for risk multiplier and symbol mapping

---

## 2) Full File Structure and Responsibility Map

```text
trade-sync-client/
├─ clientReadme.md                          # This document
├─ requirements.txt                         # Python dependency list
├─ main_master.py                           # Master GUI entrypoint
├─ main_slave.py                            # Slave GUI entrypoint
├─ main.py                                  # Legacy CLI slave flow (stale)
├─ master_recorder.py                       # Master trade monitor + broadcaster
├─ controllers/
│  ├─ __init__.py                           # Empty package marker
│  ├─ mt5_adapter.py                        # MT5 login/order/close adapter
│  ├─ socket_manager.py                     # Socket client wrapper
│  └─ ui_controllers/
│     ├─ master_controller.py               # Master orchestration logic
│     └─ slave_controller.py                # Slave orchestration logic
├─ data/
│  ├─ __init__.py                           # Package marker
│  └─ broker_symbols.py                     # Broker preset symbol name mappings
├─ models/
│  ├─ __init__.py                           # Re-export model classes
│  ├─ app_state.py                          # Composed AppState facade
│  ├─ base_state.py                         # Shared fields (logs, health, connection)
│  ├─ master_state.py                       # Master-only fields and methods
│  ├─ slave_state.py                        # Slave-only fields and methods
│  └─ trade_signal.py                       # Lightweight trade DTO helper
├─ views/
│  ├─ qt/
│  │  ├─ theme.py                           # Design tokens, fonts, global QSS builder
│  │  ├─ primitives.py                       # Styled atoms and molecules (cards, inputs, chips)
│  │  ├─ custom_widgets.py                   # Custom paint: PulseDot, sparkline, histogram, sweep
│  │  ├─ shell.py                            # TitleBar, Sidebar, KPI/header strips, FooterStrip, EventLog (role-aware filters), WindowShell
│  │  ├─ master_window.py                   # PySide6 Master desktop UI
│  │  ├─ slave_window.py                    # PySide6 Slave desktop UI (WindowShell scaffold)
│  │  ├─ views/                             # Shell tab bodies (replacing placeholders)
│  │  │  ├─ __init__.py                    # Package marker
│  │  │  ├─ copy_view.py                   # COPY tab: master summary, settings, listen control
│  │  │  ├─ symbols_view.py                 # SYMBOLS tab: presets, map table, unmapped behavior
│  │  │  ├─ risk_view.py                   # RISK tab: guards, daily status, whitelist chips
│  │  │  ├─ trades_view.py                 # TRADES tab: session summary, open + history tables
│  │  │  ├─ broadcast_view.py               # Master BROADCAST tab: toggle, license, account
│  │  │  ├─ subscribers_view.py            # Master SUBSCRIBERS tab: roster, activity (design-system)
│  │  │  └─ performance_view.py              # Master PERFORMANCE tab: KPIs, optional analytics, recent broadcasts
│  │  ├─ ui_bridge.py                       # Thread-safe Signal/Slot bridge
│  │  ├─ subscribers_panel.py               # Legacy SubscribersPanel (retained; not used by WindowShell)
└─ __pycache__/ + nested __pycache__/       # Compiled Python bytecode
```

Notes:

- `__pycache__` files are generated artifacts and not source-of-truth.
- `main_master.py` and `main_slave.py` are the active launch points.
- `main.py` is older CLI logic and does not match the current MT5 adapter signature.

---

## 3) Runtime Architecture Overview

## High-level execution model

The client has two operational roles:

1. **Master Node**
	- verifies identity with backend using license key
	- logs into MT5
	- connects socket and joins master room
	- runs polling recorder thread
	- emits `test_signal` events with trade data

2. **Slave Node**
	- verifies identity with backend using registered email
	- logs into MT5
	- connects socket and joins subscribed master room
	- listens for `trade_execution` events
	- applies risk + symbol mapping
	- opens/closes local positions and maintains ticket map

## Layered architecture

1. **View layer** (`views/*.py`)
	- collects user input
	- renders status + logs
	- dispatches actions to UI controllers

2. **Controller layer** (`controllers/ui_controllers/*.py`)
	- orchestrates cloud verification, MT5 connect, socket lifecycle
	- manages running state
	- handles incoming signal logic (slave) and recorder lifecycle (master)

3. **Service adapters**
	- `MT5Adapter`: broker terminal operations
	- `SocketManager`: socket connection and emit wrapper

4. **Model/state layer**
	- `AppState`: mutable state/log buffer
	- `TradeSignal`: basic signal serialization utility

---

## 4) Entry Points and Process Flows

## `main_master.py`

```python
import sys
from PySide6.QtWidgets import QApplication
from views.qt.master_window import MasterWindow
from views.qt.theme import load_fonts

if __name__ == "__main__":
	app = QApplication(sys.argv)
	load_fonts()
	window = MasterWindow()
	window.show()
	sys.exit(app.exec())
```

- Starts the PySide6 master terminal UI (loads design fonts before creating the window).

## `main_slave.py`

```python
import sys
from PySide6.QtWidgets import QApplication
from views.qt.slave_window import SlaveWindow
from views.qt.theme import apply_app_font, load_fonts

if __name__ == "__main__":
	app = QApplication(sys.argv)
	load_fonts()
	apply_app_font(app)
	window = SlaveWindow()
	window.show()
	sys.exit(app.exec())
```

- Starts the PySide6 slave terminal UI (loads fonts then applies app-wide font).

## `main.py` (Legacy)

- Contains an older CLI slave controller implementation.
- Includes hardcoded symbol whitelist and direct socket callback wiring.
- Calls `MT5Adapter.connect(choice)` with obsolete signature.
- Should be treated as legacy/stale unless intentionally modernized.

---

## 5) Dependency and Environment Notes

## `requirements.txt`

Listed dependencies:

- `python-socketio[client]`
- `requests`
- `colorama`
- `MetaTrader5`
- `PySide6`

Implication:

- Install dependencies with `pip install -r requirements.txt` before launching.

---

## 6) Model Layer Deep Dive

## `models/app_state.py`

AppState composes BaseState, MasterState, and SlaveState via multiple inheritance. All external code imports AppState as before. BaseState: shared fields. MasterState: master-only. SlaveState: slave-only.

Methods:

- `add_log(message)`
  - prefixes timestamp `[HH:MM:SS]`
  - appends to log list
  - trims buffer to max 50 entries

- `reset_daily_stats()`
  - resets `daily_pnl` to `0.0`
  - sets `copying_paused_by_loss` to `False`
  - logs reset event to both AppState and terminal

- `start_session()`
  - sets `session_start_time` to current `HH:MM:SS`
  - resets `session_pnl`, `open_trades`, `closed_trades`
  - logs `[SESSION] Session started at ...`
  - called by `toggle_listening()` when listening starts

- `add_open_trade(master_ticket, slave_ticket, symbol, action, volume)`
  - appends trade dict to `open_trades` with `open_time` timestamp
  - called after successful OPEN execution in `on_trade_signal()`

- `close_trade_record(master_ticket, pnl)`
  - moves matching trade from `open_trades` to `closed_trades`
  - adds `pnl` and `close_time` fields
  - accumulates `session_pnl`
  - caps `closed_trades` at 50 entries (drops oldest)
  - called after successful CLOSE execution in `on_trade_signal()`

## `models/trade_signal.py`

- Thin DTO-like helper with fields:
  - `symbol`
  - `action`
  - `volume`
- `to_dict()` returns serializable dict

## `models/__init__.py`

- Re-exports `AppState` and `TradeSignal` for easier imports.

---

## 7) MT5 Adapter Deep Dive

File: `controllers/mt5_adapter.py`

Class: `MT5Adapter`

## `__init__`

- `self.connected = False`
- predefined `broker_paths` for:
  - XM
  - Vantage
  - Exness

## `connect(broker_name, login, password, server)`

Flow:

1. Resolve broker executable path (if known)
2. Initialize MT5 with `mt5.initialize(path=...)` or auto initialize
3. Perform strict login with `mt5.login(login=int(login), password=password, server=server)`
4. Set connected flag and return tuple:
	- success: `(True, "Connected: ...")`
	- failure: `(False, "Init Failed/Auth Failed: ...")`

## `execute_trade(symbol, action, volume)`

Flow:

1. skip if not connected
2. ensure symbol selected in Market Watch
3. fetch tick price
4. determine order type from `BUY`/`SELL`
5. send `mt5.order_send(request)` with:
	- `TRADE_ACTION_DEAL`
	- `magic=234000`
	- `comment="TradeSync Copy"`
	- `ORDER_TIME_GTC`
	- `ORDER_FILLING_IOC`

Returns MT5 result object (or `None`).

## `close_trade(ticket, symbol)`

Flow:

1. load open position by ticket
2. compute opposite order side
3. select symbol + load tick
4. send close request with:
	- `position=ticket`
	- `deviation=20`
	- `magic=234000`
	- `comment="TradeSync Close"`
	- `ORDER_TIME_GTC`
	- `ORDER_FILLING_IOC`

Returns MT5 result object (or `None`).

---

## 8) Socket Manager Deep Dive

File: `controllers/socket_manager.py`

Class: `SocketManager`

State:

- `self.sio = socketio.Client()`
- `self.server_url`
- `self.mt5`
- `self.is_connected`

Methods:

1. `connect()`
	- attempts websocket transport connection
	- sets `is_connected=True` on success
	- logs socket errors with colorized output

2. `on_connect()`
	- logs session id (`self.sio.sid`)

3. `on_node_registered(data)`
	- handles `node_registered` event confirming successful room registration
	- logs successful registration or room-assignment failure

4. `emit_signal(signal_dict)`
	- emits socket event `test_signal`

Socket events used by wider system:

- outbound: `test_signal`
- inbound configured by controllers: `trade_execution`, `connect`
- inbound handled directly: `node_registered`

SocketManager now handles node_registered event confirming successful room registration.

---

## 9) Master Recorder Deep Dive

File: `master_recorder.py`

Class: `MasterRecorder`

State:

- `tracked_tickets: dict[ticket -> symbol]`
- `is_running`
- `magic_number=234000`
- `client` (SocketManager-like object)

## `get_active_positions()`

- returns dict of active MT5 positions keyed by ticket.

## `start_monitoring()`

Core polling loop (`sleep(0.5)`):

1. Bootstrap tracked positions (excluding self-copied `magic=234000` positions)
2. Compare current tickets vs known tickets
3. For new tickets:
	- register ticket
	- `broadcast_event('OPEN', pos=...)`
4. For missing tickets (closed):
	- compute realized PnL by summing `mt5.history_deals_get(position=t).profit`
	- `broadcast_event('CLOSE', ticket=t, symbol=symbol, pnl=pnl)`
	- remove tracked mapping

## `broadcast_event(...)`

Builds payload:

```json
{
  "event": "OPEN|CLOSE",
  "master_ticket": number,
  "symbol": "...",
  "action": "BUY|SELL|CLOSE",
  "volume": number,
  "pnl": number
}
```

Emission strategy:

- prefers `client.emit_signal(data)` when available
- falls back to direct `client.sio.emit('test_signal', data)`

Important:

- CLOSE payload action is literal `"CLOSE"` from recorder.

---

## 10) UI Controller Layer Deep Dive

## `controllers/ui_controllers/master_controller.py`

Class: `MasterController`

Composition:

- `AppState`
- `MT5Adapter`
- `SocketManager` (lazy init)
- `MasterRecorder` (lazy init)
- UI callback (`update_ui`) for rendering logs

### `login_mt5(broker, login, password, server, license_key)`

2-stage authentication flow:

1. Cloud verify call:
	- `POST http://localhost:3000/auth/verify-node`
	- body: `{ role: 'MASTER', identifier: license_key }`
	- accepts status `200` or `201`
2. MT5 login via adapter
3. on success:
	- sets state flags
	- stores license key
	- calls `connect_cloud(license_key)`

### `connect_cloud(identifier)`

Flow:

1. create `SocketManager`
2. clears existing handlers if accessible (`self.socket.sio.handlers = {}`)
3. defines `connect` event callback that emits:
	- `register_node` payload `{ role: 'MASTER', identifier }`
4. marks socket connected state

### `MasterSignalTrackingSocket.emit_signal(signal_dict)`

When the master recorder emits through the tracking wrapper, each **OPEN** and **CLOSE** payload is appended to `AppState.recent_signals` as a **full copy** of `signal_dict` plus a UI `time` stamp (`HH:MM:SS`). The ring buffer caps at **50** entries so an OPEN typically remains available when its matching CLOSE arrives. `PerformanceView` pairs these rows for the Recent Broadcasts table.

### `toggle_broadcasting()`

- Starts/stops recorder thread and updates state/logs.
- On start:
  - sets `state.is_running=True`
  - creates recorder
  - daemon thread target `_run_recorder`
- On stop:
  - sets `state.is_running=False`
  - flips recorder `is_running=False`

### `_run_recorder()`

- wrapper around `recorder.start_monitoring()` with exception logging.

## `controllers/ui_controllers/slave_controller.py`

Class: `SlaveController`

Composition:

- `AppState`
- `MT5Adapter`
- `SocketManager` (lazy)
- local `ticket_map` (`master_ticket -> slave_ticket`)

### `login_mt5(broker, login, password, server, email_identifier)`

2-stage authentication flow:

1. Cloud verify call:
	- `POST /auth/verify-node`
	- body: `{ role: 'SLAVE', identifier: email_identifier }`
	- accepts status `200` or `201`
2. MT5 login
3. on success calls `connect_cloud(email_identifier)`

### `connect_cloud(identifier)`

Flow:

1. create `SocketManager`
2. subscribe `trade_execution -> self.on_trade_signal`
3. on connect emit:
	- `register_node` payload `{ role: 'SLAVE', identifier }`
4. mark connected state

### `toggle_listening()`

- toggles `state.is_running` for whether incoming signals are executed.

### `add_symbol_mapping(master_sym, slave_sym)` / `remove_mapping(master_sym)`

- mutate `state.symbol_map` and log updates.

### `on_trade_signal(data)`

Core copy engine:

1. return early if not listening
2. risk guard block (Guards -1 through 1 — see §11.1)
3. parse event + ticket + symbol
4. apply symbol mapping policy:
	- if map dict is empty → copy all
	- if map exists and symbol present → translate
	- if map exists and symbol NOT present:
	  - `unmapped_symbol_behavior == 'COPY_AS_IS'` → use master symbol
	  - `unmapped_symbol_behavior == 'IGNORE'` → ignore signal
5. Guard 2 (symbol whitelist)
6. OPEN handling:
	- copy mode volume calculation (MULTIPLIER or FIXED_LOT)
	- enforce minimum volume `0.01`
	- Guard 3 (max lot size cap)
	- reverse copy (flip BUY↔SELL if enabled)
	- execute trade with slippage
	- if retcode `10009` success:
	  - save `ticket_map[master_ticket] = slave_order`
	  - record open trade in session tracking
7. CLOSE handling:
	- lookup mapped slave ticket
	- close trade
	- if retcode `10009`:
	  - remove ticket mapping
	  - accumulate daily PnL
	  - record closed trade in session tracking
	  - check daily loss limit auto-pause
8. push UI log updates (single `update_ui()` at method end)

---

## 11) View Layer Deep Dive (PySide6)

The UI layer has been migrated to PySide6. To ensure thread safety between the core execution engine (which relies on background MT5 polling and Socket.IO threads) and the Qt event loop, all UI files utilize a custom `UIBridge` (`QObject`). Background threads emit Qt Signals through this bridge, triggering `@Slot()` methods on the main thread to safely mutate widgets.

## `views/qt/master_window.py`

Class: `MasterWindow(QMainWindow)`

Design: Bloomberg Terminal-inspired minimal dark theme (global QSS via `theme.build_global_qss()`). Post-login chrome matches the Slave pattern: frameless window (`Qt.WindowType.FramelessWindowHint`) plus custom `TitleBar`, then `WindowShell(role='master')`.

Dashboard layout (not `QTabWidget`): sidebar navigation keys `broadcast`, `subscribers`, `performance`; center column is header strip + KPI strip + `QStackedWidget` pages; right column is `EventLog`. Placeholder stack pages are swapped for real views via `_replace_shell_placeholder()`. The master sidebar top margin is adjusted when the `TitleBar` sits outside the shell (same idea as `SlaveWindow`).

Flow:
1. Login screen rendered via `QStackedWidget` (`MasterLoginCard`).
2. `on_login_submit()` extracts MT5 credentials plus master license key and calls `MasterController.login_mt5()`.
3. On success, `show_dashboard()` switches to the dashboard, loads master performance stats (`GET /auth/masters/:id/profile`), and schedules subscriber fetch.
4. `update_ui()` runs every 500ms and refreshes shell header/KPI/footer, event log tail, `BroadcastView`, `SubscribersView`, and `PerformanceView` (via `refresh_performance` + `state.recent_signals`).

Key widgets and controls:
- **Login entries:** `MasterLoginCard` — MT5 login/password, server, broker `DarkDropdown`, license `MonoInput`, `Btn` submit.
- **Dashboard — BROADCAST:** `views/qt/views/broadcast_view.py` — start/stop broadcasting, license display, MT5 account summary; syncs from `AppState`.
- **Dashboard — SUBSCRIBERS:** `SubscribersView` — summary `CountChip` row, roster table (`StatusPill` live/offline, `GhostIconBtn` revoke stub), HTML activity log.
- **Dashboard — PERFORMANCE:** `PerformanceView` (`views/qt/views/performance_view.py`) — six KPI cards from profile JSON; optional analytics row (`EquitySparkline`, risk metrics list, `ActiveHoursHistogram`) shown only when both `riskMetrics` and `equitySparkline` are present; **Recent broadcasts** table walks `AppState.recent_signals` with a **list-based queue matcher** so each CLOSE merges into the newest matching OPEN (by ticket when present, else symbol+volume), with P&L shown when closed.
- **Event log:** `shell.EventLog` filter chips are role-aware: master uses `ALL`, `SIGNAL`, `SESSION`, `MT5`, `ERR`; slave keeps `COPY` instead of `SESSION`.

Methods:
- `build_login_screen()` / `build_dashboard_screen()`: UI layout generation (TitleBar + shell + view injection).
- `show_login()` / `show_dashboard()`: Switch stacked views and load dashboard data.
- `on_login_submit()`: Extracts text from Qt inputs and triggers `MasterController.login_mt5()`.
- `on_toggle_broadcast()`: Legacy hook; broadcasting is driven from `BroadcastView` → controller.
- `load_performance_stats()`: HTTP fetch of `/auth/masters/:id/profile` into `performance_data`; calls `refresh_performance`.
- `refresh_performance(stats)`: Delegates KPI + signals table to `PerformanceView.sync_from_state`.
- `_update_session_clock()`: Computes elapsed broadcast time string for header refresh.
- `update_ui()`: Thread-safe `@Slot()` that tails logs into `EventLog`, syncs shell chrome, broadcast/subscribers views, and performance view.

## Master Subscriber System

The master subscriber system lets the Python master desktop app see which subscribed slaves are assigned to the master and whether they are currently online.

Controller behavior:
- `MasterController.fetch_subscribers()` calls `GET /auth/masters/:id/subscribers` and stores the response in `AppState.subscribers`.
- `MasterController.connect_cloud()` registers a `subscriber_update` socket listener using `SocketManager.register_handler()`.
- On `subscriber_update`, the controller updates `AppState.subscriber_online_status[email]`, writes a `[MASTER]` colorama terminal log, appends a UI log entry, and requests a UI refresh.

Socket event:
- `subscriber_update` is emitted by the backend to the master's room when a subscribed slave registers or disconnects.
- Payload shape: `{ slaveEmail, online, timestamp }`.

UI behavior:
- `SubscribersView` renders the subscriber list from `AppState.subscribers`.
- The STATUS column reads `AppState.subscriber_online_status` and displays online vs offline via `StatusPill` widgets.
- The view includes a manual refresh (`Btn` ghost) and a 20-entry activity log for connect/disconnect changes.

## `views/qt/slave_window.py`

Class: `SlaveWindow(QMainWindow)`

Design: Bloomberg Terminal-inspired minimal dark theme.
Palette: `#0a0a0a` background, `#1a1a1a` surfaces, `#2a2a2a` borders, `#00d4aa` accent, `#ff4444` errors.

Flow:
1. Login screen rendered via `QStackedWidget`.
2. Credentials extracted (strictly using Email as the identifier).
3. Cloud verify + MT5 connect (`SlaveController.login_mt5`).
4. Dashboard: `TitleBar` + `WindowShell(role='slave')` (sidebar, KPI, header, stack, footer, `EventLog`).

Key widgets and controls:
- **Login:** `SlaveLoginCard` — email, MT5 login/password, server, broker name (`LineInput` / `MonoInput`).
- **Shell:** Sidebar keys `copy` / `symbols` / `risk` / `trades`; KPI/footer/header from `AppState`; `update_ui()` appends `state.logs` to `EventLog` (filters: ALL, SIGNAL, COPY, MT5, ERR).
- **COPY:** `views/qt/views/copy_view.py` — master status summary, segmented `MULTIPLIER` \| `FIXED_LOT`, spinboxes (`risk_multiplier`, `fixed_lot_size`, `slippage_points`), reverse checkbox, `toggle_listening()` + `SweepBand` when running.
- **SYMBOLS:** `views/qt/views/symbols_view.py` — broker presets, mapping table, and `unmapped_symbol_behavior`; stacked as the shell `"symbols"` page.
- **RISK:** `views/qt/views/risk_view.py` — guards and controls (`equity_floor`, `max_concurrent_trades`, `daily_loss_limit`, `max_lot_size`, whitelist, daily P&L / pause / reset).
- **TRADES:** `views/qt/views/trades_view.py` — open positions and session history tables (`TradesView`).

Methods:
- `build_login_screen()` / `build_dashboard_screen()`: layouts plus `WindowShell`; `_replace_shell_placeholder()` swaps a stack widget by nav key without editing `shell.py`.
- `on_login_submit()` calls `SlaveController.login_mt5(...)`.
- `_show_dashboard()` switches the stack to the dashboard, resets log and header guards, runs `update_ui()`.
- `update_ui()` (`@Slot()`): footer, `HeaderStripSlave`, KPI strip, tails `state.logs` into `EventLog`; `CopyView.sync_from_state()`; `SymbolsView.refresh_display()`; `RiskView.refresh_display()`; `TradesView.refresh_display()`.

`_slave_log_category` maps log lines into `EventLog` filter categories.

## 11.1) Risk Management System

`SlaveController.on_trade_signal()` executes 5 risk guards before trade execution:

1. **Guard -1 — Equity Floor:** If `equity_floor > 0`, calls `mt5.account_info()`. If `account.equity < equity_floor`, OPEN is blocked. Prefix `[RISK]`, color `Fore.RED`.
2. **Guard 0 — Daily Loss Pause:** If `copying_paused_by_loss` is `True`, all OPEN signals are blocked. User must reset via Risk tab.
3. **Guard 1 — Max Concurrent Trades:** If `len(ticket_map) >= max_concurrent_trades`, OPEN is blocked.
4. **Guard 2 — Symbol Whitelist:** After symbol mapping, if `symbol_whitelist` is non-empty and `slave_symbol` is not in the list, OPEN is skipped.
5. **Guard 3 — Max Lot Size Cap:** After volume calculation, if `new_vol > max_lot_size`, volume is clamped.

After a successful CLOSE, PnL from the signal is accumulated into `daily_pnl`. If `daily_pnl <= -daily_loss_limit`, `copying_paused_by_loss` is set to `True`.

All risk events are logged to terminal with `colorama` colors (`Fore.YELLOW` for warnings, `Fore.RED` for blocks, `Fore.CYAN` for info) and prefixed with `[RISK]`.

## 11.2) Copy Modes

Two copy modes control how volume is calculated in `on_trade_signal()` OPEN handling:

- **MULTIPLIER** (default): `copy_volume = master_volume × risk_multiplier`. Multiplier is configurable from `0.01` to `10.0` in the COPY tab.
- **FIXED_LOT**: `copy_volume = fixed_lot_size` regardless of master volume. Fixed lot is configurable from `0.01` to `100.0` in the COPY tab.

In both modes, volume is floored at `0.01` and optionally clamped by `max_lot_size` (Guard 3).

Additional copy features:
- **Reverse Copy**: When `reverse_copy == True`, BUY signals are executed as SELL and vice versa. Logged as `[COPY] Reverse copy: BUY -> SELL`.
- **Slippage**: `slippage_points` is passed as the `deviation` parameter to `MT5Adapter.execute_trade()`. Default `10` points.

## 11.3) Session Tracking

`AppState` tracks trade activity per listening session:

- `start_session()` is called when `toggle_listening()` starts. Resets `session_pnl`, `open_trades`, `closed_trades`, and records `session_start_time`.
- `add_open_trade()` is called after each successful OPEN. Appends a dict `{master_ticket, slave_ticket, symbol, action, volume, open_time}` to `open_trades`.
- `close_trade_record()` is called after each successful CLOSE. Moves the trade from `open_trades` to `closed_trades`, adds `pnl` and `close_time`, and accumulates `session_pnl`.
- When listening stops, `toggle_listening()` logs `[SESSION] Ended. Session PnL: $X.XX`.

`TradesView` is the active TRADES UI; legacy panel files were removed in Phase 1.6.

`views/qt/views/trades_view.py` (`TradesView`) is the design-system slave TRADES tab wired into `WindowShell`; it displays:
- Session summary bar: open count, closed count, session P&L, session start time (when set)
- Open positions `Card`: TICKET, SYMBOL, ACTION (`TradeChip`), VOLUME, OPENED
- Session history `Card`: same columns + P&L (`ACCENT` / `DANGER`) + CLOSED time
- `refresh_display()` is called by `SlaveWindow.update_ui()` on every UI sync

## 11.4) Symbol Mapping System

`data/broker_symbols.py` contains `BROKER_PRESETS` — a dict of broker names to symbol translation dicts. Supported brokers: Vantage, XM, Exness, IC Markets, Pepperstone.

`views/qt/views/symbols_view.py` (`SymbolsView`) provides:
- Dual broker dropdown: "Master's broker" + "Your broker" for cross-broker preset loading
- When "Load Preset" is clicked: iterates `BROKER_PRESETS[master_broker]` keys, looks up corresponding slave symbol from `BROKER_PRESETS[my_broker]`, and adds to `symbol_map` if not already present
- Input row for manual master→slave symbol entry
- `QTableWidget` showing all active mappings with per-row Remove buttons
- Unmapped symbol behavior dropdown:
  - `Ignore (skip trade)` → `state.unmapped_symbol_behavior = 'IGNORE'` (default)
  - `Copy as-is (same name)` → `state.unmapped_symbol_behavior = 'COPY_AS_IS'`

This solves the problem of different MT5 brokers using completely different symbol names (e.g., Vantage: `XAUUSD` vs XM: `GOLD` vs Exness: `XAUUSDm`). The underlying `AppState.symbol_map` dict structure is unchanged, so `on_trade_signal()` logic remains compatible.


## 12) End-to-End Communication Contracts

This section is critical for preserving cross-project compatibility.

## A) Client ↔ Backend HTTP contract

Endpoint used:

- `POST http://localhost:3000/auth/verify-node`

Auth boundary note:

- This node-verification endpoint is intentionally public for desktop MASTER/SLAVE bootstrap.
- JWT bearer authentication is used by web/admin REST flows (frontend to backend), not by this verify-node handshake.
- After verification, realtime authorization continues through `register_node` role/identifier semantics and backend room routing.

Master request:

```json
{ "role": "MASTER", "identifier": "<license_key>" }
```

Slave request:

```json
{ "role": "SLAVE", "identifier": "<registered_email>" }
```

Expected successful response includes at least:

- `message`
- `role`
- `fullName`

## B) Client ↔ Backend Socket contract

On connect, both roles emit `register_node`:

```json
{ "role": "MASTER|SLAVE", "identifier": "..." }
```

Master emits `test_signal` payloads from recorder.

Slave listens to `trade_execution` payloads and executes local trades.

Payload fields used by slave logic:

- `event`
- `master_ticket`
- `symbol`
- `action`
- `volume`

Backend currently routes by master room; client behavior depends on backend `register_node` + room join semantics.

## C) Client ↔ Frontend relationship

- Frontend and client do not call each other directly.
- Both consume backend contracts:
  - auth/identity data
  - live signal stream (`trade_execution`)
- Consistency in payload keys and role semantics is mandatory across both consumers.

---

## 13) Method & Function Index (Quick Reference)

## Core execution functions

- `MT5Adapter.connect`
- `MT5Adapter.execute_trade`
- `MT5Adapter.close_trade`
- `MasterRecorder.start_monitoring`
- `MasterRecorder.broadcast_event`
- `SlaveController.on_trade_signal`

## Lifecycle and orchestration

- `MasterController.login_mt5`
- `MasterController.connect_cloud`
- `MasterController.fetch_subscribers`
- `MasterController.toggle_broadcasting`
- `SlaveController.login_mt5`
- `SlaveController.connect_cloud`
- `SlaveController.toggle_listening`

## UI state sync helpers

- `MasterWindow.update_ui`
- `SlaveWindow.update_ui`
- `AppState.add_log`

---

## 14) Current Constraints and Known Risks

1. **Legacy file drift:** `main.py` is outdated relative to current adapter/controller signatures.
2. **Hardcoded backend URL:** controllers and socket manager use `http://localhost:3000` directly.
3. **Status code mismatch risk:** master login expects `201`; slave accepts `200/201`.
4. **Symbol mapping behavior:** once any map exists, unmapped symbols are intentionally ignored.
5. **No formal retry/backoff strategy:** transient socket/HTTP errors only logged.

These are current behavior realities; preserve unless intentionally refactoring.

---

## 15) AI-Safe Extension Rules (Do-Not-Break Contracts)

When adding code with AI tools, enforce these rules:

1. Keep `register_node`, `test_signal`, and `trade_execution` event names unchanged unless backend is updated in lockstep.
2. Preserve signal payload keys consumed by slave (`event`, `master_ticket`, `symbol`, `action`, `volume`).
3. Preserve role identity semantics:
	- MASTER uses license key
	- SLAVE uses registered email
4. Maintain ticket-map logic (`master_ticket -> slave_ticket`) for close symmetry.
5. Preserve risk multiplier + minimum lot guard (`>= 0.01`) unless explicitly changing risk policy.
6. Do not remove `magic=234000` filtering without understanding loop-prevention impact.
7. Keep `ORDER_TIME_GTC` and `ORDER_FILLING_IOC` close/open request policy unless broker-specific changes are validated.
8. Any backend response contract change must update both client controllers and frontend docs.

---

## 16) Suggested Non-Breaking Improvement Roadmap

1. Move backend URL and broker paths to environment/config files.
2. Normalize HTTP success handling (`200/201`) across master/slave controllers.
3. Add structured response/error DTO handling around cloud requests.
4. Add graceful reconnect and heartbeat in `SocketManager`.
5. Add unit/integration tests for signal transformation and ticket mapping.
6. Update/remove `main.py` legacy path to avoid accidental usage.
7. Pin complete dependency set in `requirements.txt`.

---

## 17) Launch and Operation Notes

Typical usage:

1. Start backend (`trade-sync-backend`) so `/auth/verify-node` and socket server are available.
2. Launch master via `main_master.py` and login with MT5 + license key.
3. Launch slave via `main_slave.py` and login with MT5 + registered email.
4. On slave dashboard, configure risk/mapping, then start listening.
5. On master dashboard, start broadcasting.

Expected runtime indicators:

- Cloud verification logs in both UIs
- socket connect message and room registration
- master broadcast logs on OPEN/CLOSE
- slave open/close success logs with mapped ticket IDs
- master controller lifecycle events mirrored in terminal output
- slave controller signal-processing events mirrored in terminal output

---

## 18) Canonical Contract Pointer

For cross-system integration contracts across backend/frontend/client, use:

- `SYSTEM_CONTRACT_MATRIX.md` (workspace root)

If node verification, socket event names, payload keys, role identity semantics, or room-routing rules change, update the matrix first and then synchronize this client guide.

---

Treat this document as the source-of-truth for the Python client implementation and cross-system communication boundaries.

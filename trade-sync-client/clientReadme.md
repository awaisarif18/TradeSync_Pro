# TradeSync Pro Client — Deep Technical Documentation

This document is the authoritative engineering guide for `trade-sync-client` (Python desktop node).  
It is written so humans and AI coding models can extend the client safely without breaking backend/frontend interoperability.

---

## Scope Lock (Current Phase)

Current implementation scope is Phase 1 only from README_NEXT_STEPS.md: Immediate Priority: Stabilization.

Client work allowed in this phase:
1. Critical-flow contract stabilization (MASTER/SLAVE verify + socket registration + OPEN/CLOSE handling)
2. Structured logging with trace IDs across master and slave paths
3. Reconnect and health-state handling for practical runtime resilience

Client work deferred for later phases:
1. Profile management for multiple MT5 and node setups
2. Persistent local settings for advanced preferences
3. Telemetry buffering platform features beyond basic stabilization
4. Full graceful-shutdown hardening expansion beyond immediate recorder/socket safety

Lightweight testing policy for this project stage:
- Keep automated tests focused on core execution logic with mocks
- Prefer a small reliable suite over extensive coverage
- Ensure no contract drift from SYSTEM_CONTRACT_MATRIX.md

Implemented in current Phase 1 client scope:
1. `SocketManager` reconnect/backoff configuration with health callbacks
2. Auto `register_node` on every connect/reconnect
3. Duplicate listener protection via `register_handler`
4. Trace-aware logs and `trace_id` propagation in master/slave paths
5. Shared state includes `health_state` in `models/app_state.py`
6. Minimal client tests in `tests/test_slave_controller.py` for OPEN/CLOSE ticket-map behavior

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
│  ├─ app_state.py                          # Shared mutable UI/controller state
│  └─ trade_signal.py                       # Lightweight trade DTO helper
├─ views/
│  ├─ qt/
│  │  ├─ master_window.py                   # PySide6 Master desktop UI
│  │  ├─ slave_window.py                    # PySide6 Slave desktop UI (4-tab Bloomberg theme)
│  │  ├─ ui_bridge.py                       # Thread-safe Signal/Slot bridge
│  │  ├─ subscribers_panel.py               # SubscribersPanel QWidget
│  │  ├─ symbol_map_panel.py                # SymbolMapPanel QWidget (dual broker presets)
│  │  ├─ risk_panel.py                      # RiskPanel QWidget (equity + limits + loss + whitelist)
│  │  └─ trades_panel.py                    # TradesPanel QWidget (open + closed trade tables)
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

if __name__ == "__main__":
	app = QApplication(sys.argv)
	window = MasterWindow()
	window.show()
	sys.exit(app.exec())
```

- Starts the PySide6 master terminal UI.

## `main_slave.py`

```python
import sys
from PySide6.QtWidgets import QApplication
from views.qt.slave_window import SlaveWindow

if __name__ == "__main__":
	app = QApplication(sys.argv)
	window = SlaveWindow()
	window.show()
	sys.exit(app.exec())
```

- Starts the PySide6 slave terminal UI.

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

`AppState` stores mutable runtime state for both roles:

- MT5 credentials/path placeholders
- role (`MASTER` / `SLAVE`)
- flags:
  - `mt5_connected`
  - `socket_connected`
  - `is_running`
- slave controls:
  - `risk_multiplier` (float, default `1.0`) — lot size multiplier for MULTIPLIER copy mode
  - `symbol_map` (dict, default `{}`) — master→slave symbol translation
- risk management settings:
  - `max_lot_size` (float, default `0.0` = disabled) — cap on computed copy volume
  - `max_concurrent_trades` (int, default `0` = disabled) — max simultaneous copied positions
  - `daily_loss_limit` (float, default `0.0` = disabled) — auto-pause threshold
  - `daily_pnl` (float, default `0.0`) — accumulated PnL from CLOSE signals today
  - `copying_paused_by_loss` (bool, default `False`) — set when daily loss limit hit
  - `symbol_whitelist` (list, default `[]`) — slave-side symbol copy filter
- copy mode settings:
  - `copy_mode` (str, default `'MULTIPLIER'`) — `'MULTIPLIER'` or `'FIXED_LOT'`
  - `fixed_lot_size` (float, default `0.01`) — used when `copy_mode == 'FIXED_LOT'`
  - `reverse_copy` (bool, default `False`) — flip BUY↔SELL before execution
  - `slippage_points` (int, default `10`) — deviation in points for MT5 orders
  - `unmapped_symbol_behavior` (str, default `'IGNORE'`) — `'IGNORE'` or `'COPY_AS_IS'`
- equity protection:
  - `equity_floor` (float, default `0.0` = disabled) — block OPEN if MT5 equity < this value
- session tracking:
  - `session_start_time` (str, default `''`) — `HH:MM:SS` when listening started
  - `session_pnl` (float, default `0.0`) — PnL since session start
  - `open_trades` (list, default `[]`) — dicts of currently open copied trades
  - `closed_trades` (list, default `[]`) — dicts of closed trades this session (max 50)
- master subscriber state:
  - `subscribers` (list, default `[]`) — rows loaded from `GET /auth/masters/:id/subscribers`
  - `subscriber_online_status` (dict, default `{}`) — `{ email: bool }` from `subscriber_update`
  - `master_user_id` (str, default `''`) — resolved after master verification for subscriber/profile API calls
- master session stats:
  - `signals_sent` (int, default `0`) — increments when a master `test_signal` is emitted
  - `session_start_time_master` (str, default `''`) — `HH:MM:SS` when broadcasting starts
- log buffer (`logs`, capped to 50 entries)

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

3. `emit_signal(signal_dict)`
	- emits socket event `test_signal`

Socket events used by wider system:

- outbound: `test_signal`
- inbound configured by controllers: `trade_execution`, `connect`

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

Design: Bloomberg Terminal-inspired minimal dark theme.
Dashboard layout: 3-tab `QTabWidget` with `BROADCAST`, `SUBSCRIBERS`, and `PERFORMANCE`.

Flow:
1. Login screen rendered via `QStackedWidget`.
2. `on_login_submit()` extracts MT5 credentials plus master license key and calls `MasterController.login_mt5()`.
3. On success, `show_dashboard()` switches to the dashboard, refreshes MT5 account info, loads master performance stats, and schedules subscriber fetch.
4. `update_ui()` runs every 500ms and refreshes status, logs, signal count, session timer, and subscriber display.

Key widgets and controls:
- **Login entries:**
  - MT5 Login ID (`QLineEdit`)
  - MT5 Password (`QLineEdit`, masked)
  - Server string (`QLineEdit`)
  - Broker dropdown (`QComboBox`: `Vantage`, `XM`, `Exness`, `Exness Slave`, `Auto-Detect`)
  - License key input (`QLineEdit`)
- **Dashboard (Tab 1: BROADCAST):**
  - Status bar: broadcast state, elapsed session time, signals sent
  - START/STOP BROADCASTING button
  - Account group: MT5 account name, server, and balance
  - Event Log (`QTextEdit`, color-coded HTML output)
- **Dashboard (Tab 2: SUBSCRIBERS):**
  - `SubscribersPanel` with subscriber table, live/offline status, copied count, and PnL summary
- **Dashboard (Tab 3: PERFORMANCE):**
  - Trading stats from `GET /auth/masters/:id/profile`: total trades, closed trades, win rate, total PnL, average volume, and subscribers

Methods:
- `build_login_screen()` / `build_dashboard_screen()`: UI layout generation.
- `show_login()` / `show_dashboard()`: Switch stacked views and load dashboard data.
- `on_login_submit()`: Extracts text from Qt inputs and triggers `MasterController.login_mt5()`.
- `on_toggle_broadcast()`: Triggers controller broadcast state and updates the UI.
- `load_performance_stats()`: Fetches master aggregate stats from the backend.
- `_update_session_clock()`: QTimer-driven 1s updates for elapsed broadcast time.
- `update_ui()`: Thread-safe `@Slot()` that reads `AppState`, updates color-coded logs, and refreshes `SubscribersPanel`.

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
- `SubscribersPanel` renders the subscriber list from `AppState.subscribers`.
- The STATUS column reads `AppState.subscriber_online_status` and displays `● LIVE` or `○ OFFLINE`.
- The panel includes a manual refresh button and a 20-entry activity log for connect/disconnect changes.

## `views/qt/slave_window.py`

Class: `SlaveWindow(QMainWindow)`

Design: Bloomberg Terminal-inspired minimal dark theme.
Palette: `#0a0a0a` background, `#1a1a1a` surfaces, `#2a2a2a` borders, `#00d4aa` accent, `#ff4444` errors.

Flow:
1. Login screen rendered via `QStackedWidget`.
2. Credentials extracted (strictly using Email as the identifier).
3. Cloud verify + MT5 connect.
4. Dashboard rendered as a 4-tab `QTabWidget`.

Key widgets and controls:
- **Login entries:**
  - MT5 Login ID (`QLineEdit`)
  - MT5 Password (`QLineEdit`, masked)
  - Server string (`QLineEdit`)
  - Broker dropdown (`QComboBox`: `XM`, `Vantage`, `Exness`)
  - "TSP Registered Email" input (`QLineEdit`)
- **Dashboard (Tab 1: COPY):**
  - Status bar: connection dot (teal/red), session timer, session P&L
  - Copy Mode groupbox: Multiplier/Fixed Lot radio buttons with stacked spinboxes
  - Reverse Copy checkbox, Slippage spinbox
  - START/STOP COPYING button (teal border when active)
  - Event Log (`QTextEdit`, color-coded HTML output)
- **Dashboard (Tab 2: SYMBOLS):**
  - `SymbolMapPanel` with dual broker preset (master's broker + your broker)
  - Unmapped symbol behavior dropdown (ignore vs copy-as-is)
- **Dashboard (Tab 3: RISK):**
  - `RiskPanel` with equity protection, lot cap, concurrent cap, daily loss protection, symbol whitelist
- **Dashboard (Tab 4: TRADES):**
  - `TradesPanel` with session summary, open positions table, session history table

Methods:
- `build_login_screen()` / `build_dashboard_screen()`: UI layout generation.
- `on_login_submit()`: Extracts text and triggers `SlaveController.login_mt5()`.
- `on_risk_changed(value)`: Directly mutates `controller.state.risk_multiplier`.
- `on_toggle_listen()`: Flips controller listening state, updates button text/style.
- `_on_copy_mode_changed(id)`: Switches copy mode and stacked spinbox.
- `_on_fixed_lot_changed(value)`: Mutates `state.fixed_lot_size`.
- `_on_reverse_changed(checked)`: Mutates `state.reverse_copy`.
- `_on_slippage_changed(value)`: Mutates `state.slippage_points`.
- `_update_session_clock()`: QTimer-driven 1s updates for elapsed time.
- `update_ui()`: Thread-safe `@Slot()` that refreshes connection dot, session PnL, color-coded HTML logs, `RiskPanel.refresh_display()`, and `TradesPanel.refresh_display()`.

Log color coding in `update_ui()` HTML rendering:
- `[RISK]` lines → `#ff9900` (orange)
- `OPEN SUCCESS` → `#00d4aa` (teal)
- `CLOSE SUCCESS` → `#888888` (gray)
- `DAILY LOSS` / `FAILED` → `#ff4444` (red)
- `[SESSION]` → `#00d4aa` (teal)
- Normal lines → `#666666` (muted)

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

`views/qt/trades_panel.py` (`TradesPanel`) displays:
- Session summary bar: open count, closed count, session P&L, elapsed time
- Open positions table: TICKET, SYMBOL, ACTION (color-coded), VOLUME, OPENED
- Session history table: same columns + P&L (teal/red) + CLOSED time
- `refresh_display()` is called by `SlaveWindow.update_ui()` on every UI sync

## 11.4) Symbol Mapping System

`data/broker_symbols.py` contains `BROKER_PRESETS` — a dict of broker names to symbol translation dicts. Supported brokers: Vantage, XM, Exness, IC Markets, Pepperstone.

`views/qt/symbol_map_panel.py` (`SymbolMapPanel`) provides:
- Dual broker dropdown: "Master's broker" + "Your broker" for cross-broker preset loading
- When "Load Preset Mappings" clicked: iterates `BROKER_PRESETS[master_broker]` keys, looks up corresponding slave symbol from `BROKER_PRESETS[my_broker]`, and adds to `symbol_map` if not already present
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

# TradeSync Pro Client — Deep Technical Documentation

This document is the authoritative engineering guide for `trade-sync-client` (Python desktop node).  
It is written so humans and AI coding models can extend the client safely without breaking backend/frontend interoperability.

---

## Scope Lock (Current Phase)

Current implementation includes Phase 1 stabilization, Phase 2 desktop UI refactor, Phase 7.1 Slave UI overhaul, Phase 8 risk management, and Phase 8.1 Master subscriber system.

Client work delivered and stable:
1. `SocketManager` reconnect/backoff with auto `register_node` on every connect/reconnect
2. Duplicate listener protection via `register_handler` with `_registered_events` set
3. Trace-aware structured logs and `trace_id` propagation in master/slave paths
4. `health_state` field in `BaseState` for socket lifecycle visibility
5. Minimal contract tests in `tests/test_slave_controller.py`
6. Master shell: frameless `TitleBar` + `WindowShell(role='master')` injecting `BroadcastView`, `SubscribersView`, `PerformanceView`
7. Slave shell: frameless `TitleBar` + `WindowShell(role='slave')` injecting `CopyView`, `SymbolsView`, `RiskView`, `TradesView`
8. `PerformanceView` aggregates raw signals by `master_ticket` for OPEN/CLOSE lifecycle table
9. Master EventLog filters: `ALL`, `SIGNAL`, `SESSION`, `MT5`, `ERR`
10. `MasterController.revoke_subscriber` calls `POST /auth/node-action/revoke-subscriber`

Client work deferred for later phases:
1. Multi-profile MT5/node management at scale
2. Persistent local settings for advanced preferences
3. Telemetry buffering platform features
4. Full graceful-shutdown hardening

---

## 1) Project Identity

- **Project:** `trade-sync-client`
- **Language:** Python 3.9+
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
6. Provide operator UI for risk multiplier, copy mode, symbol mapping, risk guards

---

## 2) Full File Structure and Responsibility Map

```text
trade-sync-client/
├─ clientReadme.md                              # This document
├─ requirements.txt                             # Python dependency list
├─ main_master.py                               # Master GUI entrypoint
├─ main_slave.py                                # Slave GUI entrypoint
├─ main.py                                      # Legacy CLI slave flow (stale/unused)
├─ master_recorder.py                           # Master trade monitor + broadcaster
├─ controllers/
│  ├─ mt5_adapter.py                            # MT5 login/order/close adapter
│  ├─ socket_manager.py                         # Socket.IO client wrapper with reconnect + health
│  └─ ui_controllers/
│     ├─ master_controller.py                   # Master orchestration: verify, connect, broadcast
│     └─ slave_controller.py                    # Slave orchestration: verify, connect, copy signals
├─ data/
│  ├─ __init__.py                               # Package marker
│  └─ broker_symbols.py                         # BROKER_PRESETS + COMMON_MASTER_SYMBOLS
├─ models/
│  ├─ __init__.py                               # Re-exports AppState, TradeSignal
│  ├─ app_state.py                              # AppState facade (multiple inheritance composition)
│  ├─ base_state.py                             # BaseState: shared MT5/connection/log fields
│  ├─ master_state.py                           # MasterState: subscribers, signals, session
│  ├─ slave_state.py                            # SlaveState: risk, copy, session tracking + methods
│  └─ trade_signal.py                           # Thin TradeSignal DTO helper
├─ tests/
│  └─ test_slave_controller.py                  # Unit tests for OPEN/CLOSE ticket-map behavior
├─ assets/
│  ├─ fonts/                                    # Inter (18pt/24pt/28pt) + JetBrains Mono TTF files
│  └─ icons/                                    # activity.svg, radio.svg, users.svg, copy.svg,
│                                               #   risk.svg, symbols.svg, trades.svg,
│                                               #   chevron-down.svg, chevron-up.svg
├─ design/
│  └─ slave-desktop-a (3).jsx                   # Reference JSX design mockup (not executed)
└─ views/
   ├─ master_ui.py                              # Legacy CustomTkinter master UI (stale/unused)
   ├─ slave_ui.py                               # Legacy CustomTkinter slave UI (stale/unused)
   └─ qt/
      ├─ theme.py                               # Design tokens, fonts, global QSS builder
      ├─ primitives.py                          # Styled atoms (Card, Btn, inputs, chips, spinboxes)
      ├─ custom_widgets.py                      # Custom paint widgets: PulseDot, EquitySparkline,
      │                                         #   ActiveHoursHistogram, SweepBand
      ├─ shell.py                               # TitleBar, Sidebar, WindowShell, KPI strips,
      │                                         #   HeaderStripMaster/Slave, FooterStrip, EventLog
      ├─ ui_bridge.py                           # Thread-safe QObject signal bridge
      ├─ master_window.py                       # PySide6 Master desktop UI (MasterWindow + MasterLoginCard)
      ├─ slave_window.py                        # PySide6 Slave desktop UI (SlaveWindow + SlaveLoginCard)
      ├─ subscribers_panel.py                   # Legacy SubscribersPanel (retained; superseded by subscribers_view.py)
      └─ views/
         ├─ __init__.py                         # Empty package marker
         ├─ broadcast_view.py                   # Master BROADCAST tab
         ├─ subscribers_view.py                 # Master SUBSCRIBERS tab
         ├─ performance_view.py                 # Master PERFORMANCE tab
         ├─ copy_view.py                        # Slave COPY tab
         ├─ symbols_view.py                     # Slave SYMBOLS tab
         ├─ risk_view.py                        # Slave RISK tab
         └─ trades_view.py                      # Slave TRADES tab
```

**Not active source files:**
- `main.py` — legacy CLI slave, calls `MT5Adapter.connect(choice)` with obsolete signature
- `views/master_ui.py`, `views/slave_ui.py` — legacy CustomTkinter UI (pre-PySide6)
- `views/qt/subscribers_panel.py` — legacy Bloomberg-style panel; superseded by `subscribers_view.py`

**Stale `__pycache__` entries** for `risk_panel`, `symbol_map_panel`, `trades_panel` indicate those `.py` files were removed in Phase 1.6.

---

## 3) Runtime Architecture Overview

### High-level execution model

Two separate desktop processes; each launched independently:

1. **Master Node** (`main_master.py`):
   - Verifies identity with backend via license key
   - Logs into MT5 terminal
   - Connects socket and joins `room_master_<id>`
   - Runs polling recorder thread to detect trade opens/closes
   - Emits `test_signal` events with trade data

2. **Slave Node** (`main_slave.py`):
   - Verifies identity with backend via registered email
   - Logs into MT5 terminal
   - Connects socket and joins subscribed master's room
   - Listens for `trade_execution` events
   - Applies risk guards, copy mode, symbol mapping
   - Opens/closes local positions; maintains ticket map

### Layered architecture

1. **View layer** (`views/qt/*.py`, `views/qt/views/*.py`): Collects user input, renders status/logs, dispatches to controllers
2. **Controller layer** (`controllers/ui_controllers/*.py`): Orchestrates cloud verify, MT5 connect, socket lifecycle, signal logic
3. **Service adapters**: `MT5Adapter` (broker terminal), `SocketManager` (cloud socket)
4. **Model/state layer**: `AppState` (mutable state/log buffer), `TradeSignal` (DTO)

### Thread safety

Background threads (recorder, Socket.IO callbacks) communicate with the Qt main thread via `UIBridge`:

```python
# views/qt/ui_bridge.py
class UIBridge(QObject):
    ui_update_requested = Signal()

    def request_update(self):
        self.ui_update_requested.emit()
```

Controllers receive `update_callback = self.bridge.request_update`. When controllers call it from a background thread, the Qt signal is safely dispatched to `update_ui()` on the main thread.

---

## 4) Entry Points

### `main_master.py`

```python
app = QApplication(sys.argv)
load_fonts()
window = MasterWindow()
window.show()
sys.exit(app.exec())
```

`load_fonts()` registers Inter and JetBrains Mono TTF files from `assets/fonts/` into the Qt font database before the window is created.

### `main_slave.py`

```python
app = QApplication(sys.argv)
load_fonts()
apply_app_font(app)
window = SlaveWindow()
window.show()
sys.exit(app.exec())
```

`apply_app_font(app)` sets the application-wide default font after loading (Inter Regular).

---

## 5) Dependencies

### `requirements.txt`

```
python-socketio[client]
requests
colorama
MetaTrader5
PySide6
```

Install with: `pip install -r requirements.txt`

Note: `MetaTrader5` only works on Windows with a MetaTrader 5 terminal installed.

---

## 6) Model Layer Deep Dive

### Composition Pattern

```python
class AppState(BaseState, MasterState, SlaveState):
    def __init__(self):
        BaseState.__init__(self)
        MasterState.__init__(self)
        SlaveState.__init__(self)
```

Python multiple inheritance. All external code `from models.app_state import AppState` — no direct import of the component classes needed.

`models/__init__.py` re-exports: `AppState`, `TradeSignal`.

---

### `models/base_state.py` — `BaseState`

Shared fields for both roles:

| Field | Type | Default | Description |
|---|---|---|---|
| `mt5_login` | `int` | `0` | MT5 account login ID |
| `mt5_password` | `str` | `""` | MT5 password |
| `mt5_server` | `str` | `""` | MT5 server string |
| `mt5_path` | `str` | `""` | Path to terminal64.exe |
| `license_key` | `str` | `""` | Stored after successful verify-node (MASTER only) |
| `role` | `str` | `""` | `"MASTER"` or `"SLAVE"` — set by controller |
| `mt5_connected` | `bool` | `False` | Set `True` after `MT5Adapter.connect` succeeds |
| `socket_connected` | `bool` | `False` | Set `True` after socket connects |
| `health_state` | `str` | `"DISCONNECTED"` | `"CONNECTED"`, `"RECONNECTING"`, `"DISCONNECTED"` |
| `is_running` | `bool` | `False` | Broadcasting (master) or listening (slave) active |
| `logs` | `list[str]` | `[]` | UI log buffer; capped at 50 entries |

**`add_log(message)`**: Prefixes `[HH:MM:SS]`, appends to `logs`, trims to 50.

---

### `models/master_state.py` — `MasterState`

Master-only fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `subscribers` | `list` | `[]` | List of dicts from `GET /auth/masters/:id/subscribers`: `{ id, fullName, email, isActive, totalCopied, totalPnL }` |
| `subscriber_online_status` | `dict` | `{}` | `{ email: bool }` — `True` = currently connected socket. Updated by `subscriber_update` events |
| `master_user_id` | `str` | `""` | UUID set from `verify-node` response `id` field. Used for subscriber API calls and `GET .../profile` |
| `signals_sent` | `int` | `0` | Incremented by `MasterSignalTrackingSocket.emit_signal` on every `test_signal` emit |
| `session_start_time_master` | `str` | `""` | `HH:MM:SS` timestamp set when broadcasting starts |
| `recent_signals` | `list` | `[]` | Ring buffer of last 50 broadcast signal dicts. Each dict is a full copy of the signal payload plus `time: HH:MM:SS` |

---

### `models/slave_state.py` — `SlaveState`

Slave-only fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `risk_multiplier` | `float` | `1.0` | Volume multiplier for MULTIPLIER copy mode |
| `symbol_map` | `dict` | `{}` | `{ master_symbol: slave_symbol }` |
| `max_lot_size` | `float` | `0.0` | Max copy volume cap per trade. `0.0` = disabled (Guard 3) |
| `max_concurrent_trades` | `int` | `0` | Max open copied positions at once. `0` = disabled (Guard 1) |
| `daily_loss_limit` | `float` | `0.0` | Auto-pause threshold: pauses when `daily_pnl <= -daily_loss_limit`. `0.0` = disabled (Guard 0) |
| `daily_pnl` | `float` | `0.0` | Accumulated PnL from CLOSE signals today |
| `copying_paused_by_loss` | `bool` | `False` | Set `True` when `daily_loss_limit` hit; reset via `reset_daily_stats()` |
| `symbol_whitelist` | `list` | `[]` | Slave-side symbols allowed. Checked after mapping. Empty = all allowed (Guard 2) |
| `copy_mode` | `str` | `'MULTIPLIER'` | `'MULTIPLIER'` or `'FIXED_LOT'` |
| `fixed_lot_size` | `float` | `0.01` | Volume used when `copy_mode == 'FIXED_LOT'` |
| `reverse_copy` | `bool` | `False` | Flips BUY→SELL and SELL→BUY before execution |
| `slippage_points` | `int` | `10` | `deviation` parameter passed to MT5 order requests (broker fill tolerance). Fixed at the default `10`; the COPY-tab control was removed, so it is no longer user-editable. |
| `max_slippage_points` | `float` | `0.0` | Strict master-vs-copier drift threshold in points. `0.0` = disabled. Hard-blocks OPEN when `abs(copierPrice - masterPrice) / point` exceeds it (Guard 4). Distinct from `slippage_points`. The COPY-tab spinbox shows pips and writes `pips × POINTS_PER_PIP (100)`; the value stored here is always in points. |
| `unmapped_symbol_behavior` | `str` | `'IGNORE'` | `'IGNORE'` = skip unmapped; `'COPY_AS_IS'` = pass master symbol directly |
| `equity_floor` | `float` | `0.0` | Min equity required for OPEN. Checked via `mt5.account_info().equity`. `0.0` = disabled (Guard -1) |
| `session_start_time` | `str` | `""` | `HH:MM:SS` set when listening starts |
| `session_pnl` | `float` | `0.0` | PnL accumulated since listening started |
| `open_trades` | `list` | `[]` | Active copied positions: `{ master_ticket, slave_ticket, symbol, action, volume, open_time }` |
| `closed_trades` | `list` | `[]` | Session history: adds `pnl`, `close_time`. Capped at 50 entries |
| `master_name` | `str \| None` | `None` | Subscribed provider display name for slave header / COPY tab; set after successful `node_registered` + `GET /auth/masters/:id/profile`; cleared on failed registration or socket `DISCONNECTED` |

**`reset_daily_stats()`**: Sets `daily_pnl = 0.0`, `copying_paused_by_loss = False`, logs `[RISK] Daily stats reset.`

**`start_session()`**: Called by `toggle_listening()` on start. Sets `session_start_time` to current `HH:MM:SS`; resets `session_pnl`, `open_trades`, `closed_trades`. Logs `[SESSION] Session started at HH:MM:SS`.

**`add_open_trade(master_ticket, slave_ticket, symbol, action, volume)`**: Appends trade dict with `open_time` to `open_trades`.

**`close_trade_record(master_ticket, pnl: float)`**: Moves matching trade from `open_trades` to `closed_trades` (with `pnl` and `close_time`); accumulates `session_pnl`; caps `closed_trades` at 50 (drops oldest).

---

### `models/trade_signal.py` — `TradeSignal`

Thin DTO helper:

```python
class TradeSignal:
    def __init__(self, symbol, action, volume): ...
    def to_dict(self) -> dict: ...
```

Not used by the current active code paths; exists for potential future use.

---

## 7) MT5 Adapter Deep Dive

File: `controllers/mt5_adapter.py`

### `__init__`

Predefined `broker_paths` dict:

| Key | Path |
|---|---|
| `"XM"` | `C:\Program Files\XM Global MT5\terminal64.exe` |
| `"Vantage"` | `C:\Program Files\Vantage International MT5\terminal64.exe` |
| `"Exness"` | `C:\Program Files\MetaTrader 5 EXNESS\terminal64.exe` |
| `"Exness Slave"` | `C:\MT5_Exness_Slave\terminal64.exe` (second Exness instance) |

If broker name is not in the dict (or `"Auto-Detect"` / `"Auto-detect"`), `mt5.initialize()` is called without a path.

### `connect(broker_name, login, password, server) -> tuple[bool, str]`

1. Resolves terminal path from `broker_paths`
2. Calls `mt5.initialize(path=...)` or `mt5.initialize()` (auto)
3. Calls `mt5.login(login=int(login), password=password, server=server)` — strict login with server string
4. Returns `(True, "Connected: {name} ({server})")` or `(False, "Init/Auth Failed: {error}")`

### `get_symbol_point(symbol) -> float | None`

1. Returns `None` if `not self.connected`
2. `mt5.symbol_select(symbol, True)`, then reads `mt5.symbol_info(symbol).point`
3. Returns the point size or `None` if symbol info is unavailable
4. Used by the slave slippage drift guard (Guard 4) to convert price difference into points

### `get_execution_price(symbol, action) -> float | None`

1. Returns `None` if `not self.connected`
2. `mt5.symbol_select(symbol, True)`, then reads `mt5.symbol_info_tick(symbol)`
3. Returns `tick.ask` for BUY, `tick.bid` for SELL; `None` if the tick is unavailable
4. Provides the copier fill-side quote for the slippage drift guard

### `execute_trade(symbol, action, volume, deviation: int = 10) -> OrderSendResult | None`

1. Skips if `not self.connected`
2. `mt5.symbol_select(symbol, True)` ensures symbol is in Market Watch
3. Fetches current tick price
4. Determines `ORDER_TYPE_BUY` or `ORDER_TYPE_SELL`
5. Sends `mt5.order_send()` with:
   - `TRADE_ACTION_DEAL`, `magic=234000`, `comment="TradeSync Copy"`
   - `ORDER_TIME_GTC`, `ORDER_FILLING_IOC`
   - `deviation` from parameter (default 10; configurable via `slippage_points` in slave state)
6. Returns MT5 result object or `None`

### `close_trade(ticket, symbol) -> OrderSendResult | None`

1. `mt5.positions_get(ticket=ticket)` — fetches open position
2. Computes opposite order type (`BUY` if was SELL, `SELL` if was BUY; checks `pos.type == 0`)
3. `mt5.symbol_select(symbol, True)` + fetches tick
4. Sends close request with:
   - `position=ticket`, `deviation=20` (hardcoded; not using slippage setting)
   - `magic=234000`, `comment="TradeSync Close"`
   - `ORDER_TIME_GTC`, `ORDER_FILLING_IOC`
5. Returns MT5 result object or `None`

**Critical:** `magic=234000` is the loop-prevention sentinel. The master recorder skips any position with this magic number to avoid broadcasting trades it placed itself.

---

## 8) Socket Manager Deep Dive

File: `controllers/socket_manager.py`

### Constructor

```python
SocketManager(server_url, mt5_adapter, node_role=None, node_identifier=None, health_callback=None, registration_callback=None)
```

- `socketio.Client(reconnection=True, reconnection_attempts=0, reconnection_delay=1, reconnection_delay_max=8)` — infinite reconnection with 1–8s exponential backoff
- Stores `node_role`, `node_identifier` for auto-registration on every connect/reconnect
- Registers standard internal handlers on init: `connect`, `disconnect`, `node_registered`
- `_registered_events: set` — tracks registered custom events to prevent duplicate listeners

### Methods

**`register_handler(event_name, handler)`**: Registers a custom Socket.IO event handler. Guards against duplicate registration — if `event_name` is already in `_registered_events`, the call is a no-op.

**`set_node_context(role, identifier)`**: Updates `node_role` and `node_identifier` after construction. Called by controllers before `connect()`.

**`connect()`**: Calls `sio.connect(server_url, transports=['websocket'])`. Sets health to `"RECONNECTING"` before attempt; if exception, sets to `"DISCONNECTED"`.

**`emit_signal(signal_dict)`**: Injects `trace_id` (UUID4) if not already present, then calls `sio.emit('test_signal', signal_dict)`.

**`emit_event(event_name, payload)`**: Generic emitter for additive events. Injects `trace_id` if missing, logs `emit_event`, then `sio.emit(event_name, payload)`. Used by the slave to send `trade_execution_ack`.

### Event Handlers

**`on_connect()`**:
1. Sets `is_connected = True`, `_reconnect_attempts = 0`
2. Calls `_set_health("CONNECTED")` → triggers `health_callback`
3. If `node_role` and `node_identifier` are set: automatically emits `register_node { role, identifier }`
4. This fires on **both initial connection and every reconnect** — ensuring room re-registration after backend restarts

**`on_disconnect()`**:
1. Sets `is_connected = False`, increments `_reconnect_attempts`
2. Calls `_set_health("RECONNECTING")`

**`on_node_registered(data)`**:
- `data.success == True`: prints `[SOCKET] Registered as {role} in room: {room}` in cyan
- `data.success == False`: prints `[SOCKET] Registration FAILED: {error}` in red
- If `self.state` is set, also calls `self.state.add_log(msg)` (slave sets `socket.state` in `connect_cloud`)
- If `registration_callback` is set, invokes it with `data` (slave uses this to resolve `master_name`)

Note: Master controller does not set `socket.state` or `registration_callback`; slave does both.

---

## 9) Master Recorder Deep Dive

File: `master_recorder.py`

Class `MasterRecorder(socket_client)`:

- `tracked_tickets: dict[ticket -> symbol]`
- `is_running: bool = True`
- `magic_number: int = 234000`

### `get_active_positions() -> dict[ticket -> Position]`

Returns current open MT5 positions as a dict. Returns `{}` if none.

### `start_monitoring()`

Core polling loop (`sleep(0.5)`):

1. **Bootstrap**: Load current positions; add non-self-copied tickets to `tracked_tickets` (filter `pos.magic != 234000`)
2. **Open detection** (`current_tickets - known_tickets`): For each new ticket, if `pos.magic != 234000`, register and call `broadcast_event('OPEN', pos=pos)`
3. **Close detection** (`known_tickets - current_tickets`): For each gone ticket:
   - Sum `deal.profit` across all `mt5.history_deals_get(position=t)` deals for PnL
   - Capture the last deal `price` as the closing reference (`close_price`)
   - Call `broadcast_event('CLOSE', ticket=t, symbol=symbol, pnl=pnl, master_price=close_price)`
   - Remove from `tracked_tickets`

### `broadcast_event(event_type, pos=None, ticket=None, symbol=None, pnl=0.0, master_price=None)`

Builds payload dict:

```python
{
    "event": "OPEN" | "CLOSE",
    "master_ticket": pos.ticket or ticket,
    "symbol": pos.symbol or symbol,
    "action": "BUY" | "SELL" | "CLOSE",  # CLOSE payload has action="CLOSE"
    "volume": pos.volume or 0,
    "pnl": round(pnl, 2),
    "trace_id": str(uuid4()),
    "masterPrice": float(...),  # added only when available
}
```

`masterPrice` (additive, optional): OPEN uses `pos.price_open`; CLOSE uses the captured closing deal price (`master_price` arg). Omitted when no price is available. Consumed by the slave slippage drift guard and persisted on the backend OPEN `TradeLog` row.

Emission strategy:
- `client.emit_signal(data)` if the client has that method (preferred — uses `MasterSignalTrackingSocket`)
- Falls back to `client.sio.emit('test_signal', data)`

**Note:** CLOSE payload action field is `"CLOSE"` — not `"BUY"` or `"SELL"`. Backend and slave handle this correctly via the `event` field.

---

## 10) UI Controller Layer Deep Dive

### `controllers/ui_controllers/master_controller.py`

#### `MasterSignalTrackingSocket`

Wrapper around `SocketManager` that intercepts `emit_signal` calls:

1. Increments `state.signals_sent`
2. Calls `socket_manager.emit_signal(signal_dict)`
3. Copies the full signal dict, adds `time: HH:MM:SS`
4. Appends to `state.recent_signals` (ring buffer, cap 50)

This is the object passed to `MasterRecorder` as `socket_client`.

#### `MasterController.__init__`

- Creates `AppState()`, sets `state.role = "MASTER"`
- Creates `MT5Adapter()`
- `socket = None`, `recorder = None` (lazy init)
- Stores `update_callback` as `self.update_ui`
- Creates `_stop_event = threading.Event()`

#### `MasterController.login_mt5(broker, login, password, server, license_key)`

**Stage 1 — Cloud verify:**
1. Calls `POST /auth/verify-node` with `{ role: 'MASTER', identifier: license_key, trace_id: uuid4() }`
2. Accepts status `200` or `201`
3. On failure: logs rejection message and returns `False`
4. On success: reads `id` from response → sets `state.master_user_id`
5. Logs warning if `id` is missing from response
6. Reads `fullName` from response for display log

**Stage 2 — MT5 login:**
7. Calls `MT5Adapter.connect(broker, login, password, server)`
8. On success: sets `state.mt5_connected = True`, stores `state.license_key = license_key`
9. Calls `connect_cloud(license_key)` to establish socket
10. Returns `True`

**Fallback `_resolve_master_user_id(full_name)` (not called in normal flow):**
- Calls `GET /auth/masters` and matches by `fullName`
- Sets `state.master_user_id` if exactly one match found
- Present in code as a fallback; not invoked since verify-node now returns `id`

#### `MasterController.connect_cloud(identifier)`

1. Creates `SocketManager` with `node_role="MASTER"`, `node_identifier=identifier`, `health_callback=self._on_health_change`
2. Calls `self.socket.set_node_context("MASTER", identifier)`
3. Registers `subscriber_update` handler via `socket.register_handler()`:
   - Updates `state.subscriber_online_status[email] = online`
   - Logs to terminal with `Fore.CYAN` (online) or `Fore.YELLOW` (offline)
   - Calls `state.add_log(msg)` and `update_ui()`
4. Calls `socket.connect()` — on connect, `SocketManager` auto-emits `register_node { role: 'MASTER', identifier }`

#### `MasterController.fetch_subscribers()`

1. Reads `state.master_user_id`; skips if not set
2. `GET http://localhost:3000/auth/masters/{master_id}/subscribers`
3. On `200`: sets `state.subscribers = response.json()`
4. Logs count to terminal + AppState

#### `MasterController.revoke_subscriber(slave_id: str)`

1. Reads `state.license_key`; aborts if missing
2. `POST /auth/node-action/revoke-subscriber` with `{ masterLicenseKey, slaveId }`
3. Accepts `200` or `201`
4. Logs success or failure to AppState; calls `update_ui()` then `fetch_subscribers()` to refresh list

#### `MasterController.toggle_broadcasting()`

**Start:**
1. Sets `state.is_running = True`
2. Sets `state.session_start_time_master` to current `HH:MM:SS`
3. Resets `state.signals_sent = 0`
4. Clears `_stop_event`
5. Creates `MasterSignalTrackingSocket(self.socket, self.state)`
6. Creates `MasterRecorder(tracking_socket)`
7. Starts daemon thread → `_run_recorder()`

**Stop:**
1. Sets `state.is_running = False`
2. Sets `recorder.is_running = False`

#### `MasterController._on_health_change(health_state)`

Sets `state.health_state`, updates `state.socket_connected`, adds log, calls `update_ui()`.

---

### `controllers/ui_controllers/slave_controller.py`

#### `SlaveController.__init__`

- Creates `AppState()`, sets `state.role = "SLAVE"`
- Creates `MT5Adapter()`
- `socket = None` (lazy init)
- `ticket_map: dict = {}` — `{ master_ticket: slave_ticket }` for close symmetry

#### `SlaveController.login_mt5(broker, login, password, server, email_identifier)`

**Stage 1 — Cloud verify:**
1. `POST /auth/verify-node` with `{ role: 'SLAVE', identifier: email_identifier, trace_id: uuid4() }`
2. Accepts `200` or `201`
3. On failure: logs rejection and returns `False`
4. On success: logs `fullName` from response

**Stage 2 — MT5 login:**
5. Calls `MT5Adapter.connect(broker, login, password, server)`
6. On success: sets `state.mt5_connected = True`
7. Calls `connect_cloud(email_identifier)` and returns `True`

Note: SLAVE does not set `state.master_user_id` — the master ID is handled by the backend room routing. SLAVE only needs its registered email.

#### `SlaveController._on_health_change(health_state)`

Sets `state.health_state`, updates `state.socket_connected` (`True` only when `CONNECTED`). Clears `state.master_name` when `health_state == "DISCONNECTED"`. Adds log, calls `update_ui()`.

#### `SlaveController.connect_cloud(identifier)`

1. Creates `SocketManager` with `node_role="SLAVE"`, `node_identifier=identifier`, `health_callback=self._on_health_change`, `registration_callback=self._on_node_registered`
2. Calls `socket.set_node_context("SLAVE", identifier)`
3. Sets `socket.state = self.state` so `node_registered` logs appear in the event panel
4. Registers `trade_execution` handler: `socket.register_handler('trade_execution', self.on_trade_signal)`
5. Calls `socket.connect()` — on connect, auto-emits `register_node { role: 'SLAVE', identifier: email }`

#### `SlaveController._on_node_registered(data)` (display only)

On `success: true`: parses master id from `room` (`room_master_<id>`), fetches `GET /auth/masters/:id/profile`, sets `state.master_name` to `fullName` (falls back to master id if profile fetch fails), calls `update_ui()`.

On `success: false`: clears `state.master_name`, calls `update_ui()`.

Does not alter socket routing or trade execution.

#### `SlaveController.toggle_listening()`

**Start:**
1. Sets `state.is_running = True`
2. Calls `state.start_session()` (resets session PnL, open/closed trade lists)
3. Logs listening started with current `risk_multiplier`

**Stop:**
1. Sets `state.is_running = False`
2. Logs `[SESSION] Ended. Session PnL: $X.XX`

#### `SlaveController.add_symbol_mapping(master_sym, slave_sym)` / `remove_mapping(master_sym)`

Mutate `state.symbol_map` and log updates.

#### `SlaveController.on_trade_signal(data)`

Core copy engine. Called from Socket.IO event thread.

**Full execution flow:**

```
1. Extract trace_id (from data or new UUID4)
2. Structured log: trade_signal_received
3. Return early if not state.is_running

[RISK GUARDS — OPEN only unless noted]
Guard -1: Equity floor
  → if equity_floor > 0: check mt5.account_info().equity
  → if equity < floor: block OPEN, log [RISK], return

Guard 0: Daily loss pause
  → if copying_paused_by_loss: block OPEN, log [RISK], return

Guard 1: Max concurrent trades
  → if len(ticket_map) >= max_concurrent_trades > 0: block OPEN, log [RISK], return

[SYMBOL MAPPING]
  → if symbol_map is empty: use master_symbol as-is (copy all symbols)
  → if symbol in map: translate to slave_symbol
  → if symbol NOT in map:
      - 'COPY_AS_IS': use master_symbol directly
      - 'IGNORE': log + return

Guard 2: Symbol whitelist (OPEN only)
  → if symbol_whitelist non-empty and slave_symbol not in list: skip, log [RISK], return

[OPEN execution]
  → Volume calculation:
      - MULTIPLIER: copy_volume = master_volume * risk_multiplier
      - FIXED_LOT: copy_volume = fixed_lot_size
  → Floor volume at 0.01
  → Guard 3: if max_lot_size > 0 and copy_volume > max_lot_size: clamp, log [RISK]
  → Reverse copy: if reverse_copy and action in (BUY, SELL): flip action
  → Guard 4: Strict slippage drift (OPEN only)
      - threshold (state.max_slippage_points) is in points; the COPY-tab UI sets it as pips × 100
      - master_price = data.get('masterPrice')
      - copier_price = MT5Adapter.get_execution_price(slave_symbol, exec_action)
      - point = MT5Adapter.get_symbol_point(slave_symbol)
      - if all valid: actual = abs(copier_price - master_price) / point
          - if max_slippage_points > 0 and actual > max_slippage_points:
                block OPEN, log [RISK] slippage_guard_blocked,
                emit trade_execution_ack(status=BLOCKED_SLIPPAGE, slippageBlocked=True), return
      - if any value missing/invalid: log slippage_check_skipped_missing_price, continue (compat)
  → MT5Adapter.execute_trade(slave_symbol, exec_action, new_vol, deviation=slippage_points)
  → if retcode 10009 (success):
      - ticket_map[master_ticket] = res.order
      - state.add_open_trade(...)
      - emit trade_execution_ack(status=EXECUTED, copierPrice, slippagePointsActual)
  → else: log FAILED, emit trade_execution_ack(status=FAILED)

[CLOSE execution]
  → s_ticket = ticket_map.get(master_ticket)
  → if no mapping: log warning (orphaned close), return
  → MT5Adapter.close_trade(s_ticket, slave_symbol)
  → if retcode 10009 (success):
      - del ticket_map[master_ticket]
      - pnl_value = float(data.get('pnl', 0.0) or 0.0)   ← from socket payload
      - state.daily_pnl += pnl_value
      - state.close_trade_record(master_ticket, pnl_value)
      - if daily_loss_limit > 0 and daily_pnl <= -daily_loss_limit:
            state.copying_paused_by_loss = True
            log [RISK] DAILY LOSS LIMIT HIT

5. update_ui() at end
```

---

## 11) View Layer Deep Dive

### Thread Safety Model

All UI updates go through `UIBridge`. Background threads call `update_callback()` → `bridge.request_update()` → Qt signal → `update_ui()` on main thread. No direct widget mutation from background threads.

---

### `views/qt/ui_bridge.py`

```python
class UIBridge(QObject):
    ui_update_requested = Signal()
    def request_update(self):
        self.ui_update_requested.emit()
```

Passed to controllers as `update_callback`. Controllers call it after state mutations. Windows connect `bridge.ui_update_requested` to their `update_ui` slot.

---

### `views/qt/master_window.py` — `MasterWindow`

**Login card:** `MasterLoginCard` (fixed 400px width)
- Fields: License key (`MonoInput`, placeholder `TSP-XXXX-XXXX`), MT5 account ID, MT5 password, Server string, Broker path (dropdown: Vantage/XM/Exness/Exness Slave/Auto-Detect)
- Inline validation before submit: login must be digits; license key must match `^TSP-[A-Z0-9]{4}-[A-Z0-9]{4}$`

**Dashboard layout:**
- `TitleBar(role="Master Node", window=self)`
- `WindowShell(role='master')` — sidebar keys: `broadcast`, `subscribers`, `performance`
- Three real views injected via `_replace_shell_placeholder()`:
  - `BroadcastView(controller)` → key `"broadcast"`
  - `SubscribersView(controller)` → key `"subscribers"`
  - `PerformanceView(controller)` → key `"performance"`

**Timers:**
- `ui_timer` — 500ms, calls `update_ui()` (refresh UI state)
- `session_timer` — 1000ms, calls `_update_session_clock()` (elapsed broadcast time)

**Key methods:**

`show_dashboard()`:
1. Switches to dashboard stack widget
2. Resets `_master_header_signature` and log cursor
3. Calls `load_performance_stats()` (HTTP `GET /auth/masters/:id/profile`)
4. Schedules `fetch_subscribers()` 1000ms after (via `QTimer.singleShot`)

`load_performance_stats()`:
- Uses `state.master_user_id`; skips if not set
- `GET http://localhost:3000/auth/masters/{master_id}/profile` (timeout 5s)
- Stores `response.json()` in `self.performance_data`
- Calls `refresh_performance(self.performance_data)`

`refresh_performance(stats: dict)`:
- Calls `performance_view.sync_from_state(stats, state.recent_signals)`

`update_ui()` (500ms slot):
1. Guard: skip if dashboard widget not visible
2. Update footer connection indicator
3. `_master_sync_header_strip()` — rebuild `HeaderStripMaster` if variant/name/elapsed changed
4. `_apply_master_header_profile()` — populate handle, instruments, risk, ROI proxy (uses `winRate`)
5. Update shell KPI strip: `signals_sent`, `subscriber count`, `win_rate`, `total_pnl`, `avg_volume`
6. Tail new log lines into `shell.event_log` (cursor-based, avoids re-rendering old lines)
7. `broadcast_view.sync_from_state()`
8. `refresh_performance(performance_data)`
9. `_sync_subscriber_activity()` — detect status changes and call `subscribers_view.log_activity(email, online)`
10. `subscribers_view.refresh_display()`

`_master_log_category(line)` maps log lines to EventLog filter keys:
- `ERR`: contains ERROR/FAILED/REJECTED
- `MT5`: contains [RISK] (reused for risk events in master)
- `SESSION`: contains SOCKET/CONNECTED/DISCONNECTED
- `SIGNAL`: contains OPEN/CLOSE/SIGNAL
- else `INFO`

---

### `views/qt/slave_window.py` — `SlaveWindow`

**Login card:** `SlaveLoginCard` (fixed 400px width)
- Fields: Registered email, MT5 account ID, MT5 password, Server string, Broker path (dropdown: Auto-detect/Vantage/XM/Exness/Exness Slave)
- No regex validation on login submit; error shown in `error_label` on failure

**Dashboard layout:**
- `TitleBar(role="Slave Node", window=self)`
- `WindowShell(role='slave')` — sidebar keys: `copy`, `symbols`, `risk`, `trades`
- Four real views injected via `_replace_shell_placeholder()`:
  - `CopyView(controller)` → key `"copy"`
  - `SymbolsView(controller)` → key `"symbols"`
  - `RiskView(controller)` → key `"risk"`
  - `TradesView(controller)` → key `"trades"`

**Timers:**
- `session_timer` — 1000ms, calls `_tick_session_clock()` → updates `shell.kpi.update_kpis(session=elapsed)`
- No separate 500ms `ui_timer`; `update_ui()` is driven by `UIBridge` signal from controller thread

`_slave_log_category(line)` maps log lines to EventLog filter keys:
- `MT5`: contains [RISK], MT5 Error, MT5 login
- `COPY`: contains OPEN SUCCESS, [COPY], Copying, CLOSE SUCCESS, SOCKET
- `SESSION`: contains [SESSION]
- `ERR`: contains DAILY LOSS, FAILED, CLOUD REJECTED, CLOUD ERROR
- else `INFO`

`_slave_header_variant(state) -> str`:
- Both connected + running → `"listening"`
- Both connected + not running → `"idle"`
- MT5 connected + socket not + RECONNECTING → `"reconnect"`
- else → `"error"`

`update_ui()`:
1. Guard: skip if dashboard not visible
2. Footer connection indicator
3. `_slave_sync_header_strip()` — rebuild `HeaderStripSlave` if variant/name changed
4. Shell KPI update: `session_pnl`, `open_trades` count, `closed_trades` count
5. Tail log lines into EventLog
6. `copy_view.sync_from_state()`
7. `symbols_view.refresh_display()`
8. `risk_view.refresh_display()`
9. `trades_view.refresh_display()`

---

### `views/qt/views/broadcast_view.py` — `BroadcastView`

Master BROADCAST stack page. Three cards:

1. **Broadcast control card**: `START/STOP BROADCASTING` button (`Btn`), `SweepBand` animation (visible when running)
2. **License card**: `MiniChip("Active · 5 seats")` (static), `license_lbl` (reads from `state.license_key`)
3. **MT5 account card**: Reads `mt5.account_info()` live: account ID, server, balance, equity. Balance shown in accent/danger color based on equity vs balance.

`sync_from_state()`: Called by `MasterWindow.update_ui()`. Reads `state.is_running`, `state.license_key`, calls `mt5.account_info()` if `state.mt5_connected`.

---

### `views/qt/views/subscribers_view.py` — `SubscribersView`

Master SUBSCRIBERS stack page. Three cards:

1. **Summary card**: `CountChip` for TOTAL / ONLINE / SIGNALS SENT; `↻ REFRESH` ghost button
2. **Roster table**: 6 columns — NAME, EMAIL, STATUS (`StatusPill`: `broadcasting`=LIVE or `idle`=OFFLINE), COPIED, P&L (accent/danger), ACTION (revoke `×` button via `GhostIconBtn`)
3. **Activity log card**: `QTextEdit` (read-only HTML); capped at 20 entries

**`log_activity(email, online)`**: Appends HTML entry with timestamp, email, and `→ ONLINE/OFFLINE` in color. Auto-scrolls to bottom. Called by `MasterWindow._sync_subscriber_activity()` when status changes are detected.

**`refresh_display()`**: Rebuilds the table from `state.subscribers` and `state.subscriber_online_status`. Updates TOTAL, ONLINE, SIGNALS SENT chips.

---

### `views/qt/views/performance_view.py` — `PerformanceView`

Master PERFORMANCE stack page. Three sections:

1. **KPI grid (3×2)**: `_KpiCard` widgets for Total trades, Closed trades, Win rate, Total P&L, Avg volume, Subscribers
2. **Analytics container** (conditionally visible): Equity sparkline (`EquitySparkline`), Risk metrics list (`lbl_drawdown`, `lbl_avg_day`, `lbl_losing_streak`, `lbl_best_day`), Active hours histogram (`ActiveHoursHistogram`) + `lbl_hours_summary`. Visible only when both `riskMetrics` and `equitySparkline` are present in stats.
3. **Recent broadcasts table**: 7 columns — TIME, SYMBOL, ACTION (`TradeChip`), VOLUME, STATUS (`StatusChip`), P&L, ACKED

**`sync_from_state(stats: dict, recent_signals: list)`**:

KPI update from `stats` dict (profile API response):
- `totalTrades`, `closedTrades`, `winRate`, `totalPnL`, `avgVolume`, `subscriberCount`

Analytics section: shown when `stats.riskMetrics` and `stats.equitySparkline` are both truthy. Active hours accepts both dict format (`{ bars: [...] }`) and string format from API.

**Recent broadcasts list-based queue matcher**: Iterates `recent_signals` in order. For OPEN signals: appends new unified trade with `_is_closed=False`. For CLOSE signals: reverse-iterates `unified_trades` to find latest unmatched OPEN by ticket (primary) or symbol+volume (fallback). On match: sets `_is_closed=True`, merges `pnl`, `close_time`. Orphaned CLOSEs (no matching OPEN) are appended as-is. Displays last 10 unified trades (reversed = newest first).

---

### `views/qt/views/copy_view.py` — `CopyView`

Slave COPY stack page. Three cards:

1. **Master card**: Shows `state.master_name` or connection status text
2. **Copy settings card** (accent):
   - `SegmentedToggle([("MULTIPLIER", "MULTIPLIER"), ("FIXED LOT", "FIXED_LOT")])` — sets `state.copy_mode`
   - `DarkSpinbox` for risk multiplier (0.01–10.0), fixed lot (0.01–100.0), and Max Slippage Drift (0–500 integer **pips**; 0 = off). The drift spinbox displays pips and writes `pips × POINTS_PER_PIP (100)` into `state.max_slippage_points` (points); `sync_from_state` divides by `POINTS_PER_PIP` to display. The old "Slippage (points)" spinbox was removed (`state.slippage_points` keeps its default `10` for MT5 `deviation`).
   - `DarkCheckBox("Invert BUY ↔ SELL on execution")` for `state.reverse_copy`
   - Fixed lot spinbox column hidden when mode is MULTIPLIER; shown when FIXED_LOT
3. **Listen control**: `START/STOP LISTENING` button + `SweepBand` animation

`sync_from_state()`: Mirrors all `AppState` fields into widgets without feedback loops (uses `_syncing_ui` guard and `blockSignals`).

Spinbox change handlers directly mutate `state.*` fields:
- `_on_copy_mode_changed` → `state.copy_mode`
- `_on_multiplier_changed` → `state.risk_multiplier`
- `_on_fixed_lot_changed` → `state.fixed_lot_size`
- `_on_max_slippage_changed` → `state.max_slippage_points` (float, points = UI pips × `POINTS_PER_PIP`)
- `_on_reverse_toggled` → `state.reverse_copy`

---

### `views/qt/views/symbols_view.py` — `SymbolsView`

Slave SYMBOLS stack page. Three cards:

1. **Broker preset loader card** (accent):
   - Two `DarkDropdown` widgets: Master's broker + Your broker (same `BROKER_LIST`)
   - `BROKER_LIST = ["Select broker...", "Vantage", "XM", "Exness", "IC Markets", "Pepperstone", "Custom"]`
   - `"Custom"` is in UI list but not in `BROKER_PRESETS`; clicking Load Preset with Custom selected is a no-op
   - On Load Preset: iterates `BROKER_PRESETS[master_broker]`, looks up corresponding slave sym from `BROKER_PRESETS[my_broker]`, adds only if master_broker_sym not already in `state.symbol_map`
2. **Symbol mappings card**:
   - `LineInput` for master symbol → slave symbol + Add button
   - `QTableWidget` (3 cols: Master Symbol, Your Symbol, × remove button)
   - `_map_sig_cache` prevents unnecessary re-renders (only rebuilds when map changes)
3. **Unmapped symbols card**: `DarkDropdown` ["Ignore (skip trade)", "Copy as-is (same name)"] → `state.unmapped_symbol_behavior`

`refresh_display()`: Called by `SlaveWindow.update_ui()`. Only rebuilds table if `symbol_map` signature changed.

---

### `views/qt/views/risk_view.py` — `RiskView`

Slave RISK stack page. Three cards:

1. **Trade guards card** (accent, 2×2 grid): Each guard is a cell with title, subtitle, `DarkCheckBox("On")` toggle, `DarkSpinbox`. Guards: equity floor, max concurrent trades, daily loss limit, max lot cap. When checkbox is unchecked, the corresponding `state.*` is set to 0/0.0. When checked, spinbox is enabled; if current value is ≤ 0, sets to a sensible default.
2. **Daily loss status card**: `lbl_daily_pnl`, `lbl_copy_status` (Active/Paused), warning card (hidden unless `copying_paused_by_loss`), "Reset & resume copying" button → `state.reset_daily_stats()`
3. **Symbol whitelist card**: `LineInput` + Add button → `state.symbol_whitelist.append(sym)`. `MiniChip` + `GhostIconBtn(×)` per symbol in a grid. Hint: "Leave empty to allow all mapped symbols."

`refresh_display()`: Called by `SlaveWindow.update_ui()`. Syncs guard checkboxes and spinboxes from state; refreshes daily PnL display and warning card.

---

### `views/qt/views/trades_view.py` — `TradesView`

Slave TRADES stack page. Two-column layout (`QHBoxLayout`):

**Left — Open positions card**: Session summary bar (OPEN chip, CLOSED chip, session P&L label, session start time label, info tooltip), then `table_open` (5 cols: TICKET, SYMBOL, ACTION (`TradeChip`), VOLUME, OPENED)

**Right — Session history card**: `table_closed` (7 cols: TICKET, SYMBOL, ACTION (`TradeChip`), VOLUME, P&L, OPENED, CLOSED)

`refresh_display()`: Rebuilds both tables from `state.open_trades` and `state.closed_trades` (reversed for newest-first in history). Updates count chips and session P&L/time labels.

---

## 12) Symbol Mapping Data (`data/broker_symbols.py`)

### `BROKER_PRESETS`

Maps broker name → standard symbol → broker-specific symbol name:

| Standard | Vantage | XM | Exness | IC Markets | Pepperstone |
|---|---|---|---|---|---|
| `XAUUSD` | `XAUUSD` | `XAUUSD` | `XAUUSDm` | `XAUUSD` | `XAUUSD` |
| `XAGUSD` | `XAGUSD` | `XAGUSD` | `XAGUSDm` | `XAGUSD` | `XAGUSD` |
| `EURUSD` | `EURUSD` | `EURUSD` | `EURUSDm` | `EURUSD` | `EURUSD` |
| `GBPUSD` | `GBPUSD` | `GBPUSD` | `GBPUSDm` | `GBPUSD` | `GBPUSD` |
| `USDJPY` | `USDJPY` | `USDJPY` | `USDJPYm` | `USDJPY` | `USDJPY` |
| `US30` | `US30` | `US30Cash` | `US30m` | `US30` | `US30Cash` |
| `US100` | `NAS100` | `US100Cash` | *(missing)* | `US100` | `NAS100` |
| `BTCUSD` | `BTCUSD` | `BTCUSD` | `BTCUSDm` | `BTCUSD` | `BTCUSD` |

Note: Exness preset does not include `US100`. Vantage and Pepperstone map `US100` → `NAS100`.

### `COMMON_MASTER_SYMBOLS`

```python
["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY", "US30", "US100", "BTCUSD", "ETHUSD"]
```

Used as reference for preset loading display. `ETHUSD` is listed here but not in any broker preset (brokers use `ETHUSD`, `ETHUSDm`, etc.).

---

## 13) Testing

### `tests/test_slave_controller.py`

Uses `unittest.TestCase`. Run from `trade-sync-client` root: `python -m pytest tests/` or `python tests/test_slave_controller.py`.

**`FakeMT5`**: Mock adapter. `__init__(point=0.01, execution_price=2000.0)` for slippage simulation. `execute_trade(symbol, action, volume, deviation=10)` records calls (including `deviation`) and returns `SimpleNamespace(retcode=10009, order=555, comment='ok')`. `close_trade` returns `SimpleNamespace(retcode=10009, comment='ok')`. `get_symbol_point` returns the configured point; `get_execution_price` returns the configured price. The slave controller never attaches a socket in tests, so `_emit_execution_ack` no-ops safely.

**Tests:**

1. `test_open_maps_master_ticket_to_slave_ticket`:
   - Sends OPEN signal for `XAUUSD` ticket `1001`
   - Asserts `ticket_map[1001] == 555`
   - Asserts 1 MT5 execute call

2. `test_close_uses_ticket_map_and_removes_mapping`:
   - Pre-seeds `ticket_map[1001] = 555`
   - Sends CLOSE signal for ticket `1001`
   - Asserts 1 MT5 close call
   - Asserts `1001` removed from `ticket_map`

3. `test_open_blocked_when_slippage_exceeds_threshold`:
   - `max_slippage_points = 10`, master 2000.0 vs copier 2002.0, point 0.01 → 200 pts drift
   - Asserts 0 execute calls and ticket not mapped (Guard 4 hard-block)

4. `test_open_allowed_when_slippage_within_threshold`:
   - Master 2000.0 vs copier 2000.05, point 0.01 → 5 pts drift ≤ 10
   - Asserts 1 execute call and ticket mapped

5. `test_open_executes_when_master_price_missing`:
   - No `masterPrice` in payload → guard skips, trade proceeds
   - Asserts 1 execute call and ticket mapped

---

## 14) End-to-End Communication Contracts

### A) Client ↔ Backend HTTP

| Endpoint | Caller | Auth | When |
|---|---|---|---|
| `POST /auth/verify-node` | Both controllers | Public | Pre-login, verifies license/email + active status |
| `GET /auth/masters/:id/subscribers` | `MasterController.fetch_subscribers` | Public | Dashboard load and after revoke |
| `POST /auth/node-action/revoke-subscriber` | `MasterController.revoke_subscriber` | Public (license key) | Revoke button in SubscribersView |
| `GET /auth/masters/:id/profile` | `MasterWindow.load_performance_stats` | Public | Dashboard load |
| `GET /auth/masters` | `MasterController._resolve_master_user_id` | Public | Fallback (not used in normal flow) |

All HTTP calls use `requests` with hardcoded `http://localhost:3000`. Timeouts: 5–10s.

**`verify-node` response consumed by client:**

```json
{
  "message": "Node Verified",
  "role": "MASTER | SLAVE",
  "fullName": "string",
  "id": "uuid-string",
  "trace_id": "uuid-string"
}
```

`id` is read by `MasterController` to populate `state.master_user_id`. SLAVE does not read `id`.

**Revoke request:**

```json
{ "masterLicenseKey": "<TSP-XXXX-XXXX>", "slaveId": "<uuid>" }
```

### B) Client ↔ Backend Socket

**Emitted by client:**

`register_node` — emitted automatically by `SocketManager.on_connect()` on every connect/reconnect:
```json
{ "role": "MASTER | SLAVE", "identifier": "<license_key | email>" }
```

`test_signal` — emitted by `MasterSignalTrackingSocket.emit_signal()` → `SocketManager.emit_signal()`:
```json
{
  "event": "OPEN | CLOSE",
  "master_ticket": 123456,
  "symbol": "XAUUSD",
  "action": "BUY | SELL | CLOSE",
  "volume": 0.1,
  "pnl": 0.0,
  "masterPrice": 2418.40,
  "trace_id": "uuid-string"
}
```

`trade_execution_ack` — emitted by `SlaveController._emit_execution_ack()` → `SocketManager.emit_event()` after each OPEN attempt:
```json
{
  "master_ticket": 123456,
  "slave_ticket": 555,
  "symbol": "XAUUSD.m",
  "status": "EXECUTED | BLOCKED_SLIPPAGE | FAILED",
  "masterPrice": 2418.40,
  "copierPrice": 2418.55,
  "slippagePointsConfigured": 20.0,
  "slippagePointsActual": 1.5,
  "slippageBlocked": false,
  "trace_id": "uuid-string"
}
```

**Received by client:**

`node_registered` — handled by `SocketManager.on_node_registered()`:
```json
{ "success": true | false, "role": "...", "room": "...", "timestamp": "...", "error": "..." }
```

`trade_execution` — handled by `SlaveController.on_trade_signal()`:
```json
{
  "event": "OPEN | CLOSE",
  "master_ticket": 123456,
  "symbol": "XAUUSD",
  "action": "BUY | SELL | CLOSE",
  "volume": 0.1,
  "pnl": 0.0,
  "trace_id": "uuid-string",
  "signalId": 101,
  "server_ts": 1748000000000
}
```

Slave reads: `event`, `master_ticket`, `symbol`, `action`, `volume`, `pnl` (for daily tracking), `trace_id` (for structured logs). `signalId` and `server_ts` are ignored.

`subscriber_update` — handled by `MasterController.connect_cloud` inline handler:
```json
{ "slaveEmail": "string", "online": true | false, "timestamp": "ISO string" }
```

---

## 15) Log Categorization Reference

### Master EventLog filter categories

| Category | Trigger |
|---|---|
| `SIGNAL` | OPEN, CLOSE, SIGNAL in log line |
| `SESSION` | SOCKET, CONNECTED, DISCONNECTED in log line |
| `MT5` | [RISK] in log line |
| `ERR` | ERROR, FAILED, REJECTED in log line |
| `INFO` | All other lines |

### Slave EventLog filter categories

| Category | Trigger |
|---|---|
| `COPY` | OPEN SUCCESS, [COPY], Copying, CLOSE SUCCESS, SOCKET |
| `SESSION` | [SESSION] |
| `MT5` | [RISK], MT5 Error, MT5 login |
| `ERR` | DAILY LOSS, FAILED, CLOUD REJECTED, CLOUD ERROR |
| `INFO` | All other lines |

---

## 16) Current Constraints and Known Risks

1. **Hardcoded backend URL**: All controllers and SocketManager use `http://localhost:3000` directly.
2. **`close_trade` deviation hardcoded**: `MT5Adapter.close_trade` uses `deviation=20` regardless of `state.slippage_points`. Note: the `max_slippage_points` drift guard (Guard 4) applies to OPEN only, not CLOSE. `state.slippage_points` is now a fixed default `10` (its COPY-tab control was removed) and is still passed as `deviation` on `execute_trade` (OPEN).
3. **`node_registered` log gap (master only)**: `SocketManager.on_node_registered` can write to `AppState.logs` when `socket.state` is set; slave sets this in `connect_cloud`. Master controller still does not wire `socket.state`.
4. **~~Test FakeMT5 gap~~ (resolved)**: `FakeMT5.execute_trade` now accepts `deviation=10` and exposes `get_symbol_point`/`get_execution_price`, matching the real adapter used by Guard 4.
10. **Slippage ACK multi-slave fidelity**: `trade_execution_ack` updates the shared master OPEN `TradeLog` row, so copier-side diagnostics are exact for single-slave rooms and best-effort (last writer) otherwise — same limitation as backend `slaveId`.
6. **`_resolve_master_user_id` unused**: Fallback method present in `MasterController` but not called in normal flow since verify-node now returns `id`.
7. **`SubscribersView` "Active · 5 seats" chip**: Static placeholder — not derived from actual seat count.
8. **Exness missing `US100`**: `BROKER_PRESETS["Exness"]` has no `US100` mapping. Preset loader for Exness will skip it.
9. **Legacy files**: `main.py`, `views/master_ui.py`, `views/slave_ui.py` are stale and will cause import errors if run.

---

## 17) AI-Safe Extension Rules (Do-Not-Break Contracts)

1. Keep `register_node`, `test_signal`, `trade_execution`, `node_registered`, `subscriber_update`, `trade_execution_ack` event names unchanged.
2. Preserve signal payload keys consumed by slave: `event`, `master_ticket`, `symbol`, `action`, `volume`, `pnl`. `masterPrice` is optional — the slippage guard skips and copies when it is absent (older masters).
3. Preserve role identity semantics: MASTER uses license key; SLAVE uses registered email.
4. Maintain `ticket_map` logic (`master_ticket → slave_ticket`) for close symmetry.
5. Preserve `magic=234000` filtering in `MasterRecorder.start_monitoring()` — loop prevention.
6. Keep `ORDER_TIME_GTC` and `ORDER_FILLING_IOC` in both `execute_trade` and `close_trade`.
7. `SocketManager.on_connect` must auto-emit `register_node` — this drives auto re-registration on reconnect.
8. `MasterSignalTrackingSocket.emit_signal` must increment `state.signals_sent` and append to `state.recent_signals` (ring buffer cap 50).
9. Risk guards in `on_trade_signal` must fire in order: Guard -1 (equity) → Guard 0 (daily loss) → Guard 1 (concurrent) → symbol mapping → Guard 2 (whitelist) → Guard 3 (lot cap inline during OPEN) → Guard 4 (strict slippage drift, right before `execute_trade`). Guard 4 skips when `masterPrice`, point, or copier price is unavailable.
10. `AppState` inherits `BaseState + MasterState + SlaveState` — preserve this composition; do not merge classes.
11. Any backend response contract change must update both client controllers and this README.

---

## 18) Launch and Operation Notes

Typical usage:

1. Start backend (`trade-sync-backend`) so `/auth/verify-node` and socket server are available
2. Launch master: `python main_master.py` from `trade-sync-client/`
3. Enter MT5 credentials + license key → LOG IN
4. Dashboard loads; SUBSCRIBERS tab fetches roster after 1s; PERFORMANCE tab fetches profile stats
5. Launch slave: `python main_slave.py` from a separate terminal
6. Enter registered email + MT5 credentials → LOG IN
7. On slave: SYMBOLS tab to configure mapping, RISK tab to set guards, COPY tab to set mode/multiplier
8. Slave: START LISTENING → joining master room for signal execution
9. Master: START BROADCASTING → recorder thread monitoring MT5 positions

Expected runtime indicators:
- Cloud verification logs with trace IDs
- `[SOCKET] Registered as MASTER in room: room_master_<id>` confirmation
- Master: OPEN/CLOSE broadcast logs + signal count increment
- Slave: OPEN SUCCESS / CLOSE SUCCESS with ticket numbers
- `subscriber_update` in master UI when slave connects/disconnects

---

## 19) Canonical Contract Pointer

For cross-system integration contracts across backend/frontend/client, use:

- `SYSTEM_CONTRACT_MATRIX.md` (workspace root)

If node verification, socket event names, payload keys, role identity semantics, or room-routing rules change, update the matrix first and then synchronize this client guide.

---

Treat this document as the source of truth for the Python client implementation and cross-system communication boundaries.

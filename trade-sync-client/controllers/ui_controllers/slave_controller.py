import requests
import MetaTrader5 as mt5
from uuid import uuid4
from colorama import Fore, Style
from models.app_state import AppState
from controllers.mt5_adapter import MT5Adapter
from controllers.socket_manager import SocketManager

class SlaveController:
    def __init__(self, update_callback):
        self.state = AppState()
        self.state.role = "SLAVE"
        self.mt5 = MT5Adapter()
        self.socket = None
        self.update_ui = update_callback
        self.ticket_map = {}

    def _terminal_log(self, message):
        print(f"[SLAVE] {message}")

    def _structured_log(self, message, **fields):
        payload = {
            "message": message,
            "trace_id": fields.pop("trace_id", str(uuid4())),
            "role": "SLAVE",
            **fields,
        }
        self._terminal_log(str(payload))

    def _on_health_change(self, health_state):
        self.state.health_state = health_state
        self.state.socket_connected = health_state == "CONNECTED"
        self.state.add_log(f"Socket Health: {health_state}")
        self._structured_log("socket_health_update", health_state=health_state)
        self.update_ui()

    def login_mt5(self, broker, login, password, server, email_identifier):
        """Authenticates with NestJS Cloud first, then MT5"""
        
        # 1. VERIFY WITH CLOUD
        self.state.add_log("Verifying Account with Cloud Server...")
        self._terminal_log("Verifying account with cloud server...")
        self.update_ui()
        
        try:
            verify_trace_id = str(uuid4())
            res = requests.post('http://localhost:3000/auth/verify-node', json={
                "role": "SLAVE",
                "identifier": email_identifier,
                "trace_id": verify_trace_id,
            })
            
            if res.status_code not in [200, 201]:
                error_msg = res.json().get('message', 'Access Denied')
                self.state.add_log(f"CLOUD REJECTED: {error_msg}")
                self._structured_log(
                    "verify_node_rejected",
                    trace_id=verify_trace_id,
                    status="error",
                    error=error_msg,
                )
                self.update_ui()
                return False
            
            user_data = res.json()
            self.state.add_log(f"Account Verified for {user_data.get('fullName')}")
            self._structured_log(
                "verify_node_success",
                trace_id=user_data.get("trace_id", verify_trace_id),
                status="ok",
                full_name=user_data.get('fullName'),
            )
            
        except requests.exceptions.RequestException:
            self.state.add_log("CLOUD ERROR: Server Offline.")
            self._terminal_log("Cloud error: server offline")
            self.update_ui()
            return False

        # 2. PROCEED TO MT5 LOGIN
        self.state.add_log(f"Attempting MT5 login to {server}...")
        self._terminal_log(f"Attempting MT5 login to server: {server}")
        self.update_ui()

        success, msg = self.mt5.connect(broker, login, password, server)
        
        if success:
            self.state.mt5_connected = True
            self.state.add_log(msg)
            self._terminal_log(msg)
            self.connect_cloud(email_identifier)
            return True
        else:
            self.state.add_log(f"MT5 Error: {msg}")
            self._terminal_log(f"MT5 error: {msg}")
            self.update_ui()
            return False

    def connect_cloud(self, identifier):
        """Establishes the WebSocket connection to NestJS"""
        try:
            self.socket = SocketManager(
                'http://localhost:3000',
                self.mt5,
                node_role="SLAVE",
                node_identifier=identifier,
                health_callback=self._on_health_change,
            )
            self.socket.set_node_context("SLAVE", identifier)
            self.socket.register_handler('trade_execution', self.on_trade_signal)

            self.socket.connect()
            self.state.socket_connected = True
            self._terminal_log("Socket connection attempt completed")
        except Exception as e:
            self.state.add_log(f"Socket Error: {e}")
            self._terminal_log(f"Socket error: {e}")
        self.update_ui()

    def toggle_listening(self):
        """Starts or stops processing incoming trade signals"""
        if not self.state.is_running:
            self.state.is_running = True
            self.state.start_session()
            self.state.add_log(f"Listening STARTED (Risk: {self.state.risk_multiplier}x)")
            self._terminal_log(f"Listening started (risk={self.state.risk_multiplier}x)")
        else:
            self.state.is_running = False
            print(Fore.CYAN + f"[SESSION] Session ended. Session PnL: ${self.state.session_pnl:.2f}" + Style.RESET_ALL)
            self.state.add_log(f"[SESSION] Ended. Session PnL: ${self.state.session_pnl:.2f}")
            self.state.add_log("Listening STOPPED")
            self._terminal_log("Listening stopped")
        self.update_ui()

    def add_symbol_mapping(self, master_sym, slave_sym):
        if master_sym and slave_sym:
            self.state.symbol_map[master_sym] = slave_sym
            self.state.add_log(f"Mapped: {master_sym} -> {slave_sym}")
            self._terminal_log(f"Symbol mapped: {master_sym} -> {slave_sym}")
            self.update_ui()

    def remove_mapping(self, master_sym):
        if master_sym in self.state.symbol_map:
            del self.state.symbol_map[master_sym]
            self._terminal_log(f"Symbol mapping removed: {master_sym}")
            self.update_ui()

    def on_trade_signal(self, data):
        """Handles incoming OPEN/CLOSE signals from the Master"""
        trace_id = data.get('trace_id', str(uuid4()))
        self._structured_log(
            "trade_signal_received",
            trace_id=trace_id,
            event=data.get('event'),
            symbol=data.get('symbol'),
            master_ticket=data.get('master_ticket'),
        )
        if not self.state.is_running:
            self._terminal_log("Signal ignored because listening is stopped")
            return

        # ═══ RISK GUARD BLOCK — Phase 7 ═══════════════════════════════
        # Guards fire before symbol mapping and execution.
        # Each guard logs to terminal and AppState before returning.

        event_type = data.get('event', '')

        # Guard -1: Equity floor protection
        if event_type == 'OPEN' and self.state.equity_floor > 0.0:
            try:
                account = mt5.account_info()
                if account and account.equity < self.state.equity_floor:
                    msg = f"[RISK] OPEN blocked — equity ${account.equity:.2f} below floor ${self.state.equity_floor:.2f}"
                    print(Fore.RED + msg + Style.RESET_ALL)
                    self.state.add_log(msg)
                    return
            except Exception as e:
                print(Fore.YELLOW + f"[RISK] Equity check failed: {e}" + Style.RESET_ALL)

        # Guard 0: Daily loss limit auto-pause
        if event_type == 'OPEN' and self.state.copying_paused_by_loss:
            msg = "[RISK] OPEN blocked — daily loss limit active. Use Risk tab to reset."
            print(Fore.RED + msg + Style.RESET_ALL)
            self.state.add_log(msg)
            return

        # Guard 1: Max concurrent trades
        if event_type == 'OPEN' and self.state.max_concurrent_trades > 0:
            active = len(self.ticket_map)
            if active >= self.state.max_concurrent_trades:
                msg = f"[RISK] OPEN blocked — {active}/{self.state.max_concurrent_trades} max concurrent trades."
                print(Fore.YELLOW + msg + Style.RESET_ALL)
                self.state.add_log(msg)
                return
        # ═══ END EARLY GUARDS — symbol/volume guards added inline below ═

        event = data.get('event')
        m_ticket = data.get('master_ticket')
        master_symbol = data.get('symbol', '').strip()
        
        # --- SYMBOL MAPPING LOGIC ---
        slave_symbol = master_symbol 
        if self.state.symbol_map:
            if master_symbol in self.state.symbol_map:
                slave_symbol = self.state.symbol_map[master_symbol]
                self._terminal_log(f"Symbol mapped for execution: {master_symbol} -> {slave_symbol}")
            else:
                if self.state.unmapped_symbol_behavior == 'COPY_AS_IS':
                    slave_symbol = master_symbol
                    print(Fore.CYAN + f"[COPY] Unmapped symbol {master_symbol} — copying as-is" + Style.RESET_ALL)
                else:
                    self.state.add_log(f"Ignored: {master_symbol} not in map")
                    self._structured_log(
                        "trade_signal_ignored_unmapped_symbol",
                        trace_id=trace_id,
                        symbol=master_symbol,
                        status="ignored",
                    )
                    return 

        # Guard 2: Symbol whitelist
        if event_type == 'OPEN' and self.state.symbol_whitelist:
            if slave_symbol not in self.state.symbol_whitelist:
                msg = f"[RISK] OPEN skipped — {slave_symbol} not in whitelist {self.state.symbol_whitelist}"
                print(Fore.YELLOW + msg + Style.RESET_ALL)
                self.state.add_log(msg)
                return

        # --- EXECUTION ---
        if event == "OPEN":
            # ── Copy Mode Volume Calculation ─────────────────────────
            original_vol = float(data['volume'])
            if self.state.copy_mode == 'FIXED_LOT':
                new_vol = self.state.fixed_lot_size
                print(Fore.CYAN + f"[COPY] Fixed lot mode: {new_vol} lots" + Style.RESET_ALL)
            else:
                new_vol = round(original_vol * self.state.risk_multiplier, 2)
            new_vol = max(new_vol, 0.01)

            # Guard 3: Max lot size cap
            if self.state.max_lot_size > 0.0:
                if new_vol > self.state.max_lot_size:
                    msg = f"[RISK] Volume clamped {new_vol:.2f} -> {self.state.max_lot_size:.2f} lots"
                    print(Fore.YELLOW + msg + Style.RESET_ALL)
                    self.state.add_log(msg)
                    new_vol = self.state.max_lot_size

            # ── Reverse Copy ─────────────────────────────────────────
            exec_action = data['action']
            if self.state.reverse_copy and exec_action in ('BUY', 'SELL'):
                exec_action = 'SELL' if exec_action == 'BUY' else 'BUY'
                print(Fore.CYAN + f"[COPY] Reverse copy: {data['action']} -> {exec_action}" + Style.RESET_ALL)

            self.state.add_log(f"Copying {master_symbol} as {slave_symbol}...")
            self._structured_log(
                "open_signal_processing",
                trace_id=trace_id,
                master_ticket=m_ticket,
                symbol=master_symbol,
                action=exec_action,
                volume=new_vol,
            )
            res = self.mt5.execute_trade(
                slave_symbol,
                exec_action,
                new_vol,
                deviation=self.state.slippage_points
            )
            
            if res and res.retcode == 10009:
                self.ticket_map[m_ticket] = res.order
                self.state.add_log(f"OPEN SUCCESS: #{res.order}")
                self._structured_log(
                    "open_signal_success",
                    trace_id=trace_id,
                    master_ticket=m_ticket,
                    slave_ticket=res.order,
                    status="ok",
                )
                # Record open trade in session tracking
                slave_ticket = res.order if hasattr(res, 'order') else 0
                self.state.add_open_trade(
                    master_ticket=m_ticket,
                    slave_ticket=slave_ticket,
                    symbol=slave_symbol,
                    action=exec_action,
                    volume=new_vol
                )
            else:
                self.state.add_log(f"FAILED: {res.comment if res else 'Unknown Error'}")
                self._structured_log(
                    "open_signal_failed",
                    trace_id=trace_id,
                    master_ticket=m_ticket,
                    status="error",
                    error=res.comment if res else 'Unknown Error',
                )
            
        elif event == "CLOSE":
            s_ticket = self.ticket_map.get(m_ticket)
            if s_ticket:
                self.state.add_log(f"Closing Ticket #{s_ticket}...")
                self._structured_log(
                    "close_signal_processing",
                    trace_id=trace_id,
                    master_ticket=m_ticket,
                    slave_ticket=s_ticket,
                )
                res = self.mt5.close_trade(s_ticket, slave_symbol)
                
                if res and res.retcode == 10009: 
                    self.state.add_log(f"CLOSE SUCCESS: #{s_ticket}")
                    del self.ticket_map[m_ticket]
                    self._structured_log(
                        "close_signal_success",
                        trace_id=trace_id,
                        master_ticket=m_ticket,
                        slave_ticket=s_ticket,
                        status="ok",
                    )

                    # PnL accumulation for daily loss tracking
                    pnl_value = float(data.get('pnl', 0.0) or 0.0)
                    self.state.daily_pnl = round(self.state.daily_pnl + pnl_value, 2)
                    msg = f"[RISK] Daily PnL: ${self.state.daily_pnl:.2f} (trade: {pnl_value:+.2f})"
                    print(Fore.CYAN + msg + Style.RESET_ALL)
                    self.state.add_log(msg)

                    # Record closed trade in session tracking
                    self.state.close_trade_record(m_ticket, pnl_value)

                    if self.state.daily_loss_limit > 0.0:
                        if self.state.daily_pnl <= -self.state.daily_loss_limit:
                            self.state.copying_paused_by_loss = True
                            msg = f"[RISK] ⚠ DAILY LOSS LIMIT HIT: ${self.state.daily_pnl:.2f} / limit -${self.state.daily_loss_limit:.2f}. Copying paused."
                            print(Fore.RED + msg + Style.RESET_ALL)
                            self.state.add_log(msg)
                else:
                    error_msg = res.comment if res else "Unknown Error"
                    self.state.add_log(f"CLOSE FAILED: {error_msg}")
                    self._structured_log(
                        "close_signal_failed",
                        trace_id=trace_id,
                        master_ticket=m_ticket,
                        slave_ticket=s_ticket,
                        status="error",
                        error=error_msg,
                    )
            else:
                self._structured_log(
                    "close_signal_ignored_missing_mapping",
                    trace_id=trace_id,
                    master_ticket=m_ticket,
                    status="ignored",
                )
        else:
            self._terminal_log(f"Unknown event type ignored: {event}")
        
        self.update_ui()
import requests
from uuid import uuid4
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
            self.state.add_log(f"Listening STARTED (Risk: {self.state.risk_multiplier}x)")
            self._terminal_log(f"Listening started (risk={self.state.risk_multiplier}x)")
        else:
            self.state.is_running = False
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

        event = data.get('event')
        m_ticket = data.get('master_ticket')
        master_symbol = data.get('symbol', '').upper()
        
        # --- SYMBOL MAPPING LOGIC ---
        slave_symbol = master_symbol 
        if self.state.symbol_map:
            if master_symbol in self.state.symbol_map:
                slave_symbol = self.state.symbol_map[master_symbol]
                self._terminal_log(f"Symbol mapped for execution: {master_symbol} -> {slave_symbol}")
            else:
                self.state.add_log(f"Ignored: {master_symbol} not in map")
                self._structured_log(
                    "trade_signal_ignored_unmapped_symbol",
                    trace_id=trace_id,
                    symbol=master_symbol,
                    status="ignored",
                )
                self.update_ui()
                return 

        # --- EXECUTION ---
        if event == "OPEN":
            # Apply Risk
            original_vol = float(data['volume'])
            new_vol = round(original_vol * self.state.risk_multiplier, 2)
            if new_vol < 0.01: new_vol = 0.01

            self.state.add_log(f"Copying {master_symbol} as {slave_symbol}...")
            self._structured_log(
                "open_signal_processing",
                trace_id=trace_id,
                master_ticket=m_ticket,
                symbol=master_symbol,
                action=data.get('action'),
                volume=new_vol,
            )
            res = self.mt5.execute_trade(slave_symbol, data['action'], new_vol)
            
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
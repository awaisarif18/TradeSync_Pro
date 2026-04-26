import socketio
from colorama import Fore, Style
from uuid import uuid4

class SocketManager:
    def __init__(self, server_url, mt5_adapter, node_role=None, node_identifier=None, health_callback=None):
        self.sio = socketio.Client(
            reconnection=True,
            reconnection_attempts=0,
            reconnection_delay=1,
            reconnection_delay_max=8,
        )
        self.server_url = server_url
        self.mt5 = mt5_adapter
        self.node_role = node_role
        self.node_identifier = node_identifier
        self.health_callback = health_callback
        self.state = None
        self.is_connected = False
        self._registered_events = set()
        self._reconnect_attempts = 0
        
        # Standard connection and health events
        self.sio.on('connect', self.on_connect)
        self.sio.on('disconnect', self.on_disconnect)
        self.sio.on('node_registered', self.on_node_registered)

    def _set_health(self, health_state):
        if self.health_callback:
            self.health_callback(health_state)

    def _log(self, message, **fields):
        payload = {
            "message": message,
            "trace_id": fields.pop("trace_id", str(uuid4())),
            **fields,
        }
        print(f"{Fore.CYAN}[SocketManager]{Style.RESET_ALL} {payload}")

    def register_handler(self, event_name, handler):
        if event_name in self._registered_events:
            return
        self.sio.on(event_name, handler)
        self._registered_events.add(event_name)

    def set_node_context(self, role, identifier):
        self.node_role = role
        self.node_identifier = identifier

    def connect(self):
        try:
            self._set_health("RECONNECTING")
            self.sio.connect(self.server_url, transports=['websocket'])
            self.is_connected = True
        except Exception as e:
            self._set_health("DISCONNECTED")
            self._log("socket_connect_error", error=str(e), health_state="DISCONNECTED")

    def on_connect(self):
        self.is_connected = True
        self._reconnect_attempts = 0
        self._set_health("CONNECTED")
        self._log("socket_connected", socket_id=self.sio.sid, health_state="CONNECTED")

        # connect event is fired on both initial connection and reconnects.
        if self.node_role and self.node_identifier:
            self.sio.emit('register_node', {
                "role": self.node_role,
                "identifier": self.node_identifier,
            })
            self._log(
                "register_node_emitted",
                role=self.node_role,
                identifier=self.node_identifier,
                health_state="CONNECTED",
            )

    def on_disconnect(self):
        self.is_connected = False
        self._reconnect_attempts += 1
        self._set_health("RECONNECTING")
        self._log(
            "socket_disconnected",
            reconnect_attempt=self._reconnect_attempts,
            health_state="RECONNECTING",
        )

    def on_node_registered(self, data):
        success = data.get('success', False)
        role = data.get('role', '')
        room = data.get('room', '')
        if success:
            msg = f"[SOCKET] Registered as {role} in room: {room}"
            print(Fore.CYAN + msg + Style.RESET_ALL)
        else:
            error = data.get('error', 'Unknown error')
            msg = f"[SOCKET] Registration FAILED: {error}"
            print(Fore.RED + msg + Style.RESET_ALL)

        if self.state:
            self.state.add_log(msg)

    def emit_signal(self, signal_dict):
        signal_dict = {
            **signal_dict,
            "trace_id": signal_dict.get("trace_id", str(uuid4())),
        }
        self._log(
            "emit_test_signal",
            trace_id=signal_dict.get("trace_id"),
            event=signal_dict.get("event"),
            symbol=signal_dict.get("symbol"),
            master_ticket=signal_dict.get("master_ticket"),
        )
        self.sio.emit('test_signal', signal_dict)
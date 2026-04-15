import threading
import requests
from uuid import uuid4
from models.app_state import AppState
from controllers.mt5_adapter import MT5Adapter
from controllers.socket_manager import SocketManager
from master_recorder import MasterRecorder

class MasterController:
    def __init__(self, update_callback):
        self.state = AppState()
        self.state.role = "MASTER"
        self.mt5 = MT5Adapter()
        self.socket = None
        self.recorder = None
        self.update_ui = update_callback
        self._stop_event = threading.Event()

    def _terminal_log(self, message):
        print(f"[MASTER] {message}")

    def _structured_log(self, message, **fields):
        payload = {
            "message": message,
            "trace_id": fields.pop("trace_id", str(uuid4())),
            "role": "MASTER",
            **fields,
        }
        self._terminal_log(str(payload))

    def _on_health_change(self, health_state):
        self.state.health_state = health_state
        self.state.socket_connected = health_state == "CONNECTED"
        self.state.add_log(f"Socket Health: {health_state}")
        self._structured_log("socket_health_update", health_state=health_state)
        self.update_ui()

    def login_mt5(self, broker, login, password, server, license_key):
        """Authenticates with NestJS Cloud first, then MT5"""
        
        # 1. VERIFY WITH CLOUD
        self.state.add_log("Verifying License with Cloud Server...")
        self._terminal_log("Verifying license with cloud server...")
        self.update_ui()
        
        try:
            verify_trace_id = str(uuid4())
            res = requests.post('http://localhost:3000/auth/verify-node', json={
                "role": "MASTER",
                "identifier": license_key,
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
            self.state.add_log(f"License Verified for {user_data.get('fullName')}")
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
            self.state.license_key = license_key
            self.state.add_log(msg)
            self._terminal_log(msg)
            self.connect_cloud(license_key) 
            return True
        else:
            self.state.add_log(f"MT5 Error: {msg}")
            self._terminal_log(f"MT5 error: {msg}")
            self.update_ui()
            return False

    def connect_cloud(self, identifier):
        try:
            self.socket = SocketManager(
                'http://localhost:3000',
                self.mt5,
                node_role="MASTER",
                node_identifier=identifier,
                health_callback=self._on_health_change,
            )
            self.socket.set_node_context("MASTER", identifier)

            self.socket.connect()
            self.state.socket_connected = True
            self._terminal_log("Socket connection attempt completed")
        except Exception as e:
            self.state.add_log(f"Socket Error: {e}")
            self._terminal_log(f"Socket error: {e}")
        self.update_ui()

        
    def toggle_broadcasting(self):
        """Start/Stop the Recorder Loop"""
        if not self.state.is_running:
            self.state.is_running = True
            self._stop_event.clear()
            self.recorder = MasterRecorder(self.socket)
            
            self.thread = threading.Thread(target=self._run_recorder)
            self.thread.daemon = True
            self.thread.start()
            self.state.add_log("Broadcasting STARTED")
            self._terminal_log("Broadcasting started; recorder thread launched")
        else:
            self.state.is_running = False
            if self.recorder:
                self.recorder.is_running = False
            self.state.add_log("Broadcasting STOPPED")
            self._terminal_log("Broadcasting stopped")
        
        self.update_ui()

    def _run_recorder(self):
        """Background wrapper"""
        try:
            self._terminal_log("Recorder monitoring loop started")
            self.recorder.start_monitoring()
        except Exception as e:
            self.state.add_log(f"Recorder Error: {e}")
            self._terminal_log(f"Recorder error: {e}")
            self.state.is_running = False
            self.update_ui()
import threading
import requests
from datetime import datetime
from colorama import Fore, Style
from uuid import uuid4
from models.app_state import AppState
from controllers.mt5_adapter import MT5Adapter
from controllers.socket_manager import SocketManager
from master_recorder import MasterRecorder

class MasterSignalTrackingSocket:
    def __init__(self, socket_manager, state):
        self.socket_manager = socket_manager
        self.state = state
        self.sio = socket_manager.sio

    def emit_signal(self, signal_dict):
        self.state.signals_sent += 1
        result = self.socket_manager.emit_signal(signal_dict)
        if signal_dict.get('event') == 'OPEN':
            signal_entry = {
                'time': datetime.now().strftime('%H:%M:%S'),
                'symbol': signal_dict.get('symbol', ''),
                'action': signal_dict.get('action', ''),
                'volume': signal_dict.get('volume', ''),
            }
            self.state.recent_signals.append(signal_entry)
            if len(self.state.recent_signals) > 20:
                self.state.recent_signals.pop(0)
        return result

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

    def _resolve_master_user_id(self, full_name):
        try:
            response = requests.get('http://localhost:3000/auth/masters', timeout=5)
            if response.status_code != 200:
                print(
                    Fore.YELLOW +
                    f"[MASTER] Master lookup failed: {response.status_code}" +
                    Style.RESET_ALL
                )
                return

            matches = [
                master for master in response.json()
                if master.get('fullName') == full_name
            ]
            if len(matches) == 1:
                self.state.master_user_id = matches[0].get('id', '')
                print(
                    Fore.CYAN +
                    f"[MASTER] Resolved master_user_id: {self.state.master_user_id}" +
                    Style.RESET_ALL
                )
            elif len(matches) > 1:
                print(
                    Fore.YELLOW +
                    "[MASTER] Multiple masters share this name; cannot resolve master_user_id" +
                    Style.RESET_ALL
                )
            else:
                print(
                    Fore.YELLOW +
                    "[MASTER] Master not found in active masters list" +
                    Style.RESET_ALL
                )
        except requests.exceptions.RequestException as e:
            print(Fore.RED + f"[MASTER] Master lookup error: {e}" + Style.RESET_ALL)

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
            self.state.master_user_id = user_data.get('id', '')

            if not self.state.master_user_id:
                msg = "[MASTER] Warning: id not in verify-node response. Subscriber features may not work."
                print(Fore.YELLOW + msg + Style.RESET_ALL)
                self.state.add_log(msg)
            else:
                print(Fore.CYAN + f"[MASTER] master_user_id set: {self.state.master_user_id[:8]}..." + Style.RESET_ALL)

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

            def on_subscriber_update(data):
                email = data.get('slaveEmail', '')
                online = data.get('online', False)
                self.state.subscriber_online_status[email] = online
                status = 'ONLINE' if online else 'OFFLINE'
                color = Fore.CYAN if online else Fore.YELLOW
                msg = f"[MASTER] Subscriber {email}: {status}"
                print(color + msg + Style.RESET_ALL)
                self.state.add_log(msg)
                self.update_ui()

            self.socket.register_handler(
                'subscriber_update',
                on_subscriber_update,
            )

            self.socket.connect()
            self.state.socket_connected = True
            self._terminal_log("Socket connection attempt completed")
        except Exception as e:
            self.state.add_log(f"Socket Error: {e}")
            self._terminal_log(f"Socket error: {e}")
        self.update_ui()

    def fetch_subscribers(self):
        """Fetch subscriber list from backend. Call after dashboard loads."""
        try:
            master_id = self.state.master_user_id
            if not master_id:
                print(
                    Fore.YELLOW +
                    "[MASTER] master_user_id not set, cannot fetch subscribers" +
                    Style.RESET_ALL
                )
                return
            url = f"http://localhost:3000/auth/masters/{master_id}/subscribers"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                self.state.subscribers = response.json()
                print(
                    Fore.CYAN +
                    f"[MASTER] Loaded {len(self.state.subscribers)} subscribers" +
                    Style.RESET_ALL
                )
                self.state.add_log(
                    f"[MASTER] Loaded {len(self.state.subscribers)} subscribers"
                )
            else:
                print(
                    Fore.YELLOW +
                    f"[MASTER] Subscriber fetch failed: {response.status_code}" +
                    Style.RESET_ALL
                )
        except Exception as e:
            print(Fore.RED + f"[MASTER] Subscriber fetch error: {e}" + Style.RESET_ALL)
        self.update_ui()

        
    def toggle_broadcasting(self):
        """Start/Stop the Recorder Loop"""
        if not self.state.is_running:
            self.state.is_running = True
            self.state.session_start_time_master = datetime.now().strftime('%H:%M:%S')
            self.state.signals_sent = 0
            self._stop_event.clear()
            tracking_socket = MasterSignalTrackingSocket(self.socket, self.state)
            self.recorder = MasterRecorder(tracking_socket)
            
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
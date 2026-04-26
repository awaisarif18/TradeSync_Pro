class BaseState:
    def __init__(self):
        # User Credentials (MT5)
        self.mt5_login = 0
        self.mt5_password = ""
        self.mt5_server = ""
        self.mt5_path = ""  # Path to terminal64.exe
        self.license_key = ""  # Dummy for now

        # App Roles
        self.role = ""  # MASTER or SLAVE

        # Connection Status
        self.mt5_connected = False
        self.socket_connected = False
        self.health_state = "DISCONNECTED"
        self.is_running = False

        # Logs
        self.logs = []

    def add_log(self, message):
        import datetime
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] {message}")
        if len(self.logs) > 50:
            self.logs.pop(0)

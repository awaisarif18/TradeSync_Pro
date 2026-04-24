import sys
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QFormLayout,
    QLineEdit, QComboBox, QPushButton, QLabel, QTextEdit, QStackedWidget
)
from PySide6.QtCore import Slot
from views.qt.ui_bridge import UIBridge
from controllers.ui_controllers.master_controller import MasterController

class MasterWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TradeSync Pro - Master Node (PySide6)")
        self.setMinimumSize(600, 500)

        self.central_widget = QStackedWidget()
        self.setCentralWidget(self.central_widget)

        self.login_widget = self.build_login_screen()
        self.dashboard_widget = self.build_dashboard_screen()

        self.central_widget.addWidget(self.login_widget)
        self.central_widget.addWidget(self.dashboard_widget)

        # Thread-Safe Bridge
        self.bridge = UIBridge()
        self.bridge.ui_update_requested.connect(self.update_ui)
        
        # Initialize Controller
        self.controller = MasterController(self.bridge.request_update)

    def build_login_screen(self):
        widget = QWidget()
        layout = QFormLayout(widget)

        self.broker_combo = QComboBox()
        self.broker_combo.addItems(["Vantage", "XM", "Exness", "Exness Slave", "Auto-Detect"])

        self.mt5_login_input = QLineEdit()
        self.mt5_password_input = QLineEdit()
        self.mt5_password_input.setEchoMode(QLineEdit.Password)
        self.server_input = QLineEdit()
        self.license_key_input = QLineEdit()

        self.login_btn = QPushButton("Login to MT5 & Cloud")
        self.login_btn.clicked.connect(self.on_login_submit)

        layout.addRow(QLabel("Broker:"), self.broker_combo)
        layout.addRow(QLabel("MT5 Login ID:"), self.mt5_login_input)
        layout.addRow(QLabel("MT5 Password:"), self.mt5_password_input)
        layout.addRow(QLabel("Server String:"), self.server_input)
        layout.addRow(QLabel("License Key:"), self.license_key_input)
        layout.addRow(self.login_btn)

        return widget

    def build_dashboard_screen(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        self.status_label = QLabel("Status: Disconnected")
        
        self.toggle_broadcast_btn = QPushButton("Start Broadcasting")
        self.toggle_broadcast_btn.clicked.connect(self.on_toggle_broadcast)
        
        self.logs_text = QTextEdit()
        self.logs_text.setReadOnly(True)

        layout.addWidget(self.status_label)
        layout.addWidget(self.toggle_broadcast_btn)
        layout.addWidget(QLabel("Logs:"))
        layout.addWidget(self.logs_text)

        return widget

    def on_login_submit(self):
        # Extract credentials
        broker = self.broker_combo.currentText()
        login = self.mt5_login_input.text().strip()
        password = self.mt5_password_input.text().strip()
        server = self.server_input.text().strip()
        license_key = self.license_key_input.text().strip()

        # Update UI state temporarily
        self.login_btn.setEnabled(False)
        self.login_btn.setText("Connecting...")
        QApplication.processEvents()  # Force UI repaint before synchronous block

        # Execute Login (Cloud verify -> MT5 -> Socket)
        success = self.controller.login_mt5(broker, login, password, server, license_key)

        if success:
            self.central_widget.setCurrentWidget(self.dashboard_widget)
        else:
            self.login_btn.setEnabled(True)
            self.login_btn.setText("Login to MT5 & Cloud")

    def on_toggle_broadcast(self):
        if not self.controller:
            return
            
        self.controller.toggle_broadcasting()
        
        if self.controller.state.is_running:
            self.toggle_broadcast_btn.setText("Stop Broadcasting")
        else:
            self.toggle_broadcast_btn.setText("Start Broadcasting")

    @Slot()
    def update_ui(self):
        """Runs strictly on the Main Qt Thread. Syncs data from AppState."""
        if not self.controller:
            return
            
        state = self.controller.state
        
        # Update connection status
        status_text = "Status: Connected" if (state.mt5_connected and state.socket_connected) else "Status: Disconnected"
        if self.status_label.text() != status_text:
            self.status_label.setText(status_text)
            
        # Update logs safely
        current_logs = "\n".join(state.logs)
        if self.logs_text.toPlainText() != current_logs:
            self.logs_text.setPlainText(current_logs)
            self.logs_text.verticalScrollBar().setValue(self.logs_text.verticalScrollBar().maximum())

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MasterWindow()
    window.show()
    sys.exit(app.exec())
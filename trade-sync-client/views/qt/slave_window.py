import sys
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLineEdit, QComboBox, QPushButton, QLabel, QTextEdit, QStackedWidget, QDoubleSpinBox, QListWidget
)
from PySide6.QtCore import Slot
from views.qt.ui_bridge import UIBridge
from controllers.ui_controllers.slave_controller import SlaveController

class SlaveWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TradeSync Pro - Slave Node (PySide6)")
        self.setMinimumSize(800, 600)

        self.central_widget = QStackedWidget()
        self.setCentralWidget(self.central_widget)

        self.login_widget = self.build_login_screen()
        self.dashboard_widget = self.build_dashboard_screen()

        self.central_widget.addWidget(self.login_widget)
        self.central_widget.addWidget(self.dashboard_widget)

        # Setup Thread-Safe Bridge
        self.bridge = UIBridge()
        self.bridge.ui_update_requested.connect(self.update_ui)
        
        # Initialize Controller
        self.controller = SlaveController(self.bridge.request_update)

    def build_login_screen(self):
        widget = QWidget()
        layout = QFormLayout(widget)

        self.broker_combo = QComboBox()
        self.broker_combo.addItems(["XM", "Vantage", "Exness"])

        self.mt5_login_input = QLineEdit()
        self.mt5_password_input = QLineEdit()
        self.mt5_password_input.setEchoMode(QLineEdit.Password)
        self.server_input = QLineEdit()
        self.email_input = QLineEdit()

        self.login_btn = QPushButton("Login to MT5 & Cloud")
        self.login_btn.clicked.connect(self.on_login_submit)

        layout.addRow(QLabel("Broker:"), self.broker_combo)
        layout.addRow(QLabel("MT5 Login ID:"), self.mt5_login_input)
        layout.addRow(QLabel("MT5 Password:"), self.mt5_password_input)
        layout.addRow(QLabel("Server String:"), self.server_input)
        layout.addRow(QLabel("TSP Registered Email:"), self.email_input)
        layout.addRow(self.login_btn)

        return widget

    def build_dashboard_screen(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        controls_layout = QHBoxLayout()

        # Risk and Connection Controls
        control_panel = QVBoxLayout()
        self.status_label = QLabel("Status: Disconnected")
        
        risk_layout = QHBoxLayout()
        self.risk_spinbox = QDoubleSpinBox()
        self.risk_spinbox.setRange(0.1, 5.0)
        self.risk_spinbox.setSingleStep(0.1)
        self.risk_spinbox.setValue(1.0)
        self.risk_spinbox.valueChanged.connect(self.on_risk_changed)
        
        risk_layout.addWidget(QLabel("Risk Multiplier:"))
        risk_layout.addWidget(self.risk_spinbox)

        self.toggle_listen_btn = QPushButton("Start Listening")
        self.toggle_listen_btn.clicked.connect(self.on_toggle_listen)
        
        control_panel.addWidget(self.status_label)
        control_panel.addLayout(risk_layout)
        control_panel.addWidget(self.toggle_listen_btn)
        control_panel.addStretch()

        # Symbol Mapping Controls
        mapping_panel = QVBoxLayout()
        mapping_form = QHBoxLayout()
        self.map_master_input = QLineEdit()
        self.map_master_input.setPlaceholderText("Master Sym (e.g. GOLD)")
        self.map_slave_input = QLineEdit()
        self.map_slave_input.setPlaceholderText("Slave Sym (e.g. XAUUSD)")
        
        self.add_map_btn = QPushButton("Add Map")
        self.add_map_btn.clicked.connect(self.on_add_map)
        
        mapping_form.addWidget(self.map_master_input)
        mapping_form.addWidget(self.map_slave_input)
        mapping_form.addWidget(self.add_map_btn)

        self.mapping_list = QListWidget()
        self.mapping_list.setToolTip("Double-click an item to remove the mapping")
        self.mapping_list.itemDoubleClicked.connect(self.on_remove_map)
        
        mapping_panel.addWidget(QLabel("Symbol Mapping (Double-click to remove):"))
        mapping_panel.addLayout(mapping_form)
        mapping_panel.addWidget(self.mapping_list)

        controls_layout.addLayout(control_panel, 1)
        controls_layout.addLayout(mapping_panel, 2)

        # Logs Output
        self.logs_text = QTextEdit()
        self.logs_text.setReadOnly(True)

        layout.addLayout(controls_layout)
        layout.addWidget(QLabel("Logs:"))
        layout.addWidget(self.logs_text)

        return widget
    
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
            
        # Update risk slider safely (prevent recursive signals if user is sliding)
        if not self.risk_spinbox.hasFocus() and self.risk_spinbox.value() != state.risk_multiplier:
            self.risk_spinbox.blockSignals(True)
            self.risk_spinbox.setValue(state.risk_multiplier)
            self.risk_spinbox.blockSignals(False)
            
        # Update logs safely
        current_logs = "\n".join(state.logs)
        if self.logs_text.toPlainText() != current_logs:
            self.logs_text.setPlainText(current_logs)
            self.logs_text.verticalScrollBar().setValue(self.logs_text.verticalScrollBar().maximum())

    def on_login_submit(self):
        # Extract credentials
        broker = self.broker_combo.currentText()
        login = self.mt5_login_input.text().strip()
        password = self.mt5_password_input.text().strip()
        server = self.server_input.text().strip()
        email_identifier = self.email_input.text().strip()

        # Update UI state temporarily
        self.login_btn.setEnabled(False)
        self.login_btn.setText("Connecting...")
        QApplication.processEvents()

        # Execute Login (Cloud verify -> MT5 -> Socket)
        success = self.controller.login_mt5(broker, login, password, server, email_identifier)

        if success:
            self.central_widget.setCurrentWidget(self.dashboard_widget)
        else:
            self.login_btn.setEnabled(True)
            self.login_btn.setText("Login to MT5 & Cloud")

    def on_toggle_listen(self):
        if not self.controller:
            return
            
        self.controller.toggle_listening()
        
        if self.controller.state.is_running:
            self.toggle_listen_btn.setText("Stop Listening")
        else:
            self.toggle_listen_btn.setText("Start Listening")

    def on_risk_changed(self, value):
        if self.controller:
            self.controller.state.risk_multiplier = value

    def on_add_map(self):
        if not self.controller:
            return
            
        master_sym = self.map_master_input.text().strip().upper()
        slave_sym = self.map_slave_input.text().strip().upper()
        
        if master_sym and slave_sym:
            self.controller.add_symbol_mapping(master_sym, slave_sym)
            self.refresh_map_list()
            self.map_master_input.clear()
            self.map_slave_input.clear()

    def on_remove_map(self, item):
        if not self.controller:
            return
            
        # Parse "MASTER -> SLAVE" from list item
        text = item.text()
        if "->" in text:
            master_sym = text.split("->")[0].strip()
            self.controller.remove_mapping(master_sym)
            self.refresh_map_list()

    def refresh_map_list(self):
        self.mapping_list.clear()
        if self.controller:
            for master, slave in self.controller.state.symbol_map.items():
                self.mapping_list.addItem(f"{master} -> {slave}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = SlaveWindow()
    window.show()
    sys.exit(app.exec())
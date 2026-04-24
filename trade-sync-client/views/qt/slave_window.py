import sys
from datetime import datetime
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLineEdit, QComboBox, QPushButton, QLabel, QTextEdit, QStackedWidget,
    QDoubleSpinBox, QSpinBox, QTabWidget, QGroupBox, QRadioButton, QCheckBox,
    QButtonGroup
)
from PySide6.QtCore import Slot, QTimer
from views.qt.ui_bridge import UIBridge
from controllers.ui_controllers.slave_controller import SlaveController
from views.qt.symbol_map_panel import SymbolMapPanel
from views.qt.risk_panel import RiskPanel
from views.qt.trades_panel import TradesPanel

# ── Bloomberg Terminal QSS ──────────────────────────────────────
BLOOMBERG_QSS = """
QMainWindow, QWidget {
    background-color: #0a0a0a;
    color: #c8c8c8;
    font-family: 'Segoe UI';
    font-size: 9pt;
}
QTabWidget::pane {
    border: 1px solid #2a2a2a;
    background: #0a0a0a;
}
QTabBar::tab {
    background: #0a0a0a;
    color: #666666;
    padding: 6px 18px;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 9pt;
    font-weight: bold;
    letter-spacing: 1px;
}
QTabBar::tab:selected {
    color: #c8c8c8;
    border-bottom: 2px solid #00d4aa;
}
QTabBar::tab:hover {
    color: #999999;
}
QGroupBox {
    border: 1px solid #2a2a2a;
    border-radius: 2px;
    margin-top: 6px;
    padding: 10px;
    font-size: 8pt;
    font-weight: bold;
    color: #666666;
    letter-spacing: 1px;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 6px;
    color: #00d4aa;
}
QDoubleSpinBox, QSpinBox, QLineEdit, QComboBox {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 2px;
    padding: 3px 6px;
    color: #c8c8c8;
    font-family: 'Consolas';
    selection-background-color: #00d4aa;
    selection-color: #0a0a0a;
}
QDoubleSpinBox:focus, QSpinBox:focus, QLineEdit:focus {
    border: 1px solid #00d4aa;
}
QPushButton {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 2px;
    padding: 5px 14px;
    color: #c8c8c8;
    font-size: 9pt;
}
QPushButton:hover {
    border: 1px solid #00d4aa;
    color: #00d4aa;
}
QPushButton:pressed {
    background: #00d4aa;
    color: #0a0a0a;
}
QTextEdit {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    border-radius: 2px;
    color: #888888;
    font-family: 'Consolas';
    font-size: 8pt;
}
QLabel {
    color: #888888;
}
QListWidget, QTableWidget {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    color: #c8c8c8;
    gridline-color: #1a1a1a;
    font-family: 'Consolas';
    font-size: 9pt;
}
QTableWidget::item:selected, QListWidget::item:selected {
    background: #1a1a1a;
    color: #00d4aa;
}
QHeaderView::section {
    background: #1a1a1a;
    color: #666666;
    border: none;
    border-right: 1px solid #2a2a2a;
    padding: 4px 8px;
    font-size: 8pt;
    font-weight: bold;
    letter-spacing: 1px;
}
QScrollBar:vertical {
    background: #0a0a0a;
    width: 6px;
}
QScrollBar::handle:vertical {
    background: #2a2a2a;
    border-radius: 3px;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}
QRadioButton {
    color: #c8c8c8;
    spacing: 4px;
}
QRadioButton::indicator {
    width: 12px;
    height: 12px;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    background: #1a1a1a;
}
QRadioButton::indicator:checked {
    background: #00d4aa;
    border: 1px solid #00d4aa;
}
QCheckBox {
    color: #c8c8c8;
    spacing: 4px;
}
QCheckBox::indicator {
    width: 12px;
    height: 12px;
    border: 1px solid #2a2a2a;
    border-radius: 2px;
    background: #1a1a1a;
}
QCheckBox::indicator:checked {
    background: #00d4aa;
    border: 1px solid #00d4aa;
}
"""


class SlaveWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TradeSync Pro - Slave Node")
        self.setMinimumSize(800, 600)

        # Setup Thread-Safe Bridge + Controller (must init before dashboard build)
        self.bridge = UIBridge()
        self.bridge.ui_update_requested.connect(self.update_ui)
        self.controller = SlaveController(self.bridge.request_update)

        # Apply global theme
        self.setStyleSheet(BLOOMBERG_QSS)

        self.central_widget = QStackedWidget()
        self.setCentralWidget(self.central_widget)

        self.login_widget = self.build_login_screen()
        self.dashboard_widget = self.build_dashboard_screen()

        self.central_widget.addWidget(self.login_widget)
        self.central_widget.addWidget(self.dashboard_widget)

    def build_login_screen(self):
        widget = QWidget()
        layout = QFormLayout(widget)

        self.broker_combo = QComboBox()
        self.broker_combo.addItems(["XM", "Vantage", "Exness", "Exness Slave"])

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
        layout.setContentsMargins(4, 4, 4, 4)

        # ── Tab Widget ──────────────────────────────────────────
        self.tab_widget = QTabWidget()

        # ── Tab 1: COPY ─────────────────────────────────────────
        copy_tab = QWidget()
        copy_layout = QVBoxLayout(copy_tab)
        copy_layout.setSpacing(6)

        # Row 1 — Status bar
        status_row = QHBoxLayout()
        status_row.setSpacing(24)

        lbl_status_title = QLabel("STATUS")
        lbl_status_title.setStyleSheet(
            "color: #666666; font-weight: bold; letter-spacing: 1px; font-size: 8pt;"
        )
        status_row.addWidget(lbl_status_title)

        self.lbl_status_dot = QLabel("●  DISCONNECTED")
        self.lbl_status_dot.setStyleSheet(
            "color: #ff4444; font-family: Consolas; font-weight: bold;"
        )
        status_row.addWidget(self.lbl_status_dot)

        status_row.addSpacing(24)

        lbl_session_title = QLabel("SESSION")
        lbl_session_title.setStyleSheet(
            "color: #666666; font-weight: bold; letter-spacing: 1px; font-size: 8pt;"
        )
        status_row.addWidget(lbl_session_title)

        self.lbl_session_time = QLabel("--:--:--")
        self.lbl_session_time.setStyleSheet(
            "color: #c8c8c8; font-family: Consolas;"
        )
        status_row.addWidget(self.lbl_session_time)

        status_row.addSpacing(24)

        lbl_pnl_title = QLabel("SESSION P&&L")
        lbl_pnl_title.setStyleSheet(
            "color: #666666; font-weight: bold; letter-spacing: 1px; font-size: 8pt;"
        )
        status_row.addWidget(lbl_pnl_title)

        self.lbl_session_pnl = QLabel("$0.00")
        self.lbl_session_pnl.setStyleSheet(
            "color: #00d4aa; font-family: Consolas; font-weight: bold;"
        )
        status_row.addWidget(self.lbl_session_pnl)

        status_row.addStretch()
        copy_layout.addLayout(status_row)

        # Row 2 — Copy Mode
        mode_group = QGroupBox("COPY MODE")
        mode_layout = QVBoxLayout(mode_group)

        # Radio buttons row
        radio_row = QHBoxLayout()
        self.radio_multiplier = QRadioButton("Multiplier")
        self.radio_fixed_lot = QRadioButton("Fixed Lot")
        self.radio_multiplier.setChecked(True)

        self.copy_mode_group = QButtonGroup()
        self.copy_mode_group.addButton(self.radio_multiplier, 0)
        self.copy_mode_group.addButton(self.radio_fixed_lot, 1)
        self.copy_mode_group.idClicked.connect(self._on_copy_mode_changed)

        radio_row.addWidget(self.radio_multiplier)
        radio_row.addWidget(self.radio_fixed_lot)
        radio_row.addStretch()
        mode_layout.addLayout(radio_row)

        # Stacked options
        self.mode_stack = QStackedWidget()

        # Multiplier panel
        mult_widget = QWidget()
        mult_layout = QHBoxLayout(mult_widget)
        mult_layout.setContentsMargins(0, 0, 0, 0)
        mult_layout.addWidget(QLabel("Lot Multiplier:"))
        self.risk_spinbox = QDoubleSpinBox()
        self.risk_spinbox.setRange(0.01, 10.0)
        self.risk_spinbox.setSingleStep(0.01)
        self.risk_spinbox.setDecimals(2)
        self.risk_spinbox.setValue(self.controller.state.risk_multiplier)
        self.risk_spinbox.valueChanged.connect(self.on_risk_changed)
        mult_layout.addWidget(self.risk_spinbox)
        mult_layout.addStretch()
        self.mode_stack.addWidget(mult_widget)

        # Fixed lot panel
        fixed_widget = QWidget()
        fixed_layout = QHBoxLayout(fixed_widget)
        fixed_layout.setContentsMargins(0, 0, 0, 0)
        fixed_layout.addWidget(QLabel("Fixed Lot:"))
        self.spin_fixed_lot = QDoubleSpinBox()
        self.spin_fixed_lot.setRange(0.01, 100.0)
        self.spin_fixed_lot.setSingleStep(0.01)
        self.spin_fixed_lot.setDecimals(2)
        self.spin_fixed_lot.setValue(self.controller.state.fixed_lot_size)
        self.spin_fixed_lot.valueChanged.connect(self._on_fixed_lot_changed)
        fixed_layout.addWidget(self.spin_fixed_lot)
        fixed_layout.addStretch()
        self.mode_stack.addWidget(fixed_widget)

        mode_layout.addWidget(self.mode_stack)

        # Extra options row: Reverse copy + Slippage
        extra_row = QHBoxLayout()

        self.chk_reverse = QCheckBox("Reverse Copy")
        self.chk_reverse.setChecked(self.controller.state.reverse_copy)
        self.chk_reverse.toggled.connect(self._on_reverse_changed)
        extra_row.addWidget(self.chk_reverse)

        extra_row.addSpacing(24)
        extra_row.addWidget(QLabel("Slippage (pts):"))

        self.spin_slippage = QSpinBox()
        self.spin_slippage.setRange(0, 100)
        self.spin_slippage.setSingleStep(1)
        self.spin_slippage.setValue(self.controller.state.slippage_points)
        self.spin_slippage.valueChanged.connect(self._on_slippage_changed)
        extra_row.addWidget(self.spin_slippage)

        extra_row.addStretch()
        mode_layout.addLayout(extra_row)

        copy_layout.addWidget(mode_group)

        # Row 3 — Start/Stop button
        self.toggle_listen_btn = QPushButton("\u25b6  START COPYING")
        self.toggle_listen_btn.setStyleSheet(
            "padding: 8px; font-size: 10pt; font-weight: bold;"
        )
        self.toggle_listen_btn.clicked.connect(self.on_toggle_listen)
        copy_layout.addWidget(self.toggle_listen_btn)

        # Row 4 — Log output
        lbl_log_title = QLabel("EVENT LOG")
        lbl_log_title.setStyleSheet(
            "color: #666666; font-weight: bold; letter-spacing: 1px; font-size: 8pt;"
        )
        copy_layout.addWidget(lbl_log_title)

        self.logs_text = QTextEdit()
        self.logs_text.setReadOnly(True)
        copy_layout.addWidget(self.logs_text)

        self.tab_widget.addTab(copy_tab, "COPY")

        # ── Tab 2: SYMBOLS ──────────────────────────────────────
        self.symbol_panel = SymbolMapPanel(self.controller.state)
        self.tab_widget.addTab(self.symbol_panel, "SYMBOLS")

        # ── Tab 3: RISK ─────────────────────────────────────────
        self.risk_panel = RiskPanel(self.controller.state)
        self.tab_widget.addTab(self.risk_panel, "RISK")

        # ── Tab 4: TRADES ───────────────────────────────────────
        self.trades_panel = TradesPanel(self.controller.state)
        self.tab_widget.addTab(self.trades_panel, "TRADES")

        layout.addWidget(self.tab_widget)

        # ── Session Timer ───────────────────────────────────────
        self.session_timer = QTimer()
        self.session_timer.timeout.connect(self._update_session_clock)
        self.session_timer.start(1000)

        return widget

    # ── Slot: UI Update ─────────────────────────────────────────

    @Slot()
    def update_ui(self):
        """Runs strictly on the Main Qt Thread. Syncs data from AppState."""
        if not self.controller:
            return

        state = self.controller.state

        # Update connection status dot
        connected = state.mt5_connected and state.socket_connected
        self.lbl_status_dot.setText(
            "\u25cf  CONNECTED" if connected else "\u25cf  DISCONNECTED"
        )
        dot_color = '#00d4aa' if connected else '#ff4444'
        self.lbl_status_dot.setStyleSheet(
            f"color: {dot_color}; font-family: Consolas; font-weight: bold;"
        )

        # Update risk slider safely
        if not self.risk_spinbox.hasFocus() and self.risk_spinbox.value() != state.risk_multiplier:
            self.risk_spinbox.blockSignals(True)
            self.risk_spinbox.setValue(state.risk_multiplier)
            self.risk_spinbox.blockSignals(False)

        # Update session PnL in status bar
        pnl = state.session_pnl
        pnl_color = '#00d4aa' if pnl >= 0 else '#ff4444'
        self.lbl_session_pnl.setText(f"${pnl:.2f}")
        self.lbl_session_pnl.setStyleSheet(
            f"color: {pnl_color}; font-family: Consolas; font-weight: bold;"
        )

        # Update logs with color coding
        log_lines = []
        for line in state.logs:
            if '[RISK]' in line:
                log_lines.append(f'<span style="color:#ff9900">{line}</span>')
            elif 'OPEN SUCCESS' in line:
                log_lines.append(f'<span style="color:#00d4aa">{line}</span>')
            elif 'CLOSE SUCCESS' in line:
                log_lines.append(f'<span style="color:#888888">{line}</span>')
            elif 'DAILY LOSS' in line or 'FAILED' in line:
                log_lines.append(f'<span style="color:#ff4444">{line}</span>')
            elif '[SESSION]' in line:
                log_lines.append(f'<span style="color:#00d4aa">{line}</span>')
            else:
                log_lines.append(f'<span style="color:#666666">{line}</span>')

        html_logs = '<br>'.join(log_lines)
        self.logs_text.setHtml(html_logs)
        self.logs_text.verticalScrollBar().setValue(
            self.logs_text.verticalScrollBar().maximum()
        )

        # Update sub-panels
        if hasattr(self, 'risk_panel'):
            self.risk_panel.refresh_display()
        if hasattr(self, 'trades_panel'):
            self.trades_panel.refresh_display()

    # ── Slot: Copy Mode ─────────────────────────────────────────

    def _on_copy_mode_changed(self, button_id):
        if button_id == 0:
            self.controller.state.copy_mode = 'MULTIPLIER'
            self.mode_stack.setCurrentIndex(0)
        elif button_id == 1:
            self.controller.state.copy_mode = 'FIXED_LOT'
            self.mode_stack.setCurrentIndex(1)

    def _on_fixed_lot_changed(self, value):
        self.controller.state.fixed_lot_size = value

    def _on_reverse_changed(self, checked):
        self.controller.state.reverse_copy = checked

    def _on_slippage_changed(self, value):
        self.controller.state.slippage_points = value

    # ── Slot: Session Clock ─────────────────────────────────────

    def _update_session_clock(self):
        state = self.controller.state
        if state.session_start_time and state.is_running:
            try:
                now = datetime.now()
                start = datetime.strptime(state.session_start_time, '%H:%M:%S')
                start = start.replace(
                    year=now.year, month=now.month, day=now.day
                )
                elapsed = now - start
                total_secs = int(elapsed.total_seconds())
                if total_secs < 0:
                    total_secs = 0
                h = total_secs // 3600
                m = (total_secs % 3600) // 60
                s = total_secs % 60
                self.lbl_session_time.setText(f"{h:02d}:{m:02d}:{s:02d}")
            except Exception:
                self.lbl_session_time.setText("--:--:--")
        elif not state.is_running:
            self.lbl_session_time.setText("--:--:--")

    # ── Slot: Login ─────────────────────────────────────────────

    def on_login_submit(self):
        broker = self.broker_combo.currentText()
        login = self.mt5_login_input.text().strip()
        password = self.mt5_password_input.text().strip()
        server = self.server_input.text().strip()
        email_identifier = self.email_input.text().strip()

        self.login_btn.setEnabled(False)
        self.login_btn.setText("Connecting...")
        QApplication.processEvents()

        success = self.controller.login_mt5(
            broker, login, password, server, email_identifier
        )

        if success:
            self.central_widget.setCurrentWidget(self.dashboard_widget)
        else:
            self.login_btn.setEnabled(True)
            self.login_btn.setText("Login to MT5 & Cloud")

    # ── Slot: Listen Toggle ─────────────────────────────────────

    def on_toggle_listen(self):
        if not self.controller:
            return

        self.controller.toggle_listening()

        if self.controller.state.is_running:
            self.toggle_listen_btn.setText("\u25a0  STOP COPYING")
            self.toggle_listen_btn.setStyleSheet(
                "padding: 8px; font-size: 10pt; font-weight: bold; "
                "border: 1px solid #00d4aa; color: #00d4aa;"
            )
        else:
            self.toggle_listen_btn.setText("\u25b6  START COPYING")
            self.toggle_listen_btn.setStyleSheet(
                "padding: 8px; font-size: 10pt; font-weight: bold;"
            )

    # ── Slot: Risk Changed ──────────────────────────────────────

    def on_risk_changed(self, value):
        if self.controller:
            self.controller.state.risk_multiplier = value


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = SlaveWindow()
    window.show()
    sys.exit(app.exec())
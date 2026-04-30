import sys

import MetaTrader5 as mt5
from PySide6.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)
from PySide6.QtCore import Qt, Slot

from controllers.ui_controllers.slave_controller import SlaveController
from views.qt.primitives import Btn, Card, FieldLabel, LineInput, MonoInput
from views.qt.shell import HeaderStripSlave, TitleBar, WindowShell
from views.qt.theme import ACCENT, BG, DANGER, FOOTER_H, HEADER_H, KPI_H, TEXT
from views.qt.ui_bridge import UIBridge


def _field_block(title: str, widget: QWidget) -> QWidget:
    box = QWidget()
    col = QVBoxLayout(box)
    col.setContentsMargins(0, 0, 0, 0)
    col.setSpacing(4)
    col.addWidget(FieldLabel(title))
    col.addWidget(widget)
    return box


class SlaveLoginCard(QWidget):
    """Design-system credential card (~400px) for Slave node."""

    def __init__(self, parent=None):
        super().__init__(parent)
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)

        self.card_frame = Card()
        self.card_frame.setFixedWidth(400)
        inner = QVBoxLayout(self.card_frame)
        inner.setContentsMargins(24, 24, 24, 24)
        inner.setSpacing(12)

        title_row = QHBoxLayout()
        title_row.setSpacing(10)

        logo = QLabel("\u26a1")
        logo.setFixedSize(20, 20)
        logo.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo.setStyleSheet(
            f"""
            background: {ACCENT};
            border-radius: 5px;
            color: #02110b;
            font-weight: 700;
            font-size: 11px;
            """
        )

        ttl = QLabel(
            f"<span style='color:{ACCENT}; font-weight:700'>TradeSync.Pro</span>"
            f"<span style='color:{TEXT}; font-weight:600'> &middot; Slave Node</span>"
        )
        ttl.setTextFormat(Qt.TextFormat.RichText)

        title_row.addWidget(logo)
        title_row.addWidget(ttl)
        title_row.addStretch()

        inner.addLayout(title_row)

        self.email_input = LineInput(placeholder="Registered email address")
        self.mt5_login_input = MonoInput(placeholder="MT5 account login ID")
        self.mt5_password_input = LineInput(placeholder="MT5 password")
        self.mt5_password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.server_input = LineInput(placeholder="Server string from MT5 broker")
        self.broker_path_input = LineInput(placeholder="Broker name: XM, Vantage, Exness, …")

        inner.addWidget(_field_block("Registered email", self.email_input))
        inner.addWidget(_field_block("MT5 account ID", self.mt5_login_input))
        inner.addWidget(_field_block("MT5 password", self.mt5_password_input))
        inner.addWidget(_field_block("Server string", self.server_input))
        inner.addWidget(_field_block("Broker path", self.broker_path_input))

        self.error_label = QLabel("")
        self.error_label.setWordWrap(True)
        self.error_label.setStyleSheet(f"color: {DANGER}; font-size: 12px;")
        self.error_label.hide()
        inner.addWidget(self.error_label)

        self.login_btn = Btn("LOG IN", kind="primary", size="lg")
        inner.addWidget(self.login_btn)

        root.addWidget(self.card_frame)


def _slave_log_category(line: str) -> str:
    if "[RISK]" in line:
        return "MT5"
    if "OPEN SUCCESS" in line or "[COPY]" in line or "Copying" in line:
        return "COPY"
    if "CLOSE SUCCESS" in line:
        return "COPY"
    if "[SESSION]" in line:
        return "SESSION"
    if "DAILY LOSS" in line or "FAILED" in line or "CLOUD REJECTED" in line:
        return "ERR"
    if "MT5 Error" in line or "MT5 login" in line:
        return "MT5"
    if "SOCKET" in line.upper() or "Socket" in line:
        return "COPY"
    if "CLOUD ERROR" in line:
        return "ERR"
    if "CLOUD REJECTED" in line:
        return "ERR"
    return "INFO"


def _slave_header_variant(state) -> str:
    if getattr(state, "mt5_connected", False) and getattr(state, "socket_connected", False):
        if getattr(state, "is_running", False):
            return "listening"
        return "idle"
    hs = getattr(state, "health_state", "DISCONNECTED")
    if getattr(state, "mt5_connected", False) and not getattr(state, "socket_connected", False):
        return "reconnect" if hs == "RECONNECTING" else "error"
    return "error"


def _slave_master_display(state):
    mn = getattr(state, "master_name", None)
    if mn:
        return str(mn).strip()
    return None


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
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window
        )

        self.bridge = UIBridge()
        self.bridge.ui_update_requested.connect(self.update_ui)
        self.controller = SlaveController(self.bridge.request_update)

        self._slave_log_emit_cursor = 0
        self._slave_header_signature = None  # tuple (master_name_or_none, variant)

        self.setStyleSheet(
            BLOOMBERG_QSS
            + f"\nQMainWindow {{ background-color: {BG}; }}\n"
        )

        self.central_widget = QStackedWidget()
        self.setCentralWidget(self.central_widget)

        self.login_widget = self.build_login_screen()
        self.dashboard_widget = self.build_dashboard_screen()

        self.central_widget.addWidget(self.login_widget)
        self.central_widget.addWidget(self.dashboard_widget)

    def build_login_screen(self):
        panel = QWidget()
        panel.setObjectName("SlaveLoginBackdrop")
        panel.setStyleSheet(f"#SlaveLoginBackdrop {{ background-color: {BG}; }}")

        v = QVBoxLayout(panel)
        v.setContentsMargins(0, 0, 0, 0)
        v.addStretch(1)

        mid = QHBoxLayout()
        mid.addStretch(1)

        self.login_card = SlaveLoginCard()
        mid.addWidget(self.login_card)
        mid.addStretch(1)
        v.addLayout(mid)

        v.addStretch(1)

        self.login_card.login_btn.clicked.connect(self.on_login_submit)
        return panel

    def build_dashboard_screen(self):
        """Post-login scaffold: TitleBar + ``WindowShell`` (placeholders inside shell stack)."""

        dash = QWidget()
        v = QVBoxLayout(dash)
        v.setContentsMargins(0, 0, 0, 0)
        v.setSpacing(0)

        self.title_bar = TitleBar(role="Slave Node", window=self)
        v.addWidget(self.title_bar)

        self.shell = WindowShell(role="slave")

        sb_lay = self.shell.sidebar.layout()
        if hasattr(sb_lay, "setContentsMargins"):
            sb_lay.setContentsMargins(0, HEADER_H + KPI_H, 0, FOOTER_H)

        v.addWidget(self.shell, 1)

        return dash

    def _slave_sync_header_strip(self):
        shell = getattr(self, "shell", None)
        if shell is None or not isinstance(shell.header, HeaderStripSlave):
            return

        state = self.controller.state
        variant = _slave_header_variant(state)
        name = _slave_master_display(state)
        sig = (name, variant)
        if getattr(self, "_slave_header_signature", None) == sig:
            return
        self._slave_header_signature = sig

        old_header = shell.header
        container = old_header.parentWidget()
        laid = container.layout()
        if laid is None:
            return

        ix = laid.indexOf(old_header)
        if ix < 0:
            ix = 0

        laid.removeWidget(old_header)
        old_header.deleteLater()

        new_header = HeaderStripSlave(master_name=name, status=variant, latency=None)
        laid.insertWidget(ix, new_header)
        shell.header = new_header

    # ── Slot: UI Update ─────────────────────────────────────────

    @Slot()
    def update_ui(self):
        if not self.controller:
            return

        if self.central_widget.currentWidget() is not getattr(
            self, "dashboard_widget", None
        ):
            return

        shell = getattr(self, "shell", None)
        if shell is None:
            return

        state = self.controller.state

        cloud_ok = getattr(state, "mt5_connected", False) and getattr(
            state, "socket_connected", False
        )
        shell.footer.set_connected(cloud_ok, "backend connected" if cloud_ok else "")

        self._slave_sync_header_strip()

        pnl_txt = f"${state.session_pnl:.2f}"
        copied_txt = str(len(getattr(state, "open_trades", [])))

        eq_txt = "---"
        if getattr(state, "mt5_connected", False):
            try:
                ai = mt5.account_info()
                if ai is not None:
                    eq_txt = f"${float(ai.equity):,.2f}"
            except Exception:
                eq_txt = "---"

        shell.kpi.update_kpis(
            signals="—",
            copied=copied_txt,
            session_pnl=pnl_txt,
            equity=eq_txt,
            latency="—",
        )

        logs = state.logs
        cur = self._slave_log_emit_cursor
        if len(logs) < cur:
            cur = len(logs)
        new_chunk = logs[cur:]
        for line in new_chunk:
            shell.event_log.append_log(line, _slave_log_category(line))
        self._slave_log_emit_cursor = len(logs)

        if hasattr(self, "risk_panel"):
            self.risk_panel.refresh_display()
        if hasattr(self, "trades_panel"):
            self.trades_panel.refresh_display()

    # ── Slot: Login ─────────────────────────────────────────────

    def on_login_submit(self):
        lc = self.login_card

        lc.error_label.hide()

        broker = lc.broker_path_input.text().strip()
        login = lc.mt5_login_input.text().strip()
        password = lc.mt5_password_input.text().strip()
        server = lc.server_input.text().strip()
        email_identifier = lc.email_input.text().strip()

        btn = lc.login_btn
        btn.setEnabled(False)
        btn.setText("Connecting...")
        QApplication.processEvents()

        success = self.controller.login_mt5(
            broker, login, password, server, email_identifier
        )

        if success:
            self._show_dashboard()
            btn.setEnabled(True)
            btn.setText("LOG IN")
        else:
            lc.error_label.setText(
                "Login failed. Check cloud email (same as web registration), "
                "broker name (XM, Vantage, Exness, …), MT5 credentials, and server."
            )
            lc.error_label.show()
            btn.setEnabled(True)
            btn.setText("LOG IN")

    def _show_dashboard(self):
        """Reset shell sync guards and reveal the scaffold built at startup."""
        self._slave_header_signature = None
        self._slave_log_emit_cursor = 0
        self.central_widget.setCurrentWidget(self.dashboard_widget)
        QApplication.processEvents()
        self.update_ui()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = SlaveWindow()
    window.show()
    sys.exit(app.exec())
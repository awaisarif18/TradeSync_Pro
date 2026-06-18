import sys
import re
from datetime import datetime

import MetaTrader5 as mt5
import requests
from PySide6.QtCore import Qt, QTimer, Slot
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QPushButton,
    QStackedWidget,
    QSizePolicy,
    QTableWidget,
    QTableWidgetItem,
    QTabWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)
from PySide6.QtGui import QColor

from controllers.ui_controllers.master_controller import MasterController
from views.qt.primitives import Btn, Card, DarkDropdown, FieldLabel, LineInput, MonoInput
from views.qt.shell import HeaderStripMaster, TitleBar, WindowShell
from views.qt.theme import ACCENT, BG, DANGER, FOOTER_H, HEADER_H, KPI_H, TEXT, build_global_qss
from views.qt.ui_bridge import UIBridge
from views.qt.views.broadcast_view import BroadcastView
from views.qt.views.performance_view import PerformanceView
from views.qt.views.subscribers_view import SubscribersView


def _field_block(title: str, widget: QWidget) -> QWidget:
    box = QWidget()
    col = QVBoxLayout(box)
    col.setContentsMargins(0, 0, 0, 0)
    col.setSpacing(4)
    col.addWidget(FieldLabel(title))
    col.addWidget(widget)
    return box


class MasterLoginCard(QWidget):
    """Design-system credential card (~400px) for Master node."""

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
            f"<span style='color:{TEXT}; font-weight:600'> &middot; Master Node</span>"
        )
        ttl.setTextFormat(Qt.TextFormat.RichText)

        title_row.addWidget(logo)
        title_row.addWidget(ttl)
        title_row.addStretch()
        inner.addLayout(title_row)

        self.license_key_input = MonoInput(placeholder="TSP-XXXX-XXXX")
        self.mt5_login_input = MonoInput(placeholder="MT5 account login ID")
        self.mt5_password_input = LineInput(placeholder="MT5 password")
        self.mt5_password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.server_input = LineInput(placeholder="Server string from MT5 broker")
        self.broker_path_input = DarkDropdown()
        self.broker_path_input.addItems(
            ["Vantage", "XM", "Exness", "Exness Slave", "Auto-Detect"]
        )

        inner.addWidget(_field_block("License key", self.license_key_input))
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
        inner.addStretch(1)

        root.addWidget(self.card_frame)


class MasterWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TradeSync Pro - Master Node")
        self.setMinimumSize(900, 650)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)
        self.setStyleSheet(build_global_qss() + f"\nQMainWindow {{ background-color: {BG}; }}\n")

        self.performance_data = {}
        self._last_subscriber_status = {}
        self._master_log_emit_cursor = 0
        self._master_header_signature = None

        self.bridge = UIBridge()
        self.bridge.ui_update_requested.connect(self.update_ui)
        self.controller = MasterController(self.bridge.request_update)

        self.central_widget = QStackedWidget()
        self.setCentralWidget(self.central_widget)

        self.login_widget = self.build_login_screen()
        self.dashboard_widget = self.build_dashboard_screen()

        self.central_widget.addWidget(self.login_widget)
        self.central_widget.addWidget(self.dashboard_widget)
        self.show_login()

        self.ui_timer = QTimer()
        self.ui_timer.timeout.connect(self.update_ui)
        self.ui_timer.start(500)

        self.session_timer = QTimer()
        self.session_timer.timeout.connect(self._update_session_clock)
        self.session_timer.start(1000)

    def build_login_screen(self):
        panel = QWidget()
        panel.setObjectName("MasterLoginBackdrop")
        panel.setStyleSheet(f"#MasterLoginBackdrop {{ background-color: {BG}; }}")

        v = QVBoxLayout(panel)
        v.setContentsMargins(0, 0, 0, 0)
        v.addStretch(1)

        mid = QHBoxLayout()
        mid.addStretch(1)

        self.login_card = MasterLoginCard()
        mid.addWidget(self.login_card)
        mid.addStretch(1)
        v.addLayout(mid)

        v.addStretch(1)

        self.login_card.login_btn.clicked.connect(self.on_login_submit)
        return panel

    def build_dashboard_screen(self):
        dash = QWidget()
        v = QVBoxLayout(dash)
        v.setContentsMargins(0, 0, 0, 0)
        v.setSpacing(0)

        self.title_bar = TitleBar(role="Master Node", window=self)
        v.addWidget(self.title_bar)

        self.shell = WindowShell(role="master")

        self.broadcast_view = BroadcastView(self.controller)
        self._replace_shell_placeholder(self.shell, "broadcast", self.broadcast_view)

        self.subscribers_view = SubscribersView(self.controller)
        self._replace_shell_placeholder(self.shell, "subscribers", self.subscribers_view)

        self.performance_view = PerformanceView(self.controller)
        self._replace_shell_placeholder(self.shell, "performance", self.performance_view)

        sb_lay = self.shell.sidebar.layout()
        if hasattr(sb_lay, "setContentsMargins"):
            sb_lay.setContentsMargins(0, HEADER_H + KPI_H, 0, FOOTER_H)

        v.addWidget(self.shell, 1)
        self.shell.show_view("broadcast")
        return dash

    def _replace_shell_placeholder(self, shell: WindowShell, key: str, widget: QWidget) -> None:
        old = shell._views[key]
        ix = shell.stack.indexOf(old)
        shell.stack.removeWidget(old)
        old.deleteLater()
        shell._views[key] = widget
        shell.stack.insertWidget(ix, widget)

    def _build_broadcast_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        status_row = QHBoxLayout()
        status_row.setSpacing(24)

        self.lbl_broadcast_status = QLabel("STATUS  ● IDLE")
        self.lbl_broadcast_status.setStyleSheet(
            "color: #444444; font-family: Consolas; font-weight: bold;"
        )
        status_row.addWidget(self.lbl_broadcast_status)

        self.lbl_session_time = QLabel("SESSION  --:--:--")
        self.lbl_session_time.setStyleSheet(
            "color: #666666; font-family: Consolas; font-weight: bold;"
        )
        status_row.addWidget(self.lbl_session_time)

        self.lbl_signals_sent = QLabel("SIGNALS  0")
        self.lbl_signals_sent.setStyleSheet(
            "color: #c8c8c8; font-family: Consolas; font-weight: bold;"
        )
        status_row.addWidget(self.lbl_signals_sent)
        status_row.addStretch()
        layout.addLayout(status_row)

        self.toggle_broadcast_btn = QPushButton("▶  START BROADCASTING")
        self.toggle_broadcast_btn.setStyleSheet(self._broadcast_button_style(False))
        self.toggle_broadcast_btn.clicked.connect(self.on_toggle_broadcast)
        layout.addWidget(self.toggle_broadcast_btn)

        account_group = QGroupBox("ACCOUNT")
        account_layout = QGridLayout(account_group)
        account_layout.setHorizontalSpacing(18)
        account_layout.setVerticalSpacing(8)

        self.lbl_account_name = QLabel("--")
        self.lbl_account_server = QLabel("--")
        self.lbl_account_balance = QLabel("$0.00")
        for value_label in [
            self.lbl_account_name,
            self.lbl_account_server,
            self.lbl_account_balance,
        ]:
            value_label.setStyleSheet(
                "color: #c8c8c8; font-family: Consolas; font-weight: bold;"
            )

        account_layout.addWidget(QLabel("Account:"), 0, 0)
        account_layout.addWidget(self.lbl_account_name, 0, 1)
        account_layout.addWidget(QLabel("Server:"), 1, 0)
        account_layout.addWidget(self.lbl_account_server, 1, 1)
        account_layout.addWidget(QLabel("Balance:"), 2, 0)
        account_layout.addWidget(self.lbl_account_balance, 2, 1)
        layout.addWidget(account_group)

        log_group = QGroupBox("EVENT LOG")
        log_layout = QVBoxLayout(log_group)
        self.logs_text = QTextEdit()
        self.logs_text.setReadOnly(True)
        self.logs_text.setSizePolicy(
            QSizePolicy.Expanding,
            QSizePolicy.Expanding,
        )
        log_layout.addWidget(self.logs_text)
        layout.addWidget(log_group, 1)

        return tab

    def _broadcast_button_style(self, active):
        border_color = "#00d4aa" if active else "#2a2a2a"
        text_color = "#00d4aa" if active else "#c8c8c8"
        return (
            "QPushButton { background: transparent; "
            f"border: 1px solid {border_color}; color: {text_color}; "
            "padding: 8px; font-size: 10pt; font-weight: bold; "
            "font-family: Consolas; }"
            "QPushButton:hover { background: #00d4aa; color: #0a0a0a; "
            "border: 1px solid #00d4aa; }"
            "QPushButton:pressed { background: #009980; color: #0a0a0a; }"
        )

    def _append_log_message(self, message):
        if (
            '[MASTER]' in message or
            'CONNECTED' in message or
            'SUCCESS' in message or
            'Broadcasting STARTED' in message
        ):
            color = '#00d4aa'
        elif (
            'FAILED' in message or
            'ERROR' in message or
            'blocked' in message or
            'DISCONNECTED' in message
        ):
            color = '#ff4444'
        elif '[RISK]' in message or 'WARNING' in message:
            color = '#ffaa00'
        elif 'CLOSE' in message:
            color = '#888888'
        else:
            color = '#666666'

        self.logs_text.append(
            f'<span style="color:{color}; font-family:Consolas; font-size:8pt;">'
            f'{message}</span>'
        )

    def show_login(self):
        self.central_widget.setCurrentWidget(self.login_widget)

    def show_dashboard(self):
        self.central_widget.setCurrentWidget(self.dashboard_widget)
        self._master_header_signature = None
        self._master_log_emit_cursor = 0
        self.load_performance_stats()
        QTimer.singleShot(1000, self.controller.fetch_subscribers)
        QApplication.processEvents()
        self.update_ui()

    def on_login_submit(self):
        lc = self.login_card
        lc.error_label.hide()
        lc.error_label.setText("")

        broker = lc.broker_path_input.currentText().strip()
        login = lc.mt5_login_input.text().strip()
        password = lc.mt5_password_input.text().strip()
        server = lc.server_input.text().strip()
        license_key = lc.license_key_input.text().strip()

        validation_error = None
        if not login:
            validation_error = "MT5 Login ID is required."
        elif not login.isdigit():
            validation_error = "MT5 Login ID must be numeric."
        elif not password:
            validation_error = "MT5 Password is required."
        elif not server:
            validation_error = "Server String is required."
        elif not re.match(r"^TSP-[A-Z0-9]{4}-[A-Z0-9]{4}$", license_key):
            validation_error = "License Key must match TSP-XXXX-XXXX."

        if validation_error:
            lc.error_label.setText(validation_error)
            lc.error_label.show()
            return

        btn = lc.login_btn
        btn.setEnabled(False)
        btn.setText("Connecting...")
        QApplication.processEvents()

        success = self.controller.login_mt5(
            broker, login, password, server, license_key
        )

        if success:
            btn.setEnabled(True)
            btn.setText("LOG IN")
            self.show_dashboard()
        else:
            btn.setEnabled(True)
            btn.setText("LOG IN")

    def on_toggle_broadcast(self):
        if not self.controller:
            return
        self.controller.toggle_broadcasting()
        self.update_ui()

    def _refresh_account_info(self):
        account = mt5.account_info()
        if not account:
            self.lbl_account_name.setText("--")
            self.lbl_account_server.setText("--")
            self.lbl_account_balance.setText("$0.00")
            return

        self.lbl_account_name.setText(str(account.name))
        self.lbl_account_server.setText(str(account.server))
        self.lbl_account_balance.setText(f"${account.balance:.2f}")

    def load_performance_stats(self):
        master_id = self.controller.state.master_user_id
        if not master_id:
            print(
                "[AVATAR] load_performance_stats early_return reason=no_master_user_id "
                "(avatar block not reached)"
            )
            self.performance_data = {}
            self.controller.state.own_avatar_url = None
            self._render_performance_stats()
            return

        try:
            response = requests.get(
                f"http://localhost:3000/auth/masters/{master_id}/profile",
                timeout=5,
            )
            if response.status_code == 200:
                self.performance_data = response.json()
            else:
                print(
                    f"[AVATAR] load_performance_stats early_return reason=profile_http_"
                    f"{response.status_code} (avatar block not reached)"
                )
                self.performance_data = {}
                self.controller.state.own_avatar_url = None
        except requests.exceptions.RequestException as e:
            print(
                f"[AVATAR] load_performance_stats early_return reason=profile_request_"
                f"error {e!r} (avatar block not reached)"
            )
            self.performance_data = {}
            self.controller.state.own_avatar_url = None
        else:
            if self.performance_data:
                avatar = self.performance_data.get("avatarUrl")
                self.controller.state.own_avatar_url = (
                    str(avatar).strip()
                    if avatar and str(avatar).strip()
                    else None
                )
                print(
                    f"[AVATAR] master profile avatarUrl raw={avatar!r} "
                    f"stored own_avatar_url={self.controller.state.own_avatar_url!r}"
                )
            else:
                print(
                    "[AVATAR] load_performance_stats avatar block ran but profile empty; "
                    "stored own_avatar_url=None"
                )
                self.controller.state.own_avatar_url = None

        self.refresh_performance(self.performance_data)

    def refresh_performance(self, stats: dict):
        if hasattr(self, "performance_view"):
            recent = getattr(self.controller.state, "recent_signals", [])
            self.performance_view.sync_from_state(stats or {}, recent)

    def _sync_subscriber_activity(self):
        if not hasattr(self, "subscribers_view"):
            return

        current = dict(self.controller.state.subscriber_online_status)
        for email, online in current.items():
            if self._last_subscriber_status.get(email) != online:
                self.subscribers_view.log_activity(email, online)
        self._last_subscriber_status = current

    def _master_header_variant(self, state) -> str:
        if getattr(state, "mt5_connected", False) and getattr(state, "socket_connected", False):
            return "broadcasting" if getattr(state, "is_running", False) else "idle"
        hs = getattr(state, "health_state", "DISCONNECTED")
        if getattr(state, "mt5_connected", False) and not getattr(state, "socket_connected", False):
            return "reconnect" if hs == "RECONNECTING" else "error"
        return "error"

    def _master_display_name(self):
        try:
            ai = mt5.account_info()
        except Exception:
            ai = None
        if ai is None:
            return None
        name = str(getattr(ai, "name", "") or "").strip()
        return name or None

    def _master_sync_header_strip(self) -> None:
        shell = getattr(self, "shell", None)
        if shell is None or not isinstance(shell.header, HeaderStripMaster):
            return
        state = self.controller.state
        name = self._master_display_name()
        variant = self._master_header_variant(state)
        elapsed = self._update_session_clock()
        elapsed_val = elapsed if elapsed != "--:--:--" else None
        avatar_url = getattr(state, "own_avatar_url", None)

        sig = (name, variant, avatar_url)
        if getattr(self, "_master_header_signature", None) != sig:
            print(
                f"[AVATAR] master header sync name={name!r} own_avatar_url={avatar_url!r} "
                f"variant={variant!r}"
            )
            self._master_header_signature = sig

        shell.header.sync_state(
            name=name,
            avatar_url=avatar_url,
            status=variant,
            session_elapsed=elapsed_val,
        )

    def _apply_master_header_profile(self) -> None:
        shell = getattr(self, "shell", None)
        if shell is None or not isinstance(shell.header, HeaderStripMaster):
            return
        stats = self.performance_data or {}
        full = str(stats.get("fullName") or "").strip()
        first = full.split()[0].lower() if full else ""
        handle = f"@{first}_fx" if first else "@master"
        instruments = str(stats.get("instruments") or "").strip() or "Mixed"
        risk = str(stats.get("riskLevel") or "medium").strip()
        # Header shows “30d ROI”; profile has no ROI field yet — use winRate as the displayed %.
        roi_pct = float(stats.get("winRate", 0) or 0)
        shell.header.set_profile_data(handle, instruments, risk, roi_pct)

    def _master_log_category(self, line: str) -> str:
        up = line.upper()
        if "ERROR" in up or "FAILED" in up or "REJECTED" in up:
            return "ERR"
        if "[RISK]" in up:
            return "MT5"
        if "SOCKET" in up or "CONNECTED" in up or "DISCONNECTED" in up:
            return "SESSION"
        if "OPEN" in up or "CLOSE" in up or "SIGNAL" in up:
            return "SIGNAL"
        return "INFO"

    @Slot()
    def update_ui(self):
        if not self.controller:
            return
        if self.central_widget.currentWidget() is not getattr(self, "dashboard_widget", None):
            return
        shell = getattr(self, "shell", None)
        if shell is None:
            return

        state = self.controller.state
        cloud_ok = getattr(state, "mt5_connected", False) and getattr(
            state, "socket_connected", False
        )
        shell.footer.set_connected(cloud_ok, "backend connected" if cloud_ok else "")
        self._master_sync_header_strip()
        self._apply_master_header_profile()

        stats = self.performance_data or {}
        wr = float(stats.get("winRate", 0.0) or 0.0)
        pnl = float(stats.get("totalPnL", 0.0) or 0.0)
        shell.kpi.update_kpis(
            signals=str(getattr(state, "signals_sent", 0)),
            subscribers=str(len(getattr(state, "subscribers", []))),
            win_rate=(f"{wr:.1f}%", ACCENT if wr >= 50 else DANGER),
            total_pnl=(f"${pnl:.2f}", ACCENT if pnl >= 0 else DANGER),
            avg_volume=f"{float(stats.get('avgVolume', 0.0) or 0.0):.2f}",
        )

        logs = state.logs
        cur = self._master_log_emit_cursor
        if len(logs) < cur:
            cur = len(logs)
        for line in logs[cur:]:
            shell.event_log.append_log(line, self._master_log_category(line))
        self._master_log_emit_cursor = len(logs)

        bv = getattr(self, "broadcast_view", None)
        if bv is not None:
            bv.sync_from_state()
        self.refresh_performance(self.performance_data)

        self._sync_subscriber_activity()
        if hasattr(self, "subscribers_view"):
            self.subscribers_view.refresh_display()

    def _update_session_clock(self):
        state = self.controller.state
        if state.is_running and state.session_start_time_master:
            try:
                start = datetime.strptime(
                    state.session_start_time_master,
                    '%H:%M:%S',
                )
                now = datetime.now()
                elapsed = now - start.replace(
                    year=now.year,
                    month=now.month,
                    day=now.day,
                )
                return str(elapsed).split(".")[0]
            except Exception:
                return "--:--:--"
        return "--:--:--"


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MasterWindow()
    window.show()
    sys.exit(app.exec())
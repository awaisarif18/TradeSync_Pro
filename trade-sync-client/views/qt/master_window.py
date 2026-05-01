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
from views.qt.subscribers_panel import SubscribersPanel
from views.qt.theme import ACCENT, BG, DANGER, TEXT, build_global_qss
from views.qt.ui_bridge import UIBridge


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
        self.setStyleSheet(build_global_qss() + f"\nQMainWindow {{ background-color: {BG}; }}\n")

        self.performance_data = {}
        self._last_subscriber_status = {}
        self._rendered_log_count = 0

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
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(4, 4, 4, 4)

        self.tab_widget = QTabWidget()
        self.tab_widget.addTab(self._build_broadcast_tab(), "BROADCAST")

        self.subscribers_panel = SubscribersPanel(
            self.controller.state,
            refresh_callback=self.controller.fetch_subscribers,
        )
        self.tab_widget.addTab(self.subscribers_panel, "SUBSCRIBERS")

        self.tab_widget.addTab(self._build_performance_tab(), "PERFORMANCE")
        layout.addWidget(self.tab_widget)

        return widget

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

    def _build_performance_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(8)

        stats_grid = QGridLayout()
        stats_grid.setHorizontalSpacing(8)
        stats_grid.setVerticalSpacing(8)

        total_card, self.stat_total_trades = self._create_stat_card(
            "TOTAL TRADES",
            "#c8c8c8",
        )
        closed_card, self.stat_closed_trades = self._create_stat_card(
            "CLOSED TRADES",
            "#c8c8c8",
        )
        win_card, self.stat_win_rate = self._create_stat_card(
            "WIN RATE",
            "#00d4aa",
        )
        pnl_card, self.stat_total_pnl = self._create_stat_card(
            "TOTAL PNL",
            "#00d4aa",
        )
        avg_card, self.stat_avg_volume = self._create_stat_card(
            "AVG VOLUME",
            "#c8c8c8",
        )
        subs_card, self.stat_subscribers = self._create_stat_card(
            "SUBSCRIBERS",
            "#c8c8c8",
        )

        stats_grid.addWidget(total_card, 0, 0)
        stats_grid.addWidget(closed_card, 0, 1)
        stats_grid.addWidget(win_card, 1, 0)
        stats_grid.addWidget(pnl_card, 1, 1)
        stats_grid.addWidget(avg_card, 2, 0)
        stats_grid.addWidget(subs_card, 2, 1)

        layout.addLayout(stats_grid)

        signals_group = QGroupBox("RECENT SIGNALS")
        signals_layout = QVBoxLayout(signals_group)

        self.table_recent_signals = QTableWidget()
        self.table_recent_signals.setObjectName("table_recent_signals")
        self.table_recent_signals.setColumnCount(4)
        self.table_recent_signals.setHorizontalHeaderLabels(
            ["TIME", "SYMBOL", "ACTION", "VOLUME"]
        )
        self.table_recent_signals.setColumnWidth(0, 85)
        self.table_recent_signals.setColumnWidth(1, 80)
        self.table_recent_signals.setColumnWidth(2, 60)
        self.table_recent_signals.setColumnWidth(3, 70)
        self.table_recent_signals.setMaximumHeight(200)
        self.table_recent_signals.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table_recent_signals.verticalHeader().setVisible(False)
        self.table_recent_signals.setSelectionBehavior(QTableWidget.SelectRows)
        self.table_recent_signals.setAlternatingRowColors(False)
        signals_layout.addWidget(self.table_recent_signals)

        layout.addWidget(signals_group)
        layout.addStretch()
        return tab

    def _create_stat_card(self, label_text, value_color):
        card = QFrame()
        card.setStyleSheet(
            "QFrame { border: 1px solid #1a1a1a; background: #0d0d0d; "
            "border-radius: 2px; padding: 8px 10px; }"
        )
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(10, 8, 10, 8)
        card_layout.setSpacing(4)

        value = QLabel("0")
        value.setStyleSheet(
            f"color: {value_color}; font-family: Consolas; font-size: 16pt;"
        )
        label = QLabel(label_text)
        label.setStyleSheet(
            "color: #444444; font-family: Segoe UI; font-size: 7pt; "
            "font-weight: bold;"
        )

        card_layout.addWidget(value)
        card_layout.addWidget(label)
        return card, value

    def show_login(self):
        self.central_widget.setCurrentWidget(self.login_widget)

    def show_dashboard(self):
        self.central_widget.setCurrentWidget(self.dashboard_widget)
        self._refresh_account_info()
        self.load_performance_stats()
        QTimer.singleShot(1000, self.controller.fetch_subscribers)

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
            self.performance_data = {}
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
                self.performance_data = {}
        except requests.exceptions.RequestException:
            self.performance_data = {}

        self.refresh_performance(self.performance_data)

    def _render_performance_stats(self):
        self.refresh_performance(self.performance_data)

    def refresh_performance(self, stats: dict):
        self.stat_total_trades.setText(str(stats.get('totalTrades', 0)))
        self.stat_closed_trades.setText(str(stats.get('closedTrades', 0)))

        wr = stats.get('winRate', 0.0)
        self.stat_win_rate.setText(f"{wr:.1f}%")
        self.stat_win_rate.setStyleSheet(
            f"color: {'#00d4aa' if wr >= 50 else '#ff4444'}; "
            "font-family: Consolas; font-size: 16pt;"
        )

        pnl = stats.get('totalPnL', 0.0)
        self.stat_total_pnl.setText(f"${pnl:.2f}")
        self.stat_total_pnl.setStyleSheet(
            f"color: {'#00d4aa' if pnl >= 0 else '#ff4444'}; "
            "font-family: Consolas; font-size: 16pt;"
        )

        self.stat_avg_volume.setText(f"{stats.get('avgVolume', 0.0):.2f} lots")

        subs = stats.get('subscriberCount', 0)
        self.stat_subscribers.setText(str(subs))
        self.stat_subscribers.setStyleSheet(
            f"color: {'#00d4aa' if subs > 0 else '#c8c8c8'}; "
            "font-family: Consolas; font-size: 16pt;"
        )

    def refresh_recent_signals(self):
        signals = list(reversed(getattr(self.controller.state, 'recent_signals', [])))[:10]
        self.table_recent_signals.setRowCount(len(signals))
        for i, sig in enumerate(signals):
            self.table_recent_signals.setRowHeight(i, 26)
            self.table_recent_signals.setItem(
                i,
                0,
                QTableWidgetItem(sig.get('time', '')),
            )
            self.table_recent_signals.setItem(
                i,
                1,
                QTableWidgetItem(sig.get('symbol', '')),
            )
            action = sig.get('action', '')
            action_item = QTableWidgetItem(action)
            action_item.setForeground(
                QColor('#00d4aa') if action == 'BUY' else QColor('#ff4444')
            )
            self.table_recent_signals.setItem(i, 2, action_item)
            self.table_recent_signals.setItem(
                i,
                3,
                QTableWidgetItem(str(sig.get('volume', ''))),
            )

    def _sync_subscriber_activity(self):
        if not hasattr(self, 'subscribers_panel'):
            return

        current = dict(self.controller.state.subscriber_online_status)
        for email, online in current.items():
            if self._last_subscriber_status.get(email) != online:
                self.subscribers_panel.log_activity(email, online)
        self._last_subscriber_status = current

    @Slot()
    def update_ui(self):
        """Runs strictly on the Main Qt Thread. Syncs data from AppState."""
        if not self.controller:
            return

        state = self.controller.state
        is_running = state.is_running

        self.lbl_broadcast_status.setText(
            "STATUS  ● BROADCASTING" if is_running else "STATUS  ● IDLE"
        )
        status_color = "#00d4aa" if is_running else "#444444"
        self.lbl_broadcast_status.setStyleSheet(
            f"color: {status_color}; font-family: Consolas; font-weight: bold;"
        )

        self.lbl_signals_sent.setText(f"SIGNALS  {state.signals_sent}")

        if is_running:
            self.toggle_broadcast_btn.setText("■  STOP BROADCASTING")
            self.toggle_broadcast_btn.setStyleSheet(
                self._broadcast_button_style(True)
            )
        else:
            self.toggle_broadcast_btn.setText("▶  START BROADCASTING")
            self.toggle_broadcast_btn.setStyleSheet(
                self._broadcast_button_style(False)
            )

        if self._rendered_log_count > len(state.logs):
            self.logs_text.clear()
            self._rendered_log_count = 0

        for line in state.logs[self._rendered_log_count:]:
            self._append_log_message(line)
        self._rendered_log_count = len(state.logs)

        self.logs_text.verticalScrollBar().setValue(
            self.logs_text.verticalScrollBar().maximum()
        )

        self._sync_subscriber_activity()
        if hasattr(self, 'subscribers_panel'):
            self.subscribers_panel.refresh_display()
        if hasattr(self, 'refresh_recent_signals'):
            self.refresh_recent_signals()

        self._update_session_clock()

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
                self.lbl_session_time.setText(
                    f"SESSION  {str(elapsed).split('.')[0]}"
                )
            except Exception:
                self.lbl_session_time.setText("SESSION  --:--:--")
        else:
            self.lbl_session_time.setText("SESSION  --:--:--")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MasterWindow()
    window.show()
    sys.exit(app.exec())
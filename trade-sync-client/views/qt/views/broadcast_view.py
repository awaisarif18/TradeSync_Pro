"""BROADCAST tab: start/stop action, license, and MT5 account summary."""

from __future__ import annotations

import MetaTrader5 as mt5
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QGridLayout, QHBoxLayout, QLabel, QVBoxLayout, QWidget

from views.qt.custom_widgets import SweepBand
from views.qt.primitives import Btn, Card, FieldLabel, MicroLabel, MiniChip
from views.qt.theme import ACCENT, DANGER, TEXT, TEXT2, TEXT3


def _value_col(title: str, value_lbl: QLabel, sub_lbl: QLabel) -> QWidget:
    host = QWidget()
    col = QVBoxLayout(host)
    col.setContentsMargins(0, 0, 0, 0)
    col.setSpacing(4)
    col.addWidget(FieldLabel(title))
    col.addWidget(value_lbl)
    col.addWidget(sub_lbl)
    return host


class BroadcastView(QWidget):
    """Master BROADCAST page bound to ``MasterController.state``."""

    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self._controller = controller

        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # ── Panel 1: action ───────────────────────────────────
        action_card = Card(accent=True)
        a_inner = QVBoxLayout(action_card)
        a_inner.setContentsMargins(20, 20, 20, 20)
        a_inner.setSpacing(10)
        a_inner.addWidget(MicroLabel("Broadcast control"))

        self.toggle_btn = Btn("START BROADCASTING", kind="stop", size="lg")
        self.toggle_btn.clicked.connect(self._on_toggle_clicked)
        a_inner.addWidget(self.toggle_btn)

        self.sweep_strip = SweepBand()
        self.sweep_strip.setFixedHeight(4)
        self.sweep_strip.setVisible(False)
        a_inner.addWidget(self.sweep_strip)

        root.addWidget(action_card)

        # ── Panel 2: license ──────────────────────────────────
        license_card = Card()
        l_inner = QVBoxLayout(license_card)
        l_inner.setContentsMargins(20, 20, 20, 20)
        l_inner.setSpacing(10)
        l_inner.addWidget(MicroLabel("License key"))

        chip_row = QHBoxLayout()
        chip_row.setContentsMargins(0, 0, 0, 0)
        chip_row.addWidget(MiniChip("Active · 5 seats"))
        chip_row.addStretch(1)
        l_inner.addLayout(chip_row)

        self.license_lbl = QLabel("TSP-XXXX-XXXX")
        self.license_lbl.setStyleSheet(
            f"font-size: 20px; font-weight: 700; color: {TEXT};"
            'font-family: "JetBrains Mono", ui-monospace, monospace;'
        )
        l_inner.addWidget(self.license_lbl)

        root.addWidget(license_card)

        # ── Panel 3: account ──────────────────────────────────
        account_card = Card()
        ac_inner = QVBoxLayout(account_card)
        ac_inner.setContentsMargins(20, 20, 20, 20)
        ac_inner.setSpacing(12)
        ac_inner.addWidget(MicroLabel("MT5 account"))

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setHorizontalSpacing(20)
        grid.setVerticalSpacing(0)

        self.account_id_val = QLabel("--")
        self.account_id_val.setStyleSheet(
            f"font-size: 18px; font-weight: 700; color: {TEXT};"
            'font-family: "JetBrains Mono", ui-monospace, monospace;'
        )
        self.account_id_sub = QLabel("Master account login")
        self.account_id_sub.setStyleSheet(f"font-size: 11px; color: {TEXT3};")

        self.server_val = QLabel("--")
        self.server_val.setStyleSheet(
            f"font-size: 18px; font-weight: 700; color: {TEXT};"
            'font-family: "JetBrains Mono", ui-monospace, monospace;'
        )
        self.server_sub = QLabel("Server")
        self.server_sub.setStyleSheet(f"font-size: 11px; color: {TEXT3};")

        self.balance_val = QLabel("$0.00")
        self.balance_val.setStyleSheet(
            f"font-size: 18px; font-weight: 700; color: {ACCENT};"
            'font-family: "JetBrains Mono", ui-monospace, monospace;'
        )
        self.balance_sub = QLabel("Balance / Equity")
        self.balance_sub.setStyleSheet(f"font-size: 11px; color: {TEXT3};")

        grid.addWidget(_value_col("Account ID", self.account_id_val, self.account_id_sub), 0, 0)
        grid.addWidget(_value_col("Server", self.server_val, self.server_sub), 0, 1)
        grid.addWidget(_value_col("Balance", self.balance_val, self.balance_sub), 0, 2)
        ac_inner.addLayout(grid)
        root.addWidget(account_card)

        root.addStretch(1)
        self.sync_from_state()

    def _state(self):
        return self._controller.state

    def _on_toggle_clicked(self) -> None:
        self._controller.toggle_broadcasting()
        self.sync_from_state()

    def sync_from_state(self) -> None:
        state = self._state()
        is_running = bool(getattr(state, "is_running", False))

        self.toggle_btn.setText("STOP BROADCASTING" if is_running else "START BROADCASTING")
        self.sweep_strip.setVisible(is_running)

        key = str(getattr(state, "license_key", "") or "").strip()
        self.license_lbl.setText(key if key else "TSP-XXXX-XXXX")

        ai = mt5.account_info() if getattr(state, "mt5_connected", False) else None
        if ai is None:
            self.account_id_val.setText("--")
            self.server_val.setText("--")
            self.balance_val.setText("$0.00")
            self.balance_val.setStyleSheet(
                f"font-size: 18px; font-weight: 700; color: {TEXT2};"
                'font-family: "JetBrains Mono", ui-monospace, monospace;'
            )
            return

        login = str(getattr(ai, "login", "--"))
        server = str(getattr(ai, "server", "--"))
        balance = float(getattr(ai, "balance", 0.0))
        equity = float(getattr(ai, "equity", balance))

        self.account_id_val.setText(login)
        self.server_val.setText(server)
        self.balance_val.setText(f"${balance:,.2f}")
        self.balance_sub.setText(f"Equity ${equity:,.2f}")
        bal_color = ACCENT if equity >= balance else DANGER
        self.balance_val.setStyleSheet(
            f"font-size: 18px; font-weight: 700; color: {bal_color};"
            'font-family: "JetBrains Mono", ui-monospace, monospace;'
        )

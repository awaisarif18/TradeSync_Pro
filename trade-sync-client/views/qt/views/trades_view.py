"""TRADES tab: open copied positions and session closed history (design-system)."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from views.qt.primitives import Card, CountChip, GhostIconBtn, MicroLabel, TradeChip
from views.qt.theme import ACCENT, DANGER, LINE, TEXT2, TEXT3


def _action_cell_widget(action: str) -> QWidget:
    wrap = QWidget()
    row = QHBoxLayout(wrap)
    row.setContentsMargins(0, 0, 0, 0)
    row.setSpacing(0)
    side = "SELL" if str(action).upper().strip() == "SELL" else "BUY"
    row.addStretch(1)
    row.addWidget(TradeChip(side=side))
    row.addStretch(1)
    return wrap


def _count_chip_style(filled: bool) -> str:
    if filled:
        return f"""
            background: rgba(0,195,137,0.12);
            color: {ACCENT};
            font-size: 10px; font-weight: 600;
            border-radius: 4px; padding: 1px 6px;
        """
    return f"""
        border: 1px solid {LINE}; color: {TEXT3};
        font-size: 10px; font-weight: 600;
        border-radius: 4px; padding: 1px 6px;
    """


class TradesView(QWidget):
    """Slave TRADES stack page; mirrors ``TradesPanel.refresh_display`` against ``controller.state``."""

    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self._controller = controller

        root = QHBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # ── Open positions card (includes session summary bar) ─────────
        card_open = Card()
        open_inner = QVBoxLayout(card_open)
        open_inner.setContentsMargins(20, 20, 20, 20)
        open_inner.setSpacing(12)

        summary_row = QHBoxLayout()
        summary_row.setSpacing(12)

        summary_row.addWidget(MicroLabel("Session"))

        lbl_open = QLabel("OPEN")
        lbl_open.setStyleSheet(f"color: {TEXT2}; font-size: 11px; font-weight: 600;")
        summary_row.addWidget(lbl_open)
        self._open_count_chip = CountChip("0", kind="outline")
        self._open_count_chip.setToolTip("Open copied positions this session")
        summary_row.addWidget(self._open_count_chip)

        lbl_closed = QLabel("CLOSED")
        lbl_closed.setStyleSheet(f"color: {TEXT2}; font-size: 11px; font-weight: 600;")
        summary_row.addWidget(lbl_closed)
        self._closed_count_chip = CountChip("0", kind="outline")
        self._closed_count_chip.setToolTip("Closed trades this session")
        summary_row.addWidget(self._closed_count_chip)

        self._lbl_session_pnl = QLabel("SESSION P&L:  $0.00")
        self._lbl_session_pnl.setStyleSheet(
            f"color: {ACCENT}; font-size: 12px; font-weight: 600;"
        )
        summary_row.addWidget(self._lbl_session_pnl)

        self._lbl_session_time = QLabel("SESSION:  --:--:--")
        self._lbl_session_time.setStyleSheet(
            f"color: {TEXT3}; font-size: 12px; font-weight: 600;"
        )
        summary_row.addWidget(self._lbl_session_time)

        self._info_btn = GhostIconBtn("ⓘ")
        self._info_btn.setToolTip(
            "Counts and P&L reset when you start listening. History capped at 50 rows."
        )
        summary_row.addWidget(self._info_btn)
        summary_row.addStretch(1)

        open_inner.addLayout(summary_row)
        open_inner.addWidget(MicroLabel("Open positions"))

        self.table_open = QTableWidget()
        self.table_open.setObjectName("table_open")
        self.table_open.setColumnCount(5)
        self.table_open.setHorizontalHeaderLabels(
            ["TICKET", "SYMBOL", "ACTION", "VOLUME", "OPENED"]
        )
        self.table_open.setColumnWidth(0, 90)
        self.table_open.setColumnWidth(1, 80)
        self.table_open.setColumnWidth(2, 72)
        self.table_open.setColumnWidth(3, 70)
        self.table_open.setColumnWidth(4, 70)
        self.table_open.horizontalHeader().setStretchLastSection(True)
        self.table_open.horizontalHeader().setDefaultAlignment(
            Qt.AlignmentFlag.AlignCenter
        )
        self.table_open.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table_open.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table_open.verticalHeader().setVisible(False)
        self.table_open.setAlternatingRowColors(False)
        self.table_open.setShowGrid(False)
        open_inner.addWidget(self.table_open, 1)

        # ── Session history card ─────────────────────────────────────────
        card_closed = Card()
        closed_inner = QVBoxLayout(card_closed)
        closed_inner.setContentsMargins(20, 20, 20, 20)
        closed_inner.setSpacing(12)
        closed_inner.addWidget(MicroLabel("Session history"))

        self.table_closed = QTableWidget()
        self.table_closed.setObjectName("table_closed")
        self.table_closed.setColumnCount(7)
        self.table_closed.setHorizontalHeaderLabels(
            ["TICKET", "SYMBOL", "ACTION", "VOLUME", "P&&L", "OPENED", "CLOSED"]
        )
        self.table_closed.setColumnWidth(0, 90)
        self.table_closed.setColumnWidth(1, 80)
        self.table_closed.setColumnWidth(2, 72)
        self.table_closed.setColumnWidth(3, 70)
        self.table_closed.setColumnWidth(4, 70)
        self.table_closed.setColumnWidth(5, 70)
        self.table_closed.setColumnWidth(6, 70)
        self.table_closed.horizontalHeader().setStretchLastSection(True)
        self.table_closed.horizontalHeader().setDefaultAlignment(
            Qt.AlignmentFlag.AlignCenter
        )
        self.table_closed.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table_closed.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table_closed.verticalHeader().setVisible(False)
        self.table_closed.setAlternatingRowColors(False)
        self.table_closed.setShowGrid(False)
        closed_inner.addWidget(self.table_closed, 1)

        root.addWidget(card_open, 1)
        root.addWidget(card_closed, 1)

    def _state(self):
        return self._controller.state

    def refresh_display(self) -> None:
        """Rebuild both tables from AppState. Called by ``SlaveWindow.update_ui()``."""
        state = self._state()

        # ── Open trades table ───────────────────────────────────
        self.table_open.setRowCount(len(state.open_trades))
        for i, trade in enumerate(state.open_trades):
            self.table_open.setRowHeight(i, 26)

            ticket_item = QTableWidgetItem(str(trade["slave_ticket"]))
            ticket_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_open.setItem(i, 0, ticket_item)

            sym_item = QTableWidgetItem(trade["symbol"])
            sym_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_open.setItem(i, 1, sym_item)

            self.table_open.setCellWidget(i, 2, _action_cell_widget(trade["action"]))

            vol_item = QTableWidgetItem(str(trade["volume"]))
            vol_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_open.setItem(i, 3, vol_item)

            time_item = QTableWidgetItem(trade["open_time"])
            time_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_open.setItem(i, 4, time_item)

        # ── Closed trades table (newest first) ──────────────────
        closed = list(reversed(state.closed_trades))
        self.table_closed.setRowCount(len(closed))
        for i, trade in enumerate(closed):
            self.table_closed.setRowHeight(i, 26)

            ticket_item = QTableWidgetItem(str(trade["slave_ticket"]))
            ticket_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_closed.setItem(i, 0, ticket_item)

            sym_item = QTableWidgetItem(trade["symbol"])
            sym_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_closed.setItem(i, 1, sym_item)

            self.table_closed.setCellWidget(i, 2, _action_cell_widget(trade["action"]))

            vol_item = QTableWidgetItem(str(trade["volume"]))
            vol_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_closed.setItem(i, 3, vol_item)

            pnl = trade.get("pnl", 0.0)
            pnl_item = QTableWidgetItem(f"${pnl:.2f}")
            pnl_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            pnl_color = ACCENT if pnl >= 0 else DANGER
            pnl_item.setForeground(QColor(pnl_color))
            self.table_closed.setItem(i, 4, pnl_item)

            open_item = QTableWidgetItem(trade["open_time"])
            open_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_closed.setItem(i, 5, open_item)

            close_item = QTableWidgetItem(trade.get("close_time", ""))
            close_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_closed.setItem(i, 6, close_item)

        # ── Update summary labels ───────────────────────────────
        open_count = len(state.open_trades)
        self._open_count_chip.setText(str(open_count))
        self._open_count_chip.setStyleSheet(_count_chip_style(open_count > 0))

        self._closed_count_chip.setText(str(len(state.closed_trades)))

        pnl = state.session_pnl
        pnl_color = ACCENT if pnl >= 0 else DANGER
        self._lbl_session_pnl.setText(f"SESSION P&L:  ${pnl:.2f}")
        self._lbl_session_pnl.setStyleSheet(
            f"color: {pnl_color}; font-size: 12px; font-weight: 600;"
        )

        st = getattr(state, "session_start_time", "") or ""
        self._lbl_session_time.setText(
            f"SESSION:  {st}" if st else "SESSION:  --:--:--"
        )

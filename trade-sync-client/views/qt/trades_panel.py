from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGroupBox,
    QLabel, QTableWidget, QTableWidgetItem
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from models.app_state import AppState


class TradesPanel(QWidget):
    def __init__(self, state: AppState, parent=None):
        super().__init__(parent)
        self.state = state
        self._build_ui()

    def _build_ui(self):
        root_layout = QVBoxLayout(self)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(6)

        # ── Section 1: Session Summary Bar ──────────────────────
        summary_row = QHBoxLayout()
        summary_row.setSpacing(24)

        self.lbl_open_count = QLabel("OPEN:  0")
        self.lbl_open_count.setStyleSheet(
            "color: #00d4aa; font-family: Consolas; font-weight: bold;"
        )
        summary_row.addWidget(self.lbl_open_count)

        self.lbl_closed_count = QLabel("CLOSED:  0")
        self.lbl_closed_count.setStyleSheet(
            "color: #888888; font-family: Consolas; font-weight: bold;"
        )
        summary_row.addWidget(self.lbl_closed_count)

        self.lbl_session_pnl = QLabel("SESSION P&&L:  $0.00")
        self.lbl_session_pnl.setStyleSheet(
            "color: #00d4aa; font-family: Consolas; font-weight: bold;"
        )
        summary_row.addWidget(self.lbl_session_pnl)

        self.lbl_session_time = QLabel("SESSION:  --:--:--")
        self.lbl_session_time.setStyleSheet(
            "color: #666666; font-family: Consolas; font-weight: bold;"
        )
        summary_row.addWidget(self.lbl_session_time)

        summary_row.addStretch()
        root_layout.addLayout(summary_row)

        # ── Section 2: Open Trades ──────────────────────────────
        open_group = QGroupBox("OPEN POSITIONS")
        open_layout = QVBoxLayout(open_group)

        self.table_open = QTableWidget()
        self.table_open.setObjectName("table_open")
        self.table_open.setColumnCount(5)
        self.table_open.setHorizontalHeaderLabels(
            ["TICKET", "SYMBOL", "ACTION", "VOLUME", "OPENED"]
        )
        self.table_open.setColumnWidth(0, 90)
        self.table_open.setColumnWidth(1, 80)
        self.table_open.setColumnWidth(2, 60)
        self.table_open.setColumnWidth(3, 70)
        self.table_open.setColumnWidth(4, 70)
        self.table_open.horizontalHeader().setStretchLastSection(True)
        self.table_open.setSelectionBehavior(QTableWidget.SelectRows)
        self.table_open.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table_open.verticalHeader().setVisible(False)
        self.table_open.setAlternatingRowColors(False)
        open_layout.addWidget(self.table_open)

        root_layout.addWidget(open_group)

        # ── Section 3: Closed Trades ────────────────────────────
        closed_group = QGroupBox("SESSION HISTORY")
        closed_layout = QVBoxLayout(closed_group)

        self.table_closed = QTableWidget()
        self.table_closed.setObjectName("table_closed")
        self.table_closed.setColumnCount(7)
        self.table_closed.setHorizontalHeaderLabels(
            ["TICKET", "SYMBOL", "ACTION", "VOLUME", "P&&L", "OPENED", "CLOSED"]
        )
        self.table_closed.setColumnWidth(0, 90)
        self.table_closed.setColumnWidth(1, 80)
        self.table_closed.setColumnWidth(2, 60)
        self.table_closed.setColumnWidth(3, 70)
        self.table_closed.setColumnWidth(4, 70)
        self.table_closed.setColumnWidth(5, 70)
        self.table_closed.setColumnWidth(6, 70)
        self.table_closed.horizontalHeader().setStretchLastSection(True)
        self.table_closed.setSelectionBehavior(QTableWidget.SelectRows)
        self.table_closed.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table_closed.verticalHeader().setVisible(False)
        self.table_closed.setAlternatingRowColors(False)
        closed_layout.addWidget(self.table_closed)

        root_layout.addWidget(closed_group)

    def refresh_display(self):
        """Rebuild both tables from AppState. Called by update_ui()."""
        # ── Open trades table ───────────────────────────────────
        self.table_open.setRowCount(len(self.state.open_trades))
        for i, trade in enumerate(self.state.open_trades):
            self.table_open.setRowHeight(i, 26)

            ticket_item = QTableWidgetItem(str(trade['slave_ticket']))
            ticket_item.setTextAlignment(Qt.AlignCenter)
            self.table_open.setItem(i, 0, ticket_item)

            sym_item = QTableWidgetItem(trade['symbol'])
            sym_item.setTextAlignment(Qt.AlignCenter)
            self.table_open.setItem(i, 1, sym_item)

            action_item = QTableWidgetItem(trade['action'])
            action_item.setTextAlignment(Qt.AlignCenter)
            color = '#00d4aa' if trade['action'] == 'BUY' else '#ff4444'
            action_item.setForeground(QColor(color))
            self.table_open.setItem(i, 2, action_item)

            vol_item = QTableWidgetItem(str(trade['volume']))
            vol_item.setTextAlignment(Qt.AlignCenter)
            self.table_open.setItem(i, 3, vol_item)

            time_item = QTableWidgetItem(trade['open_time'])
            time_item.setTextAlignment(Qt.AlignCenter)
            self.table_open.setItem(i, 4, time_item)

        # ── Closed trades table (newest first) ──────────────────
        closed = list(reversed(self.state.closed_trades))
        self.table_closed.setRowCount(len(closed))
        for i, trade in enumerate(closed):
            self.table_closed.setRowHeight(i, 26)

            ticket_item = QTableWidgetItem(str(trade['slave_ticket']))
            ticket_item.setTextAlignment(Qt.AlignCenter)
            self.table_closed.setItem(i, 0, ticket_item)

            sym_item = QTableWidgetItem(trade['symbol'])
            sym_item.setTextAlignment(Qt.AlignCenter)
            self.table_closed.setItem(i, 1, sym_item)

            action_item = QTableWidgetItem(trade['action'])
            action_item.setTextAlignment(Qt.AlignCenter)
            self.table_closed.setItem(i, 2, action_item)

            vol_item = QTableWidgetItem(str(trade['volume']))
            vol_item.setTextAlignment(Qt.AlignCenter)
            self.table_closed.setItem(i, 3, vol_item)

            pnl = trade.get('pnl', 0.0)
            pnl_item = QTableWidgetItem(f"${pnl:.2f}")
            pnl_item.setTextAlignment(Qt.AlignCenter)
            pnl_color = '#00d4aa' if pnl >= 0 else '#ff4444'
            pnl_item.setForeground(QColor(pnl_color))
            self.table_closed.setItem(i, 4, pnl_item)

            open_item = QTableWidgetItem(trade['open_time'])
            open_item.setTextAlignment(Qt.AlignCenter)
            self.table_closed.setItem(i, 5, open_item)

            close_item = QTableWidgetItem(trade.get('close_time', ''))
            close_item.setTextAlignment(Qt.AlignCenter)
            self.table_closed.setItem(i, 6, close_item)

        # ── Update summary labels ───────────────────────────────
        open_count = len(self.state.open_trades)
        self.lbl_open_count.setText(f"OPEN:  {open_count}")
        open_color = '#00d4aa' if open_count > 0 else '#666666'
        self.lbl_open_count.setStyleSheet(
            f"color: {open_color}; font-family: Consolas; font-weight: bold;"
        )

        self.lbl_closed_count.setText(f"CLOSED:  {len(self.state.closed_trades)}")

        pnl = self.state.session_pnl
        pnl_color = '#00d4aa' if pnl >= 0 else '#ff4444'
        self.lbl_session_pnl.setText(f"SESSION P&&L:  ${pnl:.2f}")
        self.lbl_session_pnl.setStyleSheet(
            f"color: {pnl_color}; font-family: Consolas; font-weight: bold;"
        )

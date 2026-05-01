"""PERFORMANCE tab for Master shell: KPIs, analytics, and recent broadcasts."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QGridLayout,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from views.qt.custom_widgets import ActiveHoursHistogram, EquitySparkline
from views.qt.primitives import Card, CountChip, MicroLabel, StatusChip, TradeChip
from views.qt.theme import ACCENT, DANGER, LINE, TEXT, TEXT3


def _center_widget(inner: QWidget) -> QWidget:
    wrap = QWidget()
    row = QHBoxLayout(wrap)
    row.setContentsMargins(0, 0, 0, 0)
    row.setSpacing(0)
    row.addStretch(1)
    row.addWidget(inner)
    row.addStretch(1)
    return wrap


class _KpiCard(Card):
    def __init__(self, title: str, parent=None):
        super().__init__(parent)
        col = QVBoxLayout(self)
        col.setContentsMargins(14, 12, 14, 12)
        col.setSpacing(6)
        col.addWidget(MicroLabel(title))
        self.value = QLabel("0")
        self.value.setStyleSheet(f"color: {TEXT}; font-size: 22px; font-weight: 700;")
        col.addWidget(self.value)
        col.addStretch(1)

    def set_value(self, text: str, color: str = TEXT) -> None:
        self.value.setText(text)
        self.value.setStyleSheet(f"color: {color}; font-size: 22px; font-weight: 700;")


class PerformanceView(QWidget):
    """Master PERFORMANCE page bound to profile stats and recent signals."""

    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self._controller = controller

        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # Section 1: KPI grid (3x2)
        kpi_grid = QGridLayout()
        kpi_grid.setHorizontalSpacing(12)
        kpi_grid.setVerticalSpacing(12)

        self.kpi_total_trades = _KpiCard("Total trades")
        self.kpi_closed_trades = _KpiCard("Closed trades")
        self.kpi_win_rate = _KpiCard("Win rate")
        self.kpi_total_pnl = _KpiCard("Total P&L")
        self.kpi_avg_volume = _KpiCard("Avg volume")
        self.kpi_subscribers = _KpiCard("Subscribers")

        kpi_grid.addWidget(self.kpi_total_trades, 0, 0)
        kpi_grid.addWidget(self.kpi_closed_trades, 0, 1)
        kpi_grid.addWidget(self.kpi_win_rate, 1, 0)
        kpi_grid.addWidget(self.kpi_total_pnl, 1, 1)
        kpi_grid.addWidget(self.kpi_avg_volume, 2, 0)
        kpi_grid.addWidget(self.kpi_subscribers, 2, 1)
        root.addLayout(kpi_grid)

        # Section 2: Optional analytics container
        self.analytics_container = QWidget()
        analytics_row = QHBoxLayout(self.analytics_container)
        analytics_row.setContentsMargins(0, 0, 0, 0)
        analytics_row.setSpacing(12)

        spark_card = Card()
        spark_col = QVBoxLayout(spark_card)
        spark_col.setContentsMargins(14, 12, 14, 12)
        spark_col.setSpacing(8)
        spark_col.addWidget(MicroLabel("Equity sparkline"))
        self.sparkline = EquitySparkline()
        spark_col.addWidget(self.sparkline)
        analytics_row.addWidget(spark_card, 2)

        risk_card = Card()
        risk_col = QVBoxLayout(risk_card)
        risk_col.setContentsMargins(14, 12, 14, 12)
        risk_col.setSpacing(6)
        risk_col.addWidget(MicroLabel("Risk metrics"))
        self.lbl_drawdown = QLabel("Max drawdown: -")
        self.lbl_avg_day = QLabel("Avg trades/day: -")
        self.lbl_losing_streak = QLabel("Longest losing streak: -")
        self.lbl_best_day = QLabel("Best day P&L: -")
        for lbl in (
            self.lbl_drawdown,
            self.lbl_avg_day,
            self.lbl_losing_streak,
            self.lbl_best_day,
        ):
            lbl.setStyleSheet(f"color: {TEXT3}; font-size: 12px;")
            risk_col.addWidget(lbl)
        risk_col.addStretch(1)
        analytics_row.addWidget(risk_card, 2)

        hist_card = Card()
        hist_col = QVBoxLayout(hist_card)
        hist_col.setContentsMargins(14, 12, 14, 12)
        hist_col.setSpacing(8)
        hist_col.addWidget(MicroLabel("Active hours (UTC)"))
        self.histogram = ActiveHoursHistogram()
        hist_col.addWidget(self.histogram)
        self.lbl_hours_summary = QLabel("Window: -")
        self.lbl_hours_summary.setStyleSheet(f"color: {TEXT3}; font-size: 11px;")
        hist_col.addWidget(self.lbl_hours_summary)
        analytics_row.addWidget(hist_card, 2)

        root.addWidget(self.analytics_container)

        # Section 3: Recent broadcasts table
        table_card = Card()
        table_col = QVBoxLayout(table_card)
        table_col.setContentsMargins(14, 12, 14, 12)
        table_col.setSpacing(8)

        hdr = QHBoxLayout()
        hdr.setContentsMargins(0, 0, 0, 0)
        hdr.setSpacing(8)
        hdr.addWidget(MicroLabel("Recent broadcasts"))
        self.tbl_count = CountChip("0", kind="outline")
        hdr.addWidget(self.tbl_count)
        hdr.addStretch(1)
        table_col.addLayout(hdr)

        self.table_recent = QTableWidget()
        self.table_recent.setColumnCount(7)
        self.table_recent.setHorizontalHeaderLabels(
            ["TIME", "SYMBOL", "ACTION", "VOLUME", "STATUS", "P&L", "ACKED"]
        )
        table_header = self.table_recent.horizontalHeader()
        for i in range(self.table_recent.columnCount()):
            table_header.setSectionResizeMode(i, QHeaderView.ResizeMode.Stretch)
        table_header.setDefaultAlignment(Qt.AlignmentFlag.AlignCenter)
        self.table_recent.setShowGrid(False)
        self.table_recent.setSelectionMode(QTableWidget.SelectionMode.NoSelection)
        self.table_recent.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table_recent.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.table_recent.verticalHeader().setVisible(False)
        self.table_recent.setAlternatingRowColors(False)
        table_col.addWidget(self.table_recent)

        root.addWidget(table_card, 1)

    def sync_from_state(self, stats: dict, recent_signals: list) -> None:
        stats = stats or {}
        recent_signals = recent_signals or []

        total_trades = int(stats.get("totalTrades", 0) or 0)
        closed_trades = int(stats.get("closedTrades", 0) or 0)
        win_rate = float(stats.get("winRate", 0.0) or 0.0)
        total_pnl = float(stats.get("totalPnL", 0.0) or 0.0)
        avg_volume = float(stats.get("avgVolume", 0.0) or 0.0)
        subscribers = int(stats.get("subscriberCount", 0) or 0)

        self.kpi_total_trades.set_value(str(total_trades), TEXT)
        self.kpi_closed_trades.set_value(str(closed_trades), TEXT)
        self.kpi_win_rate.set_value(f"{win_rate:.1f}%", ACCENT if win_rate >= 50 else DANGER)
        self.kpi_total_pnl.set_value(f"${total_pnl:.2f}", ACCENT if total_pnl >= 0 else DANGER)
        self.kpi_avg_volume.set_value(f"{avg_volume:.2f}", TEXT)
        self.kpi_subscribers.set_value(str(subscribers), ACCENT if subscribers > 0 else TEXT)

        risk_metrics = stats.get("riskMetrics")
        equity_sparkline = stats.get("equitySparkline")
        active_summary = stats.get("activeHoursSummary")

        analytics_available = bool(risk_metrics) and bool(equity_sparkline)
        self.analytics_container.setVisible(analytics_available)
        if analytics_available:
            self.sparkline.set_points([float(x or 0.0) for x in equity_sparkline])
            self.lbl_drawdown.setText(
                f"Max drawdown: {float(risk_metrics.get('maxDrawdownPercent', 0.0) or 0.0):.2f}%"
            )
            self.lbl_avg_day.setText(
                f"Avg trades/day: {float(risk_metrics.get('avgTradesPerDay', 0.0) or 0.0):.2f}"
            )
            self.lbl_losing_streak.setText(
                "Longest losing streak: "
                f"{int(risk_metrics.get('longestLosingStreakTrades', 0) or 0)}"
            )
            best_day = float(risk_metrics.get("bestDayPnl", 0.0) or 0.0)
            self.lbl_best_day.setText(f"Best day P&L: ${best_day:.2f}")
            self.lbl_best_day.setStyleSheet(
                f"color: {ACCENT if best_day >= 0 else DANGER}; font-size: 12px;"
            )

            values = [0] * 24
            if isinstance(active_summary, dict):
                bars = active_summary.get("bars") or active_summary.get("values") or []
                for i, v in enumerate(bars[:24]):
                    values[i] = int(v or 0)
                window_text = active_summary.get("window") or active_summary.get("label") or "-"
                self.lbl_hours_summary.setText(f"Window: {window_text}")
            else:
                self.lbl_hours_summary.setText(
                    f"Window: {active_summary if isinstance(active_summary, str) else '-'}"
                )
            self.histogram.set_values(values)

        signals = list(reversed(recent_signals))[:10]
        self.table_recent.setRowCount(len(signals))
        for i, sig in enumerate(signals):
            self.table_recent.setRowHeight(i, 32)

            t_item = QTableWidgetItem(str(sig.get("time", "") or ""))
            t_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            t_item.setForeground(QColor(TEXT3))
            self.table_recent.setItem(i, 0, t_item)

            sym_item = QTableWidgetItem(str(sig.get("symbol", "") or ""))
            sym_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            sym_item.setForeground(QColor(TEXT3))
            self.table_recent.setItem(i, 1, sym_item)

            action = str(sig.get("action", "BUY") or "BUY").upper()
            self.table_recent.setCellWidget(i, 2, _center_widget(TradeChip(action)))

            vol_item = QTableWidgetItem(str(sig.get("volume", "") or ""))
            vol_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            vol_item.setForeground(QColor(TEXT3))
            self.table_recent.setItem(i, 3, vol_item)

            event = str(sig.get("event", "") or "").upper()
            if event == "OPEN":
                status_kind = "OPEN"
            elif event == "CLOSE":
                status_kind = "CLOSED"
            else:
                status_kind = "CLOSED"
            self.table_recent.setCellWidget(i, 4, _center_widget(StatusChip(status_kind)))

            pnl = float(sig.get("pnl", 0.0) or 0.0)
            pnl_item = QTableWidgetItem(f"${pnl:.2f}")
            pnl_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            pnl_item.setForeground(QColor(ACCENT if pnl >= 0 else DANGER))
            self.table_recent.setItem(i, 5, pnl_item)

            acked_val = sig.get("acked", sig.get("ack", False))
            ack_text = "YES" if bool(acked_val) else "NO"
            ack_item = QTableWidgetItem(ack_text)
            ack_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            ack_item.setForeground(QColor(TEXT if ack_text == "YES" else TEXT3))
            self.table_recent.setItem(i, 6, ack_item)

        has_rows = len(signals) > 0
        self.tbl_count.setText(str(len(signals)))
        self.tbl_count.setStyleSheet(
            (
                f"background: rgba(0,195,137,0.12); color: {ACCENT}; "
                "font-size: 10px; font-weight: 600; border-radius: 4px; padding: 1px 6px;"
            )
            if has_rows
            else (
                f"border: 1px solid {LINE}; color: {TEXT3}; "
                "font-size: 10px; font-weight: 600; border-radius: 4px; padding: 1px 6px;"
            )
        )

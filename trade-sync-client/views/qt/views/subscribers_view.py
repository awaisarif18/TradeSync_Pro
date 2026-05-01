"""SUBSCRIBERS tab: subscriber summary, roster table, activity log."""

from __future__ import annotations

from datetime import datetime

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from views.qt.primitives import (
    Btn,
    Card,
    CountChip,
    GhostIconBtn,
    MicroLabel,
    StatusPill,
)
from views.qt.theme import ACCENT, BG, DANGER, FONT_MONO, LINE, TEXT3


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


def _center_cell_widget(inner: QWidget) -> QWidget:
    wrap = QWidget()
    row = QHBoxLayout(wrap)
    row.setContentsMargins(0, 0, 0, 0)
    row.setSpacing(0)
    row.addStretch(1)
    row.addWidget(inner)
    row.addStretch(1)
    return wrap


class SubscribersView(QWidget):
    """Master SUBSCRIBERS stack page bound to ``MasterController.state``."""

    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self._controller = controller
        self._activity_entries: list[str] = []

        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # ── Card 1: summary ─────────────────────────────────────
        sum_card = Card()
        sum_inner = QVBoxLayout(sum_card)
        sum_inner.setContentsMargins(20, 20, 20, 20)
        sum_inner.setSpacing(12)

        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        row.setSpacing(24)

        def _metric_col(title: str, chip: CountChip) -> QWidget:
            box = QWidget()
            col = QVBoxLayout(box)
            col.setContentsMargins(0, 0, 0, 0)
            col.setSpacing(6)
            col.addWidget(MicroLabel(title))
            col.addWidget(chip)
            return box

        self._chip_total = CountChip("0", kind="outline")
        self._chip_online = CountChip("0", kind="outline")
        self._chip_signals = CountChip("0", kind="outline")

        row.addWidget(_metric_col("TOTAL", self._chip_total))
        row.addWidget(_metric_col("ONLINE", self._chip_online))
        row.addWidget(_metric_col("SIGNALS SENT", self._chip_signals))

        row.addStretch(1)

        self.btn_refresh = Btn("↻ REFRESH", kind="ghost", size="sm")
        self.btn_refresh.clicked.connect(self._on_refresh_clicked)
        row.addWidget(self.btn_refresh, alignment=Qt.AlignmentFlag.AlignBottom)

        sum_inner.addLayout(row)
        root.addWidget(sum_card)

        # ── Card 2: table ────────────────────────────────────────
        table_card = Card()
        tab_inner = QVBoxLayout(table_card)
        tab_inner.setContentsMargins(20, 20, 20, 20)
        tab_inner.setSpacing(12)

        tab_inner.addWidget(MicroLabel("Subscriber roster"))

        self._empty_label = QLabel("No subscribers yet.")
        self._empty_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._empty_label.setWordWrap(True)
        self._empty_label.setStyleSheet(f"color: {TEXT3}; font-size: 13px; padding: 24px;")
        tab_inner.addWidget(self._empty_label)

        self.table_subscribers = QTableWidget()
        self.table_subscribers.setObjectName("table_subscribers")
        self.table_subscribers.setColumnCount(6)
        self.table_subscribers.setHorizontalHeaderLabels(
            ["NAME", "EMAIL", "STATUS", "COPIED", "P&&L", "ACTION"]
        )
        hdr = self.table_subscribers.horizontalHeader()
        for i in range(self.table_subscribers.columnCount()):
            hdr.setSectionResizeMode(i, QHeaderView.ResizeMode.Stretch)
        hdr.setDefaultAlignment(Qt.AlignmentFlag.AlignCenter)
        self.table_subscribers.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.table_subscribers.setShowGrid(False)
        self.table_subscribers.setSelectionMode(QTableWidget.SelectionMode.NoSelection)
        self.table_subscribers.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table_subscribers.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.table_subscribers.verticalHeader().setVisible(False)
        self.table_subscribers.setAlternatingRowColors(False)

        tab_inner.addWidget(self.table_subscribers, 1)
        root.addWidget(table_card, 2)

        # ── Card 3: activity log ───────────────────────────────────
        act_card = Card()
        act_inner = QVBoxLayout(act_card)
        act_inner.setContentsMargins(20, 20, 20, 20)
        act_inner.setSpacing(10)
        act_inner.addWidget(MicroLabel("Subscriber activity"))

        self.txt_activity = QTextEdit()
        self.txt_activity.setReadOnly(True)
        self.txt_activity.document().setDocumentMargin(14)
        self.txt_activity.setPlaceholderText(
            "Subscriber connect/disconnect events will appear here"
        )
        self.txt_activity.setStyleSheet(
            f"""
            QTextEdit {{
                background: {BG};
                color: {TEXT3};
                font-family: {FONT_MONO};
                font-size: 11px;
                border: none;
                padding: 8px;
            }}
            """
        )
        act_inner.addWidget(self.txt_activity, 1)
        root.addWidget(act_card, 1)

        self.refresh_display()

    def _state(self):
        return self._controller.state

    def _on_refresh_clicked(self) -> None:
        self._controller.fetch_subscribers()
        self.refresh_display()

    def log_activity(self, email: str, online: bool) -> None:
        time_str = datetime.now().strftime("%H:%M:%S")
        status = "ONLINE" if online else "OFFLINE"
        col = ACCENT if online else TEXT3
        entry = f'<span style="color:{TEXT3}">[{time_str}]</span> '
        entry += f'<span style="color:{TEXT3}">{email}</span> '
        entry += f'<span style="color:{col}">→ {status}</span>'
        self._activity_entries.append(entry)
        if len(self._activity_entries) > 20:
            self._activity_entries.pop(0)
        self.txt_activity.setHtml("<br>".join(self._activity_entries))
        self.txt_activity.verticalScrollBar().setValue(
            self.txt_activity.verticalScrollBar().maximum()
        )

    def refresh_display(self) -> None:
        state = self._state()
        subs = getattr(state, "subscribers", [])

        self._empty_label.setVisible(not subs)
        self.table_subscribers.setVisible(bool(subs))
        self.table_subscribers.setRowCount(len(subs))

        online_map = getattr(state, "subscriber_online_status", {}) or {}

        for i, sub in enumerate(subs):
            self.table_subscribers.setRowHeight(i, 32)

            name_item = QTableWidgetItem(sub.get("fullName", "") or "")
            name_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            name_item.setForeground(QColor(TEXT3))
            self.table_subscribers.setItem(i, 0, name_item)

            email_raw = str(sub.get("email", "") or "")
            email_item = QTableWidgetItem(email_raw)
            email_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            email_item.setForeground(QColor(TEXT3))
            self.table_subscribers.setItem(i, 1, email_item)

            is_online = online_map.get(email_raw, False)
            # ONLINE: broadcasting variant (accent); OFFLINE: idle + OFFLINE label
            pill = (
                StatusPill(variant="broadcasting", label="LIVE")
                if is_online
                else StatusPill(variant="idle", label="OFFLINE")
            )
            self.table_subscribers.setCellWidget(i, 2, _center_cell_widget(pill))

            copied_item = QTableWidgetItem(str(sub.get("totalCopied", 0)))
            copied_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            copied_item.setForeground(QColor(TEXT3))
            self.table_subscribers.setItem(i, 3, copied_item)

            pnl_val = float(sub.get("totalPnL", 0.0) or 0.0)
            pnl_item = QTableWidgetItem(f"${pnl_val:.2f}")
            pnl_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            pnl_item.setForeground(QColor(ACCENT if pnl_val >= 0 else DANGER))
            self.table_subscribers.setItem(i, 4, pnl_item)

            revoke = GhostIconBtn("×")
            _revoke_email = email_raw

            def _revoke_clicked(_checked: bool, em: str = _revoke_email) -> None:
                print(f"Revoke {em}")

            revoke.clicked.connect(_revoke_clicked)
            self.table_subscribers.setCellWidget(i, 5, _center_cell_widget(revoke))

        total = len(subs)
        online_count = sum(1 for s in subs if online_map.get(s.get("email", ""), False))
        signals_sent = int(getattr(state, "signals_sent", 0) or 0)

        self._chip_total.setText(str(total))
        self._chip_total.setStyleSheet(_count_chip_style(total > 0))

        self._chip_online.setText(str(online_count))
        self._chip_online.setStyleSheet(_count_chip_style(online_count > 0))

        self._chip_signals.setText(str(signals_sent))
        self._chip_signals.setStyleSheet(_count_chip_style(signals_sent > 0))

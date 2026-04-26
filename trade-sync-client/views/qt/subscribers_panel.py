from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGroupBox, QHeaderView,
    QLabel, QPushButton, QSizePolicy, QTextEdit, QTableWidget,
    QTableWidgetItem
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor, QFont
from models.app_state import AppState


BLOOMBERG_QSS = """
QWidget {
    background-color: #0a0a0a;
    color: #c8c8c8;
    font-family: 'Segoe UI';
    font-size: 9pt;
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
QTableWidget {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    color: #c8c8c8;
    gridline-color: #1a1a1a;
    font-family: 'Consolas';
    font-size: 9pt;
}
QTableWidget::item:selected {
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
"""


class SubscribersPanel(QWidget):
    def __init__(self, state: AppState, refresh_callback, parent=None):
        super().__init__(parent)
        self.state = state
        self.refresh_callback = refresh_callback
        self.activity_entries = []
        self._build_ui()

    def _build_ui(self):
        self.setStyleSheet(BLOOMBERG_QSS)

        root_layout = QVBoxLayout(self)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(6)

        # ── Section 1: Summary Bar ──────────────────────────────
        summary_row = QHBoxLayout()
        summary_row.setSpacing(24)

        self.lbl_total = QLabel("SUBSCRIBERS  0")
        self.lbl_total.setStyleSheet(
            "color: #444444; font-family: Consolas; font-weight: bold;"
        )
        summary_row.addWidget(self.lbl_total)

        self.lbl_online = QLabel("ONLINE  0")
        self.lbl_online.setStyleSheet(
            "color: #444444; font-family: Consolas; font-weight: bold;"
        )
        summary_row.addWidget(self.lbl_online)

        self.lbl_signals = QLabel("SIGNALS SENT  0")
        self.lbl_signals.setStyleSheet(
            "color: #c8c8c8; font-family: Consolas; font-weight: bold;"
        )
        summary_row.addWidget(self.lbl_signals)

        summary_row.addStretch()

        self.btn_refresh = QPushButton("↻ REFRESH")
        self.btn_refresh.setObjectName("btn_refresh_subscribers")
        self.btn_refresh.setStyleSheet(
            "padding: 3px 10px; font-size: 8pt; "
            "border: 1px solid #2a2a2a; color: #888888;"
        )
        self.btn_refresh.clicked.connect(self._on_refresh_clicked)
        summary_row.addWidget(self.btn_refresh)

        root_layout.addLayout(summary_row)

        # ── Section 2: Subscriber Table ─────────────────────────
        table_group = QGroupBox("CONNECTED SUBSCRIBERS")
        table_layout = QVBoxLayout(table_group)

        self.empty_label = QLabel("No subscribers yet.")
        self.empty_label.setAlignment(Qt.AlignCenter)
        self.empty_label.setStyleSheet(
            "color: #444444; font-style: italic; padding: 24px;"
        )
        table_layout.addWidget(self.empty_label)

        self.table_subscribers = QTableWidget()
        self.table_subscribers.setObjectName("table_subscribers")
        self.table_subscribers.setColumnCount(6)
        self.table_subscribers.setHorizontalHeaderLabels(
            ["NAME", "SLAVE ID", "EMAIL", "STATUS", "COPIED", "P&L"]
        )
        self.table_subscribers.setColumnWidth(0, 120)
        self.table_subscribers.setColumnWidth(1, 85)
        self.table_subscribers.setColumnWidth(2, 180)
        self.table_subscribers.setColumnWidth(3, 90)
        self.table_subscribers.setColumnWidth(4, 65)
        self.table_subscribers.setMaximumHeight(200)
        header = self.table_subscribers.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.Fixed)
        header.setSectionResizeMode(1, QHeaderView.Fixed)
        header.setSectionResizeMode(2, QHeaderView.Fixed)
        header.setSectionResizeMode(3, QHeaderView.Fixed)
        header.setSectionResizeMode(4, QHeaderView.Fixed)
        header.setSectionResizeMode(5, QHeaderView.Stretch)
        self.table_subscribers.setSelectionBehavior(QTableWidget.SelectRows)
        self.table_subscribers.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table_subscribers.verticalHeader().setVisible(False)
        self.table_subscribers.verticalHeader().setDefaultSectionSize(28)
        self.table_subscribers.setAlternatingRowColors(False)
        table_layout.addWidget(self.table_subscribers)

        root_layout.addWidget(table_group)

        # ── Section 3: Activity Log ─────────────────────────────
        activity_group = QGroupBox("SUBSCRIBER ACTIVITY")
        activity_layout = QVBoxLayout(activity_group)
        activity_layout.setContentsMargins(0, 0, 0, 0)
        activity_layout.setSpacing(0)

        self.txt_activity = QTextEdit()
        self.txt_activity.setObjectName("txt_activity")
        self.txt_activity.setReadOnly(True)
        self.txt_activity.setPlaceholderText(
            "Subscriber connect/disconnect events will appear here"
        )
        self.txt_activity.setSizePolicy(
            QSizePolicy.Expanding,
            QSizePolicy.Expanding,
        )
        self.txt_activity.setFont(QFont('Consolas', 8))
        activity_layout.addWidget(self.txt_activity)

        root_layout.addWidget(activity_group, 1)
        self.refresh_display()

    def _on_refresh_clicked(self):
        self.refresh_callback()
        self.refresh_display()

    def log_activity(self, email: str, online: bool):
        from datetime import datetime
        time_str = datetime.now().strftime('%H:%M:%S')
        status = "ONLINE" if online else "OFFLINE"
        color = "#00d4aa" if online else "#666666"
        entry = f'<span style="color:#444444">[{time_str}]</span> '
        entry += f'<span style="color:#888888">{email}</span> '
        entry += f'<span style="color:{color}">→ {status}</span>'

        self.activity_entries.append(entry)
        if len(self.activity_entries) > 20:
            self.activity_entries.pop(0)

        self.txt_activity.setHtml('<br>'.join(self.activity_entries))
        self.txt_activity.verticalScrollBar().setValue(
            self.txt_activity.verticalScrollBar().maximum()
        )

    def refresh_display(self):
        """Rebuild table from AppState. Called by update_ui() timer."""
        subs = self.state.subscribers
        self.empty_label.setVisible(not subs)
        self.table_subscribers.setVisible(bool(subs))
        self.table_subscribers.setRowCount(len(subs))

        for i, sub in enumerate(subs):
            self.table_subscribers.setRowHeight(i, 28)

            name_item = QTableWidgetItem(sub.get('fullName', ''))
            name_item.setForeground(QColor('#c8c8c8'))
            name_item.setFont(QFont('Segoe UI', 9))
            self.table_subscribers.setItem(i, 0, name_item)

            slave_id = sub.get('id', '')
            slave_id_display = f"{slave_id[:8]}..." if slave_id else ""
            slave_id_item = QTableWidgetItem(slave_id_display)
            slave_id_item.setForeground(QColor('#444444'))
            slave_id_item.setFont(QFont('Consolas', 7))
            self.table_subscribers.setItem(i, 1, slave_id_item)

            email = sub.get('email', '')
            email_item = QTableWidgetItem(email)
            email_item.setForeground(QColor('#666666'))
            email_item.setFont(QFont('Consolas', 8))
            self.table_subscribers.setItem(i, 2, email_item)

            is_online = self.state.subscriber_online_status.get(email, False)
            status_item = QTableWidgetItem("● LIVE" if is_online else "○ OFFLINE")
            status_color = QColor('#00d4aa') if is_online else QColor('#444444')
            status_item.setForeground(status_color)
            if is_online:
                status_item.setFont(QFont('Segoe UI', 9, QFont.Weight.Bold))
            self.table_subscribers.setItem(i, 3, status_item)

            copied_item = QTableWidgetItem(str(sub.get('totalCopied', 0)))
            copied_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            copied_item.setForeground(QColor('#c8c8c8'))
            copied_item.setFont(QFont('Consolas', 9))
            self.table_subscribers.setItem(i, 4, copied_item)

            pnl = sub.get('totalPnL', 0.0)
            pnl_item = QTableWidgetItem(f"${pnl:.2f}")
            pnl_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            pnl_color = QColor('#00d4aa') if pnl >= 0 else QColor('#ff4444')
            pnl_item.setForeground(pnl_color)
            pnl_item.setFont(QFont('Consolas', 9))
            self.table_subscribers.setItem(i, 5, pnl_item)

        total = len(subs)
        online_count = sum(
            1 for s in subs
            if self.state.subscriber_online_status.get(s.get('email', ''), False)
        )
        self.lbl_total.setText(f"SUBSCRIBERS  {total}")
        self.lbl_online.setText(f"ONLINE  {online_count}")
        self.lbl_signals.setText(f"SIGNALS SENT  {self.state.signals_sent}")

        total_color = '#00d4aa' if total > 0 else '#444444'
        online_color = '#00d4aa' if online_count > 0 else '#444444'
        self.lbl_total.setStyleSheet(
            f"color: {total_color}; font-family: Consolas; font-weight: bold;"
        )
        self.lbl_online.setStyleSheet(
            f"color: {online_color}; font-family: Consolas; font-weight: bold;"
        )

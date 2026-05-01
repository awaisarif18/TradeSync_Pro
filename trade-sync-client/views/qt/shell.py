"""Shell chrome: title bar, sidebar, footer, header/KPI strips, event log, window shell.

See ``docs/pyside6_translation.md`` § 4.1–4.5, § 4.7.
"""

from __future__ import annotations

import html

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QPushButton,
    QStackedWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from views.qt.custom_widgets import PulseDot
from views.qt.primitives import MicroLabel, StatusPill
from views.qt.theme import (
    ACCENT,
    ACCENT_SOFT,
    BG,
    DANGER,
    FOOTER_H,
    HEADER_H,
    KPI_H,
    LINE,
    LOG_W,
    SIDEBAR_W,
    SURFACE,
    SURFACE3,
    TEXT,
    TEXT2,
    TEXT3,
    TITLEBAR_H,
    FONT_MONO,
    WARN,
)

NAV_ITEMS_SLAVE = [
    ("copy", "⊗", "COPY"),
    ("symbols", "≈", "SYMBOLS"),
    ("risk", "◈", "RISK"),
    ("trades", "⊞", "TRADES"),
]

NAV_ITEMS_MASTER = [
    ("broadcast", "⚡", "BROADCAST"),
    ("subscribers", "⊞", "SUBSCRIBERS"),
    ("performance", "◈", "PERFORMANCE"),
]


class TitleBar(QWidget):
    """
    Frameless window chrome: logo, title, role, minimize / maximize / close.
    Dragging the bar moves ``window`` when set.
    """

    def __init__(self, role="Slave Node", window=None, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self._window = window
        self._drag_pos = None
        self.setFixedHeight(TITLEBAR_H)
        _cn = self.__class__.__name__
        self.setStyleSheet(
            f"{_cn} {{ background: {SURFACE}; border-bottom: 1px solid {LINE}; }}"
        )

        row = QHBoxLayout(self)
        row.setContentsMargins(12, 0, 8, 0)
        row.setSpacing(8)

        logo = QLabel()
        logo.setFixedSize(20, 20)
        logo.setStyleSheet(
            f"""
            background: {ACCENT};
            border-radius: 5px;
            color: #02110b;
            font-weight: 700;
            font-size: 11px;
            qproperty-alignment: AlignCenter;
            """
        )
        logo.setText("⚡")
        row.addWidget(logo)

        name = QLabel(f"TradeSync<span style='color:{TEXT3};font-weight:400'>.Pro</span>")
        name.setTextFormat(Qt.TextFormat.RichText)
        name.setStyleSheet(f"font-size: 13px; font-weight: 600; color: {TEXT};")
        row.addWidget(name)

        sep = QLabel("·")
        sep.setStyleSheet(f"color: {TEXT3};")
        row.addWidget(sep)

        role_lbl = QLabel(role)
        role_lbl.setStyleSheet(f"color: {TEXT3}; font-size: 13px;")
        row.addWidget(role_lbl)

        row.addStretch()

        for symbol, action in [("─", "min"), ("□", "max"), ("×", "close")]:
            btn = QPushButton(symbol)
            btn.setFixedSize(28, 28)
            hover_bg = "rgba(255,90,74,0.2)" if action == "close" else SURFACE3
            hover_fg = DANGER if action == "close" else TEXT
            btn.setStyleSheet(
                f"""
                QPushButton {{
                    background: transparent; color: {TEXT3};
                    font-family: 'Segoe UI Symbol', sans-serif;
                    font-size: 13px; border-radius: 4px;
                }}
                QPushButton:hover {{ background: {hover_bg}; color: {hover_fg}; }}
                """
            )
            if action == "min":
                btn.clicked.connect(self._on_minimize)
            elif action == "max":
                btn.clicked.connect(self._on_toggle_maximize)
            elif action == "close":
                btn.clicked.connect(self._on_close)
            row.addWidget(btn)

    def _on_minimize(self) -> None:
        if self._window:
            self._window.showMinimized()

    def _on_toggle_maximize(self) -> None:
        if not self._window:
            return
        if self._window.isMaximized():
            self._window.showNormal()
        else:
            self._window.showMaximized()

    def _on_close(self) -> None:
        if self._window:
            self._window.close()

    def mousePressEvent(self, e):
        if e.button() == Qt.MouseButton.LeftButton and self._window:
            self._drag_pos = e.globalPosition().toPoint() - self._window.frameGeometry().topLeft()
        else:
            self._drag_pos = None
        super().mousePressEvent(e)

    def mouseMoveEvent(self, e):
        if (
            self._drag_pos is not None
            and self._window
            and e.buttons() == Qt.MouseButton.LeftButton
        ):
            self._window.move(e.globalPosition().toPoint() - self._drag_pos)
        super().mouseMoveEvent(e)

    def mouseReleaseEvent(self, e):
        self._drag_pos = None
        super().mouseReleaseEvent(e)


class Sidebar(QWidget):
    """
    48px vertical nav rail. Active segment uses accent tint + right border.
    """

    nav_changed = Signal(str)

    def __init__(self, items=None, active="copy", parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setFixedWidth(SIDEBAR_W)
        _cn = self.__class__.__name__
        self.setStyleSheet(
            f"{_cn} {{ background: {SURFACE}; border-right: 1px solid {LINE}; }}"
        )
        self._buttons: dict[str, QPushButton] = {}
        self._active = active

        col = QVBoxLayout(self)
        col.setContentsMargins(0, TITLEBAR_H + HEADER_H + KPI_H, 0, FOOTER_H)
        col.setSpacing(0)
        col.addStretch()

        for key, icon, label in (items or NAV_ITEMS_SLAVE):
            btn = QPushButton(icon)
            btn.setFixedSize(48, 48)
            btn.setToolTip(label)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)

            def _clicked(checked: bool, k: str = key) -> None:
                self._on_click(k)

            btn.clicked.connect(_clicked)
            self._buttons[key] = btn
            col.addWidget(btn)

        col.addStretch()
        self._refresh_styles()

    def _on_click(self, key: str) -> None:
        self._active = key
        self._refresh_styles()
        self.nav_changed.emit(key)

    def _refresh_styles(self) -> None:
        for key, btn in self._buttons.items():
            active = key == self._active
            btn.setStyleSheet(
                f"""
                QPushButton {{
                    background: {'rgba(0,195,137,0.12)' if active else 'transparent'};
                    color: {ACCENT if active else TEXT3};
                    font-size: 16px;
                    border: none;
                    border-right: {'2px solid ' + ACCENT if active else '2px solid transparent'};
                }}
                QPushButton:hover {{
                    background: rgba(0,195,137,0.06);
                    color: {ACCENT};
                }}
                """
            )

    def set_active(self, key: str) -> None:
        self._active = key
        self._refresh_styles()


class FooterStrip(QWidget):
    """24px bottom strip: version, connection dot, status label, hint."""

    def __init__(self, version="v2.4.1", parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setFixedHeight(FOOTER_H)
        _cn = self.__class__.__name__
        self.setStyleSheet(
            f"{_cn} {{ background: {SURFACE}; border-top: 1px solid {LINE}; }}"
        )
        self._row = QHBoxLayout(self)
        self._row.setContentsMargins(12, 0, 12, 0)
        self._row.setSpacing(8)

        ver = QLabel(version)
        ver.setStyleSheet(f"font-family: {FONT_MONO}; font-size: 11px; color: {TEXT3};")
        self._row.addWidget(ver)

        sep = QLabel("·")
        sep.setStyleSheet(f"color: {TEXT3}; font-size: 11px;")
        self._row.addWidget(sep)

        self._status_dot = PulseDot(variant="hollow")
        self._dot_index = self._row.count()
        self._row.addWidget(self._status_dot)

        self._status_lbl = QLabel("Not connected")
        self._status_lbl.setStyleSheet(
            f"font-family: {FONT_MONO}; font-size: 11px; color: {TEXT3};"
        )
        self._row.addWidget(self._status_lbl)

        self._row.addStretch()

        hint = QLabel("Need a key? trade.sync.pro/account")
        hint.setStyleSheet(f"font-family: {FONT_MONO}; font-size: 11px; color: {TEXT3};")
        self._row.addWidget(hint)

    def set_connected(self, connected: bool, url_tail: str = "") -> None:
        self._row.removeWidget(self._status_dot)
        self._status_dot.deleteLater()
        variant = "pulse" if connected else "hollow"
        self._status_dot = PulseDot(variant=variant, parent=self)
        self._row.insertWidget(self._dot_index, self._status_dot)

        if connected:
            self._status_lbl.setText(url_tail or "Connected")
            self._status_lbl.setStyleSheet(
                f"font-family: {FONT_MONO}; font-size: 11px; color: {ACCENT};"
            )
        else:
            self._status_lbl.setText("Disconnected")
            self._status_lbl.setStyleSheet(
                f"font-family: {FONT_MONO}; font-size: 11px; color: {TEXT3};"
            )


# ── § 4.3 — Header strips ────────────────────────────────────────


class HeaderStripSlave(QWidget):
    """Slave strip: master identity or empty state, optional latency, StatusPill."""

    def __init__(self, master_name=None, status="idle", latency=None, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setFixedHeight(HEADER_H)
        _cn = self.__class__.__name__
        self.setStyleSheet(
            f"""
            {_cn} {{
                background: {SURFACE};
                border-bottom: 1px solid {LINE};
            }}
            """
        )
        row = QHBoxLayout(self)
        row.setContentsMargins(16, 0, 16, 0)
        row.setSpacing(12)

        if master_name:
            av = QLabel(master_name[0].upper())
            av.setFixedSize(28, 28)
            av.setAlignment(Qt.AlignmentFlag.AlignCenter)
            av.setStyleSheet(
                f"""
                background: {ACCENT_SOFT};
                color: {ACCENT};
                border-radius: 14px;
                font-weight: 700; font-size: 12px;
                """
            )
            row.addWidget(av)

            name_col = QVBoxLayout()
            name_col.setSpacing(1)
            name_lbl = QLabel(master_name)
            name_lbl.setStyleSheet(f"font-weight: 600; font-size: 13px; color: {TEXT};")
            role_lbl = QLabel("Signal Provider")
            role_lbl.setStyleSheet(f"font-size: 11px; color: {TEXT3};")
            name_col.addWidget(name_lbl)
            name_col.addWidget(role_lbl)
            row.addLayout(name_col)
        else:
            placeholder = QLabel("No master selected")
            placeholder.setStyleSheet(f"color: {TEXT3}; font-size: 13px;")
            row.addWidget(placeholder)

        row.addStretch()

        if latency is not None:
            lat = QLabel(f"{latency}ms")
            lat.setStyleSheet(
                f"font-family: {FONT_MONO}; font-size: 11px; color: {TEXT3};"
            )
            row.addWidget(lat)

        pill = StatusPill(variant=status, label=status.upper())
        row.addWidget(pill)


class HeaderStripMaster(QWidget):
    """Master strip: account identity, license tail, session timer, StatusPill."""

    def __init__(
        self,
        name=None,
        license_tail=None,
        status="idle",
        session_elapsed=None,
        parent=None,
    ):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setFixedHeight(HEADER_H)
        _cn = self.__class__.__name__
        self.setStyleSheet(
            f"{_cn} {{ background: {SURFACE}; border-bottom: 1px solid {LINE}; }}"
        )
        row = QHBoxLayout(self)
        row.setContentsMargins(16, 0, 16, 0)
        row.setSpacing(12)

        if name:
            av = QLabel(name[0].upper())
            av.setFixedSize(28, 28)
            av.setAlignment(Qt.AlignmentFlag.AlignCenter)
            av.setStyleSheet(
                f"""
                background: {ACCENT_SOFT}; color: {ACCENT};
                border-radius: 14px; font-weight: 700; font-size: 12px;
                """
            )
            row.addWidget(av)
            name_lbl = QLabel(name)
            name_lbl.setStyleSheet(f"font-weight: 600; font-size: 13px; color: {TEXT};")
            row.addWidget(name_lbl)

        if license_tail:
            key_lbl = QLabel(f"···{license_tail}")
            key_lbl.setStyleSheet(
                f"""
                font-family: {FONT_MONO}; font-size: 11px; color: {ACCENT};
                background: {ACCENT_SOFT}; border-radius: 4px; padding: 2px 6px;
                """
            )
            row.addWidget(key_lbl)

        row.addStretch()

        if session_elapsed:
            timer = QLabel(session_elapsed)
            timer.setStyleSheet(
                f"font-family: {FONT_MONO}; font-size: 11px; color: {TEXT3};"
            )
            row.addWidget(timer)

        pill = StatusPill(variant=status, label=status.upper())
        row.addWidget(pill)


# ── § 4.4 — KPI strips ──────────────────────────────────────────


class KpiTile(QWidget):
    """Micro label, large mono value, optional sub line."""

    def __init__(self, label, value, sub=None, value_color=TEXT, parent=None):
        super().__init__(parent)
        self._value_color_default = value_color

        col = QVBoxLayout(self)
        col.setContentsMargins(14, 10, 14, 10)
        col.setSpacing(2)
        col.addWidget(MicroLabel(label))

        self._value_lbl = QLabel(value)
        self._value_lbl.setStyleSheet(
            f"font-size: 20px; font-weight: 700; color: {value_color}; font-family: {FONT_MONO};"
        )
        col.addWidget(self._value_lbl)

        self._sub_lbl = QLabel(sub or "")
        self._sub_lbl.setStyleSheet(f"font-size: 11px; color: {TEXT3};")
        self._sub_lbl.setVisible(bool(sub))
        col.addWidget(self._sub_lbl)

    def set_value(self, text: str, color: str | None = None) -> None:
        self._value_lbl.setText(text)
        c = color if color is not None else self._value_color_default
        self._value_lbl.setStyleSheet(
            f"font-size: 20px; font-weight: 700; color: {c}; font-family: {FONT_MONO};"
        )

    def set_sub(self, text: str | None) -> None:
        self._sub_lbl.setText(text or "")
        self._sub_lbl.setVisible(bool(text))


class KpiStripSlave(QWidget):
    """Five tiles: Signals, Copied, Session P&L, Equity, Latency (``KPI_H`` tall)."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setFixedHeight(KPI_H)
        _cn = self.__class__.__name__
        self.setStyleSheet(
            f"{_cn} {{ background: {SURFACE}; border-bottom: 1px solid {LINE}; }}"
        )
        row = QHBoxLayout(self)
        row.setContentsMargins(0, 0, 0, 0)
        row.setSpacing(0)
        self._tiles: dict[str, KpiTile] = {}
        specs = [
            ("signals", "Signals", "—", None, TEXT),
            ("copied", "Copied", "—", None, TEXT),
            ("session_pnl", "Session P&L", "$0.00", None, TEXT),
            ("equity", "Equity", "$0.00", None, TEXT),
            ("latency", "Latency", "—", None, TEXT3),
        ]
        for i, (key, label, val, sub, vc) in enumerate(specs):
            tile = KpiTile(label, val, sub, vc)
            if i < len(specs) - 1:
                tile.setStyleSheet(
                    (tile.styleSheet() or "")
                    + f"background: transparent; border-right: 1px solid {LINE};"
                )
            row.addWidget(tile, 1)
            self._tiles[key] = tile

    def update_kpis(self, **kwargs) -> None:
        """Update tiles. Payload: ``str``, ``(value,)``, ``(value, color)``, or ``(value, sub, color)``."""

        for key, payload in kwargs.items():
            tile = self._tiles.get(key)
            if tile is None:
                continue
            if isinstance(payload, str):
                tile.set_value(payload)
                continue
            if not isinstance(payload, tuple):
                continue
            val = str(payload[0])
            if len(payload) == 1:
                tile.set_value(val)
            elif len(payload) == 2:
                tile.set_value(val, color=payload[1])
            else:
                tile.set_value(val, color=payload[2])
                tile.set_sub(payload[1])


class KpiStripMaster(QWidget):
    """Five tiles for master console metrics."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setFixedHeight(KPI_H)
        _cn = self.__class__.__name__
        self.setStyleSheet(
            f"{_cn} {{ background: {SURFACE}; border-bottom: 1px solid {LINE}; }}"
        )
        row = QHBoxLayout(self)
        row.setContentsMargins(0, 0, 0, 0)
        row.setSpacing(0)
        specs = [
            ("signals", "Total Signals", "—"),
            ("subscribers", "Subscribers", "—"),
            ("win_rate", "Win Rate", "—"),
            ("total_pnl", "Total P&L", "$0.00"),
            ("avg_volume", "Avg Volume", "—"),
        ]
        self._tiles: dict[str, KpiTile] = {}
        for i, (key, label, val) in enumerate(specs):
            tile = KpiTile(label, val)
            if i < len(specs) - 1:
                tile.setStyleSheet(
                    (tile.styleSheet() or "")
                    + f"background: transparent; border-right: 1px solid {LINE};"
                )
            row.addWidget(tile, 1)
            self._tiles[key] = tile

    def update_kpis(self, **kwargs) -> None:
        for key, payload in kwargs.items():
            tile = self._tiles.get(key)
            if tile is None:
                continue
            if isinstance(payload, str):
                tile.set_value(payload)
                continue
            if not isinstance(payload, tuple):
                continue
            val = str(payload[0])
            if len(payload) == 1:
                tile.set_value(val)
            elif len(payload) == 2:
                tile.set_value(val, color=payload[1])
            else:
                tile.set_value(val, color=payload[2])
                tile.set_sub(payload[1])


# ── § 4.5 — Event log ───────────────────────────────────────────


class EventLog(QWidget):
    """
    Right-hand log panel: filter chips + read-only monospace body.
    Categories map to accent / warn / danger / muted colors.
    """

    LOG_COLORS = {
        "SIGNAL": ACCENT,
        "COPY": ACCENT,
        "SESSION": TEXT2,
        "MT5": WARN,
        "ERROR": DANGER,
        "ERR": DANGER,
        "INFO": TEXT3,
    }

    def __init__(self, role="slave", parent=None):
        super().__init__(parent)
        self.setFixedWidth(LOG_W)
        self.setStyleSheet(
            f"""
            background: {SURFACE};
            border-left: 1px solid {LINE};
            """
        )
        self._active_filter = "ALL"
        self._entries: list[tuple[str, str]] = []

        col = QVBoxLayout(self)
        col.setContentsMargins(0, 0, 0, 0)
        col.setSpacing(0)

        header = QWidget()
        header.setFixedHeight(36)
        header.setStyleSheet(f"border-bottom: 1px solid {LINE};")
        hrow = QHBoxLayout(header)
        hrow.setContentsMargins(12, 0, 12, 0)
        lbl = MicroLabel("Event Log")
        hrow.addWidget(lbl)
        hrow.addStretch()
        col.addWidget(header)

        filters = QWidget()
        filters.setFixedHeight(32)
        frow = QHBoxLayout(filters)
        frow.setContentsMargins(8, 4, 8, 4)
        frow.setSpacing(4)
        filter_labels = ["ALL", "SIGNAL", "COPY", "MT5", "ERR"]
        self._filter_btns: dict[str, QPushButton] = {}
        for filt in filter_labels:
            btn = QPushButton(filt)
            btn.setFixedHeight(22)

            def _pick(_checked: bool, ff: str = filt) -> None:
                self._set_filter(ff)

            btn.clicked.connect(_pick)
            self._filter_btns[filt] = btn
            frow.addWidget(btn)
        frow.addStretch()
        col.addWidget(filters)
        self._refresh_filter_styles()

        self._log_widget = QTextEdit()
        self._log_widget.setReadOnly(True)
        self._log_widget.setStyleSheet(
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
        col.addWidget(self._log_widget, 1)

    def _set_filter(self, filt: str) -> None:
        self._active_filter = filt
        self._refresh_filter_styles()
        self._redraw_log()

    def _refresh_filter_styles(self) -> None:
        for filt, btn in self._filter_btns.items():
            active = filt == self._active_filter
            btn.setStyleSheet(
                f"""
                QPushButton {{
                    background: {'rgba(0,195,137,0.12)' if active else 'transparent'};
                    color: {ACCENT if active else TEXT3};
                    font-size: 10px; font-weight: 600;
                    border: {'1px solid ' + ACCENT if active else '1px solid ' + LINE};
                    border-radius: 4px; padding: 0 6px;
                }}
                """
            )

    def _entry_matches_filter(self, category: str) -> bool:
        if self._active_filter == "ALL":
            return True
        if self._active_filter == "ERR":
            return category in ("ERR", "ERROR")
        return category == self._active_filter

    def append_log(self, text: str, category="INFO") -> None:
        self._entries.append((category, text))
        self._redraw_log()

    def _redraw_log(self) -> None:
        self._log_widget.clear()
        for cat, text in reversed(self._entries[-200:]):
            if not self._entry_matches_filter(cat):
                continue
            color = self.LOG_COLORS.get(cat, TEXT3)
            safe = html.escape(text, quote=True)
            self._log_widget.append(f'<span style="color:{color}">{safe}</span>')


# ── § 4.7 — Window shell composer ───────────────────────────────


class WindowShell(QWidget):
    """
    Main interior: Sidebar | header + KPI + stacked pages | EventLog,
    plus footer. Sidebar switches ``QStackedWidget`` views by key.
    """

    def __init__(self, role="slave", parent=None):
        super().__init__(parent)
        self._role = role

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        center_row = QHBoxLayout()
        center_row.setContentsMargins(0, 0, 0, 0)
        center_row.setSpacing(0)

        nav_items = NAV_ITEMS_SLAVE if role == "slave" else NAV_ITEMS_MASTER
        self.sidebar = Sidebar(items=nav_items)
        self.sidebar.nav_changed.connect(self._on_nav)

        center_col = QVBoxLayout()
        center_col.setContentsMargins(0, 0, 0, 0)
        center_col.setSpacing(0)

        if role == "slave":
            self.header = HeaderStripSlave()
            self.kpi = KpiStripSlave()
        else:
            self.header = HeaderStripMaster()
            self.kpi = KpiStripMaster()

        self.stack = QStackedWidget()

        center_col.addWidget(self.header)
        center_col.addWidget(self.kpi)
        center_col.addWidget(self.stack, 1)

        center_widget = QWidget()
        center_widget.setLayout(center_col)

        self.event_log = EventLog(role=role)

        center_row.addWidget(self.sidebar)
        center_row.addWidget(center_widget, 1)
        center_row.addWidget(self.event_log)

        center_widget_outer = QWidget()
        center_widget_outer.setLayout(center_row)

        self.footer = FooterStrip()

        outer.addWidget(center_widget_outer, 1)
        outer.addWidget(self.footer)

        self._views: dict[str, QWidget] = {}

        for key, _icon, nav_label in nav_items:
            placeholder = QLabel(f"{nav_label}\n(placeholder)")
            placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
            placeholder.setStyleSheet(f"color: {TEXT3}; font-size: 13px;")
            self.register_view(key, placeholder)

        if nav_items:
            self.show_view(nav_items[0][0])

    def register_view(self, key: str, widget: QWidget) -> None:
        self._views[key] = widget
        self.stack.addWidget(widget)

    def show_view(self, key: str) -> None:
        if key in self._views:
            self.stack.setCurrentWidget(self._views[key])
            self.sidebar.set_active(key)

    def _on_nav(self, key: str) -> None:
        self.show_view(key)

    def log(self, text: str, category="INFO") -> None:
        self.event_log.append_log(text, category)

"""Atom-level and molecule-level styled widgets (cards, labels, inputs, buttons, chips).

See ``docs/pyside6_translation.md`` § 2.1–2.6.
"""

import os

from PySide6.QtCore import Qt, QUrl, Signal
from PySide6.QtWidgets import (
    QAbstractSpinBox,
    QCheckBox,
    QComboBox,
    QDoubleSpinBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QWidget,
)

from views.qt.theme import (
    ACCENT,
    ACCENT2,
    ACCENT_SOFT,
    DANGER,
    DANGER_SOFT,
    FONT_MONO,
    FONT_SANS,
    ICONS_DIR,
    LINE,
    LINE2,
    RADIUS_LG,
    RADIUS_MD,
    RADIUS_SM,
    SURFACE,
    SURFACE2,
    SURFACE3,
    TEXT,
    TEXT2,
    TEXT3,
    WARN,
)


class Card(QFrame):
    """QFrame with styled border and radius.

    Optional ``accent`` adds a 2px left edge in ACCENT color.
    """

    def __init__(self, parent=None, accent=False):
        super().__init__(parent)
        border_left = f"border-left: 2px solid {ACCENT};" if accent else ""
        self.setStyleSheet(
            f"""
            Card {{
                background: {SURFACE};
                border: 1px solid {LINE};
                border-radius: {RADIUS_LG}px;
                {border_left}
            }}
            Card:hover {{
                border-color: {LINE2};
            }}
            """
        )


class MicroLabel(QLabel):
    """10px uppercase-style label for section headers, KPI titles."""

    def __init__(self, text="", color=TEXT3, parent=None):
        super().__init__(text, parent)
        self.setStyleSheet(
            f"""
            color: {color};
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.6px;
            """
        )
        self.setText(text.upper())


class FieldLabel(QLabel):
    """12px sans label above inputs."""

    def __init__(self, text="", parent=None):
        super().__init__(text, parent)
        self.setStyleSheet(
            f"""
            color: {TEXT2};
            font-size: 12px;
            font-weight: 500;
            """
        )


class LineInput(QLineEdit):
    """Primary text input. Dark fill, 1px border, accent focus ring."""

    def __init__(self, placeholder="", mono=False, error=False, parent=None):
        super().__init__(parent)
        self.setPlaceholderText(placeholder)
        font_family = FONT_MONO if mono else FONT_SANS
        border_color = DANGER if error else LINE
        self.setStyleSheet(
            f"""
            LineInput {{
                background: {SURFACE2};
                border: 1px solid {border_color};
                border-radius: {RADIUS_MD}px;
                color: {TEXT};
                font-family: {font_family};
                font-size: 13px;
                padding: 10px 12px;
            }}
            LineInput:focus {{
                border-color: {ACCENT};
                background: #14202b;
            }}
            LineInput::placeholder {{
                color: {TEXT3};
            }}
            """
        )
        self.setMinimumHeight(38)


class MonoInput(LineInput):
    """LineInput with mono font (license keys, ticket IDs)."""

    def __init__(self, placeholder="", parent=None):
        super().__init__(placeholder=placeholder, mono=True, parent=parent)


class DarkSpinbox(QDoubleSpinBox):
    """Numeric input (risk multiplier, lot size). Styled to match LineInput."""

    def __init__(self, min_val=0.01, max_val=10.0, step=0.01, parent=None):
        super().__init__(parent)
        self.setRange(min_val, max_val)
        self.setSingleStep(step)
        self.setDecimals(2)
        self.setButtonSymbols(QAbstractSpinBox.ButtonSymbols.UpDownArrows)
        up_icon = QUrl.fromLocalFile(os.path.join(ICONS_DIR, "chevron-up.svg")).toString()
        down_icon = QUrl.fromLocalFile(os.path.join(ICONS_DIR, "chevron-down.svg")).toString()
        self.setStyleSheet(
            f"""
            DarkSpinbox {{
                background: {SURFACE2};
                border: 1px solid {LINE};
                border-radius: {RADIUS_MD}px;
                color: {TEXT};
                font-family: {FONT_MONO};
                font-size: 13px;
                padding: 8px 12px;
            }}
            DarkSpinbox:focus {{ border-color: {ACCENT}; }}
            DarkSpinbox::up-button, DarkSpinbox::down-button {{
                background: transparent;
                border: none;
                width: 18px;
            }}
            DarkSpinbox::up-arrow  {{ image: url("{up_icon}"); width: 10px; }}
            DarkSpinbox::down-arrow {{ image: url("{down_icon}"); width: 10px; }}
            """
        )


class DarkDropdown(QComboBox):
    """Dropdown select. Same fill/border as LineInput."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet(
            f"""
            DarkDropdown {{
                background: {SURFACE2};
                border: 1px solid {LINE};
                border-radius: {RADIUS_MD}px;
                color: {TEXT};
                font-size: 13px;
                padding: 10px 32px 10px 12px;
                min-height: 38px;
            }}
            DarkDropdown:focus {{ border-color: {ACCENT}; }}
            DarkDropdown::drop-down {{
                border: none;
                width: 28px;
            }}
            DarkDropdown::down-arrow {{
                width: 10px;
                height: 10px;
            }}
            QAbstractItemView {{
                background: {SURFACE2};
                border: 1px solid {LINE2};
                border-radius: {RADIUS_MD}px;
                color: {TEXT};
                selection-background-color: {SURFACE3};
            }}
            """
        )


class DarkCheckBox(QCheckBox):
    """Checkbox for dark panels; 16×16 rounded indicator, accent fill when checked."""

    def __init__(self, text="", parent=None):
        super().__init__(text, parent)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setStyleSheet(
            f"""
            DarkCheckBox {{
                color: {TEXT};
                font-family: {FONT_SANS};
                font-size: 13px;
                spacing: 10px;
            }}
            DarkCheckBox::indicator {{
                width: 16px;
                height: 16px;
                border-radius: 4px;
            }}
            DarkCheckBox::indicator:unchecked {{
                background: transparent;
                border: 1px solid {LINE2};
            }}
            DarkCheckBox::indicator:checked {{
                background: {ACCENT};
                border: 1px solid {ACCENT};
            }}
            """
        )


class Btn(QPushButton):
    """
    kind: 'primary' | 'ghost' | 'stop' | 'danger'
    size: 'sm' | 'md' | 'lg'
    Primary = mint fill. Ghost = transparent + border.
    Stop = mint bordered (animation lives in custom_widgets in later phases).
    Danger = bordered danger styling.
    """

    HEIGHTS = {"sm": 28, "md": 34, "lg": 40}
    PADDING = {"sm": "0 12px", "md": "0 16px", "lg": "0 20px"}

    def __init__(self, text="", kind="primary", size="md", parent=None):
        super().__init__(text, parent)
        self.setFixedHeight(self.HEIGHTS[size])
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self._apply_style(kind, size)

    def _apply_style(self, kind: str, size: str) -> None:
        pad = self.PADDING[size]
        if kind == "primary":
            self.setStyleSheet(
                f"""
                Btn {{
                    background: {ACCENT};
                    color: #02110b;
                    font-weight: 600;
                    font-size: 13px;
                    border-radius: {RADIUS_MD}px;
                    padding: {pad};
                }}
                Btn:hover {{ background: {ACCENT2}; }}
                Btn:pressed {{ background: {ACCENT2}; }}
                Btn:disabled {{ background: {LINE}; color: {TEXT3}; }}
                """
            )
        elif kind == "ghost":
            self.setStyleSheet(
                f"""
                Btn {{
                    background: transparent;
                    color: {TEXT2};
                    font-size: 13px;
                    border: 1px solid {LINE};
                    border-radius: {RADIUS_MD}px;
                    padding: {pad};
                }}
                Btn:hover {{ background: rgba(255,255,255,0.04); border-color: {LINE2}; }}
                Btn:pressed {{ background: rgba(255,255,255,0.07); }}
                """
            )
        elif kind == "stop":
            self.setStyleSheet(
                f"""
                Btn {{
                    background: transparent;
                    color: {ACCENT};
                    font-size: 13px;
                    font-weight: 600;
                    border: 1px solid {ACCENT};
                    border-radius: {RADIUS_MD}px;
                    padding: {pad};
                }}
                Btn:hover {{ background: {ACCENT_SOFT}; }}
                """
            )
        elif kind == "danger":
            self.setStyleSheet(
                f"""
                Btn {{
                    background: transparent;
                    color: {DANGER};
                    font-size: 13px;
                    border: 1px solid {DANGER};
                    border-radius: {RADIUS_MD}px;
                    padding: {pad};
                }}
                Btn:hover {{ background: {DANGER_SOFT}; }}
                """
            )


class GhostIconBtn(QPushButton):
    """Small square icon button. Hover: danger-tint background + danger text."""

    def __init__(self, icon_text="×", parent=None):
        super().__init__(icon_text, parent)
        self.setFixedSize(24, 24)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setStyleSheet(
            f"""
            GhostIconBtn {{
                background: transparent;
                color: {TEXT3};
                font-size: 14px;
                border-radius: 4px;
            }}
            GhostIconBtn:hover {{
                background: {DANGER_SOFT};
                color: {DANGER};
            }}
            """
        )


# ── § 2.5 — Status chips and pills ─────────────────────────────


class StatusPill(QLabel):
    """Pill-shaped status with a Unicode dot prefix.

    variant: listening | broadcasting | idle | reconnect | error
    Animated pulse is deferred to custom_widgets (later phase).
    """

    VARIANTS = {
        "listening": (ACCENT, "●"),
        "broadcasting": (ACCENT, "●"),
        "idle": (TEXT3, "○"),
        "reconnect": (WARN, "●"),
        "error": (DANGER, "●"),
    }

    def __init__(self, variant="idle", label="", parent=None):
        super().__init__(parent)
        self.setMinimumWidth(85)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        color, dot = self.VARIANTS.get(variant, (TEXT3, "○"))
        self.setText(f"{dot}  {label.upper()}")
        self.setStyleSheet(
            f"""
            StatusPill {{
                color: {color};
                border: 1px solid {color};
                border-radius: 999px;
                padding: 4px 10px;
                font-family: {FONT_MONO};
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.6px;
            }}
            """
        )


class TradeChip(QLabel):
    """BUY / SELL colored chip."""

    def __init__(self, side="BUY", parent=None):
        super().__init__(side, parent)
        bg = ACCENT_SOFT if side == "BUY" else DANGER_SOFT
        color = ACCENT if side == "BUY" else DANGER
        self.setStyleSheet(
            f"""
            color: {color};
            background: {bg};
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.5px;
            border-radius: {RADIUS_SM}px;
            padding: 2px 8px;
            """
        )


class StatusChip(QLabel):
    """OPEN / CLOSED / IGNORED / FAILED for signal feed rows."""

    VARIANTS = {
        "OPEN": (ACCENT, ACCENT_SOFT),
        "CLOSED": (TEXT3, "rgba(255,255,255,0.06)"),
        "IGNORED": (TEXT3, "rgba(255,255,255,0.06)"),
        "FAILED": (DANGER, DANGER_SOFT),
    }

    def __init__(self, kind="CLOSED", parent=None):
        super().__init__(kind, parent)
        color, bg = self.VARIANTS.get(kind, (TEXT3, "rgba(255,255,255,0.06)"))
        self.setStyleSheet(
            f"""
            color: {color};
            background: {bg};
            font-size: 10px;
            font-weight: 600;
            border-radius: 4px;
            padding: 2px 8px;
            """
        )


class CountChip(QLabel):
    """Small numeric counter chip (e.g. table headers)."""

    def __init__(self, value="0", kind="filled", parent=None):
        super().__init__(str(value), parent)
        if kind == "filled":
            self.setStyleSheet(
                f"""
                background: {ACCENT_SOFT};
                color: {ACCENT};
                font-size: 10px; font-weight: 600;
                border-radius: 4px; padding: 1px 6px;
                """
            )
        else:
            self.setStyleSheet(
                f"""
                border: 1px solid {LINE}; color: {TEXT3};
                font-size: 10px; font-weight: 600;
                border-radius: 4px; padding: 1px 6px;
                """
            )


class MiniChip(QLabel):
    """Removable-style tag chip (e.g. symbol whitelist)."""

    def __init__(self, text="", parent=None):
        super().__init__(text, parent)
        self.setStyleSheet(
            f"""
            background: {SURFACE2};
            color: {TEXT2};
            border: 1px solid {LINE};
            font-family: {FONT_MONO};
            font-size: 11px;
            border-radius: {RADIUS_SM}px;
            padding: 3px 8px;
            """
        )


# ── § 2.6 — Segmented toggle ───────────────────────────────────


class SegmentedToggle(QWidget):
    """Two (or more) segment toggle; emits ``changed(str)`` with the value."""

    changed = Signal(str)

    def __init__(self, options: list[tuple[str, str]], default=0, parent=None):
        """``options``: list of ``(label, value)`` pairs."""
        super().__init__(parent)
        self._options = options
        self._active = default
        layout = QHBoxLayout(self)
        layout.setContentsMargins(2, 2, 2, 2)
        layout.setSpacing(2)
        self.setStyleSheet(
            f"""
            SegmentedToggle {{
                background: {SURFACE2};
                border: 1px solid {LINE};
                border-radius: {RADIUS_MD}px;
            }}
            """
        )
        self._buttons: list[QPushButton] = []
        for i, (label, _value) in enumerate(options):
            btn = QPushButton(label)
            btn.setCheckable(True)
            btn.setChecked(i == default)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.setFixedHeight(28)

            def _clicked(checked: bool, idx: int = i) -> None:
                self._on_click(idx)

            btn.clicked.connect(_clicked)
            self._style_btn(btn, i == default)
            layout.addWidget(btn)
            self._buttons.append(btn)

    def _style_btn(self, btn: QPushButton, active: bool) -> None:
        if active:
            btn.setStyleSheet(
                f"""
                QPushButton {{
                    background: {ACCENT};
                    color: #02110b;
                    font-weight: 600;
                    font-size: 12px;
                    border-radius: 6px;
                    padding: 0 14px;
                    border: none;
                }}
                """
            )
        else:
            btn.setStyleSheet(
                f"""
                QPushButton {{
                    background: transparent;
                    color: {TEXT2};
                    font-size: 12px;
                    border-radius: 6px;
                    padding: 0 14px;
                    border: none;
                }}
                QPushButton:hover {{ color: {TEXT}; background: rgba(255,255,255,0.04); }}
                """
            )

    def _on_click(self, idx: int) -> None:
        self._active = idx
        for i, btn in enumerate(self._buttons):
            btn.setChecked(i == idx)
            self._style_btn(btn, i == idx)
        self.changed.emit(self._options[idx][1])

    def value(self) -> str:
        return self._options[self._active][1]

"""Design tokens, font loading, and global QSS for TradeSync desktop (PySide 6).

All color/spacing/font constants live here. Do not duplicate these values elsewhere.
"""

import os

from PySide6.QtGui import QFont, QFontDatabase
from PySide6.QtWidgets import QApplication

# ── Backgrounds ──────────────────────────────────────────────
BG = "#0a0e0d"  # App-level background (darkest)
SURFACE = "#11181a"  # Panel surface, sidebar, titlebar, footer
SURFACE2 = "#18222a"  # Input fill, card interior (slightly lighter)
SURFACE3 = "#1e2c35"  # Hover row tint / elevated card

# ── Lines / Dividers ─────────────────────────────────────────
LINE = "rgba(255,255,255,0.08)"  # Default divider
LINE2 = "rgba(255,255,255,0.14)"  # Hover border on cards

# ── Text ─────────────────────────────────────────────────────
TEXT = "#e8eef0"  # Primary text
TEXT2 = "#8a9ba0"  # Secondary / labels
TEXT3 = "#5d6d72"  # Muted / timestamps

# ── Accent (mint = Provider / system positive) ───────────────
ACCENT = "#00c389"
ACCENT2 = "#00a378"  # Pressed / darker mint
ACCENT_SOFT = "rgba(0,195,137,0.12)"

# ── Violet (Copier / Slave identity) ─────────────────────────
VIOLET = "#7c5cff"
VIOLET_SOFT = "rgba(124,92,255,0.12)"

# ── Danger / Warn ─────────────────────────────────────────────
DANGER = "#ff5a4a"
DANGER_SOFT = "rgba(255,90,74,0.12)"
WARN = "#ffb547"
WARN_SOFT = "rgba(255,181,71,0.12)"

# ── Typography ────────────────────────────────────────────────
FONT_SANS = "Inter"
FONT_MONO = "JetBrains Mono"

# ── Sizing ────────────────────────────────────────────────────
RADIUS_SM = 6  # chip / micro elements
RADIUS_MD = 8  # inputs, buttons, cards
RADIUS_LG = 12  # full cards

# ── Layout ────────────────────────────────────────────────────
SIDEBAR_W = 48  # collapsed sidebar width
HEADER_H = 48  # HeaderStrip height
KPI_H = 56  # KpiStrip height
FOOTER_H = 24  # Footer strip height
LOG_W = 260  # EventLog panel width
TITLEBAR_H = 36  # Custom titlebar height

# ── Window ────────────────────────────────────────────────────
WINDOW_W = 1400
WINDOW_H = 900


def load_fonts(font_dir: str) -> None:
    """Load all .ttf / .otf fonts from ``font_dir`` (call once at app startup).

    Skips gracefully if ``font_dir`` is missing or empty.
    """
    if not font_dir or not os.path.isdir(font_dir):
        return
    try:
        for fname in sorted(os.listdir(font_dir)):
            if fname.lower().endswith((".ttf", ".otf")):
                QFontDatabase.addApplicationFont(os.path.join(font_dir, fname))
    except OSError:
        pass


def apply_app_font(app: QApplication) -> None:
    font = QFont(FONT_SANS, 13)
    font.setHintingPreference(QFont.HintingPreference.PreferNoHinting)
    app.setFont(font)


def build_global_qss() -> str:
    """Return global stylesheet string (app-wide reset, scrollbars, tooltips)."""
    return f"""
    /* ── App-wide reset ─────────────────────────────── */
    QWidget {{
        background: transparent;
        color: {TEXT};
        font-family: "{FONT_SANS}";
        font-size: 13px;
        border: none;
    }}
    QScrollBar:vertical {{
        background: {SURFACE};
        width: 6px;
        margin: 0;
        border-radius: 3px;
    }}
    QScrollBar::handle:vertical {{
        background: {LINE2};
        min-height: 20px;
        border-radius: 3px;
    }}
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
    QScrollBar:horizontal {{ height: 6px; }}
    QScrollBar::handle:horizontal {{ background: {LINE2}; }}
    QToolTip {{
        background: {SURFACE2};
        color: {TEXT};
        border: 1px solid {LINE2};
        border-radius: {RADIUS_SM}px;
        padding: 4px 8px;
        font-size: 12px;
    }}
    """

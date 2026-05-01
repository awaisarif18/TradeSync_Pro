"""Design tokens, font loading, and global QSS for TradeSync desktop (PySide 6).

All color/spacing/font constants live here. Do not duplicate these values elsewhere.
"""

import os

from PySide6.QtGui import QFont, QFontDatabase
from PySide6.QtWidgets import QApplication

# trade-sync-client/ (this module lives in views/qt/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
ICONS_DIR = os.path.join(ASSETS_DIR, "icons")

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
FONT_SANS = '"Inter", system-ui, sans-serif'
FONT_MONO = '"JetBrains Mono", ui-monospace, monospace'

# ── Sizing ────────────────────────────────────────────────────
RADIUS_SM = 6  # chip / micro elements
RADIUS_MD = 8  # inputs, buttons, cards
RADIUS_LG = 12  # full cards

# ── Layout ────────────────────────────────────────────────────
SIDEBAR_W = 48  # collapsed sidebar width
HEADER_H = 56  # HeaderStrip height (master strip uses two rows)
KPI_H = 56  # KpiStrip height
FOOTER_H = 24  # Footer strip height
LOG_W = 260  # EventLog panel width
TITLEBAR_H = 36  # Custom titlebar height

# ── Window ────────────────────────────────────────────────────
WINDOW_W = 1400
WINDOW_H = 900


def load_fonts() -> None:
    if not os.path.isdir(FONTS_DIR):
        print(f"[THEME] Warning: Fonts dir not found at {FONTS_DIR}")
        return
    loaded = 0
    for fname in sorted(os.listdir(FONTS_DIR)):
        if fname.lower().endswith((".ttf", ".otf")):
            QFontDatabase.addApplicationFont(os.path.join(FONTS_DIR, fname))
            loaded += 1
    print(f"[THEME] Loaded {loaded} custom fonts from {FONTS_DIR}")


def apply_app_font(app: QApplication) -> None:
    font = QFont("Inter", 13)
    font.setHintingPreference(QFont.HintingPreference.PreferNoHinting)
    app.setFont(font)


def build_global_qss() -> str:
    """Return global stylesheet string (app-wide reset, scrollbars, tooltips)."""
    return f"""
    /* ── App-wide reset ─────────────────────────────── */
    QWidget {{
        background: transparent;
        color: {TEXT};
        font-family: {FONT_SANS};
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
    QHeaderView::section {{
        background-color: transparent;
        color: {TEXT3};
        font-size: 11px;
        font-weight: 600;
        border: none;
        border-bottom: 1px solid {LINE};
        padding: 8px 14px;
    }}
    QTableWidget {{
        gridline-color: {LINE};
        background: transparent;
    }}
    QTableWidget::item {{
        padding: 0px 8px;
        border: none;
    }}
    """

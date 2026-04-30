"""Custom-painted widgets (pulse dot, sparkline, histogram, sweep band).

See ``docs/pyside6_translation.md`` § 3.
"""

from PySide6.QtCore import Property, QEasingCurve, QPointF, QPropertyAnimation, QRectF, Qt
from PySide6.QtGui import QColor, QLinearGradient, QPainter, QPainterPath, QPen
from PySide6.QtWidgets import QWidget

from views.qt.theme import ACCENT, DANGER, SURFACE2, TEXT3, WARN


class PulseDot(QWidget):
    """
    Replaces CSS ``sd-pulse-dot`` animation.
    QPropertyAnimation on ``dot_opacity`` (1.0 → 0.55 → 1.0) for pulse/warn.

    variant: pulse (green), warn (amber), hollow (grey ring), solid (red)
    """

    def __init__(self, variant="pulse", size=7, parent=None):
        super().__init__(parent)
        self.setFixedSize(size + 8, size + 8)
        self._variant = variant
        self._size = size
        self._opacity = 1.0
        self._ring_r = 0.0

        color_map = {
            "pulse": ACCENT,
            "warn": WARN,
            "solid": DANGER,
            "hollow": TEXT3,
        }
        self._color = QColor(color_map.get(variant, ACCENT))

        self._opacity_anim = None
        if variant in ("pulse", "warn"):
            self._start_animation()

    def _start_animation(self) -> None:
        self._opacity_anim = QPropertyAnimation(self, b"dot_opacity", self)
        self._opacity_anim.setDuration(2000)
        self._opacity_anim.setStartValue(1.0)
        self._opacity_anim.setKeyValueAt(0.5, 0.55)
        self._opacity_anim.setEndValue(1.0)
        self._opacity_anim.setEasingCurve(QEasingCurve.Type.InOutSine)
        self._opacity_anim.setLoopCount(-1)
        self._opacity_anim.start()

    @Property(float)
    def dot_opacity(self):
        return self._opacity

    @dot_opacity.setter
    def dot_opacity(self, val):
        self._opacity = val
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        cx = self.width() / 2
        cy = self.height() / 2
        r = self._size / 2

        if self._variant == "hollow":
            pen = QPen(self._color, 1.5)
            p.setPen(pen)
            p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawEllipse(QPointF(cx, cy), r, r)
            return

        ring_color = QColor(self._color)
        ring_color.setAlpha(int(30 * self._opacity))
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(ring_color)
        p.drawEllipse(QPointF(cx, cy), r + 3, r + 3)

        core_color = QColor(self._color)
        core_color.setAlphaF(self._opacity)
        p.setBrush(core_color)
        p.drawEllipse(QPointF(cx, cy), r, r)


class EquitySparkline(QWidget):
    """
    Filled path from cumulative PnL points; accent stroke + vertical gradient fill.
    """

    def __init__(self, points=None, height=48, parent=None):
        super().__init__(parent)
        self.setFixedHeight(height)
        self._points = points or []

    def set_points(self, points: list[float]):
        self._points = points
        self.update()

    def paintEvent(self, event):
        if len(self._points) < 2:
            return
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        w, h = self.width(), self.height()
        pts = self._points
        mn, mx = min(pts), max(pts)
        rng = mx - mn or 1

        def sx(i):
            return i / (len(pts) - 1) * w

        def sy(v):
            return h - (v - mn) / rng * (h - 4) - 2

        path = QPainterPath()
        path.moveTo(sx(0), sy(pts[0]))
        for i, v in enumerate(pts[1:], 1):
            path.lineTo(sx(i), sy(v))

        pen = QPen(QColor(ACCENT), 1.5)
        p.setPen(pen)
        p.setBrush(Qt.BrushStyle.NoBrush)
        p.drawPath(path)

        fill_path = QPainterPath(path)
        fill_path.lineTo(w, h)
        fill_path.lineTo(0, h)
        fill_path.closeSubpath()
        grad = QLinearGradient(0, 0, 0, h)
        grad.setColorAt(0, QColor(0, 195, 137, 40))
        grad.setColorAt(1, QColor(0, 195, 137, 0))
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(grad)
        p.drawPath(fill_path)


class ActiveHoursHistogram(QWidget):
    """
    24 vertical bars: frequency per UTC hour.
    High = ACCENT, medium = semi-accent, low = SURFACE2.
    """

    def __init__(self, values=None, parent=None):
        super().__init__(parent)
        self.setFixedHeight(52)
        self._values = values or [0] * 24

    def set_values(self, values: list[int]):
        self._values = values
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        w, h = self.width(), self.height() - 2
        n = len(self._values)
        bar_w = max(1, w / n - 2)
        mx = max(self._values) or 1

        for i, v in enumerate(self._values):
            x = i * (w / n) + 1
            bh = max(2, (v / mx) * h)
            y = h - bh
            ratio = v / mx
            if ratio >= 0.6:
                color = QColor(ACCENT)
            elif ratio >= 0.33:
                color = QColor(0, 195, 137, 115)
            else:
                color = QColor(SURFACE2)
            p.setPen(Qt.PenStyle.NoPen)
            p.setBrush(color)
            p.drawRoundedRect(QRectF(x, y, bar_w, bh), 2, 2)


class SweepBand(QWidget):
    """
    2px bottom strip with a sweeping gradient highlight (STOP button motif).
    """

    def __init__(self, color=ACCENT, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self._color = QColor(color)
        self._phase = 0.0

        self._phase_anim = QPropertyAnimation(self, b"phase", self)
        self._phase_anim.setDuration(1600)
        self._phase_anim.setStartValue(0.0)
        self._phase_anim.setEndValue(1.0)
        self._phase_anim.setLoopCount(-1)
        self._phase_anim.setEasingCurve(QEasingCurve.Type.Linear)
        self._phase_anim.start()

    @Property(float)
    def phase(self):
        return self._phase

    @phase.setter
    def phase(self, val):
        self._phase = val
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        w, h = self.width(), self.height()
        cx = self._phase * (w + 80) - 40
        grad = QLinearGradient(cx - 60, 0, cx + 60, 0)
        grad.setColorAt(0, QColor(0, 0, 0, 0))
        c = QColor(self._color)
        c.setAlpha(70)
        grad.setColorAt(0.5, c)
        grad.setColorAt(1, QColor(0, 0, 0, 0))
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(grad)
        p.drawRect(0, h - 2, w, 2)

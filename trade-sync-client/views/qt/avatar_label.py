"""Circular avatar label: async image fetch with initials fallback."""

from __future__ import annotations

import threading

import requests
from PySide6.QtCore import Qt, QRect, Signal
from PySide6.QtGui import QColor, QPainter, QPainterPath, QPen, QPixmap
from PySide6.QtWidgets import QLabel

from views.qt.theme import ACCENT, ACCENT_SOFT

_FETCH_TIMEOUT_SEC = 5.0
_pixmap_cache: dict[str, QPixmap] = {}

# 28px header avatars: ring eats visible area; initials fallback has no ring.
_SHOW_MINT_RING = False


def _resolve_avatar_url(avatar_url: str | None) -> str | None:
    if not avatar_url or not str(avatar_url).strip():
        return None
    url = str(avatar_url).strip()
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/"):
        return f"http://localhost:3000{url}"
    return url


class AvatarLabel(QLabel):
    """Shows provider photo when available; falls back to initials circle."""

    _bytes_ready = Signal(str, int, object)

    def __init__(
        self,
        name: str | None = None,
        avatar_url: str | None = None,
        size: int = 28,
        parent=None,
    ):
        super().__init__(parent)
        self._size = size
        self._name = (name or "?").strip() or "?"
        self._avatar_url: str | None = None
        self._fetch_token = 0
        self._photo_pixmap: QPixmap | None = None
        self.setFixedSize(size, size)
        self.setContentsMargins(0, 0, 0, 0)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setScaledContents(False)
        self._bytes_ready.connect(
            self._on_bytes_ready,
            Qt.ConnectionType.QueuedConnection,
        )
        self.set_url(avatar_url)

    def set_identity(self, name: str | None, avatar_url: str | None) -> None:
        self._name = (name or "?").strip() or "?"
        self.set_url(avatar_url)

    def set_url(self, avatar_url: str | None) -> None:
        resolved = _resolve_avatar_url(avatar_url)
        print(f"[AVATAR] set_url raw={avatar_url!r} resolved={resolved!r}")
        if resolved == self._avatar_url:
            print("[AVATAR] set_url branch=unchanged_skip")
            return
        self._avatar_url = resolved
        self._fetch_token += 1
        token = self._fetch_token

        if not resolved:
            print("[AVATAR] set_url branch=initials_no_url")
            self._show_initials()
            return

        cached = _pixmap_cache.get(resolved)
        if cached is not None and not cached.isNull():
            print(f"[AVATAR] set_url branch=cache_hit url={resolved!r}")
            try:
                self._apply_pixmap(resolved, cached)
            except Exception as e:
                print(f"[AVATAR] apply error on cache hit: {e!r}")
                self._show_initials()
            return

        print(f"[AVATAR] set_url branch=fetch_start token={token} url={resolved!r}")
        self._show_initials()
        thread = threading.Thread(
            target=self._download_bytes,
            args=(resolved, token),
            daemon=True,
        )
        thread.start()

    def _show_initials(self) -> None:
        letter = self._name[0].upper()
        radius = self._size // 2
        self._photo_pixmap = None
        self.setPixmap(QPixmap())
        self.setText(letter)
        self.setStyleSheet(
            f"""
            background: {ACCENT_SOFT};
            color: {ACCENT};
            border-radius: {radius}px;
            font-weight: 700;
            font-size: {max(10, self._size // 2 - 2)}px;
            """
        )
        self.update()

    def _apply_pixmap(self, url: str, pixmap: QPixmap) -> None:
        if url != self._avatar_url:
            print(
                f"[AVATAR] apply_pixmap skipped stale url={url!r} "
                f"current={self._avatar_url!r}"
            )
            return
        if pixmap.isNull():
            print("[AVATAR] apply_pixmap pixmap isNull → initials")
            self._show_initials()
            return

        print(
            f"[AVATAR] apply_pixmap source size={pixmap.width()}x{pixmap.height()} "
            f"url={url!r}"
        )
        try:
            self._photo_pixmap = pixmap
            self.setPixmap(QPixmap())
            self.setText("")
            self.setStyleSheet("background: transparent;")
            self.update()
            dpr = self.devicePixelRatioF() or 1.0
            print(
                f"[AVATAR] apply_pixmap ok circular logical={self._size} "
                f"dpr={dpr} widget={self.width()}x{self.height()}"
            )
        except Exception as e:
            print(f"[AVATAR] render error: {e!r}")
            self._show_initials()

    def paintEvent(self, event) -> None:
        if self._photo_pixmap is None or self._photo_pixmap.isNull():
            super().paintEvent(event)
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        target = self.rect()
        painter.setCompositionMode(
            QPainter.CompositionMode.CompositionMode_Source
        )
        painter.fillRect(target, QColor(0, 0, 0, 0))
        painter.setCompositionMode(
            QPainter.CompositionMode.CompositionMode_SourceOver
        )

        clip_path = QPainterPath()
        clip_path.addEllipse(target)
        painter.setClipPath(clip_path)

        scaled = self._photo_pixmap.scaled(
            target.size(),
            Qt.AspectRatioMode.KeepAspectRatioByExpanding,
            Qt.TransformationMode.SmoothTransformation,
        )
        x_off = max(0, (scaled.width() - target.width()) // 2)
        y_off = max(0, (scaled.height() - target.height()) // 2)
        source_rect = QRect(x_off, y_off, target.width(), target.height())
        painter.drawPixmap(target, scaled, source_rect)
        painter.setClipping(False)

        if _SHOW_MINT_RING:
            pen_width = max(1.0, self.devicePixelRatioF() or 1.0)
            inset = pen_width / 2.0
            painter.setPen(QPen(QColor(ACCENT), pen_width))
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawEllipse(
                inset,
                inset,
                target.width() - pen_width,
                target.height() - pen_width,
            )

        painter.end()

    def _download_bytes(self, url: str, token: int) -> None:
        data: bytes | None = None
        print(f"[AVATAR] fetch start url={url!r} token={token}")
        try:
            response = requests.get(url, timeout=_FETCH_TIMEOUT_SEC)
            byte_count = len(response.content) if response.content else 0
            print(
                f"[AVATAR] fetch status={response.status_code} bytes={byte_count} "
                f"token={token}"
            )
            if response.status_code == 200 and response.content:
                data = response.content
            else:
                print(
                    f"[AVATAR] fetch skipped decode status={response.status_code} "
                    f"bytes={byte_count} token={token}"
                )
        except Exception as e:
            print(f"[AVATAR] fetch error: {e!r} token={token}")

        self._bytes_ready.emit(url, token, data)

    def _on_bytes_ready(self, url: str, token: int, data: object) -> None:
        if token != self._fetch_token:
            print(
                f"[AVATAR] deliver skipped stale token={token} "
                f"current={self._fetch_token}"
            )
            return

        byte_count = len(data) if isinstance(data, bytes) else 0
        print(
            f"[AVATAR] deliver token={token} bytes={byte_count} "
            f"url={url!r}"
        )

        if not isinstance(data, bytes) or not data:
            print(f"[AVATAR] deliver no bytes → initials token={token}")
            self._show_initials()
            return

        loaded = QPixmap()
        load_ok = loaded.loadFromData(data)
        print(
            f"[AVATAR] loadFromData ok={load_ok} isNull={loaded.isNull()} "
            f"token={token}"
        )
        if not load_ok or loaded.isNull():
            self._show_initials()
            return

        _pixmap_cache[url] = loaded
        self._apply_pixmap(url, loaded)

"""COPY tab: master summary stub, copy settings, start/stop listening."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from views.qt.custom_widgets import SweepBand
from views.qt.primitives import Btn, Card, DarkSpinbox, FieldLabel, MicroLabel, SegmentedToggle
from views.qt.theme import TEXT, TEXT3


class CopyView(QWidget):
    """Slave COPY stack page: binds to ``SlaveController.state`` fields (no controller edits)."""

    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self._controller = controller
        self._syncing_ui = False

        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # ── Master card ─────────────────────────────────────
        master_card = Card()
        m_inner = QVBoxLayout(master_card)
        m_inner.setContentsMargins(20, 20, 20, 20)
        m_inner.setSpacing(8)
        m_inner.addWidget(MicroLabel("Master"))
        self.master_body = QLabel()
        self.master_body.setWordWrap(True)
        self.master_body.setStyleSheet(f"color: {TEXT3}; font-size: 13px;")
        m_inner.addWidget(self.master_body)
        root.addWidget(master_card)

        # ── Copy settings ───────────────────────────────────
        settings = Card(accent=True)
        s_inner = QVBoxLayout(settings)
        s_inner.setContentsMargins(20, 20, 20, 20)
        s_inner.setSpacing(14)
        s_inner.addWidget(MicroLabel("Copy settings"))

        self.mode_toggle = SegmentedToggle(
            [("MULTIPLIER", "MULTIPLIER"), ("FIXED LOT", "FIXED_LOT")],
            default=0,
        )
        self.mode_toggle.changed.connect(self._on_copy_mode_changed)
        s_inner.addWidget(self.mode_toggle)

        mult_row = QWidget()
        mh = QHBoxLayout(mult_row)
        mh.setContentsMargins(0, 0, 0, 0)
        mh.setSpacing(12)
        mh.addWidget(FieldLabel("Risk multiplier"))
        mh.addStretch(1)
        self.multiplier_spin = DarkSpinbox(0.01, 10.0, 0.01)
        self.multiplier_spin.setMinimumWidth(120)
        self.multiplier_spin.valueChanged.connect(self._on_multiplier_changed)
        mh.addWidget(self.multiplier_spin)
        s_inner.addWidget(mult_row)

        self.fixed_row = QWidget()
        fr = QHBoxLayout(self.fixed_row)
        fr.setContentsMargins(0, 0, 0, 0)
        fr.setSpacing(12)
        fr.addWidget(FieldLabel("Fixed lot size"))
        fr.addStretch(1)
        self.fixed_spin = DarkSpinbox(0.01, 100.0, 0.01)
        self.fixed_spin.setMinimumWidth(120)
        self.fixed_spin.valueChanged.connect(self._on_fixed_lot_changed)
        fr.addWidget(self.fixed_spin)
        s_inner.addWidget(self.fixed_row)

        slip_row = QWidget()
        sh = QHBoxLayout(slip_row)
        sh.setContentsMargins(0, 0, 0, 0)
        sh.setSpacing(12)
        sh.addWidget(FieldLabel("Slippage (points)"))
        sh.addStretch(1)
        self.slippage_spin = DarkSpinbox(0.0, 50.0, 1.0)
        self.slippage_spin.setDecimals(0)
        self.slippage_spin.setMinimumWidth(120)
        self.slippage_spin.valueChanged.connect(self._on_slippage_changed)
        sh.addWidget(self.slippage_spin)
        s_inner.addWidget(slip_row)

        rev_row = QWidget()
        rh = QHBoxLayout(rev_row)
        rh.setContentsMargins(0, 0, 0, 0)
        rh.setSpacing(12)
        rh.addWidget(FieldLabel("Reverse copy"))
        rh.addStretch(1)
        self.reverse_chk = QCheckBox("Invert BUY ↔ SELL on execution")
        self.reverse_chk.setStyleSheet(f"color: {TEXT}; font-size: 12px;")
        self.reverse_chk.toggled.connect(self._on_reverse_toggled)
        rh.addWidget(self.reverse_chk, alignment=Qt.AlignmentFlag.AlignRight)
        s_inner.addWidget(rev_row)

        root.addWidget(settings)

        # ── Listen control ──────────────────────────────────
        listen_host = QWidget()
        listen_col = QVBoxLayout(listen_host)
        listen_col.setContentsMargins(0, 0, 0, 0)
        listen_col.setSpacing(0)

        self.listen_btn = Btn("START LISTENING", kind="stop", size="lg")
        self.listen_btn.clicked.connect(self._on_listen_clicked)
        listen_col.addWidget(self.listen_btn)

        self.sweep_strip = SweepBand()
        self.sweep_strip.setFixedHeight(4)
        self.sweep_strip.setVisible(False)
        listen_col.addWidget(self.sweep_strip)

        root.addWidget(listen_host)
        root.addStretch(1)

        self.sync_from_state()

    def _state(self):
        return self._controller.state

    def sync_from_state(self) -> None:
        """Mirror ``AppState`` into widgets without feedback loops."""
        self._syncing_ui = True
        state = self._state()

        mn = getattr(state, "master_name", None)
        if mn and str(mn).strip():
            self.master_body.setText(f"Copying signals from: {str(mn).strip()}")
        elif getattr(state, "mt5_connected", False) and getattr(state, "socket_connected", False):
            self.master_body.setText(
                "Cloud and terminal are connected. Waiting for assigned master routing."
            )
        else:
            self.master_body.setText("Sign in with MT5 and cloud to subscribe to a master.")

        want_mode = (
            "FIXED_LOT" if getattr(state, "copy_mode", "MULTIPLIER") == "FIXED_LOT" else "MULTIPLIER"
        )
        mt = self.mode_toggle
        if mt.value() != want_mode:
            try:
                mt.changed.disconnect(self._on_copy_mode_changed)
            except TypeError:
                pass
            want_idx = 1 if want_mode == "FIXED_LOT" else 0
            mt._on_click(want_idx)
            mt.changed.connect(self._on_copy_mode_changed)

        self.fixed_row.setVisible(want_mode == "FIXED_LOT")

        mr = float(getattr(state, "risk_multiplier", 1.0))
        if abs(self.multiplier_spin.value() - mr) > 1e-9:
            self.multiplier_spin.blockSignals(True)
            self.multiplier_spin.setValue(mr)
            self.multiplier_spin.blockSignals(False)

        fl = float(getattr(state, "fixed_lot_size", 0.01))
        if abs(self.fixed_spin.value() - fl) > 1e-9:
            self.fixed_spin.blockSignals(True)
            self.fixed_spin.setValue(fl)
            self.fixed_spin.blockSignals(False)

        sp = float(int(getattr(state, "slippage_points", 10)))
        if abs(self.slippage_spin.value() - sp) > 1e-9:
            self.slippage_spin.blockSignals(True)
            self.slippage_spin.setValue(sp)
            self.slippage_spin.blockSignals(False)

        rev = bool(getattr(state, "reverse_copy", False))
        if self.reverse_chk.isChecked() != rev:
            self.reverse_chk.blockSignals(True)
            self.reverse_chk.setChecked(rev)
            self.reverse_chk.blockSignals(False)

        running = bool(getattr(state, "is_running", False))
        want_listen = "STOP LISTENING" if running else "START LISTENING"
        if self.listen_btn.text() != want_listen:
            self.listen_btn.setText(want_listen)
        if self.sweep_strip.isVisible() != running:
            self.sweep_strip.setVisible(running)

        self._syncing_ui = False

    def _on_copy_mode_changed(self, val: str) -> None:
        if self._syncing_ui:
            return
        self._state().copy_mode = val
        self.fixed_row.setVisible(val == "FIXED_LOT")

    def _on_multiplier_changed(self, val: float) -> None:
        if self._syncing_ui:
            return
        self._state().risk_multiplier = float(val)

    def _on_fixed_lot_changed(self, val: float) -> None:
        if self._syncing_ui:
            return
        self._state().fixed_lot_size = float(val)

    def _on_slippage_changed(self, val: float) -> None:
        if self._syncing_ui:
            return
        self._state().slippage_points = int(round(val))

    def _on_reverse_toggled(self, checked: bool) -> None:
        if self._syncing_ui:
            return
        self._state().reverse_copy = bool(checked)

    def _on_listen_clicked(self) -> None:
        self._controller.toggle_listening()

"""RISK tab: trade guards, daily loss status, symbol whitelist (design-system layout)."""

from __future__ import annotations

from typing import Optional

from colorama import Fore, Style
from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from views.qt.primitives import (
    Btn,
    Card,
    DarkCheckBox,
    DarkSpinbox,
    FieldLabel,
    GhostIconBtn,
    LineInput,
    MicroLabel,
    MiniChip,
)
from views.qt.theme import ACCENT, DANGER, TEXT3


class RiskView(QWidget):
    """Replicates ``RiskPanel`` state wiring; layout uses cards, toggles, and chip whitelist."""

    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self._controller = controller
        self._syncing = False
        self._whitelist_sig: Optional[tuple[str, ...]] = None

        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # ── Trade guards (2×2 grid) ──────────────────────────
        guards = Card(accent=True)
        g_inner = QVBoxLayout(guards)
        g_inner.setContentsMargins(20, 20, 20, 20)
        g_inner.setSpacing(14)
        g_inner.addWidget(MicroLabel("Trade guards"))

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setHorizontalSpacing(16)
        grid.setVerticalSpacing(16)
        grid.setColumnStretch(0, 1)
        grid.setColumnStretch(1, 1)

        eq_w, self._equity_chk, self.spin_equity_floor = self._make_guard_cell(
            "Equity floor",
            "Stop copying if account equity drops below this ($). 0 = off.",
            0.0,
            1_000_000.0,
            100.0,
            "Disabled (0.00)",
            self._on_equity_toggle,
            self._on_equity_floor_changed,
        )
        grid.addWidget(eq_w, 0, 0)

        cc_w, self._concurrent_chk, self.spin_max_concurrent = self._make_guard_cell(
            "Max concurrent trades",
            "Cap simultaneous copied positions. 0 = off.",
            0.0,
            50.0,
            1.0,
            "Disabled (0)",
            self._on_concurrent_toggle,
            self._on_max_concurrent_spin,
        )
        self.spin_max_concurrent.setDecimals(0)
        grid.addWidget(cc_w, 0, 1)

        dl_w, self._daily_chk, self.spin_daily_loss = self._make_guard_cell(
            "Daily loss limit ($)",
            "Pause copying when daily P&L falls below negative of this amount. 0 = off.",
            0.0,
            100_000.0,
            10.0,
            "Disabled (0.00)",
            self._on_daily_toggle,
            self._on_daily_loss_changed,
        )
        grid.addWidget(dl_w, 1, 0)

        ml_w, self._lot_chk, self.spin_max_lot = self._make_guard_cell(
            "Max lot cap",
            "Clamp copy volume per trade. 0 = off.",
            0.0,
            100.0,
            0.01,
            "Disabled (0.00)",
            self._on_lot_toggle,
            self._on_max_lot_changed,
        )
        grid.addWidget(ml_w, 1, 1)

        g_inner.addLayout(grid)

        hint_g = QLabel("Slave MT5 equity is checked before each OPEN when equity floor is on.")
        hint_g.setWordWrap(True)
        hint_g.setStyleSheet(f"color: {TEXT3}; font-size: 11px;")
        g_inner.addWidget(hint_g)
        root.addWidget(guards)

        # ── Daily loss status (same as legacy loss group) ─────
        daily = Card()
        d_inner = QVBoxLayout(daily)
        d_inner.setContentsMargins(20, 20, 20, 20)
        d_inner.setSpacing(10)
        d_inner.addWidget(MicroLabel("Daily loss status"))

        status_row = QHBoxLayout()
        status_row.addWidget(FieldLabel("Today's P&L"))
        self.lbl_daily_pnl = QLabel("$0.00")
        self.lbl_daily_pnl.setStyleSheet(
            f"color: {ACCENT}; font-weight: 700; font-size: 14px;",
        )
        status_row.addWidget(self.lbl_daily_pnl)
        status_row.addSpacing(24)
        status_row.addWidget(FieldLabel("Copy filter"))
        self.lbl_copy_status = QLabel("Active")
        self.lbl_copy_status.setStyleSheet(
            f"color: {ACCENT}; font-weight: 700; font-size: 13px;",
        )
        status_row.addWidget(self.lbl_copy_status)
        status_row.addStretch(1)
        d_inner.addLayout(status_row)

        self.warning_card = Card()
        self.warning_card.setStyleSheet(
            f"""
            Card {{
                background: rgba(255,90,74,0.08);
                border: 1px solid {DANGER};
                border-radius: 8px;
            }}
            """
        )
        wlay = QVBoxLayout(self.warning_card)
        wlay.setContentsMargins(12, 12, 12, 12)
        wlay.setSpacing(8)
        wlab = QLabel("Copying paused; daily loss limit reached.")
        wlab.setStyleSheet(f"color: {DANGER}; font-weight: 700;")
        wlay.addWidget(wlab)
        self.btn_reset = Btn("Reset & resume copying", kind="ghost", size="md")
        self.btn_reset.clicked.connect(self._on_reset_clicked)
        wlay.addWidget(self.btn_reset)
        self.warning_card.hide()
        d_inner.addWidget(self.warning_card)
        root.addWidget(daily)

        # ── Whitelist ────────────────────────────────────────
        wl = Card()
        w_inner = QVBoxLayout(wl)
        w_inner.setContentsMargins(20, 20, 20, 20)
        w_inner.setSpacing(12)
        w_inner.addWidget(MicroLabel("Symbol whitelist"))
        help_wl = QLabel(
            "When non-empty, only these slave-side symbols are copied. "
            "Leave empty to allow all mapped symbols."
        )
        help_wl.setWordWrap(True)
        help_wl.setStyleSheet(f"color: {TEXT3}; font-size: 11px;")
        w_inner.addWidget(help_wl)

        add_row = QHBoxLayout()
        self.input_wl_sym = LineInput(placeholder="Your symbol, e.g. XAUUSD")
        add_row.addWidget(self.input_wl_sym, stretch=1)
        self.btn_add_wl = Btn("Add", kind="primary", size="md")
        self.btn_add_wl.clicked.connect(self._add_whitelist)
        add_row.addWidget(self.btn_add_wl)
        w_inner.addLayout(add_row)

        self.chips_host = QWidget()
        self.chips_grid = QGridLayout(self.chips_host)
        self.chips_grid.setContentsMargins(0, 0, 0, 0)
        self.chips_grid.setHorizontalSpacing(8)
        self.chips_grid.setVerticalSpacing(8)
        w_inner.addWidget(self.chips_host)

        hint_wl = QLabel("Remove a tag with the × control.")
        hint_wl.setStyleSheet(f"color: {TEXT3}; font-size: 11px;")
        w_inner.addWidget(hint_wl)
        root.addWidget(wl)

        root.addStretch(0)

        self.refresh_display()

    @property
    def state(self):
        return self._controller.state

    def _make_guard_cell(
        self,
        title: str,
        subtitle: str,
        min_v: float,
        max_v: float,
        step: float,
        special_zero: str,
        toggle_slot,
        value_slot,
    ) -> tuple[QWidget, DarkCheckBox, DarkSpinbox]:
        box = QWidget()
        v = QVBoxLayout(box)
        v.setContentsMargins(0, 0, 0, 0)
        v.setSpacing(8)
        v.addWidget(FieldLabel(title))
        sub = QLabel(subtitle)
        sub.setWordWrap(True)
        sub.setStyleSheet(f"color: {TEXT3}; font-size: 10px;")
        v.addWidget(sub)

        hr = QHBoxLayout()
        hr.setSpacing(12)
        chk = DarkCheckBox("On")
        chk.toggled.connect(toggle_slot)
        hr.addWidget(chk, alignment=Qt.AlignmentFlag.AlignCenter)

        spin = DarkSpinbox(min_v, max_v, step)
        spin.setSpecialValueText(special_zero)
        spin.valueChanged.connect(value_slot)
        spin.setMinimumWidth(140)
        hr.addWidget(spin, stretch=1)
        v.addLayout(hr)
        return box, chk, spin

    # ── Handlers (mirror risk_panel) ─────────────────────────

    def _on_equity_floor_changed(self, value: float) -> None:
        if self._syncing or not self._equity_chk.isChecked():
            return
        self.state.equity_floor = float(value)
        print(Fore.CYAN + f"[RISK] equity_floor → {value}" + Style.RESET_ALL)

    def _on_max_lot_changed(self, value: float) -> None:
        if self._syncing or not self._lot_chk.isChecked():
            return
        self.state.max_lot_size = float(value)
        print(Fore.CYAN + f"[RISK] max_lot_size → {value}" + Style.RESET_ALL)

    def _on_max_concurrent_spin(self, value: float) -> None:
        if self._syncing or not self._concurrent_chk.isChecked():
            return
        self.state.max_concurrent_trades = int(round(value))
        print(Fore.CYAN + f"[RISK] max_concurrent → {value}" + Style.RESET_ALL)

    def _on_daily_loss_changed(self, value: float) -> None:
        if self._syncing or not self._daily_chk.isChecked():
            return
        self.state.daily_loss_limit = float(value)
        print(Fore.CYAN + f"[RISK] daily_loss_limit → {value}" + Style.RESET_ALL)

    def _on_equity_toggle(self, checked: bool) -> None:
        if self._syncing:
            return
        self._apply_toggle_double(
            checked,
            self.spin_equity_floor,
            "equity_floor",
            100.0,
            self._on_equity_floor_changed,
        )

    def _on_concurrent_toggle(self, checked: bool) -> None:
        if self._syncing:
            return
        self._apply_toggle_double(
            checked,
            self.spin_max_concurrent,
            "max_concurrent_trades",
            1.0,
            self._on_max_concurrent_spin,
            as_int=True,
        )

    def _on_daily_toggle(self, checked: bool) -> None:
        if self._syncing:
            return
        self._apply_toggle_double(
            checked,
            self.spin_daily_loss,
            "daily_loss_limit",
            100.0,
            self._on_daily_loss_changed,
        )

    def _on_lot_toggle(self, checked: bool) -> None:
        if self._syncing:
            return
        self._apply_toggle_double(
            checked,
            self.spin_max_lot,
            "max_lot_size",
            0.01,
            self._on_max_lot_changed,
        )

    def _apply_toggle_double(
        self,
        checked: bool,
        spin: DarkSpinbox,
        attr: str,
        on_value: float,
        notify,
        as_int: bool = False,
    ) -> None:
        if not checked:
            setattr(self.state, attr, 0 if as_int else 0.0)
            self._syncing = True
            spin.setEnabled(True)
            spin.blockSignals(True)
            spin.setValue(0.0)
            spin.blockSignals(False)
            spin.setEnabled(False)
            self._syncing = False
            print(Fore.CYAN + f"[RISK] {attr} → 0 (disabled)" + Style.RESET_ALL)
            return
        spin.setEnabled(True)
        cur = getattr(self.state, attr)
        cur_n = int(cur) if as_int else float(cur)
        if cur_n <= 0:
            new_v = int(on_value) if as_int else float(on_value)
            setattr(self.state, attr, new_v)
            self._syncing = True
            spin.blockSignals(True)
            spin.setValue(float(new_v))
            spin.blockSignals(False)
            self._syncing = False
            notify(float(new_v))

    def _on_reset_clicked(self) -> None:
        self.state.reset_daily_stats()
        self.refresh_display()

    def _add_whitelist(self) -> None:
        sym = self.input_wl_sym.text().strip()
        if sym and sym not in self.state.symbol_whitelist:
            self.state.symbol_whitelist.append(sym)
            self._rebuild_whitelist_chips()
            self.input_wl_sym.clear()
            print(
                Fore.CYAN
                + f"[RISK] Whitelist add: {sym} → {self.state.symbol_whitelist}"
                + Style.RESET_ALL,
            )

    def _remove_whitelist_sym(self, sym: str) -> None:
        if sym in self.state.symbol_whitelist:
            self.state.symbol_whitelist.remove(sym)
        self._rebuild_whitelist_chips()
        print(
            Fore.CYAN
            + f"[RISK] Whitelist remove: {sym} → {self.state.symbol_whitelist}"
            + Style.RESET_ALL,
        )

    def _rebuild_whitelist_chips(self) -> None:
        while self.chips_grid.count():
            item = self.chips_grid.takeAt(0)
            w = item.widget()
            if w is not None:
                w.deleteLater()

        self._whitelist_sig = tuple(self.state.symbol_whitelist)
        cols = 4
        for i, sym in enumerate(self.state.symbol_whitelist):
            cell = QWidget()
            lay = QHBoxLayout(cell)
            lay.setContentsMargins(0, 0, 0, 0)
            lay.setSpacing(4)
            lay.addWidget(MiniChip(sym))
            rm = GhostIconBtn("×")
            rm.clicked.connect(
                lambda _c=False, s=sym: self._remove_whitelist_sym(s),
            )
            lay.addWidget(rm)
            r, c = divmod(i, cols)
            self.chips_grid.addWidget(cell, r, c)

    def refresh_display(self) -> None:
        """Sync spin/toggle widgets from state; refresh daily status (like ``RiskPanel``)."""
        self._syncing = True

        def _set_guard(chk: DarkCheckBox, spin: DarkSpinbox, val: float) -> None:
            active = val > 0
            chk.blockSignals(True)
            chk.setChecked(active)
            chk.blockSignals(False)
            spin.blockSignals(True)
            spin.setEnabled(active)
            spin.setValue(float(val))
            spin.blockSignals(False)

        _set_guard(self._equity_chk, self.spin_equity_floor, float(self.state.equity_floor))
        _set_guard(
            self._concurrent_chk,
            self.spin_max_concurrent,
            float(self.state.max_concurrent_trades),
        )
        _set_guard(self._daily_chk, self.spin_daily_loss, float(self.state.daily_loss_limit))
        _set_guard(self._lot_chk, self.spin_max_lot, float(self.state.max_lot_size))

        self._syncing = False

        pnl = float(self.state.daily_pnl)
        color = ACCENT if pnl >= 0 else DANGER
        self.lbl_daily_pnl.setText(f"${pnl:.2f}")
        self.lbl_daily_pnl.setStyleSheet(
            f"color: {color}; font-weight: 700; font-size: 14px;",
        )

        paused = bool(self.state.copying_paused_by_loss)
        self.warning_card.setVisible(paused)
        if paused:
            self.lbl_copy_status.setText("Paused")
            self.lbl_copy_status.setStyleSheet(
                f"color: {DANGER}; font-weight: 700; font-size: 13px;",
            )
        else:
            self.lbl_copy_status.setText("Active")
            self.lbl_copy_status.setStyleSheet(
                f"color: {ACCENT}; font-weight: 700; font-size: 13px;",
            )

        wl_sig = tuple(self.state.symbol_whitelist)
        if self._whitelist_sig is None or wl_sig != self._whitelist_sig:
            self._rebuild_whitelist_chips()

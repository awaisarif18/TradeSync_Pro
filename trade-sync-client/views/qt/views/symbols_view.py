"""SYMBOLS tab: broker presets, manual mapping table, unmapped behavior (design-system layout)."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from data.broker_symbols import BROKER_PRESETS
from views.qt.primitives import (
    Btn,
    Card,
    DarkDropdown,
    FieldLabel,
    GhostIconBtn,
    LineInput,
    MicroLabel,
)
from views.qt.theme import ACCENT, DANGER, TEXT3

# Same choices as ``symbol_map_panel.SymbolMapPanel`` (``Custom`` is not a preset key).
BROKER_LIST = [
    "Select broker...",
    "Vantage",
    "XM",
    "Exness",
    "IC Markets",
    "Pepperstone",
    "Custom",
]


class SymbolsView(QWidget):
    """Slave symbol map UI; mutations mirror ``SymbolMapPanel`` (state-only, no controller calls)."""

    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self._controller = controller
        self._map_sig_cache: tuple[tuple[str, str], ...] = ()

        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # ── Broker preset ───────────────────────────────────
        preset = Card(accent=True)
        p_inner = QVBoxLayout(preset)
        p_inner.setContentsMargins(20, 20, 20, 20)
        p_inner.setSpacing(12)
        p_inner.addWidget(MicroLabel("Broker preset loader"))

        m_row = QWidget()
        ml = QHBoxLayout(m_row)
        ml.setContentsMargins(0, 0, 0, 0)
        ml.setSpacing(12)
        ml.addWidget(FieldLabel("Master's broker"), stretch=0)
        self.combo_master_broker = DarkDropdown()
        self.combo_master_broker.addItems(BROKER_LIST)
        ml.addWidget(self.combo_master_broker, stretch=1)
        p_inner.addWidget(m_row)

        y_row = QWidget()
        yl = QHBoxLayout(y_row)
        yl.setContentsMargins(0, 0, 0, 0)
        yl.setSpacing(12)
        yl.addWidget(FieldLabel("Your broker"), stretch=0)
        self.combo_my_broker = DarkDropdown()
        self.combo_my_broker.addItems(BROKER_LIST)
        yl.addWidget(self.combo_my_broker, stretch=1)
        p_inner.addWidget(y_row)

        self.btn_load_preset = Btn("Load Preset", kind="primary", size="md")
        self.btn_load_preset.clicked.connect(self._load_preset)
        p_inner.addWidget(self.btn_load_preset)

        help_preset = QLabel(
            "Pick the master's broker and yours. Preset fills standard pairs into your map."
        )
        help_preset.setWordWrap(True)
        help_preset.setStyleSheet(f"color: {TEXT3}; font-size: 11px;")
        p_inner.addWidget(help_preset)
        root.addWidget(preset)

        # ── Symbol mappings ─────────────────────────────────
        table_card = Card()
        t_inner = QVBoxLayout(table_card)
        t_inner.setContentsMargins(20, 20, 20, 20)
        t_inner.setSpacing(12)
        t_inner.addWidget(MicroLabel("Symbol mappings"))

        input_row = QHBoxLayout()
        input_row.setSpacing(10)
        self.input_master_sym = LineInput(placeholder="Master symbol, e.g. XAUUSD")
        self.input_slave_sym = LineInput(placeholder="Your symbol, e.g. GOLD")
        arrow = QLabel("→")
        arrow.setStyleSheet(f"font-size: 16px; color: {ACCENT};")

        input_row.addWidget(self.input_master_sym, stretch=1)
        input_row.addWidget(arrow)
        input_row.addWidget(self.input_slave_sym, stretch=1)

        self.btn_add_map = Btn("Add", kind="ghost", size="md")
        self.btn_add_map.clicked.connect(self._add_mapping)
        input_row.addWidget(self.btn_add_map)
        t_inner.addLayout(input_row)

        self.lbl_inline_status = QLabel("")
        self.lbl_inline_status.setStyleSheet(f"color: {DANGER}; font-size: 11px;")
        self.lbl_inline_status.hide()
        t_inner.addWidget(self.lbl_inline_status)

        self.table_symbol_map = QTableWidget()
        self.table_symbol_map.setColumnCount(3)
        self.table_symbol_map.setHorizontalHeaderLabels(
            ["MASTER SYMBOL", "YOUR SYMBOL", ""],
        )
        self.table_symbol_map.setColumnWidth(0, 160)
        self.table_symbol_map.setColumnWidth(1, 160)
        self.table_symbol_map.horizontalHeader().setStretchLastSection(True)
        self.table_symbol_map.setSelectionBehavior(
            QTableWidget.SelectionBehavior.SelectRows,
        )
        self.table_symbol_map.setEditTriggers(
            QTableWidget.EditTrigger.NoEditTriggers,
        )
        self.table_symbol_map.setAlternatingRowColors(False)
        self.table_symbol_map.verticalHeader().setVisible(False)
        t_inner.addWidget(self.table_symbol_map, stretch=1)

        hint_tbl = QLabel("Symbol names are case-sensitive.")
        hint_tbl.setStyleSheet(f"color: {TEXT3}; font-size: 11px;")
        t_inner.addWidget(hint_tbl)
        root.addWidget(table_card, stretch=1)

        # ── Unmapped ────────────────────────────────────────
        unmapped_card = Card()
        u_inner = QVBoxLayout(unmapped_card)
        u_inner.setContentsMargins(20, 20, 20, 20)
        u_inner.setSpacing(12)
        u_inner.addWidget(MicroLabel("Unmapped symbols"))

        u_row = QWidget()
        uh = QHBoxLayout(u_row)
        uh.setContentsMargins(0, 0, 0, 0)
        uh.setSpacing(12)
        uh.addWidget(FieldLabel("When master sends a symbol not in the map"))
        uh.addStretch(1)

        self.combo_unmapped = DarkDropdown()
        self.combo_unmapped.addItems(["Ignore (skip trade)", "Copy as-is (same name)"])

        uh.addWidget(self.combo_unmapped)

        idx = (
            1
            if self._controller.state.unmapped_symbol_behavior == "COPY_AS_IS"
            else 0
        )
        self.combo_unmapped.setCurrentIndex(idx)
        self.combo_unmapped.currentIndexChanged.connect(self._on_unmapped_changed)
        u_inner.addWidget(u_row)
        root.addWidget(unmapped_card)

        root.addStretch(0)

        self.refresh_display()

    @property
    def state(self):
        return self._controller.state

    def _symbol_map_signature(self) -> tuple[tuple[str, str], ...]:
        return tuple(sorted(self.state.symbol_map.items()))

    def refresh_display(self) -> None:
        """Rebuild the table when ``state.symbol_map`` changes; sync unmapped dropdown."""
        sig = self._symbol_map_signature()
        if sig != self._map_sig_cache:
            self._map_sig_cache = sig
            self._render_table_rows()
        um = getattr(self.state, "unmapped_symbol_behavior", "IGNORE")
        want_idx = 1 if um == "COPY_AS_IS" else 0
        cu = self.combo_unmapped
        if cu.currentIndex() != want_idx:
            cu.blockSignals(True)
            cu.setCurrentIndex(want_idx)
            cu.blockSignals(False)

    def _render_table_rows(self) -> None:
        self.table_symbol_map.setRowCount(0)
        for master_sym, slave_sym in self.state.symbol_map.items():
            row = self.table_symbol_map.rowCount()
            self.table_symbol_map.insertRow(row)
            self.table_symbol_map.setRowHeight(row, 32)

            m_item = QTableWidgetItem(master_sym)
            m_item.setTextAlignment(int(Qt.AlignmentFlag.AlignCenter))
            self.table_symbol_map.setItem(row, 0, m_item)

            s_item = QTableWidgetItem(slave_sym)
            s_item.setTextAlignment(int(Qt.AlignmentFlag.AlignCenter))
            self.table_symbol_map.setItem(row, 1, s_item)

            btn_cell = QWidget()
            brow = QHBoxLayout(btn_cell)
            brow.setContentsMargins(4, 2, 4, 2)
            brow.addStretch(1)
            rm = GhostIconBtn("×")
            rm.clicked.connect(
                lambda _c=False, ms=master_sym: self._remove_mapping(ms),
            )
            brow.addWidget(rm)
            brow.addStretch(1)
            self.table_symbol_map.setCellWidget(row, 2, btn_cell)

    def _load_preset(self) -> None:
        master_broker = self.combo_master_broker.currentText()
        my_broker = self.combo_my_broker.currentText()

        if master_broker not in BROKER_PRESETS or my_broker not in BROKER_PRESETS:
            print("[SYMBOL] Select valid brokers for both master and your broker")
            return

        added = 0
        for standard_sym, master_broker_sym in BROKER_PRESETS[master_broker].items():
            if master_broker_sym not in self.state.symbol_map:
                slave_sym = BROKER_PRESETS[my_broker].get(
                    standard_sym, master_broker_sym
                )
                self.state.symbol_map[master_broker_sym] = slave_sym
                added += 1

        print(f"[SYMBOL] Loaded {added} mappings: {master_broker} -> {my_broker}")
        self.refresh_display()

    def _add_mapping(self) -> None:
        master = self.input_master_sym.text().strip()
        slave = self.input_slave_sym.text().strip()
        if not master or not slave:
            return
        if master in self.state.symbol_map:
            self.lbl_inline_status.setText("Already mapped; remove that row first.")
            self.lbl_inline_status.show()
            return
        self.lbl_inline_status.hide()
        self.state.symbol_map[master] = slave
        self.input_master_sym.clear()
        self.input_slave_sym.clear()
        print(f"[SYMBOL] Added mapping: {master} -> {slave} | map: {self.state.symbol_map}")
        self.refresh_display()

    def _remove_mapping(self, master_sym: str) -> None:
        if master_sym in self.state.symbol_map:
            del self.state.symbol_map[master_sym]
            print(f"[SYMBOL] Removed mapping: {master_sym} | map: {self.state.symbol_map}")
            self.refresh_display()

    def _on_unmapped_changed(self, index: int) -> None:
        if index == 1:
            self.state.unmapped_symbol_behavior = "COPY_AS_IS"
            print("[SYMBOL] Unmapped symbols: copy as-is")
        else:
            self.state.unmapped_symbol_behavior = "IGNORE"
            print("[SYMBOL] Unmapped symbols: ignore")

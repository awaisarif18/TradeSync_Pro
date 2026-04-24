from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGroupBox,
    QLabel, QLineEdit, QComboBox, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView
)
from PySide6.QtCore import Qt
from models.app_state import AppState
from data.broker_symbols import BROKER_PRESETS


BROKER_LIST = [
    "Select broker...", "Vantage", "XM", "Exness",
    "IC Markets", "Pepperstone", "Custom"
]


class SymbolMapPanel(QWidget):
    def __init__(self, state: AppState, parent=None):
        super().__init__(parent)
        self.state = state
        self._build_ui()

    def _build_ui(self):
        root_layout = QVBoxLayout(self)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(6)

        # ── Section A: Broker Quick-Load ────────────────────────
        preset_group = QGroupBox("BROKER PRESET")
        preset_layout = QVBoxLayout(preset_group)

        # Row 1: Master's broker
        master_row = QHBoxLayout()
        master_row.addWidget(QLabel("Master's broker:"))

        self.combo_master_broker = QComboBox()
        self.combo_master_broker.setObjectName("combo_master_broker")
        self.combo_master_broker.addItems(BROKER_LIST)
        master_row.addWidget(self.combo_master_broker)
        master_row.addStretch()
        preset_layout.addLayout(master_row)

        # Row 2: Your broker
        my_row = QHBoxLayout()
        my_row.addWidget(QLabel("Your broker:"))

        self.combo_my_broker = QComboBox()
        self.combo_my_broker.setObjectName("combo_my_broker")
        self.combo_my_broker.addItems(BROKER_LIST)
        my_row.addWidget(self.combo_my_broker)
        my_row.addStretch()
        preset_layout.addLayout(my_row)

        # Row 3: Load button
        self.btn_load_preset = QPushButton("Load Preset Mappings")
        self.btn_load_preset.setObjectName("btn_load_preset")
        self.btn_load_preset.setStyleSheet(
            "background: #0a1a1a; border: 1px solid #00d4aa; "
            "color: #00d4aa; padding: 6px; font-weight: bold;"
        )
        self.btn_load_preset.clicked.connect(self._load_preset)
        preset_layout.addWidget(self.btn_load_preset)

        helper_preset = QLabel(
            "Select the master trader's broker and your broker. "
            "Preset maps master symbol names to your broker's names."
        )
        helper_preset.setWordWrap(True)
        helper_preset.setStyleSheet("color: #666666; font-size: 8pt;")
        preset_layout.addWidget(helper_preset)

        root_layout.addWidget(preset_group)

        # ── Section B: Symbol Mapping Table ─────────────────────
        table_group = QGroupBox("SYMBOL MAP")
        table_layout = QVBoxLayout(table_group)

        # Input row
        input_row = QHBoxLayout()

        self.input_master_sym = QLineEdit()
        self.input_master_sym.setObjectName("input_master_sym")
        self.input_master_sym.setPlaceholderText("Master symbol  e.g. XAUUSD")

        arrow_label = QLabel("\u2192")
        arrow_label.setStyleSheet("font-size: 14pt; color: #00d4aa;")

        self.input_slave_sym = QLineEdit()
        self.input_slave_sym.setObjectName("input_slave_sym")
        self.input_slave_sym.setPlaceholderText("Your symbol  e.g. GOLD")

        self.btn_add_map = QPushButton("Add")
        self.btn_add_map.setObjectName("btn_add_map")
        self.btn_add_map.clicked.connect(self._add_mapping)

        input_row.addWidget(self.input_master_sym)
        input_row.addWidget(arrow_label)
        input_row.addWidget(self.input_slave_sym)
        input_row.addWidget(self.btn_add_map)
        table_layout.addLayout(input_row)

        # Inline status label (hidden by default)
        self.lbl_inline_status = QLabel("")
        self.lbl_inline_status.setStyleSheet("color: #ff4444; font-size: 8pt;")
        self.lbl_inline_status.setVisible(False)
        table_layout.addWidget(self.lbl_inline_status)

        # Table widget
        self.table_symbol_map = QTableWidget()
        self.table_symbol_map.setObjectName("table_symbol_map")
        self.table_symbol_map.setColumnCount(3)
        self.table_symbol_map.setHorizontalHeaderLabels(
            ["MASTER SYMBOL", "YOUR SYMBOL", "ACTION"]
        )
        self.table_symbol_map.setColumnWidth(0, 160)
        self.table_symbol_map.setColumnWidth(1, 160)
        self.table_symbol_map.setColumnWidth(2, 80)
        self.table_symbol_map.horizontalHeader().setStretchLastSection(True)
        self.table_symbol_map.setSelectionBehavior(QTableWidget.SelectRows)
        self.table_symbol_map.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table_symbol_map.setAlternatingRowColors(False)
        self.table_symbol_map.verticalHeader().setVisible(False)
        table_layout.addWidget(self.table_symbol_map)

        # Unmapped symbol behavior
        unmapped_row = QHBoxLayout()
        unmapped_row.addWidget(QLabel("Unmapped symbols:"))

        self.combo_unmapped = QComboBox()
        self.combo_unmapped.setObjectName("combo_unmapped")
        self.combo_unmapped.addItems([
            "Ignore (skip trade)",
            "Copy as-is (same name)"
        ])
        # Sync with current state
        if self.state.unmapped_symbol_behavior == 'COPY_AS_IS':
            self.combo_unmapped.setCurrentIndex(1)
        else:
            self.combo_unmapped.setCurrentIndex(0)
        self.combo_unmapped.currentIndexChanged.connect(self._on_unmapped_changed)
        unmapped_row.addWidget(self.combo_unmapped)
        unmapped_row.addStretch()
        table_layout.addLayout(unmapped_row)

        helper_table = QLabel("Symbol names are case-sensitive.")
        helper_table.setStyleSheet("color: #666666; font-size: 8pt;")
        table_layout.addWidget(helper_table)

        root_layout.addWidget(table_group)

        # Initial sync
        self._refresh_table()

    # ── Actions ─────────────────────────────────────────────────

    def _load_preset(self):
        master_broker = self.combo_master_broker.currentText()
        my_broker = self.combo_my_broker.currentText()

        if master_broker not in BROKER_PRESETS or my_broker not in BROKER_PRESETS:
            print("[SYMBOL] Select valid brokers for both master and your broker")
            return

        added = 0
        for standard_sym, master_broker_sym in BROKER_PRESETS[master_broker].items():
            if master_broker_sym not in self.state.symbol_map:
                slave_sym = BROKER_PRESETS[my_broker].get(standard_sym, master_broker_sym)
                self.state.symbol_map[master_broker_sym] = slave_sym
                added += 1

        self._refresh_table()
        print(f"[SYMBOL] Loaded {added} mappings: {master_broker} -> {my_broker}")

    def _add_mapping(self):
        master = self.input_master_sym.text().strip()
        slave = self.input_slave_sym.text().strip()
        if not master or not slave:
            return
        if master in self.state.symbol_map:
            self.lbl_inline_status.setText("Already mapped \u2014 remove first")
            self.lbl_inline_status.setVisible(True)
            return
        self.lbl_inline_status.setVisible(False)
        self.state.symbol_map[master] = slave
        self._refresh_table()
        self.input_master_sym.clear()
        self.input_slave_sym.clear()
        print(f"[SYMBOL] Added mapping: {master} -> {slave} | map: {self.state.symbol_map}")

    def _remove_mapping(self, master_sym):
        if master_sym in self.state.symbol_map:
            del self.state.symbol_map[master_sym]
            self._refresh_table()
            print(f"[SYMBOL] Removed mapping: {master_sym} | map: {self.state.symbol_map}")

    def _on_unmapped_changed(self, index):
        if index == 1:
            self.state.unmapped_symbol_behavior = 'COPY_AS_IS'
            print("[SYMBOL] Unmapped symbols: copy as-is")
        else:
            self.state.unmapped_symbol_behavior = 'IGNORE'
            print("[SYMBOL] Unmapped symbols: ignore")

    def _refresh_table(self):
        self.table_symbol_map.setRowCount(0)
        for master_sym, slave_sym in self.state.symbol_map.items():
            row = self.table_symbol_map.rowCount()
            self.table_symbol_map.insertRow(row)
            self.table_symbol_map.setRowHeight(row, 28)

            master_item = QTableWidgetItem(master_sym)
            master_item.setTextAlignment(Qt.AlignCenter)
            self.table_symbol_map.setItem(row, 0, master_item)

            slave_item = QTableWidgetItem(slave_sym)
            slave_item.setTextAlignment(Qt.AlignCenter)
            self.table_symbol_map.setItem(row, 1, slave_item)

            btn_remove = QPushButton("Remove")
            btn_remove.setObjectName(f"btn_remove_{row}")
            btn_remove.setStyleSheet(
                "background: #1a0a0a; border: 1px solid #2a2a2a; "
                "color: #888888; padding: 3px 8px; font-size: 8pt;"
            )
            btn_remove.clicked.connect(
                lambda checked, sym=master_sym: self._remove_mapping(sym)
            )
            self.table_symbol_map.setCellWidget(row, 2, btn_remove)

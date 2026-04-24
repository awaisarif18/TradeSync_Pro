from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGroupBox,
    QLabel, QLineEdit, QPushButton, QDoubleSpinBox, QSpinBox,
    QListWidget, QFrame
)
from PySide6.QtCore import Qt
from colorama import Fore, Style
from models.app_state import AppState


class RiskPanel(QWidget):
    def __init__(self, state: AppState, parent=None):
        super().__init__(parent)
        self.state = state
        self._build_ui()

    def _build_ui(self):
        root_layout = QVBoxLayout(self)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(6)

        # ── Section 0: Equity Protection ────────────────────────
        equity_group = QGroupBox("EQUITY PROTECTION")
        equity_layout = QVBoxLayout(equity_group)

        equity_row = QHBoxLayout()
        equity_row.addWidget(QLabel("Stop copying if account equity drops below:"))

        self.spin_equity_floor = QDoubleSpinBox()
        self.spin_equity_floor.setObjectName("spin_equity_floor")
        self.spin_equity_floor.setRange(0.00, 1000000.00)
        self.spin_equity_floor.setSingleStep(100.00)
        self.spin_equity_floor.setDecimals(2)
        self.spin_equity_floor.setSpecialValueText("Disabled (0.00)")
        self.spin_equity_floor.setValue(self.state.equity_floor)
        self.spin_equity_floor.valueChanged.connect(self._on_equity_floor_changed)
        equity_row.addWidget(self.spin_equity_floor)
        equity_row.addWidget(QLabel("$"))
        equity_row.addStretch()
        equity_layout.addLayout(equity_row)

        helper_eq = QLabel("Slave MT5 account equity is checked before each OPEN.")
        helper_eq.setStyleSheet("color: #666666; font-size: 8pt;")
        equity_layout.addWidget(helper_eq)

        root_layout.addWidget(equity_group)

        # ── Section 1: Trade Volume & Limits ────────────────────
        vol_group = QGroupBox("TRADE VOLUME & LIMITS")
        vol_layout = QVBoxLayout(vol_group)

        # Row 1: Max Lot Size
        lot_row = QHBoxLayout()
        lot_row.addWidget(QLabel("Max lot size per trade:"))

        self.spin_max_lot = QDoubleSpinBox()
        self.spin_max_lot.setObjectName("spin_max_lot")
        self.spin_max_lot.setRange(0.00, 100.00)
        self.spin_max_lot.setSingleStep(0.01)
        self.spin_max_lot.setDecimals(2)
        self.spin_max_lot.setSpecialValueText("Disabled (0.00)")
        self.spin_max_lot.setValue(self.state.max_lot_size)
        self.spin_max_lot.valueChanged.connect(self._on_max_lot_changed)
        lot_row.addWidget(self.spin_max_lot)
        lot_row.addWidget(QLabel("lots"))
        lot_row.addStretch()
        vol_layout.addLayout(lot_row)

        # Row 2: Max Concurrent
        concurrent_row = QHBoxLayout()
        concurrent_row.addWidget(QLabel("Max simultaneous trades:"))

        self.spin_max_concurrent = QSpinBox()
        self.spin_max_concurrent.setObjectName("spin_max_concurrent")
        self.spin_max_concurrent.setRange(0, 50)
        self.spin_max_concurrent.setSingleStep(1)
        self.spin_max_concurrent.setSpecialValueText("Disabled (0)")
        self.spin_max_concurrent.setValue(self.state.max_concurrent_trades)
        self.spin_max_concurrent.valueChanged.connect(self._on_max_concurrent_changed)
        concurrent_row.addWidget(self.spin_max_concurrent)
        concurrent_row.addWidget(QLabel("trades"))
        concurrent_row.addStretch()
        vol_layout.addLayout(concurrent_row)

        root_layout.addWidget(vol_group)

        # ── Section 2: Daily Loss Protection ────────────────────
        loss_group = QGroupBox("DAILY LOSS PROTECTION")
        loss_layout = QVBoxLayout(loss_group)

        # Status display row
        status_row = QHBoxLayout()
        status_row.addWidget(QLabel("Today's P&&L:"))

        self.lbl_daily_pnl = QLabel("$0.00")
        self.lbl_daily_pnl.setObjectName("lbl_daily_pnl")
        self.lbl_daily_pnl.setStyleSheet(
            "color: #00d4aa; font-family: Consolas; font-weight: bold;"
        )
        status_row.addWidget(self.lbl_daily_pnl)

        status_row.addSpacing(24)
        status_row.addWidget(QLabel("Status:"))

        self.lbl_copy_status = QLabel("●  Active")
        self.lbl_copy_status.setObjectName("lbl_copy_status")
        self.lbl_copy_status.setStyleSheet(
            "color: #00d4aa; font-family: Consolas; font-weight: bold;"
        )
        status_row.addWidget(self.lbl_copy_status)
        status_row.addStretch()
        loss_layout.addLayout(status_row)

        # Limit setting row
        limit_row = QHBoxLayout()
        limit_row.addWidget(QLabel("Pause copying if loss exceeds:"))

        self.spin_daily_loss = QDoubleSpinBox()
        self.spin_daily_loss.setObjectName("spin_daily_loss")
        self.spin_daily_loss.setRange(0.00, 100000.00)
        self.spin_daily_loss.setSingleStep(10.00)
        self.spin_daily_loss.setDecimals(2)
        self.spin_daily_loss.setSpecialValueText("Disabled (0.00)")
        self.spin_daily_loss.setValue(self.state.daily_loss_limit)
        self.spin_daily_loss.valueChanged.connect(self._on_daily_loss_changed)
        limit_row.addWidget(self.spin_daily_loss)
        limit_row.addWidget(QLabel("$"))
        limit_row.addStretch()
        loss_layout.addLayout(limit_row)

        # Warning frame (hidden by default)
        self.frame_warning = QFrame()
        self.frame_warning.setObjectName("frame_warning")
        self.frame_warning.setStyleSheet(
            "QFrame#frame_warning { background: #1a0a0a; "
            "border: 1px solid #ff4444; border-radius: 2px; padding: 8px; }"
        )
        warning_layout = QVBoxLayout(self.frame_warning)

        warning_label = QLabel("⚠  Copying paused — daily loss limit reached")
        warning_label.setStyleSheet("color: #ff4444; font-weight: bold;")
        warning_layout.addWidget(warning_label)

        self.btn_reset = QPushButton("↺  Reset & Resume Copying")
        self.btn_reset.setObjectName("btn_reset")
        self.btn_reset.setStyleSheet(
            "background: #0a1a0a; border: 1px solid #00d4aa; color: #00d4aa; "
            "padding: 6px 16px; border-radius: 2px; font-weight: bold;"
        )
        self.btn_reset.clicked.connect(self._on_reset_clicked)
        warning_layout.addWidget(self.btn_reset)

        self.frame_warning.setVisible(False)
        loss_layout.addWidget(self.frame_warning)

        root_layout.addWidget(loss_group)

        # ── Section 3: Symbol Whitelist ─────────────────────────
        wl_group = QGroupBox("SYMBOL COPY FILTER (WHITELIST)")
        wl_layout = QVBoxLayout(wl_group)

        helper_wl = QLabel(
            "When active, only symbols in this list will be copied. "
            "Leave empty to copy all mapped symbols. "
            "Use your broker's symbol names (slave-side)."
        )
        helper_wl.setWordWrap(True)
        helper_wl.setStyleSheet("color: #666666; font-size: 8pt;")
        wl_layout.addWidget(helper_wl)

        # Add row
        add_row = QHBoxLayout()
        self.input_wl_sym = QLineEdit()
        self.input_wl_sym.setObjectName("input_wl_sym")
        self.input_wl_sym.setPlaceholderText("Your symbol  e.g. XAUUSD")
        add_row.addWidget(self.input_wl_sym)

        btn_add_wl = QPushButton("Add to Whitelist")
        btn_add_wl.clicked.connect(self._add_whitelist)
        add_row.addWidget(btn_add_wl)
        wl_layout.addLayout(add_row)

        self.list_whitelist = QListWidget()
        self.list_whitelist.setObjectName("list_whitelist")
        self.list_whitelist.itemDoubleClicked.connect(self._remove_whitelist)
        wl_layout.addWidget(self.list_whitelist)

        info_wl = QLabel("Double-click a symbol to remove it from the whitelist.")
        info_wl.setStyleSheet("color: #666666; font-size: 8pt;")
        wl_layout.addWidget(info_wl)

        root_layout.addWidget(wl_group)
        root_layout.addStretch()

        # Initial sync
        self._refresh_whitelist()

    # ── Slot handlers ───────────────────────────────────────────

    def _on_equity_floor_changed(self, value):
        self.state.equity_floor = value
        print(Fore.CYAN + f"[RISK] equity_floor → {value}" + Style.RESET_ALL)

    def _on_max_lot_changed(self, value):
        self.state.max_lot_size = value
        print(Fore.CYAN + f"[RISK] max_lot_size → {value}" + Style.RESET_ALL)

    def _on_max_concurrent_changed(self, value):
        self.state.max_concurrent_trades = value
        print(Fore.CYAN + f"[RISK] max_concurrent → {value}" + Style.RESET_ALL)

    def _on_daily_loss_changed(self, value):
        self.state.daily_loss_limit = value
        print(Fore.CYAN + f"[RISK] daily_loss_limit → {value}" + Style.RESET_ALL)

    def _on_reset_clicked(self):
        self.state.reset_daily_stats()
        self.refresh_display()

    def _add_whitelist(self):
        sym = self.input_wl_sym.text().strip()
        if sym and sym not in self.state.symbol_whitelist:
            self.state.symbol_whitelist.append(sym)
            self._refresh_whitelist()
            self.input_wl_sym.clear()
            print(Fore.CYAN + f"[RISK] Whitelist add: {sym} → {self.state.symbol_whitelist}" + Style.RESET_ALL)

    def _remove_whitelist(self, item):
        sym = item.text()
        if sym in self.state.symbol_whitelist:
            self.state.symbol_whitelist.remove(sym)
        self._refresh_whitelist()
        print(Fore.CYAN + f"[RISK] Whitelist remove: {sym} → {self.state.symbol_whitelist}" + Style.RESET_ALL)

    def _refresh_whitelist(self):
        self.list_whitelist.clear()
        for sym in self.state.symbol_whitelist:
            self.list_whitelist.addItem(sym)

    def refresh_display(self):
        """Public method called by SlaveWindow.update_ui() to sync display."""
        pnl = self.state.daily_pnl
        color = "#00d4aa" if pnl >= 0 else "#ff4444"
        self.lbl_daily_pnl.setText(f"${pnl:.2f}")
        self.lbl_daily_pnl.setStyleSheet(
            f"color: {color}; font-family: Consolas; font-weight: bold;"
        )

        paused = self.state.copying_paused_by_loss
        self.frame_warning.setVisible(paused)
        if paused:
            self.lbl_copy_status.setText("●  Paused")
            self.lbl_copy_status.setStyleSheet(
                "color: #ff4444; font-family: Consolas; font-weight: bold;"
            )
        else:
            self.lbl_copy_status.setText("●  Active")
            self.lbl_copy_status.setStyleSheet(
                "color: #00d4aa; font-family: Consolas; font-weight: bold;"
            )

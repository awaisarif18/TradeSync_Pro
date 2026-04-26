class SlaveState:
    def __init__(self):
        # Slave Specific
        self.risk_multiplier = 1.0
        self.symbol_map = {}  # Format: {"GOLD": "XAUUSD", "EURUSD": "EURUSD.m"}

        # Risk Management Settings
        self.max_lot_size: float = 0.0
        # Cap on computed copy volume. 0.0 = disabled.

        self.max_concurrent_trades: int = 0
        # Max simultaneous copied positions. 0 = disabled.

        self.daily_loss_limit: float = 0.0
        # Auto-pause copying if daily_pnl <= -this value. 0.0 = disabled.

        self.daily_pnl: float = 0.0
        # Accumulated PnL from CLOSE signals today.

        self.copying_paused_by_loss: bool = False
        # Set True when daily_loss_limit is hit. Reset via reset_daily_stats().

        self.symbol_whitelist: list = []
        # If non-empty, only copy slave symbols in this list.
        # Uses slave symbol (after mapping), not master symbol.

        # Copy Mode
        self.copy_mode: str = 'MULTIPLIER'
        # Values: 'MULTIPLIER' | 'FIXED_LOT'
        # MULTIPLIER: copy_volume = master_volume * risk_multiplier (existing)
        # FIXED_LOT: copy_volume = fixed_lot_size regardless of master volume

        self.fixed_lot_size: float = 0.01
        # Used only when copy_mode == 'FIXED_LOT'

        self.reverse_copy: bool = False
        # If True: flip BUY -> SELL and SELL -> BUY before execution

        self.slippage_points: int = 10
        # Maximum deviation in points for order execution
        # Passed as 'deviation' parameter to MT5 order requests

        self.unmapped_symbol_behavior: str = 'IGNORE'
        # Values: 'IGNORE' | 'COPY_AS_IS'
        # IGNORE: skip trades for unmapped symbols (current default)
        # COPY_AS_IS: use master symbol name directly as slave symbol

        # Equity Protection
        self.equity_floor: float = 0.0
        # If > 0, check mt5.account_info().equity before each OPEN
        # If equity < equity_floor, block the trade

        # Session Tracking
        self.session_start_time: str = ''
        # Set to current time string when listening starts

        self.session_pnl: float = 0.0
        # PnL accumulated since listening started this session

        self.open_trades: list = []
        # List of dicts tracking currently open copied trades:
        # { master_ticket, slave_ticket, symbol, action, volume, open_time }

        self.closed_trades: list = []
        # List of dicts for trades closed this session:
        # { master_ticket, slave_ticket, symbol, action, volume, pnl,
        #   open_time, close_time }
        # Capped at 50 entries (drop oldest when full)

    def reset_daily_stats(self):
        """Reset daily PnL counter and unpause copying."""
        self.daily_pnl = 0.0
        self.copying_paused_by_loss = False
        self.add_log("[RISK] Daily stats reset. Copying resumed.")
        print(f"[RISK] Daily stats reset by user.")

    def start_session(self):
        """Called when listening starts. Records session start time."""
        from datetime import datetime
        self.session_start_time = datetime.now().strftime('%H:%M:%S')
        self.session_pnl = 0.0
        self.open_trades = []
        self.closed_trades = []
        self.add_log(f"[SESSION] Session started at {self.session_start_time}")
        print(f"[SESSION] Session started at {self.session_start_time}")

    def add_open_trade(self, master_ticket, slave_ticket, symbol, action, volume):
        """Record a newly opened copied trade."""
        from datetime import datetime
        entry = {
            'master_ticket': master_ticket,
            'slave_ticket': slave_ticket,
            'symbol': symbol,
            'action': action,
            'volume': volume,
            'open_time': datetime.now().strftime('%H:%M:%S')
        }
        self.open_trades.append(entry)

    def close_trade_record(self, master_ticket, pnl: float):
        """Move a trade from open_trades to closed_trades."""
        from datetime import datetime
        trade = next((t for t in self.open_trades
                      if t['master_ticket'] == master_ticket), None)
        if trade:
            self.open_trades.remove(trade)
            closed = {**trade, 'pnl': pnl,
                      'close_time': datetime.now().strftime('%H:%M:%S')}
            self.closed_trades.append(closed)
            if len(self.closed_trades) > 50:
                self.closed_trades.pop(0)
            self.session_pnl = round(self.session_pnl + pnl, 2)

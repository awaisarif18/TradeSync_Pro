import MetaTrader5 as mt5

class MT5Adapter:
    def __init__(self):
        self.connected = False
        # Standard paths for common brokers (User can customize in code if needed)
        self.broker_paths = {
            "XM": r"C:\Program Files\XM Global MT5\terminal64.exe",
            "Vantage": r"C:\Program Files\Vantage International MT5\terminal64.exe",
            "Exness": r"C:\Program Files\Exness MetaTrader 5\terminal64.exe"
        }

    def connect(self, broker_name, login, password, server):
        """
        Connects to MT5 and strictly logs in using the provided server name.
        """
        target_path = self.broker_paths.get(broker_name)
        
        # 1. Initialize
        if target_path:
            initialized = mt5.initialize(path=target_path)
        else:
            initialized = mt5.initialize()

        if not initialized:
            error = mt5.last_error()
            return False, f"Init Failed: {error}"

        # 2. Strict Login with Server
        authorized = mt5.login(login=int(login), password=password, server=server)
        
        if authorized:
            info = mt5.account_info()
            self.connected = True
            return True, f"Connected: {info.name} ({info.server})"
        else:
            error = mt5.last_error()
            return False, f"Auth Failed: {error}"
        
    def execute_trade(self, symbol, action, volume):
        if not self.connected: return None
        
        # Ensure symbol is selected in Market Watch
        mt5.symbol_select(symbol, True)
        
        # Get current price
        tick = mt5.symbol_info_tick(symbol)
        if not tick: return None

        order_type = mt5.ORDER_TYPE_BUY if action.upper() == "BUY" else mt5.ORDER_TYPE_SELL
        price = tick.ask if order_type == mt5.ORDER_TYPE_BUY else tick.bid

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": float(volume),
            "type": order_type,
            "price": price,
            "magic": 234000,
            "comment": "TradeSync Copy",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        result = mt5.order_send(request)
        return result

    def close_trade(self, ticket, symbol):
        """Closes a specific position by ticket number."""
        position = mt5.positions_get(ticket=ticket)
        if not position: return None
        
        pos = position[0]
        # Opposite action to close: if was BUY (0), we need to SELL (1)
        order_type = mt5.ORDER_TYPE_SELL if pos.type == 0 else mt5.ORDER_TYPE_BUY
        
        # Ensure symbol is selected
        mt5.symbol_select(symbol, True)
        tick = mt5.symbol_info_tick(symbol)
        if not tick: return None
        
        price = tick.bid if pos.type == 0 else tick.ask

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": pos.volume,
            "type": order_type,
            "position": ticket,
            "price": price,
            "deviation": 20,
            "magic": 234000,
            "comment": "TradeSync Close",
            "type_time": mt5.ORDER_TIME_GTC,         # RESTORED
            "type_filling": mt5.ORDER_FILLING_IOC,   # RESTORED
        }

        result = mt5.order_send(request)
        return result
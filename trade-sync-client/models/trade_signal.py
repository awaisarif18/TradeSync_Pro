class TradeSignal:
    def __init__(self, symbol, action, volume):
        self.symbol = symbol
        self.action = action
        self.volume = volume

    def to_dict(self):
        return {
            "symbol": self.symbol, 
            "action": self.action, 
            "volume": self.volume
        }
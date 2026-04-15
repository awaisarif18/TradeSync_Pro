import time
import MetaTrader5 as mt5
from controllers.socket_manager import SocketManager
from controllers.mt5_adapter import MT5Adapter
from colorama import init, Fore

init(autoreset=True)

class SlaveController:
    def __init__(self, mt5_adapter):
        self.mt5 = mt5_adapter
        self.ticket_map = {}
        self.allowed_symbols = ["EURUSD", "GBPUSD", "GOLD", "XAUUSD"]

    def on_signal(self, data):
        event = data.get('event')
        m_ticket = data.get('master_ticket')
        symbol = data.get('symbol', '').upper()

        if any(s in symbol for s in self.allowed_symbols):
            if event == "OPEN":
                res = self.mt5.execute_trade(symbol, data['action'], data['volume'])
                if res and res.retcode == mt5.TRADE_RETCODE_DONE:
                    self.ticket_map[m_ticket] = res.order
                    print(f"{Fore.GREEN}Mapped: Master {m_ticket} -> Slave {res.order}")
            elif event == "CLOSE":
                s_ticket = self.ticket_map.get(m_ticket)
                if s_ticket:
                    print(f"{Fore.RED}Closing Slave Ticket {s_ticket}...")
                    self.mt5.close_trade(s_ticket, symbol)
                    del self.ticket_map[m_ticket]
        else:
            print(f"{Fore.YELLOW}Signal Blocked: {symbol} not in allowed list.")

def main():
    choice = input("Connect SLAVE to which broker? (X for XM, V for Vantage): ")
    mt5_s = MT5Adapter()
    if not mt5_s.connect(choice): return

    slave = SlaveController(mt5_s)
    client = SocketManager('http://localhost:3000', mt5_s)
    
    # ONLY the Slave registers the trade execution listener
    client.sio.on('trade_execution', slave.on_signal)
    
    client.connect()
    print("Slave Ready...")
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        mt5.shutdown()

if __name__ == "__main__":
    main()
import time
import MetaTrader5 as mt5
from uuid import uuid4
from controllers.socket_manager import SocketManager
from controllers.mt5_adapter import MT5Adapter
from colorama import init, Fore

init(autoreset=True)

class MasterRecorder:
    def __init__(self, socket_client):
        self.client = socket_client
        self.tracked_tickets = {} 
        self.is_running = True
        self.magic_number = 234000 

    def get_active_positions(self):
        positions = mt5.positions_get()
        return {pos.ticket: pos for pos in positions} if positions else {}

    def start_monitoring(self):
        print(f"{Fore.CYAN}Master Recorder: Monitoring for Open/Close events...")
        initial = self.get_active_positions()
        for t, pos in initial.items():
            if pos.magic != self.magic_number:
                self.tracked_tickets[t] = pos.symbol
        
        while self.is_running:
            current = self.get_active_positions()
            current_tickets = set(current.keys())
            known_tickets = set(self.tracked_tickets.keys())

            for t in (current_tickets - known_tickets):
                pos = current[t]
                if pos.magic != self.magic_number:
                    self.tracked_tickets[t] = pos.symbol
                    self.broadcast_event("OPEN", pos=pos)

            for t in (known_tickets - current_tickets):
                symbol = self.tracked_tickets[t]
                
                # --- NEW: PnL CAPTURE LOGIC ---
                pnl = 0.0
                # Fetch the history of deals associated with this specific ticket
                deals = mt5.history_deals_get(position=t)
                if deals:
                    for deal in deals:
                        # deal.profit contains actual profit/loss including commissions
                        pnl += deal.profit
                # ------------------------------

                # Pass the calculated PnL to the broadcast event
                self.broadcast_event("CLOSE", ticket=t, symbol=symbol, pnl=pnl)
                del self.tracked_tickets[t]

            time.sleep(0.5)

    # Updated to accept pnl (defaulting to 0.0 for OPEN events)
    def broadcast_event(self, event_type, pos=None, ticket=None, symbol=None, pnl=0.0):
        trace_id = str(uuid4())
        data = {
            "event": event_type,
            "master_ticket": pos.ticket if pos else ticket,
            "symbol": pos.symbol if pos else symbol,
            "action": ("BUY" if pos.type == 0 else "SELL") if pos else "CLOSE",
            "volume": pos.volume if pos else 0,
            "pnl": round(pnl, 2), # NEW: Include PnL in the WebSocket payload
            "trace_id": trace_id,
        }
        
        # Log it to the terminal so you can verify it's working
        if event_type == "CLOSE":
            print(f"{Fore.GREEN}>>> MASTER BROADCAST: {event_type} | {data['symbol']} | PnL: ${data['pnl']} | trace_id={trace_id}")
        else:
            print(f"{Fore.GREEN}>>> MASTER BROADCAST: {event_type} | {data['symbol']} | trace_id={trace_id}")
            
        # Support both CLI and GUI socket managers
        if hasattr(self.client, 'emit_signal'):
            self.client.emit_signal(data)
        else:
            self.client.sio.emit('test_signal', data)

# (We keep your main block just in case you ever want to run it via CLI again)
def main():
    choice = input("Connect MASTER to which broker? (X for XM, V for Vantage): ")
    mt5_master = MT5Adapter()
    if not mt5_master.connect(choice): return

    client = SocketManager('http://localhost:3000', mt5_master)
    client.connect()
    
    time.sleep(1)
    recorder = MasterRecorder(client)
    try:
        recorder.start_monitoring()
    except KeyboardInterrupt:
        print(f"\n{Fore.RED}Stopping Master Recorder...")
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    main()
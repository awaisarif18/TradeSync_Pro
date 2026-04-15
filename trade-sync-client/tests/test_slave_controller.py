import os
import sys
import unittest
from types import SimpleNamespace

# Make project imports work when running from trade-sync-client root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from controllers.ui_controllers.slave_controller import SlaveController


class FakeMT5:
    def __init__(self):
        self.execute_calls = []
        self.close_calls = []

    def execute_trade(self, symbol, action, volume):
        self.execute_calls.append((symbol, action, volume))
        return SimpleNamespace(retcode=10009, order=555, comment='ok')

    def close_trade(self, ticket, symbol):
        self.close_calls.append((ticket, symbol))
        return SimpleNamespace(retcode=10009, comment='ok')


class SlaveControllerContractTests(unittest.TestCase):
    def setUp(self):
        self.controller = SlaveController(update_callback=lambda: None)
        self.controller.mt5 = FakeMT5()
        self.controller.state.is_running = True

    def test_open_maps_master_ticket_to_slave_ticket(self):
        payload = {
            'event': 'OPEN',
            'master_ticket': 1001,
            'symbol': 'XAUUSD',
            'action': 'BUY',
            'volume': 0.10,
            'trace_id': 'trace-open-1',
        }

        self.controller.on_trade_signal(payload)

        self.assertEqual(self.controller.ticket_map[1001], 555)
        self.assertEqual(len(self.controller.mt5.execute_calls), 1)

    def test_close_uses_ticket_map_and_removes_mapping(self):
        self.controller.ticket_map[1001] = 555
        payload = {
            'event': 'CLOSE',
            'master_ticket': 1001,
            'symbol': 'XAUUSD',
            'action': 'CLOSE',
            'volume': 0,
            'trace_id': 'trace-close-1',
        }

        self.controller.on_trade_signal(payload)

        self.assertEqual(len(self.controller.mt5.close_calls), 1)
        self.assertNotIn(1001, self.controller.ticket_map)


if __name__ == '__main__':
    unittest.main()

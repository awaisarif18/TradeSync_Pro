import os
import sys
import unittest
from types import SimpleNamespace

# Make project imports work when running from trade-sync-client root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from controllers.ui_controllers.slave_controller import SlaveController


class FakeMT5:
    def __init__(self, point=0.01, execution_price=2000.0):
        self.execute_calls = []
        self.close_calls = []
        # Configurable price simulation for the slippage guard.
        self._point = point
        self._execution_price = execution_price

    def execute_trade(self, symbol, action, volume, deviation=10):
        self.execute_calls.append((symbol, action, volume, deviation))
        return SimpleNamespace(retcode=10009, order=555, comment='ok')

    def close_trade(self, ticket, symbol):
        self.close_calls.append((ticket, symbol))
        return SimpleNamespace(retcode=10009, comment='ok')

    def get_symbol_point(self, symbol):
        return self._point

    def get_execution_price(self, symbol, action):
        return self._execution_price


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

    def test_open_blocked_when_slippage_exceeds_threshold(self):
        # point=0.01; master 2000.0 vs copier 2002.0 => drift 200 pts > max 10
        self.controller.mt5 = FakeMT5(point=0.01, execution_price=2002.0)
        self.controller.state.max_slippage_points = 10.0
        payload = {
            'event': 'OPEN',
            'master_ticket': 2001,
            'symbol': 'XAUUSD',
            'action': 'BUY',
            'volume': 0.10,
            'masterPrice': 2000.0,
            'trace_id': 'trace-slip-block',
        }

        self.controller.on_trade_signal(payload)

        self.assertEqual(len(self.controller.mt5.execute_calls), 0)
        self.assertNotIn(2001, self.controller.ticket_map)

    def test_open_allowed_when_slippage_within_threshold(self):
        # point=0.01; master 2000.0 vs copier 2000.05 => drift 5 pts <= max 10
        self.controller.mt5 = FakeMT5(point=0.01, execution_price=2000.05)
        self.controller.state.max_slippage_points = 10.0
        payload = {
            'event': 'OPEN',
            'master_ticket': 2002,
            'symbol': 'XAUUSD',
            'action': 'BUY',
            'volume': 0.10,
            'masterPrice': 2000.0,
            'trace_id': 'trace-slip-allow',
        }

        self.controller.on_trade_signal(payload)

        self.assertEqual(len(self.controller.mt5.execute_calls), 1)
        self.assertEqual(self.controller.ticket_map[2002], 555)

    def test_open_executes_when_master_price_missing(self):
        # No masterPrice in payload -> guard skips and trade proceeds.
        self.controller.mt5 = FakeMT5(point=0.01, execution_price=2002.0)
        self.controller.state.max_slippage_points = 10.0
        payload = {
            'event': 'OPEN',
            'master_ticket': 2003,
            'symbol': 'XAUUSD',
            'action': 'BUY',
            'volume': 0.10,
            'trace_id': 'trace-slip-missing',
        }

        self.controller.on_trade_signal(payload)

        self.assertEqual(len(self.controller.mt5.execute_calls), 1)
        self.assertEqual(self.controller.ticket_map[2003], 555)


if __name__ == '__main__':
    unittest.main()

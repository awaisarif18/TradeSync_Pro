class MasterState:
    def __init__(self):
        # Master Subscriber State
        self.subscribers: list = []
        # List of dicts from GET /auth/masters/:id/subscribers:
        # { id, fullName, email, isActive, totalCopied, totalPnL }
        # Loaded once on dashboard open, refreshed on demand

        self.subscriber_online_status: dict = {}
        # Dict: { email: bool } - True = currently online
        # Updated by subscriber_update WebSocket events

        self.master_user_id: str = ''
        # Set after successful verify-node, used for subscriber API calls

        # Master Session Stats
        self.signals_sent: int = 0
        # Incremented each time a test_signal is emitted

        self.session_start_time_master: str = ''
        # Set when broadcasting starts

        self.recent_signals: list = []
        # List of { time, symbol, action, volume } - last 20 signals emitted
        # Populated by the master socket wrapper when emitting test_signal

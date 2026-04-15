from PySide6.QtCore import QObject, Signal

class UIBridge(QObject):
    """
    Provides a thread-safe boundary between background worker threads 
    (Socket.io, MT5 loops) and the PySide6 main event loop.
    """
    ui_update_requested = Signal()

    def request_update(self):
        """
        Invoked by the Controller from any background thread.
        Emits a Qt Signal that is safely processed by the main thread.
        """
        self.ui_update_requested.emit()
import sys
from PySide6.QtWidgets import QApplication
from views.qt.master_window import MasterWindow

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MasterWindow()
    window.show()
    sys.exit(app.exec())
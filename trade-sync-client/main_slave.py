import sys
from PySide6.QtWidgets import QApplication
from views.qt.slave_window import SlaveWindow

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = SlaveWindow()
    window.show()
    sys.exit(app.exec())
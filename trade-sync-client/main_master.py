import sys
from PySide6.QtWidgets import QApplication
from views.qt.master_window import MasterWindow
from views.qt.theme import load_fonts

if __name__ == "__main__":
    app = QApplication(sys.argv)
    load_fonts()
    window = MasterWindow()
    window.show()
    sys.exit(app.exec())
import sys
from PySide6.QtWidgets import QApplication
from views.qt.slave_window import SlaveWindow
from views.qt.theme import apply_app_font, load_fonts

if __name__ == "__main__":
    app = QApplication(sys.argv)
    load_fonts()
    apply_app_font(app)
    window = SlaveWindow()
    window.show()
    sys.exit(app.exec())
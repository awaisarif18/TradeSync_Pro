import customtkinter as ctk
from controllers.ui_controllers.slave_controller import SlaveController

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("green")

class SlaveUI(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("TradeSync Pro - Slave")
        self.geometry("1000x700")

        self.controller = SlaveController(self.update_ui)
        
        # --- VIEW MANAGER ---
        self.login_frame = ctk.CTkFrame(self)
        self.dashboard_frame = ctk.CTkFrame(self)
        
        self.show_login()

    def show_login(self):
        self.dashboard_frame.pack_forget()
        self.login_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        for widget in self.login_frame.winfo_children(): widget.destroy()

        ctk.CTkLabel(self.login_frame, text="SLAVE LOGIN", font=("Arial", 24, "bold")).pack(pady=30)
        
        self.entry_login = ctk.CTkEntry(self.login_frame, placeholder_text="MT5 Login ID")
        self.entry_login.pack(pady=10)
        
        self.entry_pass = ctk.CTkEntry(self.login_frame, placeholder_text="MT5 Password", show="*")
        self.entry_pass.pack(pady=10)

        # --- NEW: Server Name Input ---
        self.entry_server = ctk.CTkEntry(self.login_frame, placeholder_text="Server (e.g., XMGlobal-MT5 2)")
        self.entry_server.pack(pady=10)

        self.combo_broker = ctk.CTkOptionMenu(self.login_frame, values=["XM", "Vantage", "Exness"])
        self.combo_broker.pack(pady=10)
        
        self.entry_license = ctk.CTkEntry(self.login_frame, placeholder_text="TSP Registered Email")
        self.entry_license.pack(pady=10)

        ctk.CTkButton(self.login_frame, text="Login & Connect", command=self.on_login_submit).pack(pady=20)
        self.lbl_login_msg = ctk.CTkLabel(self.login_frame, text="", text_color="red")
        self.lbl_login_msg.pack()

    def show_dashboard(self):
        self.login_frame.pack_forget()
        self.dashboard_frame.pack(fill="both", expand=True)
        self.build_dashboard()

    def on_login_submit(self):
        login = self.entry_login.get()
        pwd = self.entry_pass.get()
        server = self.entry_server.get() # Get server string
        broker = self.combo_broker.get()
        lic = self.entry_license.get()
        
        if not login or not pwd or not server:
            self.lbl_login_msg.configure(text="Please enter ID, Password, and Server", text_color="red")
            return

        self.lbl_login_msg.configure(text="Connecting...", text_color="yellow")
        self.update() 
        
        # Pass server to controller
        if self.controller.login_mt5(broker, login, pwd, server, lic):
            self.show_dashboard()
        else:
            last_log = self.controller.state.logs[-1] if self.controller.state.logs else "Connection Failed"
            self.lbl_login_msg.configure(text=last_log, text_color="red")

    def build_dashboard(self):
        # ... (Previous Sidebar & Log logic) ...
        # Sidebar
        self.sidebar = ctk.CTkFrame(self.dashboard_frame, width=250, corner_radius=0)
        self.sidebar.pack(side="left", fill="y")
        
        ctk.CTkLabel(self.sidebar, text="CONTROLS", font=("Arial", 18, "bold")).pack(pady=20)

        # Risk
        ctk.CTkLabel(self.sidebar, text="Risk Multiplier").pack(pady=(10,0))
        self.slider = ctk.CTkSlider(self.sidebar, from_=0.1, to=5.0, command=self.on_risk_change)
        self.slider.pack(pady=5)
        self.lbl_risk = ctk.CTkLabel(self.sidebar, text="1.0x")
        self.lbl_risk.pack()

        # Symbol Mapping Section
        ctk.CTkLabel(self.sidebar, text="SYMBOL MAPPING").pack(pady=(30, 10))
        self.entry_master_sym = ctk.CTkEntry(self.sidebar, placeholder_text="Master (e.g. GOLD)", width=140)
        self.entry_master_sym.pack(pady=2)
        self.entry_slave_sym = ctk.CTkEntry(self.sidebar, placeholder_text="Slave (e.g. XAUUSD)", width=140)
        self.entry_slave_sym.pack(pady=2)
        ctk.CTkButton(self.sidebar, text="Add Map", width=140, command=self.on_add_map).pack(pady=10)
        
        # List of Maps
        self.map_list = ctk.CTkTextbox(self.sidebar, height=100, width=200)
        self.map_list.pack(pady=10)
        self.map_list.insert("0.0", "No mappings (Copy All)")
        self.map_list.configure(state="disabled")

        # Toggle
        self.btn_listen = ctk.CTkButton(self.sidebar, text="START LISTENING", fg_color="green", command=self.on_toggle)
        self.btn_listen.pack(side="bottom", pady=30)

        # Main Log Area
        self.log_box = ctk.CTkTextbox(self.dashboard_frame)
        self.log_box.pack(side="right", fill="both", expand=True, padx=10, pady=10)

    def on_add_map(self):
        m = self.entry_master_sym.get().upper()
        s = self.entry_slave_sym.get().upper()
        self.controller.add_symbol_mapping(m, s)
        self.refresh_map_list()

    def refresh_map_list(self):
        self.map_list.configure(state="normal")
        self.map_list.delete("0.0", "end")
        if not self.controller.state.symbol_map:
            self.map_list.insert("0.0", "No mappings (Copy All)")
        else:
            for m, s in self.controller.state.symbol_map.items():
                self.map_list.insert("end", f"{m} -> {s}\n")
        self.map_list.configure(state="disabled")

    def on_risk_change(self, val):
        self.controller.state.risk_multiplier = round(val, 2)
        self.lbl_risk.configure(text=f"{round(val, 2)}x")

    def on_toggle(self):
        self.controller.toggle_listening()
        if self.controller.state.is_running:
            self.btn_listen.configure(text="STOP", fg_color="red")
        else:
            self.btn_listen.configure(text="START LISTENING", fg_color="green")

    def update_ui(self):
        # Prevent crash by checking if log_box exists yet
        if hasattr(self, 'log_box'):
            self.log_box.configure(state="normal")
            self.log_box.delete("1.0", "end")
            for log in self.controller.state.logs:
                self.log_box.insert("end", log + "\n")
            self.log_box.see("end")
            self.log_box.configure(state="disabled")

    def run(self):
        self.mainloop()
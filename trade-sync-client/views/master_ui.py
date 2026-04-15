import customtkinter as ctk
from controllers.ui_controllers.master_controller import MasterController

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class MasterUI(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("TradeSync Pro - Master Node")
        self.geometry("900x600")

        self.controller = MasterController(self.update_ui)

        # --- VIEW MANAGER ---
        self.login_frame = ctk.CTkFrame(self)
        self.dashboard_frame = ctk.CTkFrame(self)
        
        self.show_login()

    def show_login(self):
        self.dashboard_frame.pack_forget()
        self.login_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        for widget in self.login_frame.winfo_children(): widget.destroy()

        ctk.CTkLabel(self.login_frame, text="MASTER LOGIN", font=ctk.CTkFont(size=24, weight="bold")).pack(pady=30)
        
        self.entry_login = ctk.CTkEntry(self.login_frame, placeholder_text="MT5 Login ID", width=250)
        self.entry_login.pack(pady=10)
        
        self.entry_pass = ctk.CTkEntry(self.login_frame, placeholder_text="MT5 Password", show="*", width=250)
        self.entry_pass.pack(pady=10)

        # --- NEW: Server Name Input ---
        self.entry_server = ctk.CTkEntry(self.login_frame, placeholder_text="Server (e.g., VantageInternational-Demo)", width=250)
        self.entry_server.pack(pady=10)

        self.combo_broker = ctk.CTkOptionMenu(self.login_frame, values=["Vantage", "XM", "Exness", "Auto-Detect"], width=250)
        self.combo_broker.pack(pady=10)
        
        self.entry_license = ctk.CTkEntry(self.login_frame, placeholder_text="License Key (Dummy)", width=250)
        self.entry_license.pack(pady=10)

        ctk.CTkButton(self.login_frame, text="Login & Connect", command=self.on_login_submit, width=250).pack(pady=20)
        
        self.lbl_login_msg = ctk.CTkLabel(self.login_frame, text="", text_color="red")
        self.lbl_login_msg.pack()

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

    def show_dashboard(self):
        self.login_frame.pack_forget()
        self.dashboard_frame.pack(fill="both", expand=True)
        self.build_dashboard()

    def build_dashboard(self):
        # Sidebar
        self.sidebar = ctk.CTkFrame(self.dashboard_frame, width=220, corner_radius=0)
        self.sidebar.pack(side="left", fill="y")
        
        ctk.CTkLabel(self.sidebar, text="MASTER CONSOLE", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=20)

        # Status Indicators
        self.lbl_mt5 = ctk.CTkLabel(self.sidebar, text="MT5: Connected", text_color="green")
        self.lbl_mt5.pack(pady=5)
        
        self.lbl_cloud = ctk.CTkLabel(self.sidebar, text="Cloud: Online", text_color="green")
        self.lbl_cloud.pack(pady=5)

        # Broadcast Toggle
        self.btn_broadcast = ctk.CTkButton(self.sidebar, text="Start Broadcasting", fg_color="green", command=self.on_toggle)
        self.btn_broadcast.pack(side="bottom", pady=30)

        # Main Log Area
        main_area = ctk.CTkFrame(self.dashboard_frame, fg_color="transparent")
        main_area.pack(side="right", fill="both", expand=True, padx=20, pady=20)
        
        ctk.CTkLabel(main_area, text="System Logs", anchor="w").pack(fill="x")
        self.log_box = ctk.CTkTextbox(main_area)
        self.log_box.pack(fill="both", expand=True, pady=10)
        self.log_box.configure(state="disabled")

    def on_toggle(self):
        self.controller.toggle_broadcasting()
        if self.controller.state.is_running:
            self.btn_broadcast.configure(text="STOP BROADCAST", fg_color="red")
        else:
            self.btn_broadcast.configure(text="Start Broadcasting", fg_color="green")

    def update_ui(self):
        # Only update logs if the dashboard is active
        if hasattr(self, 'log_box'):
            self.log_box.configure(state="normal")
            self.log_box.delete("1.0", "end")
            for log in self.controller.state.logs:
                self.log_box.insert("end", log + "\n")
            self.log_box.see("end")
            self.log_box.configure(state="disabled")

    def run(self):
        self.mainloop()
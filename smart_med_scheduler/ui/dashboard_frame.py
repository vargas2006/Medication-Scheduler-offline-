import customtkinter as ctk
from models.schedule import DoseAlert
from models.medication import InventoryManager
from models.history import ReportGenerator

class DashboardFrame(ctk.CTkFrame):
    def __init__(self, master, go_medications, go_history, do_logout):
        super().__init__(master)
        self.go_medications = go_medications
        self.go_history = go_history
        self.do_logout = do_logout
        
        self.dose_alert = DoseAlert()
        self.inventory_manager = InventoryManager()
        self.report_generator = ReportGenerator()
        self.current_user = None

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure((0, 1), weight=1)

        # Header
        self.header_frame = ctk.CTkFrame(self)
        self.header_frame.grid(row=0, column=0, columnspan=2, sticky="ew", padx=10, pady=10)
        
        self.welcome_label = ctk.CTkLabel(self.header_frame, text="Welcome", font=ctk.CTkFont(size=20, weight="bold"))
        self.welcome_label.pack(side="left", padx=10, pady=10)
        
        self.logout_btn = ctk.CTkButton(self.header_frame, text="Logout", width=80, command=self.do_logout)
        self.logout_btn.pack(side="right", padx=10, pady=10)

        # Due Medications Frame
        self.due_frame = ctk.CTkScrollableFrame(self, label_text="Due Medications")
        self.due_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)

        # Low Stock Alerts Frame
        self.stock_frame = ctk.CTkScrollableFrame(self, label_text="Inventory Alerts")
        self.stock_frame.grid(row=1, column=1, sticky="nsew", padx=10, pady=10)

        # Bottom Navigation
        self.nav_frame = ctk.CTkFrame(self)
        self.nav_frame.grid(row=2, column=0, columnspan=2, sticky="ew", padx=10, pady=10)

        self.med_btn = ctk.CTkButton(self.nav_frame, text="Manage Medications", command=self.go_medications)
        self.med_btn.pack(side="left", expand=True, padx=10, pady=10)

        self.hist_btn = ctk.CTkButton(self.nav_frame, text="View History", command=self.go_history)
        self.hist_btn.pack(side="right", expand=True, padx=10, pady=10)
        
        self.refresh_btn = ctk.CTkButton(self.nav_frame, text="Refresh", command=lambda: self.refresh(self.current_user))
        self.refresh_btn.pack(side="bottom", expand=True, padx=10, pady=10)

    def refresh(self, user):
        self.current_user = user
        self.welcome_label.configure(text=f"Welcome, {user.username}!")
        
        # Clear existing widgets
        for widget in self.due_frame.winfo_children():
            widget.destroy()
        for widget in self.stock_frame.winfo_children():
            widget.destroy()

        # Load due meds
        due_meds = self.dose_alert.get_due_medications(user.user_id)
        if not due_meds:
            ctk.CTkLabel(self.due_frame, text="No medications currently due.").pack(pady=10)
        else:
            for med in due_meds:
                f = ctk.CTkFrame(self.due_frame)
                f.pack(fill="x", pady=5, padx=5)
                ctk.CTkLabel(f, text=med['name'], font=ctk.CTkFont(weight="bold")).pack(side="left", padx=10, pady=10)
                ctk.CTkButton(f, text="Take Dose", width=80, fg_color="green", hover_color="darkgreen",
                              command=lambda m_id=med['med_id']: self.take_dose(m_id)).pack(side="right", padx=10)

        # Load low stock meds
        medications = self.inventory_manager.get_user_medications(user.user_id)
        low_stock_found = False
        for med in medications:
            if med.is_low_stock():
                low_stock_found = True
                ctk.CTkLabel(self.stock_frame, text=f"{med.name}: {med.stock} left (Low!)", text_color="red").pack(pady=5)
        
        if not low_stock_found:
            ctk.CTkLabel(self.stock_frame, text="All medications are sufficiently stocked.").pack(pady=10)

    def take_dose(self, med_id):
        self.inventory_manager.deduct_stock(med_id)
        self.report_generator.log_intake(self.current_user.user_id, med_id, "TAKEN")
        self.refresh(self.current_user)

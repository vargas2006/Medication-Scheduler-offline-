import customtkinter as ctk
from models.schedule import DoseAlert
from models.medication import InventoryManager
from models.history import ReportGenerator
import time
import threading

class DashboardFrame(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        
        self.dose_alert = DoseAlert()
        self.inventory_manager = InventoryManager()
        self.report_generator = ReportGenerator()
        self.current_user = None

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure((0, 1), weight=1)

        # Header
        self.header = ctk.CTkFrame(self, fg_color="transparent")
        self.header.grid(row=0, column=0, columnspan=2, sticky="ew", padx=20, pady=(20, 10))
        self.title_lbl = ctk.CTkLabel(self.header, text="Dashboard", font=ctk.CTkFont(size=24, weight="bold"))
        self.title_lbl.pack(side="left")

        # Stats Container (Top Cards)
        self.stats_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.stats_frame.grid(row=1, column=0, columnspan=2, sticky="ew", padx=20, pady=10)
        self.stats_frame.grid_columnconfigure((0, 1, 2), weight=1)

        # Stat cards
        self.card_total = self.create_stat_card(self.stats_frame, 0, "Total Medications", "0")
        self.card_low = self.create_stat_card(self.stats_frame, 1, "Low Stock Alerts", "0")
        self.card_recent = self.create_stat_card(self.stats_frame, 2, "Doses Taken", "0")

        # Content Split
        self.main_content = ctk.CTkFrame(self, fg_color="transparent")
        self.main_content.grid(row=2, column=0, columnspan=2, sticky="nsew", padx=20, pady=10)
        self.grid_rowconfigure(2, weight=1)
        self.main_content.grid_columnconfigure((0, 1), weight=1)
        self.main_content.grid_rowconfigure(0, weight=1)

        # Due Frame
        self.due_frame = ctk.CTkScrollableFrame(self.main_content, label_text="Due Right Now", fg_color="#1a1a1a")
        self.due_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 10))

        # Recent Usage Frame
        self.recent_frame = ctk.CTkScrollableFrame(self.main_content, label_text="Recent Usage Log", fg_color="#1a1a1a")
        self.recent_frame.grid(row=0, column=1, sticky="nsew", padx=(10, 0))

    def create_stat_card(self, parent, col, title, initial_val):
        card = ctk.CTkFrame(parent, fg_color="#1a1a1a", corner_radius=10)
        card.grid(row=0, column=col, sticky="ew", padx=10)
        ctk.CTkLabel(card, text=title, font=ctk.CTkFont(size=14), text_color="gray").pack(pady=(15, 0))
        val_lbl = ctk.CTkLabel(card, text=initial_val, font=ctk.CTkFont(size=28, weight="bold"))
        val_lbl.pack(pady=(5, 15))
        return val_lbl

    def refresh(self, user):
        self.current_user = user
        
        # 1. Show skeleton loading blocks
        self.show_skeleton()
        
        # 2. Start a background thread to fetch data (simulating network/db delay)
        threading.Thread(target=self.fetch_data_with_delay, daemon=True).start()

    def show_skeleton(self):
        # Clear existing
        for w in self.due_frame.winfo_children(): w.destroy()
        for w in self.recent_frame.winfo_children(): w.destroy()
        
        # Add gray skeleton blocks to simulate loading
        for _ in range(3):
            skeleton = ctk.CTkFrame(self.due_frame, fg_color="#333333", height=40, corner_radius=5)
            skeleton.pack(fill="x", pady=5, padx=5)
            
        for _ in range(4):
            skeleton = ctk.CTkFrame(self.recent_frame, fg_color="#333333", height=30, corner_radius=5)
            skeleton.pack(fill="x", pady=5, padx=5)

    def fetch_data_with_delay(self):
        # Simulate loading for bone/skeleton effect
        time.sleep(1.0) 
        
        # Fetch real data
        meds = self.inventory_manager.get_user_medications(self.current_user.user_id)
        due_meds = self.dose_alert.get_due_medications(self.current_user.user_id)
        history = self.report_generator.get_user_history(self.current_user.user_id)

        # Compute stats
        total_meds = len(meds)
        low_stock = sum(1 for m in meds if m.is_low_stock())
        doses_taken = len([h for h in history if h.status == 'TAKEN'])
        recent_history = history[:5] # top 5

        # Update UI back on main thread using after()
        self.after(0, lambda: self.render_real_data(due_meds, recent_history, total_meds, low_stock, doses_taken))

    def render_real_data(self, due_meds, recent_history, total_meds, low_stock, doses_taken):
        # Update Stats Cards
        self.card_total.configure(text=str(total_meds))
        self.card_low.configure(text=str(low_stock), text_color="red" if low_stock > 0 else "white")
        self.card_recent.configure(text=str(doses_taken))

        # Clear skeletons
        for w in self.due_frame.winfo_children(): w.destroy()
        for w in self.recent_frame.winfo_children(): w.destroy()

        # Render Due
        if not due_meds:
            ctk.CTkLabel(self.due_frame, text="You're all caught up!").pack(pady=20)
        else:
            for med in due_meds:
                f = ctk.CTkFrame(self.due_frame, fg_color="#2a2a2a")
                f.pack(fill="x", pady=5, padx=5)
                ctk.CTkLabel(f, text=med['name'], font=ctk.CTkFont(weight="bold")).pack(side="left", padx=15, pady=15)
                ctk.CTkButton(f, text="Take Dose", width=80, fg_color="#2E8B57", hover_color="#3CB371",
                              command=lambda m_id=med['med_id']: self.take_dose(m_id)).pack(side="right", padx=15)

        # Render Recent
        if not recent_history:
            ctk.CTkLabel(self.recent_frame, text="No logs yet.").pack(pady=20)
        else:
            for log in recent_history:
                f = ctk.CTkFrame(self.recent_frame, fg_color="transparent")
                f.pack(fill="x", pady=2, padx=5)
                color = "#2E8B57" if log.status == "TAKEN" else "#DC143C"
                ctk.CTkLabel(f, text=f"{log.med_name} ({log.status})", font=ctk.CTkFont(weight="bold"), text_color=color).pack(side="left")
                
                # Format time
                time_str = log.timestamp.split()[1][:5] # get HH:MM
                ctk.CTkLabel(f, text=time_str, text_color="gray").pack(side="right")

    def take_dose(self, med_id):
        self.inventory_manager.deduct_stock(med_id)
        self.report_generator.log_intake(self.current_user.user_id, med_id, "TAKEN")
        self.refresh(self.current_user)

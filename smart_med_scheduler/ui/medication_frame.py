import customtkinter as ctk
from models.medication import InventoryManager
from models.schedule import DoseAlert

class MedicationFrame(ctk.CTkFrame):
    def __init__(self, master, go_dashboard):
        super().__init__(master)
        self.go_dashboard = go_dashboard
        self.inventory = InventoryManager()
        self.dose_alert = DoseAlert()
        self.current_user = None

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure((0, 1), weight=1)

        # Header
        self.header = ctk.CTkFrame(self)
        self.header.grid(row=0, column=0, columnspan=2, sticky="ew", padx=10, pady=10)
        ctk.CTkLabel(self.header, text="Manage Medications", font=ctk.CTkFont(size=20, weight="bold")).pack(side="left", padx=10, pady=10)
        ctk.CTkButton(self.header, text="Back to Dashboard", command=self.go_dashboard).pack(side="right", padx=10, pady=10)

        # Form Frame
        self.form_frame = ctk.CTkFrame(self)
        self.form_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)

        ctk.CTkLabel(self.form_frame, text="Add New Medication").grid(row=0, column=0, columnspan=2, pady=10)
        
        ctk.CTkLabel(self.form_frame, text="Name:").grid(row=1, column=0, padx=5, pady=5, sticky="e")
        self.name_entry = ctk.CTkEntry(self.form_frame)
        self.name_entry.grid(row=1, column=1, padx=5, pady=5)

        ctk.CTkLabel(self.form_frame, text="Dosage:").grid(row=2, column=0, padx=5, pady=5, sticky="e")
        self.dosage_entry = ctk.CTkEntry(self.form_frame)
        self.dosage_entry.grid(row=2, column=1, padx=5, pady=5)

        ctk.CTkLabel(self.form_frame, text="Stock:").grid(row=3, column=0, padx=5, pady=5, sticky="e")
        self.stock_entry = ctk.CTkEntry(self.form_frame)
        self.stock_entry.grid(row=3, column=1, padx=5, pady=5)

        ctk.CTkLabel(self.form_frame, text="Refill Threshold:").grid(row=4, column=0, padx=5, pady=5, sticky="e")
        self.threshold_entry = ctk.CTkEntry(self.form_frame)
        self.threshold_entry.grid(row=4, column=1, padx=5, pady=5)

        ctk.CTkLabel(self.form_frame, text="Schedule Type:").grid(row=5, column=0, padx=5, pady=5, sticky="e")
        self.sched_type = ctk.CTkOptionMenu(self.form_frame, values=["DAILY_TIME", "INTERVAL"])
        self.sched_type.grid(row=5, column=1, padx=5, pady=5)

        ctk.CTkLabel(self.form_frame, text="Time/Interval:").grid(row=6, column=0, padx=5, pady=5, sticky="e")
        self.time_entry = ctk.CTkEntry(self.form_frame, placeholder_text="e.g. 08:00 or 6")
        self.time_entry.grid(row=6, column=1, padx=5, pady=5)

        self.add_btn = ctk.CTkButton(self.form_frame, text="Add Medication", command=self.add_medication)
        self.add_btn.grid(row=7, column=0, columnspan=2, pady=20)

        # List Frame
        self.list_frame = ctk.CTkScrollableFrame(self, label_text="Your Medications")
        self.list_frame.grid(row=1, column=1, sticky="nsew", padx=10, pady=10)

    def refresh(self, user):
        self.current_user = user
        self.load_medications()

    def load_medications(self):
        for widget in self.list_frame.winfo_children():
            widget.destroy()
        
        meds = self.inventory.get_user_medications(self.current_user.user_id)
        for med in meds:
            f = ctk.CTkFrame(self.list_frame)
            f.pack(fill="x", pady=5)
            ctk.CTkLabel(f, text=f"{med.name} ({med.dosage}) - Stock: {med.stock}").pack(side="left", padx=10, pady=5)
            ctk.CTkButton(f, text="Delete", fg_color="red", hover_color="darkred", width=60,
                          command=lambda m=med.med_id: self.delete_medication(m)).pack(side="right", padx=10, pady=5)

    def add_medication(self):
        try:
            stock = int(self.stock_entry.get())
            threshold = int(self.threshold_entry.get())
        except ValueError:
            return # Should show error
            
        med_id = self.inventory.add_medication(
            self.current_user.user_id,
            self.name_entry.get(),
            self.dosage_entry.get(),
            stock,
            threshold
        )
        
        self.dose_alert.add_schedule(med_id, self.sched_type.get(), self.time_entry.get())
        
        # Clear entries
        self.name_entry.delete(0, 'end')
        self.dosage_entry.delete(0, 'end')
        self.stock_entry.delete(0, 'end')
        self.threshold_entry.delete(0, 'end')
        self.time_entry.delete(0, 'end')
        
        self.load_medications()

    def delete_medication(self, med_id):
        self.inventory.delete_medication(med_id)
        self.load_medications()

import customtkinter as ctk
from models.history import ReportGenerator
import os

class HistoryFrame(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.report_generator = ReportGenerator()
        self.current_user = None

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Header
        self.header = ctk.CTkFrame(self, fg_color="transparent")
        self.header.grid(row=0, column=0, sticky="ew", padx=20, pady=(20, 10))
        ctk.CTkLabel(self.header, text="Intake History", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")

        # List
        self.list_frame = ctk.CTkScrollableFrame(self, fg_color="#1a1a1a")
        self.list_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=10)

        # Footer
        self.footer = ctk.CTkFrame(self, fg_color="transparent")
        self.footer.grid(row=2, column=0, sticky="ew", padx=20, pady=10)
        self.export_btn = ctk.CTkButton(self.footer, text="Export to CSV", width=200, command=self.export_csv)
        self.export_btn.pack(pady=10)

    def refresh(self, user):
        self.current_user = user
        self.load_history()

    def load_history(self):
        for widget in self.list_frame.winfo_children():
            widget.destroy()

        history = self.report_generator.get_user_history(self.current_user.user_id)
        if not history:
            ctk.CTkLabel(self.list_frame, text="No history found.").pack(pady=10)
        else:
            for log in history:
                f = ctk.CTkFrame(self.list_frame, fg_color="#2a2a2a")
                f.pack(fill="x", pady=2, padx=5)
                
                info_text = f"{log.med_name} - {log.status}"
                color = "#2E8B57" if log.status == "TAKEN" else "#DC143C"
                
                ctk.CTkLabel(f, text=log.timestamp, text_color="gray").pack(side="left", padx=15, pady=10)
                ctk.CTkLabel(f, text=info_text, font=ctk.CTkFont(weight="bold"), text_color=color).pack(side="left", padx=15)

    def export_csv(self):
        filepath = f"history_export_{self.current_user.username}.csv"
        self.report_generator.export_to_csv(self.current_user.user_id, filepath)
        print(f"Exported to {filepath}")

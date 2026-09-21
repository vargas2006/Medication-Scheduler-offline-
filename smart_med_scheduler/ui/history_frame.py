import customtkinter as ctk
from models.history import ReportGenerator
import os

class HistoryFrame(ctk.CTkFrame):
    def __init__(self, master, go_dashboard):
        super().__init__(master)
        self.go_dashboard = go_dashboard
        self.report_generator = ReportGenerator()
        self.current_user = None

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Header
        self.header = ctk.CTkFrame(self)
        self.header.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        ctk.CTkLabel(self.header, text="Intake History", font=ctk.CTkFont(size=20, weight="bold")).pack(side="left", padx=10, pady=10)
        ctk.CTkButton(self.header, text="Back to Dashboard", command=self.go_dashboard).pack(side="right", padx=10, pady=10)

        # List
        self.list_frame = ctk.CTkScrollableFrame(self)
        self.list_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)

        # Footer
        self.footer = ctk.CTkFrame(self)
        self.footer.grid(row=2, column=0, sticky="ew", padx=10, pady=10)
        self.export_btn = ctk.CTkButton(self.footer, text="Export to CSV", command=self.export_csv)
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
                f = ctk.CTkFrame(self.list_frame)
                f.pack(fill="x", pady=2, padx=5)
                text = f"{log.timestamp} | {log.med_name} - {log.status}"
                color = "green" if log.status == "TAKEN" else "red"
                ctk.CTkLabel(f, text=text, text_color=color).pack(side="left", padx=10, pady=5)

    def export_csv(self):
        filepath = f"history_export_{self.current_user.username}.csv"
        self.report_generator.export_to_csv(self.current_user.user_id, filepath)
        # Assuming simple alert
        print(f"Exported to {filepath}")

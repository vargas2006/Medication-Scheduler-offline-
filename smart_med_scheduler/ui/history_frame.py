import customtkinter as ctk
from models.history import ReportGenerator
import os

class HistoryFrame(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="#0d0f17")
        self.report_generator = ReportGenerator()
        self.current_user = None

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Header
        self.header = ctk.CTkFrame(self, fg_color="transparent")
        self.header.grid(row=0, column=0, sticky="ew", padx=20, pady=(20, 10))
        
        # Bordered Title Tag Badge
        self.tag_badge = ctk.CTkFrame(
            self.header, 
            fg_color="#181d2e", 
            border_color="#2f3957", 
            border_width=1, 
            corner_radius=6, 
            height=24
        )
        self.tag_badge.pack(anchor="w", pady=(0, 4))
        self.tag_badge.pack_propagate(False)

        ctk.CTkLabel(
            self.tag_badge, 
            text="● AUDIT & INTAKE LOGS", 
            font=ctk.CTkFont(size=10, weight="bold"), 
            text_color="#c084fc"
        ).pack(side="left", padx=8)

        ctk.CTkLabel(
            self.header, 
            text="Intake History", 
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color="#ffffff"
        ).pack(anchor="w")

        ctk.CTkLabel(
            self.header, 
            text="Complete historical audit of your medication doses taken and schedule records.", 
            font=ctk.CTkFont(size=12), 
            text_color="#64748b"
        ).pack(anchor="w")

        # List Frame
        self.list_frame = ctk.CTkScrollableFrame(
            self, 
            fg_color="#161926",
            border_color="#24293e",
            border_width=1,
            corner_radius=14
        )
        self.list_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=10)

        # Footer
        self.footer = ctk.CTkFrame(self, fg_color="transparent")
        self.footer.grid(row=2, column=0, sticky="ew", padx=20, pady=10)
        self.export_btn = ctk.CTkButton(
            self.footer, 
            text="📥 Export to CSV Report", 
            width=220, 
            height=38,
            corner_radius=8,
            fg_color="#06b6d4",
            hover_color="#0891b2",
            text_color="#000000",
            font=ctk.CTkFont(size=13, weight="bold"),
            command=self.export_csv
        )
        self.export_btn.pack(pady=10)

    def refresh(self, user):
        self.current_user = user
        self.load_history()

    def load_history(self):
        for widget in self.list_frame.winfo_children():
            widget.destroy()

        history = self.report_generator.get_user_history(self.current_user.user_id)
        if not history:
            empty_box = ctk.CTkFrame(self.list_frame, fg_color="transparent")
            empty_box.pack(pady=40)
            ctk.CTkLabel(empty_box, text="📜", font=ctk.CTkFont(size=24)).pack()
            ctk.CTkLabel(
                empty_box, 
                text="No history logs found.", 
                font=ctk.CTkFont(size=13, weight="bold"), 
                text_color="#64748b"
            ).pack(pady=(4, 0))
        else:
            for log in history:
                f = ctk.CTkFrame(
                    self.list_frame, 
                    fg_color="#1c2033", 
                    border_color="#272e45", 
                    border_width=1, 
                    corner_radius=8
                )
                f.pack(fill="x", pady=3, padx=5)
                
                is_taken = log.status == "TAKEN"
                color = "#10b981" if is_taken else "#f43f5e"
                bg_color = "#102d24" if is_taken else "#3d1822"
                
                pill = ctk.CTkLabel(
                    f, 
                    text=log.status, 
                    font=ctk.CTkFont(size=10, weight="bold"), 
                    text_color=color,
                    fg_color=bg_color,
                    corner_radius=4,
                    padx=6,
                    pady=2
                )
                pill.pack(side="left", padx=12, pady=8)

                ctk.CTkLabel(
                    f, 
                    text=log.med_name, 
                    font=ctk.CTkFont(size=13, weight="bold"), 
                    text_color="#ffffff"
                ).pack(side="left", padx=8)

                ctk.CTkLabel(
                    f, 
                    text=log.timestamp, 
                    font=ctk.CTkFont(size=11), 
                    text_color="#64748b"
                ).pack(side="right", padx=15)

    def export_csv(self):
        filepath = f"history_export_{self.current_user.username}.csv"
        self.report_generator.export_to_csv(self.current_user.user_id, filepath)
        print(f"Exported to {filepath}")

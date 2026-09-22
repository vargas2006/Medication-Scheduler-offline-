import customtkinter as ctk
from models.user import UserManager
from ui.login_frame import LoginFrame
from ui.dashboard_frame import DashboardFrame
from ui.medication_frame import MedicationFrame
from ui.history_frame import HistoryFrame
from ui.settings_frame import SettingsFrame

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Smart Medication Scheduler")
        self.geometry("1100x700")
        self.configure(fg_color="#0d0f17")
        
        # Configure main grid
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        self.user_manager = UserManager()

        # Login Frame (takes full screen)
        self.login_frame = LoginFrame(self, self.on_login_success, self.user_manager)

        # Sidebar Frame (Only visible when logged in)
        self.sidebar_frame = ctk.CTkFrame(
            self, 
            width=230, 
            corner_radius=0, 
            fg_color="#121520", 
            border_color="#1e2235", 
            border_width=1
        )
        self.sidebar_frame.grid_propagate(False)

        # Sidebar Brand Header
        self.brand_frame = ctk.CTkFrame(self.sidebar_frame, fg_color="transparent")
        self.brand_frame.pack(fill="x", padx=18, pady=(22, 20))

        self.brand_badge = ctk.CTkFrame(self.brand_frame, width=38, height=38, corner_radius=9, fg_color="#ffffff")
        self.brand_badge.pack(side="left", padx=(0, 10))
        self.brand_badge.pack_propagate(False)

        self.brand_icon = ctk.CTkLabel(self.brand_badge, text="💊", font=ctk.CTkFont(size=18))
        self.brand_icon.place(relx=0.5, rely=0.5, anchor="center")

        self.brand_text_box = ctk.CTkFrame(self.brand_frame, fg_color="transparent")
        self.brand_text_box.pack(side="left", fill="both")

        self.brand_title = ctk.CTkLabel(
            self.brand_text_box, 
            text="MedScheduler", 
            font=ctk.CTkFont(size=16, weight="bold"), 
            text_color="#ffffff"
        )
        self.brand_title.pack(anchor="w")

        self.brand_subtitle = ctk.CTkLabel(
            self.brand_text_box, 
            text="Smart Care Monitor", 
            font=ctk.CTkFont(size=10), 
            text_color="#64748b"
        )
        self.brand_subtitle.pack(anchor="w")

        # Section 1: OVERVIEW & CARE (Bordered Title Badge)
        self.sec1_badge = ctk.CTkFrame(
            self.sidebar_frame, 
            fg_color="#171b29", 
            border_color="#2b3149", 
            border_width=1, 
            corner_radius=6, 
            height=26
        )
        self.sec1_badge.pack(fill="x", padx=16, pady=(10, 8))
        self.sec1_badge.pack_propagate(False)

        ctk.CTkLabel(
            self.sec1_badge, 
            text="● OVERVIEW & CARE", 
            font=ctk.CTkFont(size=10, weight="bold"), 
            text_color="#c084fc"
        ).pack(side="left", padx=10)

        # Nav Buttons Container
        self.nav_buttons = {}

        self.btn_dashboard = self.create_nav_button("DashboardFrame", "📊   Dashboard")
        self.btn_meds = self.create_nav_button("MedicationFrame", "💊   Medications")

        # Section 2: RECORDS & SETTINGS (Bordered Title Badge)
        self.sec2_badge = ctk.CTkFrame(
            self.sidebar_frame, 
            fg_color="#171b29", 
            border_color="#2b3149", 
            border_width=1, 
            corner_radius=6, 
            height=26
        )
        self.sec2_badge.pack(fill="x", padx=16, pady=(18, 8))
        self.sec2_badge.pack_propagate(False)

        ctk.CTkLabel(
            self.sec2_badge, 
            text="● RECORDS & SETTINGS", 
            font=ctk.CTkFont(size=10, weight="bold"), 
            text_color="#38bdf8"
        ).pack(side="left", padx=10)

        self.btn_history = self.create_nav_button("HistoryFrame", "📜   Intake History")
        self.btn_settings = self.create_nav_button("SettingsFrame", "⚙️   Settings")

        # Spacer to push user profile to bottom
        self.sidebar_spacer = ctk.CTkFrame(self.sidebar_frame, fg_color="transparent")
        self.sidebar_spacer.pack(fill="both", expand=True)

        # User Profile Footer Card
        self.user_card = ctk.CTkFrame(
            self.sidebar_frame, 
            fg_color="#161a29", 
            border_color="#252b42", 
            border_width=1, 
            corner_radius=10
        )
        self.user_card.pack(fill="x", padx=14, pady=16)

        self.user_avatar = ctk.CTkLabel(
            self.user_card, 
            text="👤", 
            width=32, 
            height=32, 
            fg_color="#262d45", 
            corner_radius=8, 
            font=ctk.CTkFont(size=15)
        )
        self.user_avatar.pack(side="left", padx=(10, 8), pady=10)

        self.user_info_frame = ctk.CTkFrame(self.user_card, fg_color="transparent")
        self.user_info_frame.pack(side="left", fill="both", expand=True, pady=8)

        self.user_name_lbl = ctk.CTkLabel(
            self.user_info_frame, 
            text="User", 
            font=ctk.CTkFont(size=12, weight="bold"), 
            text_color="#ffffff"
        )
        self.user_name_lbl.pack(anchor="w")

        self.user_role_lbl = ctk.CTkLabel(
            self.user_info_frame, 
            text="Patient Profile", 
            font=ctk.CTkFont(size=10), 
            text_color="#64748b"
        )
        self.user_role_lbl.pack(anchor="w")

        self.btn_logout = ctk.CTkButton(
            self.user_card, 
            text="🚪", 
            width=32, 
            height=32, 
            fg_color="transparent", 
            text_color="#ef4444", 
            hover_color="#2a1622", 
            font=ctk.CTkFont(size=15), 
            command=self.logout
        )
        self.btn_logout.pack(side="right", padx=(0, 8))

        # Content Container (Right side)
        self.content_container = ctk.CTkFrame(self, corner_radius=0, fg_color="#0d0f17")
        self.content_container.grid_rowconfigure(0, weight=1)
        self.content_container.grid_columnconfigure(0, weight=1)

        # Initialize content frames
        self.content_frames = {}
        self.content_frames["DashboardFrame"] = DashboardFrame(self.content_container)
        self.content_frames["MedicationFrame"] = MedicationFrame(self.content_container)
        self.content_frames["HistoryFrame"] = HistoryFrame(self.content_container)
        self.content_frames["SettingsFrame"] = SettingsFrame(self.content_container)

        self.current_frame_name = None

        # Start with Login
        self.show_login()

    def create_nav_button(self, frame_name, text):
        btn = ctk.CTkButton(
            self.sidebar_frame, 
            text=text, 
            anchor="w", 
            height=40,
            corner_radius=8,
            fg_color="transparent", 
            text_color="#94a3b8", 
            hover_color="#1a1e2e",
            font=ctk.CTkFont(size=13, weight="bold"),
            command=lambda: self.show_content_frame(frame_name)
        )
        btn.pack(fill="x", padx=14, pady=3)
        self.nav_buttons[frame_name] = btn
        return btn

    def show_login(self):
        # Hide sidebar and content
        self.sidebar_frame.grid_forget()
        self.content_container.grid_forget()
        
        # Show login full screen
        self.login_frame.grid(row=0, column=0, columnspan=2, sticky="nsew")

    def on_login_success(self, user):
        self.user_manager.current_user = user
        self.login_frame.grid_forget()
        
        # Update user profile in sidebar
        display_name = user.name if hasattr(user, "name") and user.name else user.username
        self.user_name_lbl.configure(text=display_name[:16])
        
        # Show sidebar and content area
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.content_container.grid(row=0, column=1, sticky="nsew")
        
        self.show_content_frame("DashboardFrame")

    def show_content_frame(self, frame_name):
        self.current_frame_name = frame_name

        # Update button highlights (Active tab highlight like reference)
        for name, btn in self.nav_buttons.items():
            if name == frame_name:
                btn.configure(
                    fg_color="#2b2046", 
                    text_color="#e9d5ff", 
                    border_color="#a855f7", 
                    border_width=1
                )
            else:
                btn.configure(
                    fg_color="transparent", 
                    text_color="#94a3b8", 
                    border_width=0
                )

        # Hide all content frames
        for frame in self.content_frames.values():
            frame.grid_forget()
            
        # Show requested frame
        frame = self.content_frames[frame_name]
        frame.grid(row=0, column=0, sticky="nsew")
        
        # Refresh data
        if hasattr(frame, "refresh") and self.user_manager.current_user:
            frame.refresh(self.user_manager.current_user)

    def logout(self):
        self.user_manager.logout()
        self.show_login()

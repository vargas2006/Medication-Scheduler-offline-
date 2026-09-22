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
        self.grid_columnconfigure(0, weight=0, minsize=230)
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
        self.content_container.grid_rowconfigure(0, weight=0) # Permanent Header
        self.content_container.grid_rowconfigure(1, weight=1) # Dynamic Body Container
        self.content_container.grid_columnconfigure(0, weight=1)

        # Permanent Title & Description Header Panel (Top Right - PERMANENT)
        self.header_panel = ctk.CTkFrame(self.content_container, fg_color="transparent")
        self.header_panel.grid(row=0, column=0, sticky="ew", padx=20, pady=(20, 10))

        self.header_left = ctk.CTkFrame(self.header_panel, fg_color="transparent")
        self.header_left.pack(side="left")

        # Bordered Tag Badge
        self.tag_badge = ctk.CTkFrame(
            self.header_left, 
            fg_color="#181d2e", 
            border_color="#2f3957", 
            border_width=1, 
            corner_radius=6, 
            height=24
        )
        self.tag_badge.pack(anchor="w", pady=(0, 4))
        self.tag_badge.pack_propagate(False)

        self.tag_badge_lbl = ctk.CTkLabel(
            self.tag_badge, 
            text="● REALTIME CARE MONITOR", 
            font=ctk.CTkFont(size=10, weight="bold"), 
            text_color="#38bdf8"
        )
        self.tag_badge_lbl.pack(side="left", padx=8)

        self.title_lbl = ctk.CTkLabel(
            self.header_left, 
            text="Dashboard Overview", 
            font=ctk.CTkFont(size=24, weight="bold"), 
            text_color="#ffffff"
        )
        self.title_lbl.pack(anchor="w")

        self.subtitle_lbl = ctk.CTkLabel(
            self.header_left, 
            text="Track medication adherence, due alerts, and daily intake statistics.", 
            font=ctk.CTkFont(size=12), 
            text_color="#64748b"
        )
        self.subtitle_lbl.pack(anchor="w")

        # Header Right: Permanent Date Pill
        self.date_badge = ctk.CTkFrame(
            self.header_panel, 
            fg_color="#161926", 
            border_color="#24293e", 
            border_width=1, 
            corner_radius=8, 
            height=36
        )
        self.date_badge.pack(side="right", pady=4)
        self.date_badge.pack_propagate(False)

        from datetime import datetime
        today_str = datetime.now().strftime("%A, %b %d")
        ctk.CTkLabel(
            self.date_badge, 
            text=f"📅 {today_str}", 
            font=ctk.CTkFont(size=12, weight="bold"), 
            text_color="#94a3b8"
        ).pack(side="left", padx=12)

        # Dynamic Body Container (Row 1 - DYNAMIC)
        self.body_container = ctk.CTkFrame(self.content_container, corner_radius=0, fg_color="#0d0f17")
        self.body_container.grid(row=1, column=0, sticky="nsew")
        self.body_container.grid_rowconfigure(0, weight=1)
        self.body_container.grid_columnconfigure(0, weight=1)

        # Initialize content frames inside body_container
        self.content_frames = {}
        self.content_frames["DashboardFrame"] = DashboardFrame(self.body_container)
        self.content_frames["MedicationFrame"] = MedicationFrame(self.body_container)
        self.content_frames["HistoryFrame"] = HistoryFrame(self.body_container)
        self.content_frames["SettingsFrame"] = SettingsFrame(self.body_container)

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
        if self.current_frame_name == frame_name:
            return

        old_frame = self.content_frames.get(self.current_frame_name)
        self.current_frame_name = frame_name

        # 1. Update Title & Description in-place (PERMANENT HEADER STAYS MOUNTED & STILL)
        user = self.user_manager.current_user
        display_name = (user.name if hasattr(user, "name") and user.name else user.username) if user else "User"

        if frame_name == "DashboardFrame":
            self.tag_badge_lbl.configure(text="● REALTIME CARE MONITOR", text_color="#38bdf8")
            self.title_lbl.configure(text="Dashboard Overview")
            self.subtitle_lbl.configure(text=f"Welcome back, {display_name}! Here is your medication schedule today.")
        elif frame_name == "MedicationFrame":
            self.tag_badge_lbl.configure(text="● INVENTORY MANAGEMENT", text_color="#38bdf8")
            self.title_lbl.configure(text="Medication Inventory")
            self.subtitle_lbl.configure(text="Register and monitor your medications, stock thresholds, and schedules.")
        elif frame_name == "HistoryFrame":
            self.tag_badge_lbl.configure(text="● AUDIT & INTAKE LOGS", text_color="#c084fc")
            self.title_lbl.configure(text="Intake History")
            self.subtitle_lbl.configure(text="Complete historical audit of your medication doses taken and schedule records.")
        elif frame_name == "SettingsFrame":
            self.tag_badge_lbl.configure(text="● SYSTEM CONFIGURATION", text_color="#38bdf8")
            self.title_lbl.configure(text="Settings & Preferences")
            self.subtitle_lbl.configure(text="Personalize application theme, profile details, and alert notifications.")

        # 2. Update button highlights
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

        # 3. Swap DYNAMIC BODY FRAME only (Inside body_container)
        if old_frame:
            old_frame.grid_forget()
            
        frame = self.content_frames[frame_name]
        frame.grid(row=0, column=0, sticky="nsew")
        
        # Refresh dynamic data container only
        if hasattr(frame, "refresh") and self.user_manager.current_user:
            frame.refresh(self.user_manager.current_user)

    def logout(self):
        for frame in self.content_frames.values():
            if hasattr(frame, "is_loaded"):
                frame.is_loaded = False
                frame.loaded_user_id = None
        self.user_manager.logout()
        self.show_login()

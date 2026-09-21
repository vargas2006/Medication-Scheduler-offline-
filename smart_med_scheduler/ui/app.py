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
        self.geometry("1000x650")
        
        # Configure main grid
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        self.user_manager = UserManager()

        # Login Frame (takes full screen)
        self.login_frame = LoginFrame(self, self.on_login_success)

        # Sidebar Frame (Only visible when logged in)
        self.sidebar_frame = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar_frame.grid_rowconfigure(5, weight=1)

        self.sidebar_title = ctk.CTkLabel(self.sidebar_frame, text="💊 Scheduler", font=ctk.CTkFont(size=20, weight="bold"))
        self.sidebar_title.grid(row=0, column=0, padx=20, pady=(20, 30))

        self.btn_dashboard = ctk.CTkButton(self.sidebar_frame, text="📊 Dashboard", anchor="w", fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"), command=lambda: self.show_content_frame("DashboardFrame"))
        self.btn_dashboard.grid(row=1, column=0, padx=20, pady=10, sticky="ew")

        self.btn_meds = ctk.CTkButton(self.sidebar_frame, text="💊 Medications", anchor="w", fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"), command=lambda: self.show_content_frame("MedicationFrame"))
        self.btn_meds.grid(row=2, column=0, padx=20, pady=10, sticky="ew")

        self.btn_history = ctk.CTkButton(self.sidebar_frame, text="📜 History", anchor="w", fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"), command=lambda: self.show_content_frame("HistoryFrame"))
        self.btn_history.grid(row=3, column=0, padx=20, pady=10, sticky="ew")
        
        self.btn_settings = ctk.CTkButton(self.sidebar_frame, text="⚙️ Settings", anchor="w", fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"), command=lambda: self.show_content_frame("SettingsFrame"))
        self.btn_settings.grid(row=4, column=0, padx=20, pady=10, sticky="ew")

        self.btn_logout = ctk.CTkButton(self.sidebar_frame, text="Log Out", anchor="w", fg_color="transparent", text_color="red", hover_color=("gray70", "gray30"), command=self.logout)
        self.btn_logout.grid(row=6, column=0, padx=20, pady=20, sticky="ew")

        # Content Container (Right side)
        self.content_container = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.content_container.grid_rowconfigure(0, weight=1)
        self.content_container.grid_columnconfigure(0, weight=1)

        # Initialize content frames
        self.content_frames = {}
        self.content_frames["DashboardFrame"] = DashboardFrame(self.content_container)
        self.content_frames["MedicationFrame"] = MedicationFrame(self.content_container)
        self.content_frames["HistoryFrame"] = HistoryFrame(self.content_container)
        self.content_frames["SettingsFrame"] = SettingsFrame(self.content_container)

        # Start with Login
        self.show_login()

    def show_login(self):
        # Hide sidebar and content
        self.sidebar_frame.grid_forget()
        self.content_container.grid_forget()
        
        # Show login full screen
        self.login_frame.grid(row=0, column=0, columnspan=2, sticky="nsew")

    def on_login_success(self, user):
        self.login_frame.grid_forget()
        
        # Show sidebar and content area
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.content_container.grid(row=0, column=1, sticky="nsew")
        
        self.show_content_frame("DashboardFrame")

    def show_content_frame(self, frame_name):
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

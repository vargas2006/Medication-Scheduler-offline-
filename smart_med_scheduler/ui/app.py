import customtkinter as ctk
from models.user import UserManager
from ui.login_frame import LoginFrame
from ui.dashboard_frame import DashboardFrame
from ui.medication_frame import MedicationFrame
from ui.history_frame import HistoryFrame

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Smart Medication Scheduler System")
        self.geometry("800x600")
        
        # Configure grid
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.user_manager = UserManager()

        self.frames = {}
        
        # Initialize frames
        self.frames["LoginFrame"] = LoginFrame(self, self.show_dashboard)
        self.frames["DashboardFrame"] = DashboardFrame(self, self.show_medications, self.show_history, self.logout)
        self.frames["MedicationFrame"] = MedicationFrame(self, self.show_dashboard)
        self.frames["HistoryFrame"] = HistoryFrame(self, self.show_dashboard)

        # Show login screen initially
        self.show_frame("LoginFrame")

    def show_frame(self, frame_name):
        for frame in self.frames.values():
            frame.grid_forget()
            
        frame = self.frames[frame_name]
        frame.grid(row=0, column=0, sticky="nsew")
        
        # Call refresh method if exists
        if hasattr(frame, "refresh") and self.user_manager.current_user:
            frame.refresh(self.user_manager.current_user)

    def show_dashboard(self, user=None):
        if user:
            self.user_manager.current_user = user
        self.show_frame("DashboardFrame")

    def show_medications(self):
        self.show_frame("MedicationFrame")

    def show_history(self):
        self.show_frame("HistoryFrame")

    def logout(self):
        self.user_manager.logout()
        self.show_frame("LoginFrame")

import customtkinter as ctk
from models.user import UserManager, PatientProfile

class LoginFrame(ctk.CTkFrame):
    def __init__(self, master, on_login_success):
        super().__init__(master)
        self.on_login_success = on_login_success
        self.user_manager = UserManager()

        self.grid_rowconfigure((0, 1, 2, 3, 4, 5), weight=1)
        self.grid_columnconfigure((0, 1, 2), weight=1)

        self.title_label = ctk.CTkLabel(self, text="Smart Medication Scheduler", font=ctk.CTkFont(size=24, weight="bold"))
        self.title_label.grid(row=1, column=1, pady=20)

        self.username_entry = ctk.CTkEntry(self, placeholder_text="Username", width=200)
        self.username_entry.grid(row=2, column=1, pady=10)

        self.password_entry = ctk.CTkEntry(self, placeholder_text="Password", show="*", width=200)
        self.password_entry.grid(row=3, column=1, pady=10)

        self.error_label = ctk.CTkLabel(self, text="", text_color="red")
        self.error_label.grid(row=4, column=1)

        self.button_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.button_frame.grid(row=5, column=1, pady=10)

        self.login_button = ctk.CTkButton(self.button_frame, text="Login", command=self.login)
        self.login_button.pack(side="left", padx=10)

        self.register_button = ctk.CTkButton(self.button_frame, text="Register", command=self.register)
        self.register_button.pack(side="left", padx=10)

    def login(self):
        username = self.username_entry.get()
        password = self.password_entry.get()
        success, msg = self.user_manager.login(username, password)
        if success:
            self.error_label.configure(text="")
            self.on_login_success(self.user_manager.current_user)
        else:
            self.error_label.configure(text=msg)

    def register(self):
        username = self.username_entry.get()
        password = self.password_entry.get()
        if not username or not password:
            self.error_label.configure(text="Please fill in both fields.")
            return
            
        success, msg = self.user_manager.register(username, password)
        if success:
            self.error_label.configure(text="Registration successful! You can now login.", text_color="green")
        else:
            self.error_label.configure(text=msg, text_color="red")

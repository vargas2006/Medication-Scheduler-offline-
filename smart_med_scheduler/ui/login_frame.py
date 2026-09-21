import customtkinter as ctk
from models.user import UserManager

class LoginFrame(ctk.CTkFrame):
    def __init__(self, master, on_login_success):
        super().__init__(master, fg_color="#000000") # Pure black background
        self.on_login_success = on_login_success
        self.user_manager = UserManager()

        self.grid_rowconfigure((0, 1, 2, 3), weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Top App Header (Logo style)
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, pady=(50, 20))
        
        self.logo_label = ctk.CTkLabel(
            self.header_frame, 
            text="💊 Medication Scheduler", 
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color="white"
        )
        self.logo_label.pack()

        # Login Box Container (with border)
        self.login_box = ctk.CTkFrame(
            self, 
            fg_color="#0a0a0a", # Very dark gray
            border_color="#333333", 
            border_width=1,
            corner_radius=10,
            width=350,
            height=400
        )
        self.login_box.grid(row=1, column=0, pady=20)
        self.login_box.grid_propagate(False) # Keep the fixed size

        # Inside Login Box
        self.title_label = ctk.CTkLabel(
            self.login_box, 
            text="Welcome back", 
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color="white"
        )
        self.title_label.pack(pady=(30, 5))

        self.subtitle_label = ctk.CTkLabel(
            self.login_box, 
            text="Sign in with your account credentials.", 
            font=ctk.CTkFont(size=12),
            text_color="gray"
        )
        self.subtitle_label.pack(pady=(0, 20))

        # Username Field
        self.user_label = ctk.CTkLabel(self.login_box, text="Username", font=ctk.CTkFont(size=12, weight="bold"), text_color="white")
        self.user_label.pack(anchor="w", padx=40)
        self.username_entry = ctk.CTkEntry(self.login_box, placeholder_text="Enter username", width=270, height=35)
        self.username_entry.pack(pady=(0, 15))

        # Password Field
        self.pass_label = ctk.CTkLabel(self.login_box, text="Password", font=ctk.CTkFont(size=12, weight="bold"), text_color="white")
        self.pass_label.pack(anchor="w", padx=40)
        self.password_entry = ctk.CTkEntry(self.login_box, placeholder_text="••••••••", show="*", width=270, height=35)
        self.password_entry.pack(pady=(0, 5))

        # Error Label
        self.error_label = ctk.CTkLabel(self.login_box, text="", text_color="red", font=ctk.CTkFont(size=11))
        self.error_label.pack(pady=5)

        # Buttons
        self.login_button = ctk.CTkButton(
            self.login_box, 
            text="→ Sign In", 
            width=270, 
            height=35,
            fg_color="white",
            text_color="black",
            hover_color="#e0e0e0",
            font=ctk.CTkFont(weight="bold"),
            command=self.login
        )
        self.login_button.pack(pady=(5, 10))

        self.register_button = ctk.CTkButton(
            self.login_box, 
            text="Register New Account", 
            width=270, 
            height=35,
            fg_color="transparent",
            text_color="gray",
            hover_color="#1a1a1a",
            command=self.register
        )
        self.register_button.pack(pady=(0, 20))

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
            self.error_label.configure(text="Registration successful! You can now sign in.", text_color="green")
        else:
            self.error_label.configure(text=msg, text_color="red")

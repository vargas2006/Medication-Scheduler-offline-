import customtkinter as ctk
from models.user import UserManager

class LoginFrame(ctk.CTkFrame):
    def __init__(self, master, on_login_success):
        super().__init__(master, fg_color="#000000") # Pure black background
        self.on_login_success = on_login_success
        self.user_manager = UserManager()

        # Center wrapper to keep logo and login box close together and centered
        self.center_wrapper = ctk.CTkFrame(self, fg_color="transparent")
        self.center_wrapper.place(relx=0.5, rely=0.5, anchor="center")

        # Top App Header (Badge Icon + Title sitting close right above the card)
        self.header_frame = ctk.CTkFrame(self.center_wrapper, fg_color="transparent")
        self.header_frame.pack(pady=(0, 18))

        # Rounded badge for icon like reference picture
        self.logo_badge = ctk.CTkFrame(
            self.header_frame,
            fg_color="#ffffff",
            corner_radius=10,
            width=42,
            height=42
        )
        self.logo_badge.pack(side="left", padx=(0, 12))
        self.logo_badge.pack_propagate(False)

        self.logo_icon = ctk.CTkLabel(
            self.logo_badge,
            text="💊",
            font=ctk.CTkFont(size=20)
        )
        self.logo_icon.place(relx=0.5, rely=0.5, anchor="center")

        self.logo_title = ctk.CTkLabel(
            self.header_frame,
            text="Medication Scheduler",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color="white"
        )
        self.logo_title.pack(side="left")

        # Login Box Container (Wider, dark card with subtle border matching reference)
        self.login_box = ctk.CTkFrame(
            self.center_wrapper, 
            fg_color="#080808",
            border_color="#262626", 
            border_width=1,
            corner_radius=14,
            width=480,
            height=500
        )
        self.login_box.pack()
        self.login_box.pack_propagate(False)

        # Inside Login Box
        self.title_label = ctk.CTkLabel(
            self.login_box, 
            text="Welcome back", 
            font=ctk.CTkFont(size=26, weight="bold"),
            text_color="white"
        )
        self.title_label.pack(pady=(36, 6))

        self.subtitle_label = ctk.CTkLabel(
            self.login_box, 
            text="Sign in with your account credentials.", 
            font=ctk.CTkFont(size=13),
            text_color="#71717a"
        )
        self.subtitle_label.pack(pady=(0, 24))

        # Username / Email Field
        self.user_label = ctk.CTkLabel(
            self.login_box, 
            text="Username", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color="white"
        )
        self.user_label.pack(anchor="w", padx=45, pady=(0, 6))

        self.username_entry = ctk.CTkEntry(
            self.login_box, 
            placeholder_text="Enter username", 
            height=44, 
            corner_radius=8,
            fg_color="#e8f0fe",
            border_color="#64748b",
            border_width=1.5,
            text_color="#000000",
            placeholder_text_color="#64748b",
            font=ctk.CTkFont(size=14)
        )
        self.username_entry.pack(fill="x", padx=45, pady=(0, 16))
        self.username_entry.bind("<Return>", lambda e: self.login())

        # Password Field
        self.pass_label = ctk.CTkLabel(
            self.login_box, 
            text="Password", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color="white"
        )
        self.pass_label.pack(anchor="w", padx=45, pady=(0, 6))

        # Password input container with eye toggle icon
        self.pass_container = ctk.CTkFrame(
            self.login_box,
            fg_color="#e8f0fe",
            border_color="#64748b",
            border_width=1.5,
            corner_radius=8,
            height=44
        )
        self.pass_container.pack(fill="x", padx=45, pady=(0, 4))
        self.pass_container.pack_propagate(False)

        self.password_entry = ctk.CTkEntry(
            self.pass_container,
            placeholder_text="••••••••",
            show="*",
            fg_color="transparent",
            border_width=0,
            text_color="#000000",
            placeholder_text_color="#64748b",
            font=ctk.CTkFont(size=14)
        )
        self.password_entry.pack(side="left", fill="both", expand=True, padx=(12, 4))
        self.password_entry.bind("<Return>", lambda e: self.login())

        self.eye_button = ctk.CTkButton(
            self.pass_container,
            text="👁",
            width=32,
            height=32,
            fg_color="transparent",
            text_color="#4b5563",
            hover_color="#dbeafe",
            font=ctk.CTkFont(size=14),
            command=self.toggle_password
        )
        self.eye_button.pack(side="right", padx=(0, 6))

        # Error / Status Label
        self.error_label = ctk.CTkLabel(self.login_box, text="", text_color="#ef4444", font=ctk.CTkFont(size=12))
        self.error_label.pack(pady=(4, 6))

        # Sign In Button (Solid white with bold black text)
        self.login_button = ctk.CTkButton(
            self.login_box, 
            text="→ Sign In", 
            height=44,
            corner_radius=8,
            fg_color="#ffffff",
            text_color="#000000",
            hover_color="#e2e8f0",
            font=ctk.CTkFont(size=14, weight="bold"),
            command=self.login
        )
        self.login_button.pack(fill="x", padx=45, pady=(6, 12))

        # Bottom Link / Registration Button
        self.register_button = ctk.CTkButton(
            self.login_box, 
            text="Don't have an account? Register new account", 
            height=32,
            fg_color="transparent",
            text_color="#71717a",
            hover_color="#18181b",
            font=ctk.CTkFont(size=12),
            command=self.register
        )
        self.register_button.pack(fill="x", padx=45, pady=(0, 16))

    def toggle_password(self):
        if self.password_entry.cget("show") == "*":
            self.password_entry.configure(show="")
        else:
            self.password_entry.configure(show="*")

    def login(self):
        username = self.username_entry.get()
        password = self.password_entry.get()
        success, msg = self.user_manager.login(username, password)
        if success:
            self.error_label.configure(text="")
            self.on_login_success(self.user_manager.current_user)
        else:
            self.error_label.configure(text=msg, text_color="#ef4444")

    def register(self):
        username = self.username_entry.get()
        password = self.password_entry.get()
        if not username or not password:
            self.error_label.configure(text="Please fill in both fields.", text_color="#ef4444")
            return
            
        success, msg = self.user_manager.register(username, password)
        if success:
            self.error_label.configure(text="Registration successful! You can now sign in.", text_color="#22c55e")
        else:
            self.error_label.configure(text=msg, text_color="#ef4444")

import customtkinter as ctk
from models.user import UserManager

class LoginFrame(ctk.CTkFrame):
    def __init__(self, master, on_login_success, user_manager=None):
        super().__init__(master, fg_color="#000000") # Pure black background
        self.on_login_success = on_login_success
        self.user_manager = user_manager if user_manager is not None else UserManager()

        # Center wrapper to keep logo and login/register box close together and centered
        self.center_wrapper = ctk.CTkFrame(self, fg_color="transparent")
        self.center_wrapper.place(relx=0.5, rely=0.5, anchor="center")

        # Top App Header (Badge Icon + Title sitting close right above the card)
        self.header_frame = ctk.CTkFrame(self.center_wrapper, fg_color="transparent")
        self.header_frame.pack(pady=(0, 16))

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

        # Main Card Box Container
        self.card_box = ctk.CTkFrame(
            self.center_wrapper, 
            fg_color="#080808",
            border_color="#262626", 
            border_width=1,
            corner_radius=14,
            width=480,
            height=490
        )
        self.card_box.pack()
        self.card_box.pack_propagate(False)

        # Dynamic inner container that toggles between Login and Register views
        self.form_container = ctk.CTkFrame(self.card_box, fg_color="transparent")
        self.form_container.pack(fill="both", expand=True)

        # Start with login view
        self.show_login_view()

    def toggle_eye(self, entry):
        if entry.cget("show") == "*":
            entry.configure(show="")
        else:
            entry.configure(show="*")

    def show_login_view(self, prefill_email="", status_msg="", status_color="#22c55e"):
        # Clear existing form widgets
        for widget in self.form_container.winfo_children():
            widget.destroy()

        self.card_box.configure(height=490)

        # Title & Subtitle
        self.title_label = ctk.CTkLabel(
            self.form_container, 
            text="Welcome back", 
            font=ctk.CTkFont(size=26, weight="bold"),
            text_color="white"
        )
        self.title_label.pack(pady=(32, 4))

        self.subtitle_label = ctk.CTkLabel(
            self.form_container, 
            text="Sign in with your account credentials.", 
            font=ctk.CTkFont(size=13),
            text_color="#71717a"
        )
        self.subtitle_label.pack(pady=(0, 20))

        # Email / Username Field
        self.user_label = ctk.CTkLabel(
            self.form_container, 
            text="Email Address", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color="white"
        )
        self.user_label.pack(anchor="w", padx=45, pady=(0, 6))

        self.login_ident_entry = ctk.CTkEntry(
            self.form_container, 
            placeholder_text="akosirene@example", 
            height=44, 
            corner_radius=8,
            fg_color="#e8f0fe",
            border_color="#64748b",
            border_width=1.5,
            text_color="#000000",
            placeholder_text_color="#64748b",
            font=ctk.CTkFont(size=14)
        )
        self.login_ident_entry.pack(fill="x", padx=45, pady=(0, 16))
        if prefill_email:
            self.login_ident_entry.insert(0, prefill_email)
        self.login_ident_entry.bind("<Return>", lambda e: self.do_login())

        # Password Field
        self.pass_label = ctk.CTkLabel(
            self.form_container, 
            text="Password", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color="white"
        )
        self.pass_label.pack(anchor="w", padx=45, pady=(0, 6))

        # Direct CTkEntry with complete, continuous border
        self.login_pass_entry = ctk.CTkEntry(
            self.form_container,
            placeholder_text="••••••••",
            show="*",
            height=44,
            corner_radius=8,
            fg_color="#e8f0fe",
            border_color="#64748b",
            border_width=1.5,
            text_color="#000000",
            placeholder_text_color="#64748b",
            font=ctk.CTkFont(size=14)
        )
        self.login_pass_entry.pack(fill="x", padx=45, pady=(0, 4))
        self.login_pass_entry.bind("<Return>", lambda e: self.do_login())
        try:
            self.login_pass_entry._entry.grid_configure(padx=(12, 38))
        except Exception:
            pass

        # Eye toggle placed inside entry on the right side
        self.login_eye_btn = ctk.CTkButton(
            self.login_pass_entry,
            text="👁",
            width=28,
            height=28,
            fg_color="transparent",
            text_color="#4b5563",
            hover_color="#dbeafe",
            font=ctk.CTkFont(size=14),
            command=lambda: self.toggle_eye(self.login_pass_entry)
        )
        self.login_eye_btn.place(relx=1.0, rely=0.5, x=-6, anchor="e")

        # Status / Error Label
        self.status_label = ctk.CTkLabel(
            self.form_container, 
            text=status_msg, 
            text_color=status_color, 
            font=ctk.CTkFont(size=12)
        )
        self.status_label.pack(pady=(4, 6))

        # Sign In Button
        self.login_button = ctk.CTkButton(
            self.form_container, 
            text="→ Sign In", 
            height=44,
            corner_radius=8,
            fg_color="#ffffff",
            text_color="#000000",
            hover_color="#e2e8f0",
            font=ctk.CTkFont(size=14, weight="bold"),
            command=self.do_login
        )
        self.login_button.pack(fill="x", padx=45, pady=(4, 12))

        # Bottom Link: Switch to Register Form
        self.to_register_btn = ctk.CTkButton(
            self.form_container, 
            text="Don't have an account? Sign up", 
            height=32,
            fg_color="transparent",
            text_color="#9ca3af",
            hover_color="#18181b",
            font=ctk.CTkFont(size=12),
            command=self.show_register_view
        )
        self.to_register_btn.pack(fill="x", padx=45, pady=(0, 16))

    def show_register_view(self):
        # Clear existing form widgets
        for widget in self.form_container.winfo_children():
            widget.destroy()

        self.card_box.configure(height=560)

        # Title & Subtitle
        self.reg_title = ctk.CTkLabel(
            self.form_container, 
            text="Create an account", 
            font=ctk.CTkFont(size=26, weight="bold"),
            text_color="white"
        )
        self.reg_title.pack(pady=(28, 4))

        self.reg_subtitle = ctk.CTkLabel(
            self.form_container, 
            text="Sign up with your name, email, and password.", 
            font=ctk.CTkFont(size=13),
            text_color="#71717a"
        )
        self.reg_subtitle.pack(pady=(0, 16))

        # 1. Full Name Field
        self.reg_name_label = ctk.CTkLabel(
            self.form_container, 
            text="Full Name", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color="white"
        )
        self.reg_name_label.pack(anchor="w", padx=45, pady=(0, 4))

        self.reg_name_entry = ctk.CTkEntry(
            self.form_container, 
            placeholder_text="Enter your full name", 
            height=40, 
            corner_radius=8,
            fg_color="#e8f0fe",
            border_color="#64748b",
            border_width=1.5,
            text_color="#000000",
            placeholder_text_color="#64748b",
            font=ctk.CTkFont(size=14)
        )
        self.reg_name_entry.pack(fill="x", padx=45, pady=(0, 10))
        self.reg_name_entry.bind("<Return>", lambda e: self.do_register())

        # 2. Email Address Field
        self.reg_email_label = ctk.CTkLabel(
            self.form_container, 
            text="Email Address", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color="white"
        )
        self.reg_email_label.pack(anchor="w", padx=45, pady=(0, 4))

        self.reg_email_entry = ctk.CTkEntry(
            self.form_container, 
            placeholder_text="example@akosirene", 
            height=40, 
            corner_radius=8,
            fg_color="#e8f0fe",
            border_color="#64748b",
            border_width=1.5,
            text_color="#000000",
            placeholder_text_color="#64748b",
            font=ctk.CTkFont(size=14)
        )
        self.reg_email_entry.pack(fill="x", padx=45, pady=(0, 10))
        self.reg_email_entry.bind("<Return>", lambda e: self.do_register())

        # 3. Password Field
        self.reg_pass_label = ctk.CTkLabel(
            self.form_container, 
            text="Password", 
            font=ctk.CTkFont(size=13, weight="bold"), 
            text_color="white"
        )
        self.reg_pass_label.pack(anchor="w", padx=45, pady=(0, 4))

        # Direct CTkEntry with complete, continuous border
        self.reg_pass_entry = ctk.CTkEntry(
            self.form_container,
            placeholder_text="••••••••",
            show="*",
            height=40,
            corner_radius=8,
            fg_color="#e8f0fe",
            border_color="#64748b",
            border_width=1.5,
            text_color="#000000",
            placeholder_text_color="#64748b",
            font=ctk.CTkFont(size=14)
        )
        self.reg_pass_entry.pack(fill="x", padx=45, pady=(0, 4))
        self.reg_pass_entry.bind("<Return>", lambda e: self.do_register())
        try:
            self.reg_pass_entry._entry.grid_configure(padx=(12, 38))
        except Exception:
            pass

        # Eye toggle placed inside entry on the right side
        self.reg_eye_btn = ctk.CTkButton(
            self.reg_pass_entry,
            text="👁",
            width=28,
            height=28,
            fg_color="transparent",
            text_color="#4b5563",
            hover_color="#dbeafe",
            font=ctk.CTkFont(size=14),
            command=lambda: self.toggle_eye(self.reg_pass_entry)
        )
        self.reg_eye_btn.place(relx=1.0, rely=0.5, x=-6, anchor="e")

        # Status / Error Label
        self.reg_status_label = ctk.CTkLabel(
            self.form_container, 
            text="", 
            text_color="#ef4444", 
            font=ctk.CTkFont(size=12)
        )
        self.reg_status_label.pack(pady=(2, 4))

        # Create Account Button
        self.reg_button = ctk.CTkButton(
            self.form_container, 
            text="→ Create Account", 
            height=44,
            corner_radius=8,
            fg_color="#ffffff",
            text_color="#000000",
            hover_color="#e2e8f0",
            font=ctk.CTkFont(size=14, weight="bold"),
            command=self.do_register
        )
        self.reg_button.pack(fill="x", padx=45, pady=(4, 10))

        # Switch back to Login Button
        self.to_login_btn = ctk.CTkButton(
            self.form_container, 
            text="Already have an account? Sign in", 
            height=32,
            fg_color="transparent",
            text_color="#9ca3af",
            hover_color="#18181b",
            font=ctk.CTkFont(size=12),
            command=self.show_login_view
        )
        self.to_login_btn.pack(fill="x", padx=45, pady=(0, 16))

    def do_login(self):
        ident = self.login_ident_entry.get().strip()
        password = self.login_pass_entry.get()
        if not ident or not password:
            self.status_label.configure(text="Please fill in both fields.", text_color="#ef4444")
            return

        success, msg = self.user_manager.login(ident, password)
        if success:
            self.status_label.configure(text="")
            self.on_login_success(self.user_manager.current_user)
        else:
            self.status_label.configure(text=msg, text_color="#ef4444")

    def do_register(self):
        name = self.reg_name_entry.get().strip()
        email = self.reg_email_entry.get().strip()
        password = self.reg_pass_entry.get()

        if not name or not email or not password:
            self.reg_status_label.configure(text="Please fill in all fields (Name, Email, Password).", text_color="#ef4444")
            return

        if "@" not in email or "." not in email:
            self.reg_status_label.configure(text="Please enter a valid email address.", text_color="#ef4444")
            return

        success, msg = self.user_manager.register(name, email, password)
        if success:
            # Switch to login view with email prefilled and green success banner
            self.show_login_view(prefill_email=email, status_msg="Account created successfully! Please sign in.", status_color="#22c55e")
        else:
            self.reg_status_label.configure(text=msg, text_color="#ef4444")

    # Compatibility aliases
    login = do_login
    register = do_register

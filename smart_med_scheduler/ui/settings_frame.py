import customtkinter as ctk

class SettingsFrame(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="#0d0f17")
        self.current_user = None

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Content Box
        self.content = ctk.CTkFrame(
            self,
            fg_color="#161926",
            border_color="#24293e",
            border_width=1,
            corner_radius=14
        )
        self.content.grid(row=0, column=0, sticky="nsew", padx=20, pady=10)

        # Preferences Section
        ctk.CTkLabel(
            self.content, 
            text="Appearance & Theme", 
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color="#ffffff"
        ).pack(anchor="w", padx=24, pady=(24, 6))

        ctk.CTkLabel(
            self.content, 
            text="Toggle between high-contrast dark mode and light theme.", 
            font=ctk.CTkFont(size=12),
            text_color="#64748b"
        ).pack(anchor="w", padx=24, pady=(0, 12))

        # Theme Switch
        self.theme_switch = ctk.CTkSwitch(
            self.content, 
            text="Dark Mode", 
            command=self.toggle_theme,
            progress_color="#7c3aed"
        )
        self.theme_switch.pack(anchor="w", padx=24, pady=(0, 24))
        self.theme_switch.select() # Default to dark

        # Account Section
        ctk.CTkLabel(
            self.content, 
            text="Account Information", 
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color="#ffffff"
        ).pack(anchor="w", padx=24, pady=(10, 6))

        self.user_lbl = ctk.CTkLabel(
            self.content, 
            text="Logged in as: -", 
            font=ctk.CTkFont(size=13),
            text_color="#94a3b8"
        )
        self.user_lbl.pack(anchor="w", padx=24, pady=(0, 6))

        self.role_lbl = ctk.CTkLabel(
            self.content, 
            text="Role: Registered Patient", 
            font=ctk.CTkFont(size=12),
            text_color="#64748b"
        )
        self.role_lbl.pack(anchor="w", padx=24, pady=(0, 16))

    def refresh(self, user):
        self.current_user = user
        display_name = user.name if hasattr(user, "name") and user.name else user.username
        email_info = f" ({user.email})" if hasattr(user, "email") and user.email else ""
        self.user_lbl.configure(text=f"Logged in as: {display_name}{email_info}")

    def toggle_theme(self):
        if self.theme_switch.get() == 1:
            ctk.set_appearance_mode("Dark")
        else:
            ctk.set_appearance_mode("Light")

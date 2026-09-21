import customtkinter as ctk

class SettingsFrame(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.current_user = None

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Header
        self.header = ctk.CTkFrame(self, fg_color="transparent")
        self.header.grid(row=0, column=0, sticky="ew", padx=20, pady=(20, 0))
        ctk.CTkLabel(self.header, text="Settings", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")

        # Content Box
        self.content = ctk.CTkFrame(self)
        self.content.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)

        ctk.CTkLabel(self.content, text="Preferences", font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=20, pady=(20, 10))

        # Theme Switch
        self.theme_switch = ctk.CTkSwitch(self.content, text="Dark Mode", command=self.toggle_theme)
        self.theme_switch.pack(anchor="w", padx=20, pady=10)
        self.theme_switch.select() # Default to dark

        # Account Section
        ctk.CTkLabel(self.content, text="Account Details", font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=20, pady=(30, 10))
        
        self.user_lbl = ctk.CTkLabel(self.content, text="Logged in as: ", font=ctk.CTkFont(size=14))
        self.user_lbl.pack(anchor="w", padx=20, pady=10)

    def refresh(self, user):
        self.current_user = user
        self.user_lbl.configure(text=f"Logged in as: {user.username}")

    def toggle_theme(self):
        if self.theme_switch.get() == 1:
            ctk.set_appearance_mode("Dark")
        else:
            ctk.set_appearance_mode("Light")

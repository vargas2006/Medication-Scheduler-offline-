import customtkinter as ctk
from tkinter import filedialog
from PIL import Image
from models.medication import InventoryManager
from models.schedule import DoseAlert
from ui.skeleton import SkeletonManager
import os

class MedicationFrame(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.inventory = InventoryManager()
        self.dose_alert = DoseAlert()
        self.current_user = None
        self.selected_image_path = None
        self.image_cache = {}
        self.loaded_user_id = None
        self.is_loaded = False

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure((0, 1), weight=1)

        # Form Frame
        self.form_frame = ctk.CTkFrame(
            self, 
            fg_color="#161926", 
            border_color="#24293e", 
            border_width=1, 
            corner_radius=14
        )
        self.form_frame.grid(row=0, column=0, sticky="nsew", padx=(20, 10), pady=10)

        ctk.CTkLabel(self.form_frame, text="Add New Drug", font=ctk.CTkFont(size=18, weight="bold")).grid(row=0, column=0, columnspan=2, pady=15)
        
        # Image Upload
        self.img_lbl = ctk.CTkLabel(self.form_frame, text="No Image", width=100, height=100, fg_color="#333333", corner_radius=10)
        self.img_lbl.grid(row=1, column=0, padx=10, pady=10, rowspan=2)
        
        self.upload_btn = ctk.CTkButton(self.form_frame, text="Upload Image", width=120, command=self.upload_image)
        self.upload_btn.grid(row=1, column=1, padx=10, pady=10, sticky="sw")

        self.clear_btn = ctk.CTkButton(self.form_frame, text="Clear Image", width=120, fg_color="transparent", border_width=1, command=self.clear_image)
        self.clear_btn.grid(row=2, column=1, padx=10, pady=5, sticky="nw")

        # Fields
        form_start_row = 3
        
        ctk.CTkLabel(self.form_frame, text="Name:").grid(row=form_start_row, column=0, padx=10, pady=5, sticky="e")
        self.name_entry = ctk.CTkEntry(self.form_frame)
        self.name_entry.grid(row=form_start_row, column=1, padx=10, pady=5, sticky="w")

        ctk.CTkLabel(self.form_frame, text="Dosage:").grid(row=form_start_row+1, column=0, padx=10, pady=5, sticky="e")
        self.dosage_entry = ctk.CTkEntry(self.form_frame)
        self.dosage_entry.grid(row=form_start_row+1, column=1, padx=10, pady=5, sticky="w")

        ctk.CTkLabel(self.form_frame, text="Stock Count:").grid(row=form_start_row+2, column=0, padx=10, pady=5, sticky="e")
        self.stock_entry = ctk.CTkEntry(self.form_frame)
        self.stock_entry.grid(row=form_start_row+2, column=1, padx=10, pady=5, sticky="w")

        ctk.CTkLabel(self.form_frame, text="Refill Alert At:").grid(row=form_start_row+3, column=0, padx=10, pady=5, sticky="e")
        self.threshold_entry = ctk.CTkEntry(self.form_frame)
        self.threshold_entry.grid(row=form_start_row+3, column=1, padx=10, pady=5, sticky="w")

        ctk.CTkLabel(self.form_frame, text="Schedule Type:").grid(row=form_start_row+4, column=0, padx=10, pady=5, sticky="e")
        self.sched_type = ctk.CTkOptionMenu(self.form_frame, values=["DAILY_TIME", "INTERVAL"])
        self.sched_type.grid(row=form_start_row+4, column=1, padx=10, pady=5, sticky="w")

        ctk.CTkLabel(self.form_frame, text="Time/Interval:").grid(row=form_start_row+5, column=0, padx=10, pady=5, sticky="e")
        self.time_entry = ctk.CTkEntry(self.form_frame, placeholder_text="e.g. 08:00 or 6")
        self.time_entry.grid(row=form_start_row+5, column=1, padx=10, pady=5, sticky="w")

        self.add_btn = ctk.CTkButton(
            self.form_frame, 
            text="Save Medication", 
            height=38, 
            corner_radius=8, 
            fg_color="#7c3aed", 
            hover_color="#6d28d9", 
            font=ctk.CTkFont(weight="bold"), 
            command=self.add_medication
        )
        self.add_btn.grid(row=form_start_row+6, column=0, columnspan=2, pady=25)

        # List Frame
        self.list_frame = ctk.CTkScrollableFrame(
            self, 
            label_text="Your Drugs", 
            fg_color="#161926"
        )
        self.list_frame.grid(row=0, column=1, sticky="nsew", padx=(0, 20), pady=10)
        self.skeleton_mgr = SkeletonManager(self.list_frame)

    def upload_image(self):
        filepath = filedialog.askopenfilename(
            title="Select Drug Image",
            filetypes=(("Image files", "*.png *.jpg *.jpeg"), ("All files", "*.*"))
        )
        if filepath:
            self.selected_image_path = filepath
            try:
                img = Image.open(filepath)
                ctk_img = ctk.CTkImage(light_image=img, dark_image=img, size=(100, 100))
                self.img_lbl.configure(image=ctk_img, text="")
            except Exception as e:
                self.img_lbl.configure(text="Error loading")

    def clear_image(self):
        self.selected_image_path = None
        self.img_lbl.configure(image=None, text="No Image")

    def refresh(self, user, force=False):
        self.current_user = user
        if not force and self.is_loaded and self.loaded_user_id == user.user_id:
            return
        self.load_medications()
        self.loaded_user_id = user.user_id
        self.is_loaded = True

    def create_med_card(self, med):
        f = ctk.CTkFrame(
            self.list_frame, 
            fg_color="#1c2033", 
            border_color="#282f47", 
            border_width=1, 
            corner_radius=10
        )
        f._med_id = med.med_id
        
        # Display Image if exists
        img_container = ctk.CTkLabel(f, text="Img", width=50, height=50, fg_color="#333333", corner_radius=5)
        img_container.pack(side="left", padx=10, pady=10)
        
        if med.image_path and os.path.exists(med.image_path):
            if med.image_path not in self.image_cache:
                try:
                    img = Image.open(med.image_path)
                    self.image_cache[med.image_path] = ctk.CTkImage(light_image=img, dark_image=img, size=(50, 50))
                except Exception:
                    self.image_cache[med.image_path] = None
            
            ctk_img = self.image_cache.get(med.image_path)
            if ctk_img:
                img_container.configure(image=ctk_img, text="")
        
        info_frame = ctk.CTkFrame(f, fg_color="transparent")
        info_frame.pack(side="left", padx=10, fill="y")
        
        ctk.CTkLabel(info_frame, text=med.name, font=ctk.CTkFont(weight="bold")).pack(anchor="w")
        ctk.CTkLabel(info_frame, text=f"{med.dosage} | Stock: {med.stock}", text_color="gray").pack(anchor="w")

        ctk.CTkButton(f, text="Del", fg_color="#DC143C", hover_color="#8B0000", width=40,
                      command=lambda m=med.med_id: self.delete_medication(m)).pack(side="right", padx=15)
        
        return f

    def load_medications(self):
        self.skeleton_mgr.stop()
        if not hasattr(self, "med_cards"):
            self.med_cards = {}
        
        meds = self.inventory.get_user_medications(self.current_user.user_id)
        display_meds = meds[:60]
        
        existing_children = [w for w in self.list_frame.winfo_children() if hasattr(w, "_med_id")]
        
        # If we have existing cards, reuse/update or sync cleanly
        new_card_dict = {}
        for i, med in enumerate(display_meds):
            if med.med_id in self.med_cards and self.med_cards[med.med_id].winfo_exists():
                card = self.med_cards[med.med_id]
                new_card_dict[med.med_id] = card
            else:
                card = self.create_med_card(med)
                card._med_id = med.med_id
                card.pack(fill="x", pady=5)
                new_card_dict[med.med_id] = card
        
        # Remove cards no longer in display_meds
        for med_id, card in list(self.med_cards.items()):
            if med_id not in new_card_dict:
                if card.winfo_exists():
                    card.destroy()
        
        # Also clean up any orphan children without _med_id
        for w in self.list_frame.winfo_children():
            if not hasattr(w, "_med_id"):
                w.destroy()

        self.med_cards = new_card_dict

    def add_medication(self):
        if not self.current_user:
            return

        try:
            stock = int(self.stock_entry.get())
            threshold = int(self.threshold_entry.get())
        except ValueError:
            return
            
        med_id = self.inventory.add_medication(
            self.current_user.user_id,
            self.name_entry.get(),
            self.dosage_entry.get(),
            stock,
            threshold,
            self.selected_image_path
        )
        
        self.dose_alert.add_schedule(med_id, self.sched_type.get(), self.time_entry.get())
        
        # In-place single item insertion (React-style 0ms diff update)
        from models.medication import Medication
        new_med = Medication(
            med_id, self.current_user.user_id, self.name_entry.get(),
            self.dosage_entry.get(), stock, threshold, self.selected_image_path
        )
        card = self.create_med_card(new_med)
        card.pack(fill="x", pady=5)
        if not hasattr(self, "med_cards"):
            self.med_cards = {}
        self.med_cards[med_id] = card

        # Invalidate DashboardFrame cache so metrics update on next visit
        try:
            app = self.winfo_toplevel()
            if hasattr(app, "content_frames"):
                dash = app.content_frames.get("DashboardFrame")
                if dash and hasattr(dash, "is_loaded"):
                    dash.is_loaded = False
        except Exception:
            pass

        # Clear entries
        self.name_entry.delete(0, 'end')
        self.dosage_entry.delete(0, 'end')
        self.stock_entry.delete(0, 'end')
        self.threshold_entry.delete(0, 'end')
        self.time_entry.delete(0, 'end')
        self.clear_image()

    def delete_medication(self, med_id):
        if not self.current_user:
            return
        self.inventory.delete_medication(med_id)
        
        # Invalidate DashboardFrame cache so metrics update on next visit
        try:
            app = self.winfo_toplevel()
            if hasattr(app, "content_frames"):
                dash = app.content_frames.get("DashboardFrame")
                if dash and hasattr(dash, "is_loaded"):
                    dash.is_loaded = False
        except Exception:
            pass

        # In-place single item removal (React-style 0ms diff update)
        if hasattr(self, "med_cards") and med_id in self.med_cards:
            self.med_cards[med_id].destroy()
            del self.med_cards[med_id]
        else:
            self.refresh(self.current_user, force=True)

import customtkinter as ctk
from models.schedule import DoseAlert
from models.medication import InventoryManager
from models.history import ReportGenerator
from ui.skeleton import SkeletonManager
from datetime import datetime, timedelta

class DashboardFrame(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="#0d0f17")
        
        self.dose_alert = DoseAlert()
        self.inventory_manager = InventoryManager()
        self.report_generator = ReportGenerator()
        self.current_user = None
        self.loaded_user_id = None
        self.is_loaded = False

        # Scrollable outer container so on smaller screen sizes everything fits cleanly
        self.scroll_container = ctk.CTkScrollableFrame(self, fg_color="#0d0f17")
        self.scroll_container.pack(fill="both", expand=True, padx=16, pady=12)

        # 2. Stats Row (4 Metric Cards matching reference image styling)
        self.stats_grid = ctk.CTkFrame(self.scroll_container, fg_color="transparent")
        self.stats_grid.pack(fill="x", pady=(0, 16))
        self.stats_grid.grid_columnconfigure((0, 1, 2, 3), weight=1, uniform="stat_col")

        # Card 1: Vibrant Purple Card (Total Medications)
        self.card1 = ctk.CTkFrame(
            self.stats_grid, 
            fg_color="#6b21a8", 
            border_color="#9333ea", 
            border_width=1, 
            corner_radius=14, 
            height=110
        )
        self.card1.grid(row=0, column=0, padx=(0, 8), sticky="ew")
        self.card1.pack_propagate(False)

        ctk.CTkLabel(
            self.card1, 
            text="Active Medications", 
            font=ctk.CTkFont(size=12, weight="bold"), 
            text_color="#e9d5ff"
        ).pack(anchor="w", padx=16, pady=(14, 2))
        self.lbl_total_meds = ctk.CTkLabel(
            self.card1, 
            text="0", 
            font=ctk.CTkFont(size=30, weight="bold"), 
            text_color="#ffffff"
        )
        self.lbl_total_meds.pack(anchor="w", padx=16)
        ctk.CTkLabel(
            self.card1, 
            text="● In Active Inventory", 
            font=ctk.CTkFont(size=10), 
            text_color="#d8b4fe"
        ).pack(anchor="w", padx=16, pady=(0, 12))

        # Card 2: Vibrant Cyan Card (Adherence Rate)
        self.card2 = ctk.CTkFrame(
            self.stats_grid, 
            fg_color="#0e7490", 
            border_color="#06b6d4", 
            border_width=1, 
            corner_radius=14, 
            height=110
        )
        self.card2.grid(row=0, column=1, padx=8, sticky="ew")
        self.card2.pack_propagate(False)

        ctk.CTkLabel(
            self.card2, 
            text="Adherence Rate", 
            font=ctk.CTkFont(size=12, weight="bold"), 
            text_color="#cffafe"
        ).pack(anchor="w", padx=16, pady=(14, 2))
        self.lbl_adherence = ctk.CTkLabel(
            self.card2, 
            text="100%", 
            font=ctk.CTkFont(size=30, weight="bold"), 
            text_color="#ffffff"
        )
        self.lbl_adherence.pack(anchor="w", padx=16)
        ctk.CTkLabel(
            self.card2, 
            text="● Daily On-Schedule", 
            font=ctk.CTkFont(size=10), 
            text_color="#a5f3fc"
        ).pack(anchor="w", padx=16, pady=(0, 12))

        # Card 3: Dark Card with Alert Badge (Low Stock)
        self.card3 = ctk.CTkFrame(
            self.stats_grid, 
            fg_color="#161926", 
            border_color="#24293e", 
            border_width=1, 
            corner_radius=14, 
            height=110
        )
        self.card3.grid(row=0, column=2, padx=8, sticky="ew")
        self.card3.pack_propagate(False)

        card3_top = ctk.CTkFrame(self.card3, fg_color="transparent")
        card3_top.pack(fill="x", padx=16, pady=(14, 2))
        ctk.CTkLabel(
            card3_top, 
            text="Low Stock Alerts", 
            font=ctk.CTkFont(size=12, weight="bold"), 
            text_color="#94a3b8"
        ).pack(side="left")
        self.card3_badge = ctk.CTkLabel(
            card3_top, 
            text="Status", 
            font=ctk.CTkFont(size=9, weight="bold"), 
            text_color="#10b981", 
            fg_color="#102d24", 
            corner_radius=4, 
            padx=6, 
            pady=2
        )
        self.card3_badge.pack(side="right")

        self.lbl_low_stock = ctk.CTkLabel(
            self.card3, 
            text="0", 
            font=ctk.CTkFont(size=30, weight="bold"), 
            text_color="#ffffff"
        )
        self.lbl_low_stock.pack(anchor="w", padx=16)
        ctk.CTkLabel(
            self.card3, 
            text="Items below threshold", 
            font=ctk.CTkFont(size=10), 
            text_color="#64748b"
        ).pack(anchor="w", padx=16, pady=(0, 12))

        # Card 4: Dark Card (Total Doses Logged)
        self.card4 = ctk.CTkFrame(
            self.stats_grid, 
            fg_color="#161926", 
            border_color="#24293e", 
            border_width=1, 
            corner_radius=14, 
            height=110
        )
        self.card4.grid(row=0, column=3, padx=(8, 0), sticky="ew")
        self.card4.pack_propagate(False)

        card4_top = ctk.CTkFrame(self.card4, fg_color="transparent")
        card4_top.pack(fill="x", padx=16, pady=(14, 2))
        ctk.CTkLabel(
            card4_top, 
            text="Doses Logged", 
            font=ctk.CTkFont(size=12, weight="bold"), 
            text_color="#94a3b8"
        ).pack(side="left")
        ctk.CTkLabel(
            card4_top, 
            text="HISTORY", 
            font=ctk.CTkFont(size=9, weight="bold"), 
            text_color="#38bdf8", 
            fg_color="#10273f", 
            corner_radius=4, 
            padx=6, 
            pady=2
        ).pack(side="right")

        self.lbl_doses_taken = ctk.CTkLabel(
            self.card4, 
            text="0", 
            font=ctk.CTkFont(size=30, weight="bold"), 
            text_color="#ffffff"
        )
        self.lbl_doses_taken.pack(anchor="w", padx=16)
        ctk.CTkLabel(
            self.card4, 
            text="Total completed doses", 
            font=ctk.CTkFont(size=10), 
            text_color="#64748b"
        ).pack(anchor="w", padx=16, pady=(0, 12))

        # 3. Middle Section: Due Right Now (Left) & Weekly Adherence Chart (Right)
        self.middle_grid = ctk.CTkFrame(self.scroll_container, fg_color="transparent")
        self.middle_grid.pack(fill="x", pady=(0, 16))
        self.middle_grid.grid_columnconfigure(0, weight=6)
        self.middle_grid.grid_columnconfigure(1, weight=4)

        # Left: Due Right Now Card (Fixed height 280px)
        self.due_container = ctk.CTkFrame(
            self.middle_grid, 
            fg_color="#161926", 
            border_color="#24293e", 
            border_width=1, 
            corner_radius=14, 
            height=280
        )
        self.due_container.grid(row=0, column=0, padx=(0, 8), sticky="nsew")
        self.due_container.pack_propagate(False)

        # Header for Due Card
        self.due_header = ctk.CTkFrame(self.due_container, fg_color="transparent")
        self.due_header.pack(fill="x", padx=18, pady=(14, 10))

        due_title_box = ctk.CTkFrame(self.due_header, fg_color="transparent")
        due_title_box.pack(side="left")
        ctk.CTkLabel(
            due_title_box, 
            text="🔔 Due Right Now", 
            font=ctk.CTkFont(size=16, weight="bold"), 
            text_color="#ffffff"
        ).pack(side="left")

        self.due_count_badge = ctk.CTkLabel(
            self.due_header, 
            text="0 Due", 
            font=ctk.CTkFont(size=10, weight="bold"), 
            text_color="#a855f7", 
            fg_color="#2c1a45", 
            corner_radius=6, 
            padx=8, 
            pady=3
        )
        self.due_count_badge.pack(side="right")

        # Scrollable list for Due Items with solid matching background #161926
        self.due_scroll = ctk.CTkScrollableFrame(self.due_container, fg_color="#161926")
        self.due_scroll.pack(fill="both", expand=True, padx=14, pady=(0, 10))

        # Right: Weekly Dose Adherence Chart (Fixed height 280px)
        self.chart_container = ctk.CTkFrame(
            self.middle_grid, 
            fg_color="#161926", 
            border_color="#24293e", 
            border_width=1, 
            corner_radius=14, 
            height=280
        )
        self.chart_container.grid(row=0, column=1, padx=(8, 0), sticky="nsew")
        self.chart_container.pack_propagate(False)

        # Header for Chart Card
        self.chart_header = ctk.CTkFrame(self.chart_container, fg_color="transparent")
        self.chart_header.pack(fill="x", padx=18, pady=(14, 6))

        ctk.CTkLabel(
            self.chart_header, 
            text="📊 Weekly Intake Adherence", 
            font=ctk.CTkFont(size=15, weight="bold"), 
            text_color="#ffffff"
        ).pack(side="left")

        ctk.CTkLabel(
            self.chart_header, 
            text="Mon - Sun", 
            font=ctk.CTkFont(size=10, weight="bold"), 
            text_color="#38bdf8", 
            fg_color="#10273f", 
            corner_radius=6, 
            padx=8, 
            pady=3
        ).pack(side="right")

        # Canvas for Drawing the Vertical Bar Chart
        self.chart_canvas = ctk.CTkCanvas(
            self.chart_container, 
            bg="#161926", 
            highlightthickness=0
        )
        self.chart_canvas.pack(fill="both", expand=True, padx=16, pady=(4, 12))
        self.chart_canvas.bind("<Configure>", lambda e: self.redraw_chart())

        self.weekly_data = [0, 0, 0, 0, 0, 0, 0] # Mon to Sun counts

        # 4. Bottom Section: Recent Activity Log (Fixed height 220px)
        self.recent_container = ctk.CTkFrame(
            self.scroll_container, 
            fg_color="#161926", 
            border_color="#24293e", 
            border_width=1, 
            corner_radius=14, 
            height=220
        )
        self.recent_container.pack(fill="x", pady=(0, 16))
        self.recent_container.pack_propagate(False)

        # Header for Recent Activity
        self.recent_header = ctk.CTkFrame(self.recent_container, fg_color="transparent")
        self.recent_header.pack(fill="x", padx=18, pady=(14, 10))

        ctk.CTkLabel(
            self.recent_header, 
            text="📜 Recent Activity Log", 
            font=ctk.CTkFont(size=15, weight="bold"), 
            text_color="#ffffff"
        ).pack(side="left")

        ctk.CTkLabel(
            self.recent_header, 
            text="Latest Logs", 
            font=ctk.CTkFont(size=10, weight="bold"), 
            text_color="#94a3b8", 
            fg_color="#1e2438", 
            corner_radius=6, 
            padx=8, 
            pady=3
        ).pack(side="right")

        # Scrollable list for Recent Logs with solid matching background #161926
        self.recent_scroll = ctk.CTkScrollableFrame(self.recent_container, fg_color="#161926")
        self.recent_scroll.pack(fill="both", expand=True, padx=14, pady=(0, 10))

        # Skeleton loading managers
        self.due_skeleton_mgr = SkeletonManager(self.due_scroll)
        self.recent_skeleton_mgr = SkeletonManager(self.recent_scroll)

    def redraw_chart(self):
        w = self.chart_canvas.winfo_width()
        h = self.chart_canvas.winfo_height()
        if w <= 10 or h <= 10:
            return

        self.chart_canvas.delete("all")

        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        values = self.weekly_data
        max_val = max(max(values), 4)

        chart_bottom = h - 26
        chart_top = 18
        chart_height = chart_bottom - chart_top

        # Horizontal grid line
        self.chart_canvas.create_line(10, chart_bottom, w - 10, chart_bottom, fill="#252b40", width=1)
        self.chart_canvas.create_line(10, chart_top + chart_height // 2, w - 10, chart_top + chart_height // 2, fill="#1c2133", dash=(2, 4), width=1)

        slot_width = (w - 20) / len(days)
        bar_width = min(22, max(12, int(slot_width * 0.45)))

        bar_colors = ["#38bdf8", "#06b6d4", "#22d3ee", "#818cf8", "#a855f7", "#c084fc", "#06b6d4"]

        for i, (day, val) in enumerate(zip(days, values)):
            cx = 10 + (i + 0.5) * slot_width
            x0 = cx - bar_width / 2
            x1 = cx + bar_width / 2

            bar_h = (val / max_val) * chart_height if max_val > 0 else 0
            if val == 0:
                bar_h = 6
                fill_color = "#1f2438"
            else:
                fill_color = bar_colors[i % len(bar_colors)]

            y1 = chart_bottom
            y0 = chart_bottom - bar_h

            self.chart_canvas.create_rectangle(x0, y0, x1, y1, fill=fill_color, width=0)

            self.chart_canvas.create_text(
                cx, 
                h - 10, 
                text=day, 
                fill="#64748b", 
                font=("Arial", 9)
            )

    def refresh(self, user, force=False):
        self.current_user = user
        
        if not force and self.is_loaded and self.loaded_user_id == user.user_id:
            return

        self.fetch_data()
        self.loaded_user_id = user.user_id
        self.is_loaded = True

    def fetch_data(self):
        meds = self.inventory_manager.get_user_medications(self.current_user.user_id)
        due_meds = self.dose_alert.get_due_medications(self.current_user.user_id)
        history = self.report_generator.get_user_history(self.current_user.user_id)

        total_meds = len(meds)
        low_stock = sum(1 for m in meds if m.is_low_stock())
        doses_taken = len([h for h in history if h.status == 'TAKEN'])

        # Calculate weekly intake numbers (Mon to Sun)
        weekly_counts = [0] * 7
        for log in history:
            if log.status == "TAKEN" and log.timestamp:
                try:
                    dt = datetime.strptime(log.timestamp.split()[0], "%Y-%m-%d")
                    weekly_counts[dt.weekday()] += 1
                except Exception:
                    pass

        # Adherence percentage
        total_logs = len(history)
        adherence_rate = f"{int((doses_taken / total_logs) * 100)}%" if total_logs > 0 else "100%"

        recent_history = history[:6]

        self.render_real_data(
            due_meds, recent_history, total_meds, low_stock, doses_taken, adherence_rate, weekly_counts
        )

    def render_real_data(self, due_meds, recent_history, total_meds, low_stock, doses_taken, adherence_rate, weekly_counts):
        # Stop skeleton animations
        self.due_skeleton_mgr.stop()
        self.recent_skeleton_mgr.stop()

        # Update Stats Cards
        self.lbl_total_meds.configure(text=str(total_meds))
        self.lbl_adherence.configure(text=adherence_rate)
        self.lbl_low_stock.configure(text=str(low_stock))
        self.lbl_doses_taken.configure(text=str(doses_taken))

        if low_stock > 0:
            self.card3_badge.configure(text="ATTENTION", text_color="#ef4444", fg_color="#3d1822")
            self.lbl_low_stock.configure(text_color="#f87171")
        else:
            self.card3_badge.configure(text="OPTIMAL", text_color="#10b981", fg_color="#102d24")
            self.lbl_low_stock.configure(text_color="#ffffff")

        # Update Chart
        self.weekly_data = weekly_counts
        self.redraw_chart()

        # Clear existing items
        for w in self.due_scroll.winfo_children():
            w.destroy()
        for w in self.recent_scroll.winfo_children():
            w.destroy()

        # Render Due List
        num_due = len(due_meds)
        self.due_count_badge.configure(
            text=f"{num_due} Due" if num_due > 0 else "Caught Up",
            text_color="#a855f7" if num_due > 0 else "#10b981",
            fg_color="#2c1a45" if num_due > 0 else "#102d24"
        )

        if not due_meds:
            empty_box = ctk.CTkFrame(self.due_scroll, fg_color="transparent")
            empty_box.pack(pady=35)
            ctk.CTkLabel(empty_box, text="✨", font=ctk.CTkFont(size=24)).pack()
            ctk.CTkLabel(
                empty_box, 
                text="You are all caught up on your doses!", 
                font=ctk.CTkFont(size=13, weight="bold"), 
                text_color="#94a3b8"
            ).pack(pady=(4, 0))
        else:
            for med in due_meds:
                card = ctk.CTkFrame(
                    self.due_scroll, 
                    fg_color="#1c2033", 
                    border_color="#2b324d", 
                    border_width=1, 
                    corner_radius=10
                )
                card.pack(fill="x", pady=4, padx=4)

                # Icon
                icon_lbl = ctk.CTkLabel(
                    card, 
                    text="💊", 
                    width=34, 
                    height=34, 
                    fg_color="#272d47", 
                    corner_radius=8, 
                    font=ctk.CTkFont(size=16)
                )
                icon_lbl.pack(side="left", padx=(10, 10), pady=10)

                # Info
                info_frame = ctk.CTkFrame(card, fg_color="transparent")
                info_frame.pack(side="left", fill="both", expand=True, pady=8)

                med_name = med.get('name', 'Unknown')
                dosage = med.get('dosage', '')
                ctk.CTkLabel(
                    info_frame, 
                    text=f"{med_name} {dosage}", 
                    font=ctk.CTkFont(size=13, weight="bold"), 
                    text_color="#ffffff"
                ).pack(anchor="w")

                time_val = med.get('time_value', '')
                ctk.CTkLabel(
                    info_frame, 
                    text=f"Scheduled at: {time_val}", 
                    font=ctk.CTkFont(size=11), 
                    text_color="#38bdf8"
                ).pack(anchor="w")

                # Action Button
                take_btn = ctk.CTkButton(
                    card, 
                    text="✓ Take Dose", 
                    width=90, 
                    height=32, 
                    fg_color="#10b981", 
                    hover_color="#059669", 
                    font=ctk.CTkFont(size=12, weight="bold"),
                    command=lambda m_id=med['med_id']: self.take_dose(m_id)
                )
                take_btn.pack(side="right", padx=(0, 12))

        # Render Recent Logs
        if not recent_history:
            ctk.CTkLabel(
                self.recent_scroll, 
                text="No logs recorded yet.", 
                font=ctk.CTkFont(size=12), 
                text_color="#64748b"
            ).pack(pady=20)
        else:
            for log in recent_history:
                row = ctk.CTkFrame(
                    self.recent_scroll, 
                    fg_color="#1c2033", 
                    border_color="#252b40", 
                    border_width=1, 
                    corner_radius=8, 
                    height=38
                )
                row.pack(fill="x", pady=3, padx=4)
                row.pack_propagate(False)

                # Status pill
                is_taken = log.status == "TAKEN"
                status_color = "#10b981" if is_taken else "#f43f5e"
                bg_color = "#102d24" if is_taken else "#3d1822"

                pill = ctk.CTkLabel(
                    row, 
                    text=log.status, 
                    font=ctk.CTkFont(size=10, weight="bold"), 
                    text_color=status_color, 
                    fg_color=bg_color, 
                    corner_radius=4, 
                    padx=6, 
                    pady=2
                )
                pill.pack(side="left", padx=10)

                ctk.CTkLabel(
                    row, 
                    text=log.med_name, 
                    font=ctk.CTkFont(size=12, weight="bold"), 
                    text_color="#e2e8f0"
                ).pack(side="left", padx=6)

                # Timestamp
                time_display = log.timestamp
                try:
                    time_display = log.timestamp.split()[1][:5] + "  •  " + log.timestamp.split()[0]
                except Exception:
                    pass

                ctk.CTkLabel(
                    row, 
                    text=time_display, 
                    font=ctk.CTkFont(size=11), 
                    text_color="#64748b"
                ).pack(side="right", padx=12)

    def take_dose(self, med_id):
        self.inventory_manager.deduct_stock(med_id)
        self.report_generator.log_intake(self.current_user.user_id, med_id, "TAKEN")
        # Invalidate cache for sibling frames so they reload updated data on next visit
        try:
            app = self.winfo_toplevel()
            if hasattr(app, "content_frames"):
                for name, frame in app.content_frames.items():
                    if name != "DashboardFrame" and hasattr(frame, "is_loaded"):
                        frame.is_loaded = False
        except Exception:
            pass
        self.refresh(self.current_user, force=True)

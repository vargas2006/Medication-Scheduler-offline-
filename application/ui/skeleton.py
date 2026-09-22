import customtkinter as ctk

class SkeletonManager:
    def __init__(self, parent_frame):
        self.parent = parent_frame
        self.cards = []

    def show_skeletons(self, count=3, height=65):
        self.stop()
        for w in self.parent.winfo_children():
            w.destroy()

        self.cards = []
        for _ in range(count):
            # Individual bordered skeleton card
            card = ctk.CTkFrame(
                self.parent, 
                fg_color="#1c2033", 
                border_color="#282f47", 
                border_width=1, 
                corner_radius=10, 
                height=height
            )
            card._is_skeleton = True
            card.pack(fill="x", pady=4, padx=4)
            card.pack_propagate(False)

            # Left thumbnail skeleton block
            img_box = ctk.CTkFrame(card, width=44, height=44, fg_color="#262d42", corner_radius=8)
            img_box.pack(side="left", padx=10, pady=8)

            # Middle title and description skeletons
            mid_box = ctk.CTkFrame(card, fg_color="transparent")
            mid_box.pack(side="left", fill="both", expand=True, pady=10)

            t1 = ctk.CTkFrame(mid_box, width=150, height=12, fg_color="#2b334a", corner_radius=4)
            t1.pack(anchor="w", pady=(2, 6))

            t2 = ctk.CTkFrame(mid_box, width=95, height=10, fg_color="#22283b", corner_radius=4)
            t2.pack(anchor="w")

            # Right side Qty & Action skeleton
            right_box = ctk.CTkFrame(card, fg_color="transparent")
            right_box.pack(side="right", padx=12, pady=10)

            r1 = ctk.CTkFrame(right_box, width=72, height=28, fg_color="#262d42", corner_radius=6)
            r1.pack(side="right")

            self.cards.append(card)

    def stop(self):
        for card in self.cards:
            try:
                if card.winfo_exists():
                    card.destroy()
            except Exception:
                pass
        self.cards = []
        if self.parent and hasattr(self.parent, "winfo_children"):
            for w in list(self.parent.winfo_children()):
                if getattr(w, "_is_skeleton", False):
                    try:
                        w.destroy()
                    except Exception:
                        pass

import customtkinter as ctk
from ui.app import App
from database.db_manager import DatabaseManager

def main():
    # Initialize the database
    db = DatabaseManager()
    
    # Set appearance
    ctk.set_appearance_mode("Dark")
    ctk.set_default_color_theme("blue")
    
    # Run application
    app = App()
    app.mainloop()

if __name__ == "__main__":
    main()

from database.db_manager import DatabaseManager

class PatientProfile:
    def __init__(self, user_id, username):
        self.user_id = user_id
        self.username = username

class UserManager:
    def __init__(self):
        self.db = DatabaseManager()
        self.current_user = None

    def register(self, username, password):
        # Basic check if exists
        existing = self.db.fetch_one("SELECT id FROM users WHERE username = ?", (username,))
        if existing:
            return False, "Username already exists."
        
        # Insert new user
        user_id = self.db.execute_query("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        return True, "Registration successful."

    def login(self, username, password):
        user_row = self.db.fetch_one("SELECT id, username FROM users WHERE username = ? AND password = ?", (username, password))
        if user_row:
            self.current_user = PatientProfile(user_row[0], user_row[1])
            return True, "Login successful."
        return False, "Invalid credentials."

    def logout(self):
        self.current_user = None

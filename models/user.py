from database.db_manager import DatabaseManager

class PatientProfile:
    def __init__(self, user_id, username, name="", email=""):
        self.user_id = user_id
        self.username = username
        self.name = name if name else username
        self.email = email if email else ""

class UserManager:
    def __init__(self):
        self.db = DatabaseManager()
        self.current_user = None

    def register(self, name_or_username, email_or_password, password=None):
        if password is None:
            # 2-arg legacy call: register(username, password)
            username = name_or_username.strip()
            passw = email_or_password
            name = username
            email = username
        else:
            # 3-arg call: register(name, email, password)
            name = name_or_username.strip()
            email = email_or_password.strip().lower()
            username = email
            passw = password

        if not name or not email or not passw:
            return False, "Please fill in all fields."

        # Check if username or email exists
        existing = self.db.fetch_one(
            "SELECT id FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)", 
            (username, email)
        )
        if existing:
            return False, "An account with this email/username already exists."
        
        # Insert new user
        user_id = self.db.execute_query(
            "INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)", 
            (username, passw, name, email)
        )
        return True, "Account created successfully! You can now sign in."

    def login(self, identifier, password):
        if not identifier or not password:
            return False, "Please enter your username/email and password."

        ident = identifier.strip()
        user_row = self.db.fetch_one(
            "SELECT id, username, name, email FROM users WHERE (username = ? OR LOWER(email) = LOWER(?)) AND password = ?", 
            (ident, ident, password)
        )
        if user_row:
            self.current_user = PatientProfile(user_row[0], user_row[1], user_row[2] or "", user_row[3] or "")
            return True, "Login successful."
        return False, "Invalid credentials."

    def logout(self):
        self.current_user = None

import hashlib
import os
import binascii
from database.db_manager import DatabaseManager

# ---------------------------------------------------------------------------
# Password hashing helpers (PBKDF2-HMAC-SHA256, built-in Python — no deps)
# Format stored in DB:  "pbkdf2:sha256:<iterations>$<salt_hex>$<hash_hex>"
# ---------------------------------------------------------------------------
_ITERATIONS = 260_000  # OWASP 2023 minimum recommendation

def _hash_password(plain: str) -> str:
    """Hash a plain-text password and return the storable string."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, _ITERATIONS)
    return f"pbkdf2:sha256:{_ITERATIONS}${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}"

def _verify_password(plain: str, stored: str) -> bool:
    """Verify a plain-text password against a stored hash."""
    try:
        parts = stored.split("$")
        if len(parts) != 3 or not stored.startswith("pbkdf2:sha256:"):
            return False
        header, salt_hex, hash_hex = parts
        iterations = int(header.split(":")[2])
        salt = binascii.unhexlify(salt_hex)
        expected = binascii.unhexlify(hash_hex)
        dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, iterations)
        # Constant-time comparison to prevent timing attacks
        return hmac_compare(dk, expected)
    except Exception:
        return False

def hmac_compare(a: bytes, b: bytes) -> bool:
    """Constant-time bytes comparison."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= x ^ y
    return result == 0

def _is_hashed(stored: str) -> bool:
    """Return True if the stored value looks like a PBKDF2 hash."""
    return stored.startswith("pbkdf2:sha256:")


# ---------------------------------------------------------------------------
# User model
# ---------------------------------------------------------------------------
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

        # Hash the password before storing
        hashed = _hash_password(passw)
        self.db.execute_query(
            "INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)",
            (username, hashed, name, email)
        )
        return True, "Account created successfully! You can now sign in."

    def login(self, identifier, password):
        if not identifier or not password:
            return False, "Please enter your username/email and password."

        ident = identifier.strip()

        # Fetch user row (password column included for verification)
        user_row = self.db.fetch_one(
            "SELECT id, username, name, email, password FROM users WHERE username = ? OR LOWER(email) = LOWER(?)",
            (ident, ident)
        )

        if not user_row:
            return False, "Invalid credentials."

        stored_pw = user_row[4] or ""

        if _is_hashed(stored_pw):
            # Modern hashed password — verify with PBKDF2
            if not _verify_password(password, stored_pw):
                return False, "Invalid credentials."
        else:
            # Legacy plain-text password — compare directly, then silently upgrade
            if stored_pw != password:
                return False, "Invalid credentials."
            # Upgrade: replace plain-text with hash on-the-fly
            new_hash = _hash_password(password)
            self.db.execute_query(
                "UPDATE users SET password = ? WHERE id = ?",
                (new_hash, user_row[0])
            )
            print(f"[UserManager] Password for user '{user_row[1]}' upgraded to PBKDF2 hash.")

        self.current_user = PatientProfile(user_row[0], user_row[1], user_row[2] or "", user_row[3] or "")
        return True, "Login successful."

    def logout(self):
        self.current_user = None

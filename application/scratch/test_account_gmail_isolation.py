import os
import sys

# Add application path to sys.path
sys.path.insert(0, os.path.abspath('application'))

from database.db_manager import DatabaseManager

def test_account_isolation():
    db = DatabaseManager()
    
    # 1. Create two test users if they don't exist
    user_a_id = db.fetch_one("SELECT id FROM users WHERE username = ?", ("test_user_a",))
    if not user_a_id:
        user_a_id = db.execute_query("INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)", 
                                     ("test_user_a", "password123", "User A", "usera@example.com"))
    else:
        user_a_id = user_a_id[0]

    user_b_id = db.fetch_one("SELECT id FROM users WHERE username = ?", ("test_user_b",))
    if not user_b_id:
        user_b_id = db.execute_query("INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)", 
                                     ("test_user_b", "password123", "User B", "userb@example.com"))
    else:
        user_b_id = user_b_id[0]

    print(f"User A ID: {user_a_id}, User B ID: {user_b_id}")

    # 2. Save settings for User A with specific Gmail
    gmail_a = "johnleevargas25@gmail.com"
    db.save_settings(
        enable_offline_popups=1,
        enable_gmail_notifications=1,
        recipient_email=gmail_a,
        user_id=user_a_id,
        is_email_verified=1
    )

    # 3. Retrieve settings for User A
    settings_a = db.get_settings(user_a_id)
    print("User A Settings:", settings_a)

    # 4. Retrieve settings for User B (should NOT have User A's Gmail!)
    settings_b = db.get_settings(user_b_id)
    print("User B Settings:", settings_b)

    # Assertions for initial isolation
    assert settings_a["recipient_email"] == gmail_a, f"Expected {gmail_a}, got {settings_a['recipient_email']}"
    assert settings_b["recipient_email"] == "", f"Expected empty string for User B, got {settings_b['recipient_email']}"
    assert settings_b["enable_gmail_notifications"] == 0, f"Expected 0 for User B, got {settings_b['enable_gmail_notifications']}"
    assert settings_b["is_email_verified"] == 0, f"Expected 0 for User B, got {settings_b['is_email_verified']}"

    # 5. Test Duplicate Prevention: User B tries to bind User A's Gmail
    from api.pywebview_api import PythonAPI
    api_instance = PythonAPI()
    
    dup_res = api_instance.send_gmail_bind_code(user_b_id, gmail_a)
    print("User B attempting to send code to User A's Gmail result:", dup_res)
    assert dup_res["success"] == False, "Expected error when User B tries to bind User A's Gmail!"
    assert "already bound to account" in dup_res["message"]

    print("SUCCESS: Account Gmail settings are strictly isolated and duplicate Gmail binding across accounts is prevented!")

if __name__ == "__main__":
    test_account_isolation()

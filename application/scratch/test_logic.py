import os
import sys

sys.path.insert(0, os.path.abspath("c:/desk app/application"))

from api.pywebview_api import PythonAPI
from database.db_manager import DatabaseManager

def run_tests():
    db = DatabaseManager()
    api = PythonAPI()

    user_row = db.fetch_one("SELECT id FROM users WHERE username = 'test_user_unit'")
    if not user_row:
        db.execute_query("INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)",
                         ('test_user_unit', 'hashed', 'Test Unit User', 'test@example.com'))
        user_row = db.fetch_one("SELECT id FROM users WHERE username = 'test_user_unit'")
    
    user_id = user_row[0]
    print(f"=== TEST USER ID: {user_id} ===")

    db.execute_query("DELETE FROM intake_log WHERE user_id = ?", (user_id,))
    db.execute_query("DELETE FROM schedules WHERE medication_id IN (SELECT id FROM medications WHERE user_id = ?)", (user_id,))
    db.execute_query("DELETE FROM medications WHERE user_id = ?", (user_id,))

    print("\n--- TEST: Add Drug with Expiration Date ---")
    add_res = api.add_medication(
        user_id=user_id,
        name="Biogesic",
        dosage="500 mg Capsule",
        stock=30,
        refill_threshold=10,
        image_path=None,
        strength="500 mg",
        dosage_form="Capsule",
        stock_unit="capsules",
        expiration_date="2026-12-31"
    )
    print("Add Medication Result:", add_res)

    meds_res = api.get_medications(user_id)
    med_item = meds_res['medications'][0]
    print("Med Item returned:", med_item)
    assert med_item['expiration_date'] == "2026-12-31", f"Expiration date mismatch: {med_item['expiration_date']}"

    print("\nEXPIRATION DATE VERIFICATION PASSED!")

if __name__ == "__main__":
    run_tests()

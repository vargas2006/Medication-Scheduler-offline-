import sys
from models.user import UserManager
from models.medication import InventoryManager
from models.schedule import DoseAlert
from models.history import ReportGenerator

def test_login_and_data():
    u_mgr = UserManager()
    i_mgr = InventoryManager()
    d_alert = DoseAlert()
    r_gen = ReportGenerator()

    # Try to register 12345 / 12345 if it doesn't exist
    u_mgr.register("12345", "12345")
    
    # Login
    success, msg = u_mgr.login("12345", "12345")
    if not success:
        print("Failed to login:", msg)
        return
        
    user = u_mgr.current_user
    print(f"Logged in successfully as user_id={user.user_id}, username={user.username}")

    # Check medications
    meds = i_mgr.get_user_medications(user.user_id)
    print(f"Total Medications visible: {len(meds)}")
    if len(meds) > 0:
        print(f"First medication: {meds[0].name}, Stock: {meds[0].stock}")
        
    # Check due medications
    due_meds = d_alert.get_due_medications(user.user_id)
    print(f"Total Due Medications: {len(due_meds)}")
    
    # Check history
    history = r_gen.get_user_history(user.user_id)
    print(f"Total History Logs visible: {len(history)}")

if __name__ == "__main__":
    test_login_and_data()

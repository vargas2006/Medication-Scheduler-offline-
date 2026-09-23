from models.user import UserManager
from models.medication import InventoryManager
from models.schedule import DoseAlert
from models.history import ReportGenerator
from datetime import datetime
import os

class PythonAPI:
    def __init__(self):
        self.user_manager = UserManager()
        self.inventory_manager = InventoryManager()
        self.dose_alert = DoseAlert()
        self.report_generator = ReportGenerator()

    def login(self, identifier, password):
        success, message = self.user_manager.login(identifier, password)
        user_data = None
        if success and self.user_manager.current_user:
            u = self.user_manager.current_user
            user_data = {
                "user_id": u.user_id,
                "username": u.username,
                "name": u.name,
                "email": u.email
            }
            try:
                from services.background_worker import NotificationWorker
                NotificationWorker().switch_active_user(u.user_id)
            except Exception as e:
                print(f"[API] Error switching active user on login: {e}")
        return {"success": success, "message": message, "user": user_data}

    def register(self, name, email, password):
        success, message = self.user_manager.register(name, email, password)
        return {"success": success, "message": message}

    def logout(self):
        self.user_manager.logout()
        try:
            from services.background_worker import NotificationWorker
            NotificationWorker().switch_active_user(None)
        except Exception:
            pass
        return {"success": True}

    def set_active_user(self, user_id):
        try:
            user_id = int(user_id)
            user_row = self.inventory_manager.db.fetch_one("SELECT id, username, name, email FROM users WHERE id = ?", (user_id,))
            if user_row:
                from models.user import User
                self.user_manager.current_user = User(user_row[0], user_row[1], user_row[2], user_row[3])
                from services.background_worker import NotificationWorker
                NotificationWorker().switch_active_user(user_id)
                return {"success": True}
            return {"success": False, "message": "User not found"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def get_dashboard_data(self, user_id):
        try:
            user_id = int(user_id)
            meds = self.inventory_manager.get_user_medications(user_id)
            due_meds = self.dose_alert.get_due_medications(user_id)
            history = self.report_generator.get_user_history(user_id)

            total_meds = len(meds)
            low_stock = sum(1 for m in meds if m.is_low_stock())
            doses_taken = len([h for h in history if h.status == 'TAKEN'])

            # Weekly intake counts (Mon to Sun: index 0 to 6)
            weekly_counts = [0] * 7
            for log in history:
                if log.status == "TAKEN" and log.timestamp:
                    try:
                        dt = datetime.strptime(log.timestamp.split()[0], "%Y-%m-%d")
                        weekly_counts[dt.weekday()] += 1
                    except Exception:
                        pass

            total_logs = len(history)
            adherence_rate = f"{int((doses_taken / total_logs) * 100)}%" if total_logs > 0 else "100%"

            recent_history = [
                {
                    "log_id": h.log_id,
                    "user_id": h.user_id,
                    "med_id": h.med_id,
                    "med_name": h.med_name,
                    "timestamp": h.timestamp,
                    "status": h.status
                }
                for h in history[:10]
            ]

            return {
                "success": True,
                "total_meds": total_meds,
                "low_stock": low_stock,
                "doses_taken": doses_taken,
                "adherence_rate": adherence_rate,
                "weekly_counts": weekly_counts,
                "due_meds": due_meds,
                "recent_history": recent_history
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_medications(self, user_id):
        try:
            user_id = int(user_id)
            meds = self.inventory_manager.get_user_medications(user_id)
            result = []
            for m in meds:
                result.append({
                    "med_id": m.med_id,
                    "user_id": m.user_id,
                    "name": m.name,
                    "dosage": m.dosage,
                    "stock": m.stock,
                    "refill_threshold": m.refill_threshold,
                    "image_path": m.image_path,
                    "is_low_stock": m.is_low_stock()
                })
            return {"success": True, "medications": result}
        except Exception as e:
            return {"success": False, "error": str(e), "medications": []}

    def add_medication(self, user_id, name, dosage, stock, refill_threshold, image_path=None, schedule_type="DAILY_TIME", time_value="08:00", schedule_date=None):
        try:
            user_id = int(user_id)
            stock = int(stock)
            refill_threshold = int(refill_threshold)
            
            med_id = self.inventory_manager.add_medication(
                user_id, name, dosage, stock, refill_threshold, image_path
            )
            if schedule_type and time_value:
                clean_date = str(schedule_date).strip() if schedule_date else None
                self.dose_alert.add_schedule(med_id, schedule_type, time_value, schedule_date=clean_date)

            return {"success": True, "message": "Medication added successfully!", "med_id": med_id}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def delete_medication(self, med_id):
        try:
            med_id = int(med_id)
            self.inventory_manager.delete_medication(med_id)
            return {"success": True, "message": "Medication deleted."}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def take_dose(self, user_id, med_id):
        try:
            user_id = int(user_id)
            med_id = int(med_id)
            self.inventory_manager.deduct_stock(med_id)
            self.report_generator.log_intake(user_id, med_id, "TAKEN")
            return {"success": True, "message": "Dose logged as TAKEN."}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def get_history(self, user_id):
        try:
            user_id = int(user_id)
            history = self.report_generator.get_user_history(user_id)
            logs = [
                {
                    "log_id": h.log_id,
                    "user_id": h.user_id,
                    "med_id": h.med_id,
                    "med_name": h.med_name,
                    "timestamp": h.timestamp,
                    "status": h.status
                }
                for h in history
            ]
            return {"success": True, "history": logs}
        except Exception as e:
            return {"success": False, "error": str(e), "history": []}

    def create_intake_schedule(self, user_id, med_id, date_str, time_str, status="TAKEN"):
        try:
            user_id = int(user_id)
            med_id = int(med_id)
            clean_time = time_str.strip()
            clean_date = date_str.strip()
            timestamp_str = f"{clean_date} {clean_time}:00" if len(clean_time) == 5 else f"{clean_date} {clean_time}"
            
            if status == "TAKEN":
                self.inventory_manager.deduct_stock(med_id)
                self.report_generator.log_intake(user_id, med_id, "TAKEN", timestamp_str)
            else:
                # SCHEDULED reminder
                self.report_generator.log_intake(user_id, med_id, "SCHEDULED", timestamp_str)
                self.dose_alert.add_schedule(med_id, "DAILY_TIME", clean_time, schedule_date=clean_date)
            
            return {"success": True, "message": f"Intake scheduled for {clean_date} at {clean_time}!"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def export_csv(self, user_id):
        try:
            user_id = int(user_id)
            user_obj = self.user_manager.current_user
            username = user_obj.username if user_obj else f"user_{user_id}"
            filepath = os.path.abspath(f"history_export_{username}.csv")
            self.report_generator.export_to_csv(user_id, filepath)
            return {"success": True, "filepath": filepath, "message": f"Exported successfully to {filepath}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def get_settings(self, user_id=None):
        try:
            from database.db_manager import DatabaseManager
            db = DatabaseManager()
            if not user_id and self.user_manager.current_user:
                user_id = self.user_manager.current_user.user_id
            settings = db.get_settings(user_id)
            return {"success": True, **settings}
        except Exception as e:
            return {"success": False, "error": str(e), "enable_offline_popups": 0, "enable_gmail_notifications": 0, "recipient_email": ""}

    def save_settings(self, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email="", sender_password="", user_id=None):
        try:
            from database.db_manager import DatabaseManager
            db = DatabaseManager()
            if not user_id and self.user_manager.current_user:
                user_id = self.user_manager.current_user.user_id
            db.save_settings(enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, user_id)
            return {"success": True, "message": "Settings updated successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def send_test_notification(self):
        try:
            from database.db_manager import DatabaseManager
            db = DatabaseManager()
            settings = db.get_settings()
            
            med_name = "Paracetamol"
            dosage = "500mg"
            time_val = datetime.now().strftime("%I:%M %p")

            # 1. Enqueue Due Medication Email in SQLite database ONLY if Gmail notifications are enabled
            if settings.get("enable_gmail_notifications") and settings.get("recipient_email"):
                subject = f"⏰ Medication Due Reminder: {med_name} ({dosage})"
                body = (
                    f"Hello!\n\n"
                    f"This is a test reminder that it is time to take your scheduled medication:\n"
                    f"• Medication: {med_name}\n"
                    f"• Dosage: {dosage}\n"
                    f"• Time Scheduled: {time_val}\n\n"
                    f"Please take your dose now and log it in your Smart Medication Scheduler app."
                )
                db.enqueue_email(subject, body)
            
            # 2. Always trigger instant OS Desktop Popup on test
            try:
                from services.background_worker import NotificationWorker
                worker = NotificationWorker()
                worker._trigger_os_popup(
                    "⏰ Medication Due Alert!",
                    f"It is time to take your dose: {med_name} ({dosage}) at {time_val}."
                )
            except Exception as ex:
                print(f"[API] Error in popup trigger: {ex}")
                
            return {"success": True, "message": "Due medication test alert triggered!"}
        except Exception as e:
            return {"success": False, "message": str(e)}



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
            from database.db_manager import DatabaseManager
            DatabaseManager().clear_remember_me()
            from services.background_worker import NotificationWorker
            NotificationWorker().switch_active_user(None)
        except Exception:
            pass
        return {"success": True}

    def get_auto_login_user(self):
        """Check SQLite DB for a remembered active user session across app restarts."""
        try:
            from database.db_manager import DatabaseManager
            db = DatabaseManager()
            remembered_id = db.get_remembered_user_id()
            if remembered_id:
                user_row = db.fetch_one("SELECT id, username, name, email FROM users WHERE id = ?", (int(remembered_id),))
                if user_row:
                    from models.user import PatientProfile
                    self.user_manager.current_user = PatientProfile(user_row[0], user_row[1], user_row[2] or "", user_row[3] or "")
                    from services.background_worker import NotificationWorker
                    NotificationWorker().switch_active_user(user_row[0])
                    return {
                        "success": True,
                        "user": {
                            "user_id": user_row[0],
                            "username": user_row[1],
                            "name": user_row[2] or "",
                            "email": user_row[3] or ""
                        }
                    }
            return {"success": False}
        except Exception as e:
            print(f"[API] Error in get_auto_login_user: {e}")
            return {"success": False}

    def save_remember_session(self, user_id):
        try:
            from database.db_manager import DatabaseManager
            db = DatabaseManager()
            db.save_remember_me(int(user_id))
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

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

    def save_settings(self, enable_offline_popups, enable_gmail_notifications, recipient_email="", sender_email="", sender_password="", user_id=None, is_email_verified=None):
        try:
            from database.db_manager import DatabaseManager
            db = DatabaseManager()
            if not user_id and self.user_manager.current_user:
                user_id = self.user_manager.current_user.user_id
            db.save_settings(enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, user_id, is_email_verified)
            return {"success": True, "message": "Settings updated successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def send_gmail_bind_code(self, user_id, email):
        """Send a 6-digit verification code to the target Gmail address to bind it for notifications."""
        try:
            import random
            import time
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            from database.db_manager import DatabaseManager
            db = DatabaseManager()

            target_email = (email or "").strip().lower()
            if not target_email or "@" not in target_email:
                return {"success": False, "message": "Please enter a valid Gmail address."}

            code = f"{random.randint(100000, 999999)}"
            expires_at = int(time.time()) + 900  # 15 mins

            # Store code in password_resets table
            db.execute_query(
                "INSERT OR REPLACE INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)",
                (target_email, code, expires_at)
            )

            user_id = int(user_id) if user_id else (self.user_manager.current_user.user_id if self.user_manager.current_user else None)
            settings = db.get_settings(user_id)
            sender_email = (settings.get("sender_email") or "lbag5176@gmail.com").strip()
            sender_password = (settings.get("sender_password") or "ttqiembzpocswrid").strip()

            subject = "✉ Verification Code: Bind Gmail for Medication Notifications"
            html_body = f"""
            <div style="font-family: Arial, sans-serif; background-color: #0d1117; color: #e6edf3; padding: 24px; border-radius: 12px; max-width: 480px; margin: 0 auto; border: 1px solid #24293e;">
              <h2 style="color: #38bdf8; margin-top: 0; font-size: 20px;">💊 Smart Medication Scheduler</h2>
              <h3 style="color: #ffffff; font-size: 16px;">Gmail Verification Code</h3>
              <p style="color: #94a3b8; font-size: 13px;">You requested to bind this Gmail address to receive medication alerts. Enter the code below in your app settings:</p>
              <div style="background-color: #161926; border: 1px solid #38bdf8; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">{code}</span>
              </div>
              <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">This code will expire in 15 minutes.</p>
            </div>
            """

            msg = MIMEMultipart("alternative")
            msg['From'] = f"Smart Medication Scheduler <{sender_email}>"
            msg['To'] = target_email
            msg['Subject'] = subject
            msg.attach(MIMEText(f"Your verification code is: {code}", "plain"))
            msg.attach(MIMEText(html_body, "html"))

            try:
                server = smtplib.SMTP("smtp.gmail.com", 587, timeout=12)
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, target_email, msg.as_string())
                server.quit()
                print(f"[API] Direct SMTP verification code {code} sent to {target_email} from {sender_email}")
                return {"success": True, "message": f"Verification code sent to {target_email}! Check your inbox."}
            except Exception as primary_err:
                print(f"[API] Primary SMTP error with {sender_email}: {primary_err}")
                # Fallback to system default sender lbag5176@gmail.com
                try:
                    fallback_sender = "lbag5176@gmail.com"
                    fallback_pass = "ttqiembzpocswrid"
                    msg['From'] = f"Smart Medication Scheduler <{fallback_sender}>"
                    server = smtplib.SMTP("smtp.gmail.com", 587, timeout=12)
                    server.starttls()
                    server.login(fallback_sender, fallback_pass)
                    server.sendmail(fallback_sender, target_email, msg.as_string())
                    server.quit()
                    print(f"[API] Fallback SMTP verification code sent to {target_email}")
                    return {"success": True, "message": f"Verification code sent to {target_email}! Check your inbox."}
                except Exception as fallback_err:
                    print(f"[API] Fallback SMTP error: {fallback_err}")
                    return {"success": False, "message": f"Failed to send email to {target_email}. Please check your internet connection."}
        except Exception as e:
            return {"success": False, "message": str(e)}


    def verify_and_bind_gmail(self, user_id, email, code):
        """Verify 6-digit OTP code and bind Gmail for notifications."""
        try:
            import time
            from database.db_manager import DatabaseManager
            db = DatabaseManager()

            target_email = (email or "").strip().lower()
            input_code = (code or "").strip()
            if not target_email or not input_code:
                return {"success": False, "message": "Please enter verification code."}

            row = db.fetch_one("SELECT code, expires_at FROM password_resets WHERE email = ?", (target_email,))
            if not row:
                return {"success": False, "message": "No verification request found for this email."}

            saved_code, expires_at = row
            if saved_code != input_code:
                return {"success": False, "message": "Invalid verification code. Please check your Gmail."}

            if int(time.time()) > expires_at:
                return {"success": False, "message": "Verification code has expired. Please request a new code."}

            user_id = int(user_id) if user_id else (self.user_manager.current_user.user_id if self.user_manager.current_user else None)
            current = db.get_settings(user_id)
            db.save_settings(
                enable_offline_popups=current.get("enable_offline_popups", 0),
                enable_gmail_notifications=1,
                recipient_email=target_email,
                sender_email=current.get("sender_email", ""),
                sender_password=current.get("sender_password", ""),
                user_id=user_id,
                is_email_verified=1
            )

            db.execute_query("DELETE FROM password_resets WHERE email = ?", (target_email,))
            return {"success": True, "message": f"✓ Gmail address {target_email} verified and bound successfully!"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def unbind_gmail(self, user_id):
        """Unbind current notification Gmail address."""
        try:
            from database.db_manager import DatabaseManager
            db = DatabaseManager()
            user_id = int(user_id) if user_id else (self.user_manager.current_user.user_id if self.user_manager.current_user else None)
            current = db.get_settings(user_id)
            db.save_settings(
                enable_offline_popups=current.get("enable_offline_popups", 0),
                enable_gmail_notifications=0,
                recipient_email="",
                sender_email=current.get("sender_email", ""),
                sender_password=current.get("sender_password", ""),
                user_id=user_id,
                is_email_verified=0
            )
            return {"success": True, "message": "Gmail unbound successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def get_current_version(self):
        """Get current installed app version dynamically."""
        try:
            from services.updater import get_current_version
            return {"success": True, "version": get_current_version()}
        except Exception as e:
            return {"success": False, "version": "1.0.5", "message": str(e)}

    def check_for_updates(self):
        """Check for software updates from remote manifest."""
        try:
            from services.updater import check_for_updates
            return check_for_updates()
        except Exception as e:
            return {"success": False, "update_available": False, "message": str(e)}

    def download_and_apply_update(self, download_url=None):
        """Download update zip and execute auto-updater script."""
        try:
            from services.updater import download_and_apply_update
            return download_and_apply_update(download_url)
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

    def change_password(self, user_id, current_password, new_password):
        """Verify current password then update to a new PBKDF2-hashed password."""
        try:
            from database.db_manager import DatabaseManager
            from models.user import _hash_password, _verify_password, _is_hashed
            db = DatabaseManager()

            user_id = int(user_id)
            row = db.fetch_one(
                "SELECT id, username, password FROM users WHERE id = ?", (user_id,)
            )
            if not row:
                return {"success": False, "message": "User not found."}

            stored_pw = row[2] or ""

            # Verify current password (supports both plain-text legacy and hashed)
            if _is_hashed(stored_pw):
                valid = _verify_password(current_password, stored_pw)
            else:
                valid = (stored_pw == current_password)

            if not valid:
                return {"success": False, "message": "Current password is incorrect."}

            if not new_password or len(new_password) < 6:
                return {"success": False, "message": "New password must be at least 6 characters."}

            new_hash = _hash_password(new_password)
            db.execute_query("UPDATE users SET password = ? WHERE id = ?", (new_hash, user_id))
            print(f"[API] Password changed and hashed for user_id={user_id}")
            return {"success": True, "message": "Password updated successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def request_password_reset(self, identifier):
        """Send a 6-digit verification code to user's email for password recovery."""
        try:
            import random
            import time
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            from database.db_manager import DatabaseManager
            db = DatabaseManager()

            ident = (identifier or "").strip()
            if not ident:
                return {"success": False, "message": "Please enter your username or registered email."}

            user_row = db.fetch_one(
                "SELECT id, username, name, email FROM users WHERE username = ? OR LOWER(email) = LOWER(?)",
                (ident, ident)
            )
            if not user_row:
                return {"success": False, "message": "No account found matching that username or email."}

            user_id, username, name, user_email = user_row
            user_email = (user_email or "").strip()
            if not user_email:
                return {"success": False, "message": "No email address is registered for this account."}

            # Generate 6-digit code
            code = f"{random.randint(100000, 999999)}"
            expires_at = int(time.time()) + 900  # 15 mins

            # Save in password_resets table
            db.execute_query(
                "INSERT OR REPLACE INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)",
                (user_email.lower(), code, expires_at)
            )

            # Get sender credentials
            settings = db.get_settings(user_id)
            sender_email = settings.get("sender_email")
            sender_password = settings.get("sender_password")

            subject = "🔒 Password Reset Verification Code - Smart Medication Scheduler"
            html_body = f"""
            <div style="font-family: Arial, sans-serif; background-color: #0d1117; color: #e6edf3; padding: 24px; border-radius: 12px; max-width: 480px; margin: 0 auto; border: 1px solid #24293e;">
              <h2 style="color: #7c3aed; margin-top: 0; font-size: 20px;">💊 Smart Medication Scheduler</h2>
              <h3 style="color: #ffffff; font-size: 16px;">Verification Code</h3>
              <p style="color: #94a3b8; font-size: 13px;">Hi <b>{name or username}</b>,</p>
              <p style="color: #94a3b8; font-size: 13px;">You requested to reset your password. Use the verification code below to proceed:</p>
              <div style="background-color: #161926; border: 1px solid #38bdf8; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">{code}</span>
              </div>
              <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">This code is valid for 15 minutes. If you did not request this code, please ignore this email.</p>
            </div>
            """

            # Direct SMTP send if sender credentials present
            sent_directly = False
            if sender_email and sender_password:
                try:
                    msg = MIMEMultipart("alternative")
                    msg['From'] = f"Smart Medication Scheduler <{sender_email}>"
                    msg['To'] = user_email
                    msg['Subject'] = subject
                    msg.attach(MIMEText(f"Your verification code is: {code}", "plain"))
                    msg.attach(MIMEText(html_body, "html"))

                    server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
                    server.starttls()
                    server.login(sender_email, sender_password)
                    server.sendmail(sender_email, user_email, msg.as_string())
                    server.quit()
                    sent_directly = True
                    print(f"[API] Verification code {code} sent directly via Gmail to {user_email}")
                except Exception as smtp_err:
                    print(f"[API] Direct SMTP error: {smtp_err}. Enqueuing in email_queue fallback.")

            if not sent_directly:
                # Enqueue for background worker
                db.enqueue_email(subject, html_body, user_email, is_html=1)

            # Mask email for privacy (e.g. j***5@gmail.com)
            parts = user_email.split("@")
            if len(parts) == 2:
                uname, domain = parts
                masked = uname[0] + "***" + (uname[-1] if len(uname) > 1 else "") + "@" + domain
            else:
                masked = user_email

            return {
                "success": True,
                "message": f"Verification code sent to {masked}!",
                "email": user_email
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    def verify_and_reset_password(self, email, code, new_password):
        """Verify 6-digit OTP code and set new password for the account."""
        try:
            import time
            from database.db_manager import DatabaseManager
            from models.user import _hash_password
            db = DatabaseManager()

            target_email = (email or "").strip().lower()
            input_code = (code or "").strip()
            new_pass = (new_password or "").strip()

            if not target_email or not input_code or not new_pass:
                return {"success": False, "message": "Please enter code and new password."}

            if len(new_pass) < 6:
                return {"success": False, "message": "New password must be at least 6 characters."}

            row = db.fetch_one(
                "SELECT code, expires_at FROM password_resets WHERE email = ?",
                (target_email,)
            )
            if not row:
                return {"success": False, "message": "No verification request found for this email."}

            saved_code, expires_at = row
            if saved_code != input_code:
                return {"success": False, "message": "Invalid verification code. Please check your email."}

            if int(time.time()) > expires_at:
                return {"success": False, "message": "Verification code has expired. Please request a new one."}

            # Hash new password & update user
            new_hash = _hash_password(new_pass)
            db.execute_query("UPDATE users SET password = ? WHERE LOWER(email) = ?", (new_hash, target_email))

            # Delete used reset record
            db.execute_query("DELETE FROM password_resets WHERE email = ?", (target_email,))
            print(f"[API] Password successfully reset for {target_email}")

            return {"success": True, "message": "Password updated successfully! You can now sign in."}
        except Exception as e:
            return {"success": False, "message": str(e)}




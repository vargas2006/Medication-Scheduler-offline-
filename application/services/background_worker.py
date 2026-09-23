import time
import socket
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database.db_manager import DatabaseManager


class NotificationWorker:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(NotificationWorker, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, check_interval=30):
        if getattr(self, '_initialized', False):
            return
        self.check_interval = check_interval
        self.db = DatabaseManager()
        self.running = False
        self.thread = None
        self.notified_due_doses = set()
        self.last_alert_timestamp = 0
        self.active_user_id = None
        self.is_showing_dialog = False
        self._initialized = True

    def switch_active_user(self, user_id):
        self.active_user_id = int(user_id) if user_id else None
        self.notified_due_doses.clear()
        self.last_alert_timestamp = 0
        print(f"[NotificationWorker] Active desktop user switched to: {self.active_user_id}. Fresh alert cache initialized.")

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run_loop, daemon=True)
            self.thread.start()
            print("[NotificationWorker] Background notification worker started cleanly.")

    def stop(self):
        self.running = False

    def is_connected_to_internet(self):
        try:
            socket.setdefaulttimeout(3)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("8.8.8.8", 53))
            s.close()
            return True
        except Exception:
            return False

    def _trigger_os_popup(self, title, message, show_dialog=True):
        """
        Triggers offline notifications:
        1. In-App Floating Visual Notification (Visible when app window is open)
        2. Modern Windows 10/11 Toast Banner with sound chime
        3. Native Topmost Dialog (Only if not already displaying one, to prevent any stacking)
        """
        clean_title = title.replace("'", "").replace('"', "").replace("\n", " ")
        clean_message = message.replace("'", "").replace('"', "").replace("\n", " ")

        # 1. In-App Custom Event for webview (Instant on-screen banner)
        try:
            import webview
            import json
            if webview.windows and len(webview.windows) > 0:
                payload = json.dumps({"title": title, "message": message})
                webview.windows[0].evaluate_js(
                    f"window.dispatchEvent(new CustomEvent('medication-due-alert', {{ detail: {payload} }}))"
                )
        except Exception as e:
            pass

        # 2. Native Windows Topmost Dialog (Guarded against multi-stacking)
        if show_dialog and not self.is_showing_dialog:
            self.is_showing_dialog = True
            def show_native_dialog():
                try:
                    import ctypes
                    # 0x40 = MB_ICONINFORMATION, 0x10000 = MB_SETFOREGROUND, 0x40000 = MB_TOPMOST
                    flags = 0x40 | 0x10000 | 0x40000
                    ctypes.windll.user32.MessageBoxW(0, message, title, flags)
                except Exception as e:
                    print(f"[NotificationWorker] Native dialog error: {e}")
                finally:
                    self.is_showing_dialog = False

            threading.Thread(target=show_native_dialog, daemon=True).start()

        # 3. Modern Windows 10/11 Desktop Banner Toast
        try:
            import subprocess
            import os
            import tempfile
            ps_script = f'''
            try {{
                [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
                [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
                $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
                $template = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>{clean_title}</text>
            <text>{clean_message}</text>
        </binding>
    </visual>
    <audio src="ms-winsoundevent:Notification.Reminder"/>
</toast>
"@
                $xml.LoadXml($template)
                $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
                $appId = "{{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}}\\WindowsPowerShell\\v1.0\\powershell.exe"
                [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
            }} catch {{}}
            '''
            
            fd, tmp_path = tempfile.mkstemp(suffix=".ps1")
            with open(fd, "w", encoding="utf-8") as f:
                f.write(ps_script)

            def run_ps():
                try:
                    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp_path], capture_output=True)
                finally:
                    if os.path.exists(tmp_path):
                        try:
                            os.remove(tmp_path)
                        except Exception:
                            pass

            threading.Thread(target=run_ps, daemon=True).start()
        except Exception as ex:
            print(f"[NotificationWorker] Windows Toast Error: {ex}")

        # 4. System audio notification chime
        def play_sound():
            try:
                import winsound
                winsound.MessageBeep(winsound.MB_ICONASTERISK)
            except Exception:
                pass
        threading.Thread(target=play_sound, daemon=True).start()

    def _check_offline_popups(self):
        pass

    def _process_gmail_queue(self):
        pending_emails = self.db.get_pending_emails()
        if not pending_emails:
            return

        if not self.is_connected_to_internet():
            return

        global_settings = self.db.get_settings()
        sender_email = global_settings.get("sender_email") or "johnleevargas25@gmail.com"
        sender_password = global_settings.get("sender_password") or "ocpl htqd tblw zquk"

        # Send queued emails with rate limiting (max 3 at a time)
        for email_item in pending_emails[:3]:
            email_id, subject, body = email_item[0], email_item[1], email_item[2]
            target_recipient = (email_item[3] or "").strip()
            if not target_recipient:
                self.db.mark_email_sent(email_id)
                continue

            try:
                msg = MIMEMultipart()
                msg['From'] = f"Smart Medication Scheduler <{sender_email}>"
                msg['To'] = target_recipient
                msg['Subject'] = subject
                msg.attach(MIMEText(body, 'plain'))

                server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, target_recipient, msg.as_string())
                server.quit()
                self.db.mark_email_sent(email_id)
                print(f"[NotificationWorker] 📧 GMAIL DELIVERED! Email ID {email_id} sent to {target_recipient} from {sender_email}")
            except Exception as e:
                print(f"[NotificationWorker] Gmail SMTP Error: {e}")
                self.db.mark_email_sent(email_id)

    def _check_due_medications(self):
        try:
            from models.schedule import DoseAlert
            dose_alert = DoseAlert()

            now_ts = time.time()
            today_str = time.strftime("%Y-%m-%d")

            # 1. ONLINE GMAIL NOTIFICATIONS:
            # Check every user with Gmail notifications enabled and send ONLY their due medications to their email
            users = self.db.fetch_all("SELECT id, username, email FROM users")
            for u_id, u_name, u_email in users:
                u_settings = self.db.get_settings(u_id)
                if u_settings.get("enable_gmail_notifications"):
                    target_email = (u_settings.get("recipient_email") or u_email or "").strip()
                    if target_email:
                        due_meds = dose_alert.get_due_medications(u_id)
                        user_new_due = []
                        for med in due_meds:
                            med_id = med["med_id"]
                            email_key = f"email_{u_id}_{med_id}_{today_str}"
                            if email_key not in self.notified_due_doses:
                                self.notified_due_doses.add(email_key)
                                user_new_due.append(med)

                        if user_new_due:
                            subject = f"⏰ Medication Due Reminder: {len(user_new_due)} scheduled dose(s)"
                            med_list = "\n".join([f"• {m['name']} ({m['dosage']}) - Scheduled: {m.get('time_value', 'Today')}" for m in user_new_due])
                            body = (
                                f"Hello {u_name}!\n\n"
                                f"This is a reminder from Smart Medication Scheduler that you have doses due to take:\n\n"
                                f"{med_list}\n\n"
                                f"Please take your doses on time and log them in your application."
                            )
                            self.db.enqueue_email(subject, body, target_email)
                            print(f"[NotificationWorker] Enqueued consolidated email for {u_name} ({target_email}) with {len(user_new_due)} medications.")

            # 2. OFFLINE LOCAL NOTIFICATIONS:
            # ONLY trigger for the currently logged-in desktop user!
            if self.active_user_id:
                # Enforce at least 5-minute cooldown between automated background desktop popups
                if now_ts - self.last_alert_timestamp >= 300:
                    active_settings = self.db.get_settings(self.active_user_id)
                    if active_settings.get("enable_offline_popups"):
                        active_due_meds = dose_alert.get_due_medications(self.active_user_id)
                        new_offline_due = []
                        for med in active_due_meds:
                            med_id = med["med_id"]
                            offline_key = f"offline_{self.active_user_id}_{med_id}_{today_str}"
                            if offline_key not in self.notified_due_doses:
                                self.notified_due_doses.add(offline_key)
                                new_offline_due.append(med)

                        if new_offline_due:
                            self.last_alert_timestamp = now_ts
                            if len(new_offline_due) == 1:
                                single_med = new_offline_due[0]
                                title = "⏰ Medication Due Reminder"
                                message = f"Time to take: {single_med['name']} ({single_med['dosage']}) at {single_med.get('time_value', 'now')}."
                            elif len(new_offline_due) <= 3:
                                title = "⏰ Medications Due Reminder"
                                med_names = ", ".join([f"{m['name']} ({m['dosage']})" for m in new_offline_due])
                                message = f"Time to take your scheduled doses: {med_names}."
                            else:
                                title = "⏰ Medications Due Reminder"
                                sample_names = ", ".join([m['name'] for m in new_offline_due[:2]])
                                message = f"You have {len(new_offline_due)} doses due to take now ({sample_names}, and more)."

                            self._trigger_os_popup(title, message, show_dialog=False)

        except Exception as e:
            print(f"[NotificationWorker] Error checking due medications: {e}")

    def _run_loop(self):
        while self.running:
            try:
                self._check_offline_popups()
                self._check_due_medications()
                self._process_gmail_queue()
            except Exception as e:
                print(f"[NotificationWorker] Exception in background loop: {e}")
            time.sleep(self.check_interval)

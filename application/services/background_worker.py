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

    def _trigger_os_popup(self, title, message, medications=None, show_dialog=False):
        """
        Triggers offline notifications:
        1. In-App Floating Visual Notification (Visible when app window is open, with full details and borders)
        2. Modern Windows 10/11 Toast Banner with sound chime
        3. Native Topmost Dialog (Guarded against multi-stacking)
        """
        clean_title = title.replace("'", "").replace('"', "").replace("\n", " ")
        clean_message = message.replace("'", "").replace('"', "").replace("\n", " ")

        try:
            import webview
            import json
            if webview.windows and len(webview.windows) > 0:
                payload = json.dumps({
                    "title": title,
                    "message": message,
                    "medications": medications or [],
                    "timestamp": time.strftime("%I:%M %p"),
                    "date": time.strftime("%A, %b %d, %Y")
                })
                webview.windows[0].evaluate_js(
                    f"window.dispatchEvent(new CustomEvent('medication-due-alert', {{ detail: {payload} }}))"
                )
        except Exception as e:
            pass

        if show_dialog and not self.is_showing_dialog:
            self.is_showing_dialog = True
            def show_native_dialog():
                try:
                    import ctypes

                    flags = 0x40 | 0x10000 | 0x40000
                    ctypes.windll.user32.MessageBoxW(0, message, title, flags)
                except Exception as e:
                    print(f"[NotificationWorker] Native dialog error: {e}")
                finally:
                    self.is_showing_dialog = False

            threading.Thread(target=show_native_dialog, daemon=True).start()

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
                    import sys
                    creation_flags = 0x08000000 if sys.platform == 'win32' else 0
                    subprocess.run(
                        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp_path],
                        capture_output=True,
                        creationflags=creation_flags
                    )
                finally:
                    if os.path.exists(tmp_path):
                        try:
                            os.remove(tmp_path)
                        except Exception:
                            pass

            threading.Thread(target=run_ps, daemon=True).start()
        except Exception as ex:
            print(f"[NotificationWorker] Windows Toast Error: {ex}")

        def play_sound():
            try:
                import winsound
                winsound.MessageBeep(winsound.MB_ICONASTERISK)
            except Exception:
                pass
        threading.Thread(target=play_sound, daemon=True).start()

    def _check_offline_popups(self):
        pass

    def _generate_email_html(self, user_name, due_meds, today_str):
        med_rows = ""
        for med in due_meds:
            time_display = med.get('time_value', 'Today')
            med_rows += f"""
            <tr style="border-bottom: 1px solid #272e45;">
                <td style="padding: 14px 16px; font-weight: bold; color: #ffffff; font-size: 14px;">
                    {med['name']}
                </td>
                <td style="padding: 14px 16px; color: #38bdf8; font-weight: 600; font-size: 13px;">
                    <span style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; padding: 4px 8px;">
                        {med['dosage']}
                    </span>
                </td>
                <td style="padding: 14px 16px; color: #a78bfa; font-weight: 600; font-size: 13px;">
                    <span style="background: rgba(167, 139, 250, 0.15); border: 1px solid rgba(167, 139, 250, 0.4); border-radius: 6px; padding: 4px 8px;">
                        {time_display}
                    </span>
                </td>
                <td style="padding: 14px 16px; text-align: right;">
                    <span style="background: #102d24; border: 1px solid #10b981; color: #10b981; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 6px;">
                        SCHEDULED
                    </span>
                </td>
            </tr>
            """

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Medication Reminder</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #0b0e17; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #131726; border: 1px solid #272e45; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden;">
                <!-- Header Banner -->
                <tr>
                    <td style="padding: 24px 28px; background: #14192b; border-bottom: 1px solid #272e45;">
                        <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td>
                                    <h1 style="margin: 0; font-size: 18px; color: #ffffff; font-weight: 700;">Medication Scheduler</h1>
                                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Reminder for Today &bull; {today_str}</p>
                                </td>
                                <td align="right">
                                    <span style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #10b981; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 20px;">
                                        {len(due_meds)} Scheduled
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Greeting and Intro -->
                <tr>
                    <td style="padding: 24px 28px 12px 28px;">
                        <h2 style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; font-weight: 600;">Hello {user_name},</h2>
                        <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                            Here is your reminder for your scheduled medication today:
                        </p>
                    </td>
                </tr>

                <!-- Medication Details Table -->
                <tr>
                    <td style="padding: 12px 28px 20px 28px;">
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #272e45; border-radius: 10px; overflow: hidden; background-color: #171c2e;">
                            <thead>
                                <tr style="background-color: #1e2438; border-bottom: 1px solid #272e45;">
                                    <th align="left" style="padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Medication</th>
                                    <th align="left" style="padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Dosage</th>
                                    <th align="left" style="padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Time</th>
                                    <th align="right" style="padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {med_rows}
                            </tbody>
                        </table>
                    </td>
                </tr>

                <!-- Notice -->
                <tr>
                    <td style="padding: 0 28px 24px 28px;">
                        <div style="background-color: #171c2e; border: 1px solid #272e45; border-radius: 10px; padding: 14px 16px;">
                            <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                                Please take your prescribed dosage and remember to mark it as taken in your app.
                            </p>
                        </div>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding: 16px 28px; background-color: #0c0f1a; border-top: 1px solid #22273d; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #64748b;">
                            Medication Scheduler
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        return html

    def _process_gmail_queue(self):
        pending_emails = self.db.get_pending_emails()
        if not pending_emails:
            return

        if not self.is_connected_to_internet():
            return

        global_settings = self.db.get_settings()
        sender_email = (global_settings.get("sender_email") or "").strip()
        sender_password = (global_settings.get("sender_password") or "").strip()

        if not sender_email or not sender_password:
            print("[NotificationWorker] Gmail sender credentials not configured. Skipping email queue.")
            return

        for email_item in pending_emails[:3]:
            email_id = email_item[0]
            subject = email_item[1]
            body = email_item[2]
            target_recipient = (email_item[3] or "").strip()
            is_html = email_item[4] if len(email_item) > 4 else 0

            if not target_recipient:
                self.db.mark_email_sent(email_id)
                continue

            try:
                msg = MIMEMultipart("alternative")
                msg['From'] = f"Smart Medication Scheduler <{sender_email}>"
                msg['To'] = target_recipient
                msg['Subject'] = subject

                if is_html:
                    import re
                    plain_fallback = re.sub(r'<[^>]+>', ' ', body)
                    msg.attach(MIMEText(plain_fallback, 'plain'))
                    msg.attach(MIMEText(body, 'html'))
                else:
                    msg.attach(MIMEText(body, 'plain'))

                server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, target_recipient, msg.as_string())
                server.quit()
                self.db.mark_email_sent(email_id)
                print(f"[NotificationWorker] GMAIL DELIVERED! Email ID {email_id} sent to {target_recipient} from {sender_email}")
            except Exception as e:
                print(f"[NotificationWorker] Gmail SMTP Error: {e}")
                self.db.mark_email_sent(email_id)

    def _check_due_medications(self):
        try:
            from models.schedule import DoseAlert
            dose_alert = DoseAlert()

            now_ts = time.time()
            today_str = time.strftime("%Y-%m-%d")

            users = self.db.fetch_all("SELECT id, username, email FROM users")
            for u_id, u_name, u_email in users:
                u_settings = self.db.get_settings(u_id)
                if u_settings.get("enable_gmail_notifications"):
                    target_email = (u_settings.get("recipient_email") or u_email or "").strip()
                    if target_email:
                        due_meds = dose_alert.get_due_medications(u_id)

                        user_new_due = [m for m in due_meds if not self.db.is_already_notified_today(u_id, m['med_id'], 'email', today_str)]

                        if user_new_due:

                            for m in user_new_due:
                                self.db.mark_notified_today(u_id, m['med_id'], 'email', today_str)

                            dose_word = "dose" if len(user_new_due) == 1 else "doses"
                            subject = f"Medication Reminder: {len(user_new_due)} scheduled {dose_word} today"
                            html_body = self._generate_email_html(u_name, user_new_due, today_str)
                            self.db.enqueue_email(subject, html_body, target_email, is_html=1)
                            print(f"[NotificationWorker] Enqueued strictly 1x HTML email for {u_name} ({target_email}) with {len(user_new_due)} medications.")

            if self.active_user_id:
                active_settings = self.db.get_settings(self.active_user_id)
                if active_settings.get("enable_offline_popups"):
                    active_due_meds = dose_alert.get_due_medications(self.active_user_id)

                    new_offline_due = [m for m in active_due_meds if not self.db.is_already_notified_today(self.active_user_id, m['med_id'], 'offline', today_str)]

                    if new_offline_due:

                        for m in new_offline_due:
                            self.db.mark_notified_today(self.active_user_id, m['med_id'], 'offline', today_str)

                        self.last_alert_timestamp = now_ts
                        title = "Medication Reminder"
                        if len(new_offline_due) == 1:
                            single_med = new_offline_due[0]
                            time_str = single_med.get('time_value')
                            time_text = f" scheduled at {time_str}" if time_str else ""
                            message = f"Time to take {single_med['name']} ({single_med['dosage']}){time_text}."
                        elif len(new_offline_due) <= 3:
                            med_names = ", ".join([f"{m['name']} ({m['dosage']})" for m in new_offline_due])
                            message = f"Time to take your scheduled doses: {med_names}."
                        else:
                            sample_names = ", ".join([m['name'] for m in new_offline_due[:2]])
                            message = f"You have {len(new_offline_due)} doses scheduled today, including {sample_names}."

                        self._trigger_os_popup(title, message, medications=new_offline_due, show_dialog=False)

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

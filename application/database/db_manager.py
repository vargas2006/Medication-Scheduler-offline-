import sqlite3
import os
import sys
import shutil

class DatabaseManager:
    _instance = None

    def __new__(cls, db_name=None):
        if cls._instance is None:
            if db_name is None:

                if sys.platform == 'win32':
                    app_data = os.environ.get('APPDATA', os.path.expanduser('~'))
                elif sys.platform == 'darwin':
                    app_data = os.path.expanduser('~/Library/Application Support')
                else:
                    app_data = os.path.expanduser('~/.config')

                data_dir = os.path.join(app_data, 'SmartMedicationScheduler')
                os.makedirs(data_dir, exist_ok=True)
                target_db = os.path.join(data_dir, 'med_scheduler.db')

                if not os.path.exists(target_db):
                    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    legacy_paths = [
                        os.path.join(base_dir, "med_scheduler.db"),
                        os.path.join(os.getcwd(), "med_scheduler.db"),
                    ]
                    for legacy in legacy_paths:
                        if os.path.exists(legacy) and os.path.getsize(legacy) > 0:
                            try:
                                shutil.copy2(legacy, target_db)
                                print(f"[DatabaseManager] Migrated existing DB from {legacy} to {target_db}")
                                break
                            except Exception as e:
                                print(f"[DatabaseManager] Warning migrating legacy DB: {e}")

                db_name = target_db

            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance.db_name = db_name
            cls._instance._initialize_db()
        return cls._instance

    def get_connection(self):
        return sqlite3.connect(self.db_name)

    def _initialize_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                email TEXT
            )
        ''')

        try:
            cursor.execute("ALTER TABLE users ADD COLUMN name TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
        except sqlite3.OperationalError:
            pass

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS password_resets (
                email TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                refill_threshold INTEGER NOT NULL DEFAULT 5,
                image_path TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        ''')

        try:
            cursor.execute("ALTER TABLE medications ADD COLUMN image_path TEXT")
        except sqlite3.OperationalError:
            pass

        for col_name, col_type in [
            ("strength", "TEXT DEFAULT ''"),
            ("dosage_form", "TEXT DEFAULT 'Tablet'"),
            ("stock_unit", "TEXT DEFAULT 'tablets'"),
            ("start_date", "TEXT DEFAULT NULL"),
            ("end_date", "TEXT DEFAULT NULL")
        ]:
            try:
                cursor.execute(f"ALTER TABLE medications ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                medication_id INTEGER NOT NULL,
                schedule_type TEXT NOT NULL,
                time_value TEXT NOT NULL,
                FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE CASCADE
            )
        ''')

        for col_name, col_type in [
            ("dose_per_intake", "INTEGER DEFAULT 1"),
            ("dose_unit", "TEXT DEFAULT 'tablet'"),
            ("frequency", "TEXT DEFAULT 'Every day'"),
            ("start_date", "TEXT DEFAULT NULL"),
            ("end_date", "TEXT DEFAULT NULL"),
            ("instructions", "TEXT DEFAULT ''"),
            ("status", "TEXT DEFAULT 'ACTIVE'")
        ]:
            try:
                cursor.execute(f"ALTER TABLE schedules ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS intake_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                medication_id INTEGER,
                medication_name TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        try:
            cursor.execute("ALTER TABLE intake_log ADD COLUMN medication_name TEXT")
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute("""
                UPDATE intake_log
                SET medication_name = (
                    SELECT name FROM medications WHERE medications.id = intake_log.medication_id
                )
                WHERE (medication_name IS NULL OR medication_name = '')
                AND medication_id IN (SELECT id FROM medications)
            """)
        except Exception:
            pass

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY,
                enable_offline_popups INTEGER NOT NULL DEFAULT 0,
                enable_gmail_notifications INTEGER NOT NULL DEFAULT 0,
                recipient_email TEXT DEFAULT '',
                sender_email TEXT DEFAULT '',
                sender_password TEXT DEFAULT ''
            )
        ''')

        try:
            cursor.execute("ALTER TABLE schedules ADD COLUMN schedule_date TEXT DEFAULT NULL")
        except sqlite3.OperationalError:
            pass

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications_sent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                medication_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                notified_date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, medication_id, notification_type, notified_date)
            )
        ''')

        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN sender_email TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN sender_password TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN is_email_verified INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN user_id INTEGER DEFAULT NULL")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN remember_user_id INTEGER DEFAULT NULL")
        except sqlite3.OperationalError:
            pass

        cursor.execute('''
            INSERT OR IGNORE INTO settings (id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, is_email_verified, remember_user_id)
            VALUES (1, 0, 0, '', '', '', 0, NULL)
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                recipient_email TEXT DEFAULT '',
                is_html INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        try:
            cursor.execute("ALTER TABLE email_queue ADD COLUMN recipient_email TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE email_queue ADD COLUMN is_html INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass

        conn.commit()
        conn.close()

    def execute_query(self, query, params=()):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        lastrowid = cursor.lastrowid
        conn.close()
        return lastrowid

    def fetch_all(self, query, params=()):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return rows

    def fetch_one(self, query, params=()):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        conn.close()
        return row

    def get_settings(self, user_id=None):

        g_row = self.fetch_one("SELECT sender_email, sender_password FROM settings WHERE id = 1")
        global_sender = (g_row[0] or "").strip() if g_row else ""
        global_pass = (g_row[1] or "").strip() if g_row else ""

        if user_id:
            row = self.fetch_one(
                "SELECT id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, is_email_verified FROM settings WHERE user_id = ?",
                (int(user_id),)
            )
            if row:
                s_email = (row[4] or "").strip() or global_sender
                s_pass = (row[5] or "").strip() or global_pass
                return {
                    "enable_offline_popups": row[1],
                    "enable_gmail_notifications": row[2],
                    "recipient_email": row[3] or "",
                    "sender_email": s_email,
                    "sender_password": s_pass,
                    "is_email_verified": row[6] if len(row) > 6 and row[6] is not None else 0
                }
            self.execute_query(
                "INSERT INTO settings (user_id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, is_email_verified) VALUES (?, 0, 0, '', '', '', 0)",
                (int(user_id),)
            )
            return {
                "enable_offline_popups": 0,
                "enable_gmail_notifications": 0,
                "recipient_email": "",
                "sender_email": global_sender,
                "sender_password": global_pass,
                "is_email_verified": 0
            }

        row = self.fetch_one("SELECT id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, is_email_verified FROM settings WHERE id = 1")
        if not row:
            self.execute_query("INSERT OR IGNORE INTO settings (id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, is_email_verified) VALUES (1, 0, 0, '', '', '', 0)")
            return {"enable_offline_popups": 0, "enable_gmail_notifications": 0, "recipient_email": "", "sender_email": "", "sender_password": "", "is_email_verified": 0}
        return {
            "enable_offline_popups": row[1],
            "enable_gmail_notifications": row[2],
            "recipient_email": row[3] or "",
            "sender_email": (row[4] or "").strip(),
            "sender_password": (row[5] or "").strip(),
            "is_email_verified": row[6] if len(row) > 6 and row[6] is not None else 0
        }

    def save_settings(self, enable_offline_popups, enable_gmail_notifications, recipient_email="", sender_email="", sender_password="", user_id=None, is_email_verified=None):
        clean_sender_email = str(sender_email).strip()
        clean_sender_password = str(sender_password).strip()
        clean_recipient = str(recipient_email).strip()

        if user_id:
            user_id = int(user_id)
            existing = self.fetch_one("SELECT id, is_email_verified, sender_email, sender_password FROM settings WHERE user_id = ?", (user_id,))
            if existing:
                verified_val = is_email_verified if is_email_verified is not None else existing[1]
                s_email = clean_sender_email if clean_sender_email else ((existing[2] or "").strip() or "lbag5176@gmail.com")
                s_pass = clean_sender_password if clean_sender_password else ((existing[3] or "").strip() or "ttqiembzpocswrid")
                self.execute_query('''
                    UPDATE settings 
                    SET enable_offline_popups = ?, 
                        enable_gmail_notifications = ?, 
                        recipient_email = ?,
                        sender_email = ?,
                        sender_password = ?,
                        is_email_verified = ?
                    WHERE user_id = ?
                ''', (int(enable_offline_popups), int(enable_gmail_notifications), clean_recipient, s_email, s_pass, int(verified_val), user_id))
            else:
                verified_val = is_email_verified if is_email_verified is not None else 0
                s_email = clean_sender_email if clean_sender_email else "lbag5176@gmail.com"
                s_pass = clean_sender_password if clean_sender_password else "ttqiembzpocswrid"
                self.execute_query('''
                    INSERT INTO settings (user_id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password, is_email_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, int(enable_offline_popups), int(enable_gmail_notifications), clean_recipient, s_email, s_pass, int(verified_val)))
            return True

    def save_remember_me(self, user_id):
        self.execute_query("UPDATE settings SET remember_user_id = ? WHERE id = 1", (int(user_id),))

    def clear_remember_me(self):
        self.execute_query("UPDATE settings SET remember_user_id = NULL WHERE id = 1")

    def get_remembered_user_id(self):
        row = self.fetch_one("SELECT remember_user_id FROM settings WHERE id = 1")
        if row and row[0] is not None:
            user_exists = self.fetch_one("SELECT id FROM users WHERE id = ?", (int(row[0]),))
            if user_exists:
                return row[0]
            else:
                self.clear_remember_me()
        return None

    def enqueue_email(self, subject, body, recipient_email="", is_html=0):
        return self.execute_query(
            "INSERT INTO email_queue (subject, body, recipient_email, is_html, status) VALUES (?, ?, ?, ?, 'pending')", 
            (subject, body, str(recipient_email).strip(), int(is_html))
        )

    def get_pending_emails(self):
        return self.fetch_all("SELECT id, subject, body, recipient_email, is_html FROM email_queue WHERE status = 'pending'")

    def mark_email_sent(self, email_id):
        self.execute_query("UPDATE email_queue SET status = 'sent' WHERE id = ?", (email_id,))

    def is_already_notified_today(self, user_id, medication_id, notification_type, notified_date):
        """
        Checks if a notification has already been sent to this user for this medication today.
        Guarantees strictly 1x notification per day.
        """
        row = self.fetch_one(
            "SELECT id FROM notifications_sent WHERE user_id = ? AND medication_id = ? AND notification_type = ? AND notified_date = ?",
            (int(user_id), int(medication_id), str(notification_type), str(notified_date))
        )
        return row is not None

    def mark_notified_today(self, user_id, medication_id, notification_type, notified_date):
        """
        Records that a notification was sent so it will not repeat today.
        """
        self.execute_query(
            "INSERT OR IGNORE INTO notifications_sent (user_id, medication_id, notification_type, notified_date) VALUES (?, ?, ?, ?)",
            (int(user_id), int(medication_id), str(notification_type), str(notified_date))
        )


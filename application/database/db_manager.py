import sqlite3
import os

class DatabaseManager:
    _instance = None

    def __new__(cls, db_name=None):
        if cls._instance is None:
            if db_name is None:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                db_name = os.path.join(base_dir, "med_scheduler.db")
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance.db_name = db_name
            cls._instance._initialize_db()
        return cls._instance

    def get_connection(self):
        return sqlite3.connect(self.db_name)

    def _initialize_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                email TEXT
            )
        ''')

        # Add name and email to existing databases if missing
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN name TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
        except sqlite3.OperationalError:
            pass

        # Medications table
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

        # Add image_path to existing databases if it's missing
        try:
            cursor.execute("ALTER TABLE medications ADD COLUMN image_path TEXT")
        except sqlite3.OperationalError:
            pass # Column already exists

        # Schedules table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                medication_id INTEGER NOT NULL,
                schedule_type TEXT NOT NULL,
                time_value TEXT NOT NULL,
                FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE CASCADE
            )
        ''')

        # Intake history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS intake_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                medication_id INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE CASCADE
            )
        ''')

        # Settings table (Single configuration row id=1)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY,
                enable_offline_popups INTEGER NOT NULL DEFAULT 0,
                enable_gmail_notifications INTEGER NOT NULL DEFAULT 0,
                recipient_email TEXT DEFAULT '',
                sender_email TEXT DEFAULT 'johnleevargas25@gmail.com',
                sender_password TEXT DEFAULT 'ocpl htqd tblw zquk'
            )
        ''')

        try:
            cursor.execute("ALTER TABLE schedules ADD COLUMN schedule_date TEXT DEFAULT NULL")
        except sqlite3.OperationalError:
            pass

        # Notifications sent tracking table to ensure strictly 1x notification per day
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
            cursor.execute("ALTER TABLE settings ADD COLUMN sender_email TEXT DEFAULT 'johnleevargas25@gmail.com'")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN sender_password TEXT DEFAULT 'ocpl htqd tblw zquk'")
        except sqlite3.OperationalError:
            pass

        cursor.execute('''
            INSERT OR IGNORE INTO settings (id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password)
            VALUES (1, 0, 0, '', 'johnleevargas25@gmail.com', 'ocpl htqd tblw zquk')
        ''')
        # Ensure sender credentials are populated
        cursor.execute('''
            UPDATE settings 
            SET sender_email = 'johnleevargas25@gmail.com', 
                sender_password = 'ocpl htqd tblw zquk' 
            WHERE id = 1 AND (sender_email = '' OR sender_password = '')
        ''')

        # Email queue table for offline email persistence
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
        if user_id:
            row = self.fetch_one(
                "SELECT id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password FROM settings WHERE user_id = ?",
                (int(user_id),)
            )
            if row:
                return {
                    "enable_offline_popups": row[1],
                    "enable_gmail_notifications": row[2],
                    "recipient_email": row[3] or "",
                    "sender_email": row[4] or "johnleevargas25@gmail.com",
                    "sender_password": row[5] or "ocpl htqd tblw zquk"
                }
            # Look up user's default email from users table
            u = self.fetch_one("SELECT email FROM users WHERE id = ?", (int(user_id),))
            default_email = (u[0] or "").strip() if u else ""
            self.execute_query(
                "INSERT INTO settings (user_id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password) VALUES (?, 0, 0, ?, 'johnleevargas25@gmail.com', 'ocpl htqd tblw zquk')",
                (int(user_id), default_email)
            )
            return {
                "enable_offline_popups": 0,
                "enable_gmail_notifications": 0,
                "recipient_email": default_email,
                "sender_email": "johnleevargas25@gmail.com",
                "sender_password": "ocpl htqd tblw zquk"
            }

        # Fallback to row id=1
        row = self.fetch_one("SELECT id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password FROM settings WHERE id = 1")
        if not row:
            self.execute_query("INSERT OR IGNORE INTO settings (id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password) VALUES (1, 0, 0, '', 'johnleevargas25@gmail.com', 'ocpl htqd tblw zquk')")
            return {"enable_offline_popups": 0, "enable_gmail_notifications": 0, "recipient_email": "", "sender_email": "johnleevargas25@gmail.com", "sender_password": "ocpl htqd tblw zquk"}
        return {
            "enable_offline_popups": row[1],
            "enable_gmail_notifications": row[2],
            "recipient_email": row[3] or "",
            "sender_email": row[4] or "johnleevargas25@gmail.com",
            "sender_password": row[5] or "ocpl htqd tblw zquk"
        }

    def save_settings(self, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email="", sender_password="", user_id=None):
        clean_sender_email = str(sender_email).strip() or "johnleevargas25@gmail.com"
        clean_sender_password = str(sender_password).strip() or "ocpl htqd tblw zquk"
        clean_recipient = str(recipient_email).strip()

        if user_id:
            user_id = int(user_id)
            existing = self.fetch_one("SELECT id FROM settings WHERE user_id = ?", (user_id,))
            if existing:
                self.execute_query('''
                    UPDATE settings 
                    SET enable_offline_popups = ?, 
                        enable_gmail_notifications = ?, 
                        recipient_email = ?,
                        sender_email = ?,
                        sender_password = ?
                    WHERE user_id = ?
                ''', (int(enable_offline_popups), int(enable_gmail_notifications), clean_recipient, clean_sender_email, clean_sender_password, user_id))
            else:
                self.execute_query('''
                    INSERT INTO settings (user_id, enable_offline_popups, enable_gmail_notifications, recipient_email, sender_email, sender_password)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_id, int(enable_offline_popups), int(enable_gmail_notifications), clean_recipient, clean_sender_email, clean_sender_password))
            return True

        self.execute_query('''
            UPDATE settings 
            SET enable_offline_popups = ?, 
                enable_gmail_notifications = ?, 
                recipient_email = ?,
                sender_email = ?,
                sender_password = ?
            WHERE id = 1
        ''', (int(enable_offline_popups), int(enable_gmail_notifications), clean_recipient, clean_sender_email, clean_sender_password))
        return True

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


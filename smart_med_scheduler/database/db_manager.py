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
                password TEXT NOT NULL
            )
        ''')

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

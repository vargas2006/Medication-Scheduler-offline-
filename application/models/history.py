from database.db_manager import DatabaseManager
from datetime import datetime
import csv
import os

class HistoryLog:
    def __init__(self, log_id, user_id, med_id, med_name, timestamp, status):
        self.log_id = log_id
        self.user_id = user_id
        self.med_id = med_id
        self.med_name = med_name
        self.timestamp = timestamp
        self.status = status

class ReportGenerator:
    def __init__(self):
        self.db = DatabaseManager()

    def log_intake(self, user_id, med_id, status, timestamp=None):
        if not timestamp:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        row = self.db.fetch_one("SELECT name FROM medications WHERE id = ?", (med_id,))
        med_name = row[0] if row and row[0] else "Medication"
        self.db.execute_query(
            "INSERT INTO intake_log (user_id, medication_id, medication_name, timestamp, status) VALUES (?, ?, ?, ?, ?)",
            (user_id, med_id, med_name, timestamp, status)
        )

    def delete_log(self, log_id):
        self.db.execute_query("DELETE FROM intake_log WHERE id = ?", (log_id,))

    def get_user_history(self, user_id=None):
        if user_id is not None:
            query = '''
                SELECT l.id, l.user_id, l.medication_id, 
                       COALESCE(NULLIF(l.medication_name, ''), m.name, 'Deleted Medication') AS med_name, 
                       l.timestamp, l.status 
                FROM intake_log l
                LEFT JOIN medications m ON l.medication_id = m.id
                WHERE l.user_id = ? AND l.status = 'TAKEN'
                ORDER BY l.timestamp DESC
            '''
            rows = self.db.fetch_all(query, (user_id,))
        else:
            query = '''
                SELECT l.id, l.user_id, l.medication_id, 
                       COALESCE(NULLIF(l.medication_name, ''), m.name, 'Deleted Medication') AS med_name, 
                       l.timestamp, l.status 
                FROM intake_log l
                LEFT JOIN medications m ON l.medication_id = m.id
                WHERE l.status = 'TAKEN'
                ORDER BY l.timestamp DESC
            '''
            rows = self.db.fetch_all(query)
        return [HistoryLog(*row) for row in rows]

    def export_to_csv(self, user_id, filepath):
        history = self.get_user_history(user_id)
        with open(filepath, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['Log ID', 'Medication Name', 'Timestamp', 'Status'])
            for log in history:
                writer.writerow([log.log_id, log.med_name, log.timestamp, log.status])
        return True

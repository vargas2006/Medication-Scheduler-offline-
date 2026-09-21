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

    def log_intake(self, user_id, med_id, status):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.db.execute_query(
            "INSERT INTO intake_log (user_id, medication_id, timestamp, status) VALUES (?, ?, ?, ?)",
            (user_id, med_id, timestamp, status)
        )

    def get_user_history(self, user_id=None):
        query = '''
            SELECT l.id, l.user_id, l.medication_id, m.name, l.timestamp, l.status 
            FROM intake_log l
            JOIN medications m ON l.medication_id = m.id
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

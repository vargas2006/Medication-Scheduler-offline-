from database.db_manager import DatabaseManager
from datetime import datetime, timedelta

class Schedule:
    def __init__(self, schedule_id, med_id, schedule_type, time_value):
        self.schedule_id = schedule_id
        self.med_id = med_id
        self.schedule_type = schedule_type
        self.time_value = time_value

class DoseAlert:
    def __init__(self):
        self.db = DatabaseManager()

    def add_schedule(self, med_id, schedule_type, time_value):
        self.db.execute_query(
            "INSERT INTO schedules (medication_id, schedule_type, time_value) VALUES (?, ?, ?)",
            (med_id, schedule_type, time_value)
        )

    def get_medication_schedules(self, med_id):
        rows = self.db.fetch_all("SELECT id, medication_id, schedule_type, time_value FROM schedules WHERE medication_id = ?", (med_id,))
        return [Schedule(*row) for row in rows]

    def get_due_medications(self, user_id):
        """
        Returns a list of medication dicts that are currently due for the specific user.
        """
        if not user_id:
            return []

        due_meds = []
        now = datetime.now()
        
        query = '''
            SELECT m.id, m.name, m.dosage, s.schedule_type, s.time_value,
                   (SELECT MAX(timestamp) FROM intake_log WHERE medication_id = m.id AND status = 'TAKEN') as last_taken
            FROM medications m
            JOIN schedules s ON m.id = s.medication_id
            WHERE m.user_id = ?
        '''
        rows = self.db.fetch_all(query, (user_id,))
        
        for med_id, med_name, dosage, sched_type, time_value, last_taken_str in rows:
            last_taken_time = None
            if last_taken_str:
                try:
                    last_taken_time = datetime.strptime(last_taken_str, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass

            is_due = False
            if sched_type == 'DAILY_TIME':
                try:
                    sched_time = datetime.strptime(time_value, "%H:%M").time()
                    if now.time() >= sched_time:
                        if not last_taken_time or last_taken_time.date() < now.date():
                            is_due = True
                except Exception:
                    pass
            elif sched_type == 'INTERVAL':
                try:
                    hours = int(time_value)
                    if not last_taken_time:
                        is_due = True
                    elif now >= last_taken_time + timedelta(hours=hours):
                        is_due = True
                except Exception:
                    pass
            
            if is_due:
                due_meds.append({
                    "med_id": med_id, 
                    "name": med_name, 
                    "dosage": dosage, 
                    "time_value": time_value
                })
                
        return due_meds

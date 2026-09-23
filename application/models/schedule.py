from database.db_manager import DatabaseManager
from datetime import datetime, timedelta

class Schedule:
    def __init__(self, schedule_id, med_id, schedule_type, time_value, schedule_date=None):
        self.schedule_id = schedule_id
        self.med_id = med_id
        self.schedule_type = schedule_type
        self.time_value = time_value
        self.schedule_date = schedule_date

class DoseAlert:
    def __init__(self):
        self.db = DatabaseManager()

    def add_schedule(self, med_id, schedule_type, time_value, schedule_date=None):
        self.db.execute_query(
            "INSERT INTO schedules (medication_id, schedule_type, time_value, schedule_date) VALUES (?, ?, ?, ?)",
            (med_id, schedule_type, time_value, schedule_date)
        )

    def get_medication_schedules(self, med_id):
        rows = self.db.fetch_all("SELECT id, medication_id, schedule_type, time_value, schedule_date FROM schedules WHERE medication_id = ?", (med_id,))
        return [Schedule(*row) for row in rows]

    def get_due_medications(self, user_id):
        """
        Returns a list of medication dicts that are currently due TODAY for the specific user.
        Excludes doses scheduled for other dates, and doses already taken today.
        """
        if not user_id:
            return []

        due_meds = []
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        
        query = '''
            SELECT m.id, m.name, m.dosage, s.schedule_type, s.time_value, s.schedule_date,
                   (SELECT MAX(timestamp) FROM intake_log WHERE medication_id = m.id AND status = 'TAKEN') as last_taken
            FROM medications m
            JOIN schedules s ON m.id = s.medication_id
            WHERE m.user_id = ?
        '''
        rows = self.db.fetch_all(query, (user_id,))
        
        for med_id, med_name, dosage, sched_type, time_value, sched_date, last_taken_str in rows:
            # 1. Date check: If a specific schedule_date is set, it MUST be today
            if sched_date and str(sched_date).strip():
                clean_date = str(sched_date).strip()
                if clean_date != today_str:
                    continue

            # 2. Check if already taken today
            last_taken_time = None
            if last_taken_str:
                try:
                    last_taken_time = datetime.strptime(last_taken_str, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass

            if last_taken_time and last_taken_time.date() == now.date():
                # Dose was already taken today
                continue

            # 3. Time check for today
            is_due = False
            if sched_type == 'DAILY_TIME':
                try:
                    raw_time = str(time_value).strip()[:5]
                    sched_time = datetime.strptime(raw_time, "%H:%M").time()
                    if now.time() >= sched_time:
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
                    "time_value": time_value,
                    "schedule_date": sched_date or today_str
                })
                
        return due_meds

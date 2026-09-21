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
        Returns a list of medication IDs that are currently due.
        Simplistic approach:
        - DAILY_TIME: If current time >= scheduled time and it hasn't been taken today.
        - INTERVAL: If current time >= last taken time + interval.
        """
        due_meds = []
        now = datetime.now()
        
        # Get all medications for user
        meds = self.db.fetch_all("SELECT id, name FROM medications WHERE user_id = ?", (user_id,))
        
        for med in meds:
            med_id = med[0]
            med_name = med[1]
            schedules = self.get_medication_schedules(med_id)
            
            # Get last taken log
            last_log = self.db.fetch_one(
                "SELECT timestamp FROM intake_log WHERE medication_id = ? AND status = 'TAKEN' ORDER BY timestamp DESC LIMIT 1",
                (med_id,)
            )
            
            last_taken_time = None
            if last_log:
                last_taken_time = datetime.strptime(last_log[0], "%Y-%m-%d %H:%M:%S")

            is_due = False
            for sched in schedules:
                if sched.schedule_type == 'DAILY_TIME':
                    # Check if time_value (e.g. 08:00) has passed today
                    sched_time = datetime.strptime(sched.time_value, "%H:%M").time()
                    if now.time() >= sched_time:
                        # Check if taken today
                        if not last_taken_time or last_taken_time.date() < now.date():
                            is_due = True
                            break
                elif sched.schedule_type == 'INTERVAL':
                    # Check if interval hours have passed since last taken
                    hours = int(sched.time_value)
                    if not last_taken_time:
                        is_due = True # Never taken, so due now
                        break
                    else:
                        if now >= last_taken_time + timedelta(hours=hours):
                            is_due = True
                            break
            
            if is_due:
                due_meds.append({"med_id": med_id, "name": med_name})
                
        return due_meds

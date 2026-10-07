from database.db_manager import DatabaseManager

class Medication:
    def __init__(self, med_id, user_id, name, dosage, stock, refill_threshold, image_path=None, strength='', dosage_form='Tablet', stock_unit='tablets', start_date=None, end_date=None, expiration_date=None):
        self.med_id = med_id
        self.user_id = user_id
        self.name = name
        self.dosage = dosage
        self.stock = stock
        self.refill_threshold = refill_threshold
        self.image_path = image_path
        self.strength = strength or dosage
        self.dosage_form = dosage_form or 'Tablet'
        self.stock_unit = stock_unit or 'tablets'
        self.start_date = start_date
        self.end_date = end_date
        self.expiration_date = expiration_date

    def is_low_stock(self):
        return self.stock <= self.refill_threshold

class InventoryManager:
    def __init__(self):
        self.db = DatabaseManager()

    def get_user_medications(self, user_id=None):
        query = "SELECT id, user_id, name, dosage, stock, refill_threshold, image_path, COALESCE(NULLIF(strength, ''), dosage), COALESCE(NULLIF(dosage_form, ''), 'Tablet'), COALESCE(NULLIF(stock_unit, ''), 'tablets'), start_date, end_date, expiration_date FROM medications"
        if user_id is not None:
            rows = self.db.fetch_all(query + " WHERE user_id = ?", (user_id,))
        else:
            rows = self.db.fetch_all(query)
        medications = []
        for row in rows:
            medications.append(Medication(*row))
        return medications

    def add_medication(self, user_id, name, dosage, stock, refill_threshold, image_path=None, strength=None, dosage_form='Tablet', stock_unit='tablets', start_date=None, end_date=None, expiration_date=None):
        clean_strength = strength.strip() if strength else dosage.strip()
        clean_form = dosage_form.strip() if dosage_form else 'Tablet'
        clean_unit = stock_unit.strip() if stock_unit else 'tablets'
        clean_start = start_date.strip() if start_date else None
        clean_end = end_date.strip() if end_date else None
        clean_exp = expiration_date.strip() if expiration_date else None
        return self.db.execute_query(
            "INSERT INTO medications (user_id, name, dosage, stock, refill_threshold, image_path, strength, dosage_form, stock_unit, start_date, end_date, expiration_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, name, dosage, stock, refill_threshold, image_path, clean_strength, clean_form, clean_unit, clean_start, clean_end, clean_exp)
        )

    def update_medication(self, med_id, name, dosage, stock, refill_threshold, image_path=None, strength=None, dosage_form='Tablet', stock_unit='tablets', start_date=None, end_date=None, expiration_date=None):
        clean_strength = strength.strip() if strength else dosage.strip()
        clean_form = dosage_form.strip() if dosage_form else 'Tablet'
        clean_unit = stock_unit.strip() if stock_unit else 'tablets'
        clean_start = start_date.strip() if start_date else None
        clean_end = end_date.strip() if end_date else None
        clean_exp = expiration_date.strip() if expiration_date else None
        self.db.execute_query(
            "UPDATE medications SET name = ?, dosage = ?, stock = ?, refill_threshold = ?, image_path = ?, strength = ?, dosage_form = ?, stock_unit = ?, start_date = ?, end_date = ?, expiration_date = ? WHERE id = ?",
            (name, dosage, stock, refill_threshold, image_path, clean_strength, clean_form, clean_unit, clean_start, clean_end, clean_exp, med_id)
        )

    def deduct_stock(self, med_id, amount=1):
        amt = int(amount) if amount else 1
        self.db.execute_query("UPDATE medications SET stock = MAX(0, stock - ?) WHERE id = ?", (amt, med_id))

    def add_stock(self, med_id, amount):
        amt = int(amount) if amount else 0
        if amt > 0:
            self.db.execute_query("UPDATE medications SET stock = stock + ? WHERE id = ?", (amt, med_id))

    def delete_medication(self, med_id):
        row = self.db.fetch_one("SELECT name FROM medications WHERE id = ?", (med_id,))
        if row and row[0]:
            med_name = row[0]
            self.db.execute_query(
                "UPDATE intake_log SET medication_name = ? WHERE medication_id = ? AND (medication_name IS NULL OR medication_name = '')",
                (med_name, med_id)
            )
        self.db.execute_query("DELETE FROM medications WHERE id = ?", (med_id,))

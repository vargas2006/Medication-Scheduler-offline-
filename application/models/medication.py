from database.db_manager import DatabaseManager

class Medication:
    def __init__(self, med_id, user_id, name, dosage, stock, refill_threshold, image_path=None):
        self.med_id = med_id
        self.user_id = user_id
        self.name = name
        self.dosage = dosage
        self.stock = stock
        self.refill_threshold = refill_threshold
        self.image_path = image_path

    def is_low_stock(self):
        return self.stock <= self.refill_threshold

class InventoryManager:
    def __init__(self):
        self.db = DatabaseManager()

    def get_user_medications(self, user_id=None):
        if user_id is not None:
            rows = self.db.fetch_all("SELECT id, user_id, name, dosage, stock, refill_threshold, image_path FROM medications WHERE user_id = ?", (user_id,))
        else:
            rows = self.db.fetch_all("SELECT id, user_id, name, dosage, stock, refill_threshold, image_path FROM medications")
        medications = []
        for row in rows:
            medications.append(Medication(*row))
        return medications

    def add_medication(self, user_id, name, dosage, stock, refill_threshold, image_path=None):
        return self.db.execute_query(
            "INSERT INTO medications (user_id, name, dosage, stock, refill_threshold, image_path) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, name, dosage, stock, refill_threshold, image_path)
        )

    def update_medication(self, med_id, name, dosage, stock, refill_threshold, image_path=None):
        self.db.execute_query(
            "UPDATE medications SET name = ?, dosage = ?, stock = ?, refill_threshold = ?, image_path = ? WHERE id = ?",
            (name, dosage, stock, refill_threshold, image_path, med_id)
        )

    def deduct_stock(self, med_id):
        self.db.execute_query("UPDATE medications SET stock = stock - 1 WHERE id = ? AND stock > 0", (med_id,))

    def delete_medication(self, med_id):
        self.db.execute_query("DELETE FROM medications WHERE id = ?", (med_id,))

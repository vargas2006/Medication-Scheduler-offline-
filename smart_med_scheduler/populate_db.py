import sqlite3
import random
import os
import json
from urllib import request, error
from datetime import datetime, timedelta

def get_wiki_image(drug_name):
    # Try to fetch an image from Wikipedia
    url = f"https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles={drug_name}&pithumbsize=200&format=json"
    try:
        req = request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            pages = data.get("query", {}).get("pages", {})
            for page_id, page_data in pages.items():
                if "thumbnail" in page_data:
                    return page_data["thumbnail"]["source"]
    except Exception as e:
        print(f"Error fetching image for {drug_name}: {e}")
    return None

def download_image(url, save_path):
    try:
        req = request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with request.urlopen(req, timeout=5) as response:
            with open(save_path, 'wb') as f:
                f.write(response.read())
        return True
    except Exception as e:
        print(f"Failed to download image {url}: {e}")
    return False

def populate():
    db_path = "med_scheduler.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Clear old dummy data
    cursor.execute("DELETE FROM intake_log")
    cursor.execute("DELETE FROM schedules")
    cursor.execute("DELETE FROM medications")
    cursor.execute("DELETE FROM users")

    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", ("admin", "admin"))
    user_id = cursor.lastrowid
    print("Created new user 'admin'")

    drugs = [
        "Paracetamol", "Ibuprofen", "Amoxicillin", "Aspirin", "Metformin", 
        "Omeprazole", "Simvastatin", "Losartan", "Azithromycin", "Amlodipine", 
        "Levothyroxine", "Atorvastatin", "Metoprolol", "Pantoprazole", "Salbutamol", 
        "Gabapentin", "Sertraline", "Furosemide", "Fluticasone", "Tramadol", 
        "Escitalopram", "Ciprofloxacin", "Meloxicam", "Clopidogrel", "Cephalexin",
        "Duloxetine", "Bupropion", "Pravastatin", "Trazodone", "Loratadine",
        "Cetirizine", "Naproxen", "Fluoxetine", "Atenolol", "Rosuvastatin",
        "Venlafaxine", "Diclofenac", "Alprazolam", "Clonazepam", "Lorazepam",
        "Diazepam", "Zolpidem", "Allopurinol", "Famotidine", "Citalopram",
        "Amitriptyline", "Ondansetron", "Tamsulosin", "Mirtazapine", "Doxycycline"
    ]

    img_dir = "drug_images"
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)

    print("Fetching images and generating 200 medications (this might take a minute)...")
    
    # Cache to avoid re-downloading the same drug image
    downloaded_images = {}
    default_img_url = "https://placehold.co/200x200/png?text=Pill"
    
    count = 0
    for i in range(200):
        base_drug = random.choice(drugs)
        dosage = random.choice(["10mg", "20mg", "50mg", "100mg", "250mg", "500mg"])
        med_name = f"{base_drug} {dosage}"
        
        # Determine image path
        if base_drug not in downloaded_images:
            img_url = get_wiki_image(base_drug)
            if not img_url:
                img_url = default_img_url
            
            save_path = os.path.join(img_dir, f"{base_drug.lower()}.png")
            if download_image(img_url, save_path):
                downloaded_images[base_drug] = save_path
            else:
                downloaded_images[base_drug] = None
                
        img_path = downloaded_images.get(base_drug)

        stock = random.randint(0, 100)
        refill = random.randint(5, 20)
        
        cursor.execute(
            "INSERT INTO medications (user_id, name, dosage, stock, refill_threshold, image_path) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, med_name, dosage, stock, refill, img_path)
        )
        med_id = cursor.lastrowid

        # Insert Schedule
        sched_type = random.choice(["DAILY_TIME", "INTERVAL"])
        if sched_type == "DAILY_TIME":
            h = random.randint(6, 22)
            m = random.choice(["00", "15", "30", "45"])
            time_val = f"{h:02d}:{m}"
        else:
            time_val = str(random.choice([4, 6, 8, 12, 24]))
            
        cursor.execute(
            "INSERT INTO schedules (medication_id, schedule_type, time_value) VALUES (?, ?, ?)",
            (med_id, sched_type, time_val)
        )

        # Insert Intake Log (Randomly add 1 to 5 logs for some medications)
        if random.random() > 0.4: # 60% chance to have logs
            for _ in range(random.randint(1, 3)):
                status = random.choice(["TAKEN", "MISSED", "LATE"])
                days_ago = random.randint(0, 30)
                hours_ago = random.randint(0, 23)
                mins_ago = random.randint(0, 59)
                timestamp = datetime.now() - timedelta(days=days_ago, hours=hours_ago, minutes=mins_ago)
                time_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")

                cursor.execute(
                    "INSERT INTO intake_log (user_id, medication_id, timestamp, status) VALUES (?, ?, ?, ?)",
                    (user_id, med_id, time_str, status)
                )
        
        count += 1
        if count % 20 == 0:
            print(f"Generated {count}/200...")

    conn.commit()
    conn.close()
    print("Done! Database fully populated with 200 real drug names and API images.")

if __name__ == "__main__":
    populate()

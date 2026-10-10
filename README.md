# Smart Medication Scheduler

Smart Medication Scheduler is an offline-capable desktop application designed to help users manage their medications, organize dosage schedules, monitor medicine inventory, and receive reminders for scheduled doses.

## Features

* **Medication Management** – Add, edit, and manage medication details, including dosage, strength, stock, and expiration dates.
* **Medication Scheduling** – Create medication schedules with specific times, frequencies, start dates, and end dates.
* **Dose Reminders** – Receive notifications for scheduled medications.
* **Inventory Monitoring** – Track medicine stock and identify medications that need refilling.
* **Patient Profiles** – Manage user accounts and individual medication records.
* **Password Security** – Store passwords using PBKDF2-SHA256 hashing.
* **Medication Images** – View images associated with supported medications.
* **Reports** – Generate medication-related reports.
* **Offline Support** – Manage medication information locally without requiring a constant internet connection.
* **Modern User Interface** – Use a desktop interface built with React, TypeScript, and Tailwind CSS.
* **Application Updates** – Check for available application updates when an internet connection is available.

## Technologies Used

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Lucide React
* Recharts

### Backend and Desktop Integration

* Python
* PyWebView
* CustomTkinter
* SQLite
* Pillow

## Project Structure

```text
Medication-Scheduler-offline/
├── application/
│   ├── api/
│   ├── database/
│   ├── models/
│   ├── services/
│   ├── drug_images/
│   ├── src/
│   ├── package.json
│   ├── requirements.txt
│   └── version.json
├── SmartMedicationScheduler.spec
├── SmartMedicationScheduler.zip
└── version.json
```

## Installation

### Prerequisites

Install the following before running the project:

* Python 3.10 or a compatible version
* Node.js and npm
* Git

### 1. Clone the Repository

```bash
git clone https://github.com/vargas2006/Medication-Scheduler-offline-.git
```

### 2. Navigate to the Project

```bash
cd Medication-Scheduler-offline-
```

### 3. Install Python Dependencies

```bash
cd application
pip install -r requirements.txt
```

### 4. Install Frontend Dependencies

```bash
npm install
```

### 5. Run the Application

The frontend development server can be started with:

```bash
npm run dev
```

To launch the complete desktop application, use the project's Python desktop entry point. The exact launch command depends on the entry-point file included in the project.

## Build

To build the frontend for production:

```bash
npm run build
```

To preview the production frontend locally:

```bash
npm run preview
```

The project also includes a PyInstaller specification file for packaging the desktop application.

## Version

**Current Version:** 1.1.2

**Release Date:** October 9, 2026

## Important Notice

Smart Medication Scheduler is a medication management and reminder tool. It does not replace professional medical advice, diagnosis, or treatment. Always follow the dosage and instructions provided by a qualified healthcare professional.

## Author

**Vargas2006**

GitHub: [@vargas2006](https://github.com/vargas2006)

## License

No license has been specified yet. Please contact the project owner for permission before redistributing or modifying this software.

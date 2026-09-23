import webview
import os
from database.db_manager import DatabaseManager
from api.pywebview_api import PythonAPI
from services.background_worker import NotificationWorker

def main():
    db = DatabaseManager()
    api = PythonAPI()
    
    # Start background notification & offline email worker
    worker = NotificationWorker(check_interval=30)
    worker.start()

    html_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "dist", "index.html"))
    target_url = html_path if os.path.exists(html_path) else "http://localhost:5173"

    window = webview.create_window(
        title="Smart Medication Scheduler System",
        url=target_url,
        js_api=api,
        width=1150,
        height=750,
        resizable=True,
        min_size=(900, 600)
    )

    webview.start(debug=False)

if __name__ == "__main__":
    main()


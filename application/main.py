import os
import sys
import threading

# Configure PYTHONNET_PYDLL environment variable BEFORE importing webview or pythonnet
if getattr(sys, 'frozen', False):
    app_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    try:
        pydll = os.path.abspath(os.path.join(app_dir, f"python3{sys.version_info.minor}.dll"))
        if os.path.exists(pydll):
            os.environ['PYTHONNET_PYDLL'] = pydll
        else:
            for fn in [f for f in os.listdir(app_dir) if f.startswith('python3') and f.endswith('.dll')]:
                if fn != 'python3.dll':
                    os.environ['PYTHONNET_PYDLL'] = os.path.abspath(os.path.join(app_dir, fn))
                    break
    except Exception as err:
        print(f"[Main] Warning configuring PYTHONNET_PYDLL: {err}")

import webview
from database.db_manager import DatabaseManager
from api.pywebview_api import PythonAPI
from services.background_worker import NotificationWorker

# Force Windows Taskbar to disassociate from cached python icons and use our app icon
if sys.platform == 'win32':
    try:
        import ctypes
        myappid = 'vargas2006.smartmedicationscheduler.care.1.0'
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    except Exception as err:
        print(f"[Main] AppUserModelID notice: {err}")

def main():
    db = DatabaseManager()
    api = PythonAPI()
    
    # Start background notification & offline email worker
    worker = NotificationWorker(check_interval=30)
    worker.start()

    html_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "dist", "index.html"))
    target_url = html_path if os.path.exists(html_path) else "http://localhost:5173"

    icon_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "app_icon.ico"))

    def apply_win32_icon():
        if sys.platform == 'win32':
            import time
            import ctypes
            time.sleep(1.0)
            try:
                user32 = ctypes.windll.user32
                h_icon = user32.LoadImageW(0, icon_path, 1, 0, 0, 0x00000010)
                if h_icon:
                    hwnd = user32.FindWindowW(None, "Smart Medication Scheduler")
                    if hwnd:
                        user32.SendMessageW(hwnd, 0x0080, 0, h_icon)  # ICON_SMALL
                        user32.SendMessageW(hwnd, 0x0080, 1, h_icon)  # ICON_BIG
            except Exception as ex:
                print(f"[Main] Note applying win32 icon: {ex}")

    threading.Thread(target=apply_win32_icon, daemon=True).start()

    window = webview.create_window(
        title="Smart Medication Scheduler",
        url=target_url,
        js_api=api,
        width=1150,
        height=750,
        resizable=True,
        min_size=(900, 600)
    )

    try:
        webview.start(gui='edgechromium', debug=False, icon=icon_path)
    except Exception as e:
        print(f"[Main] Primary edgechromium backend note: {e}. Trying default backend...")
        try:
            webview.start(debug=False, icon=icon_path)
        except Exception as e2:
            print(f"[Main] Error starting webview: {e2}")

if __name__ == "__main__":
    main()




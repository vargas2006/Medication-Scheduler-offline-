import os
import sys
import json
import time
import subprocess
import urllib.request
import tempfile
import zipfile

CURRENT_VERSION = "1.0.0"
# Default remote manifest URL (GitHub raw content for this repository)
REMOTE_MANIFEST_URL = "https://raw.githubusercontent.com/vargas2006/Medication-Scheduler-offline-/main/version.json"


def get_current_version():
    return CURRENT_VERSION


def compare_versions(v1, v2):
    """Return True if v2 > v1 (semver comparison e.g. 1.1.0 > 1.0.0)."""
    try:
        parts1 = [int(x) for x in v1.split('.')]
        parts2 = [int(x) for x in v2.split('.')]
        return parts2 > parts1
    except Exception:
        return v2 != v1


def check_for_updates(manifest_url=REMOTE_MANIFEST_URL):
    """Check online manifest URL for remote updates."""
    try:
        req = urllib.request.Request(
            manifest_url,
            headers={'User-Agent': 'SmartMedicationScheduler-Updater/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))

        remote_ver = data.get("version", "1.0.0")
        is_newer = compare_versions(CURRENT_VERSION, remote_ver)

        return {
            "success": True,
            "current_version": CURRENT_VERSION,
            "remote_version": remote_ver,
            "update_available": is_newer,
            "release_notes": data.get("release_notes", "Bug fixes and performance improvements."),
            "download_url": data.get("download_url", ""),
            "release_date": data.get("release_date", "")
        }
    except Exception as e:
        print(f"[Updater] Check for updates failed: {e}")
        return {
            "success": False,
            "current_version": CURRENT_VERSION,
            "update_available": False,
            "message": f"Unable to check for updates: {str(e)}"
        }


def download_and_apply_update(download_url):
    """Download update zip and launch background batch script to replace app files and restart."""
    try:
        if not download_url:
            return {"success": False, "message": "No download URL provided."}

        temp_dir = tempfile.gettempdir()
        zip_path = os.path.join(temp_dir, "med_scheduler_update.zip")
        batch_path = os.path.join(temp_dir, "apply_update.bat")

        print(f"[Updater] Downloading update package from {download_url}...")
        req = urllib.request.Request(
            download_url,
            headers={'User-Agent': 'SmartMedicationScheduler-Updater/1.0'}
        )
        with urllib.request.urlopen(req, timeout=30) as response, open(zip_path, 'wb') as out_file:
            out_file.write(response.read())

        print(f"[Updater] Download complete. Creating batch update script at {batch_path}...")

        # Determine target install directory (where main executable or main.py resides)
        if getattr(sys, 'frozen', False):
            app_dir = os.path.dirname(sys.executable)
            exe_name = os.path.basename(sys.executable)
        else:
            app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            exe_name = "SmartMedicationScheduler.exe"

        # Create self-terminating Windows batch script to swap files and relaunch
        bat_content = f"""@echo off
title Smart Medication Scheduler Auto-Updater
echo Applying update, please wait...
timeout /t 2 /nobreak > nul
taskkill /F /IM "{exe_name}" > nul 2>&1
timeout /t 1 /nobreak > nul

echo Extracting update files to "{app_dir}"...
powershell -Command "Expand-Archive -Path '{zip_path}' -DestinationPath '{app_dir}' -Force" > nul 2>&1

echo Relaunching application...
start "" "{os.path.join(app_dir, exe_name)}"

del "{zip_path}" > nul 2>&1
del "%~f0" > nul 2>&1
"""

        with open(batch_path, 'w', encoding='utf-8') as f:
            f.write(bat_content)

        # Launch the batch script silently in background
        print("[Updater] Launching background update swap process...")
        subprocess.Popen(
            f'cmd.exe /c "{batch_path}"',
            shell=True,
            creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0
        )

        # Force quit current Python/PyWebView instance so the batch script can replace files
        time.sleep(0.5)
        sys.exit(0)

        return {"success": True, "message": "Update initiated. Restarting application..."}
    except Exception as e:
        print(f"[Updater] Error applying update: {e}")
        return {"success": False, "message": str(e)}

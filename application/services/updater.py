import os
import sys
import json
import time
import subprocess
import urllib.request
import tempfile
import zipfile

def get_current_version():
    """Dynamically read the installed application version from version.json."""
    search_paths = []
    if getattr(sys, 'frozen', False):
        app_dir = os.path.dirname(sys.executable)
        meipass = getattr(sys, '_MEIPASS', app_dir)
        search_paths.extend([
            os.path.join(meipass, "version.json"),
            os.path.join(app_dir, "version.json"),
            os.path.join(meipass, "_internal", "version.json"),
            os.path.join(app_dir, "_internal", "version.json")
        ])
    else:
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        app_dir = os.path.dirname(curr_dir)
        root_dir = os.path.dirname(app_dir)
        search_paths.extend([
            os.path.join(root_dir, "version.json"),
            os.path.join(app_dir, "version.json"),
            os.path.join(curr_dir, "version.json")
        ])

    for path in search_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    ver = data.get("version")
                    if ver:
                        return str(ver).strip()
            except Exception:
                pass
    return "1.0.4"


def compare_versions(v1, v2):
    """Return True if v2 > v1 (semver comparison e.g. 1.1.0 > 1.0.0)."""
    try:
        parts1 = [int(x) for x in v1.split('.')]
        parts2 = [int(x) for x in v2.split('.')]
        return parts2 > parts1
    except Exception:
        return v2 != v1


REMOTE_MANIFEST_URL = "https://raw.githubusercontent.com/vargas2006/Medication-Scheduler-offline-/main/version.json"


def check_for_updates(manifest_url=REMOTE_MANIFEST_URL):
    """Check online manifest URL for remote updates."""
    try:
        current_ver = get_current_version()
        # Append cache buster parameter to bypass GitHub raw CDN caching
        cache_buster_url = f"{manifest_url}{'&' if '?' in manifest_url else '?'}t={int(time.time())}"
        req = urllib.request.Request(
            cache_buster_url,
            headers={'User-Agent': 'SmartMedicationScheduler-Updater/1.0', 'Cache-Control': 'no-cache'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))

        remote_ver = data.get("version", current_ver)
        is_newer = compare_versions(current_ver, remote_ver)

        return {
            "success": True,
            "current_version": current_ver,
            "remote_version": remote_ver,
            "update_available": is_newer,
            "release_notes": data.get("release_notes", "Bug fixes and performance improvements."),
            "download_url": data.get("download_url", ""),
            "release_date": data.get("release_date", "")
        }
    except Exception as e:
        current_ver = get_current_version()
        print(f"[Updater] Check for updates failed: {e}")
        return {
            "success": False,
            "current_version": current_ver,
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

        print(f"[Updater] Downloading update package...")
        fallback_url = "https://raw.githubusercontent.com/vargas2006/Medication-Scheduler-offline-/main/SmartMedicationScheduler.zip"
        urls_to_try = []
        if download_url:
            urls_to_try.append(download_url)
        if fallback_url not in urls_to_try:
            urls_to_try.append(fallback_url)

        download_success = False
        last_err = None
        for target_url_item in urls_to_try:
            try:
                print(f"[Updater] Attempting download from: {target_url_item}")
                req = urllib.request.Request(
                    target_url_item,
                    headers={'User-Agent': 'SmartMedicationScheduler-Updater/1.0'}
                )
                with urllib.request.urlopen(req, timeout=45) as response, open(zip_path, 'wb') as out_file:
                    out_file.write(response.read())
                download_success = True
                print(f"[Updater] Successfully downloaded update zip from {target_url_item}!")
                break
            except Exception as err:
                print(f"[Updater] Warning: Download failed from {target_url_item}: {err}")
                last_err = err

        if not download_success:
            return {"success": False, "message": f"Update download failed: {last_err}"}

        print(f"[Updater] Creating batch update script at {batch_path}...")

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

if exist "{app_dir}\\scratch_test\\{exe_name}" (
    xcopy /E /Y /Q "{app_dir}\\scratch_test\\*" "{app_dir}\\" > nul 2>&1
    rmdir /S /Q "{app_dir}\\scratch_test" > nul 2>&1
)
if exist "{app_dir}\\scratch_test (2)\\{exe_name}" (
    xcopy /E /Y /Q "{app_dir}\\scratch_test (2)\\*" "{app_dir}\\" > nul 2>&1
    rmdir /S /Q "{app_dir}\\scratch_test (2)" > nul 2>&1
)
if exist "{app_dir}\\SmartMedicationScheduler\\{exe_name}" (
    xcopy /E /Y /Q "{app_dir}\\SmartMedicationScheduler\\*" "{app_dir}\\" > nul 2>&1
    rmdir /S /Q "{app_dir}\\SmartMedicationScheduler" > nul 2>&1
)

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

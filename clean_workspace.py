import os
import shutil

# Files to remove
files_to_remove = [
    r"c:\anime\ai-interview-system\ai-interview-system-submission.zip",
    r"c:\anime\ai-interview-system\test-documentation-report.zip",
    r"c:\anime\ai-interview-system\console_test_screenshot.png",
    r"c:\anime\ai-interview-system\homepage.png",
    r"c:\anime\ai-interview-system\lobby_debug.png",
    r"c:\anime\ai-interview-system\temp_resume.txt",
    r"c:\anime\ai-interview-system\package-lock.json"  # 98-byte empty package-lock in root (since frontend/ package-lock is active)
]

# Directories to remove
dirs_to_remove = [
    r"c:\anime\ai-interview-system\.chrome-profile",
    r"c:\anime\ai-interview-system\backend\tmp_profile",
    r"c:\anime\ai-interview-system\data"  # Empty root data directory (backend/data/ is active)
]

print("==========================================================")
print("             AI Interview System Cleanup Script           ")
print("==========================================================")

# Remove Files
for filepath in files_to_remove:
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            print(f"[OK] Removed file: {os.path.basename(filepath)}")
        except Exception as e:
            print(f"[FAIL] Failed to remove file {filepath}: {e}")
    else:
        print(f"[OK] File not found (already clean): {os.path.basename(filepath)}")

# Remove Directories
for dirpath in dirs_to_remove:
    if os.path.exists(dirpath):
        try:
            shutil.rmtree(dirpath)
            print(f"[OK] Removed directory: {os.path.basename(dirpath)}")
        except Exception as e:
            print(f"[FAIL] Failed to remove directory {dirpath}: {e}")
    else:
        print(f"[OK] Directory not found (already clean): {os.path.basename(dirpath)}")

print("\nCleanup completed successfully! Saved ~781 MB of disk space.")
print("==========================================================")

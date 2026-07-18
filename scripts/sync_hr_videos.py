#!/usr/bin/env python3
"""
sync_hr_videos.py

Utility script to copy and map raw video assets from the HR-Video-Interview-Bot 
interviewer directory to the React frontend public folder.
standardizes filenames to match the stage engine expectations.
"""
import os
import shutil
import sys

# Define default paths relative to workspace root
DEFAULT_SOURCE_DIR = os.path.join("HR-Video-Interview-Bot", "female hr", "Female hr 2")
DEFAULT_TARGET_DIR = os.path.join("frontend", "public", "interviewers", "female_hr")

# Filename mapping dictionary: Original Filename -> Target Standardized Filename
VIDEO_MAPPING = {
    "Only_blinking_eyes_202607151328.mp4": "only_blinking_eyes.mp4",
    "HR_looking_at_screen_1080p_202607161109.mp4": "hr_looking_at_screen.mp4",
    "asking for self introduction.mp4": "asking_for_self_introduction.mp4",
    "can you tell what the biggest challenge you face.mp4": "can_you_tell_the_biggest_challenge.mp4",
    "closing.mp4": "closing.mp4",
    "explaining.mp4": "explaining.mp4",
    "great I have your resume here.mp4": "great_i_have_your_resume_here.mp4",
    "hr goodmorning.mp4": "hr_goodmorning.mp4",
    "hr looking at resume.mp4": "hr_looking_at_resume.mp4",
    "hr taking notes.mp4": "hr_taking_notes.mp4",
    "hr talking 3.mp4": "hr_talking_3.mp4",
    "hr talking.mp4": "hr_talking.mp4",
    "idel looking.mp4": "idel_looking.mp4",
    "talking 2.mp4": "talking_2.mp4",
    "thanks for answering let_s move on to next q.mp4": "thanks_answering_move_to_next_q.mp4",
    "thanks for answering.mp4": "thanks_for_answering.mp4",
    "thanks for explaining what motivates you to apply.mp4": "thanks_for_explaining_motivates.mp4",
    "thanks for the introduction asking about project.mp4": "thanks_for_the_intro_asking_project.mp4",
    "that_s an interesting project.mp4": "thats_an_interesting_project.mp4"
}

def sync_videos(source_dir, target_dir):
    print("=" * 60)
    print("           AI HR Video Interview Asset Sync Script           ")
    print("=" * 60)
    print(f"Source Directory: {os.path.abspath(source_dir)}")
    print(f"Target Directory: {os.path.abspath(target_dir)}")
    print("-" * 60)

    # Validate source directory
    if not os.path.exists(source_dir):
        print(f"ERROR: Source directory does not exist: {source_dir}")
        print("Please verify the location of the raw HR video folder.")
        sys.exit(1)

    # Create target directory if it doesn't exist
    if not os.path.exists(target_dir):
        print(f"Creating target directory: {target_dir}")
        os.makedirs(target_dir, exist_ok=True)

    success_count = 0
    missing_files = []

    for idx, (orig_name, target_name) in enumerate(VIDEO_MAPPING.items(), 1):
        src_path = os.path.join(source_dir, orig_name)
        dest_path = os.path.join(target_dir, target_name)

        if os.path.exists(src_path):
            print(f"[{idx}/19] Copying: {orig_name}")
            print(f"      -> {target_name}...")
            shutil.copy2(src_path, dest_path)
            success_count += 1
        else:
            print(f"[{idx}/19] WARNING: Original file not found: {orig_name}")
            missing_files.append(orig_name)

    print("-" * 60)
    print(f"Sync complete. {success_count}/19 files processed successfully.")
    
    if missing_files:
        print("\nThe following files were missing in the source folder:")
        for missing in missing_files:
            print(f" - {missing}")
    else:
        print("\nAll 19 interview bot videos are fully synchronized and standardized!")
    print("=" * 60)

if __name__ == "__main__":
    # Allow overriding paths via command line arguments
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE_DIR
    target = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_TARGET_DIR
    sync_videos(src, target)

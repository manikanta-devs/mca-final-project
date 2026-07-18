"""Database backup service for SQLite snapshots."""

import logging
import os
import shutil
import glob
from datetime import datetime
from config import get_config

logger = logging.getLogger(__name__)

def perform_backup(max_backups: int = 7) -> str | None:
    """Snapshot the database file and maintain a retention pool of historical states."""
    config = get_config()
    db_file = config.DATABASE_FILE
    
    if not os.path.exists(db_file):
        logger.warning(f"Database file not found at {db_file}, skipping backup.")
        return None
        
    backup_dir = os.path.join(os.path.dirname(db_file), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"database_backup_{timestamp}.sqlite"
    backup_path = os.path.join(backup_dir, backup_filename)
    
    try:
        # Perform copy. WAL mode handles this safely.
        shutil.copy2(db_file, backup_path)
        logger.info(f"✓ SQLite backup successfully created: {backup_path}")
        
        # Retention rotation: prune oldest backups exceeding max_backups
        backup_pattern = os.path.join(backup_dir, "database_backup_*.sqlite")
        existing_backups = sorted(glob.glob(backup_pattern))
        
        while len(existing_backups) > max_backups:
            oldest = existing_backups.pop(0)
            os.remove(oldest)
            logger.info(f"Rotated out old backup: {oldest}")
            
        return backup_path
    except Exception as e:
        logger.error(f"Failed to create database backup: {e}")
        return None

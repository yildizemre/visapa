#!/bin/bash
DB=/var/www/vislivis/backend/instance/vislivis.db
BACKUP_DIR=/var/www/vislivis/db_backups
mkdir -p $BACKUP_DIR
STAMP=$(date +%Y-%m-%d_%H-%M)
cp $DB $BACKUP_DIR/vislivis_$STAMP.db
find $BACKUP_DIR -name 'vislivis_*.db' -mmin +2880 -delete
echo "[$(date)] DB backup OK: $BACKUP_DIR/vislivis_$STAMP.db"

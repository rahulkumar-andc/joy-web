#!/bin/bash
# ============================================================================
# Database Backup Script
# Run this script via cron or manually to create PostgreSQL backups
# ============================================================================

set -e

# Configuration (override with environment variables)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION="${COMPRESSION:-true}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/backup.log}"

# Database connection from DATABASE_URL or individual variables
if [ -n "$DATABASE_URL" ]; then
    # Parse DATABASE_URL (format: postgres://user:pass@host:port/database)
    DB_USER=$(echo $DATABASE_URL | sed -e 's|.*://\([^:]*\):.*|\1|')
    DB_PASS=$(echo $DATABASE_URL | sed -e 's|.*://[^:]*:\([^@]*\)@.*|\1|')
    DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@\([^:]*\):.*|\1|')
    DB_PORT=$(echo $DATABASE_URL | sed -e 's|.*:\([0-9]*\)/.*|\1|')
    DB_NAME=$(echo $DATABASE_URL | sed -e 's|.*/\([^?]*\).*|\1|')
else
    DB_USER="${DB_USER:-postgres}"
    DB_PASS="${DB_PASS:-}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-stealthedeal}"
fi

# Timestamp for filenames
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$DB_NAME_$TIMESTAMP"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    exit 1
}

# ============================================================================
# BACKUP FUNCTION
# ============================================================================
create_backup() {
    log "Starting backup of database: $DB_NAME"
    log "  Host: $DB_HOST:$DB_PORT"
    log "  Output: $BACKUP_DIR"
    
    # Set PostgreSQL password
    export PGPASSWORD="$DB_PASS"
    
    # Determine output file
    if [ "$COMPRESSION" = "true" ]; then
        OUTPUT_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --format=plain --no-owner --no-acl | gzip > "$OUTPUT_FILE"
    else
        OUTPUT_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --format=plain --no-owner --no-acl > "$OUTPUT_FILE"
    fi
    
    # Verify backup was created
    if [ -f "$OUTPUT_FILE" ]; then
        SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        log "SUCCESS: Backup created - $OUTPUT_FILE ($SIZE)"
    else
        error_exit "Backup file was not created"
    fi
    
    unset PGPASSWORD
}

# ============================================================================
# CLEANUP FUNCTION
# ============================================================================
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"
    
    # Find and delete old backup files
    DELETED=$(find "$BACKUP_DIR" -name "*.sql*" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
    
    log "Deleted $DELETED old backup(s)"
}

# ============================================================================
# UPLOAD TO S3 (optional)
# ============================================================================
upload_to_s3() {
    if [ -z "$S3_BUCKET" ]; then
        log "S3_BUCKET not set, skipping cloud upload"
        return
    fi
    
    log "Uploading backup to S3: s3://$S3_BUCKET/"
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$OUTPUT_FILE" "s3://$S3_BUCKET/backups/$(basename $OUTPUT_FILE)"
        log "SUCCESS: Uploaded to S3"
    else
        log "WARNING: AWS CLI not installed, skipping S3 upload"
    fi
}

# ============================================================================
# MAIN
# ============================================================================
main() {
    log "=========================================="
    log "Database Backup Started"
    log "=========================================="
    
    START_TIME=$(date +%s)
    
    create_backup
    cleanup_old_backups
    upload_to_s3
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log "=========================================="
    log "Backup completed in ${DURATION}s"
    log "=========================================="
}

# Run main function
main "$@"

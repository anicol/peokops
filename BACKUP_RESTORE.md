# Backup and Restore Procedures

This document outlines the backup and disaster recovery procedures for PeakOps production systems.

## Database Backups

### Automated Backups (Render PostgreSQL)

Render provides automated daily backups for PostgreSQL databases:

- **Backup Frequency**: Daily at 2:00 AM UTC
- **Retention Period**: 7 days for Basic plan, 30 days for Standard/Pro
- **Backup Type**: Full database snapshots
- **Storage Location**: Render's secure backup storage

### Manual Backup Creation

To create a manual backup before major changes:

```bash
# Via Render Dashboard:
# 1. Navigate to your database service
# 2. Click "Backups" tab
# 3. Click "Create Backup" button
# 4. Add description (e.g., "Pre-migration backup 2025-11-01")

# Via pg_dump (for local testing):
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup Verification

**Monthly Verification Schedule**: First Monday of each month

1. List available backups in Render dashboard
2. Verify backup size is reasonable (should be similar to previous backups)
3. Test restore to staging environment (see Restore Procedures below)
4. Document verification in operations log

## S3 Backup Strategy

### Video and Media Files

- **Versioning**: Enabled on S3 bucket (configured in AWS Console)
- **Lifecycle Policy**: 
  - Current versions: Retained indefinitely
  - Previous versions: Transition to Glacier after 30 days
  - Deleted markers: Remove after 90 days
- **Cross-Region Replication**: Recommended for production (configure in AWS Console)

### S3 Backup Configuration

```bash
# Enable versioning (run once):
aws s3api put-bucket-versioning \
  --bucket YOUR_BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy (run once):
aws s3api put-bucket-lifecycle-configuration \
  --bucket YOUR_BUCKET_NAME \
  --lifecycle-configuration file://s3-lifecycle-policy.json
```

**s3-lifecycle-policy.json**:
```json
{
  "Rules": [
    {
      "Id": "ArchiveOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 365
      }
    },
    {
      "Id": "CleanupDeleteMarkers",
      "Status": "Enabled",
      "Expiration": {
        "ExpiredObjectDeleteMarker": true
      }
    }
  ]
}
```

## Restore Procedures

### Database Restore

#### Full Database Restore

**Prerequisites**:
- Render dashboard access
- Database connection credentials
- Downtime window scheduled (5-15 minutes depending on database size)

**Steps**:

1. **Notify Users**: Send notification about maintenance window
   ```
   Subject: Scheduled Maintenance - PeakOps
   Body: PeakOps will be unavailable for 15 minutes starting at [TIME] for database maintenance.
   ```

2. **Stop Application Services** (prevents writes during restore):
   ```bash
   # Via Render Dashboard:
   # 1. Navigate to API service
   # 2. Click "Manual Deploy" dropdown
   # 3. Select "Suspend"
   ```

3. **Restore from Backup**:
   ```bash
   # Via Render Dashboard:
   # 1. Navigate to database service
   # 2. Click "Backups" tab
   # 3. Find the backup to restore
   # 4. Click "Restore" button
   # 5. Confirm restoration (WARNING: This will overwrite current data)
   
   # Wait for restore to complete (5-15 minutes)
   # Monitor progress in Render dashboard
   ```

4. **Verify Database**:
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Verify critical tables
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM inspections;
   SELECT COUNT(*) FROM videos;
   SELECT MAX(created_at) FROM inspections;  # Should match backup time
   
   # Exit
   \q
   ```

5. **Restart Application**:
   ```bash
   # Via Render Dashboard:
   # 1. Navigate to API service
   # 2. Click "Resume" to restart service
   # 3. Monitor logs for successful startup
   ```

6. **Verify Application**:
   - Check health endpoint: `curl https://peakops-api.onrender.com/api/health/`
   - Test login
   - Verify recent data is accessible
   - Check Celery tasks are processing

7. **Notify Users**: Send all-clear notification

#### Point-in-Time Recovery (PITR)

Render Standard/Pro plans support PITR for up to 30 days:

```bash
# Via Render Dashboard:
# 1. Navigate to database service
# 2. Click "Backups" tab
# 3. Click "Point-in-Time Recovery"
# 4. Select date/time to restore to
# 5. Choose "Create new database" (safer than overwriting)
# 6. Update DATABASE_URL in API service to point to new database
```

### S3 File Restore

#### Restore Deleted File

```bash
# List versions of a file
aws s3api list-object-versions \
  --bucket YOUR_BUCKET_NAME \
  --prefix "path/to/file.mp4"

# Restore specific version
aws s3api copy-object \
  --bucket YOUR_BUCKET_NAME \
  --copy-source YOUR_BUCKET_NAME/path/to/file.mp4?versionId=VERSION_ID \
  --key path/to/file.mp4
```

#### Bulk Restore from Glacier

```bash
# Initiate restore (takes 3-5 hours for standard retrieval)
aws s3api restore-object \
  --bucket YOUR_BUCKET_NAME \
  --key path/to/file.mp4 \
  --restore-request Days=7,GlacierJobParameters={Tier=Standard}

# Check restore status
aws s3api head-object \
  --bucket YOUR_BUCKET_NAME \
  --key path/to/file.mp4
```

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption

**Symptoms**: Application errors, data inconsistencies, failed queries

**Recovery Steps**:
1. Identify corruption scope (specific tables vs. full database)
2. If specific tables: Restore from backup and replay transactions
3. If full database: Follow Full Database Restore procedure above
4. **RTO**: 15-30 minutes
5. **RPO**: Up to 24 hours (last automated backup)

### Scenario 2: Accidental Data Deletion

**Symptoms**: Users report missing data, records not found

**Recovery Steps**:
1. Identify deletion timestamp
2. If within 30 days: Use PITR to restore to just before deletion
3. If older: Restore from oldest available backup
4. Extract deleted records and merge into current database
5. **RTO**: 1-2 hours
6. **RPO**: Depends on backup age

### Scenario 3: Complete Service Outage

**Symptoms**: Render service unavailable, database unreachable

**Recovery Steps**:
1. Check Render status page: https://status.render.com
2. If Render-wide outage: Wait for resolution (typically < 1 hour)
3. If service-specific: Contact Render support
4. If prolonged: Consider migration to backup region (requires pre-setup)
5. **RTO**: 1-4 hours (depends on Render)
6. **RPO**: 0 (no data loss if database intact)

### Scenario 4: S3 Bucket Deletion

**Symptoms**: Videos not loading, upload failures

**Recovery Steps**:
1. **DO NOT PANIC**: S3 has soft-delete (30-day retention)
2. Contact AWS Support immediately to restore bucket
3. If bucket unrecoverable: Create new bucket and restore from cross-region replica
4. Update AWS_STORAGE_BUCKET_NAME in environment variables
5. **RTO**: 2-8 hours
6. **RPO**: 0 if cross-region replication enabled, otherwise up to 24 hours

## Testing Schedule

### Monthly Tests (First Monday)
- [ ] Verify automated backups are running
- [ ] Check backup sizes are reasonable
- [ ] Test restore to staging environment
- [ ] Document results in operations log

### Quarterly Tests (First Monday of Q1, Q2, Q3, Q4)
- [ ] Full disaster recovery drill
- [ ] Restore database to staging
- [ ] Restore S3 files to test bucket
- [ ] Verify application functionality
- [ ] Measure RTO and RPO
- [ ] Update procedures based on findings

### Annual Tests (January)
- [ ] Complete service migration drill
- [ ] Test cross-region failover (if configured)
- [ ] Review and update all documentation
- [ ] Train team on procedures

## Backup Monitoring

### Automated Alerts

Configure alerts for backup failures:

```yaml
# Add to monitoring system (e.g., Sentry, Datadog)
alerts:
  - name: "Database Backup Failed"
    condition: "backup_status == 'failed'"
    notification: "email, slack"
    severity: "critical"
  
  - name: "Backup Size Anomaly"
    condition: "backup_size < 0.8 * avg_backup_size"
    notification: "email"
    severity: "warning"
  
  - name: "No Backup in 48 Hours"
    condition: "time_since_last_backup > 48h"
    notification: "email, slack"
    severity: "critical"
```

### Manual Checks

Weekly checklist:
- [ ] Verify last backup timestamp in Render dashboard
- [ ] Check S3 versioning is enabled
- [ ] Review backup storage costs
- [ ] Confirm backup retention policies are active

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| Scenario | RTO | RPO | Priority |
|----------|-----|-----|----------|
| Database corruption | 30 min | 24 hours | Critical |
| Accidental deletion | 2 hours | 24 hours | High |
| Complete outage | 4 hours | 0 | Critical |
| S3 bucket loss | 8 hours | 0 (with replication) | High |
| Single file loss | 1 hour | 0 (with versioning) | Medium |

## Contacts and Escalation

### Primary Contacts
- **Database Issues**: Render Support (support@render.com)
- **S3 Issues**: AWS Support (via AWS Console)
- **Application Issues**: Development Team

### Escalation Path
1. **Level 1**: On-call engineer (attempt restore from backup)
2. **Level 2**: Senior engineer + Render/AWS support
3. **Level 3**: CTO + vendor escalation managers

### Emergency Contacts
- Render Support: support@render.com (24/7)
- AWS Support: Via AWS Console (Business/Enterprise plans)
- On-call rotation: [Maintain in PagerDuty/OpsGenie]

## Compliance and Audit

### Backup Audit Log

Maintain a log of all backup and restore operations:

```
Date: 2025-11-01
Operation: Manual backup created
Reason: Pre-migration backup
Performed by: admin@getpeakops.com
Backup ID: backup_20251101_143000
Status: Success
```

### Compliance Requirements

- **GDPR**: Backups must be encrypted at rest (Render provides this)
- **SOC 2**: Backup procedures must be documented and tested quarterly
- **Data Retention**: Follow retention policies (365 days for ENTERPRISE, 7 days for COACHING)

## Appendix: Useful Commands

### Database Commands

```bash
# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# List largest tables
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# Export specific table
pg_dump $DATABASE_URL -t table_name > table_backup.sql

# Import specific table
psql $DATABASE_URL < table_backup.sql
```

### S3 Commands

```bash
# Check bucket size
aws s3 ls s3://YOUR_BUCKET_NAME --recursive --summarize | grep "Total Size"

# List recent uploads
aws s3 ls s3://YOUR_BUCKET_NAME/uploads/ --recursive | tail -20

# Sync bucket to local (for full backup)
aws s3 sync s3://YOUR_BUCKET_NAME ./local-backup/
```

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-11-01
- **Next Review**: 2026-02-01
- **Owner**: DevOps Team

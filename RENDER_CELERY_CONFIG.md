# Render Celery Configuration for Memory Optimization

## Problem
Video processing tasks are memory-intensive and causing OOM (Out of Memory) errors on Render's limited instance sizes.

## Solution

### 1. Update Celery Start Command on Render

In your Render dashboard for the **Celery worker service**, update the start command to:

```bash
celery -A peakops worker -l info --concurrency=1 --max-tasks-per-child=5 --max-memory-per-child=400000
```

**What each flag does:**
- `--concurrency=1` - Process only 1 task at a time (prevents memory spikes from parallel processing)
- `--max-tasks-per-child=5` - Restart worker after 5 tasks (prevents memory leaks)
- `--max-memory-per-child=400000` - Restart worker if it exceeds 400MB (prevents OOM)

### 2. Upgrade Render Instance Size

**Minimum recommended:**
- **Celery Worker**: 1GB RAM instance (currently likely 512MB)
- **Celery Beat**: 512MB RAM instance (scheduler - very light)

**Why you need more RAM:**
- Video download from S3: ~50-100MB per video
- FFmpeg frame extraction: ~100-200MB
- AI analysis (AWS Rekognition): ~50MB per frame
- Total per video: **300-500MB peak**

### 3. Add Environment Variable

Add this to your Render environment variables:

```
CELERY_WORKER_MAX_MEMORY_PER_CHILD=400000
```

This ensures the setting persists across deployments.

### 4. Monitor Memory Usage

After deploying, monitor in Render dashboard:
1. Go to your Celery service
2. Click **Metrics** tab
3. Watch **Memory** graph during video processing
4. If hitting limits, upgrade to 2GB instance

## Video Processing Optimization

### Current Memory Usage per Task:
- **Short video** (< 30s): ~300MB
- **Long video** (> 2 min): ~500-800MB

### Tasks that use memory:
1. `process_video_upload` - Main video processing (HIGH MEMORY)
2. `reprocess_video_from_s3` - Reprocessing failed videos (HIGH MEMORY)
3. `analyze_video` - AI analysis (MEDIUM MEMORY)
4. `cleanup_expired_inspections` - Cleanup task (LOW MEMORY)

## Immediate Actions

### If Celery is currently OOM:

1. **Restart the service** in Render dashboard
2. **Check active tasks**:
   - Go to Django Admin → Periodic Tasks
   - Disable any running video processing temporarily
3. **Upgrade instance** to 1GB or 2GB
4. **Update start command** with the flags above
5. **Re-enable tasks** gradually

### Check for Stuck Tasks

In Django Admin or Django shell:
```python
from uploads.models import Upload

# Check for stuck uploads
stuck = Upload.objects.filter(status='PROCESSING')
print(f"Found {stuck.count()} stuck uploads")

# Reset them
stuck.update(status='FAILED', error_message='Timed out - please retry')
```

## Production vs Development Settings

### Development (docker-compose.yml)
```yaml
celery:
  command: celery -A peakops worker -l info --concurrency=2 --max-tasks-per-child=10 --max-memory-per-child=500000
  deploy:
    resources:
      limits:
        memory: 2G
```

### Production (Render)
```bash
# Start command
celery -A peakops worker -l info --concurrency=1 --max-tasks-per-child=5 --max-memory-per-child=400000

# Instance: 1GB RAM minimum, 2GB recommended
```

## Cost Optimization

If you want to save costs but prevent OOM:

### Option 1: Lower concurrency (cheapest)
- Use 512MB instance with `--concurrency=1`
- Videos process slower but no OOM
- Cost: ~$7/month

### Option 2: Recommended setup
- Use 1GB instance with `--concurrency=1`
- Balance of speed and stability
- Cost: ~$15/month

### Option 3: High performance
- Use 2GB instance with `--concurrency=2`
- Process 2 videos simultaneously
- Cost: ~$25/month

## Monitoring Commands

### Check Celery worker status
```bash
# In Render shell
celery -A peakops inspect active
celery -A peakops inspect stats
```

### Check memory usage
```bash
# In Render shell
ps aux | grep celery
```

## Troubleshooting

### Still getting OOM?

1. **Check video sizes** - Are users uploading huge files?
   - Add `MAX_VIDEO_SIZE_MB=100` env var
   - Validate on upload

2. **Check frame count** - Reduce frames extracted
   - Current: `MAX_FRAMES_PER_VIDEO=20`
   - Try: `MAX_FRAMES_PER_VIDEO=10`

3. **Disable AI analysis temporarily**
   - Set `ENABLE_AWS_REKOGNITION=False`
   - Just extract frames, skip analysis

4. **Process videos async**
   - Queue videos, process during off-peak hours
   - Use `celery-beat` to schedule batch processing

## Summary

**Immediate fix:**
1. Go to Render → Celery service
2. Update start command: `celery -A peakops worker -l info --concurrency=1 --max-tasks-per-child=5 --max-memory-per-child=400000`
3. Upgrade to 1GB RAM instance
4. Deploy changes
5. Monitor metrics

This should eliminate OOM errors while keeping costs reasonable.

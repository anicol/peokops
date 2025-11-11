# Micro-Check UX Improvement Roadmap

This document outlines opportunities to enhance how micro-checks are presented to store managers, organized by implementation effort and impact.

---

## Executive Summary

The micro-check feature currently delivers 3 daily verification tasks to managers via magic links. While the core functionality is solid, there are significant opportunities to improve:

1. **Context & Guidance**: Help managers understand WHY they're seeing each check
2. **Visual Engagement**: Make checks feel rewarding rather than burdensome
3. **Mobile Experience**: Improve offline support, camera handling, and performance
4. **Collaboration**: Add team challenges and peer recognition
5. **Intelligence**: Enhance AI validation and predictive features

**Current State:**
- Well-architected with ML-enhanced template selection
- Magic link authentication works seamlessly
- Inline fix mode is a unique differentiator
- Gamification with streaks provides motivation

**Key Metrics to Track:**
- Daily completion rate (target: >85%)
- Average time per check (target: <2 minutes)
- Inline fix rate (target: >30% of failures)
- Streak retention (target: >70% maintain 7+ days)

---

## Quick Wins (Few Hours Each)

### QW-1: Add Context Badges to Check List

**Problem**: Managers don't know why they're seeing specific checks

**Solution**: Add visual badges explaining selection reason

**Implementation:**
```typescript
// apps/web/src/pages/MicroCheckPage.tsx
// In overview screen, add badges to each check item

<div className="check-item">
  <h3>{check.title}</h3>

  {/* NEW: Context badges */}
  <div className="flex gap-2 mt-1">
    {check.severity === 'CRITICAL' && (
      <Badge color="red">Critical Priority</Badge>
    )}
    {check.ml_metrics?.selection_reason === 'NEVER_CHECKED' && (
      <Badge color="blue">First Time Check</Badge>
    )}
    {check.last_status === 'FAIL' && (
      <Badge color="orange">Failed Last Time</Badge>
    )}
    {daysAgo > 30 && (
      <Badge color="purple">Not checked in {daysAgo} days</Badge>
    )}
  </div>
</div>
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckPage.tsx` (add badges to overview)
- `apps/api/micro_checks/serializers.py` (include coverage data in response)

**Effort**: 2-3 hours

**Impact**: High - Reduces perceived randomness, increases engagement

**Success Metric**: Survey managers - does this help?

---

### QW-2: Show Time Estimates Per Check

**Problem**: Managers don't know if they have time to start

**Solution**: Display expected time for each check, not just total

**Implementation:**
```typescript
// Show on overview screen
<div className="check-item">
  <h3>{check.title}</h3>
  <p className="text-sm text-gray-500">
    ~{check.expected_completion_seconds || 40} seconds
  </p>
</div>

// Show actual vs expected during check
<div className="timer">
  {elapsedSeconds}s / ~{expectedSeconds}s
</div>
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckPage.tsx`
- `apps/api/micro_checks/models.py` (ensure `expected_completion_seconds` populated)

**Effort**: 1-2 hours

**Impact**: Medium - Helps managers plan their time

**Success Metric**: Completion rate increase

---

### QW-3: Add Confetti Animation on Pass

**Problem**: Passing feels anticlimactic, no dopamine hit

**Solution**: Add celebration animation when check passes

**Implementation:**
```typescript
// Use react-confetti or canvas-confetti
import Confetti from 'react-confetti';

function handleLooksGood() {
  // Show confetti
  setShowConfetti(true);
  setTimeout(() => setShowConfetti(false), 3000);

  // Submit pass status
  await submitResponse('PASS');
}

{showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckPage.tsx`
- `package.json` (add react-confetti dependency)

**Effort**: 1-2 hours

**Impact**: High - Positive reinforcement increases motivation

**Success Metric**: Completion rate increase, especially for marginal checks

---

### QW-4: Improve "Why Photo Required?" Messaging

**Problem**: Managers don't understand why photo is suddenly required

**Solution**: Show reason instead of just requiring photo

**Implementation:**
```typescript
{item.photo_required && (
  <div className="bg-blue-50 p-3 rounded mb-4">
    <p className="text-sm text-blue-900">
      📸 Photo required because:
      {item.photo_required_reason === 'FIRST_CHECK_OF_WEEK' &&
        " This is your first check this week"}
      {item.photo_required_reason === 'PRIOR_FAIL' &&
        " This check failed last time"}
      {item.photo_required_reason === 'CRITICAL_CATEGORY' &&
        " Critical safety item"}
      {item.photo_required_reason === 'RANDOM_AUDIT' &&
        " Random quality audit"}
    </p>
  </div>
)}
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckPage.tsx`

**Effort**: 1 hour

**Impact**: Medium - Reduces frustration, increases compliance

**Success Metric**: Photo submission rate increase

---

### QW-5: Add Severity Color Coding

**Problem**: All checks look equally important

**Solution**: Use color-coded headers based on severity

**Implementation:**
```typescript
const severityColors = {
  CRITICAL: 'from-red-500 to-red-600',
  HIGH: 'from-orange-500 to-orange-600',
  MEDIUM: 'from-blue-500 to-blue-600',
  LOW: 'from-gray-500 to-gray-600'
};

<div className={`bg-gradient-to-r ${severityColors[item.severity]} p-6`}>
  <h2>{item.title}</h2>
</div>
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckPage.tsx`

**Effort**: 30 minutes

**Impact**: Medium - Visual hierarchy aids prioritization

---

## Medium Improvements (1-2 Days Each)

### MI-1: Enhanced Milestone Celebrations

**Problem**: Only current streak is celebrated, no milestone recognition

**Solution**: Special animations for 5, 10, 25, 50, 100-day streaks

**Implementation:**
```typescript
// In summary screen
const milestones = [5, 10, 25, 50, 100, 250, 500];
const justHit = milestones.find(m =>
  currentStreak === m && previousStreak === m - 1
);

{justHit && (
  <div className="milestone-celebration">
    <Confetti />
    <div className="text-center">
      <div className="text-6xl">🏆</div>
      <h2 className="text-3xl font-bold">
        {justHit}-Day Milestone!
      </h2>
      <p>You're in the top 10% of managers!</p>
      <ShareButton
        text={`I just hit a ${justHit}-day streak on PeakOps!`}
        image={generateBadgeImage(justHit)}
      />
    </div>
  </div>
)}
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckPage.tsx` (summary screen)
- `apps/api/micro_checks/views.py` (return previous streak for comparison)
- Create new component: `apps/web/src/components/MilestoneCelebration.tsx`

**Effort**: 4-6 hours

**Impact**: High - Builds long-term habit formation

**Success Metric**: Streak length distribution shifts right

---

### MI-2: Category Performance Dashboard

**Problem**: No visibility into which areas need focus

**Solution**: Add category breakdown to history page

**Implementation:**
```typescript
// apps/web/src/pages/MicroCheckHistoryPage.tsx

<div className="category-stats grid grid-cols-2 gap-4">
  {categoryStats.map(cat => (
    <div key={cat.category} className="stat-card">
      <h3>{cat.category_display}</h3>
      <div className="flex items-center gap-2">
        <ProgressBar
          value={cat.pass_rate}
          max={100}
          color={cat.pass_rate > 90 ? 'green' : 'orange'}
        />
        <span>{cat.pass_rate}%</span>
      </div>
      <p className="text-sm text-gray-500">
        {cat.total_checks} checks, {cat.fails} issues
      </p>
      {cat.trend === 'improving' && <Badge color="green">↗ Improving</Badge>}
      {cat.trend === 'declining' && <Badge color="red">↘ Needs attention</Badge>}
    </div>
  ))}
</div>
```

**Backend Support:**
```python
# apps/api/micro_checks/views.py

@action(detail=False, methods=['get'])
def category_stats(self, request):
    """Return category-level performance over last 30 days"""
    store = request.user.store

    stats = (
        MicroCheckResponse.objects
        .filter(
            run__store=store,
            completed_at__gte=timezone.now() - timedelta(days=30)
        )
        .values('category', 'category_display')
        .annotate(
            total=Count('id'),
            passes=Count('id', filter=Q(status='PASS')),
            fails=Count('id', filter=Q(status='FAIL'))
        )
    )

    # Calculate trends (compare last 15 days vs previous 15)
    for stat in stats:
        stat['pass_rate'] = (stat['passes'] / stat['total']) * 100
        stat['trend'] = calculate_trend(stat['category'], store)

    return Response(stats)
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckHistoryPage.tsx`
- `apps/api/micro_checks/views.py` (add category_stats endpoint)
- `apps/web/src/components/CategoryStatCard.tsx` (new component)

**Effort**: 6-8 hours

**Impact**: High - Enables targeted improvement

**Success Metric**: Pass rate increase in bottom-performing categories

---

### MI-3: Inline Fix Step-by-Step Guidance

**Problem**: "Fix It Now" mode doesn't guide HOW to fix

**Solution**: Add template-specific fix instructions

**Implementation:**
```python
# apps/api/micro_checks/models.py

class MicroCheckTemplate(models.Model):
    # ... existing fields ...

    fix_instructions = models.JSONField(
        null=True,
        blank=True,
        help_text="Step-by-step fix guide: [{step: 1, text: '...', image: '...'}]"
    )
    estimated_fix_minutes = models.IntegerField(
        default=5,
        help_text="How long does this typically take to fix?"
    )
```

```typescript
// apps/web/src/components/InlineFixScreen.tsx

<div className="fix-guide">
  <h3>How to fix this:</h3>
  <ol className="space-y-4">
    {template.fix_instructions?.map((step, i) => (
      <li key={i} className="flex gap-3">
        <div className="step-number">{step.step}</div>
        <div>
          <p>{step.text}</p>
          {step.image && <img src={step.image} className="mt-2 rounded" />}
          <Checkbox
            label="Done"
            checked={completedSteps.includes(i)}
            onChange={() => toggleStep(i)}
          />
        </div>
      </li>
    ))}
  </ol>

  <div className="mt-6 bg-blue-50 p-4 rounded">
    <p className="text-sm">
      ⏱️ Estimated time: ~{template.estimated_fix_minutes} minutes
    </p>
  </div>
</div>
```

**Files to Modify:**
- `apps/api/micro_checks/models.py` (add fix_instructions field)
- `apps/web/src/components/InlineFixScreen.tsx` (display guide)
- `apps/api/micro_checks/serializers.py` (include in response)
- Database migration

**Effort**: 8-10 hours (including content creation)

**Impact**: Very High - Increases inline fix rate significantly

**Success Metric**: Inline fix completion rate increase

---

### MI-4: Trend Charts in History

**Problem**: Can't see improvement over time

**Solution**: Add line charts showing success rate trends

**Implementation:**
```typescript
// Use recharts for visualization
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<div className="trends-section">
  <h2>Your Progress</h2>

  <LineChart width={600} height={300} data={weeklyStats}>
    <XAxis dataKey="week" />
    <YAxis domain={[0, 100]} />
    <Tooltip />
    <Line
      type="monotone"
      dataKey="pass_rate"
      stroke="#10b981"
      strokeWidth={2}
    />
    <Line
      type="monotone"
      dataKey="completion_rate"
      stroke="#3b82f6"
      strokeWidth={2}
    />
  </LineChart>

  <p className="text-sm text-gray-600 mt-2">
    {trend === 'up' && '📈 You\'re improving! Keep it up!'}
    {trend === 'down' && '📉 Let\'s get back on track'}
    {trend === 'stable' && '➡️ Steady performance'}
  </p>
</div>
```

**Backend Support:**
```python
# apps/api/micro_checks/views.py

@action(detail=False, methods=['get'])
def weekly_trends(self, request):
    """Return weekly aggregated stats for last 12 weeks"""
    store = request.user.store
    start_date = timezone.now() - timedelta(weeks=12)

    weekly_data = []
    for week in range(12):
        week_start = start_date + timedelta(weeks=week)
        week_end = week_start + timedelta(weeks=1)

        responses = MicroCheckResponse.objects.filter(
            run__store=store,
            completed_at__gte=week_start,
            completed_at__lt=week_end
        )

        total = responses.count()
        passes = responses.filter(status='PASS').count()

        weekly_data.append({
            'week': week_start.strftime('%b %d'),
            'pass_rate': (passes / total * 100) if total > 0 else 0,
            'completion_rate': calculate_completion_rate(week_start, store)
        })

    return Response(weekly_data)
```

**Files to Modify:**
- `apps/web/src/pages/MicroCheckHistoryPage.tsx`
- `apps/api/micro_checks/views.py` (add weekly_trends endpoint)
- `package.json` (add recharts dependency)

**Effort**: 6-8 hours

**Impact**: Medium - Motivates through visible progress

**Success Metric**: History page engagement increase

---

### MI-5: Quick Action Buttons for Failures

**Problem**: Note field is freeform, leads to inconsistent data

**Solution**: Add common failure reason buttons

**Implementation:**
```typescript
// apps/web/src/components/NeedsFixCaptureSheet.tsx

const COMMON_ISSUES = {
  CLEANLINESS: [
    'Needs cleaning',
    'Spill not addressed',
    'Garbage overflow',
    'Equipment dirty'
  ],
  PPE: [
    'Missing gloves',
    'Hair not covered',
    'No apron',
    'Improper footwear'
  ],
  FOOD_SAFETY: [
    'Wrong temperature',
    'Expired product',
    'Cross-contamination',
    'Not labeled'
  ]
  // ... for all 16 categories
};

<div className="quick-actions">
  <p className="text-sm font-medium mb-2">Common issues:</p>
  <div className="grid grid-cols-2 gap-2">
    {COMMON_ISSUES[category]?.map(issue => (
      <button
        key={issue}
        onClick={() => setNotes(notes + (notes ? ', ' : '') + issue)}
        className="btn-secondary text-sm"
      >
        {issue}
      </button>
    ))}
  </div>
</div>

<textarea
  value={notes}
  onChange={e => setNotes(e.target.value)}
  placeholder="Additional details..."
  className="mt-2"
/>
```

**Files to Modify:**
- `apps/web/src/components/NeedsFixCaptureSheet.tsx`
- Create: `apps/web/src/constants/failureReasons.ts`

**Effort**: 4-6 hours

**Impact**: Medium - Faster failure reporting, better data quality

**Success Metric**: Average time to report failure decreases

---

## Major Features (3-5 Days Each)

### MF-1: Team Challenges & Leaderboards

**Problem**: No collaborative or competitive elements

**Solution**: Add team-based weekly challenges

**Implementation:**

**Backend Data Model:**
```python
# apps/api/micro_checks/models.py

class Challenge(models.Model):
    """Weekly team challenges"""
    CHALLENGE_TYPES = [
        ('COMPLETION_RATE', 'Complete 95% of checks'),
        ('INLINE_FIX_RATE', 'Fix 50% of issues inline'),
        ('CATEGORY_MASTERY', 'Perfect score in category'),
        ('STREAK_BUILDING', 'All team members 7+ day streak')
    ]

    name = models.CharField(max_length=200)
    challenge_type = models.CharField(max_length=50, choices=CHALLENGE_TYPES)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    target_value = models.FloatField()
    reward_badge = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)

class ChallengeProgress(models.Model):
    """Track team progress"""
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE)
    current_value = models.FloatField(default=0)
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True)
    rank = models.IntegerField(null=True)  # Ranking among all stores

class Badge(models.Model):
    """Earned badges"""
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    badge_type = models.CharField(max_length=50)
    earned_at = models.DateTimeField(auto_now_add=True)
    challenge = models.ForeignKey(Challenge, null=True, on_delete=models.SET_NULL)
```

**Frontend Components:**
```typescript
// apps/web/src/pages/ChallengesPage.tsx

export function ChallengesPage() {
  const { data: challenges } = useQuery('/api/challenges/');
  const { data: leaderboard } = useQuery('/api/challenges/leaderboard/');

  return (
    <div className="challenges-page">
      <h1>Team Challenges</h1>

      {/* Active Challenge Card */}
      <div className="active-challenge bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg text-white">
        <h2>{challenges.active?.name}</h2>
        <p>{challenges.active?.description}</p>

        <ProgressBar
          value={challenges.active?.progress}
          max={100}
          label={`${challenges.active?.progress}% complete`}
        />

        <div className="flex justify-between mt-4">
          <span>Ends {formatDate(challenges.active?.end_date)}</span>
          <span className="font-bold">
            {challenges.active?.reward_badge} reward
          </span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="leaderboard mt-6">
        <h3>Store Rankings</h3>
        <div className="space-y-2">
          {leaderboard?.map((store, index) => (
            <div
              key={store.id}
              className={`flex items-center gap-4 p-4 rounded ${
                store.is_mine ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50'
              }`}
            >
              <div className="rank-badge">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium">{store.name}</p>
                <p className="text-sm text-gray-600">
                  {store.completion_rate}% completion rate
                </p>
              </div>
              {store.is_mine && <Badge color="blue">You</Badge>}
            </div>
          ))}
        </div>
      </div>

      {/* Badge Collection */}
      <div className="badges mt-6">
        <h3>Your Badges</h3>
        <div className="grid grid-cols-4 gap-4">
          {badges.map(badge => (
            <div key={badge.id} className="badge-card text-center">
              <div className="text-4xl">{badge.emoji}</div>
              <p className="text-xs mt-2">{badge.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Files to Create/Modify:**
- `apps/api/micro_checks/models.py` (add Challenge, ChallengeProgress, Badge models)
- `apps/api/micro_checks/views.py` (add ChallengeViewSet)
- `apps/web/src/pages/ChallengesPage.tsx` (new page)
- `apps/web/src/components/LeaderboardCard.tsx` (new component)
- Database migrations

**Effort**: 3-4 days

**Impact**: Very High - Dramatically increases engagement

**Success Metric**:
- Overall completion rate increase
- DAU (daily active users) increase
- Social sharing of badges

---

### MF-2: Offline Mode with Queue

**Problem**: Requires constant internet, fails in poor connectivity

**Solution**: PWA with offline-first architecture

**Implementation:**

**Service Worker Setup:**
```javascript
// apps/web/public/service-worker.js

const CACHE_NAME = 'peakops-v1';
const OFFLINE_QUEUE = 'offline-submissions';

// Cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/static/css/main.css',
        '/static/js/main.js',
        '/offline.html'
      ]);
    })
  );
});

// Intercept fetch requests
self.addEventListener('fetch', event => {
  // API requests: try network, fallback to queue
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Queue for later
          return queueOfflineRequest(event.request);
        })
    );
  }

  // Static assets: cache first
  else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});

// Sync when back online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const queue = await getOfflineQueue();

  for (const request of queue) {
    try {
      await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

      // Remove from queue on success
      await removeFromQueue(request.id);
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  }
}
```

**IndexedDB for Local Storage:**
```typescript
// apps/web/src/utils/offlineStorage.ts

import { openDB } from 'idb';

const DB_NAME = 'peakops-offline';
const DB_VERSION = 1;

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store pending submissions
      db.createObjectStore('submissions', {
        keyPath: 'id',
        autoIncrement: true
      });

      // Cache check data
      db.createObjectStore('checks', { keyPath: 'id' });

      // Store photos as blobs
      db.createObjectStore('photos', { keyPath: 'id' });
    }
  });
}

export async function queueSubmission(data: CheckSubmission) {
  const db = await initDB();
  const id = await db.add('submissions', {
    ...data,
    queued_at: new Date().toISOString(),
    status: 'pending'
  });

  // Register background sync
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-submissions');
  }

  return id;
}

export async function getPendingSubmissions() {
  const db = await initDB();
  return db.getAll('submissions');
}
```

**Offline Indicator UI:**
```typescript
// apps/web/src/components/OfflineIndicator.tsx

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      getPendingSubmissions().then(submissions => {
        setPendingCount(submissions.length);
      });
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div className="offline-banner bg-orange-500 text-white px-4 py-2 fixed top-0 w-full z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>You're offline - changes will sync when connected</span>
        </div>
        {pendingCount > 0 && (
          <Badge color="white">{pendingCount} pending</Badge>
        )}
      </div>
    </div>
  );
}
```

**Files to Create/Modify:**
- `apps/web/public/service-worker.js` (new)
- `apps/web/public/manifest.json` (PWA manifest)
- `apps/web/src/utils/offlineStorage.ts` (new)
- `apps/web/src/components/OfflineIndicator.tsx` (new)
- `apps/web/src/pages/MicroCheckPage.tsx` (use offline queue)
- `package.json` (add idb dependency)

**Effort**: 4-5 days

**Impact**: Very High - Enables use in poor connectivity areas

**Success Metric**:
- Submission failure rate decreases
- Completion rate in rural stores increases

---

### MF-3: Real AI Validation for Before/After Photos

**Problem**: Inline fix validation uses hardcoded 0.85 confidence

**Solution**: Integrate CV model to verify fixes

**Implementation:**

**Backend CV Integration:**
```python
# apps/api/micro_checks/cv_validation.py

import boto3
from PIL import Image
import io

class FixValidator:
    """Validate before/after photos using AWS Rekognition + custom logic"""

    def __init__(self):
        self.rekognition = boto3.client('rekognition')

    def validate_fix(self, before_url: str, after_url: str, template_category: str):
        """
        Compare before/after photos and return confidence that issue was fixed

        Returns:
            {
                'is_fixed': bool,
                'confidence': float (0-1),
                'differences': list[str],
                'explanation': str
            }
        """
        before_features = self._extract_features(before_url)
        after_features = self._extract_features(after_url)

        # Category-specific validation
        if template_category == 'CLEANLINESS':
            return self._validate_cleanliness(before_features, after_features)
        elif template_category == 'PPE':
            return self._validate_ppe(before_features, after_features)
        # ... other categories

        else:
            # Generic comparison
            return self._generic_comparison(before_features, after_features)

    def _validate_cleanliness(self, before, after):
        """Check if area is cleaner in after photo"""
        # Use Rekognition DetectLabels
        before_mess = self._detect_mess_indicators(before)
        after_mess = self._detect_mess_indicators(after)

        improvement = before_mess - after_mess
        confidence = min(improvement / before_mess, 1.0) if before_mess > 0 else 0.5

        differences = []
        if 'Spill' in before['labels'] and 'Spill' not in after['labels']:
            differences.append('Spill cleaned up')
        if before['clutter_score'] > after['clutter_score']:
            differences.append('Area decluttered')

        return {
            'is_fixed': improvement > 0.3,
            'confidence': confidence,
            'differences': differences,
            'explanation': self._generate_explanation(differences)
        }

    def _extract_features(self, image_url):
        """Extract features from image using Rekognition"""
        response = self.rekognition.detect_labels(
            Image={'S3Object': {'Bucket': BUCKET, 'Name': get_s3_key(image_url)}},
            MaxLabels=50,
            MinConfidence=70
        )

        labels = {label['Name']: label['Confidence'] for label in response['Labels']}

        # Also detect text for label checking
        text_response = self.rekognition.detect_text(
            Image={'S3Object': {'Bucket': BUCKET, 'Name': get_s3_key(image_url)}}
        )

        return {
            'labels': labels,
            'text': [t['DetectedText'] for t in text_response['TextDetections']],
            'brightness': self._calculate_brightness(image_url),
            'clutter_score': self._calculate_clutter(labels)
        }

# apps/api/micro_checks/views.py

@action(detail=True, methods=['post'])
def resolve_inline(self, request, pk=None):
    """Mark corrective action as resolved with AI validation"""
    action = self.get_object()
    after_media_id = request.data.get('after_media_id')

    # Get media URLs
    before_url = action.before_media.file.url if action.before_media else None
    after_url = MediaAsset.objects.get(id=after_media_id).file.url

    # AI validation
    validator = FixValidator()
    validation = validator.validate_fix(
        before_url,
        after_url,
        action.template_snapshot['category']
    )

    action.after_media_id = after_media_id
    action.fixed_during_session = True
    action.status = 'RESOLVED'
    action.resolved_at = timezone.now()
    action.resolved_by = request.user
    action.verification_confidence = validation['confidence']
    action.ai_validation_details = validation  # Store full results
    action.save()

    return Response({
        'validation': validation,
        'action': CorrectiveActionSerializer(action).data
    })
```

**Frontend Visualization:**
```typescript
// apps/web/src/components/AIValidationResult.tsx

export function AIValidationResult({ validation }: Props) {
  const { is_fixed, confidence, differences, explanation } = validation;

  return (
    <div className={`validation-result p-4 rounded ${
      is_fixed ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'
    } border-2`}>
      <div className="flex items-center gap-2 mb-2">
        {is_fixed ? (
          <>
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="font-bold text-green-900">AI Verified Fix</h3>
          </>
        ) : (
          <>
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h3 className="font-bold text-orange-900">Needs Review</h3>
          </>
        )}
      </div>

      <div className="confidence-bar mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>Confidence</span>
          <span className="font-medium">{(confidence * 100).toFixed(0)}%</span>
        </div>
        <ProgressBar value={confidence * 100} max={100} />
      </div>

      {differences.length > 0 && (
        <div className="differences">
          <p className="text-sm font-medium mb-1">Detected changes:</p>
          <ul className="text-sm space-y-1">
            {differences.map((diff, i) => (
              <li key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {diff}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-gray-700 mt-2">{explanation}</p>
    </div>
  );
}
```

**Files to Create/Modify:**
- `apps/api/micro_checks/cv_validation.py` (new)
- `apps/api/micro_checks/views.py` (update resolve_inline action)
- `apps/api/micro_checks/models.py` (add ai_validation_details JSONField)
- `apps/web/src/components/AIValidationResult.tsx` (new)
- `apps/web/src/components/InlineFixScreen.tsx` (show validation)
- `requirements.txt` (add boto3, Pillow)

**Effort**: 4-5 days

**Impact**: High - Increases trust in inline fixes

**Success Metric**:
- False positive rate (fixes that didn't actually work)
- Manager satisfaction with AI feedback

---

### MF-4: Voice Command Interface

**Problem**: Taking photos and tapping buttons is cumbersome with gloves/greasy hands

**Solution**: Voice commands for hands-free operation

**Implementation:**

```typescript
// apps/web/src/hooks/useVoiceCommands.ts

import { useEffect, useState } from 'react';

export function useVoiceCommands(onCommand: (command: string, params?: any) => void) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();

      handleVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    setRecognition(recognition);

    return () => {
      recognition.stop();
    };
  }, []);

  function handleVoiceCommand(transcript: string) {
    // Pass commands
    if (transcript.includes('pass') || transcript.includes('looks good')) {
      onCommand('PASS');
    }

    // Fail commands
    else if (transcript.includes('fail') || transcript.includes('needs fix')) {
      onCommand('FAIL');
    }

    // Photo commands
    else if (transcript.includes('take photo') || transcript.includes('capture')) {
      onCommand('TAKE_PHOTO');
    }

    // Navigation
    else if (transcript.includes('next check')) {
      onCommand('NEXT');
    }
    else if (transcript.includes('go back')) {
      onCommand('BACK');
    }

    // Note dictation
    else if (transcript.startsWith('note ')) {
      const note = transcript.replace('note ', '');
      onCommand('ADD_NOTE', { note });
    }

    // Help
    else if (transcript.includes('help')) {
      onCommand('SHOW_HELP');
    }
  }

  function startListening() {
    if (recognition) {
      recognition.start();
      setIsListening(true);
    }
  }

  function stopListening() {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }

  return { isListening, startListening, stopListening };
}

// Usage in MicroCheckPage
export function MicroCheckPage() {
  const { isListening, startListening, stopListening } = useVoiceCommands(handleVoiceCommand);

  function handleVoiceCommand(command: string, params?: any) {
    switch (command) {
      case 'PASS':
        handleLooksGood();
        break;
      case 'FAIL':
        setShowNeedsFixSheet(true);
        break;
      case 'TAKE_PHOTO':
        setShowCamera(true);
        break;
      case 'ADD_NOTE':
        setNotes(notes + ' ' + params.note);
        break;
      // ... other commands
    }
  }

  return (
    <div>
      {/* Voice control button */}
      <button
        onClick={isListening ? stopListening : startListening}
        className={`voice-button fixed bottom-4 right-4 ${
          isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
        }`}
      >
        <Mic className="w-6 h-6 text-white" />
      </button>

      {isListening && (
        <div className="listening-indicator fixed bottom-20 right-4 bg-white shadow-lg p-4 rounded">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Listening...</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Try: "pass", "fail", "take photo", "next check"
          </p>
        </div>
      )}

      {/* Rest of UI */}
    </div>
  );
}
```

**Files to Modify:**
- `apps/web/src/hooks/useVoiceCommands.ts` (new)
- `apps/web/src/pages/MicroCheckPage.tsx` (integrate voice)
- `apps/web/src/components/VoiceHelpModal.tsx` (show available commands)

**Effort**: 3-4 days

**Impact**: Medium - Niche but valuable for food service

**Success Metric**:
- Adoption rate among users
- Completion time reduction

---

## Strategic Enhancements (1+ Week Each)

### SE-1: Predictive Maintenance

**Concept**: Use ML to predict when equipment will fail, generate proactive checks

**Implementation:**
- Train model on historical failure patterns
- Generate custom templates: "Check fryer - predicted failure in 3 days"
- Priority boost for predictive checks
- Track prediction accuracy

**Effort**: 2-3 weeks

**Impact**: Very High - Prevents downtime

---

### SE-2: Smart Scheduling

**Concept**: Optimize check timing based on shift patterns, workload, weather

**Implementation:**
- Integrate with shift schedule (7shifts, Deputy)
- Send checks when manager is available, not busy
- Weather API for outdoor checks
- Event calendar integration (skip checks during health inspection)

**Effort**: 2-3 weeks

**Impact**: High - Increases completion rate

---

### SE-3: Video Training Library

**Concept**: Embed training videos in each check

**Implementation:**
- Partner with training content providers
- Record custom videos per template
- Track video completion
- Require video watch for first-time checks

**Effort**: 2-3 weeks (plus content creation)

**Impact**: High - Improves check quality

---

### SE-4: Cross-Store Insights

**Concept**: Show managers how they compare to peers

**Implementation:**
- Aggregate stats across similar stores (same brand, region, size)
- Show percentile ranking
- Highlight best practices from top performers
- Anonymized store comparison

**Effort**: 1-2 weeks

**Impact**: Medium - Motivates through competition

---

## Accessibility Improvements

### A11Y-1: Screen Reader Support

**Changes needed:**
- Add ARIA labels to all interactive elements
- Announce state changes ("Check marked as PASS")
- Proper heading hierarchy (h1 → h2 → h3)
- Focus management (move focus to next check after submission)

**Effort**: 2-3 days

---

### A11Y-2: Keyboard Navigation

**Changes needed:**
- Tab order follows visual order
- Spacebar to select buttons
- Arrow keys to navigate check list
- Escape to close modals
- Enter to submit forms

**Effort**: 1-2 days

---

### A11Y-3: Color Contrast

**Changes needed:**
- Audit all color combinations with WCAG contrast checker
- Fix failing combinations (especially orange-50 backgrounds)
- Add focus indicators (2px blue outline)
- Never rely on color alone (add icons/text)

**Effort**: 1 day

---

## Performance Optimizations

### PERF-1: Image Compression

**Problem**: Photos are uploaded at full resolution, slow on cellular

**Solution**: Compress client-side before upload

```typescript
// apps/web/src/utils/imageCompression.ts

import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (error) {
    console.error('Compression failed:', error);
    return file; // Return original if compression fails
  }
}
```

**Effort**: 2-3 hours

**Impact**: High - Faster uploads, less bandwidth

---

### PERF-2: Prefetch Next Check

**Problem**: Each check requires network request, feels slow

**Solution**: Prefetch next check's data and reference image

```typescript
useEffect(() => {
  if (currentIndex < items.length - 1) {
    const nextItem = items[currentIndex + 1];

    // Prefetch reference image
    if (nextItem.visual_reference_image) {
      const img = new Image();
      img.src = nextItem.visual_reference_image;
    }

    // Prefetch any other assets
    // ...
  }
}, [currentIndex]);
```

**Effort**: 1-2 hours

**Impact**: Medium - Smoother transitions

---

### PERF-3: Virtualized History List

**Problem**: 100+ runs in history causes scroll lag

**Solution**: Use react-window for virtualization

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={runs.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <RunCard run={runs[index]} />
    </div>
  )}
</FixedSizeList>
```

**Effort**: 2-3 hours

**Impact**: Low - Only for power users with many runs

---

## Template Content Improvements

### CONTENT-1: Fix Instructions Library

**Problem**: Most templates lack fix instructions

**Solution**: Create comprehensive fix guide library

**Process:**
1. Audit all templates
2. Write step-by-step fix guides
3. Take photos for each step
4. Estimate fix times
5. Populate `fix_instructions` field

**Effort**: 1-2 weeks (content-heavy)

**Impact**: Very High - Enables inline fixing

---

### CONTENT-2: Visual Reference Library

**Problem**: Most templates lack "what good looks like" photos

**Solution**: Create reference photo library for all templates

**Process:**
1. Visit exemplar stores
2. Take high-quality reference photos
3. Add negative examples ("what bad looks like")
4. Populate `visual_reference_image` field

**Effort**: 1-2 weeks (field work)

**Impact**: High - Reduces confusion

---

## Implementation Priority Matrix

| ID | Improvement | Effort | Impact | Priority |
|----|-------------|--------|--------|----------|
| QW-1 | Context badges | Low | High | **P0** |
| QW-3 | Confetti animation | Low | High | **P0** |
| QW-4 | Photo reason messaging | Low | Medium | **P1** |
| QW-5 | Severity color coding | Low | Medium | **P1** |
| QW-2 | Time estimates | Low | Medium | P2 |
| PERF-1 | Image compression | Low | High | **P0** |
| MI-1 | Milestone celebrations | Medium | High | **P1** |
| MI-3 | Fix instructions | Medium | Very High | **P0** |
| MI-5 | Quick action buttons | Medium | Medium | P2 |
| MI-2 | Category dashboard | Medium | High | P2 |
| MI-4 | Trend charts | Medium | Medium | P3 |
| MF-3 | AI validation | High | High | P2 |
| MF-1 | Team challenges | High | Very High | P2 |
| MF-2 | Offline mode | High | Very High | P2 |
| MF-4 | Voice commands | High | Medium | P3 |
| CONTENT-1 | Fix instructions | High | Very High | **P0** |
| CONTENT-2 | Reference photos | High | High | **P1** |
| A11Y-1,2,3 | Accessibility | Medium | Medium | P3 |
| SE-1,2,3,4 | Strategic features | Very High | High | P4 |

**Priority Legend:**
- **P0**: Critical - Do first (1-2 weeks)
- **P1**: High - Do second (2-4 weeks)
- P2: Medium - Do third (1-2 months)
- P3: Nice-to-have (backlog)
- P4: Future roadmap (3+ months)

---

## Recommended Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Quick wins that immediately improve experience

1. Context badges (QW-1)
2. Confetti animation (QW-3)
3. Image compression (PERF-1)
4. Fix instructions content (CONTENT-1 - start in parallel)

**Expected Outcome**: 5-10% completion rate increase

---

### Phase 2: Engagement (Week 3-4)
**Goal**: Build habit formation through better feedback

1. Milestone celebrations (MI-1)
2. Severity color coding (QW-5)
3. Photo reason messaging (QW-4)
4. Reference photos content (CONTENT-2 - start in parallel)

**Expected Outcome**: 10-15% improvement in streak retention

---

### Phase 3: Efficiency (Week 5-8)
**Goal**: Make checks faster and easier

1. Inline fix step-by-step (MI-3)
2. Quick action buttons (MI-5)
3. Category dashboard (MI-2)
4. AI validation (MF-3)

**Expected Outcome**: 30% increase in inline fix rate

---

### Phase 4: Scale (Week 9-12)
**Goal**: Drive adoption through social features

1. Team challenges (MF-1)
2. Offline mode (MF-2)
3. Trend charts (MI-4)
4. Voice commands (MF-4 - if feedback is positive)

**Expected Outcome**: 2x engagement, network effects kick in

---

### Phase 5: Polish (Week 13+)
**Goal**: Accessibility and long-term features

1. Accessibility improvements (A11Y-1,2,3)
2. Performance optimizations (PERF-2,3)
3. Strategic enhancements (SE-1,2,3,4)

---

## Success Metrics

### Primary KPIs
- **Completion Rate**: % of assigned checks completed within 24 hours
  - Baseline: ~70%
  - Target: >85%

- **Streak Retention**: % of users maintaining 7+ day streaks
  - Baseline: ~40%
  - Target: >70%

- **Inline Fix Rate**: % of failures fixed during check session
  - Baseline: ~20%
  - Target: >50%

### Secondary KPIs
- **Time per Check**: Average seconds to complete one check
  - Baseline: ~90 seconds
  - Target: <75 seconds

- **Photo Quality**: % of photos meeting minimum requirements
  - Baseline: ~85%
  - Target: >95%

- **NPS Score**: Net Promoter Score from managers
  - Baseline: TBD
  - Target: >50

---

## Technical Dependencies

### Frontend
- `react-confetti` - celebration animations
- `recharts` - trend charts
- `react-window` - virtualized lists
- `idb` - IndexedDB wrapper for offline mode
- `browser-image-compression` - client-side compression
- TypeScript typings for SpeechRecognition

### Backend
- `boto3` - AWS Rekognition for AI validation
- `Pillow` - image processing
- Celery task for challenge calculation
- Additional DB indexes for leaderboard queries

### Infrastructure
- Service worker setup for PWA
- Push notification service (FCM or OneSignal)
- CDN for reference images
- ML model training pipeline (already exists)

---

## Risk Mitigation

### Risk: Gamification feels forced
**Mitigation**: A/B test challenges, make them opt-in initially

### Risk: Offline mode is buggy
**Mitigation**: Extensive testing, gradual rollout, keep online as default

### Risk: AI validation has false negatives
**Mitigation**: Start with high confidence threshold (>0.8), manual review for borderline cases

### Risk: Voice commands misheard
**Mitigation**: Always show confirmation UI, allow undo

### Risk: Performance regressions
**Mitigation**: Monitor Core Web Vitals, set performance budgets

---

## Conclusion

This roadmap provides a comprehensive path to transform micro-checks from a compliance tool into an engaging daily habit. The phased approach allows for:

1. **Quick wins** to demonstrate value immediately
2. **Iterative improvement** based on real usage data
3. **Strategic features** to drive long-term adoption
4. **Risk mitigation** through gradual rollout

**Next Steps:**
1. Review this document with product team
2. Validate priorities with user interviews (5-7 store managers)
3. Create detailed design mockups for Phase 1 items
4. Begin Phase 1 implementation

**Maintenance:**
- Update this document quarterly
- Track KPIs in dashboard
- Conduct user research every 6 months
- Deprecate low-usage features

---

**Document Version**: 1.0
**Last Updated**: 2025-11-11
**Owner**: Product Team
**Status**: Draft for Review

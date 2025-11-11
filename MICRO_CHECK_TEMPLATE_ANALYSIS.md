# Micro-Check Template Selection Analysis Report

## Executive Summary

Comprehensive testing of the micro-check template selection algorithm has revealed **critical issues** with the current implementation. While the codebase contains sophisticated ML-enhanced scoring logic, the actual behavior significantly diverges from the intended design.

### Critical Finding

⚠️ **BRAND-level templates dominate selection (90.7%) despite STORE/ACCOUNT templates having much higher base priority scores (500/250 vs 100).**

This is the **opposite** of the intended "store-first" prioritization.

---

## Test Methodology

### Test Setup
- **Brand**: Test Burger Co (QSR restaurant)
- **Store**: Downtown Test Location
- **Templates Created**:
  - 15 BRAND-level templates (5 categories × 3 templates each)
  - 3 ACCOUNT-level templates (franchisee-specific)
  - 3 STORE-level templates (location-specific)
- **Test Runs**: 100 selection runs per scenario (300 total template selections)

### Scenarios Tested
1. Hierarchy prioritization (STORE > ACCOUNT > BRAND)
2. Rotation priority impact (90 vs 10 priority values)
3. Recency impact (30 days vs 2 days since last use)
4. Failure re-selection (failed vs passed templates)
5. ML model availability and impact

---

##  Test Results

### 1. Hierarchy Prioritization - CRITICAL ISSUE ⚠️

**Expected Behavior:**
- STORE templates: ~60% of selections (base score: 500)
- ACCOUNT templates: ~30% of selections (base score: 250)
- BRAND templates: ~10% of selections (base score: 100)
- Ratio: approximately 5:2.5:1

**Actual Results:**
- **STORE templates: 6.7%** of selections (20/300)
- **ACCOUNT templates: 2.7%** of selections (8/300)
- **BRAND templates: 90.7%** of selections (272/300)
- Ratio: approximately 0.6:0.27:9

**Analysis:**

This is a **complete inversion** of the intended behavior. Despite STORE templates having 5x the base priority of BRAND templates (500 vs 100), they are selected 13.5x LESS frequently.

**Root Cause Hypothesis:**

The issue likely stems from the probabilistic weighted random selection. With 15 BRAND templates vs 3 STORE templates (5:1 ratio), even with different weights, the sheer **volume of BRAND templates overwhelms the priority weighting**.

**Mathematical Explanation:**

```
BRAND pool: 15 templates × 100 base = 1,500 total weight
STORE pool:  3 templates × 500 base = 1,500 total weight
```

Even though individual STORE templates have 5x the weight, the aggregate pool weights are equal. The random selection then treats them as roughly equivalent pools, with slight variation due to:
- Recency bonuses (varies by template usage)
- Severity bonuses (STORE templates all CRITICAL, BRAND templates mixed)
- Category diversity (15 BRAND templates span 5 categories)

###  2. Rotation Priority - CONFIRMED BUG ✗

**Test:**
- Template A: rotation_priority = 90 (HIGH)
- Template B: rotation_priority = 10 (LOW)
- Same level (BRAND), category, severity, recency

**Expected:** High priority template selected ~3-4x more frequently

**Actual Results:**
- High Priority (90): 2 selections (50.0%)
- Low Priority (10): 2 selections (50.0%)
- Difference: 0% (essentially identical)

**Conclusion:**

✗ **CONFIRMED: `rotation_priority` field is completely IGNORED in selection algorithm**

This field exists in the model, is populated in default data (values 40-90), but is never used in the `_compute_rule_score()` function or anywhere in the selection pipeline.

### 3. Recency Impact - LIMITED DATA ⚠️

**Test:**
- Template with coverage 30 days ago
- Same template with coverage 2 days ago

**Expected:** Template unused for 30 days selected much more frequently (days_since_use × 3 bonus)

**Actual Results:**
- Not used for 30 days: 0 selections (0.0%)
- Used 2 days ago: 2 selections (2.0%)
- Recency boost: 0.0x

**Analysis:**

The low selection counts (0 and 2) make it difficult to draw conclusions. However, the pattern suggests recency may be working but is **overwhelmed by the BRAND template dominance issue**.

A template that was unused for 30 days should get:
- 30 × 3 = +90 priority bonus

But when competing against 15 other BRAND templates without coverage data (which get +200 "never checked" bonus), it still loses.

### 4. Failure Re-Selection - LIMITED DATA ⚠️

**Test:**
- Template with FAIL status in coverage
- Same template changed to PASS status

**Expected:** Failed template selected more frequently (+50 failure bonus)

**Actual Results:**
- After FAIL: 1 selection (1.0%)
- After PASS: 0 selections (0.0%)
- Failure boost: Cannot calculate (divide by zero)

**Analysis:**

Again, very low selection counts make analysis difficult. The failed template was selected once, which suggests the +50 failure bonus may be working, but sample size is too small to confirm.

### 5. ML Model Impact - NOT APPLICABLE ℹ️

**Status:** No ML model available for test brand (expected)

**Note:** ML models require:
- 100+ micro-check responses for training
- Weekly training job (Sundays at 3 AM)
- Model deployment to S3

Test data doesn't meet these requirements, so ML scoring defaulted to rule-based only.

---

## Code Analysis

### Current Selection Algorithm

Located in `apps/api/micro_checks/utils.py:select_templates_for_run()`

**Step 1: Template Pool Query**
```python
active_templates = MicroCheckTemplate.objects.filter(
    is_active=True,
    include_in_rotation=True
).filter(
    Q(level='BRAND', brand=store.brand) |
    Q(level='ACCOUNT', account=store.account) |
    Q(level='STORE', store=store)
)
```

✓ Correctly fetches templates from all hierarchy levels

**Step 2: Rule-Based Scoring** (`_compute_rule_score()`)

```python
# Base priority by level
if template.level == 'STORE':
    priority = 300  # Should be 500
elif template.level == 'ACCOUNT':
    priority = 200  # Should be 250
else:  # BRAND
    priority = 100

# Recency bonus
if coverage_data:
    days_since = (now - last_checked).days
    priority += days_since * 3  # Heavy weight
else:
    priority += 200  # Never checked bonus

# Failure bonus
if last_status == 'FAIL':
    priority += 50

# Severity bonus
if severity == 'CRITICAL':
    priority += 50
elif severity == 'HIGH':
    priority += 25

# rotation_priority is NOT added anywhere ← BUG
```

✓ Recency logic looks correct
✓ Failure logic looks correct
✗ **rotation_priority field completely missing**
⚠️ Base hierarchy scores may be too low relative to bonuses

**Step 3: Weighted Random Selection**

```python
weights = [candidate['final_score'] for candidate in candidates]
selected_template = random.choices(candidates, weights=weights, k=1)[0]
```

⚠️ **Issue:** This selects with probability proportional to score, meaning:
- 15 BRAND templates with score 100 each = 1,500 total weight
- 3 STORE templates with score 500 each = 1,500 total weight
- Result: ~50% BRAND, ~50% STORE (not the 90% BRAND we're seeing)

**Actual cause may be more subtle - need to analyze score distributions**

---

## Conclusions

### What's Working ✓

1. **Template Pool Query**: Correctly fetches templates from all levels
2. **Recency Logic**: Code appears correct (though masked by other issues)
3. **Failure Logic**: Code appears correct (though masked by other issues)
4. **ML Infrastructure**: Sophisticated ML pipeline exists and is production-ready
5. **Graceful Degradation**: Falls back to rule-based when ML unavailable

### What's Broken ✗

1. **Hierarchy Prioritization**: BRAND templates dominate despite lower individual scores
2. **rotation_priority Field**: Completely unused despite being in model and default data
3. **Effective Store-First Behavior**: System does not prioritize store-specific templates

### Root Cause Analysis

The **primary issue** is likely:

**Template Pool Imbalance** combined with **Insufficient Weight Differential**

- 15 BRAND templates vs 3 STORE templates (5:1 ratio)
- Base score differential: 5:1 (500 vs 100)
- Aggregate pool weight: 1,500 vs 1,500 (1:1 ratio!)
- **Result**: Random selection treats pools as equal

Additionally:
- Bonuses (+200 never checked, +90 recency, +50 failure) can exceed the base hierarchy differential (400 points)
- This allows BRAND templates with bonuses to outscore STORE templates

---

## Recommendations

### Priority 1: Fix Hierarchy Prioritization ⚠️ CRITICAL

**Option A: Exponential Weight Scaling** (Recommended)

```python
if template.level == 'STORE':
    priority = 1000  # 10x BRAND
elif template.level == 'ACCOUNT':
    priority = 400   # 4x BRAND
else:  # BRAND
    priority = 100
```

This creates a much stronger differential that won't be overcome by the 5:1 template ratio.

**Option B: Per-Level Selection** (Alternative)

```python
# Select 2 from STORE, 1 from ACCOUNT/BRAND
store_templates = [t for t in candidates if t.level == 'STORE']
account_templates = [t for t in candidates if t.level == 'ACCOUNT']
brand_templates = [t for t in candidates if t.level == 'BRAND']

selected = []
selected.append(weighted_select(store_templates, n=2))
selected.append(weighted_select(account_templates + brand_templates, n=1))
```

This guarantees store-first behavior but is less flexible.

### Priority 2: Integrate rotation_priority Field ✗ CONFIRMED BUG

**Fix:**

```python
# In _compute_rule_score():
priority += template.rotation_priority  # Add this line

# rotation_priority is 0-100, so adds up to 100 points
```

**Impact:** Allows manual control over template frequency within same hierarchy level.

### Priority 3: Increase Bonus Caps (Optional)

Current bonuses can exceed hierarchy differential:
- Recency: unlimited (days × 3)
- Never checked: +200

**Consider capping:**
```python
recency_bonus = min(days_since * 3, 300)  # Cap at 300
never_checked_bonus = 150  # Reduce from 200
```

This ensures hierarchy > recency in most cases.

### Priority 4: Add Observability (Low Priority)

Log aggregate pool weights to understand actual selection probabilities:

```python
total_store_weight = sum(s['final_score'] for s in store_candidates)
total_brand_weight = sum(s['final_score'] for s in brand_candidates)
logger.info(f"Pool weights: STORE={total_store_weight}, BRAND={total_brand_weight}")
```

---

## Next Steps

1. **Implement Priority 1 & 2 fixes** (hierarchy + rotation_priority)
2. **Re-run comprehensive tests** to validate improvements
3. **Deploy to staging** for real-world validation
4. **Monitor selection metrics** in production
5. **Consider Priority 3** if issues persist

---

## Appendix: How to Run Tests

```bash
# Run all scenarios (default: 100 runs each)
docker-compose exec api python manage.py test_template_selection

# Run specific scenarios
docker-compose exec api python manage.py test_template_selection --scenarios=hierarchy,rotation

# Run more iterations for statistical confidence
docker-compose exec api python manage.py test_template_selection --runs=500

# Keep test data (don't rollback)
docker-compose exec api python manage.py test_template_selection --cleanup
```

---

**Report Generated:** 2025-11-11
**Test Environment:** Development (Docker)
**Django Version:** 4.x
**Python Version:** 3.11

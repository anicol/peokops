"""
Feature Extraction for ML-Based Micro-Check Selection

This module extracts features for predicting whether a check will be "useful"
(i.e., result in FAIL/NEEDS_ATTENTION) at a specific store.
"""

from django.utils import timezone
from datetime import timedelta
from typing import NamedTuple, Optional
import logging

from .models import (
    MicroCheckTemplate,
    MicroCheckResponse,
    CheckCoverage,
    StoreTemplateStats
)
from .ml_config import (
    PRIOR_A,
    PRIOR_B,
    CATEGORY_FAIL_RATE_WINDOW_DAYS,
    STORE_COMPLETION_RATE_WINDOW_DAYS,
    SEVERITY_NUMERIC,
)

logger = logging.getLogger(__name__)


class FeatureVector(NamedTuple):
    """Container for extracted features and metadata"""
    # ML model input features
    X: list  # Feature array for sklearn

    # Local prior data (for blending)
    p_prior: float  # Beta-smoothed failure rate for this store+template
    local_total: int  # Number of responses for this store+template

    # Metadata
    feature_names: list
    template_id: str
    store_id: int


def empirical_prior(fails: int, total: int, a: float = PRIOR_A, b: float = PRIOR_B) -> float:
    """
    Compute Beta-smoothed failure rate.

    Args:
        fails: Number of FAIL + NEEDS_ATTENTION responses
        total: Total number of responses
        a: Prior pseudo-failures (optimistic smoothing)
        b: Prior pseudo-passes

    Returns:
        Smoothed failure probability between 0 and 1
    """
    return (fails + a) / (total + a + b)


def extract_features_for_template(store, template: MicroCheckTemplate) -> FeatureVector:
    """
    Extract all features for a given store+template combination.

    Args:
        store: Store model instance
        template: MicroCheckTemplate instance

    Returns:
        FeatureVector with ML features and local prior data
    """
    now = timezone.now()

    # Feature 1: days_since_last_checked
    days_since_last_checked = _get_days_since_last_checked(store, template, now)

    # Feature 2: category_fail_rate_14d
    category_fail_rate = _get_category_fail_rate(
        store,
        template.category,
        window_days=CATEGORY_FAIL_RATE_WINDOW_DAYS
    )

    # Feature 3: failed_last_time (binary)
    failed_last_time = _get_failed_last_time(store, template)

    # Feature 4: store_completion_rate_14d
    store_completion_rate = _get_store_completion_rate(
        store,
        window_days=STORE_COMPLETION_RATE_WINDOW_DAYS
    )

    # Feature 5: severity_numeric
    severity_numeric = SEVERITY_NUMERIC.get(template.severity, 2)

    # Feature 6: review_sentiment_score
    review_sentiment_score = _get_review_sentiment_score(template)

    # Feature 7-9: segment one-hot encoding
    segment_low_vol = 1 if store.segment == 'low_vol' else 0
    segment_med_vol = 1 if store.segment == 'med_vol' else 0
    segment_high_vol = 1 if store.segment == 'high_vol' else 0

    # Get local prior from StoreTemplateStats
    p_prior, local_total = _get_local_prior(store, template)

    # Assemble feature vector
    X = [
        days_since_last_checked,
        category_fail_rate,
        failed_last_time,
        store_completion_rate,
        severity_numeric,
        review_sentiment_score,
        segment_low_vol,
        segment_med_vol,
        segment_high_vol,
    ]

    feature_names = [
        'days_since_last_checked',
        'category_fail_rate_14d',
        'failed_last_time',
        'store_completion_rate_14d',
        'severity_numeric',
        'review_sentiment_score',
        'segment_low_vol',
        'segment_med_vol',
        'segment_high_vol',
    ]

    return FeatureVector(
        X=X,
        p_prior=p_prior,
        local_total=local_total,
        feature_names=feature_names,
        template_id=str(template.id),
        store_id=store.id,
    )


def _get_days_since_last_checked(store, template: MicroCheckTemplate, now) -> float:
    """Get days since template was last checked at this store."""
    try:
        coverage = CheckCoverage.objects.get(store=store, template=template)
        delta = now - coverage.last_visual_verified_at
        return delta.total_seconds() / 86400.0  # Convert to days
    except CheckCoverage.DoesNotExist:
        return 999.0  # Never checked - high priority


def _get_category_fail_rate(store, category: str, window_days: int) -> float:
    """Get failure rate for this category at this store in the last N days."""
    cutoff = timezone.now() - timedelta(days=window_days)

    responses = MicroCheckResponse.objects.filter(
        store=store,
        category=category,
        completed_at__gte=cutoff,
    )

    total = responses.count()
    if total == 0:
        return 0.0

    fails = responses.filter(status__in=['FAIL', 'NEEDS_ATTENTION']).count()
    return fails / total


def _get_failed_last_time(store, template: MicroCheckTemplate) -> int:
    """Binary indicator: did this template fail last time? (1=yes, 0=no/unknown)."""
    try:
        coverage = CheckCoverage.objects.get(store=store, template=template)
        return 1 if coverage.last_visual_status in ['FAIL', 'NEEDS_ATTENTION'] else 0
    except CheckCoverage.DoesNotExist:
        return 0


def _get_store_completion_rate(store, window_days: int) -> float:
    """Get completion rate for all checks at this store in the last N days."""
    from .models import MicroCheckRun

    cutoff = timezone.now() - timedelta(days=window_days)

    total_runs = MicroCheckRun.objects.filter(
        store=store,
        created_at__gte=cutoff,
    ).count()

    if total_runs == 0:
        return 1.0  # Default to high completion for new stores

    completed_runs = MicroCheckRun.objects.filter(
        store=store,
        created_at__gte=cutoff,
        status='COMPLETED',
    ).count()

    return completed_runs / total_runs


def _get_review_sentiment_score(template: MicroCheckTemplate) -> float:
    """
    Get sentiment score from template metadata (for review-derived templates).

    Returns:
        Float between -1.0 (negative) and 1.0 (positive), or 0.0 if not available
    """
    if template.source == 'google_reviews':
        # Extract sentiment from metadata if available
        metadata = template.metadata or {}
        return float(metadata.get('sentiment_score', 0.0))
    return 0.0


def _get_local_prior(store, template: MicroCheckTemplate) -> tuple[float, int]:
    """
    Get local prior and total responses for this store+template.

    Returns:
        (p_prior, local_total) tuple
    """
    try:
        stats = StoreTemplateStats.objects.get(store=store, template=template)
        p_prior = empirical_prior(stats.fails, stats.total)
        return p_prior, stats.total
    except StoreTemplateStats.DoesNotExist:
        # No data yet - return default prior
        p_prior = empirical_prior(0, 0)
        return p_prior, 0

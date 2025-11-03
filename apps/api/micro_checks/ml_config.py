"""
ML Configuration for Adaptive Micro-Check Selection

This module contains configuration constants for the machine learning
system that enhances template selection with personalized predictions.
"""

# Beta Prior Smoothing Parameters
# Used for Bayesian smoothing of local failure rates
# Beta(a, b) where a = pseudo-failures, b = pseudo-passes
PRIOR_A = 1.0  # Small prior on failures
PRIOR_B = 3.0  # Larger prior on passes (optimistic default)

# Cold-Start Blending Parameter
# Controls how quickly we trust local data vs brand model predictions
# λ = total / (total + K)
# - Small K = trust local data quickly
# - Large K = require more data before trusting local prior
LAMBDA_K = 10

# Score Combination Weights
# final_score = RULE_WEIGHT * rule_score + ML_WEIGHT * normalized(p_personalized)
RULE_WEIGHT = 0.6  # Existing rule-based score (recency, failures, severity)
ML_WEIGHT = 0.4    # ML-predicted usefulness probability

# Training Requirements
MIN_BRAND_SAMPLES = 100  # Minimum responses needed to train a brand model

# Model Scope
# Options: 'per_brand' or 'per_brand_segment'
# per_brand: One model per brand
# per_brand_segment: One model per (brand, segment) combination
MODEL_SCOPE = 'per_brand_segment'

# S3 Storage Configuration
# Use environment-specific bucket (dev/staging/prod)
import os
from django.conf import settings

_env = os.getenv('DJANGO_ENV', 'dev')
if _env == 'production':
    S3_BUCKET = 'verity-ml-models'
elif _env == 'staging':
    S3_BUCKET = 'verity-ml-models-staging'
else:
    # Development environment
    S3_BUCKET = 'verity-ml-models-dev'

S3_PREFIX = 'micro_checks/failure_predictor'

# Model Cache Settings
LOCAL_CACHE_DIR = '/tmp/ml_models_cache'
LOCAL_CACHE_TTL_SECONDS = 3600  # 1 hour

# Feature Engineering
CATEGORY_FAIL_RATE_WINDOW_DAYS = 14  # Window for category failure rate
STORE_COMPLETION_RATE_WINDOW_DAYS = 14  # Window for store completion rate

# Severity Numeric Mapping (for ML features)
SEVERITY_NUMERIC = {
    'CRITICAL': 4,
    'HIGH': 3,
    'MEDIUM': 2,
    'LOW': 1,
}

# Training Schedule
TRAINING_SCHEDULE = {
    'day_of_week': 6,  # Sunday (0=Monday, 6=Sunday)
    'hour': 3,         # 3 AM
    'minute': 0,
}

# Model Evaluation Thresholds
MIN_F1_SCORE = 0.5  # Minimum F1 score to deploy a model
MIN_PRECISION = 0.4  # Minimum precision for failure prediction

# Calibration Settings
CALIBRATION_BINS = 10  # Number of bins for calibration analysis
CALIBRATION_TOLERANCE = 0.10  # ±10% acceptable deviation

# Alerting Thresholds
COMPLETION_RATE_DROP_THRESHOLD = 0.03  # 3% drop triggers alert
MODEL_TRAINING_FAILURE_THRESHOLD = 2  # Alert after 2 consecutive failures

# Feature Names (for documentation and validation)
FEATURE_NAMES = [
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

# Target Definition
TARGET_STATUSES = ['FAIL', 'NEEDS_ATTENTION']  # Statuses that count as "useful" checks

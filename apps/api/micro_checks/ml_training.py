"""
ML Training Pipeline for Adaptive Micro-Check Selection

This module handles training logistic regression models to predict
check usefulness (probability of FAIL/NEEDS_ATTENTION).
"""

import logging
from typing import Optional, Tuple
from datetime import datetime

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score, classification_report

from django.db.models import Q

from .models import MicroCheckResponse, MicroCheckTemplate
from .ml_features import extract_features_for_template
from .ml_models import MLModelManager
from .ml_config import (
    MIN_BRAND_SAMPLES,
    MIN_F1_SCORE,
    MIN_PRECISION,
    TARGET_STATUSES,
    MODEL_SCOPE,
)

logger = logging.getLogger(__name__)


def train_failure_predictor(
    brand_id: int,
    segment_id: Optional[str] = None,
    dry_run: bool = False
) -> dict:
    """
    Train a logistic regression model for a brand (and optionally segment).

    Args:
        brand_id: Brand ID
        segment_id: Optional store segment ('low_vol', 'med_vol', 'high_vol')
        dry_run: If True, don't save the model

    Returns:
        Dictionary with training results and metrics
    """
    logger.info(f"Starting training for brand={brand_id}, segment={segment_id}")

    # Step 1: Prepare training data
    X, y, metadata = prepare_training_data(brand_id, segment_id)

    if X is None or len(X) < MIN_BRAND_SAMPLES:
        msg = f"Insufficient data: {len(X) if X is not None else 0} samples (need {MIN_BRAND_SAMPLES})"
        logger.warning(msg)
        return {
            'success': False,
            'error': msg,
            'samples': len(X) if X is not None else 0,
        }

    # Step 2: Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y if len(np.unique(y)) > 1 else None
    )

    logger.info(f"Training set: {len(X_train)} samples, Test set: {len(X_test)} samples")
    logger.info(f"Positive class rate: {y.mean():.2%}")

    # Step 3: Train model
    model = LogisticRegression(
        max_iter=1000,
        random_state=42,
        class_weight='balanced',  # Handle class imbalance
    )

    model.fit(X_train, y_train)

    # Step 4: Evaluate model
    metrics = evaluate_model(model, X_test, y_test)

    logger.info(f"Model metrics: F1={metrics['f1']:.3f}, Precision={metrics['precision']:.3f}, Recall={metrics['recall']:.3f}")

    # Step 5: Check if model meets quality thresholds
    if metrics['f1'] < MIN_F1_SCORE:
        logger.warning(f"Model F1 score {metrics['f1']:.3f} below threshold {MIN_F1_SCORE}")
    if metrics['precision'] < MIN_PRECISION:
        logger.warning(f"Model precision {metrics['precision']:.3f} below threshold {MIN_PRECISION}")

    # Step 6: Save model if not dry run
    if not dry_run:
        model_manager = MLModelManager()
        training_metadata = {
            'brand_id': brand_id,
            'segment_id': segment_id,
            'training_date': datetime.now().isoformat(),
            'samples_train': len(X_train),
            'samples_test': len(X_test),
            'positive_rate': float(y.mean()),
            'f1_score': metrics['f1'],
            'precision': metrics['precision'],
            'recall': metrics['recall'],
            'feature_names': metadata['feature_names'],
        }

        success = model_manager.save_model(
            model=model,
            brand_id=brand_id,
            segment_id=segment_id,
            metadata=training_metadata
        )

        if not success:
            return {
                'success': False,
                'error': 'Failed to save model to S3',
                **metrics
            }

    return {
        'success': True,
        'brand_id': brand_id,
        'segment_id': segment_id,
        'samples_train': len(X_train),
        'samples_test': len(X_test),
        'dry_run': dry_run,
        **metrics
    }


def prepare_training_data(
    brand_id: int,
    segment_id: Optional[str] = None
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], dict]:
    """
    Prepare training data for a brand/segment.

    Args:
        brand_id: Brand ID
        segment_id: Optional store segment filter

    Returns:
        (X, y, metadata) tuple where:
        - X: Feature matrix (n_samples, n_features)
        - y: Target labels (n_samples,) binary 0/1
        - metadata: Dict with feature names and other info
    """
    from brands.models import Store

    # Build filter for responses
    response_filter = Q(store__brand_id=brand_id)
    if segment_id:
        response_filter &= Q(store__segment=segment_id)

    # Get all responses for this brand/segment
    responses = MicroCheckResponse.objects.filter(
        response_filter
    ).select_related('template', 'store').order_by('completed_at')

    logger.info(f"Found {responses.count()} responses for brand={brand_id}, segment={segment_id}")

    if responses.count() < MIN_BRAND_SAMPLES:
        return None, None, {}

    # Extract features for each response
    X_list = []
    y_list = []
    skipped = 0

    for response in responses:
        try:
            # Extract features at the time of the response
            # Note: This is retrospective - we're using historical data
            features = extract_features_for_template(response.store, response.template)

            # Target: 1 if FAIL/NEEDS_ATTENTION, 0 otherwise
            y = 1 if response.status in TARGET_STATUSES else 0

            X_list.append(features.X)
            y_list.append(y)

        except Exception as e:
            logger.warning(f"Failed to extract features for response {response.id}: {e}")
            skipped += 1
            continue

    if skipped > 0:
        logger.warning(f"Skipped {skipped} responses due to feature extraction errors")

    if len(X_list) == 0:
        return None, None, {}

    X = np.array(X_list)
    y = np.array(y_list)

    metadata = {
        'feature_names': features.feature_names if features else [],
        'total_samples': len(X),
        'positive_samples': y.sum(),
        'negative_samples': (1 - y).sum(),
    }

    return X, y, metadata


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> dict:
    """
    Evaluate model performance on test set.

    Args:
        model: Trained sklearn model
        X_test: Test features
        y_test: Test labels

    Returns:
        Dict with precision, recall, F1 score
    """
    y_pred = model.predict(X_test)

    # Handle edge case where all predictions are same class
    try:
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
    except Exception as e:
        logger.error(f"Error computing metrics: {e}")
        precision = recall = f1 = 0.0

    # Get classification report for logging
    try:
        report = classification_report(y_test, y_pred, zero_division=0)
        logger.info(f"Classification Report:\n{report}")
    except Exception as e:
        logger.warning(f"Could not generate classification report: {e}")

    return {
        'precision': float(precision),
        'recall': float(recall),
        'f1': float(f1),
    }


def train_all_brand_models(dry_run: bool = False) -> list:
    """
    Train models for all brands (and segments if MODEL_SCOPE = 'per_brand_segment').

    Args:
        dry_run: If True, don't save models

    Returns:
        List of training results for each brand/segment
    """
    from brands.models import Brand, Store

    results = []

    if MODEL_SCOPE == 'per_brand':
        # Train one model per brand
        brands = Brand.objects.filter(is_active=True)

        for brand in brands:
            try:
                result = train_failure_predictor(
                    brand_id=brand.id,
                    segment_id=None,
                    dry_run=dry_run
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Error training model for brand {brand.id}: {e}")
                results.append({
                    'success': False,
                    'brand_id': brand.id,
                    'error': str(e)
                })

    elif MODEL_SCOPE == 'per_brand_segment':
        # Train one model per (brand, segment) combination
        brands = Brand.objects.filter(is_active=True)

        for brand in brands:
            # Get distinct segments for this brand
            segments = Store.objects.filter(
                brand=brand,
                segment__isnull=False
            ).values_list('segment', flat=True).distinct()

            if not segments:
                # If no segments defined, train a brand-level model
                try:
                    result = train_failure_predictor(
                        brand_id=brand.id,
                        segment_id=None,
                        dry_run=dry_run
                    )
                    results.append(result)
                except Exception as e:
                    logger.error(f"Error training model for brand {brand.id}: {e}")
                    results.append({
                        'success': False,
                        'brand_id': brand.id,
                        'error': str(e)
                    })
            else:
                # Train one model per segment
                for segment in segments:
                    try:
                        result = train_failure_predictor(
                            brand_id=brand.id,
                            segment_id=segment,
                            dry_run=dry_run
                        )
                        results.append(result)
                    except Exception as e:
                        logger.error(f"Error training model for brand {brand.id}, segment {segment}: {e}")
                        results.append({
                            'success': False,
                            'brand_id': brand.id,
                            'segment_id': segment,
                            'error': str(e)
                        })

    else:
        logger.error(f"Unknown MODEL_SCOPE: {MODEL_SCOPE}")

    # Log summary
    successful = sum(1 for r in results if r.get('success'))
    logger.info(f"Training complete: {successful}/{len(results)} models trained successfully")

    return results

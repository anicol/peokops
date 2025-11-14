"""
Helper functions for Google Reviews AI analysis.

Centralized logic for analyzing reviews to avoid code duplication.
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
from django.utils import timezone
from ai_services.bedrock_service import BedrockRecommendationService

logger = logging.getLogger(__name__)


def analyze_google_review(review, bedrock_service: Optional[BedrockRecommendationService] = None) -> Dict[str, Any]:
    """
    Analyze a single Google review using AI and update the database.

    Args:
        review: GoogleReview instance to analyze
        bedrock_service: Optional BedrockRecommendationService instance (creates new one if not provided)

    Returns:
        Dict with analysis results and metadata:
        {
            'success': bool,
            'processing_time_ms': int,
            'analysis_result': dict (if successful),
            'error': str (if failed)
        }

    Side Effects:
        - Creates or updates GoogleReviewAnalysis record
        - Updates review.needs_analysis and review.analyzed_at fields
    """
    from .models import GoogleReviewAnalysis

    if bedrock_service is None:
        bedrock_service = BedrockRecommendationService()

    try:
        start_time = datetime.now()

        # Analyze the review using AI
        analysis_result = bedrock_service.analyze_review(
            review_text=review.review_text,
            rating=review.rating
        )

        # Calculate processing time
        processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        # Create or update analysis
        GoogleReviewAnalysis.objects.update_or_create(
            review=review,
            defaults={
                'topics': analysis_result['topics'],
                'sentiment_score': analysis_result['sentiment_score'],
                'actionable_issues': analysis_result['actionable_issues'],
                'suggested_category': analysis_result['suggested_category'],
                'confidence': analysis_result.get('confidence', 0.5),
                'model_used': 'claude-3-haiku' if bedrock_service.enabled else 'fallback',
                'processing_time_ms': processing_time_ms
            }
        )

        # Mark review as analyzed
        review.needs_analysis = False
        review.analyzed_at = timezone.now()
        review.save(update_fields=['needs_analysis', 'analyzed_at'])

        logger.info(
            f"Successfully analyzed review {review.google_review_id[:16]}: "
            f"{analysis_result['suggested_category']} "
            f"(sentiment: {analysis_result['sentiment_score']:.2f})"
        )

        return {
            'success': True,
            'processing_time_ms': processing_time_ms,
            'analysis_result': analysis_result
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to analyze review {review.google_review_id}: {error_msg}")

        return {
            'success': False,
            'processing_time_ms': 0,
            'error': error_msg
        }


def bulk_analyze_reviews(reviews, verbose: bool = False) -> Dict[str, Any]:
    """
    Analyze multiple Google reviews in batch.

    Args:
        reviews: QuerySet or list of GoogleReview instances
        verbose: Whether to log detailed progress per review

    Returns:
        Dict with summary statistics:
        {
            'total': int,
            'analyzed': int,
            'failed': int,
            'skipped': int,
            'total_time_ms': int,
            'avg_time_ms': float,
            'topics_summary': dict,
            'avg_sentiment': float
        }
    """
    bedrock_service = BedrockRecommendationService()

    stats = {
        'total': 0,
        'analyzed': 0,
        'failed': 0,
        'skipped': 0,
        'total_time_ms': 0,
        'topics_summary': {},
        'sentiment_scores': []
    }

    for review in reviews:
        stats['total'] += 1

        result = analyze_google_review(review, bedrock_service)

        if result['success']:
            stats['analyzed'] += 1
            stats['total_time_ms'] += result['processing_time_ms']

            # Track sentiment
            sentiment = result['analysis_result']['sentiment_score']
            stats['sentiment_scores'].append(sentiment)

            # Track topics
            for topic in result['analysis_result']['topics']:
                stats['topics_summary'][topic] = stats['topics_summary'].get(topic, 0) + 1

            if verbose:
                logger.info(
                    f"[{stats['total']}] Analyzed - "
                    f"Sentiment: {sentiment:.2f}, "
                    f"Topics: {', '.join(result['analysis_result']['topics'][:3])}, "
                    f"Time: {result['processing_time_ms']}ms"
                )
        else:
            stats['failed'] += 1
            if verbose:
                logger.error(f"[{stats['total']}] Failed: {result['error']}")

    # Calculate averages
    if stats['analyzed'] > 0:
        stats['avg_time_ms'] = stats['total_time_ms'] / stats['analyzed']
        stats['avg_sentiment'] = sum(stats['sentiment_scores']) / len(stats['sentiment_scores'])
    else:
        stats['avg_time_ms'] = 0
        stats['avg_sentiment'] = 0

    # Clean up internal tracking
    del stats['sentiment_scores']

    return stats

from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1)
def process_review_analysis(self, analysis_id):
    """
    Process review analysis in background
    1. Scrape Google Reviews
    2. Analyze for insights
    3. Generate micro-check suggestions
    4. Send email if email was captured
    """
    from .models import ReviewAnalysis
    from marketing.management.commands.scrape_google_reviews import Command as ScraperCommand
    from marketing.management.commands.research_google_reviews import Command as AnalyzerCommand
    
    try:
        analysis = ReviewAnalysis.objects.get(id=analysis_id)

        # Step 1: Initialize
        analysis.status = ReviewAnalysis.Status.PROCESSING
        analysis.progress_message = '🔍 Initializing browser and searching Google Maps...'
        analysis.progress_percentage = 5
        analysis.save()

        # Step 2: Start scraping
        scraper = ScraperCommand()
        scraper.stdout = MockStdout()

        logger.info(f"Starting scrape for {analysis.business_name}")

        analysis.progress_message = f'🗺️  Finding "{analysis.business_name}" on Google Maps...'
        analysis.progress_percentage = 15
        analysis.save()

        try:
            scraped_data = scraper.scrape_reviews(
                business_name=analysis.business_name,
                location=analysis.location,
                max_reviews=100,  # Limit to 100 for speed
                headless=True
            )
        except Exception as e:
            logger.error(f"Scraping failed for {analysis_id}: {str(e)}")
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = f"Could not find business or scrape reviews: {str(e)}"
            analysis.save()
            return

        if not scraped_data or not scraped_data.get('reviews'):
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = 'No reviews found. Please check business name and location.'
            analysis.save()
            return

        # Step 3: Reviews found
        review_count = len(scraped_data['reviews'])
        business_info = scraped_data.get('business_info', {})

        analysis.progress_message = f'✅ Found business! Loading {review_count} reviews...'
        analysis.progress_percentage = 30
        analysis.scraped_data = scraped_data
        analysis.google_rating = business_info.get('rating')
        analysis.google_address = business_info.get('address', '')
        analysis.total_reviews_found = business_info.get('total_reviews', 0)
        analysis.reviews_analyzed = review_count
        analysis.save()

        # Step 4: Reading reviews
        analysis.progress_message = f'📖 Reading through {review_count} customer reviews...'
        analysis.progress_percentage = 45
        analysis.save()

        # Step 5: Analyzing sentiment
        analysis.progress_message = '🎯 Analyzing sentiment and identifying patterns...'
        analysis.progress_percentage = 60
        analysis.save()

        # Analyze reviews
        analyzer = AnalyzerCommand()
        reviews_formatted = scraped_data.get('reviews', [])

        insights = analyzer.analyze_reviews(reviews_formatted)

        # Step 6: Identifying issues
        analysis.progress_message = '🔎 Identifying key operational issues...'
        analysis.progress_percentage = 75
        analysis.insights = insights
        analysis.save()

        # Step 7: Generate recommendations
        analysis.progress_message = '💡 Generating personalized micro-check recommendations...'
        analysis.progress_percentage = 90
        analysis.save()

        micro_check_suggestions = analyzer.generate_microcheck_suggestions(insights)
        analysis.micro_check_suggestions = micro_check_suggestions
        analysis.save()

        # Step 8: Complete
        analysis.status = ReviewAnalysis.Status.COMPLETED
        analysis.progress_message = '🎉 Analysis complete! Your insights are ready.'
        analysis.progress_percentage = 100
        analysis.completed_at = timezone.now()
        analysis.save()
        
        logger.info(f"Analysis completed for {analysis_id}")
        
        # Send email if email was captured
        if analysis.contact_email:
            send_analysis_email.delay(analysis_id)
        
    except Exception as e:
        logger.error(f"Error processing analysis {analysis_id}: {str(e)}", exc_info=True)
        try:
            analysis = ReviewAnalysis.objects.get(id=analysis_id)
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = f"Processing error: {str(e)}"
            analysis.save()
        except:
            pass
        raise


@shared_task
def send_analysis_email(analysis_id):
    """Send email with analysis results"""
    from .models import ReviewAnalysis
    from django.core.mail import send_mail
    from django.conf import settings
    from django.template.loader import render_to_string
    
    try:
        analysis = ReviewAnalysis.objects.get(id=analysis_id)
        
        if not analysis.contact_email:
            return
        
        # Prepare email content
        context = {
            'analysis': analysis,
            'business_name': analysis.business_name,
            'google_rating': analysis.google_rating,
            'reviews_analyzed': analysis.reviews_analyzed,
            'key_issues': analysis.key_issues,
            'sentiment': analysis.sentiment_summary,
            'view_url': analysis.get_public_url(),
        }
        
        subject = f"Your Review Analysis for {analysis.business_name} is Ready!"
        
        # Plain text version
        message = f"""
Hi{' ' + analysis.contact_name if analysis.contact_name else ''},

Your Google Reviews analysis for {analysis.business_name} is complete!

📊 Overview:
- Google Rating: {analysis.google_rating or 'N/A'} stars
- Reviews Analyzed: {analysis.reviews_analyzed}
- Key Issues Found: {len(analysis.key_issues)}

🔍 Top Issues from Customer Reviews:
{chr(10).join([f"{i+1}. {issue['theme']}: {issue['mentions']} mentions" for i, issue in enumerate(analysis.key_issues[:3])])}

💡 We've generated {len(analysis.micro_check_suggestions or [])} targeted micro-check recommendations to address these issues.

View your full analysis here:
{analysis.get_public_url()}

Ready to turn these insights into action? Start your free trial:
{settings.FRONTEND_URL}/trial-signup?analysis={analysis.id}

Best regards,
The PeakOps Team
        """
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[analysis.contact_email],
            fail_silently=False,
        )
        
        analysis.email_sent_at = timezone.now()
        analysis.save(update_fields=['email_sent_at'])
        
        logger.info(f"Email sent to {analysis.contact_email} for analysis {analysis_id}")
        
    except Exception as e:
        logger.error(f"Error sending email for analysis {analysis_id}: {str(e)}")


class MockStdout:
    """Mock stdout for management command"""
    def write(self, msg):
        pass
    
    def style(self):
        return self
    
    def SUCCESS(self, msg):
        return msg
    
    def ERROR(self, msg):
        return msg
    
    def WARNING(self, msg):
        return msg

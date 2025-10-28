import os
from pathlib import Path
from datetime import timedelta
from decouple import config
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0').split(',')

# Add Render and custom domain hosts for production
if not DEBUG:
    ALLOWED_HOSTS.extend([
        'peakops-api.onrender.com',
        'api.getpeakops.com', 
        'getpeakops.com',
        '.getpeakops.com',  # Allow all subdomains
    ])

# Production security settings
if not DEBUG:
    # Don't force SSL redirect during testing
    SECURE_SSL_REDIRECT = not config('TESTING', default=False, cast=bool)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'storages',
    'django_celery_beat',
    'drf_spectacular',
    'django_filters',
]

LOCAL_APPS = [
    'core.apps.CoreConfig',
    'accounts.apps.AccountsConfig',
    'brands.apps.BrandsConfig',
    'uploads.apps.UploadsConfig',
    'inspections.apps.InspectionsConfig',
    'videos.apps.VideosConfig',
    'ai_services.apps.AiServicesConfig',
    'billing.apps.BillingConfig',
    'marketing.apps.MarketingConfig',
    'micro_checks.apps.MicroChecksConfig',
    'integrations.apps.IntegrationsConfig',
    'insights.apps.InsightsConfig',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'peakops.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'peakops.wsgi.application'

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default='sqlite:///db.sqlite3')
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=config('JWT_REFRESH_TOKEN_LIFETIME', default=1440, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'PeakOps API',
    'DESCRIPTION': 'AI-powered video inspection platform for restaurant safety and compliance',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'SERVERS': [
        {
            'url': 'https://peakops-api.onrender.com',
            'description': 'Production server'
        },
        {
            'url': 'http://localhost:8000',
            'description': 'Development server'
        }
    ],
    'TAGS': [
        {'name': 'Authentication', 'description': 'User authentication and management'},
        {'name': 'Videos', 'description': 'Video upload and management'},
        {'name': 'Uploads', 'description': 'Presigned URL uploads and processing'},
        {'name': 'Inspections', 'description': 'AI-powered video inspections'},
        {'name': 'Brands', 'description': 'Brand and store management'},
        {'name': 'Core', 'description': 'Health checks and system status'},
    ],
    'EXTERNAL_DOCS': {
        'description': 'PeakOps Documentation',
        'url': 'https://docs.getpeakops.com'
    },
    'CONTACT': {
        'name': 'PeakOps Support',
        'email': 'support@getpeakops.com'
    },
    'LICENSE': {
        'name': 'Proprietary'
    },
    'PREPROCESSING_HOOKS': [
        'peakops.schema.custom_preprocessing_hook',
    ],
    'POSTPROCESSING_HOOKS': [
        'peakops.schema.custom_postprocessing_hook',
    ],
}

# CORS settings for production
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',  # Marketing app dev server  
        'http://localhost:5174',  # Web app dev server
    ]
else:
    CORS_ALLOWED_ORIGINS = [
        # Render default URLs
        'https://peakops-web.onrender.com',
        'https://peakops-marketing.onrender.com',  # Old static site
        'https://peakops-marketing-web.onrender.com',  # New Next.js SSR service
        # Custom subdomains for production
        'https://getpeakops.com',
        'https://www.getpeakops.com',
        'https://app.getpeakops.com',
        # Allow other subdomains if configured
        'https://marketing.getpeakops.com',
    ]

CORS_ALLOW_CREDENTIALS = True

# Redis configuration
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')

CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Micro-check scheduling settings
MICRO_CHECK_SEND_HOUR = config('MICRO_CHECK_SEND_HOUR', default=8, cast=int)  # 8 AM UTC by default
MICRO_CHECK_SEND_MINUTE = config('MICRO_CHECK_SEND_MINUTE', default=0, cast=int)

# Celery Beat Schedule for automated tasks
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Daily retention cleanup at 2 AM
    'cleanup-expired-uploads': {
        'task': 'uploads.tasks.cleanup_expired_uploads_task',
        'schedule': 60 * 60 * 24,  # Every 24 hours
        'options': {'queue': 'maintenance'}
    },
    # Hourly temp file cleanup
    'cleanup-temp-files': {
        'task': 'uploads.tasks.cleanup_temp_files_task',
        'schedule': 60 * 60,  # Every hour
        'options': {'queue': 'maintenance'}
    },
    # Hourly micro-check creation and email sending (checks each store's configured send time)
    'create-daily-micro-checks': {
        'task': 'micro_checks.tasks.create_daily_micro_check_runs',
        'schedule': crontab(minute=5),  # Run at :05 past every hour
        'options': {'queue': 'default'}
    },
    # 7shifts integration - Daily employee sync at 3 AM UTC
    'sync-seven-shifts-employees': {
        'task': 'integrations.sync_seven_shifts_employees',
        'schedule': crontab(hour=3, minute=0),  # 3:00 AM UTC daily
        'options': {'queue': 'default'}
    },
    # 7shifts integration - Shift sync twice daily (6 AM and 6 PM UTC)
    'sync-seven-shifts-shifts-morning': {
        'task': 'integrations.sync_seven_shifts_shifts',
        'schedule': crontab(hour=6, minute=0),  # 6:00 AM UTC
        'options': {'queue': 'default'}
    },
    'sync-seven-shifts-shifts-evening': {
        'task': 'integrations.sync_seven_shifts_shifts',
        'schedule': crontab(hour=18, minute=0),  # 6:00 PM UTC
        'options': {'queue': 'default'}
    },
    # 7shifts integration - Weekly cleanup of old shifts (Sundays at 4 AM UTC)
    'cleanup-old-seven-shifts-data': {
        'task': 'integrations.cleanup_old_shifts',
        'schedule': crontab(day_of_week=0, hour=4, minute=0),  # Sundays at 4 AM
        'options': {'queue': 'maintenance'}
    },
    # 7shifts integration - Monthly cleanup of old sync logs (1st of month at 5 AM UTC)
    'cleanup-old-sync-logs': {
        'task': 'integrations.cleanup_old_sync_logs',
        'schedule': crontab(day_of_month=1, hour=5, minute=0),  # 1st of month at 5 AM
        'options': {'queue': 'maintenance'}
    },
}

AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default='')
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

# Signed URLs configuration (more secure than public access)
AWS_QUERYSTRING_AUTH = True  # Use signed URLs
AWS_QUERYSTRING_EXPIRE = 3600  # URLs expire after 1 hour (in seconds)

if AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

MAX_VIDEO_SIZE_MB = config('MAX_VIDEO_SIZE_MB', default=100, cast=int)
SUPPORTED_VIDEO_FORMATS = config('SUPPORTED_VIDEO_FORMATS', default='mp4,mov,avi').split(',')

INSPECTION_MODE_RETENTION_DAYS = config('INSPECTION_MODE_RETENTION_DAYS', default=365, cast=int)
COACHING_MODE_RETENTION_DAYS = config('COACHING_MODE_RETENTION_DAYS', default=7, cast=int)

ENABLE_AWS_REKOGNITION = config('ENABLE_AWS_REKOGNITION', default=True, cast=bool)
ENABLE_YOLO_DETECTION = config('ENABLE_YOLO_DETECTION', default=False, cast=bool)
ENABLE_OCR_DETECTION = config('ENABLE_OCR_DETECTION', default=True, cast=bool)

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = config('TWILIO_AUTH_TOKEN', default='')
TWILIO_PHONE_NUMBER = config('TWILIO_PHONE_NUMBER', default='')

# Micro-check magic link base URL
MICRO_CHECK_BASE_URL = config('MICRO_CHECK_BASE_URL', default='http://localhost:3000')
ENABLE_BEDROCK_RECOMMENDATIONS = config('ENABLE_BEDROCK_RECOMMENDATIONS', default=False, cast=bool)

# Stripe Settings
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5174')

# AWS Rekognition Configuration
REKOGNITION_PPE_MIN_CONFIDENCE = config('REKOGNITION_PPE_MIN_CONFIDENCE', default=80, cast=int)
REKOGNITION_OBJECTS_MIN_CONFIDENCE = config('REKOGNITION_OBJECTS_MIN_CONFIDENCE', default=70, cast=int)
REKOGNITION_MAX_LABELS = config('REKOGNITION_MAX_LABELS', default=50, cast=int)
REKOGNITION_TEXT_MIN_CONFIDENCE = config('REKOGNITION_TEXT_MIN_CONFIDENCE', default=80, cast=int)

# Operational Compliance Settings
MAX_PEOPLE_IN_KITCHEN = config('MAX_PEOPLE_IN_KITCHEN', default=10, cast=int)
MAX_PEOPLE_IN_LINE = config('MAX_PEOPLE_IN_LINE', default=15, cast=int)

# Demo and Privacy Settings
DEMO_MODE = config('DEMO_MODE', default=True, cast=bool)
FACE_BLUR = config('FACE_BLUR', default=False, cast=bool)

# Demo mode configuration
if DEMO_MODE:
    # Allow longer session times in demo mode
    SESSION_COOKIE_AGE = 86400 * 7  # 7 days
    
    # More permissive CORS in demo mode
    if DEBUG:
        CORS_ALLOW_ALL_ORIGINS = True
    
    # Demo-specific settings
    LOGIN_REDIRECT_URL = '/'
    LOGOUT_REDIRECT_URL = '/login'

# Frame sampling settings (for FFmpeg)
FRAME_SAMPLING_FPS = config('FRAME_SAMPLING_FPS', default=2.5, cast=float)
MAX_FRAMES_PER_VIDEO = config('MAX_FRAMES_PER_VIDEO', default=20, cast=int)

# Webhook settings
WEBHOOK_TIMEOUT_SECONDS = config('WEBHOOK_TIMEOUT_SECONDS', default=30, cast=int)
WEBHOOK_RETRY_ATTEMPTS = config('WEBHOOK_RETRY_ATTEMPTS', default=3, cast=int)

# Email settings - AWS SES Configuration
USE_SES = config('USE_SES', default=False, cast=bool)
TESTING = config('TESTING', default=False, cast=bool)

# For development/testing, use console backend unless explicitly overridden
if (DEBUG or TESTING) and not config('EMAIL_BACKEND', default=None):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@getpeakops.com')
    SERVER_EMAIL = config('SERVER_EMAIL', default='admin@getpeakops.com')
elif USE_SES and not DEBUG:
    # AWS SES Configuration (Recommended for AWS/Render)
    EMAIL_BACKEND = 'django_ses.SESBackend'
    AWS_SES_REGION_NAME = config('AWS_SES_REGION_NAME')
    AWS_SES_REGION_ENDPOINT = f'email.{AWS_SES_REGION_NAME}.amazonaws.com'
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')
    SERVER_EMAIL = config('SERVER_EMAIL')

    # Use existing AWS credentials from your setup
    # AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are already configured above

else:
    # SMTP Configuration - all settings from environment variables
    EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
    EMAIL_HOST = config('EMAIL_HOST')
    EMAIL_PORT = config('EMAIL_PORT', cast=int)
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool)
    EMAIL_USE_SSL = config('EMAIL_USE_SSL', cast=bool)
    EMAIL_HOST_USER = config('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')
    SERVER_EMAIL = config('SERVER_EMAIL')

# Email timeout settings
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=30, cast=int)

# Stripe configuration
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')

# Frontend URL for Stripe redirects
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5174' if DEBUG else 'https://app.getpeakops.com')
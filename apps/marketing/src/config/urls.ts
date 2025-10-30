// URL configuration for different environments
const isDevelopment = process.env.NODE_ENV === 'development';

export const APP_URLS = {
  // Web app URLs
  webApp: isDevelopment
    ? 'http://localhost:3000'
    : 'https://app.getpeakops.com',

  // Marketing site URLs
  marketing: isDevelopment
    ? 'http://localhost:3001' // adjust if marketing runs on different port
    : 'https://getpeakops.com',

  // API URLs
  api: isDevelopment
    ? 'http://localhost:8000/api'
    : 'https://api.getpeakops.com/api',
};

// Login URL (handles both login and trial signup)
export const LOGIN_URL = `${APP_URLS.webApp}/login`;

// Trial signup URL - routes to /start page
export const TRIAL_SIGNUP_URL = `${APP_URLS.webApp}/start`;

// Review Analysis URL - free Google Reviews analysis tool
export const REVIEW_ANALYSIS_URL = `${APP_URLS.webApp}/review-analysis`;
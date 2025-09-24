// API configuration for different environments
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

export const API_CONFIG = {
  baseURL: isDevelopment 
    ? 'http://localhost:8000/api' 
    : 'https://api.verityinspect.com/api',
    
  // Timeout in milliseconds
  timeout: 10000,
  
  // Default headers
  headers: {
    'Content-Type': 'application/json',
  },
};

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login/',
    trialSignup: '/auth/trial-signup/',
    refresh: '/auth/refresh/',
    profile: '/auth/profile/',
  },
  brands: '/brands/',
  stores: '/stores/',
  videos: '/videos/',
  inspections: '/inspections/',
};
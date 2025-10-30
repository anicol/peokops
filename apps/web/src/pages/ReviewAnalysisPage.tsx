import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { insightsAPI } from '@/services/api';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import ReviewTrendChart from '@/components/ReviewTrendChart';

interface AnalysisStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress_message: string;
  progress_percentage: number;
  error_message?: string;
}

interface AnalysisResults {
  id: string;
  business_name: string;
  location: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  google_rating?: number;
  google_address?: string;
  total_reviews_found?: number;
  reviews_analyzed?: number;
  oldest_review_date?: string;
  newest_review_date?: string;
  review_timeframe?: string;
  insights?: any;
  micro_check_suggestions?: any[];
  key_issues?: any[];
  sentiment_summary?: any;
  error_message?: string;
  public_url: string;
}

export default function ReviewAnalysisPage() {
  const { analysisId } = useParams<{ analysisId?: string }>();
  const navigate = useNavigate();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Processing state
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(analysisId || null);
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  // Results state
  const [results, setResults] = useState<AnalysisResults | null>(null);

  // Poll for status when processing
  useEffect(() => {
    if (!currentAnalysisId || status?.status === 'COMPLETED' || status?.status === 'FAILED') {
      return;
    }

    const pollStatus = async () => {
      try {
        const statusData = await insightsAPI.getStatus(currentAnalysisId);
        setStatus(statusData as AnalysisStatus);

        if (statusData.status === 'COMPLETED') {
          // Load full results
          const resultsData = await insightsAPI.getResults(currentAnalysisId);
          setResults(resultsData);
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => clearInterval(interval);
  }, [currentAnalysisId, status?.status]);

  // Load results if analysisId in URL
  useEffect(() => {
    if (analysisId && !results) {
      loadResults(analysisId);
    }
    // Note: 'results' is intentionally omitted to only load when analysisId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  const loadResults = async (id: string) => {
    try {
      const resultsData = await insightsAPI.getResults(id);
      setResults(resultsData);
      setStatus({
        id: resultsData.id,
        status: resultsData.status,
        progress_message: 'Complete',
        progress_percentage: 100,
      });
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use full formatted address if available, otherwise fall back to city, state
      const searchLocation = selectedPlace?.formatted_address || location;

      const response = await insightsAPI.startAnalysis({
        business_name: businessName,
        location: searchLocation,
        source: 'website',
      });

      setCurrentAnalysisId(response.id);
      navigate(`/review-analysis/${response.id}`);
    } catch (error) {
      console.error('Error starting analysis:', error);
      alert('Failed to start analysis. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAnalysisId) return;

    try {
      await insightsAPI.captureEmail(currentAnalysisId, {
        contact_email: email,
        contact_name: name,
      });

      setShowEmailCapture(false);
      alert('Thanks! We\'ll email you when the analysis is complete.');
    } catch (error) {
      console.error('Error capturing email:', error);
      alert('Failed to save email. Please try again.');
    }
  };

  const handlePlaceSelected = (place: any) => {
    console.log('handlePlaceSelected called with:', place);

    if (!place) {
      console.warn('No place data provided');
      return;
    }

    // Store the full place object
    setSelectedPlace(place);

    let city = '';
    let state = '';

    // Try to extract from address components first (most reliable)
    if (place.address_components && Array.isArray(place.address_components)) {
      console.log('Extracting from address_components:', place.address_components);

      // Look for locality (city) and administrative_area_level_1 (state)
      place.address_components.forEach((component: any) => {
        const types = component.types || [];

        // Try locality first, then sublocality, then postal_town
        if (types.includes('locality')) {
          city = component.long_name;
        } else if (!city && types.includes('sublocality')) {
          city = component.long_name;
        } else if (!city && types.includes('postal_town')) {
          city = component.long_name;
        }

        // Get state
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }
      });

      // Set location if we found both
      if (city && state) {
        console.log('Successfully extracted from address_components:', `${city}, ${state}`);
        setLocation(`${city}, ${state}`);
        return;
      } else {
        console.warn('Could not extract city/state from address_components. City:', city, 'State:', state);
      }
    } else {
      console.warn('No address_components available in place data');
    }

    // Fallback: try to extract from formatted address
    if (place.formatted_address) {
      console.log('Attempting fallback extraction from formatted_address:', place.formatted_address);
      const parts = place.formatted_address.split(',').map((p: string) => p.trim());
      console.log('Address parts:', parts);

      // Format is typically: "Business Name, Street, City, State ZIP, Country"
      if (parts.length >= 3) {
        // Get the part that should contain "City"
        const cityPart = parts[parts.length - 3] || '';
        // Get the part that should contain "State ZIP"
        const stateZipPart = parts[parts.length - 2] || '';
        // Extract just the state abbreviation (first word before ZIP)
        const statePart = stateZipPart.split(' ')[0] || '';

        console.log('Extracted from formatted_address - City:', cityPart, 'State:', statePart);

        if (cityPart && statePart && statePart.length === 2) {
          console.log('Fallback extraction successful:', `${cityPart}, ${statePart}`);
          setLocation(`${cityPart}, ${statePart}`);
          return;
        }
      }
    }

    console.error('Failed to extract location from place data. Using formatted_address as fallback.');
    // Last resort: just use the full formatted address
    if (place.formatted_address) {
      setLocation(place.formatted_address);
    }
  };

  // Render form
  if (!currentAnalysisId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* PeakOps Branding Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-3 mb-3">
              <img src="/logo.png" alt="PeakOps" className="w-10 h-10" />
              <span className="text-2xl font-bold text-gray-900">PeakOps</span>
            </div>
            <div className="block">
              <a
                href={import.meta.env.VITE_MARKETING_URL || 'http://localhost:5174'}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Main Site
              </a>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Free Google Reviews Analysis
            </h1>
            <p className="text-xl text-gray-600">
              Discover what your customers are really saying and get personalized recommendations
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <GooglePlacesAutocomplete
                  value={businessName}
                  onChange={setBusinessName}
                  onPlaceSelected={handlePlaceSelected}
                  placeholder="Start typing your business name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Search for your business using Google Places. Location will be automatically detected.
                </p>
              </div>

              {/* Display selected business details */}
              {selectedPlace && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Selected Business</h4>
                      <p className="text-sm font-medium text-gray-800">{selectedPlace.name}</p>
                      {selectedPlace.formatted_address && (
                        <p className="text-sm text-gray-600 mt-1">{selectedPlace.formatted_address}</p>
                      )}
                      {location && (
                        <p className="text-xs text-blue-700 font-medium mt-2">
                          📍 {location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !businessName || !location}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Starting Analysis...' : 'Analyze My Reviews'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">What you'll get:</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Comprehensive analysis of your Google Reviews</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Top operational issues mentioned by customers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Personalized micro-check recommendations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Sentiment breakdown and rating distribution</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render processing state
  if (status && status.status !== 'COMPLETED' && status.status !== 'FAILED') {
    const steps = [
      { label: 'Searching Google Maps', percentage: 15 },
      { label: 'Loading Reviews', percentage: 30 },
      { label: 'Reading Reviews', percentage: 45 },
      { label: 'Analyzing Sentiment', percentage: 60 },
      { label: 'Identifying Issues', percentage: 75 },
      { label: 'Generating Recommendations', percentage: 90 },
      { label: 'Finalizing Report', percentage: 100 },
    ];

    const currentStepIndex = steps.findIndex(step => status.progress_percentage <= step.percentage);
    const activeStep = currentStepIndex >= 0 ? currentStepIndex : steps.length - 1;

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Business Details Header */}
            {(businessName || location || selectedPlace) && (
              <div className="mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{businessName}</h3>
                    {selectedPlace?.formatted_address && (
                      <p className="text-sm text-gray-600 mt-1">{selectedPlace.formatted_address}</p>
                    )}
                    {location && (
                      <p className="text-sm text-blue-700 font-medium mt-1">
                        📍 {location}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Analyzing Your Reviews
              </h2>
              <p className="text-lg text-gray-700 mb-4">{status.progress_message}</p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${status.progress_percentage}%` }}
                ></div>
              </div>
              <p className="text-center text-sm font-medium text-gray-600 mt-2">
                {status.progress_percentage}% complete
              </p>
            </div>

            {/* Step indicators */}
            <div className="mb-8 space-y-3">
              {steps.map((step, index) => {
                const isCompleted = index < activeStep;
                const isCurrent = index === activeStep;
                const isUpcoming = index > activeStep;

                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isCurrent
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : isCompleted
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                        isCurrent
                          ? 'bg-blue-600 text-white animate-pulse'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span
                      className={`font-medium ${
                        isCurrent
                          ? 'text-blue-900'
                          : isCompleted
                          ? 'text-green-900'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <div className="ml-auto">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Email capture card */}
            {!showEmailCapture && status.progress_percentage > 20 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-gray-700 mb-4">
                  This will take 1-2 minutes. Want to receive the results by email?
                </p>
                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Get Emailed When Ready
                </button>
              </div>
            )}

            {/* Email capture form */}
            {showEmailCapture && (
              <form onSubmit={handleEmailCapture} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Get Results by Email</h3>
                <div className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Send Me Results
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailCapture(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (status?.status === 'FAILED') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* PeakOps Branding Header */}
          <div className="text-center mb-8">
            <a
              href={import.meta.env.VITE_MARKETING_URL || 'http://localhost:5174'}
              className="inline-flex items-center justify-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img src="/logo.png" alt="PeakOps" className="w-10 h-10" />
              <span className="text-2xl font-bold text-gray-900">PeakOps</span>
            </a>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Failed</h2>
            <p className="text-gray-600 mb-6">
              {status.error_message || 'We couldn\'t complete the analysis. Please try again.'}
            </p>
            <button
              onClick={() => {
                setCurrentAnalysisId(null);
                setStatus(null);
                setResults(null);
                navigate('/review-analysis');
              }}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render results (will create this component next)
  if (results) {
    return <ReviewAnalysisResults results={results} />;
  }

  return null;
}

// Results component (simplified version - we can enhance this)
function ReviewAnalysisResults({ results }: { results: AnalysisResults }) {
  const sentiment = results.sentiment_summary;
  const [showShareModal, setShowShareModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string>('');

  // Generate HTML email content
  const generateEmailHTML = (): string => {
    const ratingDist = results.insights?.rating_distribution || {};
    const reviewsAnalyzed = results.reviews_analyzed || 0;

    // Calculate rating distribution percentages
    const getRatingPercentage = (rating: number) => {
      const count = ratingDist[rating] || 0;
      return reviewsAnalyzed > 0 ? ((count / reviewsAnalyzed) * 100).toFixed(0) : '0';
    };

    // Get top 3 operational themes
    const topThemes = results.insights?.operational_themes
      ? Object.entries(results.insights.operational_themes)
          .filter(([_, data]: [string, any]) => data.count > 0)
          .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.count - a.count)
          .slice(0, 3)
      : [];

    // Get top 3 micro-check suggestions sorted by severity
    const topSuggestions = results.micro_check_suggestions
      ?.slice()
      .sort((a: any, b: any) => {
        // Sort by severity: CRITICAL > HIGH > MEDIUM > LOW
        const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        const severityA = severityOrder[a.severity as keyof typeof severityOrder] ?? 999;
        const severityB = severityOrder[b.severity as keyof typeof severityOrder] ?? 999;
        return severityA - severityB;
      })
      .slice(0, 3) || [];

    // Get key issues
    const keyIssues = results.insights?.key_issues?.slice(0, 3) || [];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review Analysis for ${results.business_name}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #2563EB 100%); padding: 40px 20px; text-align: center;">
            <div style="color: #ffffff; font-size: 28px; font-weight: bold; margin-bottom: 10px;">PeakOps</div>
            <div style="color: #E0E7FF; font-size: 16px;">AI-Powered Review Analysis</div>
        </div>

        <!-- Content -->
        <div style="padding: 40px 20px;">
            <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 16px; margin-top: 0;">Review Analysis for ${results.business_name}</h1>

            <div style="color: #4B5563; font-size: 16px; margin-bottom: 24px; line-height: 1.6;">
                Here's the AI-powered analysis of Google Reviews:
            </div>

            <!-- Stats -->
            <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
                <tr>
                    <td style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #E5E7EB; width: 33%;">
                        <div style="font-size: 32px; font-weight: bold; color: #2563EB; margin-bottom: 4px;">${results.google_rating || 'N/A'}⭐</div>
                        <div style="font-size: 14px; color: #6B7280;">Google Rating</div>
                    </td>
                    <td style="width: 2%;"></td>
                    <td style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #E5E7EB; width: 33%;">
                        <div style="font-size: 32px; font-weight: bold; color: #2563EB; margin-bottom: 4px;">${reviewsAnalyzed}</div>
                        <div style="font-size: 14px; color: #6B7280;">Reviews Analyzed</div>
                    </td>
                    <td style="width: 2%;"></td>
                    <td style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #E5E7EB; width: 33%;">
                        <div style="font-size: 32px; font-weight: bold; color: #2563EB; margin-bottom: 4px;">${topThemes.length}</div>
                        <div style="font-size: 14px; color: #6B7280;">Key Issues Found</div>
                    </td>
                </tr>
            </table>

            ${keyIssues.length > 0 ? `
            <!-- Key Priority Issues -->
            <div style="margin: 32px 0; background: linear-gradient(to right, #FFF7ED, #FEE2E2); border: 2px solid #FDBA74; border-radius: 8px; padding: 20px;">
                <div style="font-size: 20px; font-weight: bold; color: #1F2937; margin-bottom: 8px;">⚠️ Top Priority Issues</div>
                <div style="color: #6B7280; font-size: 14px; margin-bottom: 16px;">AI-identified issues from customer feedback:</div>
                ${keyIssues.map((issue: any) => {
                  const severityColor = issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? '#EF4444' : issue.severity === 'MEDIUM' ? '#F59E0B' : '#9CA3AF';
                  const severityBg = issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? '#FEE2E2' : issue.severity === 'MEDIUM' ? '#FEF3C7' : '#F3F4F6';
                  const severityText = issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? '#991B1B' : issue.severity === 'MEDIUM' ? '#92400E' : '#4B5563';

                  return `
                <div style="background-color: #FFFFFF; border-left: 4px solid ${severityColor}; padding: 16px; margin-bottom: 12px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div style="font-weight: bold; color: #1F2937; font-size: 16px;">${issue.theme}</div>
                        <div style="display: flex; gap: 8px;">
                            <span style="background-color: ${severityBg}; color: ${severityText}; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700;">${issue.severity}</span>
                            <span style="background-color: #DBEAFE; color: #1E40AF; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700;">${issue.mentions} mentions</span>
                        </div>
                    </div>
                    <div style="color: #4B5563; font-size: 14px; line-height: 1.5;">${issue.summary}</div>
                    ${issue.examples && issue.examples.length > 0 ? `
                    <div style="margin-top: 12px;">
                        ${issue.examples.slice(0, 1).map((ex: any) => `
                        <div style="background-color: #F9FAFB; padding: 12px; border-left: 2px solid #D1D5DB; border-radius: 4px;">
                            <div style="color: #F59E0B; font-size: 12px; margin-bottom: 4px;">${'⭐'.repeat(ex.rating)} (${ex.rating}/5)</div>
                            <div style="color: #6B7280; font-size: 13px; font-style: italic;">"${ex.snippet}"</div>
                        </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                  `;
                }).join('')}

                <!-- One-line CTA -->
                <div style="margin-top: 16px; padding: 16px; background-color: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #374151;">
                        <span style="margin-right: 8px;">👇</span>
                        <strong>These issues automatically generate daily checks</strong> in your PeakOps plan.
                    </p>
                </div>
            </div>
            ` : ''}

            ${topThemes.length > 0 ? `
            <!-- Key Topics & Sentiment -->
            <div style="margin: 32px 0;">
                <div style="font-size: 20px; font-weight: bold; color: #1F2937; margin-bottom: 16px;">🔍 Key Topics & Sentiment</div>
                ${topThemes.map(([theme, data]: [string, any]) => {
                  const totalCount = data.count || 0;
                  const positiveCount = data.positive_count || 0;
                  const positivePercent = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0;

                  // Determine sentiment label and colors
                  let sentimentLabel = '';
                  let sentimentColor = '';
                  let barColor = '';
                  if (positivePercent >= 90) {
                    sentimentLabel = 'Excellent';
                    sentimentColor = '#15803D';
                    barColor = '#10B981';
                  } else if (positivePercent >= 50) {
                    sentimentLabel = 'Mostly Positive';
                    sentimentColor = '#A16207';
                    barColor = '#F59E0B';
                  } else {
                    sentimentLabel = 'Needs Attention';
                    sentimentColor = '#991B1B';
                    barColor = '#EF4444';
                  }

                  return `
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <div style="width: 150px; flex-shrink: 0;">
                        <span style="font-size: 14px; font-weight: 500; color: #374151; text-transform: capitalize;">
                            ${theme.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background-color: #E5E7EB; border-radius: 9999px; height: 24px; overflow: hidden;">
                            <div style="height: 100%; background-color: ${barColor}; width: ${positivePercent}%; display: flex; align-items: center; padding: 0 8px;">
                                <span style="color: white; font-size: 11px; font-weight: 600;">${positivePercent >= 15 ? positivePercent + '%' : ''}</span>
                            </div>
                        </div>
                        <span style="font-size: 14px; font-weight: 600; color: ${sentimentColor}; width: 130px; text-align: right;">
                            ${sentimentLabel}
                        </span>
                    </div>
                </div>
                  `;
                }).join('')}
            </div>
            ` : ''}


            ${topSuggestions.length > 0 ? `
            <!-- Micro-Check Recommendations -->
            <div style="margin: 32px 0;">
                <div style="font-size: 20px; font-weight: bold; color: #1F2937; margin-bottom: 16px;">💡 Recommended Micro-Checks</div>
                <p style="color: #6B7280; margin-bottom: 16px;">
                    Daily checks to prevent these issues from happening:
                </p>
                ${topSuggestions.map((suggestion: any) => `
                <div style="background-color: #F3F4F6; border-left: 4px solid #10B981; padding: 16px; margin-bottom: 12px; border-radius: 4px;">
                    <div style="font-weight: bold; color: #065F46; margin-bottom: 8px;">${suggestion.title}</div>
                    <div style="color: #047857; font-size: 14px; margin-bottom: 4px;"><strong>Question:</strong> ${suggestion.question}</div>
                    <div style="color: #6B7280; font-size: 13px;"><strong>Success Criteria:</strong> ${suggestion.success_criteria}</div>
                </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- CTA -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="${window.location.origin}/review-analysis" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">View Full Analysis →</a>
            </div>

            <div style="background-color: #EFF6FF; border-radius: 8px; padding: 20px; margin-top: 32px; border: 1px solid #DBEAFE;">
                <h3 style="color: #1E40AF; margin-top: 0; font-size: 18px;">Ready to Fix These Issues?</h3>
                <p style="color: #1E3A8A; margin-bottom: 16px; line-height: 1.6;">
                    Turn these insights into action with PeakOps. We'll deliver daily micro-checks to your team automatically — right when they're on shift.
                </p>
                <ul style="color: #1E3A8A; padding-left: 20px; line-height: 1.8;">
                    <li>Three quick questions delivered daily</li>
                    <li>Automatic reminders and streak tracking</li>
                    <li>Progress dashboard and insights</li>
                    <li>Integrates with 7shifts for seamless delivery</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 32px 20px; text-align: center; color: #6B7280; font-size: 14px;">
            <div style="color: #2563EB; font-weight: bold; font-size: 18px; margin-bottom: 8px;">PeakOps</div>
            <p style="margin: 8px 0;">AI-powered operations management for hospitality businesses</p>
            <p style="margin-top: 16px;">
                <a href="${window.location.origin}" style="color: #2563EB; text-decoration: none;">Visit PeakOps</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  };

  // Copy HTML to clipboard
  const handleCopyHTML = async () => {
    try {
      const htmlContent = generateEmailHTML();
      await navigator.clipboard.writeText(htmlContent);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* PeakOps Branding Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="PeakOps" className="w-12 h-12" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">PeakOps</h2>
                  <span className="text-gray-400">|</span>
                  <span className="text-lg font-semibold text-gray-700">AI-Powered Review Analysis</span>
                </div>
                <p className="text-sm text-gray-600">Turn customer feedback into actionable daily checks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyHTML}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors relative"
                title="Copy HTML for email clients"
              >
                {copyStatus ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {copyStatus}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy HTML
                  </>
                )}
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>

        {/* 1. HEADER SUMMARY - One Glance View */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 px-2">
              {results.business_name}
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm px-2">{results.google_address}</p>
          </div>

          {/* Snapshot Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {results.google_rating && (
              <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-700">
                  {results.google_rating}⭐
                </div>
                <div className="text-xs text-gray-600 mt-1">Google Rating</div>
              </div>
            )}

            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700">
                {results.reviews_analyzed}
              </div>
              <div className="text-xs text-gray-600 mt-1">Reviews Analyzed</div>
            </div>

            {sentiment && (
              <>
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-700">
                    {sentiment.positive_percentage}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Positive</div>
                </div>

                <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-700">
                    {sentiment.negative_percentage}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Negative</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. TOP ISSUES - AI Insights (Top 2-3 most critical) */}
        {results.insights?.key_issues && results.insights.key_issues.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚠️</span>
              <h2 className="text-xl font-bold text-gray-900">
                Top Priority Issues
              </h2>
            </div>
            <div className="space-y-3">
              {results.insights.key_issues.slice(0, 3).map((issue: any, index: number) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg p-4 border-l-4 ${
                    issue.severity === 'HIGH' || issue.severity === 'CRITICAL'
                      ? 'border-red-500'
                      : issue.severity === 'MEDIUM'
                      ? 'border-yellow-500'
                      : 'border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 flex items-center">
                      <span className="mr-2">{issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '⚪'}</span>
                      {issue.theme}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        issue.severity === 'HIGH' || issue.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : issue.severity === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-gray-500 text-xs font-medium">
                        {issue.mentions} mentions
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{issue.summary}</p>
                  {issue.examples && issue.examples.length > 0 && issue.examples[0] && (
                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 italic border-l-2 border-gray-300">
                      <span className="text-yellow-500 mr-1">{'⭐'.repeat(issue.examples[0].rating)}</span>
                      "{issue.examples[0].snippet}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* One-line CTA */}
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <span>👇</span>
                <span><strong>These issues automatically generate daily checks</strong> in your PeakOps plan.</span>
              </p>
            </div>
          </div>
        )}

        {/* 3. THEME BREAKDOWN - Quick Sentiment Bars */}
        {results.insights?.operational_themes && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🔍 Key Topics & Sentiment
            </h2>
            <div className="space-y-3">
              {Object.entries(results.insights.operational_themes)
                .filter(([_, data]: [string, any]) => data.count > 0)
                .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.count - a.count)
                .map(([theme, data]: [string, any]) => {
                  const totalCount = data.count || 0;
                  const positiveCount = data.positive_count || 0;

                  // Calculate percentage positive
                  const positivePercent = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0;

                  // Determine sentiment label
                  let sentimentLabel = '';
                  let sentimentColor = '';
                  let barColor = '';
                  if (positivePercent >= 90) {
                    sentimentLabel = 'Excellent';
                    sentimentColor = 'text-green-700';
                    barColor = 'bg-green-500';
                  } else if (positivePercent >= 50) {
                    sentimentLabel = 'Mostly Positive';
                    sentimentColor = 'text-yellow-700';
                    barColor = 'bg-yellow-500';
                  } else {
                    sentimentLabel = 'Needs Attention';
                    sentimentColor = 'text-red-700';
                    barColor = 'bg-red-500';
                  }

                  return (
                    <div key={theme} className="flex items-center gap-3">
                      <div className="w-32 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {theme.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full flex items-center justify-start px-2 text-xs font-medium text-white transition-all ${barColor}`}
                            style={{ width: `${positivePercent}%` }}
                          >
                            {positivePercent >= 15 && `${positivePercent}%`}
                          </div>
                        </div>
                        <span className={`text-sm font-semibold w-32 text-right ${sentimentColor}`}>
                          {sentimentLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 4. EXAMPLE REVIEWS - Representative Quotes (Minimal) */}
        {results.insights && (
          (results.insights.negative_reviews?.filter((r: any) => r.text && r.text.trim()).length > 0) ||
          (results.insights.positive_reviews?.filter((r: any) => r.text && r.text.trim()).length > 0)
        ) && (
          <CustomerVoicesSection
            negativeReviews={results.insights.negative_reviews?.filter((r: any) => r.text && r.text.trim()) || []}
            positiveReviews={results.insights.positive_reviews?.filter((r: any) => r.text && r.text.trim()) || []}
          />
        )}

        {/* 5. RECOMMENDED MICRO-CHECKS - Tied to Top Issues */}
        {results.micro_check_suggestions && results.micro_check_suggestions.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>✅</span>
              Recommended Actions
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              Daily micro-checks designed to prevent the issues identified above:
            </p>

            <div className="space-y-4">
              {results.micro_check_suggestions
                .slice()
                .sort((a: any, b: any) => {
                  // Sort by severity: CRITICAL > HIGH > MEDIUM > LOW
                  const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
                  const severityA = severityOrder[a.severity as keyof typeof severityOrder] ?? 999;
                  const severityB = severityOrder[b.severity as keyof typeof severityOrder] ?? 999;
                  return severityA - severityB;
                })
                .map((suggestion: any, index: number) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {suggestion.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                      suggestion.severity === 'HIGH' || suggestion.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : suggestion.severity === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.severity}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Question:</span> {suggestion.question}
                  </p>

                  <p className="text-xs text-gray-600 mb-2">
                    <span className="font-medium">Success:</span> {suggestion.success_criteria}
                  </p>

                  <div className="text-xs text-gray-500">
                    📊 Based on {suggestion.mentions_in_reviews} customer reviews
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-xl p-8 text-center text-white mb-8">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Fix These Issues?
          </h2>
          <p className="text-xl mb-6 text-blue-100">
            Start your free trial and implement these micro-checks today
          </p>
          <button
            onClick={() => window.location.href = '/trial-signup?source=review-analysis'}
            className="bg-white text-blue-600 py-3 px-8 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
          >
            Start Free Trial
          </button>
        </div>

        {/* Footer Branding */}
        <div className="text-center text-gray-600 text-sm">
          <p>Powered by <span className="font-semibold text-blue-600">PeakOps</span></p>
          <p className="mt-2">AI-powered operations management for hospitality businesses</p>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <ShareAnalysisModal
            analysisId={results.id}
            businessName={results.business_name}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// Customer Voices Section Component with Show More
function CustomerVoicesSection({ negativeReviews, positiveReviews }: { negativeReviews: any[]; positiveReviews: any[] }) {
  const [expandedReviews, setExpandedReviews] = useState<{ [key: string]: boolean }>({});

  const toggleReview = (type: string, index: number) => {
    const key = `${type}-${index}`;
    setExpandedReviews(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ReviewCard = ({ review, index, type, bgColor, borderColor }: {
    review: any;
    index: number;
    type: string;
    bgColor: string;
    borderColor: string;
  }) => {
    const key = `${type}-${index}`;
    const isExpanded = expandedReviews[key];

    return (
      <div className={`${bgColor} border-l-3 ${borderColor} p-4 rounded`}>
        <p className={`text-sm text-gray-700 italic leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
          "{review.text}"
        </p>
        {review.text && review.text.length > 150 && (
          <button
            onClick={() => toggleReview(type, index)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        💬 Customer Voices
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Critical Feedback */}
        {negativeReviews.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
              <span className="text-red-500">👎</span>
              Critical ({negativeReviews.length})
            </h3>
            <div className="space-y-3">
              {negativeReviews.slice(0, 2).map((review: any, idx: number) => (
                <ReviewCard
                  key={idx}
                  review={review}
                  index={idx}
                  type="negative"
                  bgColor="bg-red-50"
                  borderColor="border-red-400"
                />
              ))}
            </div>
          </div>
        )}

        {/* Positive Feedback */}
        {positiveReviews.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
              <span className="text-green-500">👍</span>
              Positive ({positiveReviews.length})
            </h3>
            <div className="space-y-3">
              {positiveReviews.slice(0, 2).map((review: any, idx: number) => (
                <ReviewCard
                  key={idx}
                  review={review}
                  index={idx}
                  type="positive"
                  bgColor="bg-green-50"
                  borderColor="border-green-400"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Share Modal Component
function ShareAnalysisModal({ analysisId, businessName, onClose }: { analysisId: string; businessName: string; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const shareUrl = `${window.location.origin}/review-analysis/${analysisId}`;

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      await insightsAPI.shareAnalysis(analysisId, {
        recipient_email: email,
        recipient_name: name,
        sender_message: message,
      });

      setSent(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to send email. Please try again.');
      setSending(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Share Analysis</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Share the review analysis for <span className="font-semibold">{businessName}</span>
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <svg className="w-12 h-12 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-800 font-semibold">Email sent successfully!</p>
          </div>
        ) : (
          <>
            {/* Copy Link */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSendEmail}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="colleague@restaurant.com"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Check out this review analysis..."
                />
              </div>

              {error && (
                <div className="mb-4 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

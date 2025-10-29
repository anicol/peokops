import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { insightsAPI } from '@/services/api';
import LocationTypeahead from '@/components/LocationTypeahead';
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
      const response = await insightsAPI.startAnalysis({
        business_name: businessName,
        location: location,
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
          {/* Header with link to marketing site */}
          <div className="text-center mb-6">
            <a
              href={import.meta.env.VITE_MARKETING_URL || 'http://localhost:5174'}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to PeakOps
            </a>
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
                  Start typing to search for your business. Location will auto-fill when selected.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (City, State) *
                </label>
                <LocationTypeahead
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g., Toledo, OH"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  <strong>Required for chains with multiple locations.</strong> Helps us find the correct business.
                </p>
              </div>

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* PeakOps Branding Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white rounded-lg px-4 py-2 font-bold text-xl">
                PeakOps
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI-Powered Review Analysis</h2>
                <p className="text-sm text-gray-600">Turn customer feedback into actionable daily checks</p>
              </div>
            </div>
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

        {/* Business Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {results.business_name}
          </h1>
          <p className="text-gray-600">{results.google_address}</p>
          {results.google_rating && (
            <div className="mt-4 inline-flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
              <span className="text-2xl font-bold text-yellow-800">
                {results.google_rating}
              </span>
              <span className="text-yellow-800">⭐</span>
              <span className="text-sm text-gray-600">
                ({results.total_reviews_found} reviews)
              </span>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {results.reviews_analyzed}
            </div>
            <div className="text-gray-600">Reviews Analyzed</div>
            {results.review_timeframe && (
              <div className="text-sm text-gray-500 mt-1">
                {results.review_timeframe}
              </div>
            )}
          </div>

          {sentiment && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {sentiment.positive_percentage}%
                </div>
                <div className="text-gray-600">Positive Reviews</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {sentiment.negative_percentage}%
                </div>
                <div className="text-gray-600">Negative Reviews</div>
              </div>
            </>
          )}
        </div>

        {/* Trend Chart - only show if we have multiple time periods */}
        {results.insights?.trend_data &&
         results.insights.trend_data.series &&
         results.insights.trend_data.series.length > 1 &&
         results.insights.trend_data.total_periods >= 2 && (
          <ReviewTrendChart trendData={results.insights.trend_data} />
        )}

        {/* Star Rating Breakdown */}
        {results.insights?.rating_distribution && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ⭐ Rating Distribution
            </h2>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = results.insights.rating_distribution[rating] || 0;
                const reviewsAnalyzed = results.reviews_analyzed || 0;
                const percentage = reviewsAnalyzed > 0
                  ? (count / reviewsAnalyzed * 100).toFixed(1)
                  : '0';
                return (
                  <div key={rating} className="flex items-center gap-4">
                    <div className="w-20 flex items-center gap-1">
                      <span className="font-semibold">{rating}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-6 rounded-full transition-all ${
                            rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-semibold">{count}</span>
                      <span className="text-gray-500 text-sm ml-2">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {results.insights?.operational_themes && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🔍 Topics Mentioned in Reviews
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(results.insights.operational_themes)
                .filter(([_, data]: [string, any]) => data.count > 0)
                .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.count - a.count)
                .map(([theme, data]: [string, any]) => (
                  <div key={theme} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {theme.replace(/_/g, ' ')}
                      </h3>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {data.count} mentions
                      </span>
                    </div>
                    {data.examples && data.examples[0] && (
                      <p className="text-sm text-gray-600 italic">
                        "{data.examples[0].snippet}"
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Micro-Check Recommendations */}
        {results.micro_check_suggestions && results.micro_check_suggestions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Recommended Micro-Checks
            </h2>
            <p className="text-gray-600 mb-6">
              Daily checks to prevent these issues from happening
            </p>

            <div className="space-y-6">
              {results.micro_check_suggestions.map((suggestion: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {suggestion.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      suggestion.severity === 'HIGH' || suggestion.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : suggestion.severity === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.severity}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-2">
                    <strong>Question:</strong> {suggestion.question}
                  </p>

                  <p className="text-gray-600 text-sm mb-3">
                    <strong>Success Criteria:</strong> {suggestion.success_criteria}
                  </p>

                  <div className="text-sm text-gray-500">
                    Based on {suggestion.mentions_in_reviews} customer reviews
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

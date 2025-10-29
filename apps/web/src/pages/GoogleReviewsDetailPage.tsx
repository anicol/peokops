import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Star,
  RefreshCw,
  Unlink,
  MapPin,
  Calendar,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
interface GoogleReviewsConfig {
  id: string;
  is_configured: boolean;
  is_active: boolean;
  last_sync_at: string | null;
  location_count?: number;
  review_count?: number;
  unread_review_count?: number;
  auto_sync_enabled: boolean;
  sync_frequency_hours: number;
}

interface GoogleLocation {
  id: string;
  google_location_id: string;
  google_location_name: string;
  address: string;
  phone?: string;
  website?: string;
  average_rating?: number;
  total_review_count: number;
  is_active: boolean;
  last_sync_at?: string;
  review_count: number;
  unread_review_count: number;
}

interface GoogleReview {
  id: string;
  google_review_id: string;
  location: string;
  reviewer_name: string;
  reviewer_profile_photo_url?: string;
  rating: number;
  review_text: string;
  review_reply?: string;
  review_created_at: string;
  review_updated_at?: string;
  reply_created_at?: string;
  source: 'oauth' | 'scraped';
  is_verified: boolean;
  read_at?: string;
  flagged: boolean;
  analysis?: {
    topics: string[];
    sentiment_score: number;
    actionable_issues: string[];
    suggested_category: string;
    confidence: number;
  };
}

// API Functions
const googleReviewsAPI = {
  getStatus: async (): Promise<GoogleReviewsConfig> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/google-reviews/status/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  getOAuthUrl: async (): Promise<{ oauth_url: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/google-reviews/oauth-url/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to get OAuth URL');
    return response.json();
  },

  handleOAuthCallback: async (code: string) => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/google-reviews/oauth-callback/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error('OAuth callback failed');
    return response.json();
  },

  sync: async (locationId?: string) => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/google-reviews/sync/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ location_id: locationId }),
    });
    if (!response.ok) throw new Error('Sync failed');
    return response.json();
  },

  disconnect: async () => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/google-reviews/disconnect/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Disconnect failed');
    return response.json();
  },

  getLocations: async (): Promise<GoogleLocation[]> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/google-reviews/locations/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch locations');
    return response.json();
  },

  getReviews: async (params?: { location_id?: string; min_rating?: number; limit?: number }): Promise<GoogleReview[]> => {
    const queryParams = new URLSearchParams();
    if (params?.location_id) queryParams.append('location_id', params.location_id);
    if (params?.min_rating) queryParams.append('min_rating', params.min_rating.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/integrations/google-reviews/reviews/?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      }
    );
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  },
};

export default function GoogleReviewsDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();

  // Track processed OAuth codes to prevent duplicate submissions
  const processedCodeRef = useRef<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');

    // Only process if we have a code and haven't processed this exact code before
    if (code && code !== processedCodeRef.current) {
      processedCodeRef.current = code;
      setOauthProcessing(true);

      googleReviewsAPI
        .handleOAuthCallback(code)
        .then(() => {
          setSuccess('Google Business Profile connected successfully!');
          queryClient.invalidateQueries('google-reviews-status');
          queryClient.invalidateQueries('google-reviews-locations');
          // Clean up URL
          window.history.replaceState({}, '', '/integrations/google-reviews');
        })
        .catch((err) => {
          setError(`OAuth failed: ${err.message}`);
        })
        .finally(() => {
          setOauthProcessing(false);
        });
    }
  }, [searchParams, queryClient]);

  // Queries
  const { data: config, isLoading } = useQuery<GoogleReviewsConfig>(
    'google-reviews-status',
    googleReviewsAPI.getStatus,
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: locations } = useQuery<GoogleLocation[]>(
    'google-reviews-locations',
    googleReviewsAPI.getLocations,
    {
      enabled: config?.is_configured,
    }
  );

  const { data: reviews } = useQuery<GoogleReview[]>(
    ['google-reviews', selectedLocation],
    () => googleReviewsAPI.getReviews({ location_id: selectedLocation, limit: 10 }),
    {
      enabled: config?.is_configured,
    }
  );

  // Mutations
  const syncMutation = useMutation(
    (locationId?: string) => googleReviewsAPI.sync(locationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('google-reviews-status');
        queryClient.invalidateQueries('google-reviews-locations');
        queryClient.invalidateQueries('google-reviews');
        setSuccess('Sync completed successfully!');
        setError(null);
        setSyncing(false);
      },
      onError: (err: Error) => {
        setError(`Sync failed: ${err.message}`);
        setSyncing(false);
      },
    }
  );

  const disconnectMutation = useMutation(googleReviewsAPI.disconnect, {
    onSuccess: () => {
      queryClient.invalidateQueries('google-reviews-status');
      setSuccess('Google Reviews integration disconnected');
      setError(null);
    },
    onError: (err: Error) => {
      setError(`Disconnect failed: ${err.message}`);
    },
  });

  const handleConnect = async () => {
    try {
      const { oauth_url } = await googleReviewsAPI.getOAuthUrl();
      window.location.href = oauth_url;
    } catch (err: any) {
      setError(`Failed to start OAuth: ${err.message}`);
    }
  };

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate(selectedLocation);
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Google Reviews? This will stop syncing reviews.')) {
      disconnectMutation.mutate();
    }
  };

  if (isLoading || oauthProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {oauthProcessing ? 'Connecting to Google Business Profile...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/integrations')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Integrations
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Google Reviews Integration</h1>
              <p className="mt-2 text-gray-600">
                Monitor customer feedback and generate micro-checks from review insights
              </p>
            </div>
            {config?.is_configured && config.is_active && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <CheckCircle className="w-5 h-5" />
                Connected
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-4 mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Google Business Profile</h2>
                <p className="text-blue-100">Sync and analyze customer reviews</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {!config?.is_configured || !config.is_active ? (
              // Not Connected State
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Connect Your Google Business Profile
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Automatically sync reviews from your Google Business locations and generate actionable
                  micro-checks based on customer feedback patterns.
                </p>
                <button
                  onClick={handleConnect}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Connect with Google
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  You'll be redirected to Google to authorize access to your Business Profile
                </p>
              </div>
            ) : (
              // Connected State
              <div className="space-y-8">
                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-gray-900">{config.location_count || 0}</div>
                    <div className="text-sm text-gray-600">Locations</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-gray-900">{config.review_count || 0}</div>
                    <div className="text-sm text-gray-600">Total Reviews</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-amber-600">{config.unread_review_count || 0}</div>
                    <div className="text-sm text-gray-600">Unread Reviews</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Last Synced</div>
                    <div className="text-sm font-medium text-gray-900">
                      {config.last_sync_at
                        ? new Date(config.last_sync_at).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pb-6 border-b border-gray-200">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </button>
                </div>

                {/* Locations */}
                {locations && locations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Locations</h3>
                    <div className="space-y-3">
                      {locations.map((location) => (
                        <div
                          key={location.id}
                          onClick={() => setSelectedLocation(location.id)}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedLocation === location.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{location.google_location_name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <MapPin className="w-4 h-4" />
                                {location.address}
                              </div>
                              {location.average_rating && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                  <span className="text-sm font-medium">{location.average_rating.toFixed(1)}</span>
                                  <span className="text-sm text-gray-600">
                                    ({location.total_review_count} reviews)
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {location.review_count} synced
                              </div>
                              {location.unread_review_count > 0 && (
                                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                                  {location.unread_review_count} unread
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Reviews */}
                {reviews && reviews.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-900">{review.reviewer_name}</div>
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? 'text-yellow-500 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(review.review_created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm">{review.review_text}</p>
                          {review.analysis && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="font-medium">Topics:</span>
                                {review.analysis.topics.slice(0, 3).map((topic, i) => (
                                  <span key={i} className="bg-gray-100 px-2 py-1 rounded">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

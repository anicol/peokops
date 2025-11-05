import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Star,
  ChevronRight,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
interface SevenShiftsStatus {
  is_configured: boolean;
  is_active?: boolean;
  employee_count?: number;
  upcoming_shifts_count?: number;
  last_sync_at?: string;
}

interface GoogleReviewsStatus {
  is_configured: boolean;
  is_active?: boolean;
  location_count?: number;
  review_count?: number;
  unread_review_count?: number;
  last_sync_at?: string;
}

interface YelpReviewsStatus {
  is_configured: boolean;
  location_count?: number;
  review_count?: number;
  unread_review_count?: number;
  source?: string;
  message?: string;
}

// API Functions
const integrationsAPI = {
  getSevenShiftsStatus: async (): Promise<SevenShiftsStatus> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/status/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch 7shifts status');
    return response.json();
  },

  getGoogleReviewsStatus: async (): Promise<GoogleReviewsStatus> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/google-reviews/status/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch Google Reviews status');
    return response.json();
  },

  getYelpReviewsStatus: async (): Promise<YelpReviewsStatus> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/yelp-reviews/status/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch Yelp Reviews status');
    return response.json();
  },
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Queries
  const { data: sevenShiftsStatus, isLoading: isLoading7Shifts } = useQuery<SevenShiftsStatus>(
    '7shifts-status',
    integrationsAPI.getSevenShiftsStatus,
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: googleReviewsStatus, isLoading: isLoadingGoogleReviews } = useQuery<GoogleReviewsStatus>(
    'google-reviews-status',
    integrationsAPI.getGoogleReviewsStatus,
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: yelpReviewsStatus, isLoading: isLoadingYelpReviews } = useQuery<YelpReviewsStatus>(
    'yelp-reviews-status',
    integrationsAPI.getYelpReviewsStatus,
    {
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading7Shifts || isLoadingGoogleReviews || isLoadingYelpReviews) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-2 text-gray-600">
            Connect your tools to automate workflows and sync data across your operations.
          </p>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 7shifts Integration Card */}
          <div
            onClick={() => navigate('/integrations/7shifts')}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">7shifts</h2>
                      <p className="text-indigo-100 text-sm">Employee Scheduling</p>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              {sevenShiftsStatus?.is_configured && sevenShiftsStatus.is_active ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {sevenShiftsStatus.employee_count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Employees</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {sevenShiftsStatus.upcoming_shifts_count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Upcoming Shifts</div>
                    </div>
                  </div>
                  {sevenShiftsStatus.last_sync_at && (
                    <div className="text-xs text-gray-500">
                      Last synced: {new Date(sevenShiftsStatus.last_sync_at).toLocaleString()}
                    </div>
                  )}
                  <div className="pt-2">
                    <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center group">
                      Manage Integration
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Not Connected</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sync employees and shift schedules to send micro-checks only during working hours.
                  </p>
                  <div className="pt-2">
                    <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center group">
                      Connect 7shifts
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Google Reviews Integration Card */}
          <div
            onClick={() => navigate('/integrations/google-reviews')}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                      <Star className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Google Reviews</h2>
                      <p className="text-blue-100 text-sm">Customer Feedback</p>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              {googleReviewsStatus?.is_configured && googleReviewsStatus.is_active ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {googleReviewsStatus.location_count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Locations</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {googleReviewsStatus.review_count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Reviews</div>
                    </div>
                  </div>
                  {googleReviewsStatus.unread_review_count! > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-800">
                        {googleReviewsStatus.unread_review_count} unread review{googleReviewsStatus.unread_review_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {googleReviewsStatus.last_sync_at && (
                    <div className="text-xs text-gray-500">
                      Last synced: {new Date(googleReviewsStatus.last_sync_at).toLocaleString()}
                    </div>
                  )}
                  <div className="pt-2">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center group">
                      Manage Integration
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Not Connected</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Monitor Google reviews and automatically generate micro-checks based on customer feedback.
                  </p>
                  <div className="pt-2">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center group">
                      Connect Google Reviews
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Yelp Reviews Integration Card */}
          <div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer group opacity-75"
            title="Yelp integration - Coming soon"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Yelp Reviews</h2>
                      <p className="text-red-100 text-sm">Customer Feedback</p>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              {yelpReviewsStatus?.is_configured ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Configured</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {yelpReviewsStatus.location_count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Locations</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {yelpReviewsStatus.review_count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Reviews</div>
                    </div>
                  </div>
                  {yelpReviewsStatus.unread_review_count && yelpReviewsStatus.unread_review_count > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-800">
                        {yelpReviewsStatus.unread_review_count} unread review{yelpReviewsStatus.unread_review_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Source: {yelpReviewsStatus.source || 'Scraping'}
                  </div>
                  <div className="pt-2">
                    <div className="text-red-600 text-sm font-medium flex items-center">
                      View Yelp Reviews
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Not Configured</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Monitor Yelp reviews and automatically generate micro-checks based on customer feedback.
                  </p>
                  <div className="pt-2">
                    <div className="text-gray-400 text-sm font-medium">
                      Coming Soon
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">About Integrations</h3>
              <p className="text-sm text-blue-800">
                Integrations help automate your workflows by connecting PeakOps with the tools you already use.
                Click on any integration card to configure settings, view sync status, and manage your connected data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

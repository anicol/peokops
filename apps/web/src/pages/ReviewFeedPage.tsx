import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { googleReviewsAPI } from '../services/api';
import { Star, Filter, RefreshCw, AlertCircle } from 'lucide-react';

interface Review {
  id: string;
  google_review_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  review_created_at: string;
  location: {
    id: string;
    google_location_name: string;
    store: {
      id: number;
      name: string;
    };
  };
  source: string;
  is_verified: boolean;
  analysis?: {
    topics: string[];
    sentiment_score: number;
    actionable_issues: string[];
  };
}

export default function ReviewFeedPage() {
  const [filters, setFilters] = useState({
    min_rating: undefined as number | undefined,
    max_rating: undefined as number | undefined,
    unread_only: false,
  });

  // Fetch reviews
  const { data: reviews, isLoading, error, refetch } = useQuery<Review[]>(
    ['reviews', filters],
    () => googleReviewsAPI.listReviews({
      ...filters,
      limit: 100,
    }),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Fetch locations for filtering
  const { data: locations } = useQuery(
    'google-locations',
    () => googleReviewsAPI.listLocations()
  );

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentLabel = (score?: number) => {
    if (!score) return 'Neutral';
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">Error loading reviews. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Guest Reviews</h1>
            <p className="text-sm text-gray-600 mt-1">
              All guest feedback in one place
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Rating Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Show Rating
            </label>
            <select
              value={filters.min_rating || 'all'}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all') {
                  handleFilterChange('min_rating', undefined);
                  handleFilterChange('max_rating', undefined);
                } else if (value === 'negative') {
                  handleFilterChange('min_rating', undefined);
                  handleFilterChange('max_rating', 3);
                } else if (value === 'positive') {
                  handleFilterChange('min_rating', 4);
                  handleFilterChange('max_rating', undefined);
                }
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Ratings</option>
              <option value="negative">Negative (1-3 stars)</option>
              <option value="positive">Positive (4-5 stars)</option>
            </select>
          </div>

          {/* Unread Only */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filters.unread_only}
                onChange={(e) => handleFilterChange('unread_only', e.target.checked)}
                className="rounded"
              />
              <span>Unread only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading reviews...</span>
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center">
                      {getRatingStars(review.rating)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {review.reviewer_name || 'Anonymous'}
                    </span>
                    {review.is_verified && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{review.location?.store?.name || 'Unknown Store'}</span>
                    <span>•</span>
                    <span>
                      {new Date(review.review_created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="uppercase">{review.source}</span>
                  </div>
                </div>

                {/* Sentiment Badge */}
                {review.analysis && (
                  <div className={`text-xs font-medium ${getSentimentColor(review.analysis.sentiment_score)}`}>
                    {getSentimentLabel(review.analysis.sentiment_score)}
                  </div>
                )}
              </div>

              {/* Review Text */}
              <p className="text-gray-700 mb-4 leading-relaxed">
                {review.review_text}
              </p>

              {/* AI Analysis Tags */}
              {review.analysis && review.analysis.topics && review.analysis.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {review.analysis.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {/* Actionable Issues */}
              {review.analysis && review.analysis.actionable_issues && review.analysis.actionable_issues.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Actionable Issues:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {review.analysis.actionable_issues.map((issue, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <Star className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews found</h3>
          <p className="text-gray-600">
            {filters.unread_only || filters.min_rating || filters.max_rating
              ? 'Try adjusting your filters'
              : 'Reviews will appear here once they are synced'}
          </p>
        </div>
      )}
    </div>
  );
}

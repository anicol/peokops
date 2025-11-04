import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { googleReviewsAPI } from '../services/api';
import { Star, Filter, RefreshCw, AlertCircle, MessageSquare, Sparkles, Send, Save, TrendingUp, Clock } from 'lucide-react';

interface Review {
  id: string;
  google_review_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  review_reply?: string;
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
  response?: {
    id: string;
    response_text: string;
    status: 'DRAFT' | 'PUBLISHED' | 'FAILED';
    created_by_name?: string;
    created_at: string;
    published_at?: string;
    was_ai_suggested: boolean;
    error_message?: string;
  };
}

export default function ReviewFeedPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    min_rating: undefined as number | undefined,
    max_rating: undefined as number | undefined,
    unread_only: false,
  });

  // Reply state management
  const [replyState, setReplyState] = useState<{
    [reviewId: string]: {
      isOpen: boolean;
      text: string;
      tone: 'professional' | 'friendly' | 'apologetic';
      isLoadingSuggestion: boolean;
    };
  }>({});

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

  // Fetch response metrics (Phase 2)
  const { data: metrics } = useQuery(
    'response-metrics',
    () => googleReviewsAPI.getResponseMetrics(),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
    }
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

  // Reply mutations
  const createReplyMutation = useMutation(
    ({ reviewId, data }: { reviewId: string; data: any }) =>
      googleReviewsAPI.createReply(reviewId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reviews']);
      },
    }
  );

  const suggestReplyMutation = useMutation(
    ({ reviewId, tone }: { reviewId: string; tone: 'professional' | 'friendly' | 'apologetic' }) =>
      googleReviewsAPI.suggestReply(reviewId, tone)
  );

  // Reply handlers
  const toggleReplyForm = (reviewId: string) => {
    setReplyState(prev => ({
      ...prev,
      [reviewId]: {
        isOpen: !prev[reviewId]?.isOpen,
        text: prev[reviewId]?.text || '',
        tone: prev[reviewId]?.tone || 'professional',
        isLoadingSuggestion: false,
      },
    }));
  };

  const updateReplyText = (reviewId: string, text: string) => {
    setReplyState(prev => ({
      ...prev,
      [reviewId]: {
        ...prev[reviewId],
        text,
      },
    }));
  };

  const updateReplyTone = (reviewId: string, tone: 'professional' | 'friendly' | 'apologetic') => {
    setReplyState(prev => ({
      ...prev,
      [reviewId]: {
        ...prev[reviewId],
        tone,
      },
    }));
  };

  const handleGetAISuggestion = async (reviewId: string) => {
    const state = replyState[reviewId];
    if (!state) return;

    setReplyState(prev => ({
      ...prev,
      [reviewId]: { ...prev[reviewId], isLoadingSuggestion: true },
    }));

    try {
      const response = await suggestReplyMutation.mutateAsync({
        reviewId,
        tone: state.tone,
      });

      updateReplyText(reviewId, response.suggested_response);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    } finally {
      setReplyState(prev => ({
        ...prev,
        [reviewId]: { ...prev[reviewId], isLoadingSuggestion: false },
      }));
    }
  };

  const handleSaveReply = async (reviewId: string, asDraft: boolean) => {
    const state = replyState[reviewId];
    if (!state?.text.trim()) return;

    try {
      await createReplyMutation.mutateAsync({
        reviewId,
        data: {
          response_text: state.text,
          save_as_draft: asDraft,
          was_ai_suggested: false,
          ai_suggestion_tone: state.tone,
        },
      });

      // Close reply form on success
      setReplyState(prev => ({
        ...prev,
        [reviewId]: {
          ...prev[reviewId],
          isOpen: false,
          text: '',
        },
      }));
    } catch (error) {
      console.error('Failed to save reply:', error);
    }
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

      {/* Response Metrics Dashboard (Phase 2) */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Response Rate Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Response Rate</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metrics.response_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">
              {metrics.reviews_with_responses} of {metrics.total_reviews} reviews responded
            </p>
          </div>

          {/* Average Response Time Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Avg Response Time</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metrics.avg_response_time_hours !== null
                ? `${Math.round(metrics.avg_response_time_hours)}h`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-gray-500">
              Time to first response
            </p>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Recent Activity</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metrics.recent_responses_30d}
            </div>
            <p className="text-xs text-gray-500">
              Responses in last 30 days
            </p>
          </div>
        </div>
      )}

      {/* Response Rate by Rating */}
      {metrics && Object.keys(metrics.response_by_rating).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Response Rate by Star Rating</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const data = metrics.response_by_rating[rating];
              if (!data || data.total === 0) return null;

              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium text-gray-700">{rating} Star</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${data.rate}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 w-24">
                    {data.rate.toFixed(1)}% ({data.with_response}/{data.total})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

              {/* Existing Reply (if published) */}
              {review.review_reply && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-blue-900 mb-1">
                        Your Response
                      </div>
                      <p className="text-sm text-blue-800">{review.review_reply}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Response Management (Phase 2) */}
              {review.response && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className={`flex items-start gap-3 p-4 rounded-lg ${
                    review.response.status === 'PUBLISHED' ? 'bg-green-50' :
                    review.response.status === 'DRAFT' ? 'bg-gray-50' :
                    'bg-red-50'
                  }`}>
                    <MessageSquare className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      review.response.status === 'PUBLISHED' ? 'text-green-600' :
                      review.response.status === 'DRAFT' ? 'text-gray-600' :
                      'text-red-600'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${
                            review.response.status === 'PUBLISHED' ? 'text-green-900' :
                            review.response.status === 'DRAFT' ? 'text-gray-900' :
                            'text-red-900'
                          }`}>
                            {review.response.status === 'PUBLISHED' ? 'Published Response' :
                             review.response.status === 'DRAFT' ? 'Draft Response' :
                             'Failed to Publish'}
                          </span>
                          {review.response.was_ai_suggested && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI Assisted
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {review.response.created_by_name || 'System'}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        review.response.status === 'PUBLISHED' ? 'text-green-800' :
                        review.response.status === 'DRAFT' ? 'text-gray-800' :
                        'text-red-800'
                      }`}>
                        {review.response.response_text}
                      </p>
                      {review.response.error_message && (
                        <p className="text-xs text-red-600 mt-2">
                          Error: {review.response.error_message}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        {review.response.status === 'PUBLISHED' && review.response.published_at ? (
                          `Published ${new Date(review.response.published_at).toLocaleDateString()}`
                        ) : (
                          `Created ${new Date(review.response.created_at).toLocaleDateString()}`
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reply Action Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                {!replyState[review.id]?.isOpen && !review.response && (
                  <button
                    onClick={() => toggleReplyForm(review.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Reply to Review
                  </button>
                )}

                {/* Reply Form */}
                {replyState[review.id]?.isOpen && (
                  <div className="space-y-3">
                    {/* Tone Selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Response Tone
                      </label>
                      <div className="flex gap-2">
                        {['professional', 'friendly', 'apologetic'].map((tone) => (
                          <button
                            key={tone}
                            onClick={() => updateReplyTone(review.id, tone as any)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              replyState[review.id]?.tone === tone
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {tone.charAt(0).toUpperCase() + tone.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Suggestion Button */}
                    <button
                      onClick={() => handleGetAISuggestion(review.id)}
                      disabled={replyState[review.id]?.isLoadingSuggestion}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={`h-4 w-4 ${replyState[review.id]?.isLoadingSuggestion ? 'animate-spin' : ''}`} />
                      {replyState[review.id]?.isLoadingSuggestion ? 'Generating...' : 'Get AI Suggestion'}
                    </button>

                    {/* Text Area */}
                    <textarea
                      value={replyState[review.id]?.text || ''}
                      onChange={(e) => updateReplyText(review.id, e.target.value)}
                      placeholder="Write your response..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleReplyForm(review.id)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveReply(review.id, true)}
                          disabled={!replyState[review.id]?.text.trim() || createReplyMutation.isLoading}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          Save Draft
                        </button>
                        <button
                          onClick={() => handleSaveReply(review.id, false)}
                          disabled={!replyState[review.id]?.text.trim() || createReplyMutation.isLoading}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {createReplyMutation.isLoading ? 'Publishing...' : 'Publish Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

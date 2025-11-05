import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Award,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { googleReviewsAPI } from '@/services/api';

// Types
interface TopicTrend {
  id: string;
  topic: string;
  category: string;
  overall_sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  trend_direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'NEW';
  trend_velocity: number;
  current_mentions: number;
  previous_mentions: number;
  percent_change: number | null;
  last_updated: string;
  location_name?: string;
}

interface InsightsSummary {
  top_issues: TopicTrend[];
  improving_areas: TopicTrend[];
  top_praise: TopicTrend[];
  new_topics: TopicTrend[];
  sentiment_breakdown: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    positive_percent: number;
    neutral_percent: number;
    negative_percent: number;
  };
}

export default function GoogleReviewsInsightsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('location_id') || undefined;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<TopicTrend | null>(null);

  // Fetch insights summary
  const { data: insights, isLoading, error, refetch } = useQuery<InsightsSummary>(
    ['google-reviews-insights', locationId],
    () => googleReviewsAPI.getInsights(locationId),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Manual insights generation
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      await googleReviewsAPI.generateInsights(locationId);
      await refetch();
    } catch (err) {
      console.error('Failed to generate insights:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trend direction icon
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'INCREASING':
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      case 'DECREASING':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      case 'STABLE':
        return <Minus className="h-5 w-5 text-gray-400" />;
      case 'NEW':
        return <Sparkles className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  // Sentiment badge
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <ThumbsUp className="h-3 w-3 mr-1" />
            Positive
          </span>
        );
      case 'NEGATIVE':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ThumbsDown className="h-3 w-3 mr-1" />
            Negative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Minus className="h-3 w-3 mr-1" />
            Neutral
          </span>
        );
    }
  };

  // Get unique categories
  const categories = ['all', ...new Set([
    ...(insights?.top_issues.map(t => t.category) || []),
    ...(insights?.top_praise.map(t => t.category) || []),
    ...(insights?.improving_areas.map(t => t.category) || []),
    ...(insights?.new_topics.map(t => t.category) || []),
  ])];

  // Filter trends by category
  const filterByCategory = (trends: TopicTrend[]) => {
    if (selectedCategory === 'all') return trends;
    return trends.filter(t => t.category === selectedCategory);
  };

  // Render topic card
  const renderTopicCard = (trend: TopicTrend) => (
    <div
      key={trend.id}
      className="flex items-start justify-between py-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors px-2 -mx-2 rounded"
      onClick={() => setSelectedTopic(trend)}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {getTrendIcon(trend.trend_direction)}
          <h4 className="text-sm font-medium text-gray-900">{trend.topic}</h4>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-gray-500">{trend.category}</span>
          {getSentimentBadge(trend.overall_sentiment)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold text-gray-900">{trend.current_mentions}</div>
        <div className="text-xs text-gray-500">mentions</div>
        {trend.percent_change !== null && (
          <div
            className={`text-xs font-medium ${
              trend.percent_change > 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {trend.percent_change > 0 ? '+' : ''}
            {trend.percent_change.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Insights</h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const { sentiment_breakdown } = insights;

  // Prepare chart data
  const sentimentData = [
    { name: 'Positive', value: sentiment_breakdown.positive, color: '#10b981' },
    { name: 'Neutral', value: sentiment_breakdown.neutral, color: '#6b7280' },
    { name: 'Negative', value: sentiment_breakdown.negative, color: '#ef4444' },
  ];

  // Prepare top topics data for bar chart
  const topTopicsData = [
    ...insights.top_issues.slice(0, 5).map(t => ({
      topic: t.topic.length > 20 ? t.topic.substring(0, 20) + '...' : t.topic,
      mentions: t.current_mentions,
      type: 'Issue',
      color: '#ef4444'
    })),
    ...insights.top_praise.slice(0, 5).map(t => ({
      topic: t.topic.length > 20 ? t.topic.substring(0, 20) + '...' : t.topic,
      mentions: t.current_mentions,
      type: 'Praise',
      color: '#10b981'
    })),
  ].sort((a, b) => b.mentions - a.mentions).slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Review Insights</h1>
                <p className="text-sm text-gray-600 mt-1">Trending topics and sentiment analysis</p>
              </div>
            </div>
            <button
              onClick={handleGenerateInsights}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Refresh Insights'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sentiment Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{sentiment_breakdown.total}</div>
              <div className="text-sm text-gray-600 mt-1">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{sentiment_breakdown.positive}</div>
              <div className="text-sm text-gray-600 mt-1">Positive</div>
              <div className="text-xs text-gray-500 mt-1">
                {sentiment_breakdown.positive_percent.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{sentiment_breakdown.neutral}</div>
              <div className="text-sm text-gray-600 mt-1">Neutral</div>
              <div className="text-xs text-gray-500 mt-1">
                {sentiment_breakdown.neutral_percent.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{sentiment_breakdown.negative}</div>
              <div className="text-sm text-gray-600 mt-1">Negative</div>
              <div className="text-xs text-gray-500 mt-1">
                {sentiment_breakdown.negative_percent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
              {sentiment_breakdown.positive_percent > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${sentiment_breakdown.positive_percent}%` }}
                />
              )}
              {sentiment_breakdown.neutral_percent > 0 && (
                <div
                  className="bg-gray-400 h-full"
                  style={{ width: `${sentiment_breakdown.neutral_percent}%` }}
                />
              )}
              {sentiment_breakdown.negative_percent > 0 && (
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${sentiment_breakdown.negative_percent}%` }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter by category:</span>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Sentiment Pie Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Sentiment Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Topics Bar Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Top Mentioned Topics
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topTopicsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="topic" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="mentions" radius={[0, 8, 8, 0]}>
                  {topTopicsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Issues */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Top Issues</h2>
            </div>
            {filterByCategory(insights.top_issues).length > 0 ? (
              <div className="space-y-0">
                {filterByCategory(insights.top_issues).map(renderTopicCard)}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No trending issues detected</p>
            )}
          </div>

          {/* Top Praise */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">Top Praise</h2>
            </div>
            {filterByCategory(insights.top_praise).length > 0 ? (
              <div className="space-y-0">
                {filterByCategory(insights.top_praise).map(renderTopicCard)}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No praise themes detected</p>
            )}
          </div>

          {/* Improving Areas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">Improving Areas</h2>
            </div>
            {filterByCategory(insights.improving_areas).length > 0 ? (
              <div className="space-y-0">
                {filterByCategory(insights.improving_areas).map(renderTopicCard)}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No improving trends detected</p>
            )}
          </div>

          {/* New Topics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">New Topics</h2>
            </div>
            {filterByCategory(insights.new_topics).length > 0 ? (
              <div className="space-y-0">
                {filterByCategory(insights.new_topics).map(renderTopicCard)}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No new topics detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Topic Detail Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTopic.topic}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{selectedTopic.category}</span>
                    {getSentimentBadge(selectedTopic.overall_sentiment)}
                    {getTrendIcon(selectedTopic.trend_direction)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Current Period</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedTopic.current_mentions}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">mentions</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Previous Period</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedTopic.previous_mentions}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">mentions</div>
                  </div>
                  {selectedTopic.percent_change !== null && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Change</div>
                      <div className={`text-2xl font-bold mt-1 ${
                        selectedTopic.percent_change > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {selectedTopic.percent_change > 0 ? '+' : ''}
                        {selectedTopic.percent_change.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Velocity</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedTopic.trend_velocity > 0 ? '+' : ''}
                      {selectedTopic.trend_velocity}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">per week</div>
                  </div>
                </div>

                {/* Trend Direction Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-900 font-medium mb-2">
                    {getTrendIcon(selectedTopic.trend_direction)}
                    <span>
                      {selectedTopic.trend_direction === 'INCREASING' && 'Mentions are increasing'}
                      {selectedTopic.trend_direction === 'DECREASING' && 'Mentions are decreasing'}
                      {selectedTopic.trend_direction === 'STABLE' && 'Mentions are stable'}
                      {selectedTopic.trend_direction === 'NEW' && 'New topic detected'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-800">
                    {selectedTopic.overall_sentiment === 'NEGATIVE' && selectedTopic.trend_direction === 'INCREASING' &&
                      'This is a growing concern that may require attention.'}
                    {selectedTopic.overall_sentiment === 'NEGATIVE' && selectedTopic.trend_direction === 'DECREASING' &&
                      'Complaints about this topic are decreasing - your improvements are working!'}
                    {selectedTopic.overall_sentiment === 'POSITIVE' && selectedTopic.trend_direction === 'INCREASING' &&
                      'Customers are increasingly praising this aspect of your business!'}
                    {selectedTopic.overall_sentiment === 'POSITIVE' && selectedTopic.trend_direction === 'STABLE' &&
                      'This is a consistent strength of your business.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

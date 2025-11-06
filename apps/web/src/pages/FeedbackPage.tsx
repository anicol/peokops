import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Star, TrendingUp, TrendingDown, Minus, X, Plus, Filter, MessageSquare, Users, ThumbsUp, Sparkles, Target, FileText, Share2, Eye, AlertCircle } from 'lucide-react';
import { feedbackAPI } from '@/api/feedback';

type TimeRange = '7' | '14' | '30';
type SourceType = 'google' | 'yelp' | 'employee';
type TrendDirection = 'up' | 'down' | 'stable';
type Severity = 'high' | 'medium' | 'low';

interface Theme {
  id: string;
  name: string;
  trend: TrendDirection;
  severity: Severity;
  volume: number;
  sentiment_percent: number;
  delta_percent: number;
  ai_summary: string;
  linked_templates: string[];
  top_topics?: string[];
  is_focused?: boolean;
  focus_week?: number;
  focus_pass_rate?: number;
}

interface Evidence {
  id: string;
  source: SourceType;
  timestamp: string;
  store?: string;
  quote: string;
  full_text: string;
  theme: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  author?: string;
  rating?: number;
}

interface SentimentData {
  percent?: number;
  rating?: number;
  delta: number;
  trend: TrendDirection;
  count: number;
  weekly_data: Array<{
    day: string;
    percent?: number;
    rating?: number;
    label: string;
  }>;
  breakdown: any;
}

const FeedbackPage = () => {
  const [days, setDays] = useState<TimeRange>('7');
  const [selectedSources, setSelectedSources] = useState<SourceType[]>(['google', 'employee']);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<string[]>([]);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [focusTheme, setFocusTheme] = useState<Theme | null>(null);

  const queryClient = useQueryClient();

  // Fetch feedback data
  const { data, isLoading, error } = useQuery(
    ['feedback', days, selectedSources.join(',')],
    () => feedbackAPI.getOverview({
      days: parseInt(days),
      sources: selectedSources.join(',')
    }),
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create focus period mutation
  const createFocusMutation = useMutation(
    (params: { theme_id: string; duration_weeks: number; frequency: string; templates: string[] }) =>
      feedbackAPI.createFocusPeriod(params),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['feedback']);
        setShowFocusModal(false);
        setFocusTheme(null);
      },
    }
  );

  const toggleSource = (source: SourceType) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const handleAddToFocus = (theme: Theme) => {
    setFocusTheme(theme);
    setShowFocusModal(true);
  };

  const confirmFocus = () => {
    if (!focusTheme) return;

    createFocusMutation.mutate({
      theme_id: focusTheme.id,
      duration_weeks: 2,
      frequency: 'daily',
      templates: focusTheme.linked_templates,
    });
  };

  const getTrendIcon = (trend: TrendDirection) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (trend: TrendDirection, isPositive: boolean = false) => {
    if (trend === 'up') return isPositive ? 'text-green-600' : 'text-red-600';
    if (trend === 'down') return isPositive ? 'text-red-600' : 'text-green-600';
    return 'text-gray-600';
  };

  const getSeverityColor = (severity: Severity) => {
    if (severity === 'high') return 'bg-red-100 text-red-700 border-red-300';
    if (severity === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'positive') return 'bg-green-100 text-green-700 border-green-300';
    if (sentiment === 'neutral') return 'bg-gray-100 text-gray-700 border-gray-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getSourceIcon = (source: SourceType) => {
    switch (source) {
      case 'google':
        return '⭐';
      case 'yelp':
        return '🔴';
      case 'employee':
        return '👥';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Feedback</h2>
          <p className="text-gray-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const guestSentiment: SentimentData = data?.guest_sentiment || {
    percent: 0,
    delta: 0,
    trend: 'stable',
    count: 0,
    weekly_data: [],
    breakdown: { positive: 0, neutral: 0, negative: 0 }
  };

  const employeeSentiment: SentimentData | null = data?.employee_sentiment;
  const themes: Theme[] = data?.themes || [];
  const evidenceFeed: Evidence[] = data?.evidence || [];
  const quietWins = data?.quiet_wins || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
              <p className="text-gray-600 mt-1">What guests and your team are saying</p>
            </div>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <FileText className="w-4 h-4 mr-2" />
              Weekly Digest
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={days}
              onChange={(e) => setDays(e.target.value as TimeRange)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Sources:</span>
              {(['google', 'yelp', 'employee'] as SourceType[]).map((source) => (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border-2 ${
                    selectedSources.includes(source)
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
                >
                  {getSourceIcon(source)} {source === 'employee' ? 'Pulse' : source.charAt(0).toUpperCase() + source.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sentiment Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Guest Sentiment */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border-2 border-green-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-bold text-gray-900">Guest Sentiment</span>
                  </div>
                  <p className="text-sm text-gray-600">Positive feedback rate</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline space-x-3 mb-2">
                  <span className="text-5xl font-black text-green-600">{guestSentiment.percent}%</span>
                  <div className="flex flex-col">
                    <span className={`flex items-center text-sm font-bold ${getTrendColor(guestSentiment.trend, true)}`}>
                      {getTrendIcon(guestSentiment.trend)}
                      {guestSentiment.trend === 'stable' ? 'flat' : `${guestSentiment.delta > 0 ? '+' : ''}${guestSentiment.delta}%`} vs last period
                    </span>
                    <span className="text-xs text-gray-600 mt-1">
                      {guestSentiment.breakdown.positive} of {guestSentiment.count} comments
                    </span>
                  </div>
                </div>
              </div>

              {guestSentiment.weekly_data.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">This Period's Trend</div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-end justify-between h-24 space-x-2">
                      {guestSentiment.weekly_data.map((dataPoint, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all hover:from-green-600 hover:to-green-500 cursor-pointer"
                            style={{ height: `${dataPoint.percent}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                              {dataPoint.label}: {dataPoint.percent}%
                            </div>
                          </div>
                          <div className="text-xs font-bold text-gray-600 mt-2">{dataPoint.day}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Breakdown</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-700">Positive</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{guestSentiment.breakdown.positive}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-700">Neutral</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{guestSentiment.breakdown.neutral}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-700">Negative</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{guestSentiment.breakdown.negative}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Pulse */}
            {employeeSentiment && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-lg font-bold text-gray-900">Employee Pulse</span>
                    </div>
                    <p className="text-sm text-gray-600">Team morale & satisfaction</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline space-x-3 mb-2">
                    <span className="text-5xl font-black text-blue-600">{employeeSentiment.rating}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-gray-400">/5</span>
                        <span className={`flex items-center text-sm font-bold ml-2 ${getTrendColor(employeeSentiment.trend)}`}>
                          {getTrendIcon(employeeSentiment.trend)}
                          {employeeSentiment.trend === 'stable' ? 'flat' : `${employeeSentiment.delta > 0 ? '+' : ''}${employeeSentiment.delta}`} vs last period
                        </span>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">
                        {employeeSentiment.count} team responses
                      </span>
                    </div>
                  </div>
                </div>

                {employeeSentiment.weekly_data.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">This Period's Trend</div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-end justify-between h-24 space-x-2">
                        {employeeSentiment.weekly_data.map((dataPoint, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center group relative">
                            <div
                              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer"
                              style={{ height: `${((dataPoint.rating || 0) / 5) * 100}%` }}
                            >
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                                {dataPoint.label}: {dataPoint.rating}/5
                              </div>
                            </div>
                            <div className="text-xs font-bold text-gray-600 mt-2">{dataPoint.day}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Mood Distribution</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">😊</span>
                        <span className="text-sm font-medium text-gray-700">Very Happy</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{employeeSentiment.breakdown.very_happy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">🙂</span>
                        <span className="text-sm font-medium text-gray-700">Happy</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{employeeSentiment.breakdown.happy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">😐</span>
                        <span className="text-sm font-medium text-gray-700">Neutral</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{employeeSentiment.breakdown.neutral}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">😟</span>
                        <span className="text-sm font-medium text-gray-700">Unhappy</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{employeeSentiment.breakdown.unhappy}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Themes */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Top Themes</h2>
            <span className="text-sm text-gray-600">Ranked by impact</span>
          </div>

          {themes.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-6">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(selectedTheme?.id === theme.id ? null : theme)}
                    className={`flex items-center px-4 py-2 rounded-full border-2 font-medium transition-all ${
                      selectedTheme?.id === theme.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-900 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {theme.name}
                    <span className={`ml-2 ${selectedTheme?.id === theme.id ? 'text-white' : getTrendColor(theme.trend)}`}>
                      {getTrendIcon(theme.trend)}
                    </span>
                    {theme.is_focused && (
                      <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full"></span>
                    )}
                  </button>
                ))}
              </div>

              {selectedTheme && (
                <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border-2 border-blue-200 p-6 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-2xl font-bold text-gray-900">{selectedTheme.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getSeverityColor(selectedTheme.severity)}`}>
                          {selectedTheme.severity.toUpperCase()}
                        </span>
                        {selectedTheme.is_focused && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold border-2 border-orange-300">
                            IN FOCUS • Week {selectedTheme.focus_week}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Volume</div>
                          <div className="text-2xl font-bold text-gray-900">{selectedTheme.volume}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Sentiment</div>
                          <div className="text-2xl font-bold text-gray-900">{selectedTheme.sentiment_percent}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Change</div>
                          <div className={`text-2xl font-bold ${getTrendColor(selectedTheme.trend)}`}>
                            {selectedTheme.delta_percent > 0 ? '+' : ''}{selectedTheme.delta_percent}%
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                        <div className="flex items-start">
                          <Sparkles className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-gray-900 mb-1">Why it matters</div>
                            <p className="text-gray-800">{selectedTheme.ai_summary}</p>
                          </div>
                        </div>
                      </div>

                      {selectedTheme.is_focused && (
                        <div className="bg-orange-50 rounded-lg p-4 mb-4 border-2 border-orange-200">
                          <div className="flex items-center text-orange-800 font-bold mb-2">
                            <Target className="w-5 h-5 mr-2" />
                            Focus Progress
                          </div>
                          <p className="text-orange-900">
                            Pass rate <span className="font-bold">+{selectedTheme.focus_pass_rate}%</span> since focused
                          </p>
                        </div>
                      )}

                      {selectedTheme.linked_templates.length > 0 && (
                        <div className="mb-4">
                          <div className="text-sm font-bold text-gray-900 mb-2">Linked Check Templates:</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedTheme.linked_templates.map((template, idx) => (
                              <span key={idx} className="px-3 py-1 bg-white text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                                {template}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedTheme(null)}
                      className="ml-4 p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!selectedTheme.is_focused && (
                      <button
                        onClick={() => handleAddToFocus(selectedTheme)}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add to Focus
                      </button>
                    )}
                    <button className="flex items-center px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium">
                      <Eye className="w-4 h-4 mr-2" />
                      See Evidence
                    </button>
                    <button className="flex items-center px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No themes detected in this period</p>
            </div>
          )}
        </div>

        {/* Evidence Feed */}
        {evidenceFeed.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Evidence Feed</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>All themes</span>
              </div>
            </div>

            <div className="space-y-4">
              {evidenceFeed.map((evidence) => (
                <div key={evidence.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getSourceIcon(evidence.source)}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          {evidence.author && (
                            <span className="font-bold text-gray-900">{evidence.author}</span>
                          )}
                          {evidence.rating && (
                            <div className="flex items-center">
                              {Array.from({ length: evidence.rating }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {evidence.timestamp} • {evidence.source}
                          {evidence.store && ` • ${evidence.store}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getSentimentColor(evidence.sentiment)}`}>
                        {evidence.sentiment}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {evidence.theme}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-900 mb-3">
                    {expandedEvidence.includes(evidence.id) ? evidence.full_text : evidence.quote}
                  </p>

                  <div className="flex items-center space-x-3 text-sm">
                    <button
                      onClick={() => {
                        if (expandedEvidence.includes(evidence.id)) {
                          setExpandedEvidence(expandedEvidence.filter(id => id !== evidence.id));
                        } else {
                          setExpandedEvidence([...expandedEvidence, evidence.id]);
                        }
                      }}
                      className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {expandedEvidence.includes(evidence.id) ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiet Wins */}
        {quietWins.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl shadow-lg border-2 border-green-200 p-6 mb-6">
            <div className="flex items-center mb-4">
              <Sparkles className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">What's Going Well</h2>
            </div>

            <div className="space-y-3">
              {quietWins.map((win: any, idx: number) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-start">
                    <ThumbsUp className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-gray-900 mb-1">{win.theme}</div>
                      <p className="text-gray-800">{win.quote}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-600">
          Last updated: {data?.metadata?.end_date ? new Date(data.metadata.end_date).toLocaleString() : 'N/A'}
        </div>
      </div>

      {/* Focus Modal */}
      {showFocusModal && focusTheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add to Focus</h3>
              <button
                onClick={() => setShowFocusModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <div className="font-bold text-gray-900 mb-1">{focusTheme.name}</div>
                <div className="text-sm text-gray-700">
                  We'll surface related checks daily for the next 2 weeks
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">Duration</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option>2 weeks (recommended)</option>
                  <option>1 week</option>
                  <option>3 weeks</option>
                  <option>4 weeks</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">Frequency</label>
                <div className="flex space-x-2">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                    Daily
                  </button>
                  <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                    2x per week
                  </button>
                </div>
              </div>

              {focusTheme.linked_templates.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Templates to use:</label>
                  <div className="space-y-2">
                    {focusTheme.linked_templates.map((template, idx) => (
                      <label key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span className="text-sm font-medium text-gray-900">{template}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowFocusModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmFocus}
                disabled={createFocusMutation.isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg disabled:opacity-50"
              >
                {createFocusMutation.isLoading ? 'Adding...' : 'Confirm Focus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;

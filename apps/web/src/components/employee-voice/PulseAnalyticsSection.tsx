import { useState } from 'react';
import { useQuery } from 'react-query';
import { employeeVoiceAPI, type EmployeeVoicePulse } from '@/services/api';
import { BarChart3, TrendingUp, Users, MessageSquare, Loader2, Calendar, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface PulseAnalyticsSectionProps {
  storeId: number;
  pulses: EmployeeVoicePulse[];
}

export default function PulseAnalyticsSection({ storeId, pulses }: PulseAnalyticsSectionProps) {
  const [selectedPulseId, setSelectedPulseId] = useState<string>(
    pulses.length > 0 ? pulses[0].id : ''
  );
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  // Get responses for selected pulse
  const { data: responses, isLoading: responsesLoading } = useQuery(
    ['employee-voice-responses', selectedPulseId],
    () => employeeVoiceAPI.getResponses(selectedPulseId),
    {
      enabled: !!selectedPulseId,
    }
  );

  // Get insights for selected pulse
  const { data: insights, isLoading: insightsLoading } = useQuery(
    ['employee-voice-insights', selectedPulseId],
    () => employeeVoiceAPI.getPulseInsights(selectedPulseId),
    {
      enabled: !!selectedPulseId,
    }
  );

  const isLoading = responsesLoading || insightsLoading;

  if (pulses.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics available</h3>
        <p className="mt-1 text-sm text-gray-500">Create a pulse survey to start collecting data.</p>
      </div>
    );
  }

  // Use insights data from backend (already aggregated)
  const totalResponses = insights?.total_responses || 0;
  const avgMood = insights?.avg_mood || 0;
  const moodTrend = insights?.mood_trend;
  const confidenceHighPct = insights?.confidence_high_pct || 0;
  const confidenceMediumPct = insights?.confidence_medium_pct || 0;
  const confidenceLowPct = insights?.confidence_low_pct || 0;
  const confidenceTrend = insights?.confidence_trend;
  const topBottlenecks = insights?.top_bottlenecks || [];
  const commentsCount = insights?.comments?.length || 0;

  return (
    <div>
      {/* Pulse Selector */}
      <div className="mb-6">
        <label htmlFor="pulse-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Pulse
        </label>
        <select
          id="pulse-select"
          value={selectedPulseId}
          onChange={(e) => setSelectedPulseId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {pulses.map((pulse) => (
            <option key={pulse.id} value={pulse.id}>
              {pulse.title}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Total Responses</p>
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalResponses}</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Average Mood</p>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {avgMood.toFixed(1)}/5
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {avgMood >= 4 ? '😊 Great' : avgMood >= 3 ? '🙂 Good' : avgMood >= 2 ? '😐 Neutral' : '😕 Needs attention'}
                </p>
                {moodTrend !== null && moodTrend !== undefined && (
                  <div className={`flex items-center text-xs font-medium ${
                    moodTrend > 0 ? 'text-green-600' : moodTrend < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {moodTrend > 0 ? '↑' : moodTrend < 0 ? '↓' : '→'}
                    <span className="ml-1">{Math.abs(moodTrend).toFixed(1)} vs last week</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">High Confidence</p>
                <BarChart3 className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Math.round(confidenceHighPct)}%
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {totalResponses > 0 ? `${totalResponses} total responses` : 'No data'}
                </p>
                {confidenceTrend !== null && confidenceTrend !== undefined && (
                  <div className={`flex items-center text-xs font-medium ${
                    confidenceTrend > 0 ? 'text-green-600' : confidenceTrend < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {confidenceTrend > 0 ? '↑' : confidenceTrend < 0 ? '↓' : '→'}
                    <span className="ml-1">{Math.abs(confidenceTrend).toFixed(1)}% vs last week</span>
                  </div>
                )}
              </div>
            </div>

            <div
              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
              onClick={() => commentsCount > 0 && setShowCommentsModal(true)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Comments</p>
                <MessageSquare className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {commentsCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalResponses > 0
                  ? `${Math.round((commentsCount / totalResponses) * 100)}% with feedback`
                  : 'No data'}
              </p>
              {commentsCount > 0 && (
                <p className="text-xs text-blue-600 font-medium mt-2">
                  Click to view all →
                </p>
              )}
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confidence Distribution</h3>
            {totalResponses === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No responses yet</p>
            ) : (
              <div className="space-y-3">
                {[
                  { level: 'HIGH', label: '✅ Yes, I\'m all set', pct: confidenceHighPct, color: 'bg-green-600' },
                  { level: 'MEDIUM', label: '⚠️ Mostly, a few things missing', pct: confidenceMediumPct, color: 'bg-yellow-600' },
                  { level: 'LOW', label: '❌ No, we\'re short or disorganized', pct: confidenceLowPct, color: 'bg-red-600' },
                ].map((item) => {
                  const count = Math.round((item.pct / 100) * totalResponses);
                  return (
                    <div key={item.level}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {item.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {count} ({Math.round(item.pct)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Bottlenecks */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Bottlenecks</h3>
            {topBottlenecks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No bottlenecks reported yet
              </p>
            ) : (
              <div className="space-y-2">
                {topBottlenecks.map((bottleneck: any, idx: number) => {
                  // Map bottleneck type to emoji
                  const icons: Record<string, string> = {
                    'CLEANLINESS': '🧹',
                    'STAFFING': '🧍',
                    'EQUIPMENT': '⚙️',
                    'TASKS': '📋',
                    'COMMUNICATION': '💬',
                    'GUEST_VOLUME': '🍴',
                  };

                  return (
                    <div
                      key={bottleneck.type}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                        <span className="text-xl">{icons[bottleneck.type] || '📌'}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {bottleneck.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">{Math.round(bottleneck.percentage)}%</span>
                        <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">
                          {bottleneck.count} mentions
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Comments Modal */}
      {showCommentsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowCommentsModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              {/* Header */}
              <div className="bg-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-white" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Employee Comments
                      </h3>
                      <p className="text-sm text-blue-100">
                        {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'} from anonymous responses
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCommentsModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white px-6 py-6 max-h-96 overflow-y-auto">
                {insights?.comments && insights.comments.length > 0 ? (
                  <div className="space-y-4">
                    {insights.comments.map((comment: any, idx: number) => {
                      // Handle both string format (old) and object format (new)
                      let commentText = '';
                      let completedAt = null;

                      if (typeof comment === 'string') {
                        // Old format: plain string
                        commentText = comment;
                      } else if (typeof comment === 'object' && comment !== null) {
                        // New format: object with text and completed_at
                        commentText = comment.text || '';
                        if (comment.completed_at) {
                          try {
                            completedAt = new Date(comment.completed_at);
                          } catch (e) {
                            console.error('Invalid date:', comment.completed_at);
                          }
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500">Anonymous Employee</span>
                                {completedAt && !isNaN(completedAt.getTime()) && (
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDistanceToNow(completedAt, { addSuffix: true })}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{format(completedAt, 'MMM d, yyyy h:mm a')}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-900">{commentText}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No comments yet</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Comments are anonymous and only shown when n ≥ 5 respondents
                  </p>
                  <button
                    onClick={() => setShowCommentsModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

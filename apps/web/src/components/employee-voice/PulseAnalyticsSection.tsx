import { useState } from 'react';
import { useQuery } from 'react-query';
import { employeeVoiceAPI, type EmployeeVoicePulse } from '@/services/api';
import { BarChart3, TrendingUp, Users, MessageSquare, Loader2 } from 'lucide-react';

interface PulseAnalyticsSectionProps {
  storeId: number;
  pulses: EmployeeVoicePulse[];
}

export default function PulseAnalyticsSection({ storeId, pulses }: PulseAnalyticsSectionProps) {
  const [selectedPulseId, setSelectedPulseId] = useState<string>(
    pulses.length > 0 ? pulses[0].id : ''
  );

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
  const confidenceHighPct = insights?.confidence_high_pct || 0;
  const confidenceMediumPct = insights?.confidence_medium_pct || 0;
  const confidenceLowPct = insights?.confidence_low_pct || 0;
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
              <p className="text-xs text-gray-500 mt-1">
                {avgMood >= 4 ? '😊 Great' : avgMood >= 3 ? '🙂 Good' : avgMood >= 2 ? '😐 Neutral' : '😕 Needs attention'}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">High Confidence</p>
                <BarChart3 className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Math.round(confidenceHighPct)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalResponses > 0 ? `${totalResponses} total responses` : 'No data'}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
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
    </div>
  );
}

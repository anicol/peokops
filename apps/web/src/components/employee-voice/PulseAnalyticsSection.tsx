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

  // Calculate stats
  const totalResponses = responses?.length || 0;
  const avgMood = responses?.length
    ? responses.reduce((sum: number, r: any) => sum + r.mood, 0) / responses.length
    : 0;

  const confidenceDistribution = responses?.reduce((acc: any, r: any) => {
    acc[r.confidence] = (acc[r.confidence] || 0) + 1;
    return acc;
  }, {});

  const bottleneckCounts = responses?.reduce((acc: any, r: any) => {
    if (r.bottleneck && r.bottleneck !== 'NONE') {
      acc[r.bottleneck] = (acc[r.bottleneck] || 0) + 1;
    }
    return acc;
  }, {});

  const topBottlenecks = bottleneckCounts
    ? Object.entries(bottleneckCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
    : [];

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
                {confidenceDistribution?.HIGH || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalResponses > 0
                  ? `${Math.round((confidenceDistribution?.HIGH / totalResponses) * 100)}% of responses`
                  : 'No data'}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Comments</p>
                <MessageSquare className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {responses?.filter((r: any) => r.comment && r.comment.trim()).length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalResponses > 0
                  ? `${Math.round(
                      ((responses?.filter((r: any) => r.comment && r.comment.trim()).length || 0) /
                        totalResponses) *
                        100
                    )}% with feedback`
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
                {['HIGH', 'MEDIUM', 'LOW'].map((level) => {
                  const count = confidenceDistribution?.[level] || 0;
                  const percentage = (count / totalResponses) * 100;
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {level === 'HIGH' ? '💪 High' : level === 'MEDIUM' ? '👍 Medium' : '📚 Low'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-full rounded-full ${
                            level === 'HIGH'
                              ? 'bg-green-600'
                              : level === 'MEDIUM'
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${percentage}%` }}
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
                {topBottlenecks.map(([bottleneck, count]: any, idx) => {
                  const percentage = (count / totalResponses) * 100;
                  return (
                    <div
                      key={bottleneck}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {bottleneck.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
                        <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">
                          {count} mentions
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

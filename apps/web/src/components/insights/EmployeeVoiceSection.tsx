import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { VoiceLockedCard } from './shared/VoiceLockedCard';
import { AIInsightCard } from './shared/AIInsightCard';
import { TrendIndicator } from './shared/TrendIndicator';

interface KeyQuestion {
  question: string;
  yes_percentage?: number;
  top_obstacles?: string[];
}

interface MoodStats {
  average: number;
  trend: 'up' | 'down' | 'stable';
}

interface ConfidenceDistribution {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
  percentage: number;
}

interface ConfidenceStats {
  high_percentage: number;
  distribution: ConfidenceDistribution[];
}

interface Bottleneck {
  type: string;
  count: number;
}

interface Bottlenecks {
  top_3: string[];
  all: Bottleneck[];
}

interface EmployeeVoiceSectionProps {
  data: {
    locked: boolean;
    progress?: {
      completed: number;
      required: number;
    };
    message?: string;
    available?: boolean;
    engagement_score?: number;
    engagement_delta?: number;
    response_count?: number;
    mood_stats?: MoodStats;
    confidence_stats?: ConfidenceStats;
    bottlenecks?: Bottlenecks;
    key_questions?: KeyQuestion[];
    ai_insight?: string;
  };
  onUnlockClick?: () => void;
}

export function EmployeeVoiceSection({ data, onUnlockClick }: EmployeeVoiceSectionProps) {
  // Locked state
  if (data.locked) {
    return (
      <section className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Employee Voice</h2>
        </div>

        <VoiceLockedCard
          title="Unlock Employee Voice"
          message={data.message || 'Complete 5 one-minute pulses to unlock Employee Voice'}
          progress={data.progress ? {
            current: (data.progress as any).completed || (data.progress as any).current || 0,
            required: data.progress.required
          } : undefined}
          ctaText="Start Pulse Survey"
          onCtaClick={onUnlockClick || (() => {})}
        />
      </section>
    );
  }

  // Helper to get mood emoji
  const getMoodEmoji = (average: number): string => {
    if (average >= 4.5) return '😊';
    if (average >= 3.5) return '🙂';
    if (average >= 2.5) return '😐';
    if (average >= 1.5) return '😕';
    return '😞';
  };

  // Helper to get confidence color
  const getConfidenceColor = (level: string): string => {
    if (level === 'HIGH') return 'bg-green-600';
    if (level === 'MEDIUM') return 'bg-yellow-600';
    return 'bg-red-600';
  };

  // Unlocked state
  return (
    <section className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Employee Voice</h2>
        {data.response_count && (
          <span className="text-xs text-gray-500">
            ({data.response_count} responses in last 30 days)
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Engagement Score */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Team Engagement</p>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">{data.engagement_score?.toFixed(1)}</span>
            <span className="text-sm text-gray-500">/10</span>
            {data.engagement_delta !== undefined && data.engagement_delta !== 0 && (
              <TrendIndicator value={data.engagement_delta} size="sm" />
            )}
          </div>
        </div>

        {/* Mood Trends */}
        {data.mood_stats && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Average Mood</h3>
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{getMoodEmoji(data.mood_stats.average)}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl font-bold text-gray-900">
                    {data.mood_stats.average.toFixed(1)}/5
                  </span>
                  {data.mood_stats.trend === 'up' && (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  )}
                  {data.mood_stats.trend === 'down' && (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  {data.mood_stats.trend === 'stable' && (
                    <Minus className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${(data.mood_stats.average / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confidence Distribution */}
        {data.confidence_stats && data.confidence_stats.distribution && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Team Confidence</h3>
            <div className="space-y-2">
              {data.confidence_stats.distribution.map((dist) => (
                <div key={dist.level} className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-gray-600 w-20">
                    {dist.level === 'HIGH' ? '💪 High' : dist.level === 'MEDIUM' ? '👍 Medium' : '📚 Low'}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${getConfidenceColor(dist.level)}`}
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                    {dist.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Bottlenecks */}
        {data.bottlenecks && data.bottlenecks.top_3 && data.bottlenecks.top_3.length > 0 && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Bottlenecks</h3>
            <div className="space-y-2">
              {data.bottlenecks.all.map((bottleneck, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-900">{bottleneck.type}</span>
                  <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded">
                    {bottleneck.count} mentions
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Questions (for backwards compatibility) */}
        {data.key_questions && data.key_questions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Insights</h3>
            <div className="space-y-4">
              {data.key_questions.map((q, idx) => (
                <div key={idx} className="bg-gray-50 rounded-md p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">{q.question}</p>
                  {q.yes_percentage !== undefined && (
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${q.yes_percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{q.yes_percentage}%</span>
                    </div>
                  )}
                  {q.top_obstacles && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {q.top_obstacles.map((obstacle, oidx) => (
                        <span
                          key={oidx}
                          className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded"
                        >
                          {obstacle}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insight */}
        {data.ai_insight && <AIInsightCard insight={data.ai_insight} variant="highlight" />}
      </div>
    </section>
  );
}

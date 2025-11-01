import { Activity } from 'lucide-react';
import { VoiceLockedCard } from './shared/VoiceLockedCard';
import { AIInsightCard } from './shared/AIInsightCard';
import { TrendIndicator } from './shared/TrendIndicator';

interface KeyQuestion {
  question: string;
  yes_percentage?: number;
  top_obstacles?: string[];
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

  // Unlocked state
  return (
    <section className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Employee Voice</h2>
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

        {/* Key Questions */}
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

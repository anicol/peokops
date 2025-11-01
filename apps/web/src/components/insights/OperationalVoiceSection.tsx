import { ClipboardCheck, Flame } from 'lucide-react';
import { AIInsightCard } from './shared/AIInsightCard';

interface TopCategory {
  name: string;
  improvement: number;
}

interface OperationalVoiceSectionProps {
  data: {
    locked: boolean;
    available: boolean;
    completion_rate?: number;
    avg_score?: number;
    streak?: number;
    top_categories?: TopCategory[];
    ai_summary?: string;
  };
}

export function OperationalVoiceSection({ data }: OperationalVoiceSectionProps) {
  if (!data.available) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <ClipboardCheck className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Operational Voice</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completion Rate</p>
            <span className="text-2xl font-bold text-gray-900">{data.completion_rate}%</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Average Score</p>
            <span className="text-2xl font-bold text-gray-900">{data.avg_score}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Streak</p>
            <div className="flex items-center space-x-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900">{data.streak}</span>
              <span className="text-sm text-gray-500 mt-1">days</span>
            </div>
          </div>
        </div>

        {/* Top Improving Categories */}
        {data.top_categories && data.top_categories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Improving Areas</h3>
            <div className="space-y-2">
              {data.top_categories.map((category, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                >
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  <span className="text-sm font-semibold text-green-600">+{category.improvement}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {data.ai_summary && <AIInsightCard insight={data.ai_summary} />}
      </div>
    </section>
  );
}

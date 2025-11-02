import { TrendingUp, Link2 } from 'lucide-react';
import { VoiceLockedCard } from './shared/VoiceLockedCard';

interface Correlation {
  metric: string;
  correlated_with: string;
  insight: string;
  evidence: string;
}

interface CrossVoiceTrendsSectionProps {
  unlocked: boolean;
  correlations?: Correlation[];
  onUnlockClick?: () => void;
}

export function CrossVoiceTrendsSection({
  unlocked,
  correlations,
  onUnlockClick,
}: CrossVoiceTrendsSectionProps) {
  // Locked state
  if (!unlocked) {
    return (
      <section className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Cross-Voice Trends</h2>
        </div>

        <VoiceLockedCard
          title="Unlock Cross-Voice Intelligence"
          message="Complete 30 days of micro-checks to see how your operational habits connect to customer and employee feedback"
          ctaText="View Micro-Checks"
          onCtaClick={onUnlockClick || (() => {})}
        />
      </section>
    );
  }

  // Unlocked state
  return (
    <section className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Cross-Voice Trends</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {correlations && correlations.length > 0 ? (
          <div className="space-y-4">
            {correlations.map((correlation, idx) => (
              <div
                key={idx}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3 mb-2">
                  <Link2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      {correlation.metric} → {correlation.correlated_with}
                    </p>
                    <p className="text-sm text-gray-700 mb-2">{correlation.insight}</p>
                    <p className="text-xs text-gray-600 italic">{correlation.evidence}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600 text-center py-4">
            No correlations detected yet. Keep building your data to see patterns emerge.
          </p>
        )}
      </div>
    </section>
  );
}

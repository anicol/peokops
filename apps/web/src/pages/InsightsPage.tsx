import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { insightsAPI } from '@/services/api';
import { InsightsSummaryStrip } from '@/components/insights/InsightsSummaryStrip';
import { CustomerVoiceSection } from '@/components/insights/CustomerVoiceSection';
import { EmployeeVoiceSection } from '@/components/insights/EmployeeVoiceSection';
import { OperationalVoiceSection } from '@/components/insights/OperationalVoiceSection';
import { CrossVoiceTrendsSection } from '@/components/insights/CrossVoiceTrendsSection';
import { Loader2 } from 'lucide-react';

export default function InsightsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isTrialUser = user?.is_trial_user || false;

  // Fetch insights data
  const { data: insights, isLoading, error } = useQuery(
    ['insights', user?.store],
    () => insightsAPI.getSummary(user!.store!),
    {
      enabled: !!user?.store,
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 10000, // Consider data stale after 10 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">Failed to load insights. Please try again.</p>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Summary Strip */}
      <InsightsSummaryStrip
        storeHealth={insights.store_health}
        voices={insights.voices}
        crossVoiceUnlocked={insights.unlock.cross_voice_unlocked}
      />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Customer Voice */}
        <CustomerVoiceSection
          data={insights.voices.customer}
          onGenerateClick={() => navigate('/settings')} // TODO: Navigate to Google linking
        />

        {/* Operational Voice */}
        <OperationalVoiceSection data={insights.voices.operational} />

        {/* Employee Voice - Always show, lock for trial users */}
        <EmployeeVoiceSection
          data={{
            ...insights.voices.employee,
            locked: isTrialUser ? true : insights.voices.employee.locked,
            message: isTrialUser
              ? 'Unlock Employee Voice with PeakOps Pro to capture team sentiment and boost engagement.'
              : insights.voices.employee.message
          }}
          onUnlockClick={() => isTrialUser ? navigate('/checkout') : navigate('/pulse-surveys')}
        />

        {/* Cross-Voice Trends - Always show locked state for trial users */}
        {isTrialUser ? (
          <section className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Cross-Voice Trends</h2>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlock Full 360° Insights</h3>
              <p className="text-sm text-gray-600 mb-4">
                See how your operational habits connect to customer satisfaction and team engagement. Available with PeakOps Pro.
              </p>
              <button
                onClick={() => navigate('/checkout')}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <span className="text-sm font-medium">Upgrade to Pro</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>
        ) : (
          <CrossVoiceTrendsSection
            unlocked={insights.unlock.cross_voice_unlocked}
            correlations={insights.correlations}
            onUnlockClick={() => navigate('/checks')}
          />
        )}

        {/* Last Updated */}
        <div className="text-center text-xs text-gray-500 mt-8">
          Last updated: {new Date(insights.last_updated).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { employeeVoiceAPI, type EmployeeVoicePulse } from '@/services/api';
import {
  Activity,
  Lock,
  Unlock,
  BarChart3,
  HelpCircle,
  Play,
  Pause,
  Calendar
} from 'lucide-react';
import PulseConfigSection from '@/components/employee-voice/PulseConfigSection';
import PausePulseDialog from '@/components/employee-voice/PausePulseDialog';
import PulseAnalyticsSection from '@/components/employee-voice/PulseAnalyticsSection';
import DistributionTab from '@/components/employee-voice/DistributionTab';

type ViewMode = 'analytics' | 'distribution';

export default function PulseSurveysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  // Fetch or create the single pulse for the account
  const { data: pulse, isLoading } = useQuery(
    ['employee-voice-pulse'],
    () => employeeVoiceAPI.getOrCreatePulse(),
    {
      enabled: !!user,
    }
  );

  // Pause mutation
  const pauseMutation = useMutation(
    ({ reason, notes }: { reason: string; notes: string }) =>
      employeeVoiceAPI.pausePulse(pulse!.id, reason, notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-pulse']);
        setShowPauseDialog(false);
      },
    }
  );

  // Resume mutation
  const resumeMutation = useMutation(
    () => employeeVoiceAPI.resumePulse(pulse!.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-pulse']);
      },
    }
  );

  const handleToggleActive = () => {
    if (pulse?.is_active) {
      // Pausing - show dialog for reason
      setShowPauseDialog(true);
    } else {
      // Resuming - no dialog needed
      resumeMutation.mutate();
    }
  };

  const handlePauseConfirm = (reason: string, notes: string) => {
    pauseMutation.mutate({ reason, notes });
  };

  const getStatusBadge = (pulse: EmployeeVoicePulse) => {
    if (pulse.status === 'LOCKED') {
      const progress = pulse.unlock_progress || { current: 0, required: 5 };
      return (
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 cursor-help"
          title={`Collecting responses. Will show results after ${progress.required} submissions (${progress.current}/${progress.required} so far)`}
        >
          <Lock className="w-4 h-4 mr-1" />
          Locked ({progress.current}/{progress.required})
        </span>
      );
    }
    if (pulse.status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
          <Unlock className="w-4 h-4 mr-1" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
        <Activity className="w-4 h-4 mr-1" />
        {pulse.status}
      </span>
    );
  };

  if (isLoading || !pulse) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{pulse.title}</h1>
            <p className="mt-1 text-sm text-gray-600">{pulse.description}</p>

            {/* Status Row */}
            <div className="mt-4 flex items-center flex-wrap gap-3">
              {getStatusBadge(pulse)}

              {/* Active Toggle */}
              <button
                onClick={handleToggleActive}
                disabled={pauseMutation.isLoading || resumeMutation.isLoading}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                  pulse.is_active
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pulse.is_active ? (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Paused {pulse.pause_reason_display && `(${pulse.pause_reason_display})`}
                  </>
                )}
              </button>

              {/* View Questions Button */}
              <button
                onClick={() => setShowQuestionsModal(true)}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100"
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                View Questions
              </button>

              {/* Preview Survey Button */}
              <button
                onClick={() => window.open('/survey/preview', '_blank')}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border-2 border-purple-200 hover:bg-purple-100"
              >
                <Activity className="w-4 h-4 mr-1" />
                Preview Survey
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="mb-6">
        <PulseConfigSection pulse={pulse} defaultExpanded={false} />
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('analytics')}
            className={`${
              viewMode === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setViewMode('distribution')}
            className={`${
              viewMode === 'distribution'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Distribution
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {viewMode === 'analytics' && (
        <PulseAnalyticsSection storeId={user?.store || 0} pulses={[pulse]} />
      )}

      {viewMode === 'distribution' && (
        <DistributionTab pulseId={pulse.id} />
      )}

      {/* Pause Dialog */}
      {showPauseDialog && (
        <PausePulseDialog
          onConfirm={handlePauseConfirm}
          onCancel={() => setShowPauseDialog(false)}
          isLoading={pauseMutation.isLoading}
        />
      )}

      {/* Questions Modal */}
      {showQuestionsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowQuestionsModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="bg-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2" />
                    Survey Questions
                  </h3>
                  <button
                    onClick={() => setShowQuestionsModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white px-6 py-6 space-y-6">
                <p className="text-sm text-gray-600 mb-4">
                  This ultra-lightweight survey takes employees less than 30 seconds to complete. Responses are anonymous and aggregated for privacy.
                </p>

                {/* Question 1: Mood */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">1. How are you feeling today?</h4>
                  <div className="flex items-center space-x-2 text-2xl">
                    <span title="Exhausted">😫</span>
                    <span title="Meh">😐</span>
                    <span title="Good">🙂</span>
                    <span title="Great">😄</span>
                    <span title="On Fire">🔥</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">5-point emoji slider to gauge team mood</p>
                </div>

                {/* Question 2: Confidence */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">2. Do you have what you need to do your job well today?</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <span className="mr-2">❌</span>
                      <span>No, we're short or disorganized</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">⚠️</span>
                      <span>Mostly, a few things missing</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">✅</span>
                      <span>Yes, I'm all set</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Quick readiness check</p>
                </div>

                {/* Question 3: Bottlenecks */}
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">3. What's slowing the team down? (Optional, multi-select)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <span className="mr-2">🧹</span>
                      <span>Cleanliness / Prep setup</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🧍</span>
                      <span>Staffing or scheduling</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">📦</span>
                      <span>Supplies or inventory</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">⚙️</span>
                      <span>Equipment or maintenance</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">📱</span>
                      <span>Tech or systems</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">❓</span>
                      <span>Other</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Identifies operational bottlenecks</p>
                </div>

                {/* Question 4: Comment */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">4. Anything we should fix or celebrate today? (Optional)</h4>
                  <div className="bg-gray-100 rounded p-3 text-sm text-gray-600">
                    80 character free-text comment
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Anonymous feedback (only shown when n ≥ 5)</p>
                </div>

                {/* Privacy Notice */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h5 className="font-semibold text-gray-900 mb-2 text-sm">Privacy Protection</h5>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• All responses are anonymous</li>
                    <li>• Results only shown after 5+ unique respondents</li>
                    <li>• Comments are aggregated and cannot be traced to individuals</li>
                    <li>• Takes less than 30 seconds to complete</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4">
                <button
                  onClick={() => setShowQuestionsModal(false)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

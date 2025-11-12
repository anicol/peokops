import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { employeeVoiceAPI, type EmployeeVoicePulse } from '@/services/api';
import {
  Activity,
  Plus,
  TrendingUp,
  Users,
  Send,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Calendar,
  MessageSquare,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import PulseConfigModal from '@/components/employee-voice/PulseConfigModal';
import InvitationHistorySection from '@/components/employee-voice/InvitationHistorySection';
import PulseAnalyticsSection from '@/components/employee-voice/PulseAnalyticsSection';

type ViewMode = 'pulses' | 'invitations' | 'analytics';

export default function PulseSurveysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('pulses');
  const [selectedPulse, setSelectedPulse] = useState<EmployeeVoicePulse | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  // Fetch pulses for user's account (includes account-wide and store-specific pulses)
  const { data: pulsesData, isLoading } = useQuery(
    ['employee-voice-pulses', user?.account_id],
    () => employeeVoiceAPI.getPulses(),
    {
      enabled: !!user,
    }
  );

  // Ensure pulses is always an array
  const pulses = Array.isArray(pulsesData) ? pulsesData : [];

  // Delete pulse mutation
  const deleteMutation = useMutation(
    (pulseId: string) => employeeVoiceAPI.deletePulse(pulseId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-pulses']);
      },
    }
  );

  // Toggle active status
  const toggleActiveMutation = useMutation(
    (pulse: EmployeeVoicePulse) =>
      employeeVoiceAPI.updatePulse(pulse.id, { is_active: !pulse.is_active }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-pulses']);
      },
    }
  );

  const handleCreatePulse = () => {
    setSelectedPulse(null);
    setIsCreating(true);
    setIsConfigModalOpen(true);
  };

  const handleEditPulse = (pulse: EmployeeVoicePulse) => {
    setSelectedPulse(pulse);
    setIsCreating(false);
    setIsConfigModalOpen(true);
  };

  const handleDeletePulse = async (pulseId: string) => {
    if (confirm('Are you sure you want to delete this pulse? This cannot be undone.')) {
      await deleteMutation.mutateAsync(pulseId);
    }
  };

  const handleToggleActive = async (pulse: EmployeeVoicePulse) => {
    await toggleActiveMutation.mutateAsync(pulse);
  };

  const getStatusBadge = (pulse: EmployeeVoicePulse) => {
    if (pulse.status === 'LOCKED') {
      const progress = pulse.unlock_progress || { current: 0, required: 5 };
      return (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 cursor-help"
          title={`Collecting responses. Will show results after ${progress.required} submissions (${progress.current}/${progress.required} so far)`}
        >
          <Lock className="w-3 h-3 mr-1" />
          Locked
        </span>
      );
    }
    if (pulse.status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Unlock className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Activity className="w-3 h-3 mr-1" />
        {pulse.status}
      </span>
    );
  };

  const getShiftWindowLabel = (window: string) => {
    const labels: Record<string, string> = {
      'OPEN': '🌅 Opening',
      'MID': '☀️ Mid-Day',
      'CLOSE': '🌙 Closing'
    };
    return labels[window] || window;
  };

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Voice</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage pulse surveys, invitations, and team insights
            </p>
          </div>
          <button
            onClick={handleCreatePulse}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Pulse
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('pulses')}
              className={`${
                viewMode === 'pulses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Pulses
              {pulses && <span className="ml-2 text-xs text-gray-500">({pulses.length})</span>}
            </button>
            <button
              onClick={() => setViewMode('invitations')}
              className={`${
                viewMode === 'invitations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Send className="w-4 h-4 mr-2" />
              Invitations
            </button>
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
          </nav>
        </div>
      </div>

      {/* Pulses View */}
      {viewMode === 'pulses' && (
        <div className="space-y-4">
          {!pulses || pulses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pulse surveys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first pulse survey.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleCreatePulse}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Pulse
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pulses.map((pulse) => (
                <div
                  key={pulse.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {pulse.title}
                      </h3>
                      {getStatusBadge(pulse)}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {pulse.description}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      {getShiftWindowLabel(pulse.shift_window)}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="w-4 h-4 mr-2" />
                      Language: {pulse.language.toUpperCase()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditPulse(pulse)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(pulse)}
                        className={`flex-1 inline-flex items-center justify-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md ${
                          pulse.is_active
                            ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                            : 'border-transparent text-white bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {pulse.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeletePulse(pulse.id)}
                        className="inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => setShowQuestionsModal(true)}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <HelpCircle className="w-4 h-4 mr-1" />
                      View Questions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invitations View */}
      {viewMode === 'invitations' && (
        <InvitationHistorySection storeId={user?.store || 0} />
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <PulseAnalyticsSection storeId={user?.store || 0} pulses={pulses || []} />
      )}

      {/* Config Modal */}
      {isConfigModalOpen && (
        <PulseConfigModal
          pulse={selectedPulse}
          isCreating={isCreating}
          onClose={() => {
            setIsConfigModalOpen(false);
            setSelectedPulse(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries(['employee-voice-pulses']);
            setIsConfigModalOpen(false);
            setSelectedPulse(null);
          }}
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
                    <MessageSquare className="w-5 h-5 mr-2" />
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

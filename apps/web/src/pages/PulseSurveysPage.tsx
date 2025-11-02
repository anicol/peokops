import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { employeeVoiceAPI, type EmployeeVoicePulse } from '@/services/api';
import {
  Activity,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Send,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Calendar,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import PulseConfigModal from '@/components/employee-voice/PulseConfigModal';
import AutoFixConfigPanel from '@/components/employee-voice/AutoFixConfigPanel';
import InvitationHistorySection from '@/components/employee-voice/InvitationHistorySection';
import PulseAnalyticsSection from '@/components/employee-voice/PulseAnalyticsSection';

type ViewMode = 'pulses' | 'invitations' | 'analytics' | 'autofix';

export default function PulseSurveysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('pulses');
  const [selectedPulse, setSelectedPulse] = useState<EmployeeVoicePulse | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch pulses for user's store
  const { data: pulsesData, isLoading } = useQuery(
    ['employee-voice-pulses', user?.store],
    () => employeeVoiceAPI.getPulses(user!.store!),
    {
      enabled: !!user?.store,
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
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
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
            <button
              onClick={() => setViewMode('autofix')}
              className={`${
                viewMode === 'autofix'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Auto-Fix
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
                    {pulse.auto_fix_flow_enabled && (
                      <div className="flex items-center text-sm text-blue-600">
                        <Settings className="w-4 h-4 mr-2" />
                        Auto-fix enabled
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
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

      {/* Auto-Fix View */}
      {viewMode === 'autofix' && (
        <AutoFixConfigPanel storeId={user?.store || 0} pulses={pulses || []} />
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
    </div>
  );
}

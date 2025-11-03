import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { employeeVoiceAPI, type EmployeeVoicePulse, type AutoFixFlowConfig } from '@/services/api';
import { Settings, Plus, Trash2, Save, Loader2, AlertCircle } from 'lucide-react';

interface AutoFixConfigPanelProps {
  storeId: number;
  pulses: EmployeeVoicePulse[];
}

export default function AutoFixConfigPanel({ storeId, pulses }: AutoFixConfigPanelProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    pulse: '',
    bottleneck_type: 'EQUIPMENT',
    check_category: 'Cleanliness',
    threshold_mentions: 3,
    threshold_days: 7,
    action_item_template: 'Address {{bottleneck_type}} issues affecting {{check_category}}',
    is_active: true,
  });

  // Get auto-fix configs
  const { data: configs, isLoading } = useQuery(
    ['employee-voice-autofix-configs'],
    () => employeeVoiceAPI.getAutoFixConfigs(),
    {
      enabled: !!storeId,
    }
  );

  // Create mutation
  const createMutation = useMutation(
    (data: Partial<AutoFixFlowConfig>) => employeeVoiceAPI.createAutoFixConfig(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-autofix-configs']);
        setIsCreating(false);
        resetForm();
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    (configId: string) => employeeVoiceAPI.deleteAutoFixConfig(configId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-autofix-configs']);
      },
    }
  );

  // Toggle active mutation
  const toggleMutation = useMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      employeeVoiceAPI.updateAutoFixConfig(id, { is_active: isActive }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-autofix-configs']);
      },
    }
  );

  const resetForm = () => {
    setFormData({
      pulse: pulses.length > 0 ? pulses[0].id : '',
      bottleneck_type: 'EQUIPMENT',
      check_category: 'Cleanliness',
      threshold_mentions: 3,
      threshold_days: 7,
      action_item_template: 'Address {{bottleneck_type}} issues affecting {{check_category}}',
      is_active: true,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
  };

  const handleDelete = async (configId: string) => {
    if (confirm('Are you sure you want to delete this auto-fix config?')) {
      await deleteMutation.mutateAsync(configId);
    }
  };

  const handleToggle = async (config: AutoFixFlowConfig) => {
    await toggleMutation.mutateAsync({
      id: config.id,
      isActive: !config.is_active,
    });
  };

  const bottleneckOptions = [
    { value: 'EQUIPMENT', label: 'Equipment/Tools' },
    { value: 'STAFFING', label: 'Staffing/Scheduling' },
    { value: 'TRAINING', label: 'Training/Knowledge' },
    { value: 'SUPPLIES', label: 'Supplies/Inventory' },
    { value: 'COMMUNICATION', label: 'Communication' },
    { value: 'PROCESSES', label: 'Processes/Procedures' },
  ];

  const checkCategoryOptions = [
    'Cleanliness',
    'Food Safety',
    'Customer Service',
    'Equipment Maintenance',
    'Inventory Management',
    'Staff Training',
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">About Auto-Fix Flow</h3>
            <p className="text-sm text-blue-800">
              Auto-Fix automatically creates ActionItems when employees mention the same bottleneck
              repeatedly. For example: if "Equipment" is mentioned ≥3× in 7 days and correlates with
              "Equipment Maintenance" check failures, an ActionItem is created automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Existing Configs */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Configurations</h3>
        {!configs || configs.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No auto-fix configurations yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => {
              const pulse = pulses.find((p) => p.id === config.pulse);
              return (
                <div
                  key={config.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {config.bottleneck_type.replace('_', ' ')} → {config.check_category}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {config.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{pulse?.title}</p>
                      <p className="text-xs text-gray-500">
                        Threshold: {config.threshold_mentions} mentions in {config.threshold_days}{' '}
                        days
                      </p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        Template: {config.action_item_template}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggle(config)}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          config.is_active
                            ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                        }`}
                      >
                        {config.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create New Config */}
      <div>
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Auto-Fix Config
          </button>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Auto-Fix Configuration</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Pulse Selection */}
              <div>
                <label htmlFor="pulse" className="block text-sm font-medium text-gray-700 mb-1">
                  Pulse Survey *
                </label>
                <select
                  id="pulse"
                  value={formData.pulse}
                  onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a pulse...</option>
                  {pulses.map((pulse) => (
                    <option key={pulse.id} value={pulse.id}>
                      {pulse.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bottleneck Type */}
              <div>
                <label
                  htmlFor="bottleneck_type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Bottleneck Type *
                </label>
                <select
                  id="bottleneck_type"
                  value={formData.bottleneck_type}
                  onChange={(e) => setFormData({ ...formData, bottleneck_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {bottleneckOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Check Category */}
              <div>
                <label
                  htmlFor="check_category"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Related Check Category *
                </label>
                <select
                  id="check_category"
                  value={formData.check_category}
                  onChange={(e) => setFormData({ ...formData, check_category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {checkCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="threshold_mentions"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Mention Threshold *
                  </label>
                  <input
                    type="number"
                    id="threshold_mentions"
                    value={formData.threshold_mentions}
                    onChange={(e) =>
                      setFormData({ ...formData, threshold_mentions: parseInt(e.target.value) })
                    }
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="threshold_days"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Time Window (days) *
                  </label>
                  <input
                    type="number"
                    id="threshold_days"
                    value={formData.threshold_days}
                    onChange={(e) =>
                      setFormData({ ...formData, threshold_days: parseInt(e.target.value) })
                    }
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Item Template */}
              <div>
                <label
                  htmlFor="action_template"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ActionItem Template *
                </label>
                <textarea
                  id="action_template"
                  value={formData.action_item_template}
                  onChange={(e) =>
                    setFormData({ ...formData, action_item_template: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Use {{bottleneck_type}} and {{check_category}} as placeholders"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available variables: {"{{bottleneck_type}}"}, {"{{check_category}}"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Config
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

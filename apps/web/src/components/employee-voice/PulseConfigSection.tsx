import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { employeeVoiceAPI, type EmployeeVoicePulse, type UpdatePulseRequest } from '@/services/api';
import { Save, Loader2, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';

interface PulseConfigSectionProps {
  pulse: EmployeeVoicePulse;
  defaultExpanded?: boolean;
}

export default function PulseConfigSection({ pulse, defaultExpanded = false }: PulseConfigSectionProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: pulse.title,
    description: pulse.description,
    shift_window: pulse.shift_window as 'OPEN' | 'MID' | 'CLOSE',
    delivery_frequency: pulse.delivery_frequency as 'LOW' | 'MEDIUM' | 'HIGH',
    randomization_window_minutes: pulse.randomization_window_minutes,
    consent_text: pulse.consent_text,
    min_respondents_for_display: pulse.min_respondents_for_display,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when pulse changes
  useEffect(() => {
    setFormData({
      title: pulse.title,
      description: pulse.description,
      shift_window: pulse.shift_window as 'OPEN' | 'MID' | 'CLOSE',
      delivery_frequency: pulse.delivery_frequency,
      randomization_window_minutes: pulse.randomization_window_minutes,
      consent_text: pulse.consent_text,
      min_respondents_for_display: pulse.min_respondents_for_display,
    });
  }, [pulse]);

  const updateMutation = useMutation(
    (data: UpdatePulseRequest) => employeeVoiceAPI.updatePulse(pulse.id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employee-voice-pulse']);

        // Show success message
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      },
      onError: (error: any) => {
        if (error.response?.data) {
          setErrors(error.response.data);
        }
      },
    }
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.min_respondents_for_display < 5) {
      newErrors.min_respondents_for_display = 'Minimum must be at least 5 for privacy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await updateMutation.mutateAsync(formData);
  };

  const isSubmitting = updateMutation.isLoading;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500 mr-2" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
        </div>
        <span className="text-sm text-gray-500">
          {isExpanded ? 'Click to collapse' : 'Click to expand settings'}
        </span>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="border-t border-gray-200">
          {/* Success Message */}
          {showSuccess && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800 font-medium">
                  Configuration saved successfully!
                </p>
              </div>
            </div>
          )}

          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Daily Team Pulse"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Quick check-in to capture team sentiment and bottlenecks"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Shift Window */}
            <div>
              <label htmlFor="shift_window" className="block text-sm font-medium text-gray-700 mb-1">
                Shift Window *
              </label>
              <select
                id="shift_window"
                value={formData.shift_window}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shift_window: e.target.value as 'OPEN' | 'MID' | 'CLOSE',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="OPEN">🌅 Opening (Morning shift start)</option>
                <option value="MID">☀️ Mid-Day (Peak hours)</option>
                <option value="CLOSE">🌙 Closing (End of shift)</option>
              </select>
            </div>

            {/* Delivery Frequency */}
            <div>
              <label htmlFor="delivery_frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Frequency *
              </label>
              <select
                id="delivery_frequency"
                value={formData.delivery_frequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delivery_frequency: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="LOW">🔵 Low (1-2 times/week, ~25% daily)</option>
                <option value="MEDIUM">🟡 Medium (2-3 times/week, ~40% daily)</option>
                <option value="HIGH">🔴 High (3-4 times/week, ~55% daily)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Each employee has a random chance to receive a survey each day. This prevents pencil-whipping and survey fatigue.
              </p>
            </div>

            {/* Randomization Window */}
            <div>
              <label htmlFor="randomization_window" className="block text-sm font-medium text-gray-700 mb-1">
                Randomization Window (minutes)
              </label>
              <input
                type="number"
                id="randomization_window"
                value={formData.randomization_window_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    randomization_window_minutes: parseInt(e.target.value) || 60,
                  })
                }
                min="15"
                max="120"
                step="15"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Surveys are sent at random times within the first {formData.randomization_window_minutes} minutes of the shift window.
              </p>
            </div>

            {/* Consent Text */}
            <div>
              <label htmlFor="consent_text" className="block text-sm font-medium text-gray-700 mb-1">
                Consent Text
              </label>
              <textarea
                id="consent_text"
                value={formData.consent_text}
                onChange={(e) => setFormData({ ...formData, consent_text: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Shown on survey page to explain privacy and data usage
              </p>
            </div>

            {/* Min Respondents */}
            <div>
              <label
                htmlFor="min_respondents"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Minimum Respondents for Display
              </label>
              <input
                type="number"
                id="min_respondents"
                value={formData.min_respondents_for_display}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_respondents_for_display: parseInt(e.target.value) || 5,
                  })
                }
                min="5"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.min_respondents_for_display ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.min_respondents_for_display && (
                <p className="mt-1 text-sm text-red-600">{errors.min_respondents_for_display}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Privacy protection: insights require n ≥ 5 unique respondents
              </p>
            </div>

            {/* Last Updated */}
            {pulse.updated_at && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last updated: {new Date(pulse.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

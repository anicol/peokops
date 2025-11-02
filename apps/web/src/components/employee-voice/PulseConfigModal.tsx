import { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { employeeVoiceAPI, type EmployeeVoicePulse, type CreatePulseRequest, type UpdatePulseRequest } from '@/services/api';
import { X, Save, Loader2 } from 'lucide-react';

interface PulseConfigModalProps {
  pulse: EmployeeVoicePulse | null;
  isCreating: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function PulseConfigModal({ pulse, isCreating, onClose, onSave }: PulseConfigModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shift_window: 'OPEN' as 'OPEN' | 'MID' | 'CLOSE',
    language: 'en' as 'en' | 'es' | 'fr',
    consent_text: 'Your responses are anonymous and help improve team operations.',
    auto_fix_flow_enabled: false,
    min_respondents_for_display: 5,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (pulse && !isCreating) {
      setFormData({
        title: pulse.title,
        description: pulse.description,
        shift_window: pulse.shift_window as 'OPEN' | 'MID' | 'CLOSE',
        language: pulse.language as 'en' | 'es' | 'fr',
        consent_text: pulse.consent_text,
        auto_fix_flow_enabled: pulse.auto_fix_flow_enabled,
        min_respondents_for_display: pulse.min_respondents_for_display,
      });
    }
  }, [pulse, isCreating]);

  const createMutation = useMutation(
    (data: CreatePulseRequest) => employeeVoiceAPI.createPulse(data),
    {
      onSuccess: () => {
        onSave();
      },
      onError: (error: any) => {
        if (error.response?.data) {
          setErrors(error.response.data);
        }
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: UpdatePulseRequest }) =>
      employeeVoiceAPI.updatePulse(id, data),
    {
      onSuccess: () => {
        onSave();
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

    if (isCreating) {
      // Add store and account from user when creating
      const createData = {
        ...formData,
        store: user!.store!,
        account: user!.account_id!,
      };
      await createMutation.mutateAsync(createData as any);
    } else if (pulse) {
      await updateMutation.mutateAsync({
        id: pulse.id,
        data: formData,
      });
    }
  };

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {isCreating ? 'Create Pulse Survey' : 'Edit Pulse Survey'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 py-4 space-y-4">
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
                <p className="mt-1 text-xs text-gray-500">
                  Invitations will be sent 1 hour into the selected shift window
                </p>
              </div>

              {/* Language */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                  Language *
                </label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value as 'en' | 'es' | 'fr' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
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

              {/* Auto-Fix Flow */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="auto_fix"
                    type="checkbox"
                    checked={formData.auto_fix_flow_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, auto_fix_flow_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="auto_fix" className="font-medium text-sm text-gray-700">
                    Enable Auto-Fix Flow
                  </label>
                  <p className="text-xs text-gray-500">
                    Automatically create ActionItems when bottlenecks are mentioned ≥3× in 7 days
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
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
                    {isCreating ? 'Create' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

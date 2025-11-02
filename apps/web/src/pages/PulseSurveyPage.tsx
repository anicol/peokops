import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeVoiceAPI, type EmployeeVoicePulse, type SubmitSurveyRequest } from '@/services/api';
import { getDeviceFingerprintString } from '@/utils/deviceFingerprint';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type SurveyStep = 'loading' | 'survey' | 'success' | 'error';

export default function PulseSurveyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<SurveyStep>('loading');
  const [pulse, setPulse] = useState<EmployeeVoicePulse | null>(null);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [mood, setMood] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<'LOW' | 'MEDIUM' | 'HIGH' | null>(null);
  const [bottleneck, setBottleneck] = useState<string>('NONE');
  const [comment, setComment] = useState('');

  // Validate magic link on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid survey link');
      setStep('error');
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await employeeVoiceAPI.validateMagicLink(token!);
      setPulse(response.pulse);
      setStep('survey');
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('This survey link is invalid or has expired.');
      }
      setStep('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mood === null || confidence === null) {
      return;
    }

    setSubmitting(true);

    try {
      // Generate device fingerprint
      const deviceFingerprint = getDeviceFingerprintString();

      // Prepare request
      const request: SubmitSurveyRequest = {
        token: token!,
        mood,
        confidence,
        device_fingerprint: deviceFingerprint,
      };

      // Add optional fields
      if (bottleneck && bottleneck !== 'NONE') {
        request.bottleneck = bottleneck as any;
      }

      if (comment.trim()) {
        request.comment = comment.trim();
      }

      // Submit survey
      await employeeVoiceAPI.submitSurvey(request);

      setStep('success');
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors[0]);
      } else {
        setError('Failed to submit survey. Please try again.');
      }
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = mood !== null && confidence !== null && !submitting;

  // Emoji options for mood
  const moodOptions = [
    { value: 1, emoji: '😞', label: 'Very Bad' },
    { value: 2, emoji: '😕', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Neutral' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😊', label: 'Very Good' },
  ];

  // Confidence options
  const confidenceOptions = [
    { value: 'LOW' as const, label: 'Could use more training', icon: '📚' },
    { value: 'MEDIUM' as const, label: 'Mostly confident', icon: '👍' },
    { value: 'HIGH' as const, label: 'Very confident', icon: '💪' },
  ];

  // Bottleneck options
  const bottleneckOptions = [
    { value: 'EQUIPMENT', label: 'Equipment/Tools', icon: '🔧' },
    { value: 'STAFFING', label: 'Staffing/Scheduling', icon: '👥' },
    { value: 'TRAINING', label: 'Training/Knowledge', icon: '📖' },
    { value: 'SUPPLIES', label: 'Supplies/Inventory', icon: '📦' },
    { value: 'COMMUNICATION', label: 'Communication', icon: '💬' },
    { value: 'PROCESSES', label: 'Processes/Procedures', icon: '📋' },
    { value: 'NONE', label: 'No bottlenecks', icon: '✅' },
  ];

  // Render loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Survey</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            If you received this link via SMS, please contact your manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Render success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your feedback has been submitted anonymously. Your input helps improve operations for everyone.
          </p>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{pulse?.consent_text}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render survey form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{pulse?.title}</h1>
          <p className="text-gray-600">{pulse?.description}</p>
          <p className="text-sm text-gray-500 mt-2">Takes less than 30 seconds • Anonymous</p>
        </div>

        {/* Survey Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Question 1: Mood */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              How are you feeling today?
            </label>
            <div className="flex justify-between gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMood(option.value)}
                  className={`
                    flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                    ${mood === option.value
                      ? 'border-blue-600 bg-blue-50 scale-110'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-4xl mb-2">{option.emoji}</span>
                  <span className="text-xs text-gray-600 hidden sm:block">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Confidence */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              How confident are you in your role today?
            </label>
            <div className="space-y-3">
              {confidenceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setConfidence(option.value)}
                  className={`
                    w-full flex items-center p-4 rounded-lg border-2 transition-all text-left
                    ${confidence === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-2xl mr-3">{option.icon}</span>
                  <span className="text-gray-900 font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Bottleneck (Optional) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-2">
              Any bottlenecks slowing you down?
            </label>
            <p className="text-sm text-gray-500 mb-4">Optional</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bottleneckOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBottleneck(option.value)}
                  className={`
                    flex items-center p-4 rounded-lg border-2 transition-all text-left
                    ${bottleneck === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-xl mr-2">{option.icon}</span>
                  <span className="text-sm text-gray-900">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 4: Comment (Optional) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label htmlFor="comment" className="block text-lg font-semibold text-gray-900 mb-2">
              Anything else you'd like to share?
            </label>
            <p className="text-sm text-gray-500 mb-4">Optional • Max 280 characters</p>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 280))}
              placeholder="Your feedback helps us improve..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={280}
            />
            <div className="mt-2 text-right text-sm text-gray-500">
              {comment.length}/280
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              🔒 {pulse?.consent_text}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`
              w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all
              ${canSubmit
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Submitting...
              </span>
            ) : (
              'Submit Survey'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

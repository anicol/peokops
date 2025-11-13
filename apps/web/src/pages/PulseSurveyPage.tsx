import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { employeeVoiceAPI, type EmployeeVoicePulse, type SubmitSurveyRequest } from '@/services/api';
import { getDeviceFingerprintString } from '@/utils/deviceFingerprint';
import { CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';

type LoadingState = 'loading' | 'ready' | 'error';
type CarouselStep = 'welcome' | 'mood' | 'confidence' | 'bottlenecks' | 'comment' | 'success';

export default function PulseSurveyPage() {
  const { token } = useParams<{ token: string }>();
  const isPreview = token === 'preview';

  // Loading state
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [pulse, setPulse] = useState<EmployeeVoicePulse | null>(null);
  const [error, setError] = useState<string>('');

  // Carousel state
  const [currentStep, setCurrentStep] = useState<CarouselStep>('welcome');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [mood, setMood] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [bottlenecks, setBottlenecks] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  // Validate magic link on mount (or use preview mode)
  useEffect(() => {
    if (isPreview) {
      // Preview mode - use mock data
      setPulse({
        id: 'preview',
        title: 'Daily Team Pulse',
        description: 'Quick Check In',
        consent_text: 'Your responses are anonymous and help improve team operations. Data is aggregated for privacy.',
      } as EmployeeVoicePulse);
      setLoadingState('ready');
      return;
    }

    if (!token) {
      setError('Invalid survey link');
      setLoadingState('error');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await employeeVoiceAPI.validateMagicLink(token!);
        setPulse(response.pulse);
        setLoadingState('ready');
      } catch (err: any) {
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('This survey link is invalid or has expired.');
        }
        setLoadingState('error');
      }
    };

    validateToken();
  }, [token, isPreview]);

  // Mood options - Updated emojis
  const moodOptions = [
    { value: 1, emoji: '😫', label: 'Tired' },
    { value: 2, emoji: '😐', label: 'Off' },
    { value: 3, emoji: '🙂', label: 'Okay' },
    { value: 4, emoji: '😄', label: 'Good' },
    { value: 5, emoji: '🔥', label: 'Fired Up' },
  ];

  // Confidence options - Updated to 3-level scale
  const confidenceOptions = [
    { value: 1, label: "No, we're short or disorganized", icon: '❌' },
    { value: 2, label: 'Mostly, a few things missing', icon: '⚠️' },
    { value: 3, label: "Yes, I'm all set", icon: '✅' },
  ];

  // Bottleneck options - Updated with new categories
  const bottleneckOptions = [
    { value: 'CLEANLINESS', label: 'Cleanliness / Prep setup', icon: '🧹' },
    { value: 'STAFFING', label: 'Staffing or scheduling', icon: '🧍' },
    { value: 'EQUIPMENT', label: 'Equipment issues', icon: '⚙️' },
    { value: 'TASKS', label: 'Confusion about tasks', icon: '📋' },
    { value: 'COMMUNICATION', label: 'Communication / leadership', icon: '💬' },
    { value: 'GUEST_VOLUME', label: 'Guest volume / rush', icon: '🍴' },
  ];

  // Auto-advance helper
  const advanceStep = () => {
    const steps: CarouselStep[] = ['welcome', 'mood', 'confidence', 'bottlenecks', 'comment', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  // Handle mood selection (auto-advance)
  const handleMoodSelect = (value: number) => {
    setMood(value);
    setTimeout(() => advanceStep(), 300); // Small delay for visual feedback
  };

  // Handle confidence selection (auto-advance)
  const handleConfidenceSelect = (value: number) => {
    setConfidence(value);
    setTimeout(() => advanceStep(), 300);
  };

  // Handle bottleneck toggle (multi-select, max 2)
  const handleBottleneckToggle = (value: string) => {
    if (bottlenecks.includes(value)) {
      setBottlenecks(bottlenecks.filter(b => b !== value));
    } else {
      if (bottlenecks.length < 2) {
        setBottlenecks([...bottlenecks, value]);
      } else {
        // Replace first selected if at max
        setBottlenecks([bottlenecks[1], value]);
      }
    }
  };

  // Submit survey
  const handleSubmit = async () => {
    if (mood === null || confidence === null) {
      return;
    }

    setSubmitting(true);

    // Skip API call in preview mode
    if (isPreview) {
      setTimeout(() => {
        setCurrentStep('success');
        setSubmitting(false);
      }, 500);
      return;
    }

    try {
      const deviceFingerprint = getDeviceFingerprintString();

      const request: SubmitSurveyRequest = {
        token: token!,
        mood,
        confidence,
        bottlenecks: bottlenecks.length > 0 ? bottlenecks : undefined,
        comment: comment.trim() || undefined,
        device_fingerprint: deviceFingerprint,
      };

      await employeeVoiceAPI.submitSurvey(request);
      setCurrentStep('success');
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to submit survey. Please try again.');
      }
      setLoadingState('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Progress dots
  const getProgressDots = () => {
    const steps: CarouselStep[] = ['welcome', 'mood', 'confidence', 'bottlenecks', 'comment'];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all ${
              index <= currentIndex ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Render loading state
  if (loadingState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (loadingState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center px-4">
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

  // Render carousel steps
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Preview Mode Banner */}
        {isPreview && (
          <div className="mb-4 bg-purple-100 border-2 border-purple-300 rounded-lg px-4 py-3 text-center">
            <p className="text-sm font-medium text-purple-900">
              👁️ Preview Mode - This is how employees will see the survey
            </p>
          </div>
        )}

        {/* Progress Dots (hide on welcome and success) */}
        {currentStep !== 'welcome' && currentStep !== 'success' && getProgressDots()}

        {/* Carousel Content */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8 transition-all duration-300 ease-in-out">

          {/* Welcome Screen */}
          {currentStep === 'welcome' && (
            <div className="text-center animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Quick 3-question check-in 👋</h1>
              <p className="text-sm sm:text-base text-gray-600 mb-6">Takes 30 seconds • Anonymous</p>
              <button
                onClick={() => setCurrentStep('mood')}
                className="w-full bg-blue-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Start
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}

          {/* Step 1: Mood */}
          {currentStep === 'mood' && (
            <div className="animate-slide-in">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
                How's your shift feeling today?
              </h2>
              <div className="flex justify-center gap-2 sm:gap-3">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMoodSelect(option.value)}
                    className={`
                      w-16 h-20 sm:w-24 sm:h-28 flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all transform hover:scale-110
                      ${mood === option.value
                        ? 'border-blue-600 bg-blue-50 scale-110'
                        : 'border-gray-200 hover:border-blue-300'
                      }
                    `}
                  >
                    <span className="text-3xl sm:text-5xl mb-1">{option.emoji}</span>
                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium text-center leading-tight">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Confidence */}
          {currentStep === 'confidence' && (
            <div className="animate-slide-in">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
                Do you have what you need to do your job well today?
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {confidenceOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleConfidenceSelect(option.value)}
                    className={`
                      w-full flex items-center p-4 sm:p-5 rounded-lg sm:rounded-xl border-2 transition-all transform hover:scale-105
                      ${confidence === option.value
                        ? 'border-blue-600 bg-blue-50 scale-105'
                        : 'border-gray-200 hover:border-blue-300'
                      }
                    `}
                  >
                    <span className="text-2xl sm:text-3xl mr-3 sm:mr-4 flex-shrink-0">{option.icon}</span>
                    <span className="text-sm sm:text-base text-gray-900 font-medium text-left">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Bottlenecks (multi-select, max 2) */}
          {currentStep === 'bottlenecks' && (
            <div className="animate-slide-in">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">
                What's slowing the team down the most right now?
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 text-center">Pick up to 2</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                {bottleneckOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleBottleneckToggle(option.value)}
                    className={`
                      flex items-center p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all
                      ${bottlenecks.includes(option.value)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                      }
                      ${bottlenecks.length >= 2 && !bottlenecks.includes(option.value) ? 'opacity-50' : ''}
                    `}
                  >
                    <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">{option.icon}</span>
                    <span className="text-xs sm:text-sm text-gray-900 text-left leading-tight">{option.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={advanceStep}
                className="w-full bg-blue-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}

          {/* Step 4: Optional Comment */}
          {currentStep === 'comment' && (
            <div className="animate-slide-in">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">
                Anything we should fix or celebrate today?
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 text-center">Optional</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 80))}
                placeholder="Your quick thoughts... (80 chars max)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-2 text-sm sm:text-base"
                rows={3}
                maxLength={80}
              />
              <div className="text-right text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                {comment.length}/80
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`
                  w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg hover:shadow-xl
                  ${submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          )}

          {/* Success Screen with Appreciation */}
          {currentStep === 'success' && (
            <div className="text-center animate-fade-in">
              <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Thanks for your quick check-in 💪
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mb-6">
                Every voice helps your store improve.
              </p>
              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600">
                  🔒 {pulse?.consent_text}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

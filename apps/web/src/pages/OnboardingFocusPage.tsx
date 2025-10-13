import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface FocusArea {
  value: string;
  label: string;
  emoji: string;
  description: string;
}

const focusAreas: FocusArea[] = [
  { value: 'cleanliness', label: 'Cleanliness', emoji: '🧼', description: 'Surfaces, stations, equipment' },
  { value: 'food_safety', label: 'Food Safety', emoji: '🍔', description: 'Temperature, handling, storage' },
  { value: 'team_readiness', label: 'Team Execution', emoji: '👥', description: 'Uniforms, readiness, standards' },
  { value: 'customer_experience', label: 'Guest Experience', emoji: '⭐', description: 'Dining area, service, ambiance' }
];

const AUTO_SKIP_SECONDS = 8;

export default function OnboardingFocusPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(AUTO_SKIP_SECONDS);
  const [isSkipping, setIsSkipping] = useState(false);

  useEffect(() => {
    // Redirect if previous steps not completed
    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');
    if (!onboardingData.userId) {
      navigate('/start');
      return;
    }

    // Auto-skip timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleToggle = (value: string) => {
    // Stop auto-skip when user interacts
    setCountdown(0);

    if (selected.includes(value)) {
      setSelected(selected.filter(v => v !== value));
    } else if (selected.length < 3) {
      setSelected([...selected, value]);
    }
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      handleSkip();
      return;
    }

    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');

    // Update focus areas in backend
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/trial/onboarding/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: 'GM',
          industry: onboardingData.industry,
          store_count_range: '1-5',
          focus_areas: selected
        })
      });
    } catch (err) {
      console.error('Failed to update focus areas:', err);
      // Continue anyway - not critical
    }

    // Store selection
    sessionStorage.setItem('onboarding', JSON.stringify({
      ...onboardingData,
      focus_areas: selected
    }));

    navigate('/checks-sent');
  };

  const handleSkip = () => {
    setIsSkipping(true);
    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');

    // Use industry defaults
    const industryDefaults: Record<string, string[]> = {
      RESTAURANT: ['cleanliness', 'food_safety'],
      RETAIL: ['cleanliness', 'customer_experience'],
      HOSPITALITY: ['cleanliness', 'customer_experience'],
      OTHER: ['cleanliness']
    };

    const defaultFocus = industryDefaults[onboardingData.industry] || ['cleanliness'];

    sessionStorage.setItem('onboarding', JSON.stringify({
      ...onboardingData,
      focus_areas: defaultFocus
    }));

    setTimeout(() => navigate('/checks-sent'), 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-6">Step 4 of 4</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-teal-600" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 text-center">
            Focus your first checks on...
          </h1>
          <p className="text-gray-600 mb-2 text-center">
            Choose 1-3 areas (optional)
          </p>
          {countdown > 0 && (
            <p className="text-sm text-gray-500 mb-8 text-center">
              Auto-continuing in {countdown}s...
            </p>
          )}

          {/* Focus area options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {focusAreas.map((area) => {
              const isSelected = selected.includes(area.value);
              const isDisabled = selected.length >= 3 && !isSelected;

              return (
                <button
                  key={area.value}
                  onClick={() => handleToggle(area.value)}
                  disabled={isDisabled}
                  className={`p-6 border-2 rounded-xl text-left transition-all transform hover:scale-105 active:scale-95 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50 shadow-lg'
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="text-3xl mr-3">{area.emoji}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {area.label}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {area.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-2 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected.length > 0 && (
            <p className="text-sm text-gray-500 mb-6 text-center">
              {selected.length} of 3 selected
            </p>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={isSkipping}
              className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {selected.length > 0 ? 'Continue' : 'Skip & Use Defaults'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>

            {selected.length > 0 && countdown > 0 && (
              <button
                onClick={handleSkip}
                className="w-full py-3 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip this step
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

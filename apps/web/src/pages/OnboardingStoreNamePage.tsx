import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight } from 'lucide-react';

export default function OnboardingStoreNamePage() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    // Load existing data if navigating back
    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');
    if (onboardingData.storeName) {
      setStoreName(onboardingData.storeName);
    }

    // Redirect if no industry selected
    if (!onboardingData.industry) {
      navigate('/start');
    }
  }, [navigate]);

  const handleContinue = () => {
    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');
    const finalStoreName = storeName.trim() || 'Your Store';

    sessionStorage.setItem('onboarding', JSON.stringify({
      ...onboardingData,
      storeName: finalStoreName
    }));

    navigate('/start/contact');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleContinue();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-6">Step 2 of 4</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: '50%' }}></div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <Store className="w-8 h-8 text-teal-600" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 text-center">
            What's your store name?
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            We'll use this to personalize your daily checks
          </p>

          {/* Input */}
          <div className="mb-8">
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Marco's Pizza #241"
              className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 focus:outline-none transition-all"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500 text-center">
              Or skip — we'll call it "Your Store"
            </p>
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            Continue
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>

          {/* Back link */}
          <button
            onClick={() => navigate('/start')}
            className="w-full mt-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

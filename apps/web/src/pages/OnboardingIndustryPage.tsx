import { useNavigate } from 'react-router-dom';
import { Building2, ShoppingBag, Hotel, MoreHorizontal } from 'lucide-react';

type Industry = 'RESTAURANT' | 'RETAIL' | 'HOSPITALITY' | 'OTHER';

interface IndustryOption {
  value: Industry;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
}

const industries: IndustryOption[] = [
  { value: 'RESTAURANT', label: 'Restaurant', icon: Building2, emoji: '🍔' },
  { value: 'RETAIL', label: 'Retail', icon: ShoppingBag, emoji: '🛍' },
  { value: 'HOSPITALITY', label: 'Hospitality', icon: Hotel, emoji: '🏨' },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal, emoji: '➕' }
];

export default function OnboardingIndustryPage() {
  const navigate = useNavigate();

  const handleSelect = (industry: Industry) => {
    // Store selection in sessionStorage
    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');
    sessionStorage.setItem('onboarding', JSON.stringify({
      ...onboardingData,
      industry
    }));

    // Auto-advance to next step
    navigate('/start/store-name');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-6">Step 1 of 4</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: '25%' }}></div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 text-center">
            What kind of business do you run?
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            We'll personalize your first checks
          </p>

          {/* Industry options */}
          <div className="grid grid-cols-2 gap-4">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <button
                  key={industry.value}
                  onClick={() => handleSelect(industry.value)}
                  className="group relative p-8 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
                >
                  <div className="text-center">
                    <div className="text-5xl mb-3">{industry.emoji}</div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                      {industry.label}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-teal-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>60 seconds to setup</span>
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-teal-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No password needed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

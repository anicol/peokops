import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShoppingBag, Hotel, MoreHorizontal, ChevronLeft } from 'lucide-react';

type Industry = 'RESTAURANT' | 'RETAIL' | 'HOSPITALITY' | 'OTHER';
type Subtype = 'QSR' | 'FAST_CASUAL' | 'CASUAL_DINING' | 'FINE_DINING' | 'CAFE' | 'BAR_PUB' | 'FOOD_TRUCK' | 'CATERING' | 'BAKERY' | 'GROCERY' | 'CONVENIENCE' | 'FASHION' | 'HOTEL' | 'OTHER_SUBTYPE';

interface IndustryOption {
  value: Industry;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
}

interface SubtypeOption {
  value: Subtype;
  label: string;
  emoji: string;
}

const industries: IndustryOption[] = [
  { value: 'RESTAURANT', label: 'Restaurant', icon: Building2, emoji: '🍔' },
  { value: 'RETAIL', label: 'Retail', icon: ShoppingBag, emoji: '🛍' },
  { value: 'HOSPITALITY', label: 'Hospitality', icon: Hotel, emoji: '🏨' },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal, emoji: '➕' }
];

const subtypesByIndustry: Record<Industry, SubtypeOption[]> = {
  RESTAURANT: [
    { value: 'QSR', label: 'Quick Service / Fast Food', emoji: '🍟' },
    { value: 'FAST_CASUAL', label: 'Fast Casual', emoji: '🥗' },
    { value: 'CASUAL_DINING', label: 'Casual Dining', emoji: '🍽️' },
    { value: 'FINE_DINING', label: 'Fine Dining', emoji: '🍷' },
    { value: 'CAFE', label: 'Cafe / Coffee Shop', emoji: '☕' },
    { value: 'BAR_PUB', label: 'Bar / Pub', emoji: '🍺' },
    { value: 'FOOD_TRUCK', label: 'Food Truck', emoji: '🚚' },
    { value: 'CATERING', label: 'Catering', emoji: '🎉' },
    { value: 'BAKERY', label: 'Bakery / Dessert Shop', emoji: '🧁' },
  ],
  RETAIL: [
    { value: 'GROCERY', label: 'Grocery Store', emoji: '🛒' },
    { value: 'CONVENIENCE', label: 'Convenience Store', emoji: '🏪' },
    { value: 'FASHION', label: 'Fashion Retail', emoji: '👗' },
    { value: 'OTHER_SUBTYPE', label: 'Other Retail', emoji: '🏬' },
  ],
  HOSPITALITY: [
    { value: 'HOTEL', label: 'Hotel', emoji: '🏨' },
    { value: 'OTHER_SUBTYPE', label: 'Other Hospitality', emoji: '🏩' },
  ],
  OTHER: [
    { value: 'OTHER_SUBTYPE', label: 'Other', emoji: '➕' },
  ],
};

export default function OnboardingIndustryPage() {
  const navigate = useNavigate();
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

  const handleIndustrySelect = (industry: Industry) => {
    setSelectedIndustry(industry);
  };

  const handleSubtypeSelect = (subtype: Subtype) => {
    if (!selectedIndustry) return;

    // Store both industry and subtype in sessionStorage
    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');
    sessionStorage.setItem('onboarding', JSON.stringify({
      ...onboardingData,
      industry: selectedIndustry,
      subtype
    }));

    // Auto-advance to next step
    navigate('/start/store-name');
  };

  const handleBack = () => {
    setSelectedIndustry(null);
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
          {!selectedIndustry ? (
            <>
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
                      onClick={() => handleIndustrySelect(industry.value)}
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
            </>
          ) : (
            <>
              {/* Back button */}
              <button
                onClick={handleBack}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </button>

              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 text-center">
                What type of {industries.find(i => i.value === selectedIndustry)?.label.toLowerCase()}?
              </h1>
              <p className="text-gray-600 mb-8 text-center">
                This helps us customize your checks
              </p>

              {/* Subtype options */}
              <div className="grid grid-cols-2 gap-4">
                {subtypesByIndustry[selectedIndustry].map((subtype) => (
                  <button
                    key={subtype.value}
                    onClick={() => handleSubtypeSelect(subtype.value)}
                    className="group relative p-6 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">{subtype.emoji}</div>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                        {subtype.label}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
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

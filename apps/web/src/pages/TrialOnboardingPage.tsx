import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { API_CONFIG } from '@/config/api';

interface OnboardingData {
  role: 'GM' | 'OWNER' | 'ADMIN' | null;
  industry: 'RESTAURANT' | 'RETAIL' | 'HOSPITALITY' | 'OTHER' | null;
  store_count_range: string | null;
  focus_areas: string[];
}

interface FocusArea {
  value: string;
  label: string;
  description: string;
}

interface RoleOption {
  value: 'GM' | 'OWNER' | 'ADMIN';
  label: string;
  description: string;
}

const ROLES_BY_INDUSTRY: Record<string, RoleOption[]> = {
  RESTAURANT: [
    {
      value: 'GM',
      label: 'General Manager',
      description: 'Runs a single location day-to-day'
    },
    {
      value: 'GM',
      label: 'Assistant Manager / Shift Lead',
      description: 'Oversees specific shifts'
    },
    {
      value: 'ADMIN',
      label: 'Area / District Manager',
      description: 'Oversees multiple stores'
    },
    {
      value: 'OWNER',
      label: 'Owner / Franchisee',
      description: 'Owns one or more units'
    }
  ],
  RETAIL: [
    {
      value: 'GM',
      label: 'Store Manager',
      description: 'Oversees operations and associates'
    },
    {
      value: 'GM',
      label: 'Assistant Manager / Keyholder',
      description: 'Opens/closes and runs shifts'
    },
    {
      value: 'ADMIN',
      label: 'District / Regional Manager',
      description: 'Oversees 5–20 stores'
    },
    {
      value: 'ADMIN',
      label: 'Corporate Ops / Visual Merch Lead',
      description: 'Brand presentation & execution'
    }
  ],
  HOSPITALITY: [
    {
      value: 'GM',
      label: 'Front Office Manager',
      description: 'Guest experience at check-in/out'
    },
    {
      value: 'GM',
      label: 'Housekeeping Supervisor',
      description: 'Room and cleanliness standards'
    },
    {
      value: 'GM',
      label: 'Maintenance Lead',
      description: 'Facility operations'
    },
    {
      value: 'GM',
      label: 'General Manager',
      description: 'Overall property performance'
    }
  ],
  OTHER: [
    {
      value: 'GM',
      label: 'Manager',
      description: 'Day-to-day operations'
    },
    {
      value: 'ADMIN',
      label: 'District/Regional Manager',
      description: 'Multi-location oversight'
    },
    {
      value: 'OWNER',
      label: 'Owner/Operator',
      description: 'Business ownership'
    }
  ]
};

const FOCUS_AREAS_BY_INDUSTRY: Record<string, FocusArea[]> = {
  RESTAURANT: [
    {
      value: 'food_safety',
      label: 'Food Safety',
      description: 'Temperature, cross-contamination, and handling standards'
    },
    {
      value: 'cleanliness',
      label: 'Cleanliness & Sanitation',
      description: 'Surfaces, prep stations, and hand sinks'
    },
    {
      value: 'team_readiness',
      label: 'Team Readiness',
      description: 'Uniforms, PPE, and shift readiness'
    },
    {
      value: 'customer_experience',
      label: 'Guest Experience',
      description: 'Dining area, restrooms, and service cues'
    },
    {
      value: 'equipment_maintenance',
      label: 'Equipment & Maintenance',
      description: 'Equipment upkeep and preventive checks'
    }
  ],
  RETAIL: [
    {
      value: 'store_presentation',
      label: 'Store Presentation',
      description: 'Cleanliness, layout, and displays'
    },
    {
      value: 'brand_standards',
      label: 'Brand Standards',
      description: 'Promotions, signage, and planograms'
    },
    {
      value: 'customer_experience',
      label: 'Customer Experience',
      description: 'Greeting, queue, and checkout'
    },
    {
      value: 'safety_compliance',
      label: 'Safety & Compliance',
      description: 'Aisle clearance, spills, emergency exits'
    },
    {
      value: 'team_engagement',
      label: 'Team Engagement',
      description: 'Appearance, readiness, and communication'
    }
  ],
  HOSPITALITY: [
    {
      value: 'guest_room_readiness',
      label: 'Guest Room Readiness',
      description: 'Cleanliness, amenities, and maintenance'
    },
    {
      value: 'public_area_standards',
      label: 'Public Area Standards',
      description: 'Lobby, hallways, and restrooms'
    },
    {
      value: 'safety_security',
      label: 'Safety & Security',
      description: 'Fire exits, alarms, and safety signage'
    },
    {
      value: 'service_excellence',
      label: 'Service Excellence',
      description: 'Staff appearance and guest interaction'
    },
    {
      value: 'facilities_maintenance',
      label: 'Facilities & Maintenance',
      description: 'Lighting, HVAC, and repair checks'
    }
  ],
  OTHER: [
    {
      value: 'cleanliness',
      label: 'Cleanliness',
      description: 'General cleanliness and sanitation'
    },
    {
      value: 'safety',
      label: 'Safety',
      description: 'Workplace safety and compliance'
    },
    {
      value: 'customer_experience',
      label: 'Customer Experience',
      description: 'Customer service and satisfaction'
    },
    {
      value: 'team_readiness',
      label: 'Team Readiness',
      description: 'Staff preparation and appearance'
    },
    {
      value: 'operations',
      label: 'Operations',
      description: 'General operational standards'
    }
  ]
};

interface LocationOption {
  value: string;
  label: string;
}

const LOCATIONS_BY_INDUSTRY: Record<string, LocationOption[]> = {
  RESTAURANT: [
    { value: 'SINGLE', label: 'Just One Location' },
    { value: '2-20', label: '2–20 Locations' },
    { value: '21-100', label: '21–100 Locations' },
    { value: '100+', label: '100+ Locations' }
  ],
  RETAIL: [
    { value: 'SINGLE', label: 'Single Store' },
    { value: '2-50', label: '2–50 Stores' },
    { value: '51-250', label: '51–250 Stores' },
    { value: '250+', label: 'National Chain (250+)' }
  ],
  HOSPITALITY: [
    { value: 'SINGLE', label: 'Single Property' },
    { value: '2-10', label: '2–10 Properties' },
    { value: '11-50', label: '11–50 Properties' },
    { value: '50+', label: 'Hotel Group (50+)' }
  ],
  OTHER: [
    { value: 'SINGLE', label: 'Single Location' },
    { value: '2-20', label: '2–20 Locations' },
    { value: '21-100', label: '21–100 Locations' },
    { value: '100+', label: '100+ Locations' }
  ]
};

export default function TrialOnboardingPage() {
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    role: null,
    industry: null,
    store_count_range: null,
    focus_areas: []
  });
  const [selectedRoleLabel, setSelectedRoleLabel] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for smooth scrolling
  const roleRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  // Smooth scroll helper
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Get roles for selected industry
  const availableRoles = useMemo(() => {
    if (!data.industry) return [];
    return ROLES_BY_INDUSTRY[data.industry] || ROLES_BY_INDUSTRY.OTHER;
  }, [data.industry]);

  // Get focus areas for selected industry
  const availableFocusAreas = useMemo(() => {
    if (!data.industry) return [];
    return FOCUS_AREAS_BY_INDUSTRY[data.industry] || FOCUS_AREAS_BY_INDUSTRY.OTHER;
  }, [data.industry]);

  // Get location options for selected industry
  const availableLocations = useMemo(() => {
    if (!data.industry) return [];
    return LOCATIONS_BY_INDUSTRY[data.industry] || LOCATIONS_BY_INDUSTRY.OTHER;
  }, [data.industry]);

  // Clear role, location, and focus areas when industry changes
  const handleIndustryChange = (industry: OnboardingData['industry']) => {
    setData({
      ...data,
      industry,
      role: null, // Clear role selection
      store_count_range: null, // Clear location selection
      focus_areas: [] // Clear focus areas when industry changes
    });
    setSelectedRoleLabel(''); // Clear selected role label
    scrollToSection(roleRef);
  };

  const handleRoleChange = (roleValue: 'GM' | 'OWNER' | 'ADMIN', roleLabel: string) => {
    setData({ ...data, role: roleValue });
    setSelectedRoleLabel(roleLabel);
    scrollToSection(locationRef);
  };

  const handleLocationChange = (location: string) => {
    setData({ ...data, store_count_range: location });
    scrollToSection(focusRef);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_CONFIG.baseURL}/auth/trial/onboarding/`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.headers,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Onboarding response:', result);

        // Refresh user data to get updated onboarding_completed_at
        console.log('Refetching user data...');
        await refetchUser();
        console.log('User data refetched, navigating to first checks ready');

        // Redirect to "First 3 Ready" page
        navigate('/first-checks-ready');
      } else {
        const errorData = await response.json();
        console.error('Onboarding failed:', errorData);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple single-page onboarding for now
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4 py-8 md:py-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-6">Welcome to PeakOps!</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">Help us personalize your experience</p>

        {/* Step 1: Industry Selection */}
        <div className="mb-6 scroll-mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mr-2">1</span>
            Industry
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {(['RESTAURANT', 'RETAIL', 'HOSPITALITY', 'OTHER'] as const).map((industry) => (
              <button
                key={industry}
                onClick={() => handleIndustryChange(industry)}
                className={`p-3 sm:p-4 border-2 rounded-lg text-center transition-all text-sm sm:text-base ${
                  data.industry === industry
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {industry.charAt(0) + industry.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Role Selection - Only show after industry selected */}
        {data.industry && (
          <div ref={roleRef} className="mb-6 animate-fadeIn scroll-mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mr-2">2</span>
              Your Role
            </label>
            <div className="grid grid-cols-1 gap-3">
              {availableRoles.map((roleOption, index) => {
                const isSelected = selectedRoleLabel === roleOption.label;
                return (
                  <button
                    key={`${roleOption.value}-${index}`}
                    onClick={() => handleRoleChange(roleOption.value, roleOption.label)}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                          {roleOption.label}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {roleOption.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-3 flex-shrink-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Store Count - Only show after role selected */}
        {data.industry && selectedRoleLabel && (
          <div ref={locationRef} className="mb-6 animate-fadeIn scroll-mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mr-2">3</span>
              Number of Locations
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {availableLocations.map((location) => (
                <button
                  key={location.value}
                  onClick={() => handleLocationChange(location.value)}
                  className={`p-3 sm:p-4 border-2 rounded-lg text-center transition-all text-sm sm:text-base ${
                    data.store_count_range === location.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {location.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Focus Areas - Only show after store count selected */}
        {data.industry && selectedRoleLabel && data.store_count_range && (
          <div ref={focusRef} className="mb-6 sm:mb-8 animate-fadeIn scroll-mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mr-2">4</span>
              Focus Areas (select 1-3)
            </label>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              Choose the areas most important to your operation
            </p>
            <div className="grid grid-cols-1 gap-3">
              {availableFocusAreas.map((focus) => {
                const isSelected = data.focus_areas.includes(focus.value);
                return (
                  <button
                    key={focus.value}
                    onClick={() => {
                      if (isSelected) {
                        setData({
                          ...data,
                          focus_areas: data.focus_areas.filter((f) => f !== focus.value)
                        });
                      } else if (data.focus_areas.length < 3) {
                        setData({
                          ...data,
                          focus_areas: [...data.focus_areas, focus.value]
                        });
                      }
                    }}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${data.focus_areas.length >= 3 && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={data.focus_areas.length >= 3 && !isSelected}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                          {focus.label}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {focus.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-3 flex-shrink-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs sm:text-sm text-gray-500">
              {data.focus_areas.length} of 3 selected
            </div>
          </div>
        )}

        {/* Submit Button - Only show after at least one focus area selected */}
        {data.industry && selectedRoleLabel && data.store_count_range && data.focus_areas.length > 0 && (
          <div className="animate-fadeIn">
            <button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="w-full py-3 sm:py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting ? 'Building Your Checks...' : 'Build My First 3 Checks'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

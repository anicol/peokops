import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { API_CONFIG, API_ENDPOINTS } from '@/config/api';

interface Plan {
  id: number;
  name: string;
  plan_type: string;
  description: string;
  price_monthly: string;
  unlimited_coaching_videos: boolean;
  inspection_mode_enabled: boolean;
  multi_manager_analytics: boolean;
  corporate_dashboards: boolean;
  advanced_analytics: boolean;
  priority_support: boolean;
  dedicated_success_manager: boolean;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [storeCount, setStoreCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Check for checkout result on mount
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      // Show success message and redirect to dashboard
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  }, [searchParams, navigate]);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.billing.plans}`, {
          headers: {
            ...API_CONFIG.headers,
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // API returns {count, results} or just an array
          const plansArray = data.results || data;
          setPlans(plansArray);
          // Auto-select first plan if coming from trial
          if (user?.is_trial_user && plansArray.length > 0) {
            setSelectedPlan(plansArray[0].plan_type);
          }
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [user]);

  const handleCheckout = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.billing.createCheckout}`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.headers,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_type: selectedPlan,
          store_count: storeCount
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message if returning from Stripe
  if (searchParams.get('checkout') === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your subscription is now active. Welcome to PeakOps!
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Redirecting to dashboard...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedPlanDetails = plans.find(p => p.plan_type === selectedPlan);
  const totalMonthly = selectedPlanDetails
    ? parseFloat(selectedPlanDetails.price_monthly) * storeCount
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-gray-600 mt-2">
            {user?.is_trial_user
              ? "Upgrade from your trial to unlock unlimited access"
              : "Select a plan to get started with PeakOps"}
          </p>
        </div>

        {/* Trial Status Banner */}
        {user?.is_trial_user && user?.trial_status && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800">Trial Status</h3>
                <p className="text-blue-700 text-sm mt-1">
                  {user.trial_status.days_remaining} days remaining • {user.trial_status.videos_remaining}/10 videos left
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Plans */}
          <div className="lg:col-span-2">
            {loadingPlans ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.plan_type)}
                    className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
                      selectedPlan === plan.plan_type
                        ? 'border-blue-500 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <input
                            type="radio"
                            checked={selectedPlan === plan.plan_type}
                            onChange={() => setSelectedPlan(plan.plan_type)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <h3 className="text-xl font-bold text-gray-900 ml-3">
                            {plan.name}
                          </h3>
                        </div>
                        <p className="text-gray-600 text-sm ml-7 mb-3">
                          {plan.description}
                        </p>
                        <div className="ml-7 space-y-2">
                          {plan.unlimited_coaching_videos && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Check className="w-4 h-4 text-green-600 mr-2" />
                              Unlimited coaching videos
                            </div>
                          )}
                          {plan.inspection_mode_enabled && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Check className="w-4 h-4 text-green-600 mr-2" />
                              Inspection mode
                            </div>
                          )}
                          {plan.multi_manager_analytics && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Check className="w-4 h-4 text-green-600 mr-2" />
                              Multi-manager analytics
                            </div>
                          )}
                          {plan.corporate_dashboards && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Check className="w-4 h-4 text-green-600 mr-2" />
                              Corporate dashboards
                            </div>
                          )}
                          {plan.advanced_analytics && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Check className="w-4 h-4 text-green-600 mr-2" />
                              Advanced analytics
                            </div>
                          )}
                          {plan.priority_support && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Check className="w-4 h-4 text-green-600 mr-2" />
                              Priority support
                            </div>
                          )}
                          {plan.dedicated_success_manager && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Check className="w-4 h-4 text-green-600 mr-2" />
                              Dedicated success manager
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <div className="text-3xl font-bold text-gray-900">
                          ${plan.price_monthly}
                        </div>
                        <div className="text-sm text-gray-600">per store/month</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

              {selectedPlanDetails ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Stores
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={storeCount}
                      onChange={(e) => setStoreCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{selectedPlanDetails.name}</span>
                      <span className="font-medium">${selectedPlanDetails.price_monthly}/store</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Stores</span>
                      <span className="font-medium">× {storeCount}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ${totalMonthly.toFixed(2)}/mo
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Billed monthly</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Continue to Payment'
                    )}
                  </button>

                  <p className="text-xs text-center text-gray-500 mt-4">
                    Secure payment powered by Stripe
                  </p>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a plan to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

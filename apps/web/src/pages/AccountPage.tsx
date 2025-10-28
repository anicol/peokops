import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { brandsAPI, billingAPI } from '@/services/api';
import type { Brand, SubscriptionStatus } from '@/types';
import {
  Building2,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Settings,
  Crown,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

export default function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch the user's brand
  const { data: brand, isLoading } = useQuery<Brand>(
    ['brand', user?.brand_id],
    () => brandsAPI.getBrand(user!.brand_id!),
    {
      enabled: !!user?.brand_id,
    }
  );

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: isLoadingSubscription } = useQuery<SubscriptionStatus>(
    'subscription-status',
    billingAPI.getSubscriptionStatus,
    {
      enabled: !!user,
    }
  );

  const [formData, setFormData] = useState({
    name: brand?.name || '',
    description: brand?.description || '',
    industry: brand?.industry || '',
    subtype: brand?.subtype || '',
    logo: brand?.logo || null,
    is_active: brand?.is_active ?? true,
  });

  // Update form data when brand loads
  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        description: brand.description,
        industry: brand.industry || '',
        subtype: brand.subtype || '',
        logo: brand.logo,
        is_active: brand.is_active,
      });
    }
  }, [brand]);

  const updateMutation = useMutation(
    (data: Partial<Brand>) => brandsAPI.updateBrand(user!.brand_id!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brand', user?.brand_id]);
        queryClient.invalidateQueries('brands');
        setSuccess('Account settings saved successfully');
        setError(null);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Failed to save settings');
        setSuccess(null);
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateMutation.mutateAsync(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { portal_url } = await billingAPI.createPortalSession();
      window.location.href = portal_url;
    } catch (err: any) {
      setError('Unable to open billing portal. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      ACTIVE: { color: 'green', label: 'Active' },
      TRIALING: { color: 'blue', label: 'Trial' },
      PAST_DUE: { color: 'yellow', label: 'Past Due' },
      CANCELED: { color: 'red', label: 'Canceled' },
      INCOMPLETE: { color: 'gray', label: 'Incomplete' },
      UNPAID: { color: 'red', label: 'Unpaid' },
    };
    return statusMap[status] || { color: 'gray', label: status };
  };

  if (!user?.brand_id) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Brand Associated</h1>
          <p className="text-gray-600">Your account is not associated with a brand.</p>
        </div>
      </div>
    );
  }

  if (isLoading || isLoadingSubscription) {
    return (
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading account settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Building2 className="w-8 h-8 text-teal-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-gray-600">Manage your brand configuration and settings</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-4 mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit}>
            {/* Brand Information */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Settings className="w-5 h-5 text-gray-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Brand Information</h2>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g. Acme Restaurants"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value, subtype: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select an industry</option>
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="RETAIL">Retail</option>
                    <option value="HOSPITALITY">Hospitality</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {formData.industry && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type
                    </label>
                    <select
                      value={formData.subtype}
                      onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Select a business type</option>
                      {formData.industry === 'RESTAURANT' && (
                        <>
                          <option value="QSR">Quick Service / Fast Food</option>
                          <option value="FAST_CASUAL">Fast Casual</option>
                          <option value="CASUAL_DINING">Casual Dining</option>
                          <option value="FINE_DINING">Fine Dining</option>
                          <option value="CAFE">Cafe / Coffee Shop</option>
                          <option value="BAR_PUB">Bar / Pub</option>
                          <option value="FOOD_TRUCK">Food Truck</option>
                          <option value="CATERING">Catering</option>
                          <option value="BAKERY">Bakery / Dessert Shop</option>
                        </>
                      )}
                      {formData.industry === 'RETAIL' && (
                        <>
                          <option value="GROCERY">Grocery Store</option>
                          <option value="CONVENIENCE">Convenience Store</option>
                          <option value="FASHION">Fashion Retail</option>
                          <option value="OTHER_SUBTYPE">Other Retail</option>
                        </>
                      )}
                      {formData.industry === 'HOSPITALITY' && (
                        <>
                          <option value="HOTEL">Hotel</option>
                          <option value="OTHER_SUBTYPE">Other Hospitality</option>
                        </>
                      )}
                      {formData.industry === 'OTHER' && (
                        <option value="OTHER_SUBTYPE">Other</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Your micro-check templates are customized based on this type
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Brief description of your brand"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Inactive brands cannot create new inspections or micro-checks
                  </p>
                </div>
              </div>
            </div>

            {/* Brand Statistics */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <Shield className="w-5 h-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Stores</p>
                      <p className="text-2xl font-bold text-gray-900">{brand?.stores_count || 0}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-teal-600" />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Subscription</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subscriptionStatus?.subscription?.plan_details.name ||
                         (subscriptionStatus?.is_trial ? 'Trial' :
                          (brand?.has_enterprise_access ? 'Enterprise' : 'Standard'))}
                      </p>
                    </div>
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                        <p className="text-lg font-semibold text-green-600">
                          {subscriptionStatus?.subscription
                            ? getStatusBadge(subscriptionStatus.subscription.status).label
                            : (formData.is_active ? 'Active' : 'Inactive')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              {subscriptionStatus?.subscription && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Subscription Details</h3>
                    <button
                      onClick={handleManageSubscription}
                      className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      Manage Billing
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Store Count</p>
                      <p className="font-medium text-gray-900">{subscriptionStatus.subscription.store_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Price</p>
                      <p className="font-medium text-gray-900">
                        ${subscriptionStatus.subscription.plan_details.price_monthly}/month
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Period</p>
                      <p className="font-medium text-gray-900">
                        {new Date(subscriptionStatus.subscription.current_period_start).toLocaleDateString()} -{' '}
                        {new Date(subscriptionStatus.subscription.current_period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Next Billing Date</p>
                      <p className="font-medium text-gray-900">
                        {subscriptionStatus.subscription.cancel_at_period_end
                          ? 'Cancels at period end'
                          : new Date(subscriptionStatus.subscription.current_period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {subscriptionStatus.subscription.cancel_at_period_end && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Your subscription will be canceled on{' '}
                        {new Date(subscriptionStatus.subscription.current_period_end).toLocaleDateString()}.
                        You can reactivate it anytime before then.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {brand?.created_at && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Account created: <span className="font-medium text-gray-900">
                      {new Date(brand.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Trial Status Section */}
            {user?.is_trial_user && (
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center mb-6">
                  <Crown className="w-5 h-5 text-teal-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Trial Status</h2>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-200 p-6">
                    <div className="flex items-center mb-4">
                      <Crown className="w-8 h-8 text-teal-600 mr-3" />
                      <h3 className="text-lg font-semibold text-gray-900">Free Trial Active</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-3xl font-bold text-teal-600 mb-1">
                          {user?.trial_status?.days_remaining || 0}
                        </div>
                        <div className="text-gray-600">Days remaining</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900 mb-1">Full Access</div>
                        <div className="text-gray-600">All features unlocked</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-teal-600 text-white rounded-xl p-6">
                    <h4 className="font-semibold mb-2">Ready to continue?</h4>
                    <p className="text-teal-100 mb-4">
                      Keep using PeakOps with unlimited micro-checks and unlock enterprise features.
                    </p>
                    <button
                      onClick={() => navigate('/checkout')}
                      className="px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                      View Plans
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Changes to your brand settings will affect all users and stores in your organization.
            Contact support if you need to upgrade your plan or make changes to enterprise features.
          </p>
        </div>
      </div>
    </div>
  );
}

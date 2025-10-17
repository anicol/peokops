import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Loader2, AlertCircle } from 'lucide-react';
import { API_CONFIG } from '@/config/api';
import { Toast } from '@/components/Toast';

export default function OnboardingContactPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Redirect if previous steps not completed
    const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');
    if (!onboardingData.industry) {
      navigate('/start');
    }
  }, [navigate]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async () => {
    setError('');

    // Validate email (required)
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate phone number if provided (optional for now)
    const cleanedPhone = phone.replace(/\D/g, '');
    if (phone && cleanedPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number or leave it blank');
      return;
    }

    setIsLoading(true);

    try {
      const onboardingData = JSON.parse(sessionStorage.getItem('onboarding') || '{}');

      // Call quick-signup API
      const response = await fetch(`${API_CONFIG.baseURL}/auth/quick-signup/`, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({
          phone: cleanedPhone ? `+1${cleanedPhone}` : '+10000000000', // Placeholder if no phone provided
          email: email,
          store_name: onboardingData.storeName || 'Your Store',
          industry: onboardingData.industry,
          focus_areas: onboardingData.focus_areas || []
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Check if this is an existing user
        if (data.existing_user) {
          // Existing user - show toast and keep them on the page
          // They need to use the magic link from their email to log in
          setShowToast(true);
          setIsLoading(false);
        } else {
          // New user - store tokens and onboarding data, then go to dashboard
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);

          sessionStorage.setItem('onboarding', JSON.stringify({
            ...onboardingData,
            phone,
            email,
            userId: data.user_id,
            magicToken: data.magic_token,
            smsSent: data.sms_sent
          }));

          window.location.href = '/dashboard';
        }
        return;
      } else {
        setError(data.error || data.phone?.[0] || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toast
        open={showToast}
        onOpenChange={setShowToast}
        title="Magic Link Sent!"
        description="We've sent a new access link to your email. Click the link in your email to access your account."
        variant="success"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-6">Step 3 of 4</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 text-center">
            Where should we send your daily checks?
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            We'll email your first 3 checks — no login required
          </p>

          {/* Email input (required) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 focus:outline-none transition-all"
                autoFocus
                required
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              📧 We'll send your checks here
            </p>
          </div>

          {/* Phone input (optional) */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (optional)
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 focus:outline-none transition-all"
                maxLength={14}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              📱 For future SMS notifications (you can add this later)
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !email}
            className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Creating Your Checks...
              </>
            ) : (
              'Send My Checks'
            )}
          </button>

          {/* Back link */}
          <button
            onClick={() => navigate('/start/store-name')}
            className="w-full mt-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            disabled={isLoading}
          >
            ← Back
          </button>
        </div>
        </div>
      </div>
    </>
  );
}

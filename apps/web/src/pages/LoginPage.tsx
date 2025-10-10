import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { API_CONFIG, API_ENDPOINTS } from '@/config/api';

interface TrialSignupData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

const Login = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Check for trial mode from URL parameters
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'trial') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Handle signup
        const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.auth.trialSignup}`, {
          method: 'POST',
          headers: API_CONFIG.headers,
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Store tokens and trigger auth state update
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);

          setSuccess(true);

          // Redirect to welcome page after brief success message
          setTimeout(() => {
            window.location.href = '/welcome';
          }, 1500);
        } else {
          setError(data.email?.[0] || data.password?.[0] || 'Failed to create account');
        }
      } else {
        // Handle login
        await login({ username: email, password });
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to PeakOps!</h2>
            <p className="text-gray-600 mb-4">Your trial account has been created successfully.</p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Setting up your demo experience...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="flex items-center justify-center space-x-2">
            <img src="/logo.png" alt="PeakOps" className="w-10 h-10" />
            <span className="text-2xl font-bold text-gray-900">PeakOps</span>
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Start Your Free Trial — Build Confidence in 7 Days' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600">
              {isSignUp
                ? 'Experience how PeakOps helps your team stay inspection-ready — without inspectors, stress, or setup'
                : 'Sign in to your PeakOps account'
              }
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="manager@yourstore.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  required
                  minLength={isSignUp ? 8 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-teal-900 mb-1">Free Trial Includes:</div>
                    <ul className="text-teal-800 space-y-1">
                      <li>✓ Unlimited coaching runs for 7 days</li>
                      <li>✓ Instant AI feedback and private scorecards</li>
                      <li>✓ Videos deleted automatically after processing</li>
                      <li>✓ No credit card required</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Start Free Trial' : 'Sign In'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>

            {/* Forgot Password */}
            {!isSignUp && (
              <div className="text-center">
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot your password?
                </a>
              </div>
            )}
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                {isSignUp ? 'Sign In' : 'Start Free Trial'}
              </button>
            </p>
          </div>

          {/* SSO Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-5 h-5 bg-blue-600 rounded mr-2 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">M</span>
                </div>
                <span className="text-sm font-medium text-gray-700">Microsoft</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>
            By signing up, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
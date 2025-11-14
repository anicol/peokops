import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, X, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const PasswordSetupBanner: React.FC = () => {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    const dismissed = sessionStorage.getItem('password-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('password-banner-dismissed', 'true');
    setIsDismissed(true);
  };

  // Don't show banner if:
  // - User has already set their password
  // - Banner has been dismissed this session
  // - User data not loaded yet
  if (!user || user.password_set_by_user_at || isDismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <KeyRound className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-yellow-800 font-medium">
                Secure your account with your own password
              </p>
              <p className="mt-1 text-sm text-yellow-700">
                For security, we recommend setting your own password instead of using the one provided during setup.
              </p>
              <div className="mt-3">
                <Link
                  to="/profile?tab=password"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                >
                  Set Your Password
                </Link>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-4 flex-shrink-0 inline-flex text-yellow-700 hover:text-yellow-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 rounded-md p-1"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordSetupBanner;

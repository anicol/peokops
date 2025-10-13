import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, CheckCircle, Smartphone } from 'lucide-react';

export default function ChecksSentPage() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>({});

  useEffect(() => {
    // Load onboarding data
    const data = JSON.parse(sessionStorage.getItem('onboarding') || '{}');

    if (!data.userId || !data.magicToken) {
      // Redirect if onboarding not completed
      navigate('/start');
      return;
    }

    setOnboardingData(data);

    // Trigger confetti animation
    setTimeout(() => setShowConfetti(true), 300);

    // Clean up session storage after 30 seconds
    setTimeout(() => {
      sessionStorage.removeItem('onboarding');
    }, 30000);
  }, [navigate]);

  const handleOpenChecks = () => {
    // Navigate to magic link check page
    if (onboardingData.magicToken) {
      navigate(`/check/${onboardingData.magicToken}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="confetti-container absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-2xl w-full relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center">
          {/* Success icon with animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce-slow">
                <MessageCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center animate-ping-slow">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Main message */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            ✨ Text sent!
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            Check your phone to start
          </p>

          {onboardingData.phone && (
            <p className="text-gray-600 mb-8">
              Sent to <span className="font-semibold">{onboardingData.phone}</span>
            </p>
          )}

          {/* Preview card */}
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6 mb-8 border-2 border-teal-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Smartphone className="w-10 h-10 text-teal-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Your first 3 checks are ready:
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Takes under 2 minutes</li>
                  <li>✓ No login required</li>
                  <li>✓ Just tap the link</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {onboardingData.magicToken && (
              <button
                onClick={handleOpenChecks}
                className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                Open Checks Now
              </button>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              Go to Dashboard →
            </button>
          </div>

          {/* Help text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Didn't get the text?</strong>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Check your phone for a message from PeakOps. It may take a minute to arrive.
            </p>
            {onboardingData.email && (
              <p className="text-sm text-gray-500 mt-2">
                We also sent a backup link to <span className="font-medium">{onboardingData.email}</span>
              </p>
            )}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span>Account created</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span>Checks ready</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span>SMS sent</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 3s linear forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}

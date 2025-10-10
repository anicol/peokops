import { useNavigate, useSearchParams } from 'react-router-dom';
import { Flame, CheckCircle, ArrowRight, Settings } from 'lucide-react';

export default function FirstChecksCelebrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusAreas = searchParams.get('focus') || 'your operations';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce-slow">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          </div>
          {/* Celebration rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-emerald-300 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>

        {/* Header with Emoji */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
          🎉 You're Done!
        </h1>

        {/* Subheader */}
        <p className="text-lg sm:text-xl text-gray-700 font-medium mb-3">
          That's what consistency feels like.
        </p>

        {/* Description */}
        <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
          You just completed 3 quick checks focused on{' '}
          <span className="font-semibold text-emerald-700">{focusAreas}</span>.
          <br />
          <br />
          Tomorrow, your Guide will send 3 more to keep your store inspection-ready.
        </p>

        {/* Streak Badge */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border-2 border-emerald-200">
          <div className="flex items-center justify-center mb-4">
            <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500 mr-3" />
            <div className="text-left">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">Day 1</p>
              <p className="text-sm sm:text-base text-gray-600">Streak Started!</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Complete tomorrow's checks to keep your streak alive
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center mb-4"
        >
          Continue to Dashboard
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>

        {/* Secondary CTA */}
        <button
          onClick={() => navigate('/onboarding')}
          className="w-full py-3 bg-white text-emerald-700 border-2 border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors font-medium flex items-center justify-center"
        >
          <Settings className="mr-2 w-4 h-4" />
          Adjust Focus Areas
        </button>

        {/* Info Banner */}
        <div className="mt-8 sm:mt-12 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm text-teal-800">
            <span className="font-semibold">Pro tip:</span> Set a daily reminder for the same time each day to build your consistency habit.
          </p>
        </div>
      </div>
    </div>
  );
}

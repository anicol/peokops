import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';

export default function TrialWelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
          <Target className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
        </div>

        {/* Header */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
          Welcome to PeakOps
        </h1>

        {/* Subheader */}
        <p className="text-lg sm:text-xl text-gray-700 mb-3 sm:mb-4 font-medium">
          Your AI Guide for daily excellence
        </p>

        {/* Description */}
        <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-12 max-w-md mx-auto">
          You'll get three quick checks a day to keep every shift consistent.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/onboarding')}
          className="inline-flex items-center justify-center px-8 py-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Let's Go
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>

        {/* Trust indicators */}
        <div className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 text-sm text-gray-500">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-teal-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>90 seconds to setup</span>
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-teal-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No credit card required</span>
          </div>
        </div>
      </div>
    </div>
  );
}

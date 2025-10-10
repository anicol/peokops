import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface FixDecisionBannerProps {
  onContinue: () => void;
  onFixNow: () => void;
  remainingChecks: number;
}

const FixDecisionBanner: React.FC<FixDecisionBannerProps> = ({
  onContinue,
  onFixNow,
  remainingChecks,
}) => {
  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
      <div className="flex items-start mb-4">
        <AlertTriangle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Issue Noted
          </h3>
          <p className="text-gray-700">
            You can fix this after finishing your {remainingChecks} remaining check{remainingChecks !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Primary CTA - Continue Checks */}
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-md"
        >
          <CheckCircle className="w-6 h-6 mr-3" />
          Continue Checks
        </button>

        {/* Secondary CTA - Fix Now */}
        <button
          onClick={onFixNow}
          className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
        >
          Fix It Now
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Recommended: Complete all checks for maximum streak progress
      </p>
    </div>
  );
};

export default FixDecisionBanner;

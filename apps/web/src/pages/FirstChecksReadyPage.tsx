import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { microCheckAPI } from '@/services/api';

interface TodayCheck {
  id: string;
  title: string;
  description: string;
  category: string;
}

export default function FirstChecksReadyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checks, setChecks] = useState<TodayCheck[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChecks = async () => {
      try {
        const data = await microCheckAPI.getTodayChecks();
        setChecks(data.checks || []);
        setFocusAreas(data.personalization?.focus_areas || []);
      } catch (err: any) {
        console.error('Error fetching today checks:', err);
        setError('Unable to load your checks. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchChecks();
  }, []);

  const handleStartChecks = async () => {
    setCreating(true);
    try {
      // Create a run for these checks with the store name (or empty if skipped)
      const run = await microCheckAPI.createFirstTrialRun(storeName.trim() || undefined);

      // Navigate to micro-check page with the run's magic link token and firstTrial flag
      navigate(`/micro-check?token=${run.magic_link_token}&firstTrial=true`);
    } catch (err: any) {
      console.error('Error creating run:', err);
      setError('Unable to start checks. Please try again.');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Preparing your checks...</p>
        </div>
      </div>
    );
  }

  if (error || checks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-200 p-6 sm:p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-600 mb-6">{error || 'No checks available yet.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const focusAreasText = focusAreas.length > 0
    ? focusAreas.map(area => area.replace(/_/g, ' ')).join(', ')
    : 'your operations';

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && storeName.trim()) {
      handleStartChecks();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
            Your first 3 micro-checks are ready
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-lg mx-auto">
            We picked them based on your focus on{' '}
            <span className="font-semibold text-teal-700">{focusAreasText}</span>. Let's get started.
          </p>
        </div>

        {/* Inline Store Field (Compact Top Bar) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-5 mb-5 sm:mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store or location name <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Downtown Café, Store #42"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Used to personalize your streaks and reports.
          </p>
        </div>

        {/* Checks List (Condensed Card Style) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-5 sm:mb-6">
          <div className="divide-y divide-gray-100">
            {checks.map((check, index) => (
              <div
                key={check.id}
                className="flex items-start p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">
                    {check.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                    {check.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Estimated time inline */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center text-xs sm:text-sm text-gray-600">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            About 1 minute total
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStartChecks}
          disabled={creating}
          className="w-full py-3.5 sm:py-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Starting...
            </>
          ) : (
            <>
              Start My 3 Checks
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </>
          )}
        </button>
        {!storeName.trim() && !creating && (
          <p className="text-center text-xs text-gray-400 mt-2.5">
            You can add your store name later in settings
          </p>
        )}
      </div>
    </div>
  );
}

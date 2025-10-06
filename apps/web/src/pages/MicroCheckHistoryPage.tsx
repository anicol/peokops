import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Target,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Award,
  Filter,
  Loader2,
} from 'lucide-react';
import { microCheckAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { MicroCheckResponse, MicroCheckStreak } from '@/types/microCheck';

const MicroCheckHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30days');
  const [responses, setResponses] = useState<MicroCheckResponse[]>([]);
  const [streaks, setStreaks] = useState<MicroCheckStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingRun, setCreatingRun] = useState(false);

  // Get user's store (for now, assume first managed store or user's store)
  const storeId = user?.store || 1; // TODO: Handle multiple stores

  useEffect(() => {
    fetchData();
  }, [storeId, timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [responsesData, streaksData] = await Promise.all([
        microCheckAPI.getResponses(storeId),
        microCheckAPI.getStreaks(storeId),
      ]);
      setResponses(responsesData);
      setStreaks(streaksData);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError('Unable to load history');
    } finally {
      setLoading(false);
    }
  };

  // Group responses by date (local_completed_date)
  const groupedByDate = responses.reduce((acc, response) => {
    const date = response.local_completed_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(response);
    return acc;
  }, {} as Record<string, MicroCheckResponse[]>);

  // Convert to sessions array
  const sessions = Object.entries(groupedByDate)
    .map(([date, sessionResponses]) => {
      const totalChecks = sessionResponses.length;
      const passed = sessionResponses.filter((r) => r.status === 'PASS').length;
      const fixed = sessionResponses.filter((r) => r.status === 'FAIL').length;
      const firstResponse = sessionResponses[0];

      return {
        date,
        time: new Date(firstResponse.completed_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalChecks,
        passed,
        fixed,
        checks: sessionResponses,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getSuccessRate = () => {
    const totalChecks = responses.length;
    const totalPassed = responses.filter((r) => r.status === 'PASS').length;
    return totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;
  };

  const currentStreak = streaks[0]?.current_streak || 0;
  const maxStreak = streaks[0]?.longest_streak || 0;

  const handleStartCheck = async () => {
    setCreatingRun(true);
    try {
      const { token } = await microCheckAPI.createInstantRun(storeId);
      navigate(`/micro-check?token=${token}`);
    } catch (err: any) {
      console.error('Error creating run:', err);
      setError('Unable to create check run. Please try again.');
    } finally {
      setCreatingRun(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load History</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show simplified empty state when no sessions exist
  if (sessions.length === 0) {
    return (
      <div className="p-4 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Quick Checks</h1>
            <p className="text-gray-600">Track your daily quick checks and improvement streaks.</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Check Sessions Yet</h3>
            <p className="text-gray-600 mb-6">
              Start your first quick check to begin tracking your progress and building streaks.
            </p>
            <button
              onClick={handleStartCheck}
              disabled={creatingRun}
              className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingRun ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Run Your First Check'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quick Checks</h1>
          <p className="text-gray-600">Track your daily quick checks and improvement streaks.</p>
        </div>
        <button
          onClick={handleStartCheck}
          disabled={creatingRun}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creatingRun ? (
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </span>
          ) : (
            "Run Today's Checks"
          )}
        </button>
      </div>

      <div className="max-w-7xl">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-6 lg:order-1 order-2">
            {/* Performance Summary */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl shadow-lg border border-teal-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-teal-600 mb-1">{currentStreak}</div>
                  <div className="text-sm text-gray-600">Current Streak</div>
                  <div className="text-xs text-teal-600 mt-1">Days in a row</div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">{getSuccessRate()}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                  <div className="text-xs text-green-600 mt-1">Checks passed</div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{sessions.length}</div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                  <div className="text-xs text-blue-600 mt-1">Completed</div>
                </div>
              </div>
            </div>

            {/* Streak Achievement */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-200 p-6">
              <div className="flex items-center mb-4">
                <Award className="w-6 h-6 text-orange-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Achievement</h3>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-lg font-bold text-orange-600 mb-1">{maxStreak} Day Record</div>
                <div className="text-sm text-gray-600">Your longest streak</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Filter className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Filters</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Micro-Check Tips</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Do them at the same time each day</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Be honest about what needs fixing</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Build the habit - consistency matters</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 lg:order-2 order-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                  <h2 className="text-xl font-semibold text-gray-900">Micro-Check Sessions</h2>
                  <div className="text-sm text-gray-600">{sessions.length} sessions completed</div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {sessions.map((session, sessionIdx) => (
                  <div key={sessionIdx} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-4 lg:space-y-0">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Target className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 mb-1">
                            {formatDate(session.date)} Morning Check
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {session.time}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              ~2 min
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end space-x-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{session.passed}</div>
                          <div className="text-xs text-gray-600">Passed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">{session.fixed}</div>
                          <div className="text-xs text-gray-600">Fixed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round((session.passed / session.totalChecks) * 100)}%
                          </div>
                          <div className="text-xs text-gray-600">Success</div>
                        </div>
                      </div>
                    </div>

                    {/* Check Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {session.checks.map((check) => (
                        <div
                          key={check.id}
                          className={`p-3 rounded-lg border ${
                            check.status === 'PASS'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            {check.status === 'PASS' ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-orange-600 mr-2 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {check.category_display}
                            </span>
                          </div>
                          {check.notes && <p className="text-xs text-gray-600 ml-6">{check.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicroCheckHistoryPage;

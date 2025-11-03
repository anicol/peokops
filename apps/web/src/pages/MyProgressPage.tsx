import { useQuery } from 'react-query';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Flame, TrendingUp, CheckCircle, Target, Award, Calendar } from 'lucide-react';
import { InspectionStats } from '@/types';

export default function MyProgressPage() {
  const { user } = useAuth();

  // Fetch user stats
  const { data: stats, isLoading } = useQuery<InspectionStats>(
    'my-progress-stats',
    async () => {
      const response = await api.get('/inspections/stats/');
      return response.data;
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading your progress...</div>
      </div>
    );
  }

  const streakDays = stats?.streak_days || 0;
  const runsThisWeek = stats?.runs_this_week || 0;
  const runsLastWeek = stats?.runs_last_week || 0;
  const issuesResolved = stats?.issues_resolved_this_week || 0;
  const totalChecks = stats?.completed_inspections || 0;
  const avgScore = stats?.average_score || 0;

  // Calculate progress percentage (out of 7 days for a week)
  const weeklyProgress = Math.min((runsThisWeek / 7) * 100, 100);

  // Calculate week-over-week change
  const weekOverWeekChange = runsLastWeek > 0
    ? Math.round(((runsThisWeek - runsLastWeek) / runsLastWeek) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your improvements and build better habits
        </p>
      </div>

      {/* Streak Card */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-md p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Flame className="w-6 h-6" />
              <span className="text-lg font-semibold">Current Streak</span>
            </div>
            <div className="text-5xl font-bold">{streakDays}</div>
            <div className="text-orange-100 mt-1">
              {streakDays === 1 ? 'day' : 'days'} in a row
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-orange-100 mb-1">Personal Best</div>
            <div className="text-3xl font-bold">{Math.max(streakDays, 0)}</div>
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">This Week</h2>
          </div>
          {weekOverWeekChange !== 0 && (
            <div className={`flex items-center space-x-1 text-sm ${weekOverWeekChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4" />
              <span>{weekOverWeekChange > 0 ? '+' : ''}{weekOverWeekChange}% vs last week</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Daily Checks</span>
            <span>{runsThisWeek} / 7 days</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{runsThisWeek}</div>
            <div className="text-xs text-gray-500">Checks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{issuesResolved}</div>
            <div className="text-xs text-gray-500">Issues Resolved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{avgScore.toFixed(0)}%</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Award className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-900">Milestones</h2>
        </div>

        <div className="space-y-3">
          <div className={`flex items-center space-x-3 p-3 rounded-lg ${totalChecks >= 1 ? 'bg-green-50' : 'bg-gray-50'}`}>
            <CheckCircle className={`w-5 h-5 ${totalChecks >= 1 ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`flex-1 ${totalChecks >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
              Complete your first check
            </span>
            {totalChecks >= 1 && <span className="text-sm text-green-600 font-medium">✓ Done</span>}
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-lg ${streakDays >= 3 ? 'bg-green-50' : 'bg-gray-50'}`}>
            <CheckCircle className={`w-5 h-5 ${streakDays >= 3 ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`flex-1 ${streakDays >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>
              Build a 3-day streak
            </span>
            {streakDays >= 3 && <span className="text-sm text-green-600 font-medium">✓ Done</span>}
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-lg ${streakDays >= 7 ? 'bg-green-50' : 'bg-gray-50'}`}>
            <CheckCircle className={`w-5 h-5 ${streakDays >= 7 ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`flex-1 ${streakDays >= 7 ? 'text-gray-900' : 'text-gray-400'}`}>
              Maintain a 7-day streak
            </span>
            {streakDays >= 7 && <span className="text-sm text-green-600 font-medium">✓ Done</span>}
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-lg ${totalChecks >= 10 ? 'bg-green-50' : 'bg-gray-50'}`}>
            <CheckCircle className={`w-5 h-5 ${totalChecks >= 10 ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`flex-1 ${totalChecks >= 10 ? 'text-gray-900' : 'text-gray-400'}`}>
              Complete 10 checks
            </span>
            {totalChecks >= 10 && <span className="text-sm text-green-600 font-medium">✓ Done</span>}
          </div>
        </div>
      </div>

      {/* Next Goals */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-3">
          <Target className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-blue-900">Keep Going!</h2>
        </div>
        <p className="text-blue-700">
          {streakDays === 0 && "Start your journey by completing your first check today."}
          {streakDays > 0 && streakDays < 3 && "You're building momentum! Complete today's check to keep your streak alive."}
          {streakDays >= 3 && streakDays < 7 && "Great work! Keep going to reach a 7-day streak."}
          {streakDays >= 7 && "Incredible! You've built a solid habit. Keep it up!"}
        </p>
      </div>
    </div>
  );
}

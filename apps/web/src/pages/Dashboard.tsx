import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link, useNavigate } from 'react-router-dom';
import { inspectionsAPI, videosAPI, microCheckAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { useSmartNudges } from '@/hooks/useSmartNudges';
import InspectorQueueWidget from '@/components/InspectorQueueWidget';
import { SmartNudgeContainer } from '@/components/nudges/SmartNudgeNotification';
import TrialStatusBanner from '@/components/TrialStatusBanner';
import {
  Play,
  TrendingUp,
  CheckCircle,
  Target,
  Award,
  ArrowRight,
  Calendar,
  BarChart3,
  Users,
  Settings,
  Zap,
  Clock,
  FileText,
  Building2,
  AlertTriangle,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  // Behavior tracking and smart nudges
  const { trackDashboardView } = useBehaviorTracking();
  const { nudges, handleNudgeAction, dismissNudge } = useSmartNudges();

  // Removed old onboarding redirect - users now go straight to dashboard after signup

  // Track dashboard view on mount
  useEffect(() => {
    if (user) {
      trackDashboardView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { data: stats } = useQuery('inspection-stats', inspectionsAPI.getStats);

  const { data: recentVideos } = useQuery(
    'recent-videos',
    () => videosAPI.getVideos({ ordering: '-created_at', limit: 5 })
  );

  const { data: recentInspections } = useQuery(
    'recent-inspections',
    () => inspectionsAPI.getInspections({ ordering: '-created_at', limit: 5 })
  );

  const { data: microCheckRuns } = useQuery(
    'recent-micro-checks',
    () => user?.store ? microCheckAPI.getRuns(user.store) : Promise.resolve([]),
    {
      enabled: !!user?.store,
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Don't refetch on every window focus
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  const { data: allResponses } = useQuery(
    'all-micro-check-responses',
    () => user?.store ? microCheckAPI.getResponses(user.store) : Promise.resolve([]),
    {
      enabled: !!user?.store,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  const { data: dashboardStats } = useQuery(
    ['dashboard-stats', user?.store],
    () => user?.store ? microCheckAPI.getDashboardStats(user.store) : Promise.resolve(null),
    {
      enabled: !!user?.store,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  // Removed demo screen - users go straight to dashboard after new signup flow

  // Determine user type
  const isEnterprise = user?.role === 'ADMIN' || user?.role === 'INSPECTOR';
  const isCoaching = user?.role === 'OWNER' || user?.role === 'GM';
  const isTrial = user?.is_trial_user;

  // Render appropriate dashboard based on role
  if (isEnterprise) {
    return <EnterpriseDashboard user={user} stats={stats} dashboardStats={dashboardStats} recentInspections={recentInspections} nudges={nudges} handleNudgeAction={handleNudgeAction} dismissNudge={dismissNudge} />;
  } else if (isCoaching && !isTrial) {
    return <CoachingDashboard user={user} stats={stats} dashboardStats={dashboardStats} recentVideos={recentVideos} microCheckRuns={microCheckRuns} nudges={nudges} handleNudgeAction={handleNudgeAction} dismissNudge={dismissNudge} />;
  } else {
    return <TrialDashboard user={user} stats={stats} dashboardStats={dashboardStats} microCheckRuns={microCheckRuns} allResponses={allResponses} nudges={nudges} handleNudgeAction={handleNudgeAction} dismissNudge={dismissNudge} />;
  }
}

// Trial User Dashboard
function TrialDashboard({ user, stats, dashboardStats, microCheckRuns, allResponses, nudges, handleNudgeAction, dismissNudge }: any) {
  const navigate = useNavigate();
  const [creatingRun, setCreatingRun] = useState(false);

  const yesterdayScore = dashboardStats?.yesterday_score ?? stats?.yesterday_score ?? null;
  const todayScore = dashboardStats?.today_score ?? stats?.today_score ?? dashboardStats?.average_score ?? stats?.average_score ?? null;
  const streakDays = dashboardStats?.user_streak?.current_streak ?? 0;
  const runsThisWeek = dashboardStats?.runs_this_week ?? 0;
  const runsLastWeek = dashboardStats?.runs_last_week ?? 0;
  const issuesResolved = dashboardStats?.issues_resolved_this_week ?? 0;
  const avgScore = dashboardStats?.average_score ?? stats?.average_score ?? null;

  const handleRunCheck = async () => {
    setCreatingRun(true);
    try {
      const { token } = await microCheckAPI.createInstantRun(user?.store);
      navigate(`/micro-check?token=${token}`);
    } catch (err: any) {
      console.error('Error creating run:', err);
      alert('Unable to create check run. Please try again.');
    } finally {
      setCreatingRun(false);
    }
  };

  return (
    <div className="px-1 py-3 sm:p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl text-white p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <h2 className="text-2xl font-bold mb-2">Today's Status</h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-200">Yesterday:</span>
                  <span className="text-2xl font-bold">{yesterdayScore !== null ? `${Math.round(yesterdayScore)}%` : 'N/A'}</span>
                </div>
                {todayScore !== null && yesterdayScore !== null && todayScore >= yesterdayScore && (
                  <TrendingUp className="w-6 h-6 text-green-300" />
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-blue-200">Today:</span>
                  <span className="text-3xl font-bold text-green-300">{todayScore !== null ? `${Math.round(todayScore)}%` : 'N/A'}</span>
                </div>
              </div>
              {todayScore !== null && yesterdayScore !== null && todayScore >= yesterdayScore ? (
                <p className="text-blue-100 mt-2">You're trending upward — nice work!</p>
              ) : todayScore !== null ? (
                <p className="text-blue-100 mt-2">Complete more checks to track your progress</p>
              ) : (
                <p className="text-blue-100 mt-2">Run your first check to see your score!</p>
              )}
            </div>

            <button
              onClick={handleRunCheck}
              disabled={creatingRun}
              className="bg-white text-blue-600 px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold text-base lg:text-lg hover:bg-gray-100 transition-colors shadow-lg flex items-center justify-center w-full lg:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingRun ? (
                <>
                  <Clock className="w-6 h-6 mr-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-3" />
                  Run New Check
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <SmartNudgeContainer
        nudges={nudges}
        onDismiss={dismissNudge}
        onAction={handleNudgeAction}
      />

      <TrialStatusBanner
        onUpgradeClick={() => console.log('Navigate to upgrade page')}
      />

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-4 sm:mt-6 lg:mt-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Streak Card - Duolingo Style */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 sm:p-4 lg:p-6 rounded-2xl shadow-lg border-2 border-orange-200">
              <div className="flex items-center mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-xl sm:text-2xl">🔥</span>
                </div>
                <h3 className="ml-2 sm:ml-3 font-bold text-gray-900 text-base sm:text-lg">Streak</h3>
              </div>
              <div className="text-center mt-3 sm:mt-4">
                <div className="text-4xl sm:text-5xl font-bold text-orange-600 mb-0.5 sm:mb-1">{streakDays}</div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium">Days in a row</div>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-2 sm:mt-3">
                  Keep it up! Daily checks build great habits.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-4 lg:p-6 rounded-2xl shadow-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-blue-900 tabular-nums">{runsThisWeek}</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Runs This Week</h3>
              <p className="text-xs sm:text-sm text-gray-700">+{runsThisWeek - runsLastWeek} from last week</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 sm:p-4 lg:p-6 rounded-2xl shadow-lg border-2 border-green-200">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-green-900 tabular-nums">{issuesResolved}</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Issues Resolved</h3>
              <p className="text-xs sm:text-sm text-gray-700">This week</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 sm:p-4 lg:p-6 rounded-2xl shadow-lg border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-purple-900 tabular-nums">{avgScore}%</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Avg Score</h3>
              <p className="text-xs sm:text-sm text-gray-700">Last 7 days</p>
            </div>
          </div>

          {/* Recent Checks */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Checks</h3>
                <Link to="/micro-check-history" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All
                </Link>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {microCheckRuns?.sort((a: any, b: any) => {
                const aDate = new Date(a.completed_at || a.scheduled_for);
                const bDate = new Date(b.completed_at || b.scheduled_for);
                return bDate.getTime() - aDate.getTime(); // Latest first
              }).slice(0, 5).map((run: any) => {
                const isCompleted = run.status === 'COMPLETED';
                const completionDate = run.completed_at || run.scheduled_for;
                const itemCount = run.items?.length || 0;
                const completedCount = run.completed_count || 0;

                // Get responses for this run
                const runResponses = allResponses?.filter((r: any) => r.run === run.id) || [];
                const passedCount = runResponses.filter((r: any) => r.status === 'PASS').length;
                const failedCount = runResponses.filter((r: any) => r.status === 'FAIL').length;

                // Calculate relative time
                const getRelativeTime = (dateStr: string) => {
                  const date = new Date(dateStr);
                  const now = new Date();
                  const diffMs = now.getTime() - date.getTime();
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                  if (diffMins < 1) return 'Just now';
                  if (diffMins < 60) return `${diffMins} min ago`;
                  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                  if (diffDays === 1) return 'Yesterday';
                  return `${diffDays} days ago`;
                };

                return (
                  <Link key={run.id} to={`/micro-check/run/${run.id}`} className="block p-3 sm:p-4 lg:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${isCompleted ? 'bg-green-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <span className={`${isCompleted ? 'text-green-600' : 'text-blue-600'} font-bold text-base sm:text-lg`}>
                            {isCompleted ? '✓' : itemCount}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm sm:text-base">
                            {new Date(completionDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })} Checks
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            {isCompleted ? getRelativeTime(run.completed_at) : `${completedCount}/${itemCount} items completed`}
                          </div>
                        </div>
                      </div>

                      {/* Stats - Fixed width columns for alignment */}
                      {isCompleted && (
                        <div className="flex items-center space-x-3 sm:space-x-6 mr-2 sm:mr-4">
                          <div className="text-center w-12 sm:w-16">
                            <div className="text-base sm:text-lg font-bold text-green-600 tabular-nums">{passedCount}</div>
                            <div className="text-[10px] sm:text-xs text-gray-500">Passed</div>
                          </div>
                          <div className="text-center w-12 sm:w-16">
                            <div className="text-base sm:text-lg font-bold text-red-600 tabular-nums">{failedCount}</div>
                            <div className="text-[10px] sm:text-xs text-gray-500">Failed</div>
                          </div>
                          <div className="text-center w-12 sm:w-16">
                            <div className="text-base sm:text-lg font-bold text-blue-600 tabular-nums">
                              {Math.round((passedCount / (passedCount + failedCount)) * 100)}%
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500">Score</div>
                          </div>
                        </div>
                      )}

                      <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
              {(!microCheckRuns || microCheckRuns.length === 0) && (
                <div className="p-3 sm:p-4 lg:p-6 text-center text-gray-500 text-sm sm:text-base">No checks completed yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Daily Tip */}
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl border border-teal-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Daily Tip</h3>
            </div>
            <p className="text-gray-700 text-sm mb-4">
              "2-minute checks = never fail an audit."
            </p>
            <p className="text-xs text-gray-600">
              Daily quick checks help you catch issues before they become problems during official inspections.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3 sm:p-4 lg:p-6">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 sm:mb-3 lg:mb-4">Quick Actions</h3>
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={handleRunCheck}
                disabled={creatingRun}
                className="flex items-center p-2.5 sm:p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingRun ? (
                  <>
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 sm:mr-3 animate-spin" />
                    <span className="font-medium text-blue-900 text-sm sm:text-base">Creating...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 sm:mr-3" />
                    <span className="font-medium text-blue-900 text-sm sm:text-base">Run New Check</span>
                  </>
                )}
              </button>

              <Link
                to="/actions"
                className="flex items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mr-2 sm:mr-3" />
                <span className="font-medium text-gray-900 text-sm sm:text-base">View Action Items</span>
              </Link>

              <Link
                to="/micro-check-history"
                className="flex items-center p-2.5 sm:p-3 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 mr-2 sm:mr-3" />
                <span className="font-medium text-teal-900 text-sm sm:text-base">Quick Checks</span>
              </Link>

              <Link
                to="/users"
                className="flex items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mr-2 sm:mr-3" />
                <span className="font-medium text-gray-900 text-sm sm:text-base">Invite Team</span>
              </Link>
            </div>
          </div>

          {/* Trial Status */}
          {user?.trial_status && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3 sm:p-4 lg:p-6">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 sm:mb-3 lg:mb-4">Trial Status</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Days Used</span>
                    <span className="font-medium">
                      {7 - (user.trial_status.days_remaining || 7)} of 7
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full"
                      style={{ width: `${((7 - (user.trial_status.days_remaining || 7)) / 7) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="mb-2">
                    You have <strong>{user.trial_status.days_remaining || 7} days</strong> left in your free trial.
                  </p>
                  <p>Unlimited checks during trial!</p>
                </div>

                <button className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm">
                  Upgrade for Team Insights
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Coaching Mode Dashboard
function CoachingDashboard({ user, stats, dashboardStats, recentVideos, microCheckRuns, nudges, handleNudgeAction, dismissNudge }: any) {
  const avgStoreScore = dashboardStats?.average_score ?? stats?.average_score ?? null;
  const openIssues = stats?.open_action_items ?? 0;
  const checksToday = stats?.completion_rate ?? 0;

  const avgStreakAcrossStores = dashboardStats?.store_streak?.current_streak ?? 0;
  const totalRunsThisWeek = dashboardStats?.runs_this_week ?? 0;
  const runsLastWeek = dashboardStats?.runs_last_week ?? 0;
  const issuesResolved = dashboardStats?.issues_resolved_this_week ?? 0;
  const topCategory = stats?.top_performing_category ?? 'N/A';
  const topCategoryImprovement = stats?.top_category_improvement ?? 0;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-white p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            <div className="mb-6 lg:mb-0">
              <h2 className="text-2xl font-bold mb-3">Your Brand at a Glance</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-indigo-200">Avg Store Score</div>
                  <div className="text-2xl font-bold">{avgStoreScore !== null ? `${Math.round(avgStoreScore)}%` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-indigo-200">Open Issues</div>
                  <div className="text-2xl font-bold">{openIssues}</div>
                </div>
                <div>
                  <div className="text-indigo-200">Checks Today</div>
                  <div className="text-2xl font-bold">{checksToday}%</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
              <Link
                to="/micro-check-history"
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Run Check
              </Link>
              <Link
                to="/coaching/trends"
                className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-400 transition-colors flex items-center justify-center"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Team Insights
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SmartNudgeContainer
        nudges={nudges}
        onDismiss={dismissNudge}
        onAction={handleNudgeAction}
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{avgStreakAcrossStores}</span>
              </div>
              <h3 className="font-semibold text-gray-900">Avg Streak Across Stores</h3>
              <p className="text-sm text-gray-600">Days</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{totalRunsThisWeek}</span>
              </div>
              <h3 className="font-semibold text-gray-900">Total Runs This Week</h3>
              <p className="text-sm text-green-600">+{Math.round(((totalRunsThisWeek - runsLastWeek) / runsLastWeek) * 100)}%</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{issuesResolved}</span>
              </div>
              <h3 className="font-semibold text-gray-900">Issues Resolved</h3>
              <p className="text-sm text-gray-600">This week</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-lg font-bold text-gray-900">{topCategory}</span>
              </div>
              <h3 className="font-semibold text-gray-900">Top Performing Category</h3>
              <p className="text-sm text-green-600">↑ {topCategoryImprovement}%</p>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {microCheckRuns?.slice(0, 5).map((run: any) => (
                <div key={run.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 ${run.passed ? 'bg-green-100' : 'bg-yellow-100'} rounded-lg flex items-center justify-center`}>
                      {run.passed ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{run.template_title}</div>
                      <div className="text-sm text-gray-600">{run.store_name || user?.store_name} • {new Date(run.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`text-sm font-medium ${run.passed ? 'text-green-600' : 'text-yellow-600'}`}>
                      {run.passed ? '✅ Fixed' : '⚠️ Needs Attention'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Coach Insight */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">AI Insight</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              "Stores completing 3+ checks per day resolve issues 2× faster."
            </p>
            <p className="text-xs text-gray-600">
              Keep encouraging your team to maintain daily check routines for best results.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/micro-check-history" className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <Play className="w-5 h-5 text-green-600 mr-3" />
                <span className="font-medium text-green-900">Run New Check</span>
              </Link>
              <Link to="/micro-check-templates" className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <Settings className="w-5 h-5 text-purple-600 mr-3" />
                <span className="font-medium text-purple-900">Manage Templates</span>
              </Link>
              <Link to="/actions" className="flex items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <Target className="w-5 h-5 text-orange-600 mr-3" />
                <span className="font-medium text-orange-900">View Open Fixes</span>
              </Link>
              <Link to="/users" className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Users className="w-5 h-5 text-blue-600 mr-3" />
                <span className="font-medium text-blue-900">Invite Team Member</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enterprise Dashboard
function EnterpriseDashboard({ user, stats, dashboardStats, recentInspections, nudges, handleNudgeAction, dismissNudge }: any) {
  const totalStores = stats?.total_stores ?? 0;
  const activeToday = stats?.active_stores_today ?? 0;
  const avgCompliance = dashboardStats?.average_score ?? stats?.average_score ?? null;
  const criticalFindings = stats?.critical_findings ?? 0;
  const openActions = stats?.open_action_items ?? 0;

  const completionRate = stats?.completion_rate ?? 0;
  const templateCoverage = stats?.template_coverage ?? 0;
  const avgResolutionTime = stats?.avg_resolution_time_days ?? 0;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl text-white p-6 lg:p-8">
          <h2 className="text-2xl font-bold mb-4">Brand Performance Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-gray-300">Total Stores</div>
              <div className="text-2xl font-bold">{totalStores}</div>
            </div>
            <div>
              <div className="text-gray-300">Active Today</div>
              <div className="text-2xl font-bold text-green-400">{activeToday}</div>
            </div>
            <div>
              <div className="text-gray-300">Avg Compliance</div>
              <div className="text-2xl font-bold">{avgCompliance !== null ? `${Math.round(avgCompliance)}%` : 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-300">Critical Findings</div>
              <div className="text-2xl font-bold text-red-400">{criticalFindings}</div>
            </div>
            <div>
              <div className="text-gray-300">Open Actions</div>
              <div className="text-2xl font-bold text-yellow-400">{openActions}</div>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/enterprise/reports"
              className="bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg inline-flex items-center"
            >
              <FileText className="w-5 h-5 mr-2" />
              View Enterprise Dashboard
            </Link>
          </div>
        </div>
      </div>

      <SmartNudgeContainer
        nudges={nudges}
        onDismiss={dismissNudge}
        onAction={handleNudgeAction}
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Score & Coverage Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
              <div className="text-sm text-gray-600 mt-1">Completion Rate</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{criticalFindings}</div>
              <div className="text-sm text-gray-600 mt-1">Critical Findings</div>
              <div className="text-xs text-green-600 mt-1">↓ 2 vs last week</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{templateCoverage}%</div>
              <div className="text-sm text-gray-600 mt-1">Template Coverage</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{avgResolutionTime}</div>
              <div className="text-sm text-gray-600 mt-1">Avg Resolution (days)</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-6 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Store 321 — missed 2 checks</div>
                    <div className="text-sm text-gray-600">2 hours ago</div>
                  </div>
                </div>
              </div>
              <div className="p-6 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">District 4 — 98% compliance this week 🎯</div>
                    <div className="text-sm text-gray-600">5 hours ago</div>
                  </div>
                </div>
              </div>
              <div className="p-6 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Video audit flagged potential cross-contamination ⚠️</div>
                    <div className="text-sm text-gray-600">1 day ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <InspectorQueueWidget />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Analyst Highlight */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Risk & Compliance</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              "Analyst flagged 2 stores below threshold."
            </p>
            <p className="text-xs text-gray-600">
              Stores #321 and #458 need immediate attention. Recommended: assign district manager for site visit.
            </p>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-3">
              <Link to="/micro-check-templates" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings className="w-5 h-5 text-gray-600 mr-3" />
                <span className="font-medium text-gray-900">Manage Templates</span>
              </Link>
              <Link to="/enterprise/reports" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <BarChart3 className="w-5 h-5 text-gray-600 mr-3" />
                <span className="font-medium text-gray-900">View Reports</span>
              </Link>
              <Link to="/enterprise/reports" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <FileText className="w-5 h-5 text-gray-600 mr-3" />
                <span className="font-medium text-gray-900">Export CAPA Summary</span>
              </Link>
              <Link to="/admin/users" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Users className="w-5 h-5 text-gray-600 mr-3" />
                <span className="font-medium text-gray-900">Manage Users & Roles</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

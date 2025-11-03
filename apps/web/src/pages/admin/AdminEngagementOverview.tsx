import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { adminAnalyticsAPI } from '@/services/api';
import { KPICard } from '@/components/admin/KPICard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Users,
  CheckCircle,
  Flame,
  BarChart3,
  Camera,
  Clock,
  Store,
  Star,
  TrendingUp,
  Mail,
  Eye,
} from 'lucide-react';

export function AdminEngagementOverview() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin-analytics', 'overview'],
    queryFn: adminAnalyticsAPI.getOverview,
  });

  const { data: timeOfDay } = useQuery({
    queryKey: ['admin-analytics', 'time-of-day'],
    queryFn: adminAnalyticsAPI.getTimeOfDayActivity,
  });

  const { data: storesList } = useQuery({
    queryKey: ['admin-analytics', 'stores'],
    queryFn: adminAnalyticsAPI.getStoresList,
  });

  const { data: reviewAnalytics } = useQuery({
    queryKey: ['admin-analytics', 'review-analysis'],
    queryFn: adminAnalyticsAPI.getReviewAnalysisOverview,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-1 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Engagement Overview
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track customer engagement with micro-checks across all stores
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <KPICard
            title="Active Stores (Today)"
            value={`${overview.active_stores.today.percentage}%`}
            subtitle={`${overview.active_stores.today.count} of ${overview.active_stores.today.total} stores`}
            icon={<BarChart3 className="w-5 h-5" />}
          />

          <KPICard
            title="Active Stores (7 Days)"
            value={`${overview.active_stores.week.percentage}%`}
            subtitle={`${overview.active_stores.week.count} of ${overview.active_stores.week.total} stores`}
            icon={<BarChart3 className="w-5 h-5" />}
          />

          <KPICard
            title="Daily Active Managers"
            value={overview.dau.today}
            subtitle="Unique users today"
            trend={
              overview.dau.change !== 0
                ? {
                    direction: overview.dau.change > 0 ? 'up' : 'down',
                    value: Math.abs(overview.dau.change),
                    isPositive: true,
                  }
                : undefined
            }
            icon={<Users className="w-5 h-5" />}
          />

          <KPICard
            title="Average Streak"
            value={overview.average_streak.current}
            subtitle={`Longest: ${overview.average_streak.longest} days`}
            icon={<Flame className="w-5 h-5" />}
          />

          <KPICard
            title="Completion Rate"
            value={`${overview.completion_rate}%`}
            subtitle="Last 7 days"
            icon={<CheckCircle className="w-5 h-5" />}
          />

          <KPICard
            title="Photo Rate"
            value={`${overview.photo_rate}%`}
            subtitle="Responses with media"
            icon={<Camera className="w-5 h-5" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Engagement Funnel */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Engagement Funnel (30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overview.engagement_funnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {overview.engagement_funnel.map((stage: any) => (
                <div key={stage.stage} className="flex justify-between text-sm">
                  <span className="text-gray-600">{stage.stage}</span>
                  <span className="font-medium text-gray-900">
                    {stage.count} ({stage.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Failing Categories */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Failing Categories
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={overview.top_failing_categories}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="fail_rate" fill="#ef4444" name="Fail Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Time of Day Activity */}
          {timeOfDay && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Time of Day Activity
                </h2>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  Peak: {timeOfDay.peak_activity.hour} ({timeOfDay.peak_activity.count}{' '}
                  completions)
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeOfDay.hourly_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 12 }}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="completions"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Google Reviews Analysis Section */}
        {reviewAnalytics && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Star className="w-6 h-6 mr-2 text-yellow-500" />
                Google Reviews Analysis - Prospect Engagement
              </h2>
            </div>

            {/* Review Analytics KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KPICard
                title="Total Analyses (30d)"
                value={reviewAnalytics.total_analyses}
                subtitle={`${reviewAnalytics.status_breakdown.completed} completed`}
                icon={<BarChart3 className="w-5 h-5" />}
              />

              <KPICard
                title="Email Capture Rate"
                value={`${reviewAnalytics.email_capture_rate}%`}
                subtitle="Prospects shared email"
                icon={<Mail className="w-5 h-5" />}
              />

              <KPICard
                title="View Rate"
                value={`${reviewAnalytics.view_rate}%`}
                subtitle="Analyses viewed"
                icon={<Eye className="w-5 h-5" />}
              />

              <KPICard
                title="Conversion Rate"
                value={`${reviewAnalytics.conversion_rate}%`}
                subtitle={reviewAnalytics.avg_hours_to_conversion
                  ? `Avg: ${Math.round(reviewAnalytics.avg_hours_to_conversion)}h to convert`
                  : 'To trial signup'}
                icon={<TrendingUp className="w-5 h-5" />}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Conversion Funnel */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Review Analysis Conversion Funnel
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reviewAnalytics.conversion_funnel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {reviewAnalytics.conversion_funnel.map((stage: any) => (
                    <div key={stage.stage} className="flex justify-between text-sm">
                      <span className="text-gray-600">{stage.stage}</span>
                      <span className="font-medium text-gray-900">
                        {stage.count} ({stage.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Analysis Status Breakdown
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Completed</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {reviewAnalytics.status_breakdown.completed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Processing</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {reviewAnalytics.status_breakdown.processing}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {reviewAnalytics.status_breakdown.pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Failed</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {reviewAnalytics.status_breakdown.failed}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Review Analyses
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Last 20 prospect submissions
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Business
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Rating
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Reviews
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Viewed
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Converted
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reviewAnalytics.recent_activity.map((analysis: any) => (
                      <tr
                        key={analysis.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.open(`/review-analysis/${analysis.id}`, '_blank')}
                        title="Click to view full analysis"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {analysis.business_name}
                          </div>
                          <div className="text-xs text-gray-500">{analysis.location}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              analysis.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : analysis.status === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-800'
                                : analysis.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {analysis.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {analysis.google_rating ? `${analysis.google_rating} ⭐` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {analysis.reviews_analyzed || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {analysis.contact_email ? (
                            <Mail className="w-4 h-4 mx-auto text-green-600" />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {analysis.viewed_at ? (
                            <Eye className="w-4 h-4 mx-auto text-blue-600" />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {analysis.converted_to_trial ? (
                            <CheckCircle className="w-4 h-4 mx-auto text-green-600" />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Stores Table */}
        {storesList && storesList.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Store className="w-5 h-5 mr-2" />
                Store Performance
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Click any store to view detailed analytics
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Store
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Streak
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Completion Rate (7d)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Activity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {storesList.map((store: any) => (
                    <tr
                      key={store.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.location.href = `/admin/stores/${store.id}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/stores/${store.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                        >
                          {store.name}
                        </Link>
                        <p className="text-xs text-gray-500">{store.region}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            store.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : store.status === 'sporadic'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {store.status === 'active' ? '🟢 Active' : store.status === 'sporadic' ? '🟡 Sporadic' : '🔴 Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end">
                          <Flame className="w-4 h-4 mr-1 text-orange-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {store.current_streak}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-900">
                          {store.completion_rate_7d}%
                        </span>
                        <p className="text-xs text-gray-500">
                          {store.completed_runs_7d}/{store.total_runs_7d}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {store.last_completion_date
                          ? new Date(store.last_completion_date).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

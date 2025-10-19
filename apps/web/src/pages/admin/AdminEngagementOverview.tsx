import { useQuery } from 'react-query';
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
      </div>
    </div>
  );
}

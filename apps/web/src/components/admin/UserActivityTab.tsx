import { useState } from 'react';
import { useQuery } from 'react-query';
import { userActivityAPI } from '@/services/api';
import { KPICard } from '@/components/admin/KPICard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Users,
  Activity,
  MousePointerClick,
  TrendingUp,
  CheckCircle,
  FileText,
  BarChart3,
  MessageCircle,
  Settings,
  Image,
} from 'lucide-react';

interface UserActivityTabProps {
  defaultDays?: number;
}

export function UserActivityTab({ defaultDays = 30 }: UserActivityTabProps) {
  const [timeRange, setTimeRange] = useState(defaultDays);
  const [timelineGranularity, setTimelineGranularity] = useState<'hour' | 'day'>('day');
  const [selectedEventType, setSelectedEventType] = useState<string | undefined>();

  // Fetch overview metrics
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['user-activity', 'overview', timeRange],
    queryFn: () => userActivityAPI.getOverview(timeRange),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch timeline data
  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['user-activity', 'timeline', timeRange, timelineGranularity],
    queryFn: () => userActivityAPI.getTimeline(timeRange, timelineGranularity),
    refetchInterval: 30000,
  });

  // Fetch feature breakdown
  const { data: featureData, isLoading: featureLoading } = useQuery({
    queryKey: ['user-activity', 'by-feature', timeRange],
    queryFn: () => userActivityAPI.getByFeature(timeRange),
    refetchInterval: 30000,
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: recentLoading } = useQuery({
    queryKey: ['user-activity', 'recent', selectedEventType],
    queryFn: () => userActivityAPI.getRecent(50, selectedEventType),
    refetchInterval: 10000, // More frequent updates for activity feed
  });

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading user activity data...</div>
      </div>
    );
  }

  if (!overview) return null;

  // Prepare feature breakdown data for chart
  const featureChartData = featureData
    ? Object.entries(featureData.features).map(([category, stats]: [string, any]) => ({
        category,
        events: stats.total_events,
        users: stats.unique_users,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Customer User Activity</h2>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Daily Active Users"
          value={overview.dau}
          subtitle="Last 24 hours"
          icon={<Users className="w-5 h-5" />}
        />

        <KPICard
          title="Weekly Active Users"
          value={overview.wau}
          subtitle="Last 7 days"
          icon={<Activity className="w-5 h-5" />}
        />

        <KPICard
          title="Monthly Active Users"
          value={overview.mau}
          subtitle={`Last ${timeRange} days`}
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <KPICard
          title="Avg Events Per User"
          value={overview.avg_events_per_user}
          subtitle={`Total: ${overview.total_events.toLocaleString()}`}
          icon={<MousePointerClick className="w-5 h-5" />}
        />
      </div>

      {/* Feature Adoption Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Adoption</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {overview.feature_adoption.micro_checks}%
              </div>
              <div className="text-xs text-blue-700 mt-1">Micro-Checks</div>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>

          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {overview.feature_adoption.employee_voice}%
              </div>
              <div className="text-xs text-purple-700 mt-1">Employee Voice</div>
            </div>
            <MessageCircle className="w-8 h-8 text-purple-500" />
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <div className="text-2xl font-bold text-green-900">
                {overview.feature_adoption.templates}%
              </div>
              <div className="text-xs text-green-700 mt-1">Templates</div>
            </div>
            <FileText className="w-8 h-8 text-green-500" />
          </div>

          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div>
              <div className="text-2xl font-bold text-orange-900">
                {overview.feature_adoption.analytics}%
              </div>
              <div className="text-xs text-orange-700 mt-1">Analytics</div>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
            <select
              value={timelineGranularity}
              onChange={(e) => setTimelineGranularity(e.target.value as 'hour' | 'day')}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
            </select>
          </div>

          {timelineLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-gray-400">Loading timeline...</div>
            </div>
          ) : timeline && timeline.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return timelineGranularity === 'hour'
                      ? date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
                      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any, name: string) => [
                    value,
                    name === 'event_count' ? 'Events' : 'Users',
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="event_count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Events"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="unique_users"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Unique Users"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No timeline data available
            </div>
          )}
        </div>

        {/* Top Events */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Events</h3>
          <div className="space-y-3">
            {overview.top_events.slice(0, 10).map((event: any, index: number) => (
              <div key={event.event_type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-6">#{index + 1}</span>
                  <span className="text-sm text-gray-700">{event.event_type.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {event.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Usage Breakdown */}
        {featureChartData.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="events" fill="#3b82f6" name="Total Events" />
                <Bar yAxisId="right" dataKey="users" fill="#8b5cf6" name="Unique Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity Feed</h3>
              <p className="text-sm text-gray-600 mt-1">Last 50 customer user actions</p>
            </div>
            <select
              value={selectedEventType || ''}
              onChange={(e) => setSelectedEventType(e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Events</option>
              <option value="PAGE_VIEW">Page Views</option>
              <option value="CHECK_COMPLETED">Check Completed</option>
              <option value="PULSE_CREATED">Pulse Created</option>
              <option value="TEMPLATE_SELECTED">Template Selected</option>
              <option value="AI_GENERATION_USED">AI Generation</option>
              <option value="EXPORT_CLICKED">Exports</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {recentLoading ? (
            <div className="p-8 text-center text-gray-400">Loading activity...</div>
          ) : recentActivity && recentActivity.events.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Store
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentActivity.events.map((event: any) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{event.user.username}</div>
                      <div className="text-xs text-gray-500">{event.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {event.user.account || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {event.user.store || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(event.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">No activity data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

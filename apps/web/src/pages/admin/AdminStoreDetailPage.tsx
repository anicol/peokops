import { useQuery } from 'react-query';
import { useParams, Link } from 'react-router-dom';
import { adminAnalyticsAPI } from '@/services/api';
import { KPICard } from '@/components/admin/KPICard';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Flame,
  CheckCircle,
  Camera,
  Clock,
  ArrowLeft,
} from 'lucide-react';

export function AdminStoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();

  const { data: storeDetail, isLoading } = useQuery({
    queryKey: ['admin-analytics', 'store-detail', storeId],
    queryFn: () => adminAnalyticsAPI.getStoreDetail(Number(storeId)),
    enabled: !!storeId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading store analytics...</div>
      </div>
    );
  }

  if (!storeDetail) return null;

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return 'bg-green-500';
      case 'medium':
        return 'bg-green-300';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-1 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link
            to="/admin/engagement"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Overview
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {storeDetail.store.name}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {storeDetail.store.region} • {storeDetail.store.brand_name}
          </p>
        </div>

        {/* Store Stats KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <KPICard
            title="Current Streak"
            value={storeDetail.stats.current_streak}
            subtitle="consecutive days"
            icon={<Flame className="w-5 h-5" />}
          />

          <KPICard
            title="Total Completions"
            value={storeDetail.stats.total_completions}
            subtitle="all time"
            icon={<CheckCircle className="w-5 h-5" />}
          />

          <KPICard
            title="Photo Rate"
            value={`${storeDetail.stats.photo_rate}%`}
            subtitle="with media attached"
            icon={<Camera className="w-5 h-5" />}
          />

          <KPICard
            title="Avg Completion Time"
            value={
              storeDetail.stats.avg_completion_time_minutes
                ? `${storeDetail.stats.avg_completion_time_minutes}m`
                : 'N/A'
            }
            subtitle="per check"
            icon={<Clock className="w-5 h-5" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* 7-Day Completion Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              7-Day Completion Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={storeDetail.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(date: string) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="completions"
                  fill="#3b82f6"
                  name="Completions"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pass_rate"
                  stroke="#10b981"
                  name="Pass Rate %"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Common Failures */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Common "Needs Fix" Templates
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {storeDetail.common_failures.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No failures in the last 30 days
                </p>
              ) : (
                storeDetail.common_failures.map((failure: any) => (
                  <div
                    key={failure.template_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {failure.title}
                      </p>
                      <p className="text-xs text-gray-500">{failure.category}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-lg font-bold text-red-600">
                        {failure.fail_count}
                      </p>
                      <p className="text-xs text-gray-500">failures</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 30-Day Streak Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            30-Day Activity Calendar
          </h2>
          <div className="grid grid-cols-10 sm:grid-cols-15 gap-1 sm:gap-2">
            {storeDetail.streak_calendar.map((day: any, index: number) => (
              <div
                key={index}
                className={`aspect-square rounded ${getIntensityColor(
                  day.intensity
                )} flex items-center justify-center group relative`}
                title={`${day.date}: ${day.completions} completion${
                  day.completions !== 1 ? 's' : ''
                }`}
              >
                <span className="text-xs font-medium text-gray-700">
                  {day.completions > 0 ? day.completions : ''}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                  {new Date(day.date).toLocaleDateString()}: {day.completions}{' '}
                  completion{day.completions !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end mt-4 space-x-4 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-100 rounded mr-1"></div>
              <span>None</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-300 rounded mr-1"></div>
              <span>1-2</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
              <span>3+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

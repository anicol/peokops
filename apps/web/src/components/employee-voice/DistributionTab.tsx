import { useQuery } from 'react-query';
import { employeeVoiceAPI } from '@/services/api';
import { Clock, Users, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DistributionTabProps {
  pulseId: string;
}

export default function DistributionTab({ pulseId }: DistributionTabProps) {
  // Fetch all distribution data
  const { data: preview } = useQuery(
    ['distribution-preview', pulseId],
    () => employeeVoiceAPI.getDistributionPreview(pulseId)
  );

  const { data: scheduled } = useQuery(
    ['scheduled-invitations', pulseId],
    () => employeeVoiceAPI.getScheduledInvitations(pulseId),
    { refetchInterval: 30000 } // Refresh every 30s
  );

  const { data: eligibility } = useQuery(
    ['eligible-employees', pulseId],
    () => employeeVoiceAPI.getEligibleEmployees(pulseId)
  );

  const { data: stats } = useQuery(
    ['distribution-stats', pulseId],
    () => employeeVoiceAPI.getDistributionStats(pulseId)
  );

  // Group scheduled invitations by hour
  const groupedScheduled = scheduled?.reduce((acc: any, inv: any) => {
    const time = format(new Date(inv.scheduled_send_at), 'MMM d, ha');
    if (!acc[time]) acc[time] = [];
    acc[time].push(inv);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {/* Distribution Settings Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Frequency
            </label>
            <div className="text-2xl font-bold text-blue-600">
              {preview?.delivery_frequency || 'MEDIUM'}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              ~{preview?.expected_daily_sends || 0} employees/day
              ({preview?.send_probability_pct || 0}% of {preview?.total_eligible_employees || 0} eligible)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Window
            </label>
            <div className="text-2xl font-bold text-purple-600">
              {preview?.shift_window_display || 'N/A'}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Randomized over {preview?.randomization_window_minutes || 60} minutes
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Today's Scheduled
            </label>
            <div className="text-2xl font-bold text-green-600">
              {preview?.today_scheduled_count || 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Invitations created today
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Invitations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Scheduled Invitations</h3>
            <p className="text-sm text-gray-500 mt-1">Auto-scheduled for Opening Shift (6-8 AM)</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{scheduled?.length || 0}</div>
            <div className="text-xs text-gray-500">scheduled</div>
          </div>
        </div>

        {scheduled && scheduled.length > 0 ? (
          <div className="space-y-1">
            {Object.entries(groupedScheduled).map(([time, invitations]: [string, any]) => {
              const sendDate = new Date((invitations as any[])[0].scheduled_send_at);
              const now = new Date();
              const daysUntil = Math.ceil((sendDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const relativeTime = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;

              return (
                <div key={time} className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-20">
                    <div className="text-xs font-medium text-blue-600">{relativeTime}</div>
                    <div className="text-xs text-gray-500">{time}</div>
                  </div>

                  {/* Count Badge */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                      {invitations.length}
                    </div>
                  </div>

                  {/* Recipients */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {invitations.slice(0, 4).map((inv: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          <span className="font-semibold">{inv.employee_name || 'Unknown'}</span>
                          {inv.employee_role && (
                            <span className="text-gray-500">· {inv.employee_role}</span>
                          )}
                        </span>
                      ))}
                      {invitations.length > 4 && (
                        <span className="text-xs text-gray-500">
                          +{invitations.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time Icon */}
                  <div className="flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No invitations currently scheduled</p>
            <p className="text-xs text-gray-400 mt-1">
              Invitations are scheduled daily at 2:00 AM UTC
            </p>
          </div>
        )}
      </div>

      {/* Employee Eligibility */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Employee Eligibility</h3>
          <div className="text-3xl font-bold text-blue-600">
            {eligibility?.total_eligible || 0}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Employees from 7shifts with phone numbers
        </p>

        {/* Eligibility Criteria */}
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Active in 7shifts</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Has phone number</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Assigned to this account</span>
          </div>
        </div>

        {/* Sample Employee List */}
        {eligibility?.employees && eligibility.employees.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Employees</h4>
            <div className="space-y-2">
              {eligibility.employees.slice(0, 5).map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                    <span className="text-gray-500 ml-2">{emp.phone}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {emp.roles?.join(', ') || 'Employee'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Distribution Timeline (Last 7 Days) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution Timeline (Last 7 Days)</h3>

        {stats?.daily_stats && stats.daily_stats.length > 0 ? (
          <>
            <div className="space-y-2 mb-6">
              {stats.daily_stats.map((day: any) => {
                const total = day.scheduled + day.sent + day.opened + day.completed;
                const maxCount = preview?.total_eligible_employees || total;

                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">
                      {format(new Date(day.date), 'MMM d')}
                    </div>
                    <div className="flex-1 flex gap-1 h-8">
                      {day.scheduled > 0 && (
                        <div
                          className="bg-gray-200 flex items-center justify-center text-xs px-2"
                          style={{ width: `${(day.scheduled / maxCount) * 100}%`, minWidth: '40px' }}
                          title={`${day.scheduled} scheduled`}
                        >
                          {day.scheduled}
                        </div>
                      )}
                      {day.sent > 0 && (
                        <div
                          className="bg-blue-200 flex items-center justify-center text-xs px-2"
                          style={{ width: `${(day.sent / maxCount) * 100}%`, minWidth: '40px' }}
                          title={`${day.sent} sent`}
                        >
                          {day.sent}
                        </div>
                      )}
                      {day.completed > 0 && (
                        <div
                          className="bg-green-200 flex items-center justify-center text-xs px-2"
                          style={{ width: `${(day.completed / maxCount) * 100}%`, minWidth: '40px' }}
                          title={`${day.completed} completed`}
                        >
                          {day.completed}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">Avg Response Rate</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avg_response_rate_7d}%
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">Total Sent (7d)</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total_sent_7d}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">Total Completed (7d)</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.total_completed_7d}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No distribution data yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Data will appear after invitations are sent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

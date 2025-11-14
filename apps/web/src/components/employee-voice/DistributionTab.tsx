import { useQuery, useMutation, useQueryClient } from 'react-query';
import { employeeVoiceAPI } from '@/services/api';
import { Calendar, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface DistributionTabProps {
  pulseId: string;
  isActive?: boolean;
}

export default function DistributionTab({ pulseId, isActive = true }: DistributionTabProps) {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch all distribution data
  const { data: preview } = useQuery(
    ['distribution-preview', pulseId],
    () => employeeVoiceAPI.getDistributionPreview(pulseId)
  );

  const { data: eligibility } = useQuery(
    ['eligible-employees', pulseId],
    () => employeeVoiceAPI.getEligibleEmployees(pulseId)
  );

  // Trigger distribution mutation
  const triggerMutation = useMutation(
    () => employeeVoiceAPI.triggerDistribution(pulseId),
    {
      onSuccess: () => {
        // Invalidate all distribution-related queries to refetch
        queryClient.invalidateQueries(['distribution-preview', pulseId]);
        queryClient.invalidateQueries(['eligible-employees', pulseId]);

        // Show success message
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      },
    }
  );

  return (
    <div className="space-y-6">
      {/* Inactive Pulse Warning */}
      {!isActive && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Pulse Survey is Inactive
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Distribution scheduling will not create invitations while the survey is inactive.
                Activate the survey using the toggle at the top of the page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Distribution Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Recalculates the upcoming 7-day schedule based on current rules and eligibility
          </p>
        </div>
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isLoading || !isActive}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!isActive ? 'Activate the pulse survey to refresh distribution' : 'Recalculates the next 7 days of invites based on current eligibility'}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${triggerMutation.isLoading ? 'animate-spin' : ''}`} />
          {triggerMutation.isLoading ? 'Refreshing...' : 'Refresh Distribution'}
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-sm text-green-800">
              Distribution scheduling triggered successfully! Invitations will be updated shortly.
            </p>
          </div>
        </div>
      )}

      {/* Distribution Settings Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Distribution Settings</h3>
        <p className="text-sm text-gray-600 mb-4">
          Employee selection rotates randomly across eligible staff to prevent survey fatigue and keep results fresh and fair.
        </p>
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
              Send times randomized over {preview?.randomization_window_minutes || 60} minutes
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

      {/* 7-Day Distribution Preview */}
      {preview?.seven_day_simulation && preview.seven_day_simulation.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              7-Day Distribution Preview
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Employees rotate daily to avoid fatigue and keep results balanced.
            </p>
          </div>

          <div className="space-y-3">
            {preview.seven_day_simulation.map((day: any, idx: number) => (
              <div
                key={day.date}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-gray-700">
                      {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : day.day_name}
                    </div>
                    <div className="text-xs text-gray-500">{day.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-blue-600">{day.expected_sends}</div>
                    <div className="text-xs text-gray-500">employees</div>
                  </div>
                </div>

                {day.sample_employees && day.sample_employees.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {day.sample_employees.map((emp: any, empIdx: number) => (
                      <span
                        key={empIdx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        {emp.name}
                        {emp.role && <span className="ml-1 text-blue-600">· {emp.role}</span>}
                        <span className="ml-1 text-blue-500">•••{emp.phone}</span>
                      </span>
                    ))}
                    {day.expected_sends > day.sample_employees.length && (
                      <span className="text-xs text-gray-500">
                        +{day.expected_sends - day.sample_employees.length} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-800">
              This preview shows how surveys are likely to be distributed based on your current settings. Actual employees vary day to day.
            </p>
          </div>
        </div>
      )}

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
    </div>
  );
}

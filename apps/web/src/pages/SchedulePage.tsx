import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Settings,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, startOfDay } from 'date-fns';
import api, { storesAPI } from '@/services/api';
import type { Store } from '@/types';

// Types
interface DeliveryConfig {
  id: string;
  distribution_enabled: boolean;
  send_to_recipients: 'MANAGERS_ONLY' | 'ALL_EMPLOYEES';
  cadence_mode: 'DAILY' | 'RANDOMIZED';
  min_day_gap: number;
  max_day_gap: number;
  randomize_recipients: boolean;
  recipient_percentage: number;
  last_sent_date: string | null;
  next_send_date: string | null;
}

interface SevenShiftsShift {
  id: string;
  employee: string; // UUID of SevenShiftsEmployee
  employee_name: string;
  employee_email: string;
  store_name: string;
  role: string;
  start_time: string;
  end_time: string;
}

interface SevenShiftsConfig {
  is_configured: boolean;
  is_active: boolean;
  enforce_shift_schedule: boolean;
  company_id?: string;
  sync_employees_enabled?: boolean;
  sync_shifts_enabled?: boolean;
  sync_role_names?: string[];
  create_users_without_email?: boolean;
}

interface EmployeeSchedule {
  id: number;
  name: string;
  email: string;
  role: string;
  store_name: string | null;
  last_sent_date: string | null;
  next_send_date: string | null;
  seven_shifts_employee_id: string | null;
}

interface SchedulePreview {
  cadence_mode: 'DAILY' | 'RANDOMIZED';
  employees: EmployeeSchedule[];
}

// API functions
const scheduleAPI = {
  getDeliveryConfig: async (): Promise<DeliveryConfig> => {
    const response = await api.get('/auth/micro-check-config/');
    return response.data;
  },

  updateDeliveryConfig: async (data: Partial<DeliveryConfig>): Promise<DeliveryConfig> => {
    const response = await api.put('/auth/micro-check-config/', data);
    return response.data;
  },

  getSevenShiftsStatus: async (): Promise<SevenShiftsConfig> => {
    const response = await api.get('/integrations/7shifts/status/');
    return response.data;
  },

  getShifts: async (startDate?: string, endDate?: string): Promise<SevenShiftsShift[]> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get('/integrations/7shifts/shifts/', { params });
    return response.data;
  },

  getSchedulePreview: async (): Promise<SchedulePreview> => {
    const response = await api.get('/auth/micro-check-schedule/');
    return response.data;
  },

  updateSevenShiftsConfig: async (data: { enforce_shift_schedule: boolean }): Promise<SevenShiftsConfig> => {
    const response = await api.post('/integrations/7shifts/configure/', data);
    return response.data;
  },
};

export default function SchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [distributionEnabled, setDistributionEnabled] = useState(true);
  const [sendToRecipients, setSendToRecipients] = useState<'MANAGERS_ONLY' | 'ALL_EMPLOYEES'>('MANAGERS_ONLY');
  const [cadenceMode, setCadenceMode] = useState<'DAILY' | 'RANDOMIZED'>('DAILY');
  const [minDayGap, setMinDayGap] = useState(1);
  const [maxDayGap, setMaxDayGap] = useState(3);
  const [enforceSchedule, setEnforceSchedule] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('all'); // 'all' or store name

  // Queries
  const { data: config, isLoading: configLoading } = useQuery(
    'delivery-config',
    scheduleAPI.getDeliveryConfig,
    {
      onSuccess: (data) => {
        setDistributionEnabled(data.distribution_enabled);
        setSendToRecipients(data.send_to_recipients);
        setCadenceMode(data.cadence_mode);
        setMinDayGap(data.min_day_gap);
        setMaxDayGap(data.max_day_gap);
      },
    }
  );

  const { data: sevenShiftsConfig } = useQuery(
    '7shifts-config',
    scheduleAPI.getSevenShiftsStatus,
    {
      retry: false,
      onSuccess: (data) => {
        setEnforceSchedule(data.enforce_shift_schedule ?? false);
      },
    }
  );

  const { data: schedulePreview, isLoading: scheduleLoading } = useQuery(
    'schedule-preview',
    scheduleAPI.getSchedulePreview,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const { data: shifts, isLoading: shiftsLoading } = useQuery(
    '7shifts-shifts',
    () => {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      return scheduleAPI.getShifts(startDate, endDate);
    },
    {
      enabled: sevenShiftsConfig?.is_configured ?? false,
    }
  );

  const { data: stores } = useQuery<Store[]>(
    'stores',
    storesAPI.getStores
  );

  const updateMutation = useMutation(scheduleAPI.updateDeliveryConfig, {
    onSuccess: () => {
      queryClient.invalidateQueries('delivery-config');
      queryClient.invalidateQueries('schedule-preview');
    },
  });

  const updateSevenShiftsMutation = useMutation(scheduleAPI.updateSevenShiftsConfig, {
    onSuccess: () => {
      queryClient.invalidateQueries('7shifts-config');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      distribution_enabled: distributionEnabled,
      send_to_recipients: sendToRecipients,
      cadence_mode: cadenceMode,
      min_day_gap: minDayGap,
      max_day_gap: maxDayGap,
    });
  };

  const handleEnforceScheduleChange = async (checked: boolean) => {
    setEnforceSchedule(checked);

    // Include all existing config values to avoid validation errors
    const updateData: any = {
      enforce_shift_schedule: checked,
    };

    // If we have existing config, include those values
    if (sevenShiftsConfig) {
      updateData.company_id = sevenShiftsConfig.company_id;
      updateData.sync_employees_enabled = sevenShiftsConfig.sync_employees_enabled;
      updateData.sync_shifts_enabled = sevenShiftsConfig.sync_shifts_enabled;
      updateData.sync_role_names = sevenShiftsConfig.sync_role_names;
      updateData.create_users_without_email = sevenShiftsConfig.create_users_without_email;
    }

    updateSevenShiftsMutation.mutate(updateData);
  };

  // Group shifts by date
  const shiftsByDate = shifts?.reduce((acc, shift) => {
    const date = format(new Date(shift.start_time), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, SevenShiftsShift[]>);

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'GM': 'Manager',
      'EMPLOYEE': 'Employee',
      'INSPECTOR': 'Inspector',
      'OWNER': 'Owner',
      'ADMIN': 'Admin',
    };
    return roleMap[role] || role;
  };

  // Generate preview schedule with simulated dates
  const generatePreviewSchedule = () => {
    if (!schedulePreview) {
      return [];
    }

    // Filter employees based on current recipient selection (not saved config)
    let employees = schedulePreview.employees;
    if (sendToRecipients === 'MANAGERS_ONLY') {
      employees = employees.filter(emp => emp.role === 'GM');
    }

    // Filter by selected store
    if (selectedStore !== 'all') {
      employees = employees.filter(emp => emp.store_name === selectedStore);
    }

    // For daily mode, return as-is
    if (cadenceMode === 'DAILY') {
      return employees;
    }

    // Simulate randomized schedules
    return employees.map(employee => {
      // Generate a random gap for this employee
      const randomGap = Math.floor(Math.random() * (maxDayGap - minDayGap + 1)) + minDayGap;
      const today = new Date();
      const nextDate = addDays(today, randomGap);

      return {
        ...employee,
        next_send_date: nextDate.toISOString().split('T')[0],
        last_sent_date: null, // Clear in preview mode
      };
    });
  };

  // Get 7-day calendar view
  const generateCalendarPreview = () => {
    const days = [];
    const today = new Date();
    const employees = generatePreviewSchedule();

    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const dateStr = date.toISOString().split('T')[0];

      // Find employees scheduled for this date
      const scheduledEmployees = employees.filter(emp => {
        if (cadenceMode === 'DAILY') return true;
        return emp.next_send_date === dateStr;
      });

      days.push({
        date,
        dateStr,
        employees: scheduledEmployees,
        count: scheduledEmployees.length,
      });
    }

    return days;
  };

  const displayEmployees = generatePreviewSchedule();
  const calendarDays = generateCalendarPreview();

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading schedule configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Micro Check Config</h1>
        <p className="text-gray-600 mt-1">Configure when and how micro-checks are delivered</p>
      </div>

      {/* Delivery Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Delivery Configuration</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={updateMutation.isLoading}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {updateMutation.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        <div className="space-y-6">
          {/* Distribution Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Micro-Check Distribution</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {distributionEnabled
                    ? 'Distribution is currently active. Micro-checks will be sent according to your schedule.'
                    : 'Distribution is currently paused. No micro-checks will be sent until you enable it.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={distributionEnabled}
              onClick={() => setDistributionEnabled(!distributionEnabled)}
              className={`${
                distributionEnabled ? 'bg-indigo-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
            >
              <span
                aria-hidden="true"
                className={`${
                  distributionEnabled ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Who should receive micro-checks?
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="recipients"
                  value="MANAGERS_ONLY"
                  checked={sendToRecipients === 'MANAGERS_ONLY'}
                  onChange={(e) => setSendToRecipients(e.target.value as 'MANAGERS_ONLY')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">Managers Only</span>
                  <p className="text-xs text-gray-500">Send to managers at each store</p>
                </div>
              </label>
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="recipients"
                  value="ALL_EMPLOYEES"
                  checked={sendToRecipients === 'ALL_EMPLOYEES'}
                  onChange={(e) => setSendToRecipients(e.target.value as 'ALL_EMPLOYEES')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">All Employees</span>
                  <p className="text-xs text-gray-500">Send to all active employees (managers and employees)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Cadence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How often should micro-checks be sent?
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cadence"
                  value="DAILY"
                  checked={cadenceMode === 'DAILY'}
                  onChange={(e) => setCadenceMode(e.target.value as 'DAILY')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">Daily</span>
                  <p className="text-xs text-gray-500">Send micro-checks every day</p>
                </div>
              </label>
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cadence"
                  value="RANDOMIZED"
                  checked={cadenceMode === 'RANDOMIZED'}
                  onChange={(e) => setCadenceMode(e.target.value as 'RANDOMIZED')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">Randomized Schedule</span>
                  <p className="text-xs text-gray-500">Send with random gaps to prevent pattern fatigue</p>
                </div>
              </label>
            </div>

            {/* Randomized Settings */}
            {cadenceMode === 'RANDOMIZED' && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day Gap Range: {minDayGap} - {maxDayGap} days
                  </label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">Minimum</label>
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={minDayGap}
                        onChange={(e) => setMinDayGap(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-600">{minDayGap} day{minDayGap !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">Maximum</label>
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={maxDayGap}
                        onChange={(e) => setMaxDayGap(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-600">{maxDayGap} day{maxDayGap !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 7shifts Integration */}
          {sevenShiftsConfig?.is_configured && sevenShiftsConfig?.is_active && (
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={enforceSchedule}
                  onChange={(e) => handleEnforceScheduleChange(e.target.checked)}
                  disabled={updateSevenShiftsMutation.isLoading}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">
                    Only send when employee is on shift
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Micro-checks will only be sent to employees currently on shift (requires 7shifts integration)
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

      </div>

      {/* Team Distribution */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-indigo-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Team Distribution</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {cadenceMode === 'DAILY' ? 'All eligible employees receive checks daily' : `Each employee scheduled randomly between ${minDayGap}-${maxDayGap} days`}
                </p>
              </div>
            </div>
            {stores && stores.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Store:</label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value="all">All Stores ({stores.length})</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.name}>{store.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {stores && stores.length > 1 && (
            <p className="text-xs text-gray-500 mt-2">
              Configuration applies to {selectedStore === 'all' ? `all ${stores.length} stores` : selectedStore}
            </p>
          )}
        </div>

        {/* 7-Day Calendar View */}
        {cadenceMode === 'RANDOMIZED' && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Next 7 Days</h3>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-3 text-center"
                >
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {format(day.date, 'EEE')}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 mb-2">
                    {format(day.date, 'd')}
                  </div>
                  <div className={`text-xs font-bold ${
                    day.count > 0 ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {day.count} {day.count === 1 ? 'check' : 'checks'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {scheduleLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-sm text-gray-600">Loading schedule...</p>
            </div>
          ) : displayEmployees.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Check
                  </th>
                  {sevenShiftsConfig?.is_configured && sevenShiftsConfig?.is_active && enforceSchedule && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Status
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayEmployees.map((employee) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const nextDate = employee.next_send_date ? new Date(employee.next_send_date) : null;
                  const isToday = nextDate && nextDate.getTime() === today.getTime();
                  const isPast = nextDate && nextDate < today;

                  // Find current shift for this employee using 7shifts employee ID
                  const now = new Date();
                  const sevenShiftsEmployeeId = employee.seven_shifts_employee_id;

                  const currentShift = shifts?.find(shift =>
                    sevenShiftsEmployeeId &&
                    shift.employee === sevenShiftsEmployeeId &&
                    now >= new Date(shift.start_time) &&
                    now <= new Date(shift.end_time)
                  );

                  const upcomingShift = !currentShift && shifts?.find(shift =>
                    sevenShiftsEmployeeId &&
                    shift.employee === sevenShiftsEmployeeId &&
                    new Date(shift.start_time) > now
                  );

                  const hasEmail = !!employee.email;
                  const isOnShiftNow = !!currentShift;
                  const needsShift = enforceSchedule && !isOnShiftNow;
                  const notLinkedTo7Shifts = enforceSchedule && !sevenShiftsEmployeeId;
                  const hasIssues = !hasEmail || (needsShift && isToday) || notLinkedTo7Shifts;

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          {hasEmail ? (
                            employee.email
                          ) : (
                            <span className="text-amber-600 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No email
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{employee.store_name || '—'}</div>
                        <div className="text-xs text-gray-500">{getRoleDisplayName(employee.role)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cadenceMode === 'DAILY' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Daily
                          </span>
                        ) : employee.next_send_date ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {format(new Date(employee.next_send_date), 'MMM d')}
                            </div>
                            {isToday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                                Today
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Not scheduled</span>
                        )}
                      </td>
                      {sevenShiftsConfig?.is_configured && sevenShiftsConfig?.is_active && enforceSchedule && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {currentShift ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Clock className="w-3 h-3 mr-1" />
                                On shift
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Until {format(new Date(currentShift.end_time), 'h:mm a')}
                              </div>
                            </div>
                          ) : upcomingShift ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Upcoming
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {format(new Date(upcomingShift.start_time), 'h:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Off shift
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasIssues ? (
                          <div className="flex flex-col gap-1">
                            {!hasEmail && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                No email
                              </span>
                            )}
                            {notLinkedTo7Shifts && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Not in 7shifts
                              </span>
                            )}
                            {hasEmail && !notLinkedTo7Shifts && needsShift && isToday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Not on shift
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Eligible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No employees found</p>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {updateMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-900">Configuration saved successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Clock,
  Activity,
  AlertTriangle,
  Code,
  Search,
  Building2,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SyncedEmployee {
  id: number;
  name: string;
  email: string;
  location_id?: number;
  data: any;
}

interface SyncedShift {
  id: number;
  user_id: number;
  start: string;
  end: string;
  role: string;
  data: any;
}

interface SevenShiftsSyncLog {
  id: string;
  sync_type: 'EMPLOYEES' | 'SHIFTS' | 'FULL';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  items_synced: number;
  errors_count: number;
  error_details: {
    errors?: string[];
    error?: string;
    synced_employees?: SyncedEmployee[];
    failed_employees?: Array<SyncedEmployee & { error: string }>;
    synced_shifts?: SyncedShift[];
    failed_shifts?: Array<SyncedShift & { error: string }>;
    locations?: any[];
    location_map?: Record<string, string>;
    date_range?: { start: string; end: string };
    summary?: {
      total_fetched: number;
      successfully_synced: number;
      failed: number;
      locations_count?: number;
      days_ahead?: number;
    };
  };
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

const getSyncLog = async (id: string): Promise<SevenShiftsSyncLog> => {
  const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/sync-logs/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch sync logs');
  const logs = await response.json();
  const log = logs.find((l: SevenShiftsSyncLog) => l.id === id);
  if (!log) throw new Error('Sync log not found');
  return log;
};

const retrySync = async (syncType: string) => {
  const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/sync/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sync_type: syncType.toLowerCase() }),
  });
  if (!response.ok) throw new Error('Failed to retry sync');
  return response.json();
};

export default function IntegrationsSyncLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRawJson, setShowRawJson] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<SyncedEmployee | null>(null);
  const [selectedShift, setSelectedShift] = useState<SyncedShift | null>(null);

  const { data: log, isLoading, error } = useQuery<SevenShiftsSyncLog>(
    ['7shifts-sync-log', id],
    () => getSyncLog(id!),
    {
      enabled: !!id,
    }
  );

  const retryMutation = useMutation(retrySync, {
    onSuccess: () => {
      queryClient.invalidateQueries('7shifts-sync-logs');
      navigate('/integrations/sync-logs');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/integrations/sync-logs')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sync Logs
          </button>
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load sync log</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'green';
      case 'PARTIAL': return 'yellow';
      case 'FAILED': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="w-5 h-5" />;
      case 'PARTIAL': return <AlertCircle className="w-5 h-5" />;
      case 'FAILED': return <XCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getSyncTypeIcon = (type: string) => {
    switch (type) {
      case 'EMPLOYEES': return <Users className="w-5 h-5" />;
      case 'SHIFTS': return <Calendar className="w-5 h-5" />;
      case 'FULL': return <RefreshCw className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getSyncTypeName = (type: string) => {
    switch (type) {
      case 'EMPLOYEES': return 'Employees';
      case 'SHIFTS': return 'Shifts';
      case 'FULL': return 'Full Sync';
      default: return type;
    }
  };

  const statusColor = getStatusColor(log.status);
  const errors = log.error_details?.errors || (log.error_details?.error ? [log.error_details.error] : []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <button
          onClick={() => navigate('/integrations/sync-logs')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Sync Logs
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            {getSyncTypeIcon(log.sync_type)}
            <span className="ml-3">{getSyncTypeName(log.sync_type)} Sync Details</span>
          </h1>
          <p className="mt-2 text-gray-600">
            Detailed information about this sync operation
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className={`inline-flex items-center px-3 py-2 bg-${statusColor}-100 text-${statusColor}-800 rounded-lg`}>
                {getStatusIcon(log.status)}
                <span className="ml-2 font-semibold">{log.status}</span>
              </div>
            </div>
            {(log.status === 'FAILED' || log.status === 'PARTIAL') && (
              <button
                onClick={() => retryMutation.mutate(log.sync_type)}
                disabled={retryMutation.isLoading}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${retryMutation.isLoading ? 'animate-spin' : ''}`} />
                Retry Sync
              </button>
            )}
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Items Synced */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items Synced</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{log.items_synced}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className={`mt-1 text-3xl font-bold ${log.errors_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {log.errors_count}
                </p>
              </div>
              <div className={`${log.errors_count > 0 ? 'bg-red-100' : 'bg-gray-100'} rounded-full p-3`}>
                {log.errors_count > 0 ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Duration</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {log.duration_seconds ? `${log.duration_seconds.toFixed(2)}s` : '-'}
                </p>
              </div>
              <div className="bg-indigo-100 rounded-full p-3">
                <Clock className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-indigo-600" />
            Timeline
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Sync Started</p>
                <p className="text-sm text-gray-500">
                  {new Date(log.started_at).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {log.completed_at && (
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-2 h-2 bg-${statusColor}-600 rounded-full mt-2`}></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Sync Completed</p>
                  <p className="text-sm text-gray-500">
                    {new Date(log.completed_at).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Details */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Error Details ({errors.length})
            </h2>
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div key={index} className="bg-white border border-red-200 rounded-md p-4">
                  <div className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-mono text-gray-900">{error}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {log.status === 'SUCCESS' && log.errors_count === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Sync Completed Successfully</h3>
                <p className="text-sm text-green-700 mt-1">
                  All {log.items_synced} items were synced without any errors.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Removed Employees Notice */}
        {log.sync_type === 'EMPLOYEES' && log.error_details.removed_count > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Employees Removed</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {log.error_details.removed_count} employee{log.error_details.removed_count !== 1 ? 's were' : ' was'} removed because {log.error_details.removed_count !== 1 ? 'they' : 'it'} no longer {log.error_details.removed_count !== 1 ? 'match' : 'matches'} the sync criteria (role filter or no longer in 7shifts).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User Mapping Results */}
        {log.sync_type === 'EMPLOYEES' && log.error_details.user_mapping && (
          <div className="bg-white shadow-sm rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              User Mapping Results
            </h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Unmapped</p>
                <p className="text-2xl font-bold text-gray-900">{log.error_details.user_mapping.total_unmapped || 0}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Mapped to Existing</p>
                <p className="text-2xl font-bold text-blue-600">{log.error_details.user_mapping.mapped || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Created New Users</p>
                <p className="text-2xl font-bold text-green-600">{log.error_details.user_mapping.created || 0}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Skipped</p>
                <p className="text-2xl font-bold text-yellow-600">{log.error_details.user_mapping.skipped || 0}</p>
              </div>
              {log.error_details.removed_count !== undefined && log.error_details.removed_count > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Removed</p>
                  <p className="text-2xl font-bold text-red-600">{log.error_details.removed_count}</p>
                </div>
              )}
            </div>

            {/* Created Users Details */}
            {log.error_details.user_mapping.created_details && log.error_details.user_mapping.created_details.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Created Users</h3>
                <div className="space-y-2">
                  {log.error_details.user_mapping.created_details.map((detail: any, index: number) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{detail.employee_name}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Username: <span className="font-mono">{detail.username}</span> | Email: {detail.email}
                          </p>
                          {detail.store && (
                            <p className="text-xs text-gray-600">Store: {detail.store}</p>
                          )}
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Temporary Email Users Details */}
            {log.error_details.user_mapping.temp_email_details && log.error_details.user_mapping.temp_email_details.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Created Users with Temporary Emails ({log.error_details.user_mapping.temp_email_count || 0})
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  These users were created without real email addresses. They can update their email later if needed.
                </p>
                <div className="space-y-2">
                  {log.error_details.user_mapping.temp_email_details.map((detail: any, index: number) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{detail.employee_name}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Username: <span className="font-mono">{detail.username}</span>
                          </p>
                          <p className="text-xs text-gray-600">
                            Temp Email: <span className="font-mono text-yellow-700">{detail.temp_email}</span>
                          </p>
                          {detail.phone && detail.phone !== 'No phone' && (
                            <p className="text-xs text-gray-600">Phone: {detail.phone}</p>
                          )}
                          {detail.store && (
                            <p className="text-xs text-gray-600">Store: {detail.store}</p>
                          )}
                        </div>
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mapped Users Details */}
            {log.error_details.user_mapping.mapped_details && log.error_details.user_mapping.mapped_details.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Mapped to Existing Users</h3>
                <div className="space-y-2">
                  {log.error_details.user_mapping.mapped_details.map((detail: any, index: number) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{detail.employee_name}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Mapped to: <span className="font-medium">{detail.user_name}</span> ({detail.user_email})
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped Details */}
            {log.error_details.user_mapping.skipped_details && log.error_details.user_mapping.skipped_details.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Skipped Employees</h3>
                <div className="space-y-2">
                  {log.error_details.user_mapping.skipped_details.map((detail: any, index: number) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{detail.name}</p>
                          <p className="text-xs text-gray-600 mt-1">Reason: {detail.reason}</p>
                        </div>
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Synced Data Explorer - Employees */}
        {log.sync_type === 'EMPLOYEES' && log.error_details.synced_employees && log.error_details.synced_employees.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Synced Employees Data ({log.error_details.synced_employees.length})
            </h2>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">7shifts Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {log.error_details.synced_employees
                    .filter(emp =>
                      !searchQuery ||
                      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      emp.id.toString().includes(searchQuery)
                    )
                    .map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{emp.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{emp.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{emp.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {emp.roles && emp.roles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {emp.roles.map((role, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No roles</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {emp.location_name ? (
                            <div>
                              <div className="font-medium text-gray-900">{emp.location_name}</div>
                              <div className="text-xs text-gray-500">ID: {emp.location_id}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No location</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {emp.store_name ? (
                            <div className="flex items-center">
                              <Building2 className="w-4 h-4 mr-1 text-gray-400" />
                              <span>{emp.store_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No store</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Raw Data
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Synced Data Explorer - Shifts */}
        {log.sync_type === 'SHIFTS' && log.error_details.synced_shifts && log.error_details.synced_shifts.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
              Synced Shifts Data ({log.error_details.synced_shifts.length})
            </h2>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by shift ID or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {log.error_details.synced_shifts
                    .filter(shift =>
                      !searchQuery ||
                      shift.id.toString().includes(searchQuery) ||
                      shift.user_id.toString().includes(searchQuery)
                    )
                    .map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{shift.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{shift.user_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(shift.start).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(shift.end).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{shift.role || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => setSelectedShift(shift)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Raw Data
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employee Detail Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Employee Raw Data: {selectedEmployee.name}
                </h3>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                    {JSON.stringify(selectedEmployee.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shift Detail Modal */}
        {selectedShift && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Shift Raw Data: ID {selectedShift.id}
                </h3>
                <button
                  onClick={() => setSelectedShift(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                    {JSON.stringify(selectedShift.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Raw JSON Data */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mt-6">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <Code className="w-5 h-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Raw JSON Data</h2>
              <span className="ml-3 text-sm text-gray-500">(for debugging)</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${showRawJson ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showRawJson && (
            <div className="px-6 pb-6 border-t border-gray-200">
              <div className="bg-gray-900 rounded-lg p-4 mt-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(log, null, 2)}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This is the complete JSON representation of the sync log, useful for debugging and support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

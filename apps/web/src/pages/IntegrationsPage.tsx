import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  Calendar,
  RefreshCw,
  Trash2,
  TestTube,
  Clock,
  MapPin,
  Link as LinkIcon,
  Unlink,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
interface SevenShiftsConfig {
  id: string;
  is_configured: boolean;
  is_active: boolean;
  company_id: string;
  last_sync_at: string | null;
  sync_employees_enabled: boolean;
  sync_shifts_enabled: boolean;
  enforce_shift_schedule: boolean;
  sync_role_names: string[];
  create_users_without_email: boolean;
  employee_count?: number;
  upcoming_shifts_count?: number;
  last_sync_status?: {
    sync_type: string;
    status: string;
    items_synced: number;
    started_at: string;
    completed_at: string;
  };
}

interface SevenShiftsEmployee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  store_name: string;
  is_active: boolean;
}

interface SevenShiftsLocation {
  id: string;
  name: string;
  is_mapped: boolean;
  mapped_store_id: string | null;
  mapped_store_name: string | null;
}

interface Store {
  id: string;
  name: string;
  address: string;
}

interface SevenShiftsRole {
  id: string;
  name: string;
}

// API functions
const integrationsAPI = {
  getSevenShiftsStatus: async (): Promise<SevenShiftsConfig> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/status/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  testConnection: async (accessToken: string) => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/test-connection/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Extract the actual error message from the API response
      const errorMessage = data.error || data.message || 'Connection test failed';
      throw new Error(errorMessage);
    }

    return data;
  },

  configure: async (data: {
    access_token: string;
    company_id: string;
    sync_employees_enabled: boolean;
    sync_shifts_enabled: boolean;
    enforce_shift_schedule: boolean;
    sync_role_names: string[];
    create_users_without_email: boolean;
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/configure/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Configuration failed');
    }
    return response.json();
  },

  sync: async (syncType: 'employees' | 'shifts' | 'full' = 'full') => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/sync/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sync_type: syncType }),
    });
    if (!response.ok) throw new Error('Sync failed');
    return response.json();
  },

  disconnect: async () => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/disconnect/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Disconnect failed');
    return response.json();
  },

  getEmployees: async (): Promise<SevenShiftsEmployee[]> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/employees/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch employees');
    return response.json();
  },

  getLocations: async (): Promise<SevenShiftsLocation[]> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/locations/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch locations');
    return response.json();
  },

  mapLocation: async (data: { seven_shifts_location_id: string; seven_shifts_location_name: string; store_id: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/locations/map/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to map location');
    return response.json();
  },

  unmapLocation: async (locationId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/locations/${locationId}/unmap/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to unmap location');
    return response.json();
  },

  getStores: async (): Promise<Store[]> => {
    const response = await fetch(`${API_BASE_URL}/api/brands/stores/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch stores');
    const data = await response.json();
    // Handle both array response and paginated response
    return Array.isArray(data) ? data : (data.results || []);
  },

  getRoles: async (): Promise<SevenShiftsRole[]> => {
    const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/roles/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch roles');
    return response.json();
  },
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [syncEmployees, setSyncEmployees] = useState(true);
  const [syncShifts, setSyncShifts] = useState(true);
  const [enforceSchedule, setEnforceSchedule] = useState(true);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [createUsersWithoutEmail, setCreateUsersWithoutEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Queries
  const { data: config, isLoading } = useQuery<SevenShiftsConfig>(
    '7shifts-status',
    integrationsAPI.getSevenShiftsStatus,
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: employees } = useQuery<SevenShiftsEmployee[]>(
    '7shifts-employees',
    integrationsAPI.getEmployees,
    {
      enabled: config?.is_configured,
    }
  );

  const { data: locations } = useQuery<SevenShiftsLocation[]>(
    '7shifts-locations',
    integrationsAPI.getLocations,
    {
      enabled: config?.is_configured,
    }
  );

  const { data: stores } = useQuery<Store[]>(
    'stores',
    integrationsAPI.getStores,
    {
      enabled: config?.is_configured,
    }
  );

  const { data: availableRoles } = useQuery<SevenShiftsRole[]>(
    '7shifts-roles',
    integrationsAPI.getRoles,
    {
      enabled: config?.is_configured && (isConfiguring || isEditing),
      refetchOnWindowFocus: false,
    }
  );

  // Mutations
  const configureMutation = useMutation(integrationsAPI.configure, {
    onSuccess: () => {
      queryClient.invalidateQueries('7shifts-status');
      queryClient.invalidateQueries('7shifts-employees');
      setSuccess(isEditing ? '7shifts integration updated successfully!' : '7shifts integration configured successfully!');
      setError(null);
      setIsConfiguring(false);
      setIsEditing(false);
      setAccessToken('');
      setCompanyId('');
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const syncMutation = useMutation(integrationsAPI.sync, {
    onSuccess: () => {
      queryClient.invalidateQueries('7shifts-status');
      queryClient.invalidateQueries('7shifts-employees');
      setSuccess('Sync completed successfully!');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const disconnectMutation = useMutation(integrationsAPI.disconnect, {
    onSuccess: () => {
      queryClient.invalidateQueries('7shifts-status');
      setSuccess('7shifts integration disconnected');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const mapLocationMutation = useMutation(integrationsAPI.mapLocation, {
    onSuccess: () => {
      queryClient.invalidateQueries('7shifts-locations');
      queryClient.invalidateQueries('7shifts-employees');
      setSuccess('Location mapped successfully');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const unmapLocationMutation = useMutation(integrationsAPI.unmapLocation, {
    onSuccess: () => {
      queryClient.invalidateQueries('7shifts-locations');
      queryClient.invalidateQueries('7shifts-employees');
      setSuccess('Location unmapped successfully');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  // Handlers
  const handleTestConnection = async () => {
    if (!accessToken) {
      setError('Please enter an access token');
      return;
    }

    setTestingConnection(true);
    setError(null);

    try {
      const result = await integrationsAPI.testConnection(accessToken);
      if (result.success) {
        setSuccess('Connection successful! You can now configure the integration.');
        if (result.company?.id) {
          setCompanyId(result.company.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleConfigure = () => {
    setError(null);
    setSuccess(null);

    // When editing, token is optional (keep current if empty)
    // When creating, both token and company ID are required
    if (!isEditing && (!accessToken || !companyId)) {
      setError('Please provide both access token and company ID');
      return;
    }

    if (!companyId) {
      setError('Please provide company ID');
      return;
    }

    const payload: any = {
      company_id: companyId,
      sync_employees_enabled: syncEmployees,
      sync_shifts_enabled: syncShifts,
      enforce_shift_schedule: enforceSchedule,
      sync_role_names: roleNames,
      create_users_without_email: createUsersWithoutEmail,
    };

    // Only include access_token if provided (for create or update)
    if (accessToken) {
      payload.access_token = accessToken;
    }

    configureMutation.mutate(payload);
  };

  const handleSync = () => {
    setError(null);
    setSuccess(null);
    syncMutation.mutate('full');
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect 7shifts? This will stop syncing employees and shifts.')) {
      disconnectMutation.mutate();
    }
  };

  const handleEditClick = () => {
    if (config) {
      // Populate form with existing values
      setCompanyId(config.company_id || '');
      setSyncEmployees(config.sync_employees_enabled ?? true);
      setSyncShifts(config.sync_shifts_enabled ?? true);
      setEnforceSchedule(config.enforce_shift_schedule ?? true);
      setRoleNames(config.sync_role_names || []);
      setCreateUsersWithoutEmail(config.create_users_without_email ?? true);
      setAccessToken(''); // Don't populate token for security
      setIsEditing(true);
      setError(null);
      setSuccess(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsConfiguring(false);
    setAccessToken('');
    setCompanyId('');
    setSyncEmployees(true);
    setSyncShifts(true);
    setEnforceSchedule(true);
    setRoleNames([]);
    setCreateUsersWithoutEmail(true);
    setError(null);
    setSuccess(null);
  };

  const handleToggleRole = (roleName: string) => {
    // If currently syncing all (empty array), switch to syncing just this role
    if (roleNames.length === 0) {
      setRoleNames([roleName]);
    } else if (roleNames.includes(roleName)) {
      // Remove this role from the list
      const newRoles = roleNames.filter(r => r !== roleName);
      setRoleNames(newRoles);
    } else {
      // Add this role to the list
      setRoleNames([...roleNames, roleName]);
    }
  };

  const handleToggleAllRoles = () => {
    // Clear all selections to sync all roles
    setRoleNames([]);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Settings className="w-8 h-8 text-indigo-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
              <p className="text-gray-600">Connect third-party services to enhance PeakOps</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-4 mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* 7shifts Integration Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">7shifts Integration</h2>
                <p className="text-indigo-100 text-sm">
                  Sync employees and shift schedules to send micro-checks only during working hours
                </p>
              </div>
              {config?.is_configured && config.is_active && (
                <div className="flex items-center bg-green-500/20 text-green-100 px-3 py-1 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Connected
                </div>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6">
            {!config?.is_configured || !config.is_active || isEditing ? (
              // Configuration Form
              <div>
                {!isConfiguring && !isEditing ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Connect 7shifts
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Automatically sync your employee schedules to ensure micro-checks are only sent when staff are on shift.
                    </p>
                    <button
                      onClick={() => setIsConfiguring(true)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Integration
                    </button>
                  </div>
                ) : (
                  // Configuration Form
                  <div className="space-y-6">
                    {isEditing && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Edit 7shifts Configuration</h3>
                        <p className="text-sm text-gray-600 mt-1">Update your integration settings below</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        7shifts Access Token {isEditing ? '' : '*'}
                      </label>
                      <input
                        type="password"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={isEditing ? "Leave blank to keep current token" : "Enter your 7shifts API access token"}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {isEditing
                          ? "Only enter a new token if you want to update it. Leave blank to keep the current one."
                          : "Get your access token from 7shifts Company Settings → Developer Tools"}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleTestConnection}
                        disabled={testingConnection || !accessToken}
                        className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testingConnection ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <TestTube className="w-4 h-4 mr-2" />
                            Test Connection
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company ID *
                      </label>
                      <input
                        type="text"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Your 7shifts company ID"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={syncEmployees}
                          onChange={(e) => setSyncEmployees(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sync employees automatically</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={syncShifts}
                          onChange={(e) => setSyncShifts(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sync shift schedules automatically</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={enforceSchedule}
                          onChange={(e) => setEnforceSchedule(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Only send micro-checks when employee is on shift
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={createUsersWithoutEmail}
                          onChange={(e) => setCreateUsersWithoutEmail(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Create users with temporary emails for employees without email addresses
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role Filtering (Optional)
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Choose specific roles to sync, or keep "Sync All Roles" checked to sync everyone.
                      </p>

                      {availableRoles && availableRoles.length > 0 ? (
                        <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-60 overflow-y-auto">
                          <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roleNames.length === 0}
                              onChange={handleToggleAllRoles}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-900">
                              Sync All Roles
                            </span>
                          </label>
                          <div className="border-t border-gray-200 my-2"></div>
                          {availableRoles.map((role) => (
                            <label key={role.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={roleNames.length > 0 && roleNames.includes(role.name)}
                                onChange={() => handleToggleRole(role.name)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {role.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          Loading roles from 7shifts...
                        </div>
                      )}

                      {roleNames.length > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-700 font-medium mb-2">
                            Selected roles ({roleNames.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {roleNames.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleConfigure}
                        disabled={configureMutation.isLoading}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {configureMutation.isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Configuring...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Save Configuration
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Connected State
              <div>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Employees</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {config.employee_count || 0}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-indigo-600" />
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Upcoming Shifts</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {config.upcoming_shifts_count || 0}
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Last Sync</p>
                        <p className="text-sm font-medium text-gray-900">
                          {config.last_sync_at
                            ? new Date(config.last_sync_at).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Role Filter Display */}
                {config.sync_role_names && config.sync_role_names.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Role Filtering Active - Syncing {config.sync_role_names.length} role(s):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {config.sync_role_names.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={handleSync}
                    disabled={syncMutation.isLoading}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleEditClick}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Configuration
                  </button>

                  <button
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isLoading}
                    className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Disconnect
                  </button>
                </div>

                {/* Employees List */}
                {employees && employees.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Synced Employees ({employees.length})
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Store
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employees.slice(0, 10).map((employee) => (
                            <tr key={employee.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {employee.full_name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {employee.email}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {employee.store_name || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {employee.is_active ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Inactive
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {employees.length > 10 && (
                        <div className="bg-gray-50 px-4 py-3 text-sm text-gray-500 text-center">
                          Showing 10 of {employees.length} employees
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location Mapping */}
                {locations && locations.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-indigo-600" />
                      Location Mapping ({locations.filter(l => l.is_mapped).length}/{locations.length} mapped)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Map 7shifts locations to your PeakOps stores to automatically assign employees to the correct store.
                    </p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              7shifts Location
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mapped Store
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {locations.map((location) => (
                            <tr key={location.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {location.name}
                                <span className="ml-2 text-xs text-gray-500">
                                  (ID: {location.id})
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {location.is_mapped ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <LinkIcon className="w-3 h-3 mr-1" />
                                    {location.mapped_store_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Not mapped</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {location.is_mapped ? (
                                  <button
                                    onClick={() => unmapLocationMutation.mutate(location.id)}
                                    disabled={unmapLocationMutation.isLoading}
                                    className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                                  >
                                    <Unlink className="w-3 h-3 mr-1" />
                                    Unmap
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <select
                                      id={`store-select-${location.id}`}
                                      className="text-xs border border-gray-300 rounded px-2 py-1"
                                      defaultValue=""
                                      disabled={mapLocationMutation.isLoading}
                                    >
                                      <option value="" disabled>Select store...</option>
                                      {stores?.map((store) => (
                                        <option key={store.id} value={store.id}>
                                          {store.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => {
                                        const select = document.getElementById(`store-select-${location.id}`) as HTMLSelectElement;
                                        const storeId = select?.value;
                                        if (storeId) {
                                          mapLocationMutation.mutate({
                                            seven_shifts_location_id: location.id,
                                            seven_shifts_location_name: location.name,
                                            store_id: storeId,
                                          });
                                        } else {
                                          setError('Please select a store');
                                        }
                                      }}
                                      disabled={mapLocationMutation.isLoading}
                                      className="inline-flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-medium disabled:opacity-50"
                                    >
                                      <LinkIcon className="w-3 h-3 mr-1" />
                                      Map
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sync Logs Button */}
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/integrations/sync-logs')}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Sync History
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

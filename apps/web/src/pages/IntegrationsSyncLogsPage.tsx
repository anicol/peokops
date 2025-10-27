import { useQuery } from 'react-query';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Calendar,
  RefreshCw,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SevenShiftsSyncLog {
  id: string;
  sync_type: 'EMPLOYEES' | 'SHIFTS' | 'FULL';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  items_synced: number;
  errors_count: number;
  error_details: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

const getSyncLogs = async (): Promise<SevenShiftsSyncLog[]> => {
  const response = await fetch(`${API_BASE_URL}/api/integrations/7shifts/sync-logs/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch sync logs');
  return response.json();
};

export default function IntegrationsSyncLogsPage() {
  const navigate = useNavigate();

  const { data: syncLogs, isLoading, error } = useQuery<SevenShiftsSyncLog[], Error>(
    '7shifts-sync-logs',
    getSyncLogs,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/integrations')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Integrations
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-indigo-600" />
            7shifts Sync History
          </h1>
          <p className="mt-2 text-gray-600">
            View detailed history of all sync operations with 7shifts
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {isLoading && (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading sync logs...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">Failed to load sync logs</p>
              <p className="text-sm text-gray-500 mt-1">{(error as Error).message}</p>
            </div>
          )}

          {!isLoading && !error && syncLogs && syncLogs.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No sync operations yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Run a sync from the integrations page to see history here
              </p>
            </div>
          )}

          {!isLoading && !error && syncLogs && syncLogs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items Synced
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errors
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncLogs.map((log: SevenShiftsSyncLog) => (
                    <tr
                      key={log.id}
                      onClick={() => navigate(`/integrations/sync-logs/${log.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded">
                          {log.sync_type === 'EMPLOYEES' && <Users className="w-4 h-4 mr-1.5" />}
                          {log.sync_type === 'SHIFTS' && <Calendar className="w-4 h-4 mr-1.5" />}
                          {log.sync_type === 'FULL' && <RefreshCw className="w-4 h-4 mr-1.5" />}
                          {log.sync_type === 'EMPLOYEES' ? 'Employees' : log.sync_type === 'SHIFTS' ? 'Shifts' : 'Full Sync'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.status === 'SUCCESS' && (
                          <span className="inline-flex items-center px-2.5 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded">
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Success
                          </span>
                        )}
                        {log.status === 'PARTIAL' && (
                          <span className="inline-flex items-center px-2.5 py-1.5 bg-yellow-100 text-yellow-800 text-sm font-medium rounded">
                            <AlertCircle className="w-4 h-4 mr-1.5" />
                            Partial
                          </span>
                        )}
                        {log.status === 'FAILED' && (
                          <span className="inline-flex items-center px-2.5 py-1.5 bg-red-100 text-red-800 text-sm font-medium rounded">
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{log.items_synced}</span>
                        <span className="text-sm text-gray-500 ml-1">items</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.errors_count > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded">
                            {log.errors_count} error{log.errors_count !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No errors</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(log.started_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.started_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.completed_at ? (
                          <>
                            <div className="text-sm text-gray-900">
                              {new Date(log.completed_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.completed_at).toLocaleTimeString()}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.duration_seconds ? (
                          <span className="text-sm font-medium text-gray-900">
                            {log.duration_seconds.toFixed(2)}s
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Error details section - can be expanded in future */}
        {syncLogs && syncLogs.some(log => log.errors_count > 0) && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Some syncs encountered errors</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Review the logs above to identify any failed operations. Partial syncs indicate some items failed while others succeeded.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

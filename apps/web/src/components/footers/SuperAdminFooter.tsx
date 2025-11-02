import { useQuery } from 'react-query';
import api from '@/services/api';
import { Building2, Users, Activity, Database } from 'lucide-react';

interface SystemStats {
  total_brands?: number;
  total_users?: number;
  active_users_today?: number;
  total_stores?: number;
  queue_pending?: number;
}

export function SuperAdminFooter() {
  // Fetch system-level stats
  const { data: stats } = useQuery<SystemStats>(
    'superadmin-footer-stats',
    async () => {
      const response = await api.get('/auth/admin/system-stats/');
      return response.data;
    },
    {
      refetchInterval: 60000, // Refresh every minute
      retry: false,
    }
  );

  const totalBrands = stats?.total_brands || 0;
  const totalUsers = stats?.total_users || 0;
  const activeUsers = stats?.active_users_today || 0;
  const totalStores = stats?.total_stores || 0;
  const queuePending = stats?.queue_pending || 0;

  return (
    <footer className="bg-gray-900 border-t border-gray-700 flex-shrink-0">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - System metrics */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">
                <span className="font-semibold text-white">{totalBrands}</span>
                {' '}Brands
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                <span className="font-semibold text-white">{activeUsers}</span>
                <span className="text-gray-500">/{totalUsers}</span>
                {' '}Active Users
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">
                <span className="font-semibold text-white">{totalStores}</span>
                {' '}Total Stores
              </span>
            </div>

            {queuePending > 0 && (
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-300">
                  <span className="font-semibold text-orange-400">{queuePending}</span>
                  {' '}Queue
                </span>
              </div>
            )}
          </div>

          {/* Right side - System status */}
          <div className="flex items-center space-x-2 text-green-400">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">SYSTEM ADMIN</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

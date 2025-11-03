import { useQuery } from 'react-query';
import api from '@/services/api';
import { Store, CheckSquare, TrendingUp } from 'lucide-react';

interface DashboardStats {
  active_stores_today?: number;
  total_stores?: number;
  checks_completed_today?: number;
  total_checks_today?: number;
}

export function MultiStoreFooter() {
  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>(
    'dashboard-footer-stats',
    async () => {
      const response = await api.get('/api/inspections/stats/');
      return response.data;
    },
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const activeStores = stats?.active_stores_today || 0;
  const totalStores = stats?.total_stores || 0;
  const checksToday = stats?.checks_completed_today || 0;

  return (
    <footer className="bg-white border-t border-gray-200 flex-shrink-0">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Quick stats */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{activeStores}</span>
                <span className="text-gray-500">/{totalStores}</span>
                {' '}Active Stores
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{checksToday}</span>
                {' '}Checks Today
              </span>
            </div>
          </div>

          {/* Right side - Performance indicator */}
          <div className="flex items-center space-x-2 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">
              {totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0}% Engagement
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

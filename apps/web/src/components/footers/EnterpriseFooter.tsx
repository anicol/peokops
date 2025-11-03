import { useQuery } from 'react-query';
import api from '@/services/api';
import { Building2, AlertCircle, Activity, TrendingUp } from 'lucide-react';

interface EnterpriseStats {
  total_stores?: number;
  active_stores_this_week?: number;
  open_action_items?: number;
  critical_findings?: number;
  compliance_rate?: number;
}

export function EnterpriseFooter() {
  // Fetch enterprise-level stats
  const { data: stats } = useQuery<EnterpriseStats>(
    'enterprise-footer-stats',
    async () => {
      const response = await api.get('/api/inspections/stats/');
      return response.data;
    },
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const totalStores = stats?.total_stores || 0;
  const activeStores = stats?.active_stores_this_week || 0;
  const openActions = stats?.open_action_items || 0;
  const criticalFindings = stats?.critical_findings || 0;
  const activePercentage = totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0;

  return (
    <footer className="bg-white border-t border-gray-200 flex-shrink-0">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Usage metrics */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{activePercentage}%</span>
                {' '}Active Stores
                <span className="text-xs text-gray-400 ml-1">({activeStores}/{totalStores})</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{openActions}</span>
                {' '}Open Actions
              </span>
            </div>

            {criticalFindings > 0 && (
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-red-600">{criticalFindings}</span>
                  {' '}Critical
                </span>
              </div>
            )}
          </div>

          {/* Right side - System status */}
          <div className="flex items-center space-x-2 text-gray-500">
            <Activity className="w-4 h-4" />
            <span className="text-xs">System Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

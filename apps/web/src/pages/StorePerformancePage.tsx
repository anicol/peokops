import { useQuery } from 'react-query';
import api from '@/services/api';
import { Store, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StorePerformance {
  store_id: number;
  store_name: string;
  checks_this_week: number;
  avg_score: number;
  trend: 'up' | 'down' | 'stable';
  open_actions: number;
  critical_findings: number;
  last_check_date: string | null;
}

export default function StorePerformancePage() {
  // Fetch store performance data
  const { data: stores, isLoading } = useQuery<StorePerformance[]>(
    'store-performance',
    async () => {
      const response = await api.get('/stores/performance/');
      return response.data;
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading store performance...</div>
      </div>
    );
  }

  const activeStores = stores?.filter(s => s.checks_this_week > 0).length || 0;
  const totalStores = stores?.length || 0;
  const avgScore = stores && stores.length > 0
    ? stores.reduce((sum, s) => sum + s.avg_score, 0) / stores.length
    : 0;
  const totalOpenActions = stores?.reduce((sum, s) => sum + s.open_actions, 0) || 0;

  // Sort stores by score descending
  const sortedStores = [...(stores || [])].sort((a, b) => b.avg_score - a.avg_score);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store Performance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare performance across your locations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Store className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">Active Stores</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {activeStores}/{totalStores}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0}% engagement
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Avg Score</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {avgScore.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Across all stores
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-600">Open Actions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {totalOpenActions}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Requiring attention
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600">This Week</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stores?.reduce((sum, s) => sum + s.checks_this_week, 0) || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Total checks
          </div>
        </div>
      </div>

      {/* Store Rankings Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Store Rankings</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Checks This Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Check
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStores.map((store, index) => (
                <tr key={store.store_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-500' : index === 2 ? 'text-orange-600' : 'text-gray-900'}`}>
                      #{index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{store.store_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-semibold text-gray-900">{store.avg_score.toFixed(1)}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${store.avg_score >= 90 ? 'bg-green-500' : store.avg_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(store.avg_score, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {store.trend === 'up' && (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="text-xs">Up</span>
                      </div>
                    )}
                    {store.trend === 'down' && (
                      <div className="flex items-center text-red-600">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        <span className="text-xs">Down</span>
                      </div>
                    )}
                    {store.trend === 'stable' && (
                      <div className="text-xs text-gray-500">—</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{store.checks_this_week}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${store.open_actions > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                      {store.open_actions}
                    </span>
                    {store.critical_findings > 0 && (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {store.critical_findings} critical
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {store.last_check_date
                        ? new Date(store.last_check_date).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/stores/${store.store_id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Performance Tips</h3>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li>• Encourage daily checks at all locations to maintain consistency</li>
          <li>• Focus on stores with open actions to improve overall performance</li>
          <li>• Share best practices from top-performing stores with the team</li>
          <li>• Set up weekly goals to increase engagement across all locations</li>
        </ul>
      </div>
    </div>
  );
}

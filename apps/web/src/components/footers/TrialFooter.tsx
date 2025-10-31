import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { microCheckAPI } from '@/services/api';
import { Zap, ArrowRight, Flame } from 'lucide-react';

export function TrialFooter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch dashboard stats to get actual streak
  const { data: dashboardStats } = useQuery(
    ['dashboard-stats', user?.store],
    () => user?.store ? microCheckAPI.getDashboardStats(user.store) : Promise.resolve(null),
    {
      enabled: !!user?.store,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const streak = dashboardStats?.user_streak?.current_streak ?? 0;
  const daysRemaining = user?.trial_status?.days_remaining || 0;

  return (
    <footer className="bg-white border-t border-gray-200 flex-shrink-0">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Streak indicator */}
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              {streak}-day streak
            </span>
          </div>

          {/* Right side - Upgrade CTA */}
          <button
            onClick={() => navigate('/checkout')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">
              {daysRemaining > 0 ? `${daysRemaining} days left - Upgrade` : 'Upgrade Now'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}

import { ArrowUp, ArrowDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down';
    value: string | number;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
}

export function KPICard({ title, value, subtitle, trend, icon }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs sm:text-sm font-medium text-gray-600">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between">
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>

        {trend && (
          <div
            className={`flex items-center text-sm font-medium ${
              trend.isPositive !== false
                ? trend.direction === 'up'
                  ? 'text-green-600'
                  : 'text-red-600'
                : trend.direction === 'up'
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {trend.direction === 'up' ? (
              <ArrowUp className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDown className="w-4 h-4 mr-1" />
            )}
            {trend.value}
          </div>
        )}
      </div>

      {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  value: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TrendIndicator({ value, showIcon = true, size = 'md' }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const colorClass = isNeutral
    ? 'text-gray-500'
    : isPositive
    ? 'text-green-600'
    : 'text-red-600';

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center space-x-1 ${colorClass} ${sizeClasses[size]} font-medium`}>
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>
        {isPositive ? '+' : ''}
        {value}
        {value !== 0 && '%'}
      </span>
    </span>
  );
}

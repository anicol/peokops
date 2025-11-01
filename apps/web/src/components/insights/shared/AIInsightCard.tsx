import { Sparkles } from 'lucide-react';

interface AIInsightCardProps {
  insight: string;
  variant?: 'default' | 'highlight';
}

export function AIInsightCard({ insight, variant = 'default' }: AIInsightCardProps) {
  const bgColor = variant === 'highlight' ? 'bg-blue-50' : 'bg-gray-50';
  const borderColor = variant === 'highlight' ? 'border-blue-200' : 'border-gray-200';
  const iconColor = variant === 'highlight' ? 'text-blue-600' : 'text-gray-600';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <Sparkles className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
}

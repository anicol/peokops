import { Users, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AIInsightCard } from './shared/AIInsightCard';

interface Theme {
  name: string;
  mentions: number;
  sentiment: 'positive' | 'negative' | 'mixed';
  trend: 'up' | 'down' | 'stable';
}

interface CustomerVoiceSectionProps {
  data: {
    locked: boolean;
    available: boolean;
    message?: string;
    cta?: string;
    rating?: number;
    delta?: number;
    total_reviews?: number;
    themes?: Theme[];
    ai_summary?: string;
  };
  onGenerateClick?: () => void;
}

export function CustomerVoiceSection({ data, onGenerateClick }: CustomerVoiceSectionProps) {
  // Not linked yet
  if (!data.available) {
    return (
      <section className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Voice</h2>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-600 mb-4">{data.message}</p>
          {onGenerateClick && (
            <button
              onClick={onGenerateClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {data.cta}
            </button>
          )}
        </div>
      </section>
    );
  }

  const TrendIcon = data.delta && data.delta > 0 ? TrendingUp : data.delta && data.delta < 0 ? TrendingDown : Minus;
  const trendColor = data.delta && data.delta > 0 ? 'text-green-600' : data.delta && data.delta < 0 ? 'text-red-600' : 'text-gray-500';

  return (
    <section className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <Users className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Customer Voice</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Rating Summary */}
        <div className="flex items-center space-x-6 mb-6 pb-6 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Google Rating</p>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <span className="text-2xl font-bold text-gray-900">{data.rating?.toFixed(1)}</span>
              {data.delta !== undefined && data.delta !== 0 && (
                <span className={`flex items-center text-sm font-medium ${trendColor}`}>
                  <TrendIcon className="w-4 h-4 mr-1" />
                  {Math.abs(data.delta).toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Reviews</p>
            <span className="text-2xl font-bold text-gray-900">{data.total_reviews}</span>
          </div>
        </div>

        {/* Themes */}
        {data.themes && data.themes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Themes</h3>
            <div className="space-y-2">
              {data.themes.map((theme) => {
                const sentimentColor =
                  theme.sentiment === 'positive'
                    ? 'text-green-600 bg-green-50'
                    : theme.sentiment === 'negative'
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 bg-gray-50';

                const TrendIconTheme = theme.trend === 'up' ? TrendingUp : theme.trend === 'down' ? TrendingDown : Minus;
                const trendColorTheme = theme.trend === 'up' ? 'text-green-600' : theme.trend === 'down' ? 'text-red-600' : 'text-gray-500';

                return (
                  <div
                    key={theme.name}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{theme.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentColor}`}>
                        {theme.sentiment}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">{theme.mentions} mentions</span>
                      <TrendIconTheme className={`w-4 h-4 ${trendColorTheme}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {data.ai_summary && <AIInsightCard insight={data.ai_summary} />}
      </div>
    </section>
  );
}

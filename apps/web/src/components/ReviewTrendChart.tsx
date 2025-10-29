import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface TrendData {
  series: {
    period: string;
    average_rating: number;
    total_reviews: number;
    positive_percentage: number;
    negative_percentage: number;
    neutral_percentage: number;
  }[];
  period_type: string;
  total_periods: number;
}

interface ReviewTrendChartProps {
  trendData: TrendData;
}

export default function ReviewTrendChart({ trendData }: ReviewTrendChartProps) {
  // Component will only be rendered when we have sufficient data (checked by parent)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.period}</p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Average Rating:</span> {data.average_rating.toFixed(2)} ⭐
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Reviews:</span> {data.total_reviews}
          </p>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-sm text-green-600">
              Positive: {data.positive_percentage}%
            </p>
            <p className="text-sm text-gray-600">
              Neutral: {data.neutral_percentage}%
            </p>
            <p className="text-sm text-red-600">
              Negative: {data.negative_percentage}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        📈 Rating Trends Over Time
      </h2>

      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Showing average ratings and sentiment trends by {trendData.period_type} over {trendData.total_periods} {trendData.period_type}s
        </p>
      </div>

      {/* Rating Trend Line Chart */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Average Rating Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData.series} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="average_rating"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Average Rating"
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sentiment Stacked Area Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Distribution Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData.series} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="positive_percentage"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              name="Positive %"
            />
            <Area
              type="monotone"
              dataKey="neutral_percentage"
              stackId="1"
              stroke="#f59e0b"
              fill="#f59e0b"
              name="Neutral %"
            />
            <Area
              type="monotone"
              dataKey="negative_percentage"
              stackId="1"
              stroke="#ef4444"
              fill="#ef4444"
              name="Negative %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">📊 Trend Insights</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          {(() => {
            const first = trendData.series[0];
            const last = trendData.series[trendData.series.length - 1];
            const ratingChange = last.average_rating - first.average_rating;
            const sentimentChange = last.positive_percentage - first.positive_percentage;

            return (
              <>
                <li>
                  {ratingChange > 0.2 ? '📈 Ratings are trending upward!' :
                   ratingChange < -0.2 ? '📉 Ratings are declining' :
                   '➡️ Ratings are relatively stable'}
                  {' '}
                  ({ratingChange > 0 ? '+' : ''}{ratingChange.toFixed(2)} stars)
                </li>
                <li>
                  {sentimentChange > 5 ? '✅ Customer sentiment is improving' :
                   sentimentChange < -5 ? '⚠️ Customer sentiment is worsening' :
                   '➡️ Customer sentiment is stable'}
                  {' '}
                  ({sentimentChange > 0 ? '+' : ''}{sentimentChange.toFixed(1)}% positive reviews)
                </li>
                <li>
                  Latest period: {last.total_reviews} reviews with {last.average_rating.toFixed(2)}⭐ average
                </li>
              </>
            );
          })()}
        </ul>
      </div>
    </div>
  );
}

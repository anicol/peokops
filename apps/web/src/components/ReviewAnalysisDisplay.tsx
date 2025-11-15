import { useState } from 'react';

export interface AnalysisResults {
  id: string;
  business_name: string;
  location: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  google_rating?: number;
  google_address?: string;
  total_reviews_found?: number;
  reviews_analyzed?: number;
  oldest_review_date?: string;
  newest_review_date?: string;
  review_timeframe?: string;
  insights?: any;
  micro_check_suggestions?: any[];
  key_issues?: any[];
  sentiment_summary?: any;
  error_message?: string;
  public_url?: string;
}

interface ReviewAnalysisDisplayProps {
  results: AnalysisResults;
  variant?: 'full' | 'compact'; // full for ReviewAnalysisPage, compact for StoresPage modal
  showBranding?: boolean; // Show PeakOps branding header
  showCTA?: boolean; // Show trial signup CTA
  className?: string;
}

export default function ReviewAnalysisDisplay({
  results,
  variant = 'full',
  showBranding = false,
  showCTA = false,
  className = ''
}: ReviewAnalysisDisplayProps) {
  const sentiment = results.sentiment_summary;
  const [expandedReviews, setExpandedReviews] = useState<{ [key: string]: boolean }>({});

  const toggleReview = (type: string, index: number) => {
    const key = `${type}-${index}`;
    setExpandedReviews(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isCompact = variant === 'compact';

  return (
    <div className={`${isCompact ? '' : 'min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4'} ${className}`}>
      <div className={isCompact ? 'space-y-6' : 'max-w-4xl mx-auto'}>
        {/* PeakOps Branding Header (only for full variant with branding) */}
        {showBranding && !isCompact && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="PeakOps" className="w-12 h-12" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">PeakOps</h2>
                  <span className="text-gray-400">|</span>
                  <span className="text-lg font-semibold text-gray-700">AI-Powered Review Analysis</span>
                </div>
                <p className="text-sm text-gray-600">Turn customer feedback into actionable daily checks</p>
              </div>
            </div>
          </div>
        )}

        {/* 1. HEADER SUMMARY - One Glance View */}
        <div className={`bg-white rounded-lg shadow-lg ${isCompact ? 'p-4' : 'p-4 sm:p-6 mb-8'}`}>
          <div className={`${isCompact ? 'mb-3' : 'text-center mb-4 sm:mb-6'}`}>
            <h1 className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl md:text-3xl'} font-bold text-gray-900 mb-2 ${isCompact ? '' : 'px-2'}`}>
              {results.business_name}
            </h1>
            <p className={`text-gray-600 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm px-2'}`}>{results.google_address}</p>
          </div>

          {/* Snapshot Metrics */}
          <div className={`grid ${isCompact ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4'}`}>
            {results.google_rating && (
              <div className={`text-center ${isCompact ? 'p-2' : 'p-3 sm:p-4'} bg-yellow-50 rounded-lg border border-yellow-200`}>
                <div className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl md:text-3xl'} font-bold text-yellow-700`}>
                  {results.google_rating}⭐
                </div>
                <div className="text-xs text-gray-600 mt-1">Google Rating</div>
              </div>
            )}

            <div className={`text-center ${isCompact ? 'p-2' : 'p-3 sm:p-4'} bg-blue-50 rounded-lg border border-blue-200`}>
              <div className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl md:text-3xl'} font-bold text-blue-700`}>
                {results.reviews_analyzed}
              </div>
              <div className="text-xs text-gray-600 mt-1">Reviews Analyzed</div>
            </div>

            {sentiment && (
              <>
                <div className={`text-center ${isCompact ? 'p-2' : 'p-3 sm:p-4'} bg-green-50 rounded-lg border border-green-200`}>
                  <div className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl md:text-3xl'} font-bold text-green-700`}>
                    {sentiment.positive_percentage}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Positive</div>
                </div>

                <div className={`text-center ${isCompact ? 'p-2' : 'p-3 sm:p-4'} bg-red-50 rounded-lg border border-red-200`}>
                  <div className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl md:text-3xl'} font-bold text-red-700`}>
                    {sentiment.negative_percentage}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Negative</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. TOP ISSUES - AI Insights (Top 2-3 most critical) */}
        {results.insights?.key_issues && results.insights.key_issues.length > 0 && (
          <div className={`bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg shadow-lg ${isCompact ? 'p-4 mb-4' : 'p-6 mb-8'}`}>
            <div className={`flex items-center gap-2 ${isCompact ? 'mb-2' : 'mb-3'}`}>
              <span className="text-xl">⚠️</span>
              <h2 className={`${isCompact ? 'text-base' : 'text-xl'} font-bold text-gray-900`}>
                Top Priority Issues
              </h2>
            </div>
            <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
              {results.insights.key_issues.slice(0, 3).map((issue: any, index: number) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg ${isCompact ? 'p-3' : 'p-4'} border-l-4 ${
                    issue.severity === 'HIGH' || issue.severity === 'CRITICAL'
                      ? 'border-red-500'
                      : issue.severity === 'MEDIUM'
                      ? 'border-yellow-500'
                      : 'border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-bold text-gray-900 flex items-center ${isCompact ? 'text-sm' : ''}`}>
                      <span className="mr-2">{issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '⚪'}</span>
                      {issue.theme}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        issue.severity === 'HIGH' || issue.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : issue.severity === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-gray-500 text-xs font-medium">
                        {issue.mentions} mentions
                      </span>
                    </div>
                  </div>
                  <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-700 mb-2`}>{issue.summary}</p>
                  {issue.examples && issue.examples.length > 0 && issue.examples[0] && (
                    <div className={`bg-gray-50 ${isCompact ? 'p-2' : 'p-2'} rounded ${isCompact ? 'text-xs' : 'text-xs'} text-gray-600 italic border-l-2 border-gray-300`}>
                      <span className="text-yellow-500 mr-1">{'⭐'.repeat(issue.examples[0].rating)}</span>
                      "{issue.examples[0].snippet}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* One-line CTA */}
            {!isCompact && (
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <span>👇</span>
                  <span><strong>These issues automatically generate daily checks</strong> in your PeakOps plan.</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. THEME BREAKDOWN - Quick Sentiment Bars */}
        {results.insights?.operational_themes && (
          <div className={`bg-white rounded-lg shadow-lg ${isCompact ? 'p-4 mb-4' : 'p-6 mb-8'}`}>
            <h2 className={`${isCompact ? 'text-base' : 'text-xl'} font-bold text-gray-900 ${isCompact ? 'mb-3' : 'mb-4'}`}>
              🔍 Key Topics & Sentiment
            </h2>
            <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
              {Object.entries(results.insights.operational_themes)
                .filter(([_, data]: [string, any]) => data.count > 0)
                .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.count - a.count)
                .map(([theme, data]: [string, any]) => {
                  const totalCount = data.count || 0;
                  const positiveCount = data.positive_count || 0;

                  // Calculate percentage positive
                  const positivePercent = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0;

                  // Determine sentiment label
                  let sentimentLabel = '';
                  let sentimentColor = '';
                  let barColor = '';
                  if (positivePercent >= 90) {
                    sentimentLabel = 'Excellent';
                    sentimentColor = 'text-green-700';
                    barColor = 'bg-green-500';
                  } else if (positivePercent >= 50) {
                    sentimentLabel = 'Mostly Positive';
                    sentimentColor = 'text-yellow-700';
                    barColor = 'bg-yellow-500';
                  } else {
                    sentimentLabel = 'Needs Attention';
                    sentimentColor = 'text-red-700';
                    barColor = 'bg-red-500';
                  }

                  return (
                    <div key={theme} className="flex items-center gap-3">
                      <div className={`${isCompact ? 'w-24' : 'w-32'} flex-shrink-0`}>
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {theme.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className={`flex-1 bg-gray-200 rounded-full ${isCompact ? 'h-5' : 'h-6'} overflow-hidden`}>
                          <div
                            className={`h-full flex items-center justify-start px-2 text-xs font-medium text-white transition-all ${barColor}`}
                            style={{ width: `${positivePercent}%` }}
                          >
                            {positivePercent >= 15 && `${positivePercent}%`}
                          </div>
                        </div>
                        <span className={`text-sm font-semibold ${isCompact ? 'w-24' : 'w-32'} text-right ${sentimentColor}`}>
                          {sentimentLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 4. EXAMPLE REVIEWS - Representative Quotes */}
        {results.insights && (
          (results.insights.negative_reviews?.filter((r: any) => r.text && r.text.trim()).length > 0) ||
          (results.insights.positive_reviews?.filter((r: any) => r.text && r.text.trim()).length > 0)
        ) && (
          <div className={`bg-white rounded-lg shadow-lg ${isCompact ? 'p-4 mb-4' : 'p-6 mb-8'}`}>
            <h2 className={`${isCompact ? 'text-base' : 'text-xl'} font-bold text-gray-900 ${isCompact ? 'mb-3' : 'mb-4'}`}>
              💬 Customer Voices
            </h2>

            <div className={`grid ${isCompact ? 'grid-cols-1 gap-3' : 'md:grid-cols-2 gap-4'}`}>
              {/* Critical Feedback */}
              {results.insights.negative_reviews?.filter((r: any) => r.text && r.text.trim()).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                    <span className="text-red-500">👎</span>
                    Critical ({results.insights.negative_reviews.filter((r: any) => r.text && r.text.trim()).length})
                  </h3>
                  <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
                    {results.insights.negative_reviews.filter((r: any) => r.text && r.text.trim()).slice(0, 2).map((review: any, idx: number) => {
                      const key = `negative-${idx}`;
                      const isExpanded = expandedReviews[key];

                      return (
                        <div key={idx} className={`bg-red-50 border-l-3 border-red-400 ${isCompact ? 'p-3' : 'p-4'} rounded`}>
                          <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-700 italic leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            "{review.text}"
                          </p>
                          {review.text && review.text.length > 150 && (
                            <button
                              onClick={() => toggleReview('negative', idx)}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Positive Feedback */}
              {results.insights.positive_reviews?.filter((r: any) => r.text && r.text.trim()).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                    <span className="text-green-500">👍</span>
                    Positive ({results.insights.positive_reviews.filter((r: any) => r.text && r.text.trim()).length})
                  </h3>
                  <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
                    {results.insights.positive_reviews.filter((r: any) => r.text && r.text.trim()).slice(0, 2).map((review: any, idx: number) => {
                      const key = `positive-${idx}`;
                      const isExpanded = expandedReviews[key];

                      return (
                        <div key={idx} className={`bg-green-50 border-l-3 border-green-400 ${isCompact ? 'p-3' : 'p-4'} rounded`}>
                          <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-700 italic leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            "{review.text}"
                          </p>
                          {review.text && review.text.length > 150 && (
                            <button
                              onClick={() => toggleReview('positive', idx)}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. RECOMMENDED MICRO-CHECKS - Tied to Top Issues */}
        {results.micro_check_suggestions && results.micro_check_suggestions.length > 0 && (
          <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-lg ${isCompact ? 'p-4 mb-4' : 'p-6 mb-8'}`}>
            <h2 className={`${isCompact ? 'text-base' : 'text-xl'} font-bold text-gray-900 ${isCompact ? 'mb-2' : 'mb-2'} flex items-center gap-2`}>
              <span>✅</span>
              Recommended Actions
            </h2>
            <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-700 ${isCompact ? 'mb-3' : 'mb-4'}`}>
              Daily micro-checks designed to prevent the issues identified above:
            </p>

            <div className={isCompact ? 'space-y-3' : 'space-y-4'}>
              {results.micro_check_suggestions
                .slice()
                .sort((a: any, b: any) => {
                  // Sort by severity: CRITICAL > HIGH > MEDIUM > LOW
                  const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
                  const severityA = severityOrder[a.severity as keyof typeof severityOrder] ?? 999;
                  const severityB = severityOrder[b.severity as keyof typeof severityOrder] ?? 999;
                  return severityA - severityB;
                })
                .map((suggestion: any, index: number) => (
                <div key={index} className={`bg-white border border-gray-200 rounded-lg ${isCompact ? 'p-3' : 'p-4'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-semibold text-gray-900 ${isCompact ? 'text-sm' : ''}`}>
                      {suggestion.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                      suggestion.severity === 'HIGH' || suggestion.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : suggestion.severity === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.severity}
                    </span>
                  </div>

                  <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-700 mb-2`}>
                    <span className="font-medium">Question:</span> {suggestion.question}
                  </p>

                  <p className="text-xs text-gray-600 mb-2">
                    <span className="font-medium">Success:</span> {suggestion.success_criteria}
                  </p>

                  <div className="text-xs text-gray-500">
                    📊 Based on {suggestion.mentions_in_reviews} customer reviews
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA (only for full variant with showCTA) */}
        {showCTA && !isCompact && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-xl p-8 text-center text-white mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Fix These Issues?
            </h2>
            <p className="text-xl mb-6 text-blue-100">
              Start your free trial and implement these micro-checks today
            </p>
            <button
              onClick={() => window.location.href = `/trial-signup?source=review-analysis&analysis_id=${results.id}`}
              className="bg-white text-blue-600 py-3 px-8 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
            >
              Start Free Trial
            </button>
          </div>
        )}

        {/* Footer Branding (only for full variant with branding) */}
        {showBranding && !isCompact && (
          <div className="text-center text-gray-600 text-sm">
            <p>Powered by <span className="font-semibold text-blue-600">PeakOps</span></p>
            <p className="mt-2">AI-powered operations management for hospitality businesses</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  Store as StoreIcon,
} from 'lucide-react';
import { googleReviewsAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// Types
interface CategoryIssue {
  topic: string;
  total_mentions: number;
  affected_locations: number;
  trend_direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  examples: Array<{
    review_text: string;
    rating: number;
    store?: string;
  }>;
}

interface CategoryData {
  top_issues: CategoryIssue[];
}

interface IssuesResponse {
  categories: Record<string, CategoryData>;
  scope: {
    level: 'store' | 'account' | 'multi_store' | 'brand';
    location_id?: string;
    account_id?: string;
    brand_id?: string;
    store_count?: number;
  };
  stores?: Array<{
    store_id: string;
    store_name: string;
    categories: Record<string, CategoryData>;
  }>;
  regions?: Array<{
    region: string;
    categories: Record<string, CategoryData>;
  }>;
  accounts?: Array<{
    account_id: string;
    account_name: string;
    categories: Record<string, CategoryData>;
  }>;
}

const CATEGORIES = [
  { id: 'Food Quality', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'Service', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'Cleanliness', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'Atmosphere', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'Value', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'Other', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export default function CategoryIssuesDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // View level state
  const [viewLevel, setViewLevel] = useState<'store' | 'multi_store' | 'brand'>(
    (searchParams.get('level') as any) || 'multi_store'
  );

  // Filter state
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedLimit, setSelectedLimit] = useState(3);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedStoreView, setSelectedStoreView] = useState<string | null>(null);

  // Fetch data based on view level
  const { data: issuesData, isLoading, error, refetch } = useQuery<IssuesResponse>(
    ['category-issues', viewLevel, selectedDays, selectedLimit, selectedCategories],
    async () => {
      const params = {
        limit: selectedLimit,
        days: selectedDays,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      if (viewLevel === 'store') {
        const locationId = searchParams.get('location_id');
        return googleReviewsAPI.getTopIssuesByCategory({
          ...params,
          location_id: locationId || undefined,
        });
      } else if (viewLevel === 'multi_store') {
        return googleReviewsAPI.getMultiStoreIssues(params);
      } else {
        // brand level
        const brandId = user?.brand_id?.toString() || searchParams.get('brand_id');
        if (!brandId) throw new Error('Brand ID required for brand-level view');
        return googleReviewsAPI.getBrandIssues(brandId, params);
      }
    },
    {
      refetchOnWindowFocus: false,
      enabled: viewLevel === 'brand' ? !!user?.brand_id : true,
    }
  );

  // Helper functions
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'INCREASING':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'DECREASING':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'STABLE':
        return <Minus className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId)?.color || CATEGORIES[5].color;
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Render issue card
  const renderIssueCard = (issue: CategoryIssue, categoryId: string) => (
    <div
      key={issue.topic}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getTrendIcon(issue.trend_direction)}
            <h4 className="font-semibold text-gray-900">{issue.topic}</h4>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {issue.total_mentions} mentions
            </span>
            {issue.affected_locations > 1 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {issue.affected_locations} locations
              </span>
            )}
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
            categoryId
          )}`}
        >
          {issue.trend_direction}
        </span>
      </div>

      {/* Example reviews */}
      {issue.examples && issue.examples.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-gray-700">Recent examples:</div>
          {issue.examples.slice(0, 2).map((example, idx) => (
            <div
              key={idx}
              className="bg-gray-50 border border-gray-200 rounded p-2 text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-xs ${
                        i < example.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {example.store && (
                  <span className="text-xs text-gray-500">{example.store}</span>
                )}
              </div>
              <p className="text-xs text-gray-700 line-clamp-2">{example.review_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render category section
  const renderCategorySection = (
    categoryId: string,
    categoryData: CategoryData,
    prefix = ''
  ) => {
    const isExpanded = expandedCategories.has(`${prefix}${categoryId}`);
    const issueCount = categoryData.top_issues?.length || 0;

    if (issueCount === 0) return null;

    return (
      <div key={`${prefix}${categoryId}`} className="bg-gray-50 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleCategory(`${prefix}${categoryId}`)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-600" />
            )}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(
                categoryId
              )}`}
            >
              {categoryId}
            </span>
            <span className="text-sm text-gray-600">{issueCount} issues</span>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {categoryData.top_issues.map((issue) =>
              renderIssueCard(issue, categoryId)
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading category insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load Issues
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!issuesData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Category-Based Issue Dashboard
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Top issues grouped by category with trend analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* View Level Selector */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">View:</span>
              <select
                value={viewLevel}
                onChange={(e) => setViewLevel(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="store">Store Level</option>
                <option value="multi_store">Multi-Store (Account)</option>
                {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                  <option value="brand">Brand Level</option>
                ) : null}
              </select>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Days:</span>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            {/* Limit */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Top:</span>
              <select
                value={selectedLimit}
                onChange={(e) => setSelectedLimit(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={3}>3 issues</option>
                <option value={5}>5 issues</option>
                <option value={10}>10 issues</option>
              </select>
            </div>
          </div>

          {/* Category Filters */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Categories:</span>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => toggleCategoryFilter(category.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedCategories.includes(category.id)
                    ? category.color
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category.id}
              </button>
            ))}
          </div>
        </div>

        {/* Scope Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-900">
            {issuesData.scope.level === 'store' && <MapPin className="h-5 w-5" />}
            {issuesData.scope.level === 'multi_store' && <StoreIcon className="h-5 w-5" />}
            {issuesData.scope.level === 'brand' && <Building2 className="h-5 w-5" />}
            <span className="font-medium">
              {issuesData.scope.level === 'store' && 'Store-Level View'}
              {issuesData.scope.level === 'multi_store' &&
                `Multi-Store View (${issuesData.scope.store_count} locations)`}
              {issuesData.scope.level === 'brand' &&
                `Brand-Wide View (${issuesData.scope.store_count} locations across ${
                  issuesData.accounts?.length || 0
                } accounts)`}
            </span>
          </div>
        </div>

        {/* Aggregated Categories */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Aggregated Issues</h2>
          <div className="space-y-3">
            {Object.entries(issuesData.categories || {}).map(([categoryId, categoryData]) =>
              renderCategorySection(categoryId, categoryData)
            )}
          </div>
        </div>

        {/* Per-Store Breakdown (Multi-Store View) */}
        {viewLevel === 'multi_store' && issuesData.stores && issuesData.stores.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Per-Store Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {issuesData.stores.map((store) => (
                <div
                  key={store.store_id}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <StoreIcon className="h-4 w-4 text-blue-500" />
                    {store.store_name}
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(store.categories || {}).map(
                      ([categoryId, categoryData]) => {
                        const issueCount = categoryData.top_issues?.length || 0;
                        if (issueCount === 0) return null;
                        return (
                          <div
                            key={categoryId}
                            className={`px-2 py-1 rounded text-xs ${getCategoryColor(
                              categoryId
                            )}`}
                          >
                            {categoryId}: {issueCount} issues
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regional Breakdown (Brand View) */}
        {viewLevel === 'brand' && issuesData.regions && issuesData.regions.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Regional Breakdown</h2>
            <div className="space-y-6">
              {issuesData.regions.map((region) => (
                <div
                  key={region.region}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-500" />
                    {region.region}
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(region.categories || {}).map(
                      ([categoryId, categoryData]) =>
                        renderCategorySection(categoryId, categoryData, `${region.region}-`)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

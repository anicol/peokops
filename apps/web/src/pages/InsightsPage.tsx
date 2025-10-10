import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Target,
  Calendar,
  Building2,
  MapPin,
  FileText,
  Download,
  Mail,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Award,
  Activity,
} from 'lucide-react';

// Multi-Store Coaching Insights (MVP)
const MultiStoreInsights = () => {
  const [sortColumn, setSortColumn] = useState<string>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Mock data - will be replaced with real API data
  const coachingData = {
    pulse: {
      avgStoreScore: 86,
      totalOpenIssues: 14,
      checksCompletedToday: 72,
      totalStores: 18,
      storesActiveToday: 13,
    },
    storePerformance: [
      { id: 1, name: 'Downtown #1', avgScore: 92, checksThisWeek: 14, openIssues: 1, streak: 5, status: 'excellent' },
      { id: 2, name: 'Uptown #2', avgScore: 84, checksThisWeek: 10, openIssues: 3, streak: 2, status: 'good' },
      { id: 3, name: 'Lakeside #3', avgScore: 79, checksThisWeek: 6, openIssues: 4, streak: 0, status: 'needs-attention' },
      { id: 4, name: 'Elm Street #4', avgScore: 96, checksThisWeek: 15, openIssues: 0, streak: 8, status: 'excellent' },
      { id: 5, name: 'Main St #5', avgScore: 88, checksThisWeek: 12, openIssues: 2, streak: 4, status: 'good' },
      { id: 6, name: 'Harbor #6', avgScore: 75, checksThisWeek: 8, openIssues: 5, streak: 1, status: 'needs-attention' },
    ],
    categoryTrends: [
      { category: 'Cleanliness', avgPassRate: 88, trend: 4 },
      { category: 'Food Safety', avgPassRate: 83, trend: -2 },
      { category: 'Readiness', avgPassRate: 90, trend: 6 },
    ],
    activitySnapshot: {
      completedToday: 15,
      missedToday: 3,
      missed2PlusDays: 4,
    },
    issuesOverview: {
      open: 12,
      resolvedThisWeek: 36,
      avgFixTime: 1.8,
      topRecurring: [
        { issue: 'Sanitizer buckets missing', storeCount: 4 },
        { issue: 'Hand sink soap empty', storeCount: 3 },
        { issue: 'Temperature log incomplete', storeCount: 2 },
      ],
    },
    weeklySummary: {
      storesImproved: 12,
      totalStores: 14,
      topCategory: 'Cleanliness',
      topCategoryChange: 4,
      bottomCategory: 'Food Safety',
      topPerformers: ['Downtown', 'Elm Street'],
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Snapshot - Brand Pulse */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">Multi-Store Dashboard</h1>
            <p className="text-purple-100 text-lg">Team consistency and coaching at a glance</p>
          </div>

          <div className="grid grid-cols-3 gap-4 lg:gap-6">
            {/* Avg Store Score */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <div className="text-4xl font-bold mb-1">{coachingData.pulse.avgStoreScore}%</div>
              <div className="text-xs text-purple-100 font-medium">Avg Store Score</div>
            </div>

            {/* Open Issues */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <div className="text-4xl font-bold mb-1">{coachingData.pulse.totalOpenIssues}</div>
              <div className="text-xs text-purple-100 font-medium">Open Issues</div>
              <div className="mt-1 text-xs text-purple-200">All Stores</div>
            </div>

            {/* Checks Completed Today */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <div className="text-4xl font-bold mb-1">{coachingData.pulse.checksCompletedToday}%</div>
              <div className="text-xs text-purple-100 font-medium">Completed Today</div>
              <div className="mt-1 text-xs text-purple-200">{coachingData.pulse.storesActiveToday}/{coachingData.pulse.totalStores} stores</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            to="/stores"
            className="flex items-center px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm"
          >
            View All Stores
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link
            to="/capture"
            className="flex items-center px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-lg hover:bg-opacity-30 transition-colors font-medium text-sm border border-white border-opacity-30"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Run Check at My Store
          </Link>
        </div>
      </div>

      {/* 2. Store Performance Table (Leaderboard) */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Store className="w-6 h-6 text-purple-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Store Performance</h2>
          </div>
          <p className="text-sm text-gray-600">Click any row to view store details</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Store</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Avg Score</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Checks This Week</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Issues Open</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Streak</th>
              </tr>
            </thead>
            <tbody>
              {coachingData.storePerformance.map((store) => (
                <tr key={store.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {store.status === 'excellent' && <Award className="w-4 h-4 text-yellow-500" />}
                      <span className="font-semibold text-gray-900">{store.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-lg font-bold ${
                      store.avgScore >= 90 ? 'text-green-600' :
                      store.avgScore >= 80 ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>
                      {store.avgScore}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">{store.checksThisWeek}</td>
                  <td className="py-4 px-4 text-center">
                    {store.openIssues > 0 ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        store.openIssues >= 4 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {store.openIssues}
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm font-medium">✓</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {store.streak > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-semibold text-gray-900">{store.streak}d</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">❌ 0d</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Category Trends (Aggregate) */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <BarChart3 className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Category Trends Across Stores</h2>
        </div>

        <div className="space-y-4">
          {coachingData.categoryTrends.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  category.trend > 0 ? 'bg-green-100' : category.trend < 0 ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {category.trend > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : category.trend < 0 ? (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <Target className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{category.category}</div>
                  <div className="text-sm text-gray-600">Avg Pass Rate: {category.avgPassRate}%</div>
                </div>
              </div>
              <div className={`text-2xl font-bold ${
                category.trend > 0 ? 'text-green-600' : category.trend < 0 ? 'text-red-600' : 'text-gray-400'
              }`}>
                {category.trend > 0 ? '↑' : category.trend < 0 ? '↓' : '—'} {Math.abs(category.trend)}%
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-purple-800 text-sm">
            Brand-level strengths and weak spots to guide coaching priorities.
          </p>
        </div>
      </div>

      {/* 4. Store Activity Snapshot */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Activity className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Daily Participation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{coachingData.activitySnapshot.completedToday}</div>
            <div className="text-sm text-gray-700">Stores Completed Today</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-600 mb-1">{coachingData.activitySnapshot.missedToday}</div>
            <div className="text-sm text-gray-700">Stores Missed Today</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">{coachingData.activitySnapshot.missed2PlusDays}</div>
            <div className="text-sm text-gray-700">Missed 2+ Days This Week</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm font-medium">
            {coachingData.activitySnapshot.completedToday} of {coachingData.pulse.totalStores} stores completed checks today.
            {coachingData.activitySnapshot.missed2PlusDays > 0 &&
              ` ${coachingData.activitySnapshot.missed2PlusDays} stores need coaching on consistency.`
            }
          </p>
        </div>
      </div>

      {/* 5. Issues Overview */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <AlertTriangle className="w-6 h-6 text-orange-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Issues Overview</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Action Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Open</span>
                <span className="text-2xl font-bold text-yellow-600">{coachingData.issuesOverview.open}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Resolved This Week</span>
                <span className="text-2xl font-bold text-green-600">{coachingData.issuesOverview.resolvedThisWeek}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600">Avg Fix Time</div>
                <div className="text-xl font-bold text-gray-900">{coachingData.issuesOverview.avgFixTime} days</div>
              </div>
            </div>
          </div>

          {/* Top Recurring Issues */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Recurring Issues</h3>
            <div className="space-y-3">
              {coachingData.issuesOverview.topRecurring.map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{issue.issue}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{issue.storeCount} stores</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Weekly Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg border-2 border-purple-200 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">This Week's Summary</h3>
          <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
            <span className="font-bold text-purple-600">{coachingData.weeklySummary.storesImproved} of {coachingData.weeklySummary.totalStores} stores</span> improved their score this week.{' '}
            <span className="font-bold text-green-600">{coachingData.weeklySummary.topCategory}</span> up {coachingData.weeklySummary.topCategoryChange}%,{' '}
            <span className="font-bold text-orange-600">{coachingData.weeklySummary.bottomCategory}</span> slightly down.{' '}
            Top performers: <span className="font-bold text-gray-900">{coachingData.weeklySummary.topPerformers.join(' & ')}</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

// Single Store Manager Insights (MVP)
const SingleStoreInsights = () => {
  // Mock data - will be replaced with real API data
  const storeData = {
    today: {
      score: 88,
      delta: 6,
      openIssues: 2,
    },
    metrics: {
      streak: 5,
      checksThisWeek: 12,
      fixRate: 85,
      avgCheckTime: '1m 42s',
    },
    categoryTrends: [
      { name: 'Cleanliness', change: 8, direction: 'up' },
      { name: 'Food Safety', change: -4, direction: 'down' },
      { name: 'Prep Readiness', change: 2, direction: 'up' },
    ],
    openIssues: [
      { title: 'Hand sink soap empty', daysOpen: 2, status: 'critical' },
      { title: 'Sanitizer bucket missing', assignedTo: 'prep lead', status: 'warning' },
      { title: 'Temp log incomplete', dueDate: 'today', status: 'warning' },
    ],
    recentChecks: [
      { date: 'Today (AM)', score: 88, result: 'pass', issuesFixed: 1 },
      { date: 'Yesterday', score: 82, result: 'pass', issuesFixed: 2 },
      { date: 'Oct 5', score: 70, result: 'warn', issuesOpen: 3 },
      { date: 'Oct 4', score: 85, result: 'pass', issuesFixed: 1 },
      { date: 'Oct 3', score: 90, result: 'pass', issuesFixed: 0 },
    ],
    weeklySummary: {
      checksCompleted: 15,
      scoreImprovement: 12,
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Snapshot - Store Pulse */}
      <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">Store Pulse</h1>
            <p className="text-teal-50 text-lg">Quick snapshot of your operational health</p>
          </div>

          <div className="grid grid-cols-3 gap-4 lg:gap-6">
            {/* Today's Score */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <div className="text-4xl font-bold mb-1">{storeData.today.score}%</div>
              <div className="text-xs text-teal-50 font-medium">Today's Score</div>
              <div className="flex items-center justify-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="font-semibold">+{storeData.today.delta}%</span>
              </div>
            </div>

            {/* Open Issues */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <div className="text-4xl font-bold mb-1">{storeData.today.openIssues}</div>
              <div className="text-xs text-teal-50 font-medium">Need Fixing</div>
              <div className="mt-2 text-xs text-teal-100">Open Issues</div>
            </div>

            {/* Quick CTA */}
            <Link
              to="/capture"
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl p-4 flex flex-col items-center justify-center transition-colors border-2 border-yellow-300"
            >
              <CheckCircle className="w-8 h-8 mb-1" />
              <div className="text-xs font-bold">Run New Check</div>
              <ArrowRight className="w-4 h-4 mt-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Key Metrics</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Streak */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full mb-3">
              <Flame className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {storeData.metrics.streak}
            </div>
            <div className="text-sm text-gray-600 font-medium">Days Straight</div>
            <div className="text-xs text-gray-500 mt-1">Consistency Streak</div>
          </div>

          {/* Checks This Week */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full mb-3">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {storeData.metrics.checksThisWeek}
            </div>
            <div className="text-sm text-gray-600 font-medium">Completed</div>
            <div className="text-xs text-gray-500 mt-1">Checks This Week</div>
          </div>

          {/* Fix Rate */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-full mb-3">
              <Target className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {storeData.metrics.fixRate}%
            </div>
            <div className="text-sm text-gray-600 font-medium">Fixed</div>
            <div className="text-xs text-gray-500 mt-1">Issue Resolution</div>
          </div>

          {/* Avg Check Time */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full mb-3">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {storeData.metrics.avgCheckTime}
            </div>
            <div className="text-sm text-gray-600 font-medium">Average</div>
            <div className="text-xs text-gray-500 mt-1">Check Duration</div>
          </div>
        </div>
      </div>

      {/* 3. Category Trends */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Category Trends</h2>
        </div>

        <div className="space-y-4">
          {storeData.categoryTrends.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  category.direction === 'up' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {category.direction === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <span className="font-semibold text-gray-900 text-lg">{category.name}</span>
              </div>
              <div className={`text-2xl font-bold ${
                category.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {category.direction === 'up' ? '↑' : '↓'} {Math.abs(category.change)}%
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-teal-800 text-sm">
            Your daily checks are directly improving category performance. Keep going!
          </p>
        </div>
      </div>

      {/* 4. Open Issues Summary */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-orange-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Open Issues</h2>
          </div>
          <Link
            to="/actions"
            className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="space-y-3">
          {storeData.openIssues.map((issue, index) => (
            <div
              key={index}
              className={`flex items-start p-4 rounded-lg border-2 ${
                issue.status === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                issue.status === 'critical' ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{issue.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {issue.daysOpen && `${issue.daysOpen} days open`}
                  {issue.assignedTo && `Assigned to ${issue.assignedTo}`}
                  {issue.dueDate && `Due ${issue.dueDate}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {storeData.openIssues.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No open issues at the moment.</p>
          </div>
        )}
      </div>

      {/* 5. Recent Checks History */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Calendar className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Recent Checks</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Result</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Issues</th>
              </tr>
            </thead>
            <tbody>
              {storeData.recentChecks.map((check, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm text-gray-900 font-medium">{check.date}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {check.result === 'pass' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        check.result === 'pass' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {check.score}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-600">
                    {check.issuesFixed !== undefined && `${check.issuesFixed} Fixed`}
                    {check.issuesOpen !== undefined && `${check.issuesOpen} Issues`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Weekly Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border-2 border-blue-200 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">This Week's Summary</h3>
          <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
            You completed <span className="font-bold text-blue-600">{storeData.weeklySummary.checksCompleted} checks</span> this week
            and improved your average score by <span className="font-bold text-green-600">{storeData.weeklySummary.scoreImprovement}%</span>.
            Keep it going!
          </p>
        </div>
      </div>
    </div>
  );
};

// Enterprise Brand Insights (MVP)
const EnterpriseInsights = () => {
  const [sortColumn, setSortColumn] = useState<string>('region');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Mock data - will be replaced with real API data
  const brandData = {
    pulse: {
      activeStores: 482,
      totalStores: 520,
      avgCompliance: 91.3,
      criticalFindings: 3,
      weekOverWeekTrend: 2.8,
    },
    regionalRollup: [
      { region: 'Southeast', avgScore: 92, stores: 118, checksCompletion: 96, criticalIssues: 1, trend: 2 },
      { region: 'Midwest', avgScore: 89, stores: 105, checksCompletion: 88, criticalIssues: 2, trend: -3 },
      { region: 'West Coast', avgScore: 93, stores: 122, checksCompletion: 98, criticalIssues: 0, trend: 1 },
      { region: 'Northeast', avgScore: 90, stores: 137, checksCompletion: 92, criticalIssues: 0, trend: 4 },
    ],
    categoryTrends: [
      { category: 'Food Safety', passRate: 88, trend: 4, highRiskStores: 12 },
      { category: 'Cleanliness', passRate: 93, trend: -1, highRiskStores: 5 },
      { category: 'Readiness', passRate: 90, trend: 3, highRiskStores: 8 },
    ],
    complianceHeatmap: [
      { id: 1, name: 'Store #1201', score: 95, status: 'consistent' },
      { id: 2, name: 'Store #1202', score: 78, status: 'inconsistent' },
      { id: 3, name: 'Store #1203', score: 92, status: 'consistent' },
      { id: 4, name: 'Store #1204', score: 58, status: 'at-risk' },
      { id: 5, name: 'Store #1205', score: 89, status: 'consistent' },
      { id: 6, name: 'Store #1206', score: 72, status: 'inconsistent' },
      // ... would have many more in real app
    ],
    correctiveActions: {
      open: 34,
      inProgress: 18,
      resolved: 92,
      avgResolutionTime: 2.1,
      topRecurring: [
        { issue: 'Hand sink soap empty', storeCount: 15 },
        { issue: 'Sanitizer bucket missing', storeCount: 12 },
        { issue: 'Temperature log incomplete', storeCount: 9 },
      ],
    },
    brandTrends: [
      { week: 'Week 1', score: 88 },
      { week: 'Week 2', score: 89 },
      { week: 'Week 3', score: 90 },
      { week: 'Week 4', score: 91.3 },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'consistent': return 'bg-green-500';
      case 'inconsistent': return 'bg-yellow-500';
      case 'at-risk': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Snapshot - Brand Pulse */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Brand Command Center</h1>
            <p className="text-indigo-100 text-lg">Enterprise-wide operational visibility</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Stores */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <Building2 className="w-6 h-6 mx-auto mb-2 text-white" />
              <div className="text-3xl font-bold mb-1">{brandData.pulse.activeStores}/{brandData.pulse.totalStores}</div>
              <div className="text-xs text-indigo-100 font-medium">Active Stores Today</div>
            </div>

            {/* Avg Compliance */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-white" />
              <div className="text-3xl font-bold mb-1">{brandData.pulse.avgCompliance}%</div>
              <div className="text-xs text-indigo-100 font-medium">Avg Compliance</div>
            </div>

            {/* Critical Findings */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-white" />
              <div className="text-3xl font-bold mb-1">{brandData.pulse.criticalFindings}</div>
              <div className="text-xs text-indigo-100 font-medium">Critical Findings</div>
            </div>

            {/* Week-Over-Week */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-30">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-white" />
              <div className="text-3xl font-bold mb-1">↑{brandData.pulse.weekOverWeekTrend}%</div>
              <div className="text-xs text-indigo-100 font-medium">WoW Improvement</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            to="/stores"
            className="flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
          >
            View Store List
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <button className="flex items-center px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-lg hover:bg-opacity-30 transition-colors font-medium text-sm border border-white border-opacity-30">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </button>
        </div>
      </div>

      {/* 2. Regional/Franchise Roll-Up Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <MapPin className="w-6 h-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Regional Performance</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Region</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Avg Score</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Stores</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Checks Done</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Critical Issues</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody>
              {brandData.regionalRollup.map((region, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="py-4 px-4 text-sm font-semibold text-gray-900">{region.region}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-lg font-bold ${
                      region.avgScore >= 90 ? 'text-green-600' : region.avgScore >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {region.avgScore}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">{region.stores}</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">{region.checksCompletion}%</td>
                  <td className="py-4 px-4 text-center">
                    {region.criticalIssues > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {region.criticalIssues}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className={`flex items-center justify-center text-sm font-semibold ${
                      region.trend > 0 ? 'text-green-600' : region.trend < 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {region.trend > 0 ? (
                        <>
                          <ArrowUpRight className="w-4 h-4 mr-1" />
                          +{region.trend}%
                        </>
                      ) : region.trend < 0 ? (
                        <>
                          <ArrowDownRight className="w-4 h-4 mr-1" />
                          {region.trend}%
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Category Trends (Brand-Level) */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <BarChart3 className="w-6 h-6 text-indigo-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Category Performance</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Category</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Pass Rate</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Trend</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">High-Risk Stores</th>
              </tr>
            </thead>
            <tbody>
              {brandData.categoryTrends.map((category, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm font-semibold text-gray-900">{category.category}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-lg font-bold ${
                      category.passRate >= 90 ? 'text-green-600' : category.passRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {category.passRate}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className={`flex items-center justify-center text-sm font-semibold ${
                      category.trend > 0 ? 'text-green-600' : category.trend < 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {category.trend > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4 mr-1" />
                          +{category.trend}%
                        </>
                      ) : category.trend < 0 ? (
                        <>
                          <TrendingDown className="w-4 h-4 mr-1" />
                          {category.trend}%
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {category.highRiskStores}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Compliance Heatmap */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Store Compliance Overview</h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Consistent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">Inconsistent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">At-Risk</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-15 gap-2">
          {brandData.complianceHeatmap.map((store) => (
            <div
              key={store.id}
              className={`w-10 h-10 rounded-lg ${getStatusColor(store.status)} hover:opacity-80 transition-opacity cursor-pointer`}
              title={`${store.name}: ${store.score}%`}
            ></div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Hover over squares to see store details. Click to drill down.
        </p>
      </div>

      {/* 5. Corrective Actions Summary */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Target className="w-6 h-6 text-indigo-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Corrective Actions</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Action Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Open</span>
                <span className="text-2xl font-bold text-yellow-600">{brandData.correctiveActions.open}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-gray-900">In Progress</span>
                <span className="text-2xl font-bold text-blue-600">{brandData.correctiveActions.inProgress}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Resolved</span>
                <span className="text-2xl font-bold text-green-600">{brandData.correctiveActions.resolved}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600">Avg Resolution Time</div>
              <div className="text-xl font-bold text-gray-900">{brandData.correctiveActions.avgResolutionTime} days</div>
            </div>
          </div>

          {/* Top Recurring Issues */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Recurring Issues</h3>
            <div className="space-y-3">
              {brandData.correctiveActions.topRecurring.map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{issue.issue}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{issue.storeCount} stores</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Brand Trends */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Brand Compliance Trend</h2>
        </div>

        <div className="h-64 flex items-end justify-between gap-4">
          {brandData.brandTrends.map((week, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg relative hover:from-indigo-600 hover:to-indigo-500 transition-colors cursor-pointer"
                   style={{ height: `${(week.score / 100) * 100}%` }}>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-bold text-gray-900">
                  {week.score}%
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">{week.week}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm font-medium text-center">
            Brand compliance improved +3.2% over the past 4 weeks.
          </p>
        </div>
      </div>

      {/* 7. Export Panel */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg border-2 border-gray-300 p-8">
        <div className="text-center mb-6">
          <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Reports & Exports</h3>
          <p className="text-gray-600">Share insights with your team and stakeholders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex flex-col items-center p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all">
            <Download className="w-8 h-8 text-indigo-600 mb-2" />
            <div className="font-semibold text-gray-900 mb-1">Weekly Report</div>
            <div className="text-xs text-gray-600">PDF Download</div>
          </button>

          <button className="flex flex-col items-center p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all">
            <FileText className="w-8 h-8 text-indigo-600 mb-2" />
            <div className="font-semibold text-gray-900 mb-1">Detailed Data</div>
            <div className="text-xs text-gray-600">CSV Export</div>
          </button>

          <button className="flex flex-col items-center p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all">
            <Mail className="w-8 h-8 text-indigo-600 mb-2" />
            <div className="font-semibold text-gray-900 mb-1">Email Summary</div>
            <div className="text-xs text-gray-600">Schedule Weekly</div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Insights Component with Role-Based Rendering
const Insights = () => {
  const { user } = useAuth();

  // Determine which view to show based on user role and store access
  // SUPER_ADMIN = Enterprise brand view (system-wide access)
  // ADMIN = Enterprise brand view (all stores, regional rollup)
  // OWNER = Multi-store coaching view (franchise/multi-location)
  // GM/INSPECTOR = Single store view (their assigned store only)

  const getInsightsView = () => {
    if (!user) return <SingleStoreInsights />;

    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return <EnterpriseInsights />;
    } else if (user.role === 'OWNER') {
      // OWNERs typically manage multiple stores - show coaching view
      return <MultiStoreInsights />;
    } else {
      // GM and INSPECTOR roles see single store view
      return <SingleStoreInsights />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {getInsightsView()}
    </div>
  );
};

export default Insights;

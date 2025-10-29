'use client';

import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  BarChart,
  TrendingUp,
  ArrowRight,
  Sparkles,
  FileText,
  Target,
  Link2
} from 'lucide-react';

export default function ReviewAnalysisPage() {
  const handleGetStarted = () => {
    // Redirect to the working review analysis tool in the web app
    const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000';
    window.location.href = `${webAppUrl}/review-analysis`;
  };


  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">100% Free Analysis • No Credit Card Required</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Free Google Reviews Analysis
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-4 leading-relaxed">
              Get insights in 60 seconds
            </p>
            <p className="text-lg text-blue-100 mb-8 leading-relaxed max-w-2xl mx-auto">
              Instantly see what guests are saying across your locations. Get a personalized report with top 3 improvement opportunities — no signup required.
            </p>
            <a
              href="#form"
              className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Analyze My Reviews Free →
            </a>
            <p className="text-blue-200 text-sm mt-4">
              No credit card required • Takes 2 minutes • Results in 24 hours
            </p>
          </div>
        </div>
      </section>

      {/* What You'll Get Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                See What Your Reviews Are Really Saying
              </h2>
              <p className="text-xl text-gray-600">
                Get a free AI-powered analysis of your Google reviews. We'll show you the patterns, priority issues, and specific micro-checks to implement.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                What You'll Get (100% Free):
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-500 rounded-full p-1 mt-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Detailed Breakdown</h4>
                    <p className="text-gray-700">
                      Detailed breakdown of your top operational issues
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-500 rounded-full p-1 mt-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Sentiment Analysis</h4>
                    <p className="text-gray-700">
                      Sentiment analysis showing trends over time
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-500 rounded-full p-1 mt-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Recommended Micro-Checks</h4>
                    <p className="text-gray-700">
                      Recommended micro-checks tailored to your specific feedback
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-500 rounded-full p-1 mt-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Priority Ranking</h4>
                    <p className="text-gray-700">
                      Priority ranking so you know where to start
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section id="form" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8">
                <h2 className="text-3xl font-bold mb-2">Get Your Free Analysis</h2>
                <p className="text-blue-100">
                  Takes 2 minutes. Results delivered within 24 hours.
                </p>
              </div>

              <div className="p-8">
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Get Your Free Analysis in 3 Easy Steps
                    </h3>
                    <div className="space-y-4 text-left max-w-md mx-auto mb-8">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          1
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Search for your business</p>
                          <p className="text-sm text-gray-600">We use Google Places Autocomplete for accuracy</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          2
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">AI analyzes your reviews</p>
                          <p className="text-sm text-gray-600">Takes 1-2 minutes to process all your reviews</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          3
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Get actionable insights</p>
                          <p className="text-sm text-gray-600">See top issues and recommended micro-checks</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGetStarted}
                    className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg"
                  >
                    Start Your Free Analysis →
                  </button>

                  <p className="text-sm text-gray-500">
                    No credit card required • Takes 2 minutes • Instant results
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to actionable insights.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Link2 className="w-10 h-10 text-blue-600" />
              </div>
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Share Your Profile
              </h3>
              <p className="text-gray-600">
                Simply paste your Google Business Profile URL and we'll pull your reviews.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-indigo-600" />
              </div>
              <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Analyzes Reviews
              </h3>
              <p className="text-gray-600">
                Our AI identifies patterns, sentiment trends, and specific operational issues.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-green-600" />
              </div>
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Get Your Report
              </h3>
              <p className="text-gray-600">
                Receive actionable insights delivered to your inbox within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's in the Report */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What's in Your Report?
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Top 3 Issues
                </h3>
                <p className="text-gray-600">
                  The most frequently mentioned problems across your reviews, ranked by impact and urgency.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sentiment Trends
                </h3>
                <p className="text-gray-600">
                  How customer sentiment has changed over time, with insights on what's improving or declining.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Recommended Actions
                </h3>
                <p className="text-gray-600">
                  Specific micro-checks and daily habits tailored to address your top issues.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Performance Snapshot
                </h3>
                <p className="text-gray-600">
                  Key metrics like average rating, review volume trends, and response rate analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Want to See the Full Platform in Action?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Beyond free analysis, PeakOps helps you turn insights into daily habits with automated micro-checks, shift-based delivery, and progress tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#form"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
              >
                Get Free Analysis First
              </a>
              <Link
                href="/demo"
                className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg inline-flex items-center justify-center"
              >
                Request Full Demo
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

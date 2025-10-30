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

export const metadata = {
  title: 'Free Google Reviews Analysis for Restaurants | AI-Powered Insights | PeakOps',
  description: 'Get instant, free AI analysis of your restaurant\'s Google reviews. Discover what customers really think, identify top issues, and get actionable micro-checks to improve operations. No credit card required.',
  keywords: 'google reviews analysis, restaurant review analysis, customer feedback analysis, AI review insights, restaurant operations, hospitality management, review sentiment analysis, customer experience improvement',
  openGraph: {
    title: 'Free Google Reviews Analysis - Turn Feedback into Action',
    description: 'Instantly analyze your restaurant\'s Google reviews with AI. Get top issues, sentiment trends, and recommended daily micro-checks - 100% free.',
    type: 'website',
    url: 'https://getpeakops.com/reviews',
    images: [
      {
        url: '/og-reviews.png',
        width: 1200,
        height: 630,
        alt: 'PeakOps Free Google Reviews Analysis'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Google Reviews Analysis for Restaurants',
    description: 'AI-powered analysis of your Google reviews. Get actionable insights in 60 seconds - no credit card required.',
    images: ['/og-reviews.png']
  },
  alternates: {
    canonical: 'https://getpeakops.com/reviews'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
};

export default function ReviewAnalysisPage() {
  const handleGetStarted = () => {
    // Redirect to the working review analysis tool in the web app
    const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000';
    window.location.href = `${webAppUrl}/review-analysis`;
  };

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'PeakOps Google Reviews Analysis',
    'applicationCategory': 'BusinessApplication',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD'
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '5.0',
      'reviewCount': '47'
    },
    'description': 'Free AI-powered Google Reviews analysis for restaurants and hospitality businesses. Get instant insights, sentiment analysis, and actionable micro-checks.',
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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
                Free Google Reviews Analysis for Restaurants
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-4 leading-relaxed">
                Turn customer feedback into actionable insights in 60 seconds
              </p>
              <p className="text-lg text-blue-100 mb-8 leading-relaxed max-w-2xl mx-auto">
                AI-powered analysis of your Google reviews. Discover what customers really think, identify your top 3 issues, and get personalized micro-checks to improve operations — no signup required.
              </p>
              <a
                href="#form"
                className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
              >
                Analyze My Reviews Free →
              </a>
              <p className="text-blue-200 text-sm mt-4">
                No credit card required • Takes 2 minutes • Results delivered instantly
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
                  See What Your Customers Are Really Saying
                </h2>
                <p className="text-xl text-gray-600">
                  Get a free AI-powered analysis of your Google reviews. We'll show you the patterns, priority issues, and specific daily checks to implement for improvement.
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
                      <h4 className="font-semibold text-gray-900 mb-1">Top Priority Issues</h4>
                      <p className="text-gray-700">
                        Detailed breakdown of your top operational issues ranked by customer mention frequency
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
                        Customer sentiment breakdown by category with trend indicators
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-green-500 rounded-full p-1 mt-1">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Custom Micro-Checks</h4>
                      <p className="text-gray-700">
                        Daily check recommendations tailored to your specific customer feedback
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
                        Clear priority levels so you know exactly where to focus first
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
                  <h2 className="text-3xl font-bold mb-2">Get Your Free Restaurant Review Analysis</h2>
                  <p className="text-blue-100">
                    Takes 2 minutes. Instant results with actionable insights.
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
                            <p className="font-semibold text-gray-900">Search for your restaurant</p>
                            <p className="text-sm text-gray-600">We use Google Places Autocomplete for accuracy</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                            2
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">AI analyzes your reviews</p>
                            <p className="text-sm text-gray-600">Takes 1-2 minutes to process all your Google reviews</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                            3
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Get actionable insights</p>
                            <p className="text-sm text-gray-600">View top issues and recommended daily micro-checks</p>
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
                How Our Restaurant Review Analysis Works
              </h2>
              <p className="text-xl text-gray-600">
                Three simple steps to transform customer feedback into operational improvements.
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
                  Connect Your Reviews
                </h3>
                <p className="text-gray-600">
                  Enter your business name and we'll automatically pull your Google reviews for analysis.
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
                  AI Analyzes Patterns
                </h3>
                <p className="text-gray-600">
                  Our AI identifies recurring themes, sentiment trends, and specific operational issues mentioned by customers.
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
                  Get Actionable Report
                </h3>
                <p className="text-gray-600">
                  Receive a detailed report with priority issues and recommended daily micro-checks tailored to your feedback.
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
                  What's Included in Your Free Report?
                </h2>
                <p className="text-xl text-gray-600">
                  Everything you need to understand and improve your customer experience
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Top 3 Priority Issues
                  </h3>
                  <p className="text-gray-600">
                    The most frequently mentioned problems across your reviews, ranked by customer impact and urgency level.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Sentiment Trends by Category
                  </h3>
                  <p className="text-gray-600">
                    Customer sentiment breakdown for food quality, service, cleanliness, and ambiance with trend indicators.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Custom Micro-Check Recommendations
                  </h3>
                  <p className="text-gray-600">
                    Specific daily checks and habits tailored to address your restaurant's unique customer feedback patterns.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <BarChart className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Performance Metrics
                  </h3>
                  <p className="text-gray-600">
                    Key statistics including average rating, total reviews analyzed, and rating distribution breakdown.
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
                Ready to Turn Insights Into Action?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Beyond free analysis, PeakOps helps you implement improvements with automated micro-checks, shift-based delivery to your team, and progress tracking dashboards.
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

        {/* FAQ Section for SEO */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How does the Google reviews analysis work?
                </h3>
                <p className="text-gray-600">
                  Our AI analyzes your restaurant's Google reviews to identify patterns, sentiment trends, and operational issues. We pull reviews directly from Google Business Profile, analyze the text and ratings, then generate actionable insights and micro-check recommendations tailored to your specific feedback.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Is the review analysis really free?
                </h3>
                <p className="text-gray-600">
                  Yes! The Google reviews analysis is 100% free with no credit card required. You'll get a complete report with top issues, sentiment analysis, and micro-check recommendations. This helps you see the value before deciding if you want to implement the full PeakOps platform.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How many reviews do you analyze?
                </h3>
                <p className="text-gray-600">
                  We analyze all available Google reviews for your restaurant location. Our AI processes both recent and historical reviews to identify trends and patterns in customer feedback over time.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What are micro-checks and how do they help?
                </h3>
                <p className="text-gray-600">
                  Micro-checks are quick daily checks (under 2 minutes) that your team performs to prevent issues before they reach customers. Based on your review analysis, we recommend specific checks tailored to your feedback patterns - like verifying food temperature, checking cleanliness standards, or monitoring service timing.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Can I analyze multiple restaurant locations?
                </h3>
                <p className="text-gray-600">
                  Yes! You can analyze multiple locations. Each location will get its own customized report with insights specific to that location's customer feedback. The full PeakOps platform supports multi-location management with centralized dashboards.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

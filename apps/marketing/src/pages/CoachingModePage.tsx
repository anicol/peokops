import React from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, X, Clock, Shield, Star, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { TRIAL_SIGNUP_URL } from '../config/urls';

export default function CoachingModePage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="Coaching Mode - Private Restaurant Inspections | PeakOps"
        description="Get instant AI feedback on restaurant operations with our private coaching mode. Videos deleted after processing. Perfect for training managers and improving standards without compliance pressure."
        keywords="restaurant coaching, private inspections, restaurant training, manager coaching, food safety training, restaurant operations training, coaching mode"
        url="https://getpeakops.com/coaching"
        type="website"
      />
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Build Confidence Before the Audit
            </h1>
            <p className="text-xl md:text-2xl text-teal-100 mb-4 leading-relaxed">
              Give every manager an AI-powered coach that spots issues early — privately, instantly, and without the pressure of inspection day.
            </p>
            <p className="text-xl text-teal-100 mb-8 leading-relaxed">
              No inspectors. No travel. No stress. Just better operations every day.
            </p>
            <div className="mb-8">
              <a
                href={TRIAL_SIGNUP_URL}
                className="inline-block px-8 py-4 bg-teal-400 text-teal-900 rounded-lg hover:bg-teal-300 transition-colors font-semibold text-lg shadow-lg"
              >
                Start Free
              </a>
            </div>
            <p className="text-teal-200 text-sm">
              7-day trial • No credit card • Complete privacy
            </p>
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
              Three simple steps to proactive improvement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Play className="w-10 h-10 text-teal-600" />
              </div>
              <div className="bg-teal-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Record a 2-Minute Walkthrough
              </h3>
              <p className="text-gray-600">
                Capture your store on any smartphone — kitchen, dining, lobby, anywhere.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-blue-600" />
              </div>
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Reviews Instantly
              </h3>
              <p className="text-gray-600">
                Get private, timestamped feedback in minutes. No waiting weeks for audit results.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-orange-600" />
              </div>
              <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Review Your Private Scorecard
              </h3>
              <p className="text-gray-600">
                See exactly what to fix and what's working. Your video is automatically deleted for complete privacy.
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg text-teal-600 font-medium">
              AI that helps you shine — not get watched.
            </p>
          </div>
        </div>
      </section>

      {/* Pain Callout */}
      <section className="py-20 bg-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Inspections Feel Broken
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Managers aren't failing — the system is.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Surprise visits cause stress.</h3>
                <p className="text-gray-600 text-sm">You're preparing under pressure, not improving with intention.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Small issues turn into big failures.</h3>
                <p className="text-gray-600 text-sm">Because feedback comes too late.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Morale takes a hit.</h3>
                <p className="text-gray-600 text-sm">Teams feel judged instead of supported.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Inconsistent standards.</h3>
                <p className="text-gray-600 text-sm">Every inspector looks for something different.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Reactive, not proactive.</h3>
                <p className="text-gray-600 text-sm">You're managing defensively instead of building daily excellence.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200 md:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Built for oversight.</h3>
                <p className="text-gray-600 text-sm">Inspections were built for oversight, not improvement.</p>
              </div>
            </div>

            <div className="bg-teal-600 text-white p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">
                Inspections were built for oversight. Coaching Mode was built for improvement.
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* A Better Way */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              A Better Way to Build Confidence
            </h2>
            <p className="text-xl text-gray-600">
              Coaching Mode turns every manager into their own auditor — with private feedback that builds skill, not anxiety.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Benefit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Shield className="w-5 h-5 text-teal-600 mr-3 flex-shrink-0" />
                        <span className="font-medium text-gray-900">🔒 Private Feedback</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Results stay at the store. Build confidence before corporate sees it.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                        <span className="font-medium text-gray-900">⚡ Instant Results</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Get feedback in minutes — while it still matters.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0" />
                        <span className="font-medium text-gray-900">🎯 Actionable Reports</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Clear priorities, timestamps, and steps to fix issues fast.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Star className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                        <span className="font-medium text-gray-900">🕒 Lightweight Workflow</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Two minutes, no scheduling, no travel, no disruption.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-teal-50 border-l-4 border-teal-600 p-6 rounded-lg mb-8">
              <p className="text-lg text-gray-800 italic">
                "We caught three small issues before our next audit. It turned stress into confidence."
              </p>
              <p className="text-sm text-gray-600 mt-2">— Store Manager, QSR Chain</p>
            </div>

            <div className="text-center">
              <a
                href={TRIAL_SIGNUP_URL}
                className="inline-block px-8 py-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg shadow-lg"
              >
                Start Free
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Example Coaching Report */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Sample Coaching Report
            </h2>
            <p className="text-xl text-gray-600">
              See what instant, private feedback looks like.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">Store Coaching Report</h3>
                    <p className="text-teal-100">Generated: March 15, 2024 at 2:30 PM</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">88%</div>
                    <div className="text-teal-100">Overall Score</div>
                  </div>
                </div>
              </div>

              {/* Scores */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">92%</div>
                    <div className="text-gray-600">Uniforms</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">78%</div>
                    <div className="text-gray-600">Cleanliness</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">95%</div>
                    <div className="text-gray-600">Safety</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Items */}
              <div className="p-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-4">Priority Action Items</h4>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Clean drink station area</div>
                      <div className="text-sm text-gray-600">Timestamp: 1:23 - Visible spills and sticky surfaces detected</div>
                      <div className="text-sm text-yellow-700 mt-1">Medium Priority</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Straighten uniform name tags</div>
                      <div className="text-sm text-gray-600">Timestamp: 0:45 - Two team members have crooked/missing tags</div>
                      <div className="text-sm text-blue-700 mt-1">Low Priority</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Excellent safety compliance</div>
                      <div className="text-sm text-gray-600">All safety equipment visible and accessible</div>
                      <div className="text-sm text-green-700 mt-1">Keep up the great work!</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-gray-50 p-6 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>✅ Video deleted after analysis</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>✅ Report stays local only</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>✅ Action list ready for next shift</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Start Coaching Free */}
      <section id="trial" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Start Coaching Free
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Build consistency and confidence before your next audit.
            </p>

            <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-12 rounded-2xl">
              <a
                href={TRIAL_SIGNUP_URL}
                className="inline-block px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg mb-4"
              >
                Start Free
              </a>
              <p className="text-teal-200 text-sm">
                7 days unlimited • No credit card • Complete privacy
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* When You're Ready to Scale */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              When You're Ready to Scale
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Upgrade from coaching to full visibility.
            </p>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Coaching Mode</th>
                      <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Enterprise Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-gray-700">Private, local improvement</td>
                      <td className="px-6 py-4 text-gray-700">Centralized visibility</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-gray-700">Deleted after analysis</td>
                      <td className="px-6 py-4 text-gray-700">Retained for compliance</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-gray-700">Store-level progress</td>
                      <td className="px-6 py-4 text-gray-700">Brand-wide dashboards</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-gray-700">Confidence building</td>
                      <td className="px-6 py-4 text-gray-700">Compliance tracking</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8">
                <Link
                  to="/enterprise"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Learn About Enterprise
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            "Coaching today. Confidence tomorrow."
          </h2>
          <p className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
            Stop getting blindsided by inspection failures. Start building a culture of daily improvement with AI that helps you shine.
          </p>
          <a
            href={TRIAL_SIGNUP_URL}
            className="inline-block px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
          >
            Start Free Trial
          </a>
          <p className="text-teal-200 text-sm mt-4">
            7 days unlimited • No credit card • Complete privacy
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Zap, TrendingUp, Users, X, ArrowRight } from 'lucide-react';
import { TRIAL_SIGNUP_URL } from '../../src/config/urls';

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-teal-700 to-green-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-6xl mb-6">🧭</div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Consistency Starts Small<br />
              One Check at a Time
            </h1>
            <p className="text-xl md:text-2xl text-green-100 mb-4 leading-relaxed">
              Turn daily actions into lasting habits with quick micro-checks that keep your team focused, confident, and inspection ready.
            </p>
            <p className="text-lg text-green-100 mb-8 leading-relaxed">
              PeakOps sends three quick prompts that help every manager spot issues early and reinforce brand standards daily: no setup, no stress.
            </p>
            <div className="mb-8">
              <a
                href={TRIAL_SIGNUP_URL}
                className="inline-block px-8 py-4 bg-green-400 text-green-900 rounded-lg hover:bg-green-300 transition-colors font-semibold text-lg shadow-lg"
              >
                Start Free
              </a>
            </div>
            <p className="text-green-200 text-sm mb-2">
              7-day free trial • No credit card required
            </p>
            <p className="text-green-200 text-sm">
              ✅ 3 checks per day • ✅ Less than 1 minute • ✅ No login or training needed
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Consistency Slips
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Audits and training fix problems too late. By the time issues are caught, habits have already drifted.
            </p>
            <p className="text-lg text-gray-600 mb-12">
              Even great teams struggle with consistency—not from lack of effort, but from lack of daily rhythm.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Too many priorities.</h3>
                <p className="text-gray-600 text-sm">Managers get pulled in every direction.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">No simple system.</h3>
                <p className="text-gray-600 text-sm">Checklists are static; inspections are occasional.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Daily drift.</h3>
                <p className="text-gray-600 text-sm">Standards fade between audits.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Reactive culture.</h3>
                <p className="text-gray-600 text-sm">Fixing problems after they happen instead of preventing them.</p>
              </div>
            </div>

            <div className="bg-green-600 text-white p-8 rounded-2xl mb-6">
              <h3 className="text-2xl font-bold mb-2">
                The result? Inconsistency creeps in, quietly, every day.
              </h3>
              <p className="text-green-100 text-lg">
                The fix is simpler than you think: small, daily habits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Meet The Guide: Your Daily Habit Builder
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
              The Guide makes consistency easy with three quick micro-checks sent straight to your phone or inbox.
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Each check takes less than one minute to complete: no logins, no dashboards, no extra work.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h3>

            <div className="space-y-8">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg mr-6">
                  1
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Get Your Daily "3"</h4>
                  <p className="text-gray-600">
                    Receive three quick checks — simple, targeted questions based on your brand standards.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg mr-6">
                  2
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Complete & Submit</h4>
                  <p className="text-gray-600">
                    Answer in seconds with a tap or quick note. No need to log in or download anything.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-lg mr-6">
                  3
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Track Trends Over Time</h4>
                  <p className="text-gray-600">
                    The system identifies recurring issues and sends light feedback or reminders, helping you stay consistent over time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-xl font-semibold text-green-600">
              Small habits. Big impact.
            </p>
          </div>

          <div className="text-center">
            <a
              href={TRIAL_SIGNUP_URL}
              className="inline-block px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg"
            >
              Start Free
            </a>
          </div>
        </div>
      </section>

      {/* Why Managers Love It */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Managers Love The Guide
            </h2>
            <p className="text-xl text-gray-600">
              Simple. Fast. Impactful.
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
                        <Zap className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Quick & Easy</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Three questions, less than one minute. No logins or setup.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">🔄</span>
                        <span className="font-medium text-gray-900">Habit-Forming</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Keeps daily standards top of mind without overwhelming teams.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">🧩</span>
                        <span className="font-medium text-gray-900">Adaptive</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Smartly rotates checks to prevent fatigue and cover all key areas.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <TrendingUp className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Track Trends Over Time</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      See improvement week by week.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Built for Everyone</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Perfect for managers, trainers, and new hires alike.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg text-green-600 font-medium">
              It's like a daily pulse check for operational excellence.
            </p>
          </div>
        </div>
      </section>

      {/* Example Micro-Check */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See How It Works in Action
            </h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-2xl border border-green-200 shadow-xl mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Today's 3:</h3>

              <div className="space-y-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-gray-900 mb-3">1️⃣ Check that the prep station is clean before opening.</p>
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                      ✅ Complete
                    </button>
                    <button className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium">
                      ⚠️ Needs Attention
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-gray-900 mb-3">2️⃣ Verify safety signage is visible near the fryer area.</p>
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                      ✅ Complete
                    </button>
                    <button className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium">
                      ⚠️ Needs Attention
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-gray-900 mb-3">3️⃣ Confirm uniforms meet standard (clean and name tag visible).</p>
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                      ✅ Complete
                    </button>
                    <button className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium">
                      ⚠️ Needs Attention
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border-2 border-green-300">
                <h4 className="font-semibold text-gray-900 mb-4">Instant feedback:</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">"Prep area passed 5 days in a row: great consistency!"</p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-yellow-500 mr-3 mt-0.5">⚠️</span>
                    <p className="text-gray-700">"Uniform compliance dropped 2 days this week: quick reminder sent."</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <a
                href={TRIAL_SIGNUP_URL}
                className="inline-block px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PeakOps System */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              From Daily Habits to Brand Excellence
            </h2>
            <p className="text-xl text-gray-600">
              The Guide Is Step One in the PeakOps System
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <p className="text-lg text-gray-700 text-center mb-12">
              Start with The Guide to build daily habits, then add The Coach for private video feedback, and The Inspector for enterprise visibility.
            </p>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Step</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Agent</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Focus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 font-medium text-gray-900">1️⃣</td>
                    <td className="px-6 py-4 font-medium text-gray-900">🧭 The Guide</td>
                    <td className="px-6 py-4 text-gray-700">Build daily consistency</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-gray-900">2️⃣</td>
                    <td className="px-6 py-4 font-medium text-gray-900">🧠 The Coach</td>
                    <td className="px-6 py-4 text-gray-700">Build confidence before audits</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-gray-900">3️⃣</td>
                    <td className="px-6 py-4 font-medium text-gray-900">🔍 The Inspector</td>
                    <td className="px-6 py-4 text-gray-700">Scale compliance across the brand</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-lg text-gray-700">
              Together, they create a continuous loop of improvement: from habits to compliance.
            </p>
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/coaching"
              className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Explore The Coach <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              href="/enterprise"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Explore The Inspector <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Free Trial Details */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Start Free — No Setup Required
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">7 days</div>
                <div className="font-semibold text-gray-900 mb-2">unlimited access</div>
              </div>

              <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">$0</div>
                <div className="font-semibold text-gray-900 mb-2">No credit card or install required</div>
              </div>

              <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                <div className="text-3xl mb-2">📱</div>
                <div className="font-semibold text-gray-900 mb-2">Works on any smartphone or device</div>
              </div>

              <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                <div className="text-3xl mb-2">✅</div>
                <div className="font-semibold text-gray-900 mb-2">Cancel anytime, no strings attached</div>
              </div>
            </div>

            <p className="text-lg text-gray-600 mb-8">
              It takes less than one minute to get started.
            </p>

            <a
              href={TRIAL_SIGNUP_URL}
              className="inline-block px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg"
            >
              Start Free
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Consistency Without Complexity
          </h2>
          <p className="text-xl text-green-100 mb-4 max-w-3xl mx-auto">
            Stop chasing standards. Start building them: one small action at a time.
          </p>
          <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
            Let The Guide help your team stay confident, aligned, and ready for anything.
          </p>
          <a
            href={TRIAL_SIGNUP_URL}
            className="inline-block px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
          >
            Start Free Trial
          </a>
          <p className="text-green-200 text-sm mt-4">
            7-day trial • No credit card • No setup
          </p>
        </div>
      </section>
    </div>
  );
}

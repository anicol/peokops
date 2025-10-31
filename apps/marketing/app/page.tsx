'use client';

import React from 'react';
import Link from 'next/link';
import { Play, CheckCircle, Shield, TrendingUp, Clock, Users, Brain, Compass, Search } from 'lucide-react';
import { TRIAL_SIGNUP_URL, REVIEW_ANALYSIS_URL } from '../src/config/urls';

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        {/* Background Pattern/Overlay */}
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            {/* Top Label */}
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-blue-100 border border-white/20">
                For Multi-Unit Restaurant & Hospitality Teams
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-8 tracking-tight">
              Operational Excellence, Made a Daily Habit
              <span className="block text-2xl md:text-3xl font-normal mt-4 text-blue-100">
                Powered by Habit and AI.
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-xl md:text-2xl text-blue-50 mb-10 leading-relaxed font-light max-w-3xl">
              PeakOps turns guest feedback, employee sentiment, and simple daily checks into a continuous improvement loop that keeps every store on standard. Automatically.
              <br /><br />
              No apps. No logins. No stress.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <a
                href={TRIAL_SIGNUP_URL}
                className="px-8 py-4 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-all font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transform duration-200"
              >
                Try 3 Checks Free
              </a>
              <Link
                href="/demo"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all font-semibold text-lg border border-white/20"
              >
                See How It Works
              </Link>
            </div>
          </div>

          {/* Visual - Right Side */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-[440px] h-[560px]">
            <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
              {/* Checklist image - building habits */}
              <img
                src="https://images.pexels.com/photos/8850720/pexels-photo-8850720.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000"
                alt="Checklist with tick marks - building daily habits"
                className="w-full h-full object-cover"
              />

              {/* Subtle gradient overlay for better contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Review Analysis CTA - Full Width */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white py-12 border-y-2 border-teal-400/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 bg-gradient-to-r from-teal-500/20 via-blue-500/15 to-teal-500/20 backdrop-blur-sm rounded-2xl border-2 border-teal-400/40 shadow-2xl hover:shadow-3xl hover:border-teal-300/60 transition-all duration-300 group/card">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-8">
              {/* Icon with FREE badge */}
              <div className="flex-shrink-0 relative">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl group-hover/card:scale-110 group-hover/card:rotate-3 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.5 8.5l2 2 3-3" />
                  </svg>
                </div>
                {/* FREE badge */}
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-full shadow-xl animate-pulse">
                  FREE
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-white text-xl lg:text-2xl font-bold mb-2 flex flex-wrap items-center gap-2">
                  Free Google Reviews Analysis
                  <span className="text-teal-300 text-sm lg:text-base font-semibold">→ Get insights in 60 seconds</span>
                </h3>
                <p className="text-blue-50 text-sm lg:text-base mb-2 leading-relaxed max-w-3xl">
                  Instantly see what guests are saying across your locations. Get a personalized report with top 3 improvement opportunities. No signup required.
                </p>
              </div>

              {/* CTA Button */}
              <div className="flex-shrink-0">
                <a
                  href={REVIEW_ANALYSIS_URL}
                  className="inline-flex items-center px-6 py-3 bg-white text-blue-700 rounded-xl font-bold text-base transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform group/btn"
                >
                  Analyze My Reviews
                  <svg className="ml-2 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Visual element */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full">
                {/* Frustrated manager image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/3755755/pexels-photo-3755755.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Overwhelmed manager with paperwork and checklists"
                    className="w-full h-[500px] object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Right side - Text content */}
            <div className="max-w-2xl lg:ml-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-10 leading-tight">
                Why Consistency Feels Impossible
              </h2>

              <div className="space-y-6 mb-12" style={{ lineHeight: '1.7' }}>
                <p className="text-lg md:text-xl text-gray-700">
                  If you've ever run a restaurant, you know the pattern.
                  One great manager sets the bar high.
                  Then someone leaves, the next shift cuts corners, and standards start to slide.
                </p>
                <p className="text-lg md:text-xl text-gray-700">
                  Before long, quality depends on who's on duty, not the brand.
                </p>
                <p className="text-lg md:text-xl text-gray-700">
                  Audits can't fix that. They show what's broken, not how to stay consistent.
                </p>
              </div>

              {/* Emphasized key message */}
              <div className="my-12">
                <div className="bg-white px-6 py-8 border-l-4 border-blue-600">
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                    PeakOps was built to change that by creating a daily rhythm that builds habits, reinforces standards, and keeps every store steady in the chaos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How PeakOps Builds Habits - Intro */}
      <section className="py-24 bg-gradient-to-br from-blue-50 via-teal-50/30 to-white relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Title with icon accent - Centered */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="hidden md:block w-8 h-8 bg-blue-600 rounded-lg transform rotate-45 opacity-20"></div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight text-center">
                How PeakOps Builds Habits That Stick
              </h2>
              <div className="hidden md:block w-8 h-8 bg-blue-600 rounded-lg transform rotate-45 opacity-20"></div>
            </div>

            {/* Horizontal divider - Centered */}
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent mx-auto mb-8"></div>

            {/* Intro paragraphs - Left-aligned with max width */}
            <div className="max-w-[640px] mx-auto space-y-4">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-left">
                Forget forms and static checklists. PeakOps helps managers develop small, repeatable routines guided by real feedback and reinforced by AI.
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-left">
                Every day, managers get 3 quick micro-checks that:
              </p>
              <ul className="space-y-2 text-lg md:text-xl text-gray-700 leading-relaxed ml-8">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-teal-600 mr-3 mt-1 flex-shrink-0" />
                  <span>Reinforce brand standards</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-teal-600 mr-3 mt-1 flex-shrink-0" />
                  <span>Take under 2 minutes to complete</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-teal-600 mr-3 mt-1 flex-shrink-0" />
                  <span>Build streaks and track improvement over time</span>
                </li>
              </ul>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-left">
                Over time, these add up to visible, measurable consistency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three Feature Cards */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Flowing gradient ribbon behind cards */}
          <div className="relative max-w-6xl mx-auto">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-32 -translate-y-1/2 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-orange-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative grid md:grid-cols-3 gap-8">
              {/* Daily Habits - Raised */}
              <div className="md:-mt-3 relative bg-gradient-to-br from-teal-50/40 via-white to-white p-8 rounded-2xl shadow-lg border-l-4 border-teal-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <Compass className="w-10 h-10 text-teal-600" />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tighter">
                  Daily Habits
                </h3>
                <p className="text-gray-700 text-base mb-4 leading-relaxed" style={{ lineHeight: '1.7' }}>
                  3 rotating checks sent daily via text. No app needed. Keeps stores inspection-ready, every day.
                </p>
              </div>
              <div className="mt-auto">
                <Link
                  href="/coaching-mode"
                  className="block w-full text-center px-6 py-3.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-base shadow-md hover:shadow-lg"
                >
                  Start Free
                </Link>
              </div>
            </div>

            {/* Instant Coaching - Centered (no offset) */}
            <div className="relative bg-gradient-to-br from-orange-50/40 via-white to-white p-8 rounded-2xl shadow-lg border-l-4 border-orange-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <Brain className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tighter">
                  Instant Coaching
                </h3>
                <p className="text-gray-700 text-base mb-4 leading-relaxed" style={{ lineHeight: '1.7' }}>
                  Optional short videos or photos get instant AI feedback. Encouraging, actionable, and private.
                </p>
              </div>
              <div className="mt-auto">
                <Link
                  href="/coaching-mode"
                  className="block w-full text-center px-6 py-3.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all font-semibold text-base"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Brand Visibility - Raised */}
            <div className="md:-mt-3 relative bg-gradient-to-br from-blue-50/40 via-white to-white p-8 rounded-2xl shadow-lg border-l-4 border-blue-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <Search className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tighter">
                  Brand Visibility
                </h3>
                <p className="text-gray-700 text-base mb-4 leading-relaxed" style={{ lineHeight: '1.7' }}>
                  Roll-up dashboards give multi-unit leaders visibility without constant travel. See progress, not just problems.
                </p>
              </div>
              <div className="mt-auto">
                <Link
                  href="/enterprise"
                  className="block w-full text-center px-6 py-3.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all font-semibold text-base"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Habit Loop Table */}
      <section className="py-24 bg-gradient-to-br from-blue-50 via-teal-50/30 to-white relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Continuous Improvement Loop */}
          <div className="relative bg-white p-10 rounded-2xl shadow-xl border border-gray-100 max-w-4xl mx-auto">
            {/* Soft gradient divider at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-600/30 to-transparent rounded-t-2xl"></div>

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              The Habit Loop That Drives Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-4 px-6 text-gray-900 font-bold text-base">Frequency</th>
                    <th className="text-left py-4 px-6 text-gray-900 font-bold text-base">Input</th>
                    <th className="text-left py-4 px-6 text-gray-900 font-bold text-base">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-gray-50 hover:bg-teal-50 transition-colors">
                    <td className="py-4 px-6 text-gray-700 font-medium">Daily</td>
                    <td className="py-4 px-6 text-gray-700 font-semibold">Micro-Checks</td>
                    <td className="py-4 px-6 text-gray-700 font-medium">Habit Formation</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                    <td className="py-4 px-6 text-gray-700 font-medium">Weekly</td>
                    <td className="py-4 px-6 text-gray-700 font-semibold">AI Feedback</td>
                    <td className="py-4 px-6 text-gray-700 font-medium">Coaching & Confidence</td>
                  </tr>
                  <tr className="bg-gray-50 hover:bg-blue-50 transition-colors">
                    <td className="py-4 px-6 text-gray-700 font-medium">Monthly</td>
                    <td className="py-4 px-6 text-gray-700 font-semibold">Dashboards & Fix Flow</td>
                    <td className="py-4 px-6 text-gray-700 font-medium">Brand Visibility</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-center text-lg text-gray-700 mt-8 leading-relaxed">
              PeakOps turns behavior into data, and data into consistent action.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              From Signal to Shift in Three Steps
            </h2>
          </div>

          {/* Steps Container */}
          <div className="mt-20 relative">
            {/* Connecting arrows - desktop only */}
            <div className="hidden lg:block absolute top-24 left-0 w-full h-1 pointer-events-none">
              <svg className="w-full h-24" viewBox="0 0 1000 100" preserveAspectRatio="none">
                {/* Arrow 1 to 2 */}
                <path
                  d="M 300 50 Q 400 20, 500 50"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  fill="none"
                  opacity="0.4"
                />
                <polygon points="495,45 505,50 495,55" fill="#3B82F6" opacity="0.4" />

                {/* Arrow 2 to 3 */}
                <path
                  d="M 550 50 Q 650 20, 750 50"
                  stroke="#14B8A6"
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  fill="none"
                  opacity="0.4"
                />
                <polygon points="745,45 755,50 745,55" fill="#14B8A6" opacity="0.4" />
              </svg>
            </div>

            <div className="grid md:grid-cols-3 gap-12 lg:gap-8">
              {/* Step 1 - Listen */}
              <div className="relative flex">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 flex flex-col w-full">
                  {/* Icon */}
                  <div className="relative w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="w-10 h-10 text-orange-600" />
                  </div>

                  <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 text-base font-bold shadow-md">
                    1
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                    1️⃣ Listen
                  </h3>

                  <p className="text-gray-600 text-center mb-4 leading-relaxed">
                    Pull in guest reviews, team feedback, and check results. AI finds the patterns.
                  </p>
                </div>

                {/* Mobile arrow */}
                <div className="lg:hidden flex justify-center my-6">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Step 2 - Act */}
              <div className="relative flex">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 flex flex-col w-full">
                  {/* Icon with rotation animation */}
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-blue-300 border-t-transparent rounded-full animate-spin opacity-30"></div>
                    <Clock className="w-10 h-10 text-blue-600 relative z-10" />
                  </div>

                  <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 text-base font-bold shadow-md">
                    2
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                    2️⃣ Act
                  </h3>

                  <p className="text-gray-600 text-center mb-4 leading-relaxed">
                    Managers get 3 focused checks a day, based on real operational signals.
                  </p>
                </div>

                {/* Mobile arrow */}
                <div className="lg:hidden flex justify-center my-6">
                  <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Step 3 - Improve */}
              <div className="relative flex">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 flex flex-col w-full">
                  {/* Icon with checkmark animation */}
                  <div className="relative w-20 h-20 bg-gradient-to-br from-teal-100 to-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 group">
                    <div className="absolute inset-0 bg-teal-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 scale-110"></div>
                    <CheckCircle className="w-10 h-10 text-teal-600 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  </div>

                  <div className="bg-teal-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 text-base font-bold shadow-md">
                    3
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                    3️⃣ Improve
                  </h3>

                  <p className="text-gray-600 text-center mb-4 leading-relaxed">
                    Fix Flow tracks progress and builds momentum, one win at a time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Impact */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-teal-50/30 to-white relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              The Impact
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>

              {/* For Managers */}
              <div className="mb-10">
                <h3 className="text-2xl font-bold text-teal-600 mb-6">
                  For Managers
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-lg">Less anxiety, more control</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-lg">Encouraging feedback, not micromanagement</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-lg">Calm confidence every day</span>
                  </li>
                </ul>
              </div>

              {/* For Brands */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-6">
                  For Brands
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-lg">Consistent execution without constant oversight</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-lg">50–70% reduction in inspection travel</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-lg">Real-time visibility into operational health</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <img
                src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Manager conducting inspection"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Start Building Better Habits */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
              Build Better Habits, One Day at a Time
            </h2>

            <div className="space-y-6 text-xl text-gray-700 leading-relaxed mb-10">
              <p className="text-2xl font-medium text-gray-900">
                Three checks. Two minutes. One simple loop that drives consistent execution across every shift, every store, every day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-12">
            Build Better Habits, One Day at a Time
          </h2>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
            <a
              href={TRIAL_SIGNUP_URL}
              className="px-10 py-5 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-colors font-bold text-xl shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              Try 3 Checks Free
            </a>

            <span className="text-2xl font-light text-blue-100">or</span>

            <Link
              href="/demo"
              className="px-10 py-5 border-2 border-white text-white rounded-xl hover:bg-white hover:text-blue-600 transition-colors font-bold text-xl"
            >
              Book a Demo
            </Link>
          </div>

          <div className="text-lg text-blue-100 max-w-3xl mx-auto">
            <p>
              No setup, no logins. Just start.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

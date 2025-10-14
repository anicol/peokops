import React from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, Shield, TrendingUp, Clock, Users, Brain, Compass, Search } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ROICalculator from '../components/ROICalculator';
import SEO from '../components/SEO';
import { TRIAL_SIGNUP_URL } from '../config/urls';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="PeakOps – AI Agents for Frontline Excellence | Start Free with The Guide"
        description="PeakOps helps frontline teams build daily habits, get instant AI coaching, and deliver consistent operations across every store. Start free with The Guide."
        keywords="AI agents for operations, frontline excellence, restaurant management, QSR operations, daily micro-checks, video coaching, compliance automation, operational excellence, The Guide, The Coach, The Inspector"
        url="https://getpeakops.com"
        type="website"
      />
      <Header />

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
              Operational Excellence, Made a Daily Habit.
            </h1>

            {/* Subhead */}
            <p className="text-2xl md:text-3xl text-blue-50 mb-8 leading-relaxed font-light">
              PeakOps helps every location stay on standard through three quick micro-checks a day — no apps, no logins, no stress.
              It turns consistency into a behavior, not a checklist.
            </p>

            {/* Supporting Paragraph */}
            <p className="text-lg md:text-xl text-blue-100 mb-10 leading-relaxed max-w-2xl" style={{ lineHeight: '1.6' }}>
              Audits and training days fix problems too late. PeakOps builds the habits that prevent them.
              Each day, managers get three quick checks that reinforce standards, spot issues early, and keep every location inspection-ready — all in under two minutes.
              Simple, satisfying, and powered by AI for instant feedback.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <a
                href={TRIAL_SIGNUP_URL}
                className="px-8 py-4 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-all font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transform duration-200"
              >
                Try 3 Checks Free →
              </a>
              <Link
                to="/demo"
                className="px-8 py-4 text-white hover:text-blue-100 transition-colors font-medium text-lg group flex items-center"
              >
                <span className="border-b-2 border-white/40 group-hover:border-white/80 transition-colors">
                  See How Habits Build Consistency
                </span>
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            {/* Supporting Tagline */}
            <p className="mt-6 text-base md:text-lg text-blue-100/90 italic font-light">
              Three checks. Two minutes. One habit that keeps your business running right.
            </p>
          </div>

          {/* Visual - Right Side */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-[440px] h-[560px]">
            <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
              {/* Kitchen image with AI overlay */}
              <img
                src="https://images.pexels.com/photos/2696064/pexels-photo-2696064.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000"
                alt="Commercial restaurant kitchen with AI analysis overlay"
                className="w-full h-full object-cover"
              />

              {/* AI Analysis Overlays */}
              <div className="absolute top-6 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">Uniform OK</span>
              </div>

              <div className="absolute bottom-6 left-6 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-sm">Spill detected</span>
              </div>

              {/* Subtle gradient overlay for better text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
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
                Why Consistency Is Still So Hard
              </h2>

              <div className="space-y-6 mb-12" style={{ lineHeight: '1.7' }}>
                <p className="text-lg md:text-xl text-gray-700">
                  Every location is different. Every shift brings new challenges. Every manager has their own approach.
                </p>
                <p className="text-lg md:text-xl text-gray-700">
                  Without consistent systems, standards drift. Quality varies. Audit anxiety builds.
                </p>
                <p className="text-lg md:text-xl text-gray-700">
                  Corporate spends thousands flying inspectors and still can't see what's really happening day to day.
                </p>
              </div>

              {/* Emphasized key message */}
              <div className="relative py-8 my-12">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-blue-200"></div>
                </div>
                <div className="relative">
                  <div className="bg-white px-6 py-8 border-l-4 border-blue-600">
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                      Excellence shouldn't depend on travel or luck.
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-600 leading-tight">
                      It should happen every day.
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center mt-12" aria-hidden="true">
                  <div className="w-full border-t border-blue-200"></div>
                </div>
              </div>

              <p className="text-xl text-gray-700 leading-relaxed mt-12">
                That's why PeakOps created a new kind of operations platform, one that empowers teams to stay audit-ready every day, not just inspection day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three AI Agents */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-gray-100 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-20 max-w-5xl mx-auto">
            {/* Title with icon accent - Centered */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="hidden md:block w-8 h-8 bg-blue-600 rounded-lg transform rotate-45 opacity-20"></div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight text-center">
                How PeakOps Turns Daily Actions<br />Into Consistent Operations
              </h2>
              <div className="hidden md:block w-8 h-8 bg-blue-600 rounded-lg transform rotate-45 opacity-20"></div>
            </div>

            {/* Horizontal divider - Centered */}
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent mx-auto mb-8"></div>

            {/* Intro paragraphs - Left-aligned with max width */}
            <div className="max-w-[640px] mx-auto space-y-4">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-left">
                PeakOps brings consistency and confidence to every location through three specialized AI agents, each designed to help teams improve a little every day.
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-left">
                Together, they form a simple, scalable system that turns daily actions into measurable excellence.
              </p>
            </div>
          </div>

          {/* Flowing gradient ribbon behind cards */}
          <div className="relative max-w-6xl mx-auto mb-16">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-32 -translate-y-1/2 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-orange-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative grid md:grid-cols-3 gap-8">
              {/* The Guide - Raised */}
              <div className="md:-mt-3 relative bg-gradient-to-br from-teal-50/40 via-white to-white p-8 rounded-2xl shadow-lg border-l-4 border-teal-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <Compass className="w-10 h-10 text-teal-600" />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tighter">
                  The Guide
                </h3>
                <p className="text-sm font-semibold text-teal-600 mb-3">
                  AI Habit & Consistency Agent
                </p>
                <p className="text-gray-600 leading-relaxed mb-4 text-base">
                  Build daily excellence with quick, AI-powered micro-checks.
                </p>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed opacity-85" style={{ lineHeight: '1.7' }}>
                  The Guide sends managers "Today's 3", simple, habit-forming prompts that keep shifts sharp and standards consistent.
                </p>
              </div>
              <ul className="space-y-4 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-teal-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Three quick checks a day — no logins, no friction</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-teal-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Reinforces habits and accountability across shifts</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-teal-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Keeps every store inspection-ready</span>
                </li>
              </ul>
              <p className="text-center text-base italic text-gray-600 mb-4 font-serif">
                "Start small. Stay consistent."
              </p>
              <div className="mt-auto">
                <Link
                  to="/coaching-mode"
                  className="block w-full text-center px-6 py-3.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-base shadow-md hover:shadow-lg"
                >
                  Start Free
                </Link>
              </div>
            </div>

            {/* The Coach - Centered (no offset) */}
            <div className="relative bg-gradient-to-br from-orange-50/40 via-white to-white p-8 rounded-2xl shadow-lg border-l-4 border-orange-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <Brain className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tighter">
                  The Coach
                </h3>
                <p className="text-sm font-semibold text-orange-600 mb-3">
                  AI Video Feedback Agent
                </p>
                <p className="text-gray-600 leading-relaxed mb-4 text-base">
                  Build confidence before audits.
                </p>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed opacity-85" style={{ lineHeight: '1.7' }}>
                  Once habits are in place, The Coach delivers instant, private AI feedback from short video walkthroughs, helping managers fix issues before corporate finds them.
                </p>
              </div>
              <ul className="space-y-4 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Instant AI feedback in minutes</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Private and deleted after analysis</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Confidence before every inspection</span>
                </li>
              </ul>
              <p className="text-center text-base italic text-gray-600 mb-4 font-serif">
                "AI that helps you shine, not get watched."
              </p>
              <div className="mt-auto">
                <Link
                  to="/coaching-mode"
                  className="block w-full text-center px-6 py-3.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all font-semibold text-base"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* The Inspector - Raised */}
            <div className="md:-mt-3 relative bg-gradient-to-br from-blue-50/40 via-white to-white p-8 rounded-2xl shadow-lg border-l-4 border-blue-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <Search className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tighter">
                  The Inspector
                </h3>
                <p className="text-sm font-semibold text-blue-600 mb-3">
                  AI Compliance & Visibility Agent
                </p>
                <p className="text-gray-600 leading-relaxed mb-4 text-base">
                  Scale visibility without scaling travel.
                </p>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed opacity-85" style={{ lineHeight: '1.7' }}>
                  For brands ready for enterprise reporting and compliance dashboards, The Inspector analyzes store videos against brand standards and generates actionable insights.
                </p>
              </div>
              <ul className="space-y-4 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">50–70% reduction in travel costs</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Objective, auditable results</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 opacity-85">Enterprise dashboards and insights</span>
                </li>
              </ul>
              <p className="text-center text-base italic text-gray-600 mb-4 font-serif">
                "Scale inspections without scaling travel."
              </p>
              <div className="mt-auto">
                <Link
                  to="/enterprise"
                  className="block w-full text-center px-6 py-3.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all font-semibold text-base"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
          </div>

          {/* Continuous Improvement Loop */}
          <div className="relative bg-gradient-to-b from-white via-gray-50/50 to-white p-10 rounded-2xl shadow-xl border border-gray-100 max-w-4xl mx-auto">
            {/* Soft gradient divider at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-300/30 to-transparent rounded-t-2xl"></div>

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              Together, They Create the Continuous Improvement Loop
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-4 px-6 text-gray-900 font-bold text-base">Frequency</th>
                    <th className="text-left py-4 px-6 text-gray-900 font-bold text-base">Agent</th>
                    <th className="text-left py-4 px-6 text-gray-900 font-bold text-base">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-gray-50 hover:bg-teal-50 transition-colors">
                    <td className="py-4 px-6 text-gray-700 font-medium">Daily</td>
                    <td className="py-4 px-6 text-teal-600 font-semibold flex items-center gap-2">
                      <Compass className="w-5 h-5" />
                      The Guide
                    </td>
                    <td className="py-4 px-6 text-gray-700 font-medium">Builds habits</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                    <td className="py-4 px-6 text-gray-700 font-medium">Weekly</td>
                    <td className="py-4 px-6 text-orange-600 font-semibold flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      The Coach
                    </td>
                    <td className="py-4 px-6 text-gray-700 font-medium">Builds confidence</td>
                  </tr>
                  <tr className="bg-gray-50 hover:bg-blue-50 transition-colors">
                    <td className="py-4 px-6 text-gray-700 font-medium">Monthly / Quarterly</td>
                    <td className="py-4 px-6 text-blue-600 font-semibold flex items-center gap-2">
                      <Search className="w-5 h-5" />
                      The Inspector
                    </td>
                    <td className="py-4 px-6 text-gray-700 font-medium">Builds compliance</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-center text-lg text-gray-700 mt-8 leading-relaxed">
              From daily habits to enterprise visibility, PeakOps helps every store improve, every day.<br />
              Start with The Guide, deepen with The Coach, and scale with The Inspector.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              From Capture to Confidence — in Three Simple Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              PeakOps turns every walkthrough or micro-check into instant insights that drive daily improvement.
            </p>
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
              {/* Step 1 - Capture */}
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
                    Capture
                  </h3>

                  <p className="text-gray-700 text-center mb-4 leading-relaxed">
                    Record a short walkthrough or complete a micro-check from your phone.
                  </p>

                  <p className="text-sm text-gray-500 text-center italic">
                    No setup, no login — just press record.
                  </p>
                </div>

                {/* Mobile arrow */}
                <div className="lg:hidden flex justify-center my-6">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Step 2 - AI Analyzes */}
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
                    AI Analyzes
                  </h3>

                  <p className="text-gray-700 text-center mb-4 leading-relaxed">
                    AI reviews your video in seconds, spotting wins and opportunities.
                  </p>

                  <p className="text-sm text-gray-500 text-center italic">
                    Instant feedback — not another report to read.
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
                    Improve
                  </h3>

                  <p className="text-gray-700 text-center mb-4 leading-relaxed">
                    Review your Fix List, make updates, and track your team's progress.
                  </p>

                  <p className="text-sm text-gray-500 text-center italic">
                    Every check builds momentum toward consistency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Impact */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                The Impact
              </h2>

              {/* For Managers */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-teal-600 mb-4">
                  For Managers:
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">No more audit anxiety</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Faster team training</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Clear direction and daily wins</span>
                  </li>
                </ul>
              </div>

              {/* For Brands */}
              <div>
                <h3 className="text-xl font-semibold text-blue-600 mb-4">
                  For Brands:
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Consistent standards at scale</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Continuous visibility into performance</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">50–70% reduction in travel and inspection costs</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <img
                src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Manager conducting inspection"
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  "We caught issues before our corporate audit and saved our store from a failing grade."
                </h4>
                <p className="text-gray-600">— Store Manager, QSR Chain</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Calculate Your ROI
            </h2>
            <p className="text-xl text-gray-600">
              See how much you could save with PeakOps
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <ROICalculator isPreview={true} />
          </div>
        </div>
      </section>

      {/* Privacy & Trust */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Privacy & Trust
            </h2>
            <p className="text-2xl text-gray-700 font-semibold mb-8">
              AI that helps, not watches.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                The Guide & The Coach
              </h3>
              <p className="text-gray-600">
                Videos are private, processed, and deleted after analysis.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                The Inspector
              </h3>
              <p className="text-gray-600">
                Enterprise data is encrypted and securely retained for reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Build a Culture of Continuous Improvement?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Start with The Guide free today — add The Coach and The Inspector as you grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={TRIAL_SIGNUP_URL}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Start Free with The Guide
            </a>
            <Link
              to="/demo"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
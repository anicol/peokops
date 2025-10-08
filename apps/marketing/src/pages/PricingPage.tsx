import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Star, Calculator, Phone, Mail, Shield, Smartphone, Infinity, Play, TrendingUp, Users, BarChart3 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { TRIAL_SIGNUP_URL } from '../config/urls';

export default function PricingPage() {
  const [storeCount, setStoreCount] = useState(50);
  const [costPerVisit, setCostPerVisit] = useState(750);
  const [visitsPerYear, setVisitsPerYear] = useState(4);

  const annualSavings = Math.round((storeCount * visitsPerYear * costPerVisit * 0.65));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const faqItems = [
    {
      question: "What does the free trial include?",
      answer: "You can test The Guide and The Coach for one location. Run up to 10 videos and daily micro-checks. All results are private, and videos are deleted after processing."
    },
    {
      question: "Do I need a credit card for the free trial?",
      answer: "No. You can start completely free — no credit card required."
    },
    {
      question: "Will corporate see my coaching or micro-check results?",
      answer: "No. Both The Guide and The Coach keep results private at the store level unless you choose to share them."
    },
    {
      question: "How fast will I see results?",
      answer: "You'll receive AI feedback within minutes of your first video or check submission."
    },
    {
      question: "Is my data secure with PeakOps?",
      answer: "Yes. We use enterprise-grade encryption and maintain strict security standards. All videos are deleted after analysis in coaching mode, and enterprise retention is fully configurable."
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO
        title="Pricing - Restaurant Video Inspections | PeakOps"
        description="Transparent pricing for AI-powered restaurant inspections. Start free with coaching mode or scale with enterprise plans. Cut inspection costs by 50-70% vs traditional site visits."
        keywords="restaurant inspection pricing, QSR inspection costs, video inspection pricing, restaurant compliance pricing, AI inspection software cost"
        url="https://getpeakops.com/pricing"
        type="website"
      />
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              AI-powered consistency for every stage of your growth.
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Start simple. Build confidence. Scale visibility.
            </p>
          </div>
        </div>
      </section>


      {/* Pricing Tiers */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Essentials */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl shadow-lg border border-green-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Essentials: Daily Excellence</h3>
                <p className="text-gray-700 mb-6">
                  Start improving operations with daily micro-checks and instant AI feedback.
                </p>
                <p className="text-sm text-gray-600 mb-6 italic">
                  Includes The Guide and The Coach.
                </p>
                <div className="text-4xl font-bold text-green-600 mb-2">$49</div>
                <div className="text-gray-600">/ store / month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">3 randomized micro-checks per day</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Private video feedback</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Progress tracking</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Works on any device</span>
                </li>
              </ul>

              <a
                href={TRIAL_SIGNUP_URL}
                className="block w-full text-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Start Free Trial
              </a>
            </div>

            {/* Professional */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl shadow-lg border-2 border-teal-500 p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-teal-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional: Confident Operations</h3>
                <p className="text-gray-700 mb-6">
                  Stay inspection-ready across every shift with cross-location visibility and analytics.
                </p>
                <p className="text-sm text-gray-600 mb-6 italic">
                  Includes The Guide and The Coach.
                </p>
                <div className="text-4xl font-bold text-teal-600 mb-2">$79</div>
                <div className="text-gray-600">/ store / month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Multi-manager reporting</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Trend tracking</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Optional regional sharing</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Team accountability tools</span>
                </li>
              </ul>

              <a
                href={TRIAL_SIGNUP_URL}
                className="block w-full text-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
              >
                Start Free Trial
              </a>
            </div>

            {/* Enterprise */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg border border-blue-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise: Brand Consistency</h3>
                <p className="text-gray-700 mb-6">
                  Get full compliance visibility, ROI, and performance insights across your network.
                </p>
                <p className="text-sm text-gray-600 mb-6 italic">
                  Includes The Guide, The Coach, and The Inspector.
                </p>
                <div className="text-3xl font-bold text-blue-600 mb-2">Custom Pricing</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Enterprise dashboards</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">50–70% travel savings</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Auditable reports</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Enterprise-grade security</span>
                </li>
              </ul>

              <Link
                to="/demo"
                className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              📊 Proven ROI
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto mb-12">
              <table className="w-full border-collapse bg-white shadow-lg rounded-2xl overflow-hidden">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="text-left py-4 px-6 font-bold">Metric</th>
                    <th className="text-left py-4 px-6 font-bold">Typical Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-6 font-semibold text-gray-900">Travel Cost Savings</td>
                    <td className="py-4 px-6 text-gray-700">50–70% reduction with video-based inspections</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-6 font-semibold text-gray-900">Inspection Coverage</td>
                    <td className="py-4 px-6 text-gray-700">3–5× more locations reviewed with the same team</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-semibold text-gray-900">Consistency</td>
                    <td className="py-4 px-6 text-gray-700">100% objective AI scoring across every store</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-green-50 rounded-2xl p-8 text-center border border-green-200">
              <p className="text-lg text-gray-700 mb-6">
                Even one reduced in-person visit per month per store often covers the investment.
              </p>
              <Link
                to="/roi-calculator"
                className="inline-block px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
              >
                Calculate Your Savings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ❓ Frequently Asked Questions
            </h2>
          </div>
          <div className="max-w-4xl mx-auto space-y-6">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {item.question}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Start Where You Are. Scale When You're Ready.
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your current stage.<br />
            Upgrade anytime as your needs grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={TRIAL_SIGNUP_URL}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Start Free Trial
            </a>
            <Link
              to="/demo"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
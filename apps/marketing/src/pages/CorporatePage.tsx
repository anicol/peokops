import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, TrendingUp, Shield, Users, BarChart, Zap, Globe, Lock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ROICalculator from '../components/ROICalculator';
import SEO from '../components/SEO';

export default function CorporatePage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="Enterprise Restaurant Inspections - Scale AI-Powered Compliance | PeakOps"
        description="Scale restaurant inspections across multiple locations with PeakOps Enterprise. Advanced analytics, custom integrations, and dedicated support for restaurant chains and franchises."
        keywords="enterprise restaurant inspections, restaurant chain compliance, multi-location inspections, franchise inspections, restaurant analytics, QSR enterprise software"
        url="https://getpeakops.com/enterprise"
        type="website"
      />
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Scale Brand Standards Without Scaling Costs
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-4 leading-relaxed">
              Finally, a scalable way to see every store and every shift while knowing your brand standards are met each day.
            </p>
            <p className="text-lg text-blue-100 mb-8 leading-relaxed">
              PeakOps turns compliance into a proactive system that delivers visibility, consistency, and measurable results across your entire network.
            </p>
            <div className="mb-8">
              <Link
                to="/demo"
                className="inline-block px-8 py-4 bg-blue-400 text-blue-900 rounded-lg hover:bg-blue-300 transition-colors font-semibold text-lg shadow-lg"
              >
                Request Demo
              </Link>
            </div>
            <p className="text-blue-200 text-sm mb-2">
              30-minute walkthrough • Custom ROI analysis • Implementation planning
            </p>
            <p className="text-blue-200 text-sm">
              ✅ 50–70% travel savings • ✅ 3–5× more coverage • ✅ Consistent, objective standards
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Enterprise Inspections Feel Broken
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Audits are expensive, inconsistent, and reactive — designed for oversight, not improvement.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <h3 className="font-semibold text-gray-900 mb-2">Limited visibility.</h3>
                <p className="text-gray-600 text-sm">It's impossible to see every store, every week.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <h3 className="font-semibold text-gray-900 mb-2">Inconsistent standards.</h3>
                <p className="text-gray-600 text-sm">Each inspector focuses on something different.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <h3 className="font-semibold text-gray-900 mb-2">High travel costs.</h3>
                <p className="text-gray-600 text-sm">Teams fly thousands of miles for one-day snapshots.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
                <h3 className="font-semibold text-gray-900 mb-2">Reactive culture.</h3>
                <p className="text-gray-600 text-sm">Issues surface only after they've become brand risks.</p>
              </div>
            </div>

            <div className="bg-blue-600 text-white p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-2">
                Inspections shouldn't depend on travel or luck.
              </h3>
              <p className="text-blue-100 text-lg">
                They should happen every day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three AI Agents System */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Three AI Agents. One Continuous Improvement System.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              PeakOps unites three specialized AI agents that work together to turn daily actions into measurable excellence — scaling from individual stores to enterprise compliance.
            </p>
          </div>

          <div className="space-y-12">
            {/* The Guide */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-2xl border border-green-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-xl">🧭</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">The Guide — Build Daily Habits</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-gray-700 mb-4">Sends managers "Today's 3" — quick, AI-powered micro-checks to reinforce standards.</p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Builds consistency and accountability across shifts.</li>
                    <li>• Keeps every store inspection-ready through simple, repeatable action.</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-green-800 font-medium mb-2">Start small. Stay consistent.</p>
                  <Link to="/coaching" className="text-green-600 hover:text-green-700 font-medium text-sm">Start Free →</Link>
                </div>
              </div>
            </div>

            {/* The Coach */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-8 rounded-2xl border border-teal-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-xl">🧠</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">The Coach — Build Confidence Before Audits</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-gray-700 mb-4">Managers record short video walkthroughs for private AI feedback.</p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Results are delivered in minutes with clear, timestamped insights.</li>
                    <li>• Videos are deleted after processing — full privacy, zero stress.</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-lg border border-teal-200">
                  <p className="text-teal-800 font-medium mb-2">AI that helps you shine — not get watched.</p>
                  <Link to="/coaching" className="text-teal-600 hover:text-teal-700 font-medium text-sm">Learn More →</Link>
                </div>
              </div>
            </div>

            {/* The Inspector */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl border border-blue-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-xl">🔍</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">The Inspector — Build Compliance at Scale</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-gray-700 mb-4">AI video inspections with official records and audit-ready reports.</p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Objective scoring and automated insights across every location.</li>
                    <li>• Dashboards for brand, region, and franchise visibility — without the travel.</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-medium mb-2">Scale inspections without scaling travel.</p>
                  <Link to="/demo" className="text-blue-600 hover:text-blue-700 font-medium text-sm">Get Demo →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits for Brands */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Transformative Benefits for Brands
            </h2>
            <p className="text-xl text-gray-600">
              See the measurable impact on your operations and bottom line
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">50-70%</h3>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Travel Savings</h4>
              <p className="text-gray-600">
                Dramatically reduce inspection travel costs while increasing coverage frequency.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-blue-600 mb-2">3-5×</h3>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Inspection Coverage</h4>
              <p className="text-gray-600">
                Inspect more locations more frequently with the same budget and resources.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-purple-600 mb-2">100%</h3>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Objective Scoring</h4>
              <p className="text-gray-600">
                AI video analysis eliminates inspector bias and subjective evaluations.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-orange-600 mb-2">Real-time</h3>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Regional Insights</h4>
              <p className="text-gray-600">
                Dashboards reveal patterns, trends, and recurring issues across your network.
              </p>
            </div>
          </div>

          {/* Detailed Benefits */}
          <div className="mt-16 bg-white p-8 rounded-2xl shadow-lg">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Beyond Cost Savings: Strategic Advantages
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Proactive compliance culture</div>
                      <div className="text-sm text-gray-600">Shift from reactive auditing to proactive improvement</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Scalable expansion support</div>
                      <div className="text-sm text-gray-600">Maintain standards during rapid growth without proportional cost increases</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Data-driven decision making</div>
                      <div className="text-sm text-gray-600">Identify systemic issues and optimize operations based on comprehensive data</div>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Enhanced manager confidence</div>
                      <div className="text-sm text-gray-600">Private coaching mode builds skills before formal evaluations</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl">
                <img
                  src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Enterprise dashboard analytics"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-2">Enterprise Dashboard Preview</h4>
                  <p className="text-sm text-gray-600">Real-time insights across your entire network</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Embed */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Calculate Your Enterprise ROI
            </h2>
            <p className="text-xl text-gray-600">
              See the exact financial impact for your brand
            </p>
          </div>

          <ROICalculator />
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Security & Configurable Privacy
            </h2>
            <p className="text-xl text-gray-600">
              Your data protection requirements, precisely met
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Configurable Retention Policies</h3>
              </div>

              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Coaching Mode</div>
                    <div className="text-sm text-gray-600">Private video processing with automatic deletion after analysis</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Enterprise Mode</div>
                    <div className="text-sm text-gray-600">Configurable video retention (30 days to 7 years) based on compliance needs</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Custom policies</div>
                    <div className="text-sm text-gray-600">Set different retention rules for different regions or store types</div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Enterprise-Grade Security</h3>
              </div>

              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Bank-level encryption</div>
                    <div className="text-sm text-gray-600">Data encrypted in transit and at rest with industry-standard protocols</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Secure cloud infrastructure</div>
                    <div className="text-sm text-gray-600">Hosted on enterprise-grade cloud providers with 99.9% uptime</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Role-based access controls</div>
                    <div className="text-sm text-gray-600">Granular permissions ensure team members only see what they need</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Partnership */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 rounded-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Partner With Us to Shape the Future of Brand Compliance
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join our enterprise pilot program and customize PeakOps to your brand standards.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white bg-opacity-20 p-6 rounded-xl">
                  <h3 className="font-semibold mb-2">Custom Implementation</h3>
                  <p className="text-sm text-blue-100">Tailored setup for your standards and workflows.</p>
                </div>
                <div className="bg-white bg-opacity-20 p-6 rounded-xl">
                  <h3 className="font-semibold mb-2">Dedicated Support</h3>
                  <p className="text-sm text-blue-100">Direct access to our product and customer success teams.</p>
                </div>
                <div className="bg-white bg-opacity-20 p-6 rounded-xl">
                  <h3 className="font-semibold mb-2">Pilot Pricing</h3>
                  <p className="text-sm text-blue-100">Special rates for early enterprise adopters.</p>
                </div>
              </div>

              <Link
                to="/demo"
                className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg mb-8"
              >
                Request Enterprise Pilot
              </Link>

              <div className="mt-8 pt-8 border-t border-white border-opacity-20">
                <p className="text-lg text-blue-100 italic">
                  "With PeakOps, we review every location every month — without doubling our costs."
                </p>
                <p className="text-sm text-blue-200 mt-2">— VP of Operations, National QSR Brand</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Brand Compliance?
          </h2>
          <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
            Replace reactive audits with proactive insight.
          </p>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Scale visibility, consistency, and excellence — without scaling costs.
          </p>
          <Link
            to="/demo"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg"
          >
            Request Demo
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            30-minute demo • Custom ROI analysis • Implementation planning
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
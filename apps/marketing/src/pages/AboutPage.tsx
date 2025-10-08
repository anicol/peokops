import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, TrendingUp, Shield, Users, Target, Heart, Lightbulb, Zap } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { TRIAL_SIGNUP_URL } from '../config/urls';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="About PeakOps - Redefining Frontline Excellence with AI"
        description="Learn how PeakOps helps managers and brands build consistency, confidence, and compliance through AI-powered continuous improvement. Empower managers. Enable brands. Elevate every location."
        keywords="about PeakOps, restaurant inspection company, AI video analysis, frontline excellence, continuous improvement, operational excellence"
        url="https://getpeakops.com/about"
        type="website"
      />
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Redefining Frontline Excellence with AI
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              PeakOps helps managers and brands build consistency, confidence, and compliance through simple, everyday actions — powered by AI agents that make improvement continuous and effortless.
            </p>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Our Mission
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p className="font-semibold text-xl text-gray-900">
                To help every location operate at its best, every day.
              </p>
              <p>
                Traditional inspections are reactive, stressful, and expensive.
                They catch problems after the fact, drain time and travel budgets, and create anxiety instead of progress.
              </p>
              <p>
                We built PeakOps to change that.
              </p>
              <p>
                Our platform replaces reactive audits with proactive improvement — giving managers private, instant feedback while giving brands a clearer, more consistent view of performance across every location.
              </p>
              <p className="font-semibold text-blue-600">
                Empower managers. Enable brands. Elevate every location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Our Vision
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p className="font-semibold text-xl text-gray-900">
                A world where operational excellence happens every day, not just on audit day.
              </p>
              <p>
                PeakOps uses AI to help frontline teams improve continuously.
                Through short daily check-ins, quick AI-powered video feedback, and consistent brand visibility, we're creating a system that builds habits, confidence, and compliance — all at once.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Platform */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Three AI Agents. One Continuous Improvement System.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              PeakOps combines three specialized AI agents that work together to simplify operations and scale excellence.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-4 px-6 text-gray-900 font-bold">Agent</th>
                    <th className="text-left py-4 px-6 text-gray-900 font-bold">Focus</th>
                    <th className="text-left py-4 px-6 text-gray-900 font-bold">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-green-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🧭</span>
                        <span className="font-semibold text-gray-900">The Guide</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">Builds daily habits through quick AI-powered micro-checks.</td>
                    <td className="py-4 px-6 text-gray-700">Keeps teams aligned and inspection-ready.</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-teal-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🧠</span>
                        <span className="font-semibold text-gray-900">The Coach</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">Provides private, instant feedback from short video walkthroughs.</td>
                    <td className="py-4 px-6 text-gray-700">Helps managers improve before audits.</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-blue-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🔍</span>
                        <span className="font-semibold text-gray-900">The Inspector</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">Delivers enterprise visibility and consistent, objective scoring.</td>
                    <td className="py-4 px-6 text-gray-700">Reduces travel costs while improving compliance.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <p className="text-lg text-gray-700 italic">
                Together, they form a continuous improvement loop that connects daily habits to brand-wide excellence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Early Success */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The Results So Far
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're working closely with partner brands who share our belief in proactive improvement.
              Early results show what's possible when coaching comes before compliance.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white shadow-lg rounded-2xl overflow-hidden">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="text-left py-4 px-6 font-bold">Metric</th>
                    <th className="text-left py-4 px-6 font-bold">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-6 font-semibold text-green-600 text-2xl">50–70%</td>
                    <td className="py-4 px-6 text-gray-700">Reduction in travel costs when inspections move to video.</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-6 font-semibold text-blue-600 text-2xl">3–5×</td>
                    <td className="py-4 px-6 text-gray-700">Increase in location coverage using remote reviews.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-semibold text-purple-600 text-2xl">100%</td>
                    <td className="py-4 px-6 text-gray-700">Consistent, objective AI scoring across every review.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <p className="text-lg text-gray-700">
                These results are helping our partners strengthen operations, build manager confidence, and create a culture of continuous improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Values
            </h2>
            <p className="text-xl text-gray-600">
              The Principles That Guide Everything We Build
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-teal-50 p-8 rounded-2xl border border-teal-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mr-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Manager First</h3>
              </div>
              <p className="text-gray-700">
                We believe managers should feel empowered, not surprised. Every feature starts with the question: "Does this make life easier for the team on the ground?"
              </p>
            </div>

            <div className="bg-blue-50 p-8 rounded-2xl border border-blue-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Privacy by Design</h3>
              </div>
              <p className="text-gray-700">
                Trust is built through transparency. Coaching Mode deletes videos automatically and keeps results private at the store level.
              </p>
            </div>

            <div className="bg-purple-50 p-8 rounded-2xl border border-purple-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Continuous Improvement</h3>
              </div>
              <p className="text-gray-700">
                We improve what we build the same way our customers improve their operations — one iteration at a time. Real feedback from managers and brands shapes every release.
              </p>
            </div>

            <div className="bg-orange-50 p-8 rounded-2xl border border-orange-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Progress Over Perfection</h3>
              </div>
              <p className="text-gray-700">
                Excellence is built daily. We believe small, consistent improvements are the foundation of sustainable success.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
              How It Started
            </h2>

            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p className="font-semibold text-xl text-gray-900">
                PeakOps was founded on a simple belief: inspections should help, not hurt.
              </p>

              <p>
                We saw brands spending heavily on travel, managers dreading surprise audits, and the entire process creating stress instead of improvement.
              </p>

              <p>
                So we asked a better question:<br />
                What if AI could help managers self-correct before inspections?<br />
                What if feedback could be fast, objective, and easy to act on?
              </p>

              <p>
                That question became the foundation of PeakOps.
                We started by developing tools that let managers run private AI video checks before formal audits. From there, we built an entire system that connects coaching, compliance, and continuous improvement.
              </p>

              <p>
                Today, PeakOps is working with leading restaurant and retail brands to transform how operations are measured, improved, and scaled.
              </p>

              <p className="font-semibold text-blue-600">
                We're proud of the results so far — and even more excited about what's ahead.
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
            Join the growing community of brands and managers who are using PeakOps to make operational excellence a daily habit.
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
              Request a Demo
            </Link>
          </div>
          <div className="mt-8 pt-8 border-t border-white border-opacity-20">
            <p className="text-sm text-blue-100 font-medium mb-2">
              AI Agents for Frontline Excellence
            </p>
            <p className="text-blue-200">
              Empower managers. Enable brands. Elevate every location.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
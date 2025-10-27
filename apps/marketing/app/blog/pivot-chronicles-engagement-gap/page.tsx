'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';

const BlogPivotChroniclesEngagementGap = () => {
  return (
    <div className="min-h-screen bg-white">      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          <div className="text-sm text-gray-600 mb-2">The Pivot Chronicles • Part 9</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            The Engagement Gap: When Code Velocity Masks Business Stagnation
          </h1>
          <p className="text-lg text-gray-600 mt-4">
            Fast doesn't mean forward
          </p>
        </div>
      </div>

      {/* Article Meta */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            Alistair Nicol
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            September 9, 2025
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            6 min read
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            If you walked into our Slack back then, you'd think we were crushing it.
          </p>

          <p className="mb-2">
            New commits every day.
          </p>

          <p className="mb-2">
            CI/CD pipelines green.
          </p>

          <p className="mb-6">
            Feature flags rolling out weekly.
          </p>

          <p className="mb-4">
            We were shipping.<br />
            And it felt amazing.
          </p>

          <p className="mb-8 font-semibold text-gray-900">
            The only problem?<br />
            None of it mattered.
          </p>

          <p className="mb-8 text-lg">
            Because we weren't shipping to customers. We were shipping to ourselves.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Illusion of Momentum
          </h2>

          <p className="mb-4">
            There's a special kind of dopamine that comes from seeing progress in GitHub.
          </p>

          <p className="mb-8">
            It feels like traction: something's happening, things are improving, momentum is building.
          </p>

          <p className="mb-4">
            But if no one's using it, that momentum is self-contained.
          </p>

          <p className="mb-8">
            You're getting faster inside a bubble.
          </p>

          <div className="bg-red-50 border-l-4 border-red-600 p-6 my-8">
            <p className="mb-2 font-semibold text-gray-900">
              That was the "engagement gap": the widening distance between how fast we were building and how little the market cared.
            </p>
            <p className="mb-0 text-gray-900">
              We were measuring engineering speed instead of business traction.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            When Productivity Becomes a Distraction
          </h2>

          <p className="mb-4">
            I'd look at our metrics and feel proud:
          </p>

          <ul className="mb-6 space-y-2">
            <li>✅ New AI pipeline working.</li>
            <li>✅ Magic link authentication polished.</li>
            <li>✅ Celery workers optimized.</li>
            <li>✅ Retention policy automated.</li>
          </ul>

          <p className="mb-8">
            Everything humming.
          </p>

          <p className="mb-8">
            And yet… zero conversations with actual operators that week.
          </p>

          <p className="mb-4">
            It's wild how productive you can be while making zero business progress.
          </p>

          <p className="mb-8">
            It's also incredibly comfortable, because activity feels like control, and control feels safe.
          </p>

          <p className="mb-8 font-semibold text-gray-900">
            But safe doesn't sell.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What "Velocity" Really Means
          </h2>

          <p className="mb-4">
            Velocity only matters if it's pointed toward the right target.
          </p>

          <p className="mb-8">
            If you're iterating in isolation, you're not accelerating. You're orbiting.
          </p>

          <p className="mb-6">
            We weren't iterating toward users; we were iterating toward perfection.
          </p>

          <p className="mb-8">
            Cleaner code, better architecture, fewer bugs: all things engineers love, but customers never see.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <p className="mb-0">
              That's when it clicked: <strong>progress measured by commits is internal validation; progress measured by conversations is external validation.</strong>
              <br /><br />
              Only one of those grows a business.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What I Learned
          </h2>

          <div className="bg-gray-100 border-l-4 border-gray-600 p-6 my-8">
            <p className="mb-4">
              <strong>Code velocity can hide business stagnation.</strong> Fast doesn't mean forward.
            </p>
            <p className="mb-4">
              <strong>The only metric that matters early on is engagement, not commits.</strong>
            </p>
            <p className="mb-4">
              <strong>You can't refactor your way to product-market fit.</strong>
            </p>
            <p className="mb-0">
              <strong>Progress that doesn't reach a customer is just motion.</strong>
            </p>
          </div>

          <p className="mb-4 text-lg">
            Building fast felt like progress.
          </p>

          <p className="mb-8 text-lg">
            But the real progress was the uncomfortable stuff: the emails, the outreach, the demos that might go nowhere.
          </p>

          <p className="mb-4 text-lg font-semibold text-gray-900">
            Velocity is easy.
          </p>

          <p className="mb-4 text-lg font-semibold text-gray-900">
            Engagement is hard.
          </p>

          <p className="mb-8 text-lg font-semibold text-gray-900">
            And if you're not careful, velocity becomes the prettiest way to avoid the real work.
          </p>

          <Link href="/blog/pivot-chronicles-starting-over" className="block bg-gray-100 rounded-lg p-6 mt-12 hover:bg-gray-200 transition-colors">
            <p className="text-sm text-gray-600 mb-2">Next in The Pivot Chronicles</p>
            <p className="font-semibold text-gray-900">
              Part 10: Starting Over (Again): What Would Change With 10 Real Customers
            </p>
            <p className="text-gray-700 mt-2">
              If I had 30 days to get 10 paying customers, I'd throw out 90% of what I've built. Here's what I'd do instead.
            </p>
          </Link>
        </div>
      </article>

      {/* Related Articles */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-8">More from The Pivot Chronicles</h3>
        <div className="space-y-6">
          <Link href="/blog/pivot-chronicles-zero-revenue" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 8</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              What $0 in Revenue Teaches You (That $1M Can't)
            </h4>
            <p className="text-gray-700">
              Silence is data. The purest mirror you'll ever get as a founder.
            </p>
          </Link>

          <Link href="/blog/pivot-chronicles-pattern" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 7</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              The Pattern: Five Pivots Without Customer Engagement
            </h4>
            <p className="text-gray-700">
              Building for customers, but not with them.
            </p>
          </Link>

          <Link href="/blog/pivot-chronicles-extenure" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 1</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Extenure: When Good Data Meets the Wrong Problem
            </h4>
            <p className="text-gray-700">
              How we built beautiful predictive retention analytics that nobody wanted.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Real Talk About Building SaaS
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            No fluff. No overnight success stories. Just honest reflections on what it takes to find product-market fit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/blog"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Read More Stories
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Share Your Experience
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPivotChroniclesEngagementGap;

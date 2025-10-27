'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';

const BlogCoachingOverCompliance = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          <div className="text-sm text-gray-600 mb-2">Blog</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Coaching Over Compliance: How QSR Managers Can Turn Inspections Into Growth Moments
          </h1>
        </div>
      </div>

      {/* Article Meta */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            PeakOps Team
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            March 15, 2024
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            5 min read
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            Most managers in quick service restaurants dread inspections.<br />
            They feel like high-stakes tests where the goal is simple: don't fail.
          </p>

          <p className="mb-6">
            That mindset creates stress, last-minute scrambles, and a culture of hiding problems instead of fixing them.
          </p>

          <p className="mb-8">
            <strong>But there's a better way.</strong><br />
            What if inspections weren't just about compliance? What if they were about coaching?
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Problem with Compliance-Only Thinking
          </h2>

          <p className="mb-4">
            When inspections are framed only as pass/fail moments, a few things happen:
          </p>

          <ul className="mb-8 space-y-2">
            <li>Managers and staff get anxious and defensive.</li>
            <li>Issues are patched over right before an audit instead of being addressed consistently.</li>
            <li>Employees feel like they're being policed instead of supported.</li>
          </ul>

          <p className="mb-8">
            Compliance matters, no question. But if it's the only lens, you miss the bigger opportunity: building stronger teams.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Why Coaching Works Better
          </h2>

          <p className="mb-4">
            When you treat inspections as coaching moments, everything shifts:
          </p>

          <ul className="mb-6 space-y-2">
            <li><strong>Learning improves.</strong> Employees understand why standards matter, not just what the rule is.</li>
            <li><strong>Morale goes up.</strong> People respond better when they feel encouraged, not just corrected.</li>
            <li><strong>Retention improves.</strong> Staff who feel invested in are more likely to stay.</li>
            <li><strong>Managers build confidence.</strong> Instead of fearing the inspection, they use it to show leadership.</li>
          </ul>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8">
            <p className="text-blue-900 font-medium">
              Compliance keeps you out of trouble. Coaching creates long-term excellence.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            How to Make the Shift
          </h2>

          <p className="mb-4">
            Here are a few ways I've seen managers move from "compliance cop" to "coach":
          </p>

          <ul className="mb-6 space-y-3">
            <li><strong>Balance the feedback.</strong> Start by recognizing what's right before pointing out what's wrong.</li>
            <li><strong>Make standards visible.</strong> Use visual guides or quick checklists as everyday training tools.</li>
            <li><strong>Coach in the moment.</strong> When you see something off, ask: "What can we do differently next time?"</li>
            <li><strong>Celebrate progress.</strong> Don't just record violations. Recognize improvements, even small ones.</li>
          </ul>

          <p className="mb-8">
            The difference is subtle, but it changes the whole culture of a store.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            A Quick Story
          </h2>

          <p className="mb-4">
            I worked with a GM who used to panic before every inspection.<br />
            She'd spend days "cleaning up" and coaching only in the 24 hours before an audit.
          </p>

          <p className="mb-4">
            One day she flipped her approach. Instead of saving coaching for inspection week, she built it into her daily walkthroughs. She praised small wins, explained the "why" behind standards, and treated every shift like inspection prep.
          </p>

          <p className="mb-8">
            Within a month, her staff started pointing out issues before she did. By the next inspection, they weren't scrambling. They were confident.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The ROI of Coaching
          </h2>

          <p className="mb-4">
            This isn't just about feeling better. It drives results:
          </p>

          <ul className="mb-8 space-y-2">
            <li>Stores run more consistently.</li>
            <li>Managers walk into inspections confident instead of stressed.</li>
            <li>Teams actually own the standards day to day.</li>
            <li>The brand benefits from a stronger culture and fewer repeat issues.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Closing Thought
          </h2>

          <p className="mb-4">
            Inspections will always be part of QSR life.<br />
            The choice is whether they're moments of fear or moments of growth.
          </p>

          <p className="mb-4">
            My advice: stop being the compliance cop. Start being the coach.
          </p>

          <p className="mb-8">
            You'll pass more inspections. More importantly, you'll build a team that can pass them even when you're not around.
          </p>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">
            Ready to Transform Your Inspection Process?
          </h3>
          <p className="text-blue-100 mb-6">
            Start with coaching mode and build confidence before compliance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/coaching"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              Try Coaching Mode Free
            </Link>
            <Link
              href="/enterprise"
              className="px-6 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold"
            >
              Learn About Enterprise
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default BlogCoachingOverCompliance;

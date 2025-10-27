'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar, CheckCircle } from 'lucide-react';

const Blog7ShiftsIntegration = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/blog"
            className="inline-flex items-center text-blue-100 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          <div className="text-sm text-blue-100 mb-4">Product Update</div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Peak Ops Now Integrates with 7shifts: Zero Setup, Maximum Impact
          </h1>
          <p className="text-xl text-blue-100">
            Delivering daily micro-checks to the manager currently on shift. No extra logins, no new apps, just operational excellence built into your existing workflow.
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
            October 27, 2025
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
            Today marks a major milestone for Peak Ops: we're officially integrated with 7shifts.
          </p>

          <p className="mb-6">
            This wasn't just a technical integration. It unlocked the most-requested feature from our early pilot conversations: <strong>automatically delivering daily micro-checks to the manager currently on shift.</strong>
          </p>

          <p className="mb-8">
            No new logins. No extra apps. Just one text message with a 2-minute check that keeps operations tight.
          </p>

          <div className="bg-green-50 border-l-4 border-green-600 p-6 my-8">
            <p className="font-semibold text-gray-900 mb-4">What This Means for Teams Using 7shifts:</p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600 flex-shrink-0 mt-1" />
                <span>Start Peak Ops with zero setup. We sync your shifts, locations, and team automatically</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600 flex-shrink-0 mt-1" />
                <span>Micro-checks only go to managers when they're actually on shift</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600 flex-shrink-0 mt-1" />
                <span>No duplicate systems. Peak Ops works alongside the tools you already use</span>
              </li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Why This Integration Matters
          </h2>

          <p className="mb-4">
            In our early conversations with multi-unit restaurant operators, we kept hearing the same feedback:
          </p>

          <blockquote className="border-l-4 border-blue-600 pl-6 my-8 text-xl text-gray-700 italic">
            "We love the simplicity of micro-checks. But can you send them only when the opening manager is on shift? We don't want them going out when no one's there to respond."
          </blockquote>

          <p className="mb-6">
            That feedback was clear: <strong>timing matters just as much as simplicity.</strong>
          </p>

          <p className="mb-8">
            The challenge? Most teams already use 7shifts for scheduling. They didn't want to duplicate that information in yet another platform. They wanted Peak Ops to work with what they already had.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            How It Works
          </h2>

          <p className="mb-4">
            The integration is designed to be invisible to your team:
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-8">
            <ol className="space-y-4 text-gray-700">
              <li>
                <strong className="text-gray-900">1. Connect 7shifts (one time)</strong><br />
                Your admin connects Peak Ops to 7shifts once. We sync your locations, employees, and shifts automatically.
              </li>
              <li>
                <strong className="text-gray-900">2. Configure your schedule</strong><br />
                Choose when micro-checks should be sent (e.g., 30 minutes after shift start, daily at 9am, or randomized throughout the week).
              </li>
              <li>
                <strong className="text-gray-900">3. Let it run</strong><br />
                Peak Ops monitors who's on shift in real-time. When a manager clocks in, the micro-check goes out automatically.
              </li>
            </ol>
          </div>

          <p className="mb-8">
            Your managers don't need to do anything different. They get their micro-check via email or SMS, click the magic link, answer 2-3 questions, and they're done.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Built to Run Alongside Your Existing Tools
          </h2>

          <p className="mb-4">
            Here's what we learned from every pivot, every failed product, every piece of feedback:
          </p>

          <p className="mb-6 font-semibold text-gray-900">
            Teams don't want another platform to manage. They want systems that work together.
          </p>

          <p className="mb-6">
            7shifts is where you manage schedules.<br />
            Your POS is where you track sales.<br />
            Your email is where you communicate.<br />
            Peak Ops is where you build the daily habits that prevent compliance issues.
          </p>

          <p className="mb-8">
            We don't replace any of those. We fit into the gaps. Delivering accountability at the right moment, to the right person, without adding overhead.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Why Integration-First Matters
          </h2>

          <p className="mb-4">
            When we started Peak Ops, we had a choice:
          </p>

          <ul className="mb-6 space-y-2">
            <li><strong>Build our own scheduling system</strong> (and ask teams to duplicate their data)</li>
            <li><strong>Integrate with the tools they already use</strong> (and let the data flow automatically)</li>
          </ul>

          <p className="mb-6">
            The first option gives us more control. The second option gives our customers less friction.
          </p>

          <p className="mb-8">
            We chose less friction every time.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <p className="mb-4">
              <strong>Our guiding principle:</strong>
            </p>
            <p className="text-gray-700">
              Peak Ops should be the easiest thing you add to your operations stack. Not another platform to manage, but a system that makes everything else work better.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What Teams Are Saying
          </h2>

          <p className="mb-4">
            Since launching the integration in early access, we've heard from several pilot customers:
          </p>

          <blockquote className="border-l-4 border-blue-600 pl-6 my-8 text-lg text-gray-700 italic">
            "The fact that we didn't have to set up a new schedule or train anyone on a new system? That's exactly what we needed. It just works."
          </blockquote>

          <blockquote className="border-l-4 border-blue-600 pl-6 my-8 text-lg text-gray-700 italic">
            "Before, our managers would forget to do the check if they came in early or got pulled into firefighting mode. Now the check shows up exactly when they need it. 30 minutes after they clock in. Game changer."
          </blockquote>

          <p className="mb-8">
            That's the goal: make doing the right thing effortless.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What's Next
          </h2>

          <p className="mb-6">
            This integration is just the beginning. We're already working on:
          </p>

          <ul className="mb-6 space-y-2">
            <li><strong>Multi-location filtering</strong> - Configure different check schedules for different store types</li>
            <li><strong>Shift handoff summaries</strong> - Automatically send a summary of the day's findings to the closing manager</li>
            <li><strong>Role-based micro-checks</strong> - Send different checks to opening vs. closing managers</li>
            <li><strong>More integrations</strong> - Toast POS, HotSchedules, Homebase, and more</li>
          </ul>

          <p className="mb-8">
            The vision remains the same. <strong>Build daily operational habits without adding overhead.</strong>
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Our Commitment
          </h2>

          <p className="mb-6">
            Every feature we build is guided by one question:
          </p>

          <p className="mb-8 text-xl font-semibold text-gray-900 bg-blue-50 border-l-4 border-blue-600 pl-6 py-4">
            "Does this make it easier for managers to do the right thing, or does it add more work?"
          </p>

          <p className="mb-6">
            The 7shifts integration passed that test. It removes friction, respects existing workflows, and delivers value exactly when it's needed.
          </p>

          <p className="mb-8">
            That's the kind of product we're committed to building. One that runs alongside the tools you already use, that builds better habits instead of more overhead, and that turns daily ops into something managers actually want to do.
          </p>

          <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg p-8 my-12">
            <h3 className="text-2xl font-bold mb-4">Ready to Try Peak Ops with 7shifts?</h3>
            <p className="text-blue-100 mb-6">
              If your team is already using 7shifts, you can start with Peak Ops in under 5 minutes. No training required. No duplicate setup.
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              Get Started
            </Link>
          </div>

          <p className="text-lg text-gray-600 italic mt-12">
            This is what building with customer feedback looks like. Every pivot, every conversation, every "can you make it work with 7shifts?" request led to this moment.
          </p>

          <p className="text-lg text-gray-600 italic">
            We're just getting started.
          </p>
        </div>
      </article>

      {/* Related Articles */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-8">More from Peak Ops</h3>
        <div className="space-y-6">
          <Link href="/blog/pivot-chronicles-micro-checks" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">The Pivot Chronicles • Part 5</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Micro-Checks: Simplifying to 3 Questions a Day
            </h4>
            <p className="text-gray-700">
              Trading AI sophistication for behavioral consistency. How we landed on the micro-check model.
            </p>
          </Link>

          <Link href="/blog/daily-walkthrough" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Product Guide</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              The Daily Walkthrough That Actually Gets Done
            </h4>
            <p className="text-gray-700">
              How Peak Ops turns compliance checks into daily habits managers actually complete.
            </p>
          </Link>

          <Link href="/blog/coaching-over-compliance" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Philosophy</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Coaching Over Compliance: Why Micro-Checks Work
            </h4>
            <p className="text-gray-700">
              The behavioral psychology behind building habits that stick.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Building Something Teams Actually Use
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Peak Ops is designed for restaurant operators who want better results without more overhead. If you're using 7shifts, you can start today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Schedule a Demo
            </Link>
            <Link
              href="/blog"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Read More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog7ShiftsIntegration;

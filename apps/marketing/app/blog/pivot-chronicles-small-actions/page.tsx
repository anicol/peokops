'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';

const BlogPivotChroniclesSmallActions = () => {
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
          <div className="text-sm text-gray-600 mb-2">The Pivot Chronicles • Part 6</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Small Actions, Big Shifts: The Psychology Behind Micro-Checks
          </h1>
          <p className="text-lg text-gray-600 mt-4">
            How behavioral design turned compliance into momentum
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
            August 19, 2025
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
            After realizing our AI video system was too heavy for the real world, I knew the next version of PeakOps had to feel effortless: something a manager could use without breaking stride.
          </p>

          <p className="mb-6">
            So we asked one simple question:<br />
            <strong>What's the lightest possible thing that still drives improvement?</strong>
          </p>

          <p className="mb-8">
            That's where micro-checks were born.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Concept
          </h2>

          <p className="mb-4">
            Instead of a 10-minute inspection or a video upload, what if a manager just answered three quick questions a day?
          </p>

          <p className="mb-6">
            Each question represented one observable standard of operational excellence: "Hand sink stocked?", "Front entry clean?", "Team in proper PPE?"
          </p>

          <p className="mb-2">
            No app.<br />
            No login.
          </p>

          <p className="mb-4">
            Just a magic-link text each morning:
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 my-8 text-center">
            <p className="text-lg text-gray-800">
              "Hey Jamie, your three quick checks for today are ready."
            </p>
          </div>

          <p className="mb-6">
            Tap → 30 seconds later → done.
          </p>

          <p className="mb-8">
            That was it.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Why It Felt Different
          </h2>

          <p className="mb-4">
            For the first time, the product fit the rhythm of restaurant life.
          </p>

          <p className="mb-6">
            It didn't ask managers to stop what they were doing. It met them where they already were.
          </p>

          <p className="mb-4">
            The checks created small moments of awareness without feeling like compliance.<br />
            Each completion triggered instant feedback, streaks, and a sense of visible progress.
          </p>

          <p className="mb-8">
            We started calling it "operational habit formation" because it wasn't about auditing stores anymore; it was about reinforcing the right behaviors in small, repeatable ways.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Behavioral Shift
          </h2>

          <p className="mb-4">
            The psychology clicked immediately.
          </p>

          <p className="mb-6">
            <strong>Small actions, repeated daily, shape long-term consistency.</strong>
          </p>

          <p className="mb-4">
            It's the same principle as fitness apps or learning streaks: make success simple, visible, and repeatable.
          </p>

          <p className="mb-8">
            Instead of punishing mistakes, we celebrated momentum.
          </p>

          <div className="bg-green-50 border-l-4 border-green-600 p-6 my-8">
            <p className="mb-4">
              Managers stopped feeling like they were being inspected.
            </p>
            <p className="mb-0 font-semibold text-gray-900">
              They started feeling like they were improving.
            </p>
          </div>

          <p className="mb-8">
            That emotional shift was huge.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Where We Still Fell Short
          </h2>

          <p className="mb-4">
            As elegant as it felt, one big thing was still missing: customers actually using it at scale.
          </p>

          <p className="mb-6">
            We'd designed something that solved all the right usability problems, but we hadn't yet validated if operators would adopt it consistently.
          </p>

          <p className="mb-8">
            It was progress, not product-market fit.<br />
            But it finally felt like we were getting closer to something people could feel, not just understand.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What I Learned
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <p className="mb-4">
              <strong>Simplicity scales.</strong> The easier it is to start, the higher the odds it sticks.
            </p>
            <p className="mb-4">
              <strong>Behavioral design beats feature design.</strong> Habits outlast tools.
            </p>
            <p className="mb-4">
              <strong>Progress feels better than pressure.</strong> Coaching {'>'} compliance.
            </p>
            <p className="mb-0">
              <strong>The right idea still needs real users.</strong> Ease means nothing without engagement.
            </p>
          </div>

          <p className="mb-8 text-lg">
            Micro-checks were the smallest thing we'd ever built, and probably the smartest.<br />
            They turned "operations software" into a daily ritual.
          </p>

          <p className="mb-8 text-lg font-semibold text-gray-900">
            But they also exposed the next uncomfortable truth: we were still building in isolation.<br />
            That realization set up the next chapter: the pattern behind all these pivots.
          </p>

          <Link href="/blog/pivot-chronicles-pattern" className="block bg-gray-100 rounded-lg p-6 mt-12 hover:bg-gray-200 transition-colors">
            <p className="text-sm text-gray-600 mb-2">Next in The Pivot Chronicles</p>
            <p className="font-semibold text-gray-900">
              Part 7: The Pattern: Five Pivots Without Customer Engagement
            </p>
            <p className="text-gray-700 mt-2">
              We built five different products. Each one smarter, faster, and simpler than the last. And almost none of them had real customer engagement.
            </p>
          </Link>
        </div>
      </article>

      {/* Related Articles */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-8">More from The Pivot Chronicles</h3>
        <div className="space-y-6">
          <Link href="/blog/pivot-chronicles-extenure" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 1</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Extenure: When Good Data Meets the Wrong Problem
            </h4>
            <p className="text-gray-700">
              How we built beautiful predictive retention analytics that nobody wanted.
            </p>
          </Link>

          <Link href="/blog/pivot-chronicles-engagement" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 2</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              From Predictions to Engagement: Missing the Real Problem Again
            </h4>
            <p className="text-gray-700">
              Another analytics dashboard wasn't going to win. Why abstract problems don't convert.
            </p>
          </Link>

          <Link href="/blog/pivot-chronicles-peakops" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 3</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              PeakOps: The AI Video Analysis Pivot That Almost Made Sense
            </h4>
            <p className="text-gray-700">
              Finally, a tangible problem! Why impressive tech still wasn't enough.
            </p>
          </Link>

          <Link href="/blog/pivot-chronicles-micro-checks" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 4</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Micro-Checks: Simplifying to 3 Questions a Day
            </h4>
            <p className="text-gray-700">
              Trading AI sophistication for behavioral consistency. Can radical simplicity create habits?
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Building Through Experimentation
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Each iteration teaches us something new about what actually works in the field. The journey continues.
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

export default BlogPivotChroniclesSmallActions;

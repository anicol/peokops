'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';

const BlogPivotChroniclesPattern = () => {
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
          <div className="text-sm text-gray-600 mb-2">The Pivot Chronicles • Part 7</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            The Pattern: Five Pivots Without Customer Engagement
          </h1>
          <p className="text-lg text-gray-600 mt-4">
            Building for customers, but not with them
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
            August 26, 2025
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            7 min read
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            At some point, I looked back at everything we'd built—Extenure, the engagement dashboards, AI video inspections, micro-checks—and realized there was a pattern.
          </p>

          <p className="mb-6">
            We'd built five different products.<br />
            Each one smarter, faster, and simpler than the last.
          </p>

          <p className="mb-8">
            And almost none of them had real customer engagement.
          </p>

          <p className="mb-8 font-semibold text-gray-900">
            That was a hard truth to sit with.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Illusion of Progress
          </h2>

          <p className="mb-4">
            Every pivot felt like forward motion.
          </p>

          <p className="mb-6">
            We were shipping features, refining code, tightening UX, iterating fast.
          </p>

          <p className="mb-8">
            But the truth was—we weren't getting closer to customers, just closer to what we thought customers wanted.
          </p>

          <div className="bg-red-50 border-l-4 border-red-600 p-6 my-8">
            <p className="mb-0 text-gray-900">
              Every version solved a problem, just not one anyone was actively trying to fix.
            </p>
          </div>

          <p className="mb-4">
            It wasn't a lack of effort.
          </p>

          <p className="mb-8">
            It was a lack of connection.
          </p>

          <p className="mb-8 font-semibold text-gray-900">
            We weren't learning from customers—we were learning from our own assumptions.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Comfortable Trap
          </h2>

          <p className="mb-4">
            The funny thing about building in isolation is that it feels productive.
          </p>

          <p className="mb-6">
            You can spend weeks polishing architecture, perfecting flows, optimizing friction away—all while avoiding the scariest part: talking to people who might not care.
          </p>

          <div className="bg-gray-100 border-l-4 border-gray-600 p-6 my-8">
            <p className="mb-2 font-semibold text-gray-900">Writing code is safe.</p>
            <p className="mb-0 text-gray-900">Conversations are not.</p>
          </div>

          <p className="mb-8">
            I told myself I was "still validating," when in reality, I was just avoiding rejection.
          </p>

          <p className="mb-4">
            It's easy to say, "I'll reach out once it's ready."
          </p>

          <p className="mb-8">
            But "ready" never comes. There's always one more feature, one more fix, one more thing to prove before you show it to the world.
          </p>

          <p className="mb-8 font-semibold text-gray-900">
            That cycle is comforting—and deadly.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Real Pattern
          </h2>

          <p className="mb-4">
            Looking back, the through-line across every pivot was clear:
          </p>

          <p className="mb-8 text-xl font-semibold text-gray-900">
            We built things for customers, but not with them.
          </p>

          <ul className="mb-8 space-y-4">
            <li>
              <strong>Extenure</strong> had predictive models—but no conversations with HR managers.
            </li>
            <li>
              <strong>The engagement platform</strong> had surveys—but no pilot feedback loops.
            </li>
            <li>
              <strong>PeakOps AI inspections</strong> had models—but no live stores testing them.
            </li>
            <li>
              <strong>Micro-checks</strong> had the perfect UX—but no daily users yet.
            </li>
          </ul>

          <p className="mb-8">
            We were building "solutions in search of problems."
          </p>

          <p className="mb-8">
            It's a classic founder trap—mistaking technical learning for customer learning.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What I Learned
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <p className="mb-4">
              <strong>Customer feedback is the only real validation.</strong> Everything else is noise.
            </p>
            <p className="mb-4">
              <strong>A perfect product without users is still a prototype.</strong>
            </p>
            <p className="mb-4">
              <strong>Feature progress ≠ business progress.</strong>
            </p>
            <p className="mb-0">
              <strong>If you're not uncomfortable, you're probably not learning.</strong>
            </p>
          </div>

          <p className="mb-6">
            Recognizing the pattern was painful—but also freeing.
          </p>

          <p className="mb-8">
            Because once you see it, you can't unsee it.
          </p>

          <p className="mb-4">
            The next phase wasn't about another product.
          </p>

          <p className="mb-12 text-lg font-semibold text-gray-900">
            It was about fixing the approach.
          </p>

          <p className="mb-8 text-lg text-gray-700 italic">
            And that's what the next chapter became: learning what $0 in revenue can teach you that $1M never will.
          </p>

          <Link href="/blog/pivot-chronicles-zero-revenue" className="block bg-gray-100 rounded-lg p-6 mt-12 hover:bg-gray-200 transition-colors">
            <p className="text-sm text-gray-600 mb-2">Next in The Pivot Chronicles</p>
            <p className="font-semibold text-gray-900">
              Part 8: What $0 in Revenue Teaches You (That $1M Can't)
            </p>
            <p className="text-gray-700 mt-2">
              Silence is data. When there's no money coming in, you can't hide behind vanity metrics—just the truth.
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

          <Link href="/blog/pivot-chronicles-heavy-realization" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 4</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem
            </h4>
            <p className="text-gray-700">
              Innovation isn't about what's possible. It's about what's easy.
            </p>
          </Link>

          <Link href="/blog/pivot-chronicles-micro-checks" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 5</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Micro-Checks: Simplifying to 3 Questions a Day
            </h4>
            <p className="text-gray-700">
              What if we stripped everything away? Just three questions a day.
            </p>
          </Link>

          <Link href="/blog/pivot-chronicles-small-actions" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 6</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Small Actions, Big Shifts: The Psychology Behind Micro-Checks
            </h4>
            <p className="text-gray-700">
              How behavioral design turned compliance into momentum.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Brutal Honesty, Real Lessons
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            These aren't success stories. They're lessons learned the hard way—shared in real-time as we figure out what actually works.
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

export default BlogPivotChroniclesPattern;

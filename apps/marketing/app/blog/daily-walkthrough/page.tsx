import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar, CheckCircle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Manager\'s Daily Five-Minute Walkthrough | PeakOps',
  description: 'If you\'ve ever been through a surprise inspection, you know the feeling: the scramble, the stress. Learn how a simple five-minute routine can catch almost all issues.',
  openGraph: {
    title: 'The Manager\'s Daily Five-Minute Walkthrough',
    description: 'A daily walkthrough works because it\'s short enough to be consistent. Learn the five-minute routine that prevents inspection surprises.',
    url: 'https://getpeakops.com/blog/daily-walkthrough',
    siteName: 'PeakOps',
    type: 'article',
    publishedTime: '2024-03-12T00:00:00Z',
    authors: ['PeakOps Team'],
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Daily Five-Minute Walkthrough',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Manager\'s Daily Five-Minute Walkthrough',
    description: 'Five minutes a day prevents inspection surprises. Learn the daily routine that builds inspection readiness.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://getpeakops.com/blog/daily-walkthrough',
  },
};

export default function BlogDailyWalkthrough() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'The Manager\'s Daily Five-Minute Walkthrough',
    description: 'Learn how a simple five-minute daily routine can prevent inspection surprises and build lasting operational habits.',
    image: 'https://getpeakops.com/og-image.jpg',
    datePublished: '2024-03-12T00:00:00Z',
    dateModified: '2024-03-12T00:00:00Z',
    author: {
      '@type': 'Organization',
      name: 'PeakOps Team',
      url: 'https://getpeakops.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PeakOps',
      logo: {
        '@type': 'ImageObject',
        url: 'https://getpeakops.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://getpeakops.com/blog/daily-walkthrough',
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            The Manager's Daily Five-Minute Walkthrough
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
            March 12, 2024
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            4 min read
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            If you've ever been through a surprise inspection, you know the feeling: the scramble, the stress, the "how did we miss that?" moment.
          </p>

          <p className="mb-6">
            The truth is, most issues that get flagged don't pop up overnight. They build up slowly: a blocked exit, a dirty counter, a missing sign, a team member without proper gear.
          </p>

          <p className="mb-8">
            <strong>The good news? You can catch almost all of them with a simple five-minute routine.</strong>
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Why Five Minutes Matter
          </h2>

          <p className="mb-4">
            Managers already juggle a hundred things. Adding another "process" sounds painful. But five minutes is nothing compared to the hours you'll lose when you're cleaning, coaching, and correcting the day before an inspection.
          </p>

          <p className="mb-4">
            A daily walkthrough works because:
          </p>

          <ul className="mb-6 space-y-2">
            <li>It's short enough to be consistent.</li>
            <li>It shifts the mindset from panic prep to steady readiness.</li>
            <li>It builds habits your team starts to adopt naturally.</li>
          </ul>

          <p className="mb-8">
            Think of it as brushing your teeth: a small, daily action that prevents big problems later.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What to Check in a Five-Minute Walkthrough
          </h2>

          <p className="mb-6">
            Keep it simple. Focus on four areas that matter most for guest experience and compliance:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
              <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                Safety
              </h3>
              <ul className="text-red-800 space-y-1 text-sm">
                <li>• Exits clear</li>
                <li>• No spills or tripping hazards</li>
                <li>• Fire extinguishers and first-aid stations visible</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                Cleanliness
              </h3>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li>• Counters wiped</li>
                <li>• Trash where it belongs</li>
                <li>• Restrooms stocked and tidy</li>
              </ul>
            </div>

            <div className="bg-green-50 p-6 rounded-xl border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                Signage
              </h3>
              <ul className="text-green-800 space-y-1 text-sm">
                <li>• Required posters and notices in place</li>
                <li>• Menu boards/screens working</li>
                <li>• No handwritten "out of order" signs hanging around</li>
              </ul>
            </div>

            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">4</span>
                </div>
                Team Readiness
              </h3>
              <ul className="text-purple-800 space-y-1 text-sm">
                <li>• Uniforms and PPE on point</li>
                <li>• Smiles, eye contact, energy level high</li>
                <li>• Everyone knows their station</li>
              </ul>
            </div>
          </div>

          <div className="bg-teal-50 border-l-4 border-teal-500 p-6 my-8">
            <p className="text-teal-900 font-medium">
              That's it. Four categories, five minutes.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            How to Make It Stick
          </h2>

          <ul className="mb-8 space-y-3">
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Do it at the same time every day.</strong> First thing in the morning or before the lunch rush.
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Carry a notepad (or use your phone).</strong> Write down quick fixes and delegate on the spot.
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Mix recognition with corrections.</strong> If someone nailed uniform standards, say it out loud.
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Make it visible.</strong> Share a quick "today's walkthrough wins and fixes" with the shift team.
              </div>
            </li>
          </ul>

          <p className="mb-8">
            The consistency matters more than perfection.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What You'll Notice After 30 Days
          </h2>

          <p className="mb-4">
            When managers commit to a daily walkthrough, here's what usually happens:
          </p>

          <ul className="mb-8 space-y-2">
            <li>The big "gotchas" during inspections disappear.</li>
            <li>Employees catch issues before managers do.</li>
            <li>Standards rise naturally, without nagging.</li>
            <li>Guests notice: cleaner stores, better service, smoother experiences.</li>
          </ul>

          <p className="mb-8">
            It's a small change that compounds quickly.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Final Thought
          </h2>

          <p className="mb-4">
            You don't need a complicated system to keep your store inspection-ready.<br />
            You just need five minutes a day.
          </p>

          <p className="mb-4">
            Next time you grab your morning coffee, take a quick walk. Look at your store the way an inspector, or better yet, a guest, would.
          </p>

          <p className="mb-8">
            Five minutes now will save you five hours later. And it'll build a culture where every day is inspection day, in the best possible way.
          </p>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">
            Make Your Daily Walkthroughs Even More Effective
          </h3>
          <p className="text-blue-100 mb-6">
            Use PeakOps's coaching mode to get AI-powered insights during your daily checks.
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
}
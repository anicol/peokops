import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem | The Pivot Chronicles',
  description: 'By the time the AI video version of PeakOps was running smoothly, I was proud of it. It worked exactly as designed. The problem was... no one wanted to use it.',
  openGraph: {
    title: 'The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem',
    description: 'Innovation isn\'t about what\'s possible. It\'s about what\'s easy. Part 4 of The Pivot Chronicles.',
    url: 'https://getpeakops.com/blog/pivot-chronicles-heavy-realization',
    siteName: 'PeakOps',
    type: 'article',
    publishedTime: '2025-08-05T00:00:00Z',
    authors: ['Alistair Nicol'],
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'The Too Heavy Realization',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem',
    description: 'The product was heavier than the problem it was meant to fix. Innovation isn\'t about what\'s possible. It\'s about what\'s easy.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://getpeakops.com/blog/pivot-chronicles-heavy-realization',
  },
};

export default function BlogPivotChroniclesHeavyRealization() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem',
    description: 'We built advanced AI to make inspections easier, but in practice, it added steps. The product was heavier than the problem it was meant to fix.',
    image: 'https://getpeakops.com/og-image.jpg',
    datePublished: '2025-08-05T00:00:00Z',
    dateModified: '2025-08-05T00:00:00Z',
    author: {
      '@type': 'Person',
      name: 'Alistair Nicol',
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
      '@id': 'https://getpeakops.com/blog/pivot-chronicles-heavy-realization',
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
          <div className="text-sm text-gray-600 mb-2">The Pivot Chronicles • Part 4</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem
          </h1>
          <p className="text-lg text-gray-600 mt-4">
            Innovation isn't about what's possible. It's about what's easy.
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
            August 5, 2025
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
            By the time the AI video version of PeakOps was running smoothly, I was proud of it.<br />
            It worked exactly as designed: fast processing, accurate detections, full compliance reports.
          </p>

          <p className="mb-8">
            The problem was… no one wanted to use it.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Friction Tax
          </h2>

          <p className="mb-4">
            Recording and uploading videos sounded simple to me sitting behind a laptop.
          </p>

          <p className="mb-6">
            But to a restaurant manager in the middle of lunch rush? It was ridiculous.
          </p>

          <p className="mb-4">
            One operator said it perfectly:
          </p>

          <blockquote className="border-l-4 border-blue-600 pl-6 my-8 text-xl text-gray-700 italic">
            "Alistair, this is great, but my managers don't have time to be cinematographers."
          </blockquote>

          <p className="mb-8">
            That line stuck with me.
          </p>

          <p className="mb-4">
            We'd built this advanced AI system to make inspections easier, but in practice, it added steps.
          </p>

          <p className="mb-6">
            More process. More effort. More friction.
          </p>

          <p className="mb-8">
            We were solving the right problem with the wrong level of effort.
          </p>

          <div className="bg-red-50 border-l-4 border-red-600 p-6 my-8">
            <p className="mb-2">
              It wasn't a technical failure. It was a usability failure.
            </p>
            <p className="mb-0 font-semibold text-gray-900">
              The product was heavier than the problem it was meant to fix.
            </p>
          </div>

          <p className="mb-8">
            And that's when I finally started to internalize a painful truth:<br />
            <strong>Innovation isn't about what's possible. It's about what's easy.</strong>
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Weight of Good Intentions
          </h2>

          <p className="mb-4">
            As builders, it's easy to overestimate how much effort users will tolerate.
          </p>

          <p className="mb-6">
            We see potential ROI and think, "Of course they'll do this. It's worth it."
          </p>

          <p className="mb-8">
            But that's not how behavior works.<br />
            <strong>People don't choose the best solution; they choose the easiest one.</strong>
          </p>

          <p className="mb-4">
            If the workflow doesn't fit into their day, it won't matter how good the AI is.
          </p>

          <p className="mb-8">
            And no clever onboarding flow can fix that.
          </p>

          <p className="mb-8">
            So, we started asking a different question:<br />
            Instead of, "What can we automate?" we asked, <strong>"What's the absolute minimum a manager could do and still make progress?"</strong>
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Lightbulb
          </h2>

          <p className="mb-4">
            That question flipped everything.
          </p>

          <p className="mb-4">
            We stripped the system back to its core:
          </p>

          <ul className="mb-6 space-y-2">
            <li>✅ Quick check</li>
            <li>✅ Immediate feedback</li>
            <li>✅ Visible progress</li>
          </ul>

          <p className="mb-6">
            No uploads. No logins. No friction.
          </p>

          <p className="mb-8">
            Just three micro-checks a day, delivered via text message, completed in under two minutes.
          </p>

          <p className="mb-8">
            That's how PeakOps evolved from an AI inspection platform to a habit engine.<br />
            We stopped trying to digitize audits and started trying to change behavior.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What I Learned
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <p className="mb-4">
              <strong>Ease is the real innovation.</strong> Friction is more powerful than any feature.
            </p>
            <p className="mb-4">
              <strong>Adoption is emotional.</strong> If it feels like work, it won't last.
            </p>
            <p className="mb-4">
              <strong>Behavior {'>'} Automation.</strong> Great products fit naturally into routines.
            </p>
            <p className="mb-0">
              <strong>Less is usually more.</strong> Every feature adds weight. Most of them don't add value.
            </p>
          </div>

          <p className="mb-8 text-lg">
            The "too heavy" phase of PeakOps was the turning point.<br />
            It taught me that even the smartest system dies if it doesn't fit in someone's day.
          </p>

          <p className="mb-12 text-lg font-semibold text-gray-900">
            And that's what led to the simplest version yet: micro-checks, the lightest thing we could build that might still create real change.
          </p>

          <Link href="/blog/pivot-chronicles-micro-checks" className="block bg-gray-100 rounded-lg p-6 mt-12 hover:bg-gray-200 transition-colors">
            <p className="text-sm text-gray-600 mb-2">Next in The Pivot Chronicles</p>
            <p className="font-semibold text-gray-900">
              Part 5: Micro-Checks: Simplifying to 3 Questions a Day
            </p>
            <p className="text-gray-700 mt-2">
              What if we stripped everything away? No uploads, no dashboards, no AI. Just three critical questions delivered via email every morning.
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Learning Through Iteration
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Each pivot reveals new lessons about what users actually need versus what we think they want.
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
}

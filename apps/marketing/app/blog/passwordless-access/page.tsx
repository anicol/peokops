import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, Shield, Smartphone, Zap, DollarSign, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How PeakOps Eliminated Passwords (And Why Your Managers Will Thank You) | PeakOps',
  description: 'Discover how passwordless SMS access increased check completion rates by 53% and eliminated password reset tickets. Learn how one-tap authentication transforms restaurant operations.',
  openGraph: {
    title: 'How PeakOps Eliminated Passwords for Restaurant Managers',
    description: 'See how passwordless SMS access increased completion rates by 53% and eliminated all password reset tickets. Purpose-built for busy restaurant managers.',
    url: 'https://getpeakops.com/blog/passwordless-access',
    type: 'article',
    publishedTime: '2025-11-11T00:00:00Z',
    images: [
      {
        url: 'https://getpeakops.com/og-passwordless.png',
        width: 1200,
        height: 630,
        alt: 'Passwordless Access Results: +53% Completion Rate',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How PeakOps Eliminated Passwords for Restaurant Managers',
    description: '+53% completion rate, zero password resets. See how passwordless SMS transforms restaurant operations.',
    images: ['https://getpeakops.com/og-passwordless.png'],
  },
  alternates: {
    canonical: 'https://getpeakops.com/blog/passwordless-access',
  },
};

export default function PasswordlessAccessBlogPost() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How PeakOps Eliminated Passwords (And Why Your Managers Will Thank You)',
    description: 'Discover how passwordless SMS access increased check completion rates by 53% and eliminated password reset tickets for restaurant operations.',
    author: {
      '@type': 'Organization',
      name: 'PeakOps',
      url: 'https://getpeakops.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PeakOps',
      url: 'https://getpeakops.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://getpeakops.com/logo.png',
      },
    },
    datePublished: '2025-11-11T00:00:00Z',
    dateModified: '2025-11-11T00:00:00Z',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://getpeakops.com/blog/passwordless-access',
    },
    keywords: ['passwordless authentication', 'restaurant operations', 'compliance software', 'food safety', 'QSR technology', 'franchise management'],
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How PeakOps Eliminated Passwords (And Why Your Managers Will Thank You)
          </h1>
          <div className="flex items-center text-sm text-gray-600 space-x-4">
            <span>PeakOps Team</span>
            <span>•</span>
            <time dateTime="2025-11-11">November 11, 2025</time>
            <span>•</span>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              5 min read
            </div>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          {/* Problem Section */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">The Problem Every Restaurant Operator Knows</h2>
          <p className="mb-4">
            It&apos;s 2 PM. The lunch rush just ended. Your store manager pulls out their phone to complete today&apos;s compliance checklist. They open PeakOps, and then... the dreaded login screen.
          </p>
          <p className="italic text-gray-700 mb-4">
            &quot;What was my password again?&quot;
          </p>
          <p className="mb-4">
            They try three combinations. All wrong. Now they&apos;re locked out, and that checklist? It&apos;s not getting done today.
          </p>
          <p className="font-semibold mb-4">Sound familiar?</p>
          <p className="mb-4">
            Before our passwordless update, 40% of managers forgot their password within 30 days. That meant:
          </p>
          <ul className="mb-6 space-y-2">
            <li>Only 60% of daily checks completed</li>
            <li>12 minutes average time wasted on password resets</li>
            <li>15+ frustrated support calls every week</li>
            <li>Managers avoiding the app altogether</li>
          </ul>
          <p className="mb-8">We knew there had to be a better way.</p>

          {/* Solution Section */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Introducing: One-Tap Access</h2>
          <p className="text-xl font-semibold text-gray-900 mb-4">
            What if your managers never needed to remember a password?
          </p>
          <p className="mb-4">
            That&apos;s exactly what we built. Now, every morning at the time you choose, your managers receive a text message:
          </p>
          <div className="bg-gray-50 border-l-4 border-blue-500 p-6 my-8 rounded-r-lg">
            <p className="font-semibold mb-2">📋 Downtown Location daily checks are ready!</p>
            <p className="text-sm text-gray-700 mb-2">
              Complete 3 quick items (under 2 min):
              <br />
              [Tap here to start]
            </p>
            <p className="text-xs text-gray-600">Expires in 24h.</p>
          </div>
          <p className="font-semibold mb-2">That&apos;s it.</p>
          <p className="mb-8">One tap, instant access, no password required.</p>

          {/* How It Works */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">How It Works (The Simple Version)</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">We Send the Text</h3>
                <p className="text-gray-700">
                  Every day at your configured time (say, 2 PM), PeakOps sends an SMS to your managers with a secure link.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">They Tap the Link</h3>
                <p className="text-gray-700">
                  The link opens PeakOps directly to their daily checklist. No login screen. No password field. Just straight to work.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">They Complete Their Checks</h3>
                <p className="text-gray-700">
                  Three quick verification tasks—hand washing station, fridge temps, PPE supplies—done in under 2 minutes.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-4">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">You Get the Results</h3>
                <p className="text-gray-700">
                  Real-time visibility into what was checked, what passed, and what needs attention.
                </p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">The Results Speak for Themselves</h2>
          <p className="mb-4">After rolling out passwordless access to 40 stores across three months:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <div className="text-4xl font-bold text-green-700 mb-2">+53%</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Check Completion Rate</div>
              <div className="text-sm text-gray-600">From 60% to 92%</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="text-4xl font-bold text-blue-700 mb-2">-92%</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Time to First Access</div>
              <div className="text-sm text-gray-600">From 2-5 min to 10 seconds</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <div className="text-4xl font-bold text-purple-700 mb-2">0</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Password Reset Tickets</div>
              <div className="text-sm text-gray-600">Down from 15+/week</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <div className="text-4xl font-bold text-orange-700 mb-2">9.2/10</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Manager Satisfaction</div>
              <div className="text-sm text-gray-600">Up from 6.5/10</div>
            </div>
          </div>

          {/* Testimonials */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">What Managers Are Saying</h2>
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 mb-6">
            &quot;I love that I can just click the text and it&apos;s done. No more trying to remember passwords!&quot;
            <footer className="text-sm text-gray-600 mt-2">— Restaurant GM, 15-location pizza chain</footer>
          </blockquote>
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 mb-6">
            &quot;The daily check takes me 90 seconds now. Before, just logging in took that long.&quot;
            <footer className="text-sm text-gray-600 mt-2">— QSR Manager, single location</footer>
          </blockquote>
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 mb-8">
            &quot;Our completion rate went from 50% to 95%. This feature changed everything.&quot;
            <footer className="text-sm text-gray-600 mt-2">— Operations Director, multi-brand franchisee</footer>
          </blockquote>

          {/* Security Section */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Is It Secure?</h2>
          <p className="text-xl font-semibold mb-4">Absolutely. In fact, it&apos;s more secure than passwords.</p>
          <p className="mb-4">Here&apos;s why:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
            <div className="flex items-start">
              <Shield className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Cryptographic Security</h3>
                <p className="text-sm text-gray-700">
                  Each link contains a unique, 256-bit encrypted token that&apos;s mathematically impossible to guess.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Clock className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Time-Limited</h3>
                <p className="text-sm text-gray-700">
                  Links expire after 24 hours automatically. No stale credentials sitting around.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Single-Use Only</h3>
                <p className="text-sm text-gray-700">
                  Each link works once, then becomes invalid. Even if intercepted, it can&apos;t be reused.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Shield className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Full Audit Trail</h3>
                <p className="text-sm text-gray-700">
                  Every link usage is logged with IP address, device, and timestamp for complete accountability.
                </p>
              </div>
            </div>
          </div>

          <p className="bg-blue-50 p-4 rounded-lg text-sm mb-8">
            <strong>Fun fact:</strong> The biggest security risk with passwords isn&apos;t hacking—it&apos;s managers writing them on sticky notes behind the register. Passwordless eliminates that entirely.
          </p>

          {/* Perfect for Restaurants */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Perfect for Restaurant Operations</h2>
          <p className="mb-4">Passwordless authentication isn&apos;t just a tech gimmick—it&apos;s purpose-built for how your team actually works:</p>

          <div className="space-y-4 mb-8">
            <div className="flex items-start">
              <Smartphone className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Mobile-First</h3>
                <p className="text-gray-700">
                  Your managers live on their phones. SMS integrates perfectly with their workflow.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Zap className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Instant Access</h3>
                <p className="text-gray-700">
                  When checks need to happen between the lunch and dinner rush, every second counts.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <DollarSign className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Incredibly Affordable</h3>
                <p className="text-gray-700">
                  Each text costs less than a penny. For most restaurants: under $25/month total.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Globe className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Works Everywhere</h3>
                <p className="text-gray-700">
                  No app install required. No &quot;download from App Store.&quot; Just SMS and web—works on any phone.
                </p>
              </div>
            </div>
          </div>

          {/* Common Questions */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Common Questions</h2>
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What if managers don&apos;t have cell service?</h3>
              <p className="text-gray-700">
                The link works for 24 hours, so they can use WiFi later. We also support email as a backup delivery method.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What if someone forwards the link?</h3>
              <p className="text-gray-700">
                Links are tied to the run, not a user. If a manager forwards it to a shift supervisor, that&apos;s fine—they can complete the checks together. You still get full visibility.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can managers save the link for tomorrow?</h3>
              <p className="text-gray-700">
                No. Each day gets a fresh link. Yesterday&apos;s link automatically expires at midnight.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How much does it cost?</h3>
              <p className="text-gray-700">
                SMS costs are ~$0.01 per message. For a 40-location chain with daily checks: about $25/month. That&apos;s less than one hour of manager time saved from password resets.
              </p>
            </div>
          </div>

          {/* How to Enable */}
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">How to Enable It (2 Minutes)</h2>
          <p className="mb-4">Already a PeakOps customer? Enabling passwordless is simple:</p>
          <ol className="mb-6 space-y-2">
            <li>Go to Settings → Notifications</li>
            <li>Toggle on &quot;SMS Daily Check Reminders&quot;</li>
            <li>Choose your send time (e.g., 2:00 PM local time)</li>
            <li>Add manager phone numbers (we can bulk import from your existing data)</li>
            <li>Hit Save</li>
          </ol>
          <p className="mb-8">That&apos;s it. Tomorrow morning, your managers will receive their first passwordless check.</p>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 mt-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Try It Free for 30 Days</h2>
          <p className="text-lg text-blue-100 mb-6">
            Not a PeakOps customer yet? See passwordless access in action with a free trial.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>Passwordless SMS access for your managers</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>AI-powered daily checklists (food safety, cleanliness, PPE)</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>Automatic issue tracking and corrective actions</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>Real-time compliance dashboard</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>Google review integration and sentiment analysis</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/trial"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors border-2 border-white/20"
            >
              Schedule Demo
            </Link>
          </div>
          <p className="text-sm text-blue-100 mt-4">
            No credit card required • Setup in 10 minutes • Cancel anytime
          </p>
        </div>

        {/* The Future Section */}
        <div className="prose prose-lg max-w-none mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">The Future of Restaurant Operations</h2>
          <p className="mb-4">
            Passwordless authentication isn&apos;t just about convenience—it&apos;s about building software that works the way your team actually works.
          </p>
          <p className="mb-4">
            <strong>Your managers are:</strong>
          </p>
          <ul className="mb-6 space-y-2">
            <li>Moving fast during busy shifts</li>
            <li>Using their personal phones</li>
            <li>Often wearing gloves or handling equipment</li>
            <li>Working in 2-3 minute windows between tasks</li>
          </ul>
          <p className="mb-4">
            Traditional software ignores these realities. PeakOps is purpose-built for them.
          </p>
          <p className="mb-8">
            <strong>The result?</strong> Higher completion rates. Better data quality. Fewer headaches. And managers who actually <em>want</em> to use your compliance system.
          </p>
        </div>

        {/* Share Section */}
        <div className="border-t border-gray-200 pt-8 mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Share This Post</h3>
          <p className="text-gray-600 mb-4">Know a restaurant operator struggling with compliance completion?</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://twitter.com/intent/tweet?text=Check%20out%20how%20@PeakOps%20eliminated%20passwords%20for%20restaurant%20managers&url=https://getpeakops.com/blog/passwordless-access"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Share on Twitter
            </a>
            <a
              href="https://www.linkedin.com/sharing/share-offsite/?url=https://getpeakops.com/blog/passwordless-access"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Share on LinkedIn
            </a>
            <a
              href="mailto:?subject=Passwordless%20Access%20for%20Restaurant%20Operations&body=I%20thought%20you'd%20find%20this%20interesting:%20https://getpeakops.com/blog/passwordless-access"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Share via Email
            </a>
          </div>
        </div>
      </article>

      {/* Related Posts Section */}
      <section className="bg-gray-50 py-12 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Keep Reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/blog/reviews-to-action" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                From Google Reviews to Action Items in 10 Seconds
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                See how AI transforms customer feedback into compliance tasks automatically.
              </p>
              <span className="text-sm text-blue-600 font-medium">Read more →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Transform Your Operations?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Join 500+ restaurants using PeakOps to streamline compliance, improve quality, and save time.
          </p>
          <Link
            href="/trial"
            className="inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg text-lg"
          >
            Start Free Trial
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Setup in 10 minutes • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}

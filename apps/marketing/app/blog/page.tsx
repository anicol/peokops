'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import NewsletterSignup from '../../components/NewsletterSignup';

const Blog = () => {
  const blogPosts = [
    {
      id: 'passwordless-access',
      title: 'How PeakOps Eliminated Passwords (And Why Your Managers Will Thank You)',
      excerpt: 'Discover how passwordless SMS access increased check completion rates by 53% and eliminated password reset tickets. One-tap authentication transforms restaurant operations.',
      author: 'PeakOps Team',
      date: '2025-11-11',
      readTime: '5 min read',
      category: 'Product Updates',
      slug: '/blog/passwordless-access'
    },
    {
      id: 'reviews-to-action',
      title: 'From Reviews to Action: How Customer Feedback Drives Better Operations',
      excerpt: 'Your customers are leaving you detailed reports every week about what\'s working and what\'s not. Learn how to transform Google reviews into actionable micro-checks that improve operations and drive measurable results.',
      author: 'PeakOps Team',
      date: '2024-10-29',
      readTime: '7 min read',
      category: 'Operations',
      slug: '/blog/reviews-to-action'
    },
    {
      id: '7shifts-integration-milestone',
      title: 'Peak Ops Now Integrates with 7shifts: Zero Setup, Maximum Impact',
      excerpt: 'Delivering daily micro-checks to the manager currently on shift. No extra logins, no new apps, just operational excellence built into your existing workflow. This unlocks the most-requested feature from early pilots.',
      author: 'Alistair Nicol',
      date: '2025-10-27',
      readTime: '5 min read',
      category: 'Product Update',
      slug: '/blog/7shifts-integration-milestone'
    },
    {
      id: 'pivot-chronicles-starting-over',
      title: 'Starting Over (Again): What Would Change With 10 Real Customers',
      excerpt: 'Part 10 of The Pivot Chronicles: If I had to start over tomorrow and get 10 paying customers in 30 days, almost everything I\'ve built so far would be irrelevant. Not because it wasn\'t good—but because it wasn\'t anchored.',
      author: 'Alistair Nicol',
      date: '2025-09-16',
      readTime: '7 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-starting-over'
    },
    {
      id: 'pivot-chronicles-engagement-gap',
      title: 'The Engagement Gap: When Code Velocity Masks Business Stagnation',
      excerpt: 'Part 9 of The Pivot Chronicles: We were shipping fast and it felt amazing. The only problem? None of it mattered. We weren\'t shipping to customers—we were shipping to ourselves.',
      author: 'Alistair Nicol',
      date: '2025-09-09',
      readTime: '6 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-engagement-gap'
    },
    {
      id: 'pivot-chronicles-zero-revenue',
      title: 'What $0 in Revenue Teaches You (That $1M Can\'t)',
      excerpt: 'Part 8 of The Pivot Chronicles: $0 in revenue is a gift. It doesn\'t feel like one when you\'re living it—but it tells the truth in a way numbers never can. Silence is data.',
      author: 'Alistair Nicol',
      date: '2025-09-02',
      readTime: '6 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-zero-revenue'
    },
    {
      id: 'pivot-chronicles-pattern',
      title: 'The Pattern: Five Pivots Without Customer Engagement',
      excerpt: 'Part 7 of The Pivot Chronicles: We built five different products. Each one smarter, faster, and simpler than the last. And almost none of them had real customer engagement.',
      author: 'Alistair Nicol',
      date: '2025-08-26',
      readTime: '7 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-pattern'
    },
    {
      id: 'pivot-chronicles-small-actions',
      title: 'Small Actions, Big Shifts: The Psychology Behind Micro-Checks',
      excerpt: 'Part 6 of The Pivot Chronicles: Simplicity scales. The easier it is to start, the higher the odds it sticks. How we turned operations software into a daily ritual through behavioral design.',
      author: 'Alistair Nicol',
      date: '2025-08-19',
      readTime: '6 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-small-actions'
    },
    {
      id: 'pivot-chronicles-micro-checks',
      title: 'Micro-Checks: Simplifying to 3 Questions a Day',
      excerpt: 'Part 5 of The Pivot Chronicles: What if we stripped everything away? No uploads, no dashboards, no AI. Just three critical questions delivered via email every morning. Can radical simplicity create the habits that sophistication couldn\'t?',
      author: 'Alistair Nicol',
      date: '2025-08-12',
      readTime: '7 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-micro-checks'
    },
    {
      id: 'pivot-chronicles-heavy-realization',
      title: 'The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem',
      excerpt: 'Part 4 of The Pivot Chronicles: Innovation isn\'t about what\'s possible. It\'s about what\'s easy. How we learned that friction kills adoption faster than any missing feature.',
      author: 'Alistair Nicol',
      date: '2025-08-05',
      readTime: '6 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-heavy-realization'
    },
    {
      id: 'pivot-chronicles-peakops',
      title: 'PeakOps: The AI Video Analysis Pivot That Almost Made Sense',
      excerpt: 'Part 3 of The Pivot Chronicles: Finally, a tangible problem! Health code violations, safety issues, cleanliness. We built AWS Rekognition, PPE detection, the works. Why impressive tech still wasn\'t enough.',
      author: 'Alistair Nicol',
      date: '2025-07-29',
      readTime: '8 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-peakops'
    },
    {
      id: 'pivot-chronicles-engagement',
      title: 'From Predictions to Engagement: Missing the Real Problem Again',
      excerpt: 'Part 2 of The Pivot Chronicles: We thought employee engagement was the answer. Built surveys, dashboards, and scoring. Learned that another analytics dashboard wasn\'t going to win.',
      author: 'Alistair Nicol',
      date: '2025-07-22',
      readTime: '7 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-engagement'
    },
    {
      id: 'pivot-chronicles-extenure',
      title: 'Extenure: When Good Data Meets the Wrong Problem',
      excerpt: 'Part 1 of The Pivot Chronicles: How we built beautiful predictive retention analytics that nobody wanted. A brutally honest look at mistaking polite interest for product-market fit.',
      author: 'Alistair Nicol',
      date: '2025-07-15',
      readTime: '6 min read',
      category: 'The Pivot Chronicles',
      slug: '/blog/pivot-chronicles-extenure'
    },
    {
      id: 'coaching-over-compliance',
      title: 'Coaching Over Compliance: How QSR Managers Can Turn Inspections Into Growth Moments',
      excerpt: 'Most managers in quick service restaurants dread inspections. They feel like high-stakes tests where the goal is simple: don\'t fail. But there\'s a better way.',
      author: 'PeakOps Team',
      date: '2024-03-15',
      readTime: '5 min read',
      category: 'Management',
      slug: '/blog/coaching-over-compliance'
    },
    {
      id: 'daily-walkthrough',
      title: 'The Manager\'s Daily Five-Minute Walkthrough',
      excerpt: 'If you\'ve ever been through a surprise inspection, you know the feeling: the scramble, the stress, the "how did we miss that?" moment. Here\'s how to prevent it.',
      author: 'PeakOps Team',
      date: '2024-03-12',
      readTime: '4 min read',
      category: 'Operations',
      slug: '/blog/daily-walkthrough'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              PeakOps Blog
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Building habits that drive operational excellence. Stories and lessons from the journey.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-12">
              {blogPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="p-8">
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                        {post.category}
                      </span>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {post.readTime}
                      </div>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                      <Link
                        href={post.slug}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h2>

                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        {post.author}
                      </div>

                      <Link
                        href={post.slug}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Read More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Stay Updated
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Get the latest insights on restaurant inspections and management delivered to your inbox.
            </p>
            <NewsletterSignup />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Build Better Habits?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Three quick questions a day. One minute. Daily operational excellence through simple, consistent habits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/coaching"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Start Your Micro-Checks
            </Link>
            <Link
              href="/enterprise"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog;

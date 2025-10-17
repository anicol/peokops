import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';

const Blog = () => {
  const blogPosts = [
    {
      id: 'pivot-chronicles-extenure',
      title: 'Extenure: When Good Data Meets the Wrong Problem',
      excerpt: 'Part 1 of The Pivot Chronicles: How we built beautiful predictive retention analytics that nobody wanted. A brutally honest look at mistaking polite interest for product-market fit.',
      author: 'Alistair Nicol',
      date: '2025-01-16',
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
      <SEO
        title="PeakOps Blog - Restaurant Inspection Insights & Management Tips"
        description="Expert insights, tips, and best practices for modern restaurant inspections, management, and compliance. Learn how to transform your QSR operations with AI-powered coaching."
        keywords="restaurant inspections, QSR management, restaurant compliance, food safety, restaurant operations, AI inspections, coaching mode, restaurant training"
        url="https://getpeakops.com/blog"
        type="website"
      />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              PeakOps Blog
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Insights, tips, and best practices for modern restaurant inspections and management.
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
                        to={post.slug}
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
                        to={post.slug}
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
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Inspections?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Put these insights into practice with PeakOps's coaching-first approach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/coaching"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Try Coaching Free
            </Link>
            <Link
              to="/enterprise"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Get Enterprise Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog;
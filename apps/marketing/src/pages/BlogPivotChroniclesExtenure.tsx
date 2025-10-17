import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import SEO from '../components/SEO';

const BlogPivotChroniclesExtenure = () => {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Extenure: When Good Data Meets the Wrong Problem - The Pivot Chronicles"
        description="Part 1 of The Pivot Chronicles: How we built beautiful predictive retention analytics that nobody wanted. A brutally honest look at mistaking polite interest for product-market fit."
        keywords="startup pivots, product-market fit, employee retention, predictive analytics, SaaS lessons, startup failure, customer validation"
        author="Alistair Nicol"
        type="article"
        url="https://getpeakops.com/blog/pivot-chronicles-extenure"
        publishedTime="2025-01-16T00:00:00Z"
        section="The Pivot Chronicles"
        tags={['Startup Journey', 'Product-Market Fit', 'Pivots', 'Lessons Learned', 'SaaS']}
      />
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/blog"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          <div className="text-sm text-gray-600 mb-2">The Pivot Chronicles • Part 1</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Extenure: When Good Data Meets the Wrong Problem
          </h1>
          <p className="text-lg text-gray-600 mt-4">
            Building a SaaS in Search of Product-Market Fit
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
            January 16, 2025
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
            I thought I was being clever.<br />
            Predict who's about to quit, tell the manager early, save the company money.
          </p>

          <p className="mb-6">
            That was Extenure: predictive retention analytics for frontline teams.<br />
            We pulled scheduling data, payroll records, and engagement signals into models that could spot turnover risk weeks in advance.<br />
            It worked. The models were accurate. The dashboards looked sharp.
          </p>

          <p className="mb-8 font-semibold text-gray-900">
            And nobody cared.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The False Positive of Validation
          </h2>

          <p className="mb-4">
            Every operator nodded when I pitched it.
          </p>

          <p className="mb-2 italic text-gray-700">
            "Turnover is killing us."
          </p>
          <p className="mb-4 italic text-gray-700">
            "This is so needed."
          </p>

          <p className="mb-4">
            Then... silence. No follow-ups, no pilots, no urgency.
          </p>

          <p className="mb-6">
            I mistook polite interest for product-market fit.<br />
            People loved the <em>idea</em> of knowing, not the <em>act</em> of changing.<br />
            Prediction gave them information, not relief.
          </p>

          <p className="mb-8">
            That's when I learned a painful truth: <strong>retention is a symptom, not the disease.</strong><br />
            You can't fix it with better analytics because managers already know who's slipping: they just don't have the time, training, or systems to re-engage those people.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            When "AI-Powered" Becomes "Why Bother"
          </h2>

          <p className="mb-4">
            I once demoed a dashboard showing an operator their "top 10 at-risk employees."<br />
            He looked at it and said,
          </p>

          <blockquote className="border-l-4 border-blue-600 pl-6 my-8 text-xl text-gray-700 italic">
            "Even if that's right, what am I supposed to do with it? Send them a card?"
          </blockquote>

          <p className="mb-6">
            That line gutted me: because he was right.<br />
            We'd built something that diagnosed but didn't heal.<br />
            In the real world, insight without action just adds guilt.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What I Missed
          </h2>

          <p className="mb-6">
            I built Extenure around what I found elegant: data, accuracy, prediction.<br />
            What managers wanted was simplicity, empathy, and help.<br />
            They didn't need to know who might leave: they needed a way to make staying easier.
          </p>

          <p className="mb-8">
            Extenure wasn't wrong technically.<br />
            It was just solving the wrong problem beautifully.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What I Learned
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <p className="mb-4">
              <strong>Good data ≠ good product.</strong> Accuracy means nothing if no one acts on it.
            </p>
            <p className="mb-4">
              <strong>Insight ≠ relief.</strong> Analytics don't ease real-world pressure.
            </p>
            <p className="mb-4">
              <strong>Polite interest ≠ demand.</strong> "Love it" without payment is rejection in disguise.
            </p>
            <p className="mb-0">
              <strong>Predicting behavior ≠ changing it.</strong> Real impact starts with human habits.
            </p>
          </div>

          <p className="mb-8 text-lg">
            That realization ended Extenure: and started the long, humbling road toward tools that help people do better, not just know better.
          </p>

          <div className="bg-gray-100 rounded-lg p-6 mt-12">
            <p className="text-sm text-gray-600 mb-2">Coming Next in The Pivot Chronicles</p>
            <p className="font-semibold text-gray-900">
              Part 2: From Predictions to Engagement: Missing the Real Problem Again
            </p>
            <p className="text-gray-700 mt-2">
              How we pivoted from retention to engagement and learned that another analytics dashboard wasn't going to win.
            </p>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-8">More from The Pivot Chronicles</h3>
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Coming Soon</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Part 2: From Predictions to Engagement
            </h4>
            <p className="text-gray-700">
              The second pivot, and why engagement analytics wasn't the answer either.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Building in Public
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Following our journey from pivots to (hopefully) product-market fit? We're documenting everything as we go.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/blog"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Read More Stories
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Share Your Feedback
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPivotChroniclesExtenure;

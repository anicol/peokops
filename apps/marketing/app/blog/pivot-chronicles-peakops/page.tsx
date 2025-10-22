'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';

const BlogPivotChroniclesPeakOps = () => {
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
          <div className="text-sm text-gray-600 mb-2">The Pivot Chronicles • Part 3</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            PeakOps: The AI Video Analysis Pivot That Almost Made Sense
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
            July 29, 2025
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            8 min read
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            This time felt different.<br />
            Finally, a problem you could see, touch, and point to.
          </p>

          <p className="mb-6">
            Not abstract like retention or engagement.<br />
            Real problems: health code violations, safety hazards, cleanliness issues, PPE compliance.
          </p>

          <p className="mb-8">
            Things that restaurant operators actually lose sleep over.<br />
            Things that shut locations down, fail health inspections, and hurt brands.
          </p>

          <p className="mb-8 font-semibold text-gray-900">
            This was it. We'd found the real problem.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Tech Was Impressive
          </h2>

          <p className="mb-4">
            We built the whole stack:
          </p>

          <ul className="mb-6 space-y-2">
            <li>AWS Rekognition for PPE detection (gloves, hairnets, face masks)</li>
            <li>Object detection for safety violations (blocked exits, spills, equipment issues)</li>
            <li>OCR for signage compliance (handwashing signs, temperature logs)</li>
            <li>Frame extraction and analysis pipelines with FFmpeg</li>
            <li>Compliance scoring algorithms across 11 categories</li>
            <li>Beautiful dashboards with finding details and corrective action tracking</li>
          </ul>

          <p className="mb-6">
            The demos were stunning.<br />
            Upload a kitchen walkthrough video, watch the AI identify every issue, see the compliance scores update in real-time.
          </p>

          <p className="mb-8">
            People's eyes lit up during demos. This was magic. This was the future.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Problem Nobody Told Me About
          </h2>

          <p className="mb-4">
            Then we asked operators to actually use it.
          </p>

          <p className="mb-6">
            "Just record a quick video walkthrough of your kitchen and upload it."
          </p>

          <p className="mb-4">
            Simple, right?
          </p>

          <p className="mb-8">
            Wrong.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Upload Friction Wall
          </h2>

          <p className="mb-4">
            Restaurant managers are the busiest people I've ever met.<br />
            They're juggling:
          </p>

          <ul className="mb-6 space-y-2">
            <li>Staff scheduling (and call-offs)</li>
            <li>Inventory and ordering</li>
            <li>Customer complaints</li>
            <li>Equipment breakdowns</li>
            <li>Food prep and quality control</li>
            <li>Cash handling and deposits</li>
            <li>Training new hires</li>
            <li>Corporate reports and compliance forms</li>
          </ul>

          <p className="mb-6">
            And we wanted them to:<br />
            Pull out their phone, record a 2-minute video, upload it to our platform, wait for processing, then review the results.
          </p>

          <p className="mb-8">
            We'd built a solution that required them to add more work to fix their workload problem.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Pilot That Taught Me Everything
          </h2>

          <p className="mb-4">
            We got a pilot with a 5-location restaurant group.<br />
            Week 1: They were excited. Uploaded 3 videos.
          </p>

          <p className="mb-4">
            Week 2: 1 video.
          </p>

          <p className="mb-4">
            Week 3: Nothing.
          </p>

          <p className="mb-6">
            I called the GM to check in.<br />
            "The tool is great," he said. "We're just slammed. I'll get to it next week."
          </p>

          <p className="mb-8">
            Next week never came.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            When Your Solution Increases the Problem
          </h2>

          <p className="mb-6">
            We promised to reduce inspection overhead.<br />
            Instead, we added steps:
          </p>

          <div className="bg-red-50 border-l-4 border-red-600 p-6 my-8">
            <p className="mb-2 font-semibold text-gray-900">Old process:</p>
            <p className="mb-4 text-gray-700">Visual walkthrough, mental checklist, fix obvious issues. Done in 5 minutes.</p>

            <p className="mb-2 font-semibold text-gray-900">Our process:</p>
            <p className="text-gray-700">Record video, upload, wait for processing, review dashboard, create action items, assign tasks, track completion. 20+ minutes.</p>
          </div>

          <p className="mb-8">
            We turned a 5-minute habit into a 20-minute project.<br />
            And wondered why adoption stalled.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Demo-to-Reality Gap
          </h2>

          <p className="mb-6">
            Our demos worked because we controlled everything:<br />
            Pre-recorded videos, perfect lighting, cooperative environments, wifi that worked.
          </p>

          <p className="mb-4">
            Reality was messier:
          </p>

          <ul className="mb-6 space-y-2">
            <li>Videos shot in poor lighting (kitchens aren't Instagram studios)</li>
            <li>Shaky footage from rushed walkthroughs</li>
            <li>Uploads failing on slow restaurant wifi</li>
            <li>100MB+ video files eating mobile data</li>
            <li>Processing taking 3-5 minutes (felt like forever)</li>
            <li>AI missing obvious issues or flagging false positives</li>
          </ul>

          <p className="mb-8">
            The tech worked in demos. It stumbled in the real world.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Building What I Found Elegant (Again)
          </h2>

          <p className="mb-6">
            I was so proud of the AI pipeline.<br />
            AWS Rekognition! Computer vision! Machine learning!
          </p>

          <p className="mb-6">
            I built what impressed other engineers, not what helped restaurant managers.
          </p>

          <p className="mb-8">
            A simple photo-based checklist would have been better.<br />
            Less impressive. More useful.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            The Moment of Clarity
          </h2>

          <p className="mb-4">
            A franchise owner told me:
          </p>

          <blockquote className="border-l-4 border-blue-600 pl-6 my-8 text-xl text-gray-700 italic">
            "I don't need a fancy system. I need my managers to actually check the fryers every morning. That's it."
          </blockquote>

          <p className="mb-6">
            That hit hard.<br />
            We'd built a sophisticated inspection platform when what they needed was behavior change.
          </p>

          <p className="mb-8">
            AI couldn't create habits. Friction prevented adoption. Complexity killed consistency.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            What I Learned
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <p className="mb-4">
              <strong>Impressive demos ≠ useful products.</strong> What wows in a meeting fails in daily use.
            </p>
            <p className="mb-4">
              <strong>Tangible problems need frictionless solutions.</strong> Adding steps to solve workflow issues doesn't work.
            </p>
            <p className="mb-4">
              <strong>Tech sophistication ≠ customer value.</strong> Simple and consistent beats complex and impressive.
            </p>
            <p className="mb-4">
              <strong>Pilots without sustained usage aren't validation.</strong> Excitement fades. Habits reveal truth.
            </p>
            <p className="mb-0">
              <strong>Build for the busiest day, not the demo day.</strong> If it doesn't work when they're slammed, it doesn't work.
            </p>
          </div>

          <p className="mb-8 text-lg">
            PeakOps was the closest we'd come to product-market fit.<br />
            But close isn't good enough when friction kills adoption.
          </p>

          <p className="mb-8 text-lg font-semibold text-gray-900">
            We needed something lighter. Faster. Easier.<br />
            Something that fit into their day instead of adding to it.
          </p>

          <Link href="/blog/pivot-chronicles-heavy-realization" className="block bg-gray-100 rounded-lg p-6 mt-12 hover:bg-gray-200 transition-colors">
            <p className="text-sm text-gray-600 mb-2">Next in The Pivot Chronicles</p>
            <p className="font-semibold text-gray-900">
              Part 4: The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem
            </p>
            <p className="text-gray-700 mt-2">
              Innovation isn't about what's possible. It's about what's easy. How we learned that friction kills adoption faster than any missing feature.
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

          <Link href="/blog/pivot-chronicles-heavy-realization" className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Part 4</p>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              The "Too Heavy" Realization: When Your Solution Is Harder Than the Problem
            </h4>
            <p className="text-gray-700">
              Innovation isn't about what's possible. It's about what's easy.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            The Journey Continues
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Each pivot taught us something new. Each failure brought us closer to understanding what customers actually need.
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

export default BlogPivotChroniclesPeakOps;

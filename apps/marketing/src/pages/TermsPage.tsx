import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="Terms of Service - PeakOps"
        description="Terms of Service for PeakOps - Habit-Based Operations Intelligence"
        url="https://getpeakops.com/terms"
      />
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-12">Last Updated: January 2025</p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By accessing or using PeakOps ("Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to these Terms, please do not use our Service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              PeakOps provides habit-based operations intelligence software that helps businesses build daily habits
              for operational excellence through micro-checks, AI feedback, and insights.
            </p>
          </section>

          {/* SMS Communications */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. SMS Communications</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By providing your mobile phone number and agreeing to receive SMS notifications from PeakOps, you consent to receive:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Daily micro-check notifications (up to 1 message per day)</li>
              <li>Magic link authentication messages</li>
              <li>Service updates and notifications</li>
              <li>Reminder messages for incomplete checks</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Message Frequency:</strong> You may receive up to 1 message per day. Message frequency may vary based on your activity and preferences.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Message & Data Rates:</strong> Standard message and data rates may apply. Please contact your mobile carrier for details on your messaging plan.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Opt-Out:</strong> You may opt out of SMS messages at any time by replying <strong>STOP</strong> to any message.
              After opting out, you will receive one final confirmation message. You may also opt out by contacting us at support@getpeakops.com.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Help:</strong> For help or support, reply <strong>HELP</strong> to any message or contact us at support@getpeakops.com.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Carriers:</strong> Carriers are not liable for delayed or undelivered messages. Our SMS service is available on all major U.S. carriers.
            </p>
          </section>

          {/* Account Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Terms</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>You must provide a valid phone number to create an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You may not use the Service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          {/* Service Description */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Service Description</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              PeakOps consists of three AI agents:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>The Guide:</strong> Daily micro-check notifications and habit-building tools</li>
              <li><strong>The Coach:</strong> AI-powered video feedback for operational improvements</li>
              <li><strong>The Inspector:</strong> Enterprise-level visibility and insights</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
            </p>
          </section>

          {/* Data and Privacy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data and Privacy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your use of the Service is also governed by our Privacy Policy. Key points include:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Videos submitted to The Coach are processed by AI and deleted after analysis</li>
              <li>Enterprise data is encrypted and securely retained for reporting purposes</li>
              <li>We do not sell your personal information to third parties</li>
              <li>You retain ownership of all content you submit to the Service</li>
            </ul>
          </section>

          {/* Payment Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Payment Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Free Trial:</strong> PeakOps offers a free trial of The Guide with no credit card required.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Paid Plans:</strong> If you upgrade to a paid plan:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>You authorize us to charge your payment method on a recurring basis</li>
              <li>You may cancel your subscription at any time</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are owned by PeakOps and are protected by
              international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You may not copy, modify, distribute, sell, or lease any part of our Service without our prior written permission.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PEAKOPS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY,
              OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability,
              for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email
              or through a notice on our Service. Your continued use of the Service after such modifications constitutes your
              acceptance of the updated Terms.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Email:</strong> support@getpeakops.com</li>
              <li><strong>Website:</strong> https://getpeakops.com</li>
            </ul>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}

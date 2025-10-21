'use client';

import Link from 'next/link';
import { Shield, Eye, Trash2, Clock, Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Privacy-First Design</h1>
          <p className="text-xl text-gray-600">
            Built with privacy at its core. Your data, your control, your peace of mind.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Coaching Privacy */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Coaching Mode Privacy</h2>
            </div>

            <div className="bg-green-50 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-green-800 mb-4">Maximum Privacy Protection</h3>
              <p className="text-green-700 mb-6">
                Coaching Mode is designed for private store improvement with automatic data purging to protect employee privacy.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <Trash2 className="h-6 w-6 text-green-600 mr-3 mt-1" />
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">Auto-Purged Videos</h4>
                    <p className="text-green-700 text-sm">
                      Source videos are automatically deleted after AI analysis. Only anonymized thumbnails are retained.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Eye className="h-6 w-6 text-green-600 mr-3 mt-1" />
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">Store-Only Visibility</h4>
                    <p className="text-green-700 text-sm">
                      Results are only visible to the specific store. Corporate teams cannot access coaching mode data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="h-6 w-6 text-green-600 mr-3 mt-1" />
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">Short Retention</h4>
                    <p className="text-green-700 text-sm">
                      All coaching data is purged within 3-7 days (configurable per brand policy).
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Lock className="h-6 w-6 text-green-600 mr-3 mt-1" />
                  <div>
                    <h4 className="font-semondary text-green-800 mb-2">No Corporate Records</h4>
                    <p className="text-green-700 text-sm">
                      Coaching sessions do not create corporate compliance records or audit trails.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Retention Windows */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Configurable Retention Policies</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Inspection Mode */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600 mr-3" />
                  <h3 className="text-xl font-semibold">Inspection Mode</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Video retention</span>
                    <span className="font-medium">180-365 days</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Analysis data</span>
                    <span className="font-medium">180-365 days</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Compliance records</span>
                    <span className="font-medium">Per brand policy</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Audit trails</span>
                    <span className="font-medium">Permanent</span>
                  </div>
                </div>
              </div>

              {/* Coaching Mode */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Eye className="h-6 w-6 text-green-600 mr-3" />
                  <h3 className="text-xl font-semibold">Coaching Mode</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Source video</span>
                    <span className="font-medium text-red-600">Auto-deleted</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Anonymized thumbnails</span>
                    <span className="font-medium">3-7 days</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Analysis results</span>
                    <span className="font-medium">3-7 days</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Corporate access</span>
                    <span className="font-medium text-red-600">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Face Blur */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Optional Face Blur Technology</h2>

            <div className="bg-blue-50 rounded-lg p-8">
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-800 mb-4">Advanced Privacy Protection</h3>
                  <p className="text-blue-700 mb-6">
                    Enable automatic face detection and blurring to protect employee identity while maintaining inspection accuracy.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">How It Works</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• AI detects faces in uploaded videos</li>
                        <li>• Faces are automatically blurred before analysis</li>
                        <li>• Compliance checking remains accurate</li>
                        <li>• Employee privacy is protected</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">Benefits</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Increased employee comfort</li>
                        <li>• GDPR/privacy compliance</li>
                        <li>• Reduced privacy concerns</li>
                        <li>• Maintained inspection quality</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Compliance */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Security & Compliance</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 border rounded-lg">
                <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Data Encryption</h3>
                <p className="text-gray-600 text-sm">
                  All data encrypted in transit and at rest using industry-standard AES-256 encryption.
                </p>
              </div>

              <div className="text-center p-6 border rounded-lg">
                <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Access Controls</h3>
                <p className="text-gray-600 text-sm">
                  Role-based access controls ensure only authorized personnel can view inspection data.
                </p>
              </div>

              <div className="text-center p-6 border rounded-lg">
                <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Audit Logs</h3>
                <p className="text-gray-600 text-sm">
                  Complete audit trails track all system access and data operations for compliance.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About Privacy?</h2>
            <p className="text-gray-600 mb-6">
              Our privacy team is here to help with any questions about data handling, retention policies, or compliance requirements.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Contact Privacy Team
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ArrowRight, Calendar, Phone, Mail, Building, CheckCircle } from 'lucide-react';
import { sendDemoRequest } from '../../src/services/apiService';

export default function DemoPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    stores: '',
    role: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await sendDemoRequest(formData);

      // Show success message
      setIsSubmitted(true);

      // Clear form immediately
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        phone: '',
        stores: '',
        role: '',
        message: ''
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send demo request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              See PeakOps in Action
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get a personalized demo and discover how AI powered inspections can transform your operation.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                30-minute demo
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Custom walkthrough
              </div>
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-2" />
                ROI analysis for your stores
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Form */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Request Your Demo</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Stores *
                    </label>
                    <select
                      name="stores"
                      required
                      value={formData.stores}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select range</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-100">51-100</option>
                      <option value="101-500">101-500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select your role</option>
                    <option value="operations-director">Operations Director</option>
                    <option value="brand-executive">Brand Executive</option>
                    <option value="franchise-corporate">Franchise Corporate</option>
                    <option value="store-manager">Store Manager</option>
                    <option value="district-manager">District Manager</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your current inspection challenges or what you'd like to see in the demo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {isSubmitted && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Thank you! Your demo request has been sent successfully.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full px-6 py-3 rounded-lg transition-colors inline-flex items-center justify-center font-semibold ${
                    isSubmitting
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? 'Sending...' : 'Request Demo'}
                  {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </button>
              </form>
            </div>

            {/* What to Expect */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">What to Expect</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-2 mr-4 mt-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Personalized Walkthrough</h4>
                    <p className="text-gray-600">
                      See how PeakOps works with your specific brand standards and inspection requirements.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                    <Building className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Custom ROI Analysis</h4>
                    <p className="text-gray-600">
                      We'll calculate potential savings based on your current inspection costs and store count.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-purple-100 rounded-full p-2 mr-4 mt-1">
                    <Phone className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Technical Q&A</h4>
                    <p className="text-gray-600">
                      Ask questions about security, integrations, and implementation timelines.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-orange-100 rounded-full p-2 mr-4 mt-1">
                    <Mail className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Follow Up Resources</h4>
                    <p className="text-gray-600">
                      Receive demo recordings, case studies, and pilot program details.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Perfect for:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Operations teams evaluating new inspection technology</li>
                  <li>• Brands looking to reduce travel costs</li>
                  <li>• Companies wanting consistent, objective scoring</li>
                  <li>• Organizations ready to scale inspection coverage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

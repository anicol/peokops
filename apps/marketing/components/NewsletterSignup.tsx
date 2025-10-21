'use client';

import React, { useState } from 'react';

interface NewsletterSignupProps {
  formId?: string;
  apiKey?: string;
}

const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  formId = process.env.NEXT_PUBLIC_CONVERTKIT_FORM_ID,
  apiKey = process.env.NEXT_PUBLIC_CONVERTKIT_API_KEY
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    if (!formId || !apiKey) {
      setStatus('error');
      setMessage('Configuration error. Please contact support.');
      console.error('ConvertKit Form ID or API Key not configured');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      console.log('Submitting to ConvertKit:', { formId, email });

      const response = await fetch(
        `https://api.convertkit.com/v3/forms/${formId}/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKey,
            email: email,
          }),
        }
      );

      console.log('ConvertKit response status:', response.status);

      const data = await response.json();
      console.log('ConvertKit response data:', data);

      if (response.ok) {
        setStatus('success');
        setMessage('Success! Check your email (and spam folder) to confirm your subscription.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || data.error || 'Something went wrong. Please try again.');
        console.error('ConvertKit API error:', data);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
      console.error('ConvertKit subscription error:', error);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 text-center ${
          status === 'success' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default NewsletterSignup;

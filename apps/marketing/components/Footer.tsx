'use client';

import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold">PeakOps</span>
            </Link>
            <p className="text-gray-400 text-sm font-semibold">
              Habit-Based Operations Intelligence
            </p>
            <p className="text-gray-400 text-sm">
              Empower teams. Build habits. Keep every location consistent.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/coaching-mode" className="text-gray-400 hover:text-white transition-colors">
                  The Guide
                </Link>
              </li>
              <li>
                <Link href="/coaching-mode" className="text-gray-400 hover:text-white transition-colors">
                  The Coach
                </Link>
              </li>
              <li>
                <Link href="/enterprise" className="text-gray-400 hover:text-white transition-colors">
                  The Inspector
                </Link>
              </li>
              <li>
                <Link href="/roi" className="text-gray-400 hover:text-white transition-colors">
                  ROI Calculator
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/enterprise" className="text-gray-400 hover:text-white transition-colors">
                  Request Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <a href="#careers" className="text-gray-400 hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#help" className="text-gray-400 hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#status" className="text-gray-400 hover:text-white transition-colors">
                  Status
                </a>
              </li>
              <li>
                <a href="#api" className="text-gray-400 hover:text-white transition-colors">
                  API Docs
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="#terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Ask AI Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col items-center space-y-6">
            <h3 className="text-gray-400 text-sm font-medium">
              Ask AI for a summary of PeakOps
            </h3>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              {/* ChatGPT */}
              <a
                href={`https://chat.openai.com/?q=${encodeURIComponent("As a multi-unit restaurant operator, I want to understand what makes PeakOps the best way to improve consistency and operational excellence across my locations — and why an AI-driven habit platform could be a fit for my business. Summarize the highlights from PeakOps' website: https://getpeakops.com")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                title="Ask ChatGPT"
              >
                <div className="w-12 h-12 bg-[#74aa9c] hover:bg-[#5d8a7e] rounded-xl flex items-center justify-center transition-colors">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                  </svg>
                </div>
              </a>

              {/* Claude */}
              <a
                href={`https://claude.ai/new?q=${encodeURIComponent("As a multi-unit restaurant operator, I want to understand what makes PeakOps the best way to improve consistency and operational excellence across my locations — and why an AI-driven habit platform could be a fit for my business. Summarize the highlights from PeakOps' website: https://getpeakops.com")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                title="Ask Claude"
              >
                <div className="w-12 h-12 bg-[#CC9B7A] hover:bg-[#b8865f] rounded-xl flex items-center justify-center transition-colors">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                  </svg>
                </div>
              </a>

              {/* Gemini */}
              <a
                href={`https://gemini.google.com/app?q=${encodeURIComponent("As a multi-unit restaurant operator, I want to understand what makes PeakOps the best way to improve consistency and operational excellence across my locations — and why an AI-driven habit platform could be a fit for my business. Summarize the highlights from PeakOps' website: https://getpeakops.com")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                title="Ask Gemini"
              >
                <div className="w-12 h-12 bg-[#1F1F1F] hover:bg-[#3a3a3a] rounded-xl flex items-center justify-center transition-colors">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </a>

              {/* Sparkle Icon */}
              <div className="text-blue-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>

              {/* Perplexity */}
              <a
                href={`https://www.perplexity.ai/?q=${encodeURIComponent("As a multi-unit restaurant operator, I want to understand what makes PeakOps the best way to improve consistency and operational excellence across my locations — and why an AI-driven habit platform could be a fit for my business. Summarize the highlights from PeakOps' website: https://getpeakops.com")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                title="Ask Perplexity"
              >
                <div className="w-12 h-12 bg-black hover:bg-gray-900 rounded-xl flex items-center justify-center transition-colors border border-gray-700">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 PeakOps. All rights reserved.
            </p>
            <a href="mailto:hello@getpeakops.com" className="text-gray-400 hover:text-white text-sm transition-colors">
              hello@getpeakops.com
            </a>
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#twitter" className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="#linkedin" className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">LinkedIn</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
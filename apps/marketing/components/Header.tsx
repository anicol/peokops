'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { TRIAL_SIGNUP_URL, LOGIN_URL } from '../src/config/urls';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="PeakOps" className="w-8 h-8" />
            <span className="text-xl font-bold text-gray-900">PeakOps</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* Product Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProductOpen(!isProductOpen)}
                className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
              >
                Product
                <ChevronDown className="ml-1 w-4 h-4" />
              </button>
              {isProductOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <Link
                    href="/guide"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    onClick={() => setIsProductOpen(false)}
                  >
                    The Guide
                  </Link>
                  <Link
                    href="/coaching"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    onClick={() => setIsProductOpen(false)}
                  >
                    The Coach
                  </Link>
                  <Link
                    href="/enterprise"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    onClick={() => setIsProductOpen(false)}
                  >
                    The Inspector
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/roi-calculator"
              className={`transition-colors ${
                isActive('/roi-calculator') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              ROI Calculator
            </Link>

            <Link
              href="/pricing"
              className={`transition-colors ${
                isActive('/pricing') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Pricing
            </Link>

            <Link
              href="/about"
              className={`transition-colors ${
                isActive('/about') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              About
            </Link>

            <Link
              href="/contact"
              className={`transition-colors ${
                isActive('/contact') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href={LOGIN_URL}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Log In
            </a>
            <a
              href={TRIAL_SIGNUP_URL}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Start Free Trial
            </a>
            <Link
              href="/demo"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Demo
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-4">
              <Link
                href="/guide"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                The Guide
              </Link>
              <Link
                href="/coaching"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                The Coach
              </Link>
              <Link
                href="/enterprise"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                The Inspector
              </Link>
              <Link
                href="/roi-calculator"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                ROI Calculator
              </Link>
              <Link
                href="/pricing"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                <a
                  href={LOGIN_URL}
                  className="px-4 py-2 text-center text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </a>
                <a
                  href={TRIAL_SIGNUP_URL}
                  className="px-4 py-2 text-center text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Start Free Trial
                </a>
                <Link
                  href="/demo"
                  className="px-4 py-2 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get Demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

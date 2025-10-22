'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calculator, TrendingUp, CheckCircle } from 'lucide-react';

export default function ROICalculatorPage() {
  const [inputs, setInputs] = useState({
    stores: 50,
    visitsPerStorePerYear: 4,
    costPerVisit: 750,
    travelReduction: 60,
    costPerStorePerMonth: 65
  });

  const calculateROI = () => {
    const annualTravelCost = inputs.stores * inputs.visitsPerStorePerYear * inputs.costPerVisit;
    const travelSavings = annualTravelCost * (inputs.travelReduction / 100);
    const annualSoftwareCost = inputs.stores * inputs.costPerStorePerMonth * 12;
    const netAnnualROI = travelSavings - annualSoftwareCost;

    return {
      annualTravelCost,
      travelSavings,
      annualSoftwareCost,
      netAnnualROI
    };
  };

  const results = calculateROI();

  const handleInputChange = (field: string, value: number) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Calculator className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              ROI Calculator
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Calculate your potential travel savings with PeakOps
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Reduce Travel Costs</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Faster Inspections</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Real-time Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid lg:grid-cols-2 gap-12">
                {/* Input Form */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Your Current Operations
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Stores
                      </label>
                      <input
                        type="number"
                        value={inputs.stores}
                        onChange={(e) => handleInputChange('stores', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Visits Per Store Per Year
                      </label>
                      <input
                        type="number"
                        value={inputs.visitsPerStorePerYear}
                        onChange={(e) => handleInputChange('visitsPerStorePerYear', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost Per Visit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={inputs.costPerVisit}
                          onChange={(e) => handleInputChange('costPerVisit', parseInt(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expected Travel Reduction
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={inputs.travelReduction}
                          onChange={(e) => handleInputChange('travelReduction', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PeakOps Cost Per Store/Month
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={inputs.costPerStorePerMonth}
                          onChange={(e) => handleInputChange('costPerStorePerMonth', parseInt(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Your ROI Analysis
                  </h2>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Annual Travel Cost</span>
                        <span className="text-xl font-semibold text-gray-900">
                          ${results.annualTravelCost.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Travel Savings ({inputs.travelReduction}%)</span>
                        <span className="text-xl font-semibold text-green-600">
                          ${results.travelSavings.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Annual Software Cost</span>
                        <span className="text-xl font-semibold text-blue-600">
                          ${results.annualSoftwareCost.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${results.netAnnualROI > 0 ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-semibold">Net Annual ROI</span>
                        <span className={`text-2xl font-bold ${results.netAnnualROI > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {results.netAnnualROI > 0 ? '+' : ''}${results.netAnnualROI.toLocaleString()}
                        </span>
                      </div>
                      <p className={`text-sm mt-2 ${results.netAnnualROI > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {results.netAnnualROI > 0
                          ? 'Positive ROI! See how this works for your brand.'
                          : 'Adjust parameters to find your optimal ROI.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Link
                      href="/demo"
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-center block"
                    >
                      Request Demo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Saving?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Get a personalized demo to see exactly how PeakOps can transform your inspection process and deliver the ROI you calculated above.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
            >
              Get Enterprise Demo
            </Link>
            <Link
              href="/coaching-mode"
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Try Coaching Mode Free
            </Link>
          </div>
          <p className="text-blue-100 mt-6 text-sm">
            No credit card required for free trial • Setup in under 5 minutes
          </p>
        </div>
      </section>
    </div>
  );
}

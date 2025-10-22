'use client';

import React, { useState, useEffect } from 'react';
import * as Slider from '@radix-ui/react-slider';

interface ROICalculatorProps {
  isPreview?: boolean;
}

const ROICalculator: React.FC<ROICalculatorProps> = ({ isPreview = false }) => {
  const [storeCount, setStoreCount] = useState(50);
  const [visitsPerYear, setVisitsPerYear] = useState(4);
  const [costPerVisit, setCostPerVisit] = useState(750);
  const [travelReduction, setTravelReduction] = useState(60);
  const [pricePerStore, setPricePerStore] = useState(65);

  const [results, setResults] = useState({
    annualTravelCost: 0,
    travelSavings: 0,
    softwareCost: 0,
    netROI: 0,
  });

  useEffect(() => {
    const annualTravelCost = storeCount * visitsPerYear * costPerVisit;
    const travelSavings = (annualTravelCost * travelReduction) / 100;
    const softwareCost = storeCount * pricePerStore * 12;
    const netROI = travelSavings - softwareCost;

    setResults({
      annualTravelCost,
      travelSavings,
      softwareCost,
      netROI,
    });
  }, [storeCount, visitsPerYear, costPerVisit, travelReduction, pricePerStore]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isPreview) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-6 rounded-xl border border-blue-200">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Quick ROI Preview
          </h3>
          <div className="flex items-center justify-center space-x-2">
            <input
              type="number"
              value={storeCount}
              onChange={(e) => setStoreCount(Number(e.target.value))}
              className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
              min="1"
              max="1000"
            />
            <span className="text-gray-600">stores</span>
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(results.netROI)}
          </div>
          <div className="text-sm text-gray-600">Annual net savings</div>
          <a
            href="/roi"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Full Calculator →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Your Current Operations
          </h3>

          {/* Store Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Stores
            </label>
            <input
              type="number"
              value={storeCount}
              onChange={(e) => setStoreCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="10000"
            />
          </div>

          {/* Visits Per Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visits Per Store Per Year
            </label>
            <input
              type="number"
              value={visitsPerYear}
              onChange={(e) => setVisitsPerYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="52"
            />
          </div>

          {/* Cost Per Visit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Per Visit: {formatCurrency(costPerVisit)}
            </label>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[costPerVisit]}
              onValueChange={(value) => setCostPerVisit(value[0])}
              max={1500}
              min={200}
              step={50}
            >
              <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-blue-600 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Slider.Root>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$200</span>
              <span>$1,500</span>
            </div>
          </div>

          {/* Travel Reduction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Travel Reduction: {travelReduction}%
            </label>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[travelReduction]}
              onValueChange={(value) => setTravelReduction(value[0])}
              max={80}
              min={30}
              step={5}
            >
              <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-teal-600 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-teal-600 rounded-full hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </Slider.Root>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30%</span>
              <span>80%</span>
            </div>
          </div>

          {/* Price Per Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PeakOps Cost Per Store/Month
            </label>
            <input
              type="number"
              value={pricePerStore}
              onChange={(e) => setPricePerStore(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Your ROI Analysis
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Annual Travel Cost</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(results.annualTravelCost)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Travel Savings ({travelReduction}%)</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(results.travelSavings)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Annual Software Cost</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(results.softwareCost)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 bg-white rounded-lg px-4 border-2 border-blue-200">
              <span className="font-semibold text-gray-900">Net Annual ROI</span>
              <span className={`text-2xl font-bold ${results.netROI > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(results.netROI)}
              </span>
            </div>

            {results.netROI > 0 && (
              <div className="mt-6 text-center">
                <p className="text-green-600 font-medium mb-4">
                  Positive ROI! See how this works for your brand.
                </p>
                <a
                  href="/enterprise"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Request Demo
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROICalculator;
'use client';

import Link from 'next/link';
import { Calculator, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function ROICalculatorWidget() {
  const [stores, setStores] = useState(50);
  const [inspectionCost, setInspectionCost] = useState(750);
  const [frequency, setFrequency] = useState(4);

  const annualSavings = stores * inspectionCost * frequency * 0.65; // 65% savings
  const formattedSavings = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(annualSavings);

  return (
    <div className="bg-blue-50 rounded-xl p-8 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <Calculator className="h-10 w-10 text-blue-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">See How Much You Could Save</h3>
        <p className="text-gray-600">Quick calculation of potential travel cost savings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Stores
          </label>
          <input
            type="number"
            value={stores}
            onChange={(e) => setStores(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cost per Inspection Visit
          </label>
          <input
            type="number"
            value={inspectionCost}
            onChange={(e) => setInspectionCost(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inspections per Store/Year
          </label>
          <input
            type="number"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="text-center bg-white rounded-lg p-6 mb-6">
        <div className="text-4xl font-bold text-green-600 mb-2">{formattedSavings}</div>
        <div className="text-lg text-gray-600">Potential Annual Savings</div>
        <div className="text-sm text-gray-500 mt-2">Based on 65% travel cost reduction</div>
      </div>

      <div className="text-center">
        <Link
          href="/roi-calculator"
          className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          See Full Calculator
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
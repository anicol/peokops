import { X } from 'lucide-react';
import { FeatureConfig } from '@/config/featureRegistry';

interface ModalShellProps {
  type: 'demo' | 'upgrade';
  feature: FeatureConfig;
  onClose: () => void;
}

export default function ModalShell({ type, feature, onClose }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {type === 'demo' ? `${feature.name} Demo` : 'Upgrade Your Plan'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {type === 'demo' ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Watch this quick demo to see {feature.name} in action.
              </p>

              {/* Demo video or interactive content */}
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
                {feature.previewUrl.endsWith('.mp4') ? (
                  <video
                    src={feature.previewUrl}
                    controls
                    className="w-full h-full rounded-lg"
                  />
                ) : (
                  <div className="text-center p-8">
                    <p className="text-gray-500 mb-4">Interactive demo coming soon</p>
                    <img
                      src={feature.previewUrl}
                      alt={`${feature.name} preview`}
                      className="rounded-lg shadow-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // TODO: Navigate to actual feature or start interactive demo
                    onClose();
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                >
                  Try It Now
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-600">
                Unlock {feature.name} and more premium features with an upgrade.
              </p>

              {/* Pricing tiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 transition">
                  <h3 className="font-bold text-lg text-gray-900">Professional</h3>
                  <p className="text-3xl font-bold mt-2">
                    $99
                    <span className="text-sm text-gray-500 font-normal">/month</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> AI Coach
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> Insights Dashboard
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> Multi-store support
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> Advanced reporting
                    </li>
                  </ul>
                  <button className="w-full mt-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition">
                    Select Plan
                  </button>
                </div>

                <div className="border-2 border-indigo-600 rounded-lg p-6 bg-indigo-50 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">Enterprise</h3>
                  <p className="text-3xl font-bold mt-2">
                    $299
                    <span className="text-sm text-gray-500 font-normal">/month</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> Everything in Pro
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> Inspections workflow
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> Brand standards
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span> Dedicated support
                    </li>
                  </ul>
                  <button className="w-full mt-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition">
                    Select Plan
                  </button>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={onClose}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Maybe later
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

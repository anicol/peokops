import React from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const MicroCheckTemplatesPage = () => {
  const { user } = useAuth();

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Settings className="w-8 h-8 text-teal-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quick Check Templates</h1>
            <p className="text-gray-600">Manage your micro-check template library</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Template Management UI - Coming Soon</h3>
              <p className="text-sm text-blue-800 mb-3">
                The full template management interface is under development. For now, your brand has been
                automatically configured with 15 industry-standard Quick Check templates.
              </p>
              <p className="text-sm text-blue-800 mb-3">
                <strong>Default Templates Include:</strong>
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Food Safety: Hand Sink Stocked, Food Temperature Check, Food Storage Proper, Sanitizer Buckets Fresh</li>
                <li>• Cleanliness: Floors Clean and Dry, Prep Surfaces Sanitized, Trash Containers Managed</li>
                <li>• Safety: Fire Extinguisher Accessible, Exit Paths Clear, Wet Floor Signs Used</li>
                <li>• PPE: Staff Wearing Gloves, Hair Restraints Worn</li>
                <li>• Equipment: Refrigeration Temperatures, Equipment Clean and Functional, Dishwasher Operating Correctly</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Start Checking!</h3>
          <p className="text-gray-600 mb-6">
            Your templates are configured and ready to use. Managers can start running Quick Checks immediately.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/micro-check-history"
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Go to Quick Checks
            </a>
            <a
              href="https://docs.claude.com/en/docs/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              View Documentation
            </a>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Admin Note</h4>
            <p className="text-sm text-gray-700 mb-2">
              Templates can currently be managed via the Django Admin panel at <code className="bg-gray-200 px-2 py-1 rounded">/admin/micro_checks/microchecktemplate/</code>
            </p>
            <p className="text-sm text-gray-700">
              The full UI for template management (create, edit, clone, archive, publish versions) will be available in a future update.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MicroCheckTemplatesPage;

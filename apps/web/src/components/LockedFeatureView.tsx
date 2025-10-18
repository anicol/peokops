import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { featureRegistry, FeatureKey } from '@/config/featureRegistry';
import { trackEvent } from '@/utils/telemetry';
import { useAuth } from '@/hooks/useAuth';
import ModalShell from './ModalShell';
import { Lock, CheckCircle, Video, Sparkles, AlertCircle, TrendingUp, MapPin, Users, Shield } from 'lucide-react';

export default function LockedFeatureView() {
  const { featureKey } = useParams<{ featureKey: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState<'demo' | 'upgrade' | null>(null);

  const feature = featureKey ? featureRegistry[featureKey as FeatureKey] : null;

  useEffect(() => {
    if (featureKey && user) {
      trackEvent('locked_click', { feature: featureKey, role: user.role });
    }
  }, [featureKey, user]);

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Lock className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Not Found</h2>
        <p className="text-gray-500 mb-6">The feature you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Go Home
        </button>
      </div>
    );
  }

  const Icon = feature.icon;

  const handleCTA = (ctaType: 'demo' | 'upgrade') => {
    trackEvent('locked_cta', { feature: featureKey!, cta: ctaType });
    setShowModal(ctaType);
  };

  return (
    <>
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-2xl">
            <Icon className="h-12 w-12 text-gray-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Unlock {feature.name}
            </h1>
            <p className="text-lg text-gray-500">{feature.unlock.hint}</p>
          </div>
        </div>

        {/* Description */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xl text-gray-700 leading-relaxed">{feature.description}</p>
        </div>

        {/* Sample Report - AI Coach and Inspections */}
        {featureKey === 'ai-coach' ? (
          <div className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Sample Coaching Report</h3>
                  <p className="text-teal-100">Your private AI feedback in action</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">88%</div>
                  <div className="text-teal-100">Overall Score</div>
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">92%</div>
                  <div className="text-gray-600">Uniforms</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">78%</div>
                  <div className="text-gray-600">Cleanliness</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">95%</div>
                  <div className="text-gray-600">Safety</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="p-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Priority Action Items</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Clean drink station area</div>
                    <div className="text-sm text-gray-600">Timestamp: 1:23 - Visible spills detected</div>
                    <div className="text-sm text-yellow-700 mt-1">Medium Priority</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Straighten name tags</div>
                    <div className="text-sm text-gray-600">Timestamp: 0:45 - Two team members</div>
                    <div className="text-sm text-blue-700 mt-1">Low Priority</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    ✓
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Excellent safety compliance</div>
                    <div className="text-sm text-gray-600">All equipment visible and accessible</div>
                    <div className="text-sm text-green-700 mt-1">Keep up the great work!</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Video deleted after analysis</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Report stays local only</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Action list ready for next shift</span>
                </div>
              </div>
            </div>
          </div>
        ) : featureKey === 'inspections' ? (
          <div className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Enterprise Inspection Dashboard</h3>
                  <p className="text-blue-100">Multi-location visibility and verification</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">24</div>
                  <div className="text-blue-100">Stores Monitored</div>
                </div>
              </div>
            </div>

            {/* Regional Summary */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Regional Performance</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                    <div className="text-2xl font-bold text-blue-600">Northeast</div>
                  </div>
                  <div className="text-gray-600 mb-2">8 stores</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '91%' }}></div>
                  </div>
                  <div className="text-sm text-green-600 mt-1">91% avg</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MapPin className="w-5 h-5 text-purple-600 mr-2" />
                    <div className="text-2xl font-bold text-purple-600">Midwest</div>
                  </div>
                  <div className="text-gray-600 mb-2">10 stores</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                  </div>
                  <div className="text-sm text-yellow-600 mt-1">84% avg</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MapPin className="w-5 h-5 text-indigo-600 mr-2" />
                    <div className="text-2xl font-bold text-indigo-600">South</div>
                  </div>
                  <div className="text-gray-600 mb-2">6 stores</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '93%' }}></div>
                  </div>
                  <div className="text-sm text-green-600 mt-1">93% avg</div>
                </div>
              </div>
            </div>

            {/* Recent Inspections */}
            <div className="p-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Recent Verified Inspections</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Store #142 - Chicago Downtown</div>
                      <div className="text-sm text-gray-600">Verified by Sarah M. • 2 hours ago</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">94%</div>
                    <div className="text-xs text-gray-500">Approved</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Store #087 - Boston North</div>
                      <div className="text-sm text-gray-600">Pending review • 5 hours ago</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-600">82%</div>
                    <div className="text-xs text-gray-500">In Review</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Store #203 - Atlanta Midtown</div>
                      <div className="text-sm text-gray-600">Assigned to Mike R. • Yesterday</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-blue-600">Assigned</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise Features */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Inspector verification workflow</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Cross-location analytics</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Multi-inspector teams</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Custom standards & checklists</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 shadow-lg">
            {feature.previewUrl?.endsWith('.mp4') ? (
              <video
                src={feature.previewUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="text-center p-8">
                  <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Preview coming soon</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Core Capabilities - AI Coach only */}
        {featureKey === 'ai-coach' && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Core Capabilities</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                    <Video className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Smart Video Analysis</h3>
                  <p className="text-gray-600 text-sm">Upload a 2-minute video walkthrough and get instant AI-powered feedback on cleanliness, safety, and operations.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Instant Compliance Checks</h3>
                  <p className="text-gray-600 text-sm">Automatic detection of PPE compliance, food safety violations, and cleanliness issues with timestamped findings.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
                  <p className="text-gray-600 text-sm">Get personalized coaching recommendations and track improvement trends over time with intelligent analytics.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Action Item Creation</h3>
                  <p className="text-gray-600 text-sm">Automatically generate prioritized action items with photos, descriptions, and deadlines from video findings.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          {feature.ctas.demo && (
            <button
              onClick={() => handleCTA('demo')}
              className="flex-1 px-8 py-4 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
            >
              Try Demo
            </button>
          )}
          <button
            onClick={() => handleCTA('upgrade')}
            className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition"
          >
            {feature.unlock.type === 'upgrade' ? 'Upgrade to Unlock' : 'Get Started'}
          </button>
        </div>

        {/* Testimonial */}
        {feature.testimonial && (
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-gray-600 italic max-w-2xl mx-auto">
              "{feature.testimonial}"
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="text-center pt-4">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalShell
          type={showModal}
          feature={feature}
          onClose={() => setShowModal(null)}
        />
      )}
    </>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { featureRegistry, FeatureKey } from '@/config/featureRegistry';
import { trackEvent } from '@/utils/telemetry';
import { useAuth } from '@/hooks/useAuth';
import ModalShell from './ModalShell';
import { Lock } from 'lucide-react';

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

        {/* Preview */}
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

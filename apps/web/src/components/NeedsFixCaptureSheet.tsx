import React, { useState } from 'react';
import { AlertTriangle, Camera, X } from 'lucide-react';
import MicroCheckCamera from './microCheck/MicroCheckCamera';

interface NeedsFixCaptureSheetProps {
  checkTitle: string;
  onSubmit: (note: string, photo: File | null, action: 'continue' | 'fixNow') => void;
  onCancel: () => void;
}

const NeedsFixCaptureSheet: React.FC<NeedsFixCaptureSheetProps> = ({
  checkTitle,
  onSubmit,
  onCancel,
}) => {
  const [note, setNote] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoCapture = (photoDataUrl: string) => {
    // Convert base64 data URL to File object
    fetch(photoDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'before-photo.jpg', { type: 'image/jpeg' });
        setPhoto(file);
        setPhotoPreview(photoDataUrl); // Use data URL directly for preview
        setShowCamera(false);
      });
  };

  const handleRemovePhoto = () => {
    // No need to revoke URL since we're using data URL, not object URL
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleSubmit = (action: 'continue' | 'fixNow') => {
    if (submitting) return; // Prevent double submission
    setSubmitting(true);
    onSubmit(note, photo, action);
  };

  if (showCamera) {
    return (
      <MicroCheckCamera
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
        instructionText="Take a quick photo showing the issue."
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-fadeIn"
        onClick={onCancel}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
        <div className="bg-white rounded-t-3xl shadow-2xl max-w-md mx-auto">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Content */}
          <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
            {/* Inline Banner */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
              <div className="flex items-center mb-1">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-sm font-medium text-gray-900">
                  Logged to Fix List
                </p>
              </div>
              <p className="text-sm text-gray-500 ml-7">
                {checkTitle}
              </p>
            </div>

            {/* Optional Details - Grouped */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-3">Optional details</p>

              {/* Note Input */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🗒️</span>
                  <label className="text-sm font-medium text-gray-700">Note</label>
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., missing signs"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              {/* Photo Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">📸</span>
                  <label className="text-sm font-medium text-gray-700">Photo</label>
                </div>

                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Captured"
                      className="w-full h-48 object-contain rounded-lg border-2 border-blue-200 bg-gray-50"
                    />
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white"
                    >
                      <X className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCamera(true)}
                    className="w-full h-24 bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-1.5"
                  >
                    <Camera className="w-8 h-8 text-gray-400" />
                    <span className="text-gray-600 text-sm font-medium">Take Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Help Text */}
            <p className="text-center text-sm text-gray-500 mb-4">
              You can fix it later or now — up to you.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Primary CTA */}
              <button
                onClick={() => handleSubmit('continue')}
                className="flex-1 flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-md"
              >
                Continue Checks
              </button>

              {/* Secondary CTA */}
              <button
                onClick={() => handleSubmit('fixNow')}
                className="px-6 py-4 text-gray-600 hover:text-gray-900 font-medium border-2 border-gray-300 rounded-xl hover:border-gray-400 transition-colors"
              >
                Fix Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 150ms ease-out;
        }

        .animate-slideUp {
          animation: slideUp 200ms cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  );
};

export default NeedsFixCaptureSheet;

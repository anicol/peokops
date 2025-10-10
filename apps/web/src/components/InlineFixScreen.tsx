import React, { useState } from 'react';
import { Camera, CheckCircle, ArrowLeft, Loader2, X } from 'lucide-react';
import MicroCheckCamera from './microCheck/MicroCheckCamera';

interface InlineFixScreenProps {
  beforePhotoUrl: string | null;
  checkTitle: string;
  savedPosition: {
    currentCheck: number;
    totalChecks: number;
  };
  onComplete: (afterPhotoFile: File, notes: string) => Promise<void>;
  onCancel: () => void;
}

const InlineFixScreen: React.FC<InlineFixScreenProps> = ({
  beforePhotoUrl,
  checkTitle,
  savedPosition,
  onComplete,
  onCancel,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCapturePhoto = (photoDataUrl: string) => {
    // Convert base64 data URL to File object
    fetch(photoDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'after-photo.jpg', { type: 'image/jpeg' });
        setAfterPhoto(file);
        setAfterPhotoPreview(photoDataUrl);
        setShowCamera(false);
      });
  };

  const handleRetakePhoto = () => {
    if (afterPhotoPreview) {
      URL.revokeObjectURL(afterPhotoPreview);
    }
    setAfterPhoto(null);
    setAfterPhotoPreview(null);
    setShowCamera(true);
  };

  const handleSubmit = async () => {
    if (!afterPhoto) return;

    setSubmitting(true);
    try {
      await onComplete(afterPhoto, notes);
    } catch (error) {
      console.error('Failed to submit fix:', error);
      setSubmitting(false);
    }
  };

  if (showCamera) {
    return (
      <MicroCheckCamera
        onCapture={handleCapturePhoto}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

  const remainingChecks = savedPosition.totalChecks - savedPosition.currentCheck;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3FAF7' }}>
      <div className="max-w-md mx-auto w-full">
        {/* Compact Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center">
          <h1 className="text-base font-semibold text-gray-900">Fix It Now</h1>
        </div>

        {/* Main Content Card */}
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Check Title */}
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              {checkTitle}
            </h2>
            <p className="text-sm text-gray-600">
              Show what's fixed and finish strong.
            </p>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Before Photo */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Before</h3>
            {beforePhotoUrl ? (
              <img
                src={beforePhotoUrl}
                alt="Before"
                className="w-full h-48 object-contain rounded-lg border-2 border-gray-200 bg-gray-50"
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                <p className="text-gray-500">No before photo available</p>
              </div>
            )}
          </div>

          {/* After Photo */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">After (Fixed)</h3>
            {afterPhotoPreview ? (
              <div className="relative">
                <img
                  src={afterPhotoPreview}
                  alt="After"
                  className="w-full h-48 object-contain rounded-lg border-2 border-green-200 bg-gray-50"
                />
                <button
                  onClick={handleRetakePhoto}
                  disabled={submitting}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCamera(true)}
                disabled={submitting}
                className="w-full h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors flex flex-col items-center justify-center disabled:opacity-50"
              >
                <Camera className="w-12 h-12 text-blue-600 mb-2" />
                <span className="text-blue-700 font-medium">Take After Photo</span>
              </button>
            )}
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Notes */}
          <div className="mb-3">
            <textarea
              id="fix-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Add quick note…"
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-100"
            />
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!afterPhoto || submitting}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Mark Fixed
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineFixScreen;

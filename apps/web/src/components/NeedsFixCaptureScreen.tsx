import React, { useState, useEffect } from 'react';
import { AlertTriangle, Camera, Edit3, X, CheckCircle } from 'lucide-react';
import MicroCheckCamera from './microCheck/MicroCheckCamera';

interface NeedsFixCaptureScreenProps {
  checkTitle: string;
  onSubmit: (note: string, photo: File | null, action: 'continue' | 'fixNow') => void;
  onCancel: () => void;
}

const PRESET_TAGS = [
  'Missing supplies',
  'Equipment issue',
  'Dirty/Needs cleaning',
  'Damaged',
  'Out of stock',
  'Safety concern',
];

const AUTO_SUBMIT_SECONDS = 8;

const NeedsFixCaptureScreen: React.FC<NeedsFixCaptureScreenProps> = ({
  checkTitle,
  onSubmit,
  onCancel,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'tags'>('text');
  const [noteText, setNoteText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(AUTO_SUBMIT_SECONDS);
  const [timerActive, setTimerActive] = useState(true);

  // Auto-submit countdown
  useEffect(() => {
    if (!timerActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Don't call handleSubmit directly during render
          // Instead, queue it for next tick
          setTimerActive(false);
          setTimeout(() => {
            handleSubmit('continue');
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handlePhotoCapture = (file: File) => {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setShowCamera(false);
    // Pause timer when user takes action
    setTimerActive(false);
  };

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleSubmit = (action: 'continue' | 'fixNow') => {
    setTimerActive(false);
    const note = inputMode === 'text' ? noteText : selectedTags.join(', ');
    onSubmit(note, photo, action);
  };

  const handleUserAction = (action: 'continue' | 'fixNow') => {
    // Any user action stops the timer
    setTimerActive(false);
    handleSubmit(action);
  };

  if (showCamera) {
    return (
      <MicroCheckCamera
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full p-4 py-6 flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onCancel}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </button>

          <div className="flex items-start mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600 mr-3 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                You marked this as "Needs Fix"
              </h1>
              <p className="text-gray-600 text-sm">{checkTitle}</p>
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Note Input Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tell us what's wrong (optional)
            </h2>

            {/* Toggle between text and tags */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                Free Text
              </button>
              <button
                onClick={() => setInputMode('tags')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  inputMode === 'tags'
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                Quick Tags
              </button>
            </div>

            {/* Text Input */}
            {inputMode === 'text' && (
              <div className="mb-4">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => {
                    setNoteText(e.target.value);
                    setTimerActive(false); // Pause timer when user types
                  }}
                  placeholder="e.g., soap empty, needs wipe-down..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Tag Selection */}
            {inputMode === 'tags' && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        handleTagToggle(tag);
                        setTimerActive(false); // Pause timer when user selects
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Section */}
            <div>
              <button
                onClick={() => {
                  setShowCamera(true);
                  setTimerActive(false); // Pause timer when opening camera
                }}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium mb-3"
              >
                <Camera className="w-5 h-5 mr-2" />
                Add Photo 📸
              </button>

              {/* Photo Preview */}
              {photoPreview && (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Captured"
                    className="w-full h-32 object-cover rounded-lg border-2 border-blue-200"
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowCamera(true)}
                    className="absolute bottom-2 right-2 px-3 py-1 bg-white text-blue-600 rounded-lg text-sm font-medium shadow-md hover:bg-gray-50"
                  >
                    Retake
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-gray-500 text-sm mb-6">
            You can fix this later — it's already saved to your Fix List.
          </p>
        </div>

        {/* Fixed Bottom Panel */}
        <div className="bg-white border-t-2 border-gray-200 shadow-lg rounded-t-2xl p-4 -mx-4 -mb-6">
          <div className="flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Issue saved to Fix List
            </span>
          </div>

          <div className="flex gap-3 mb-3">
            <button
              onClick={() => handleUserAction('continue')}
              className="flex-1 flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-md"
            >
              <CheckCircle className="w-6 h-6 mr-2" />
              Continue Checks
            </button>

            <button
              onClick={() => handleUserAction('fixNow')}
              className="flex-1 flex items-center justify-center px-6 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Fix Now
            </button>
          </div>

          {/* Countdown Timer */}
          {timerActive && countdown > 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Auto-continuing in {countdown}s...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div
                  className="bg-green-600 h-1 rounded-full transition-all duration-1000"
                  style={{ width: `${(countdown / AUTO_SUBMIT_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NeedsFixCaptureScreen;

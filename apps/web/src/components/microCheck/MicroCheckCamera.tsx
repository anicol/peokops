import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X } from 'lucide-react';

interface MicroCheckCameraProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel: () => void;
  instructionText?: string;
}

const MicroCheckCamera: React.FC<MicroCheckCameraProps> = ({ onCapture, onCancel, instructionText = "Make sure the full area is visible." }) => {
  console.log('🎥 MicroCheckCamera: Component rendered');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const stopCamera = useCallback(() => {
    console.log('🎥 MicroCheckCamera: stopCamera called');
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    console.log('🎥 MicroCheckCamera: useEffect called, calling startCamera');

    const initCamera = async () => {
      await startCamera();
    };

    initCamera();

    return () => {
      console.log('🎥 MicroCheckCamera: useEffect cleanup, calling stopCamera');
      stopCamera();
    };
    // Empty dependency array - only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    console.log('🎥 MicroCheckCamera: startCamera called');
    try {
      setIsLoading(true);
      setError(null);
      console.log('🎥 MicroCheckCamera: Set loading state');

      // Detect orientation and set camera dimensions accordingly
      const isLandscape = window.innerWidth > window.innerHeight;
      const videoWidth = isLandscape ? 1920 : 1080;
      const videoHeight = isLandscape ? 1080 : 1920;

      console.log('🎥 MicroCheckCamera: Orientation:', isLandscape ? 'landscape' : 'portrait');
      console.log('🎥 MicroCheckCamera: Requesting dimensions:', videoWidth, 'x', videoHeight);

      // Try with rear camera first (for mobile), fall back to any camera if that fails
      let mediaStream;
      try {
        console.log('🎥 MicroCheckCamera: Requesting camera with facingMode environment');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // Prefer rear camera but don't require it
            width: { ideal: videoWidth },
            height: { ideal: videoHeight },
          },
          audio: false,
        });
        console.log('🎥 MicroCheckCamera: Successfully got camera with facingMode');
      } catch (err) {
        // If facingMode fails (e.g., desktop), try without it
        console.log('🎥 MicroCheckCamera: Rear camera not available, trying default camera', err);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: videoWidth },
            height: { ideal: videoHeight },
          },
          audio: false,
        });
        console.log('🎥 MicroCheckCamera: Successfully got default camera');
      }

      console.log('🎥 MicroCheckCamera: Got media stream, setting state');
      setStream(mediaStream);

      if (videoRef.current) {
        console.log('🎥 MicroCheckCamera: Setting video srcObject');
        videoRef.current.srcObject = mediaStream;
        console.log('🎥 MicroCheckCamera: Video srcObject set');
      } else {
        console.warn('🎥 MicroCheckCamera: videoRef.current is null!');
      }

      console.log('🎥 MicroCheckCamera: Setting loading to false');
      setIsLoading(false);
      console.log('🎥 MicroCheckCamera: Camera started successfully');
    } catch (err: any) {
      console.error('🎥 MicroCheckCamera: Camera error:', err);
      console.error('🎥 MicroCheckCamera: Error name:', err.name);
      console.error('🎥 MicroCheckCamera: Error message:', err.message);
      setIsLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access to take photos.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Unable to access camera: ${err.message}`);
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    console.log('🎥 Capturing photo');
    console.log('🎥 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('🎥 Video display size:', video.clientWidth, 'x', video.clientHeight);

    // Set canvas dimensions to match the actual video stream dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log('🎥 Canvas dimensions:', canvas.width, 'x', canvas.height);

    // Draw the entire video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    console.log('🎥 Photo captured, data URL length:', photoDataUrl.length);
    setCapturedPhoto(photoDataUrl);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      stopCamera();
    }
  };

  const handleCancelClick = () => {
    stopCamera();
    onCancel();
  };

  const modalContent = error ? (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Error</h3>
        <p className="text-sm text-gray-600 mb-6">{error}</p>
        <div className="flex space-x-3">
          <button
            onClick={startCamera}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <button
            onClick={handleCancelClick}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full h-full max-w-4xl max-h-[90vh] flex flex-col relative">
      {/* Camera preview or captured photo */}
      <div className="relative bg-gray-900 flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {capturedPhoto ? (
          <img
            src={capturedPhoto}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            {/* Close button */}
            <button
              onClick={handleCancelClick}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-900 bg-opacity-75 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-opacity z-20"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Capture button overlay - positioned over the camera */}
        {!capturedPhoto && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 portrait:bottom-6 landscape:bottom-auto landscape:right-6 landscape:top-1/2 landscape:-translate-y-1/2 landscape:left-auto landscape:translate-x-0">
            <button
              onClick={capturePhoto}
              disabled={isLoading}
              className="w-16 h-16 rounded-full border-4 border-white bg-white shadow-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <div className="absolute inset-2 rounded-full bg-white border-2 border-gray-300"></div>
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls - only shown after capture */}
      {capturedPhoto && (
        <div className="p-4 bg-gray-50 flex-shrink-0">
          <div className="flex space-x-3">
            <button
              onClick={handleRetake}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        {/* Modal Content */}
        {modalContent}
      </div>
    </>
  );
};

export default MicroCheckCamera;

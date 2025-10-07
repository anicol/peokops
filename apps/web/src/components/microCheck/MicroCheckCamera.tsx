import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X } from 'lucide-react';

interface MicroCheckCameraProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel: () => void;
}

const MicroCheckCamera: React.FC<MicroCheckCameraProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access to take photos.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Unable to access camera. Please try again.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
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

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
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
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Camera preview or captured photo */}
      <div className="relative bg-gray-900" style={{ aspectRatio: '4/3' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
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
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Close button */}
            <button
              onClick={handleCancelClick}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-900 bg-opacity-75 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-opacity"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="p-4 bg-gray-50">
        {capturedPhoto ? (
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
        ) : (
          <button
            onClick={capturePhoto}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Camera className="w-5 h-5 mr-2" />
            📸 Capture Photo
          </button>
        )}
      </div>
    </div>
  );
};

export default MicroCheckCamera;

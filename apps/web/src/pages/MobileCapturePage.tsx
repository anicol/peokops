import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileCapture } from './MobileCaptureContext';
import { useQuery } from 'react-query';
import { storesAPI, uploadsAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useMobileDetection } from '@/hooks/useMobileDetection';

const SHOT_LIST = [
  {
    id: 'entrance',
    title: 'Store Entrance',
    description: 'Capture the main entrance and front of house area',
    tips: ['Show entrance doors clearly', 'Include any signage or displays', 'Check for cleanliness and safety'],
    duration: 30
  },
  {
    id: 'dining_area',
    title: 'Dining Area',
    description: 'Record the customer seating and dining space',
    tips: ['Pan across all seating areas', 'Show table cleanliness', 'Check floor conditions'],
    duration: 45
  },
  {
    id: 'counter',
    title: 'Service Counter',
    description: 'Capture the ordering counter and menu boards',
    tips: ['Show menu boards clearly', 'Check staff uniforms and PPE', 'Verify counter cleanliness'],
    duration: 30
  },
  {
    id: 'kitchen_prep',
    title: 'Kitchen & Prep Area',
    description: 'Record food preparation and kitchen areas',
    tips: ['Show staff following safety protocols', 'Check equipment cleanliness', 'Verify proper PPE usage'],
    duration: 60
  },
  {
    id: 'restrooms',
    title: 'Restrooms',
    description: 'Micro-check of restroom facilities',
    tips: ['Verify cleanliness standards', 'Check supply levels', 'Ensure proper signage'],
    duration: 20
  },
  {
    id: 'exits',
    title: 'Emergency Exits',
    description: 'Verify all emergency exits are clear',
    tips: ['Check exit signs are visible', 'Ensure pathways are unobstructed', 'Verify door functionality'],
    duration: 15
  }
];

export default function MobileCapturePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, hasCamera, isOptimalForCapture } = useMobileDetection();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [title, setTitle] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [useGuidedMode, setUseGuidedMode] = useState(true);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [completedShots, setCompletedShots] = useState<string[]>([]);
  const [shotRecordings, setShotRecordings] = useState<{[key: string]: Blob}>({});
  
  const {
    isRecording,
    isPaused,
    duration,
    settings,
    mediaStream,
    recordedBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    updateSettings
  } = useMobileCapture();

  // Get stores for selection
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesAPI.getStores
  });

  // Set up video preview
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // Auto-select user's store if available
  useEffect(() => {
    if (user?.store && stores) {
      const userStore = stores.find((s: any) => s.id === user.store);
      if (userStore) {
        setSelectedStore(userStore.id.toString());
      }
    }
  }, [user, stores]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return Math.min((duration / settings.maxDuration) * 100, 100);
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      setShowPreview(false);
    } catch (error) {
      alert('Failed to access camera. Please check permissions and try again.');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    
    if (useGuidedMode && recordedBlob) {
      const currentShot = SHOT_LIST[currentShotIndex];
      setShotRecordings(prev => ({
        ...prev,
        [currentShot.id]: recordedBlob
      }));
      setCompletedShots(prev => [...prev, currentShot.id]);
      
      if (currentShotIndex < SHOT_LIST.length - 1) {
        setCurrentShotIndex(prev => prev + 1);
        resetRecording();
      } else {
        setShowPreview(true);
      }
    } else {
      setShowPreview(true);
    }
  };

  const handleRetake = () => {
    if (useGuidedMode) {
      const currentShot = SHOT_LIST[currentShotIndex];
      setShotRecordings(prev => {
        const updated = { ...prev };
        delete updated[currentShot.id];
        return updated;
      });
      setCompletedShots(prev => prev.filter(id => id !== currentShot.id));
    }
    resetRecording();
    setShowPreview(false);
  };

  const handleUpload = async () => {
    if (!selectedStore || !title.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    let videoToUpload = recordedBlob;

    if (useGuidedMode && Object.keys(shotRecordings).length > 0) {
      const shotIds = Object.keys(shotRecordings);
      videoToUpload = shotRecordings[shotIds[shotIds.length - 1]];
    }

    if (!videoToUpload) {
      alert('No video recorded');
      return;
    }

    setIsUploading(true);

    try {
      // Create a File object from the Blob
      const file = new File([videoToUpload], `${title}.webm`, { type: 'video/webm' });
      const storeId = parseInt(selectedStore);
      const mode = settings.mode === 'inspection' ? 'enterprise' : 'coaching';

      // Use the new uploads API with S3 presigned URL
      await uploadsAPI.uploadVideo(file, storeId, mode);

      // Reset and navigate back
      resetRecording();
      setShotRecordings({});
      setCompletedShots([]);
      setCurrentShotIndex(0);
      navigate('/videos', { replace: true });

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Show compatibility warning for desktop/non-optimal devices
  if (!isOptimalForCapture) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">Mobile Capture Optimized</h2>
          
          <div className="text-gray-300 space-y-2 mb-6">
            <p>This interface is optimized for mobile devices with cameras.</p>
            
            {!isMobile && (
              <p className="text-yellow-400">• Use a mobile device for best experience</p>
            )}
            {!hasCamera && (
              <p className="text-red-400">• Camera access required</p>
            )}
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/videos/upload')}
              className="w-full py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Use File Upload Instead
            </button>
            <button
              onClick={() => navigate('/videos')}
              className="w-full py-2 bg-gray-600 rounded-lg hover:bg-gray-700"
            >
              Back to Videos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/videos')}
          className="p-2 hover:bg-gray-700 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h1 className="text-lg font-semibold">
          {useGuidedMode 
            ? `${settings.mode === 'inspection' ? 'Inspection' : 'Coaching'} Walkthrough`
            : `${settings.mode === 'inspection' ? 'Inspection' : 'Coaching'} Capture`
          }
        </h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setUseGuidedMode(!useGuidedMode)}
            className="px-3 py-1 bg-green-600 rounded-lg text-sm"
          >
            {useGuidedMode ? 'Free Mode' : 'Guided Mode'}
          </button>
          <button
            onClick={() => updateSettings({ 
              mode: settings.mode === 'inspection' ? 'coaching' : 'inspection' 
            })}
            className="px-3 py-1 bg-indigo-600 rounded-lg text-sm"
          >
            {settings.mode === 'inspection' ? 'Coaching' : 'Inspection'}
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-64 object-cover"
        />
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-white text-sm font-mono bg-black bg-opacity-50 px-2 py-1 rounded">
              REC {formatDuration(duration)}
            </span>
          </div>
        )}
        
        {/* Duration Progress Bar */}
        {isRecording && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600">
            <div 
              className="h-full bg-red-500 transition-all duration-1000"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        )}

        {/* Mode Indicator */}
        <div className="absolute top-4 right-4">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            settings.mode === 'inspection' 
              ? 'bg-red-500 text-white' 
              : 'bg-blue-500 text-white'
          }`}>
            {settings.mode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Guided Mode Instructions */}
      {useGuidedMode && !showPreview && (
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              {SHOT_LIST[currentShotIndex].title}
            </h3>
            <span className="text-sm text-gray-400">
              {currentShotIndex + 1} of {SHOT_LIST.length}
            </span>
          </div>
          
          <p className="text-gray-300 mb-3">
            {SHOT_LIST[currentShotIndex].description}
          </p>
          
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-green-400 mb-2">Tips:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              {SHOT_LIST[currentShotIndex].tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Recommended: {SHOT_LIST[currentShotIndex].duration}s
            </span>
            
            {/* Progress indicator */}
            <div className="flex space-x-1">
              {SHOT_LIST.map((shot, index) => (
                <div
                  key={shot.id}
                  className={`w-2 h-2 rounded-full ${
                    completedShots.includes(shot.id)
                      ? 'bg-green-500'
                      : index === currentShotIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 space-y-4">
        {!showPreview ? (
          <>
            {/* Recording Controls */}
            <div className="flex justify-center items-center space-x-8">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <div className="w-6 h-6 bg-white rounded-full" />
                </button>
              ) : (
                <>
                  {/* Pause/Resume */}
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700"
                  >
                    {isPaused ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                    )}
                  </button>
                  
                  {/* Stop */}
                  <button
                    onClick={handleStopRecording}
                    className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    <div className="w-6 h-6 bg-white rounded-sm" />
                  </button>
                </>
              )}
            </div>

            {/* Recording Info */}
            <div className="text-center text-gray-400 text-sm">
              {!isRecording && useGuidedMode && (
                <div>
                  <div>Recommended: {formatDuration(SHOT_LIST[currentShotIndex].duration)}</div>
                  <div className="text-xs mt-1">
                    Completed: {completedShots.length}/{SHOT_LIST.length} shots
                  </div>
                </div>
              )}
              {!isRecording && !useGuidedMode && `Max Duration: ${formatDuration(settings.maxDuration)}`}
              {isRecording && !isPaused && 'Recording...'}
              {isPaused && 'Recording Paused'}
            </div>
            
            {/* Guided Mode Navigation */}
            {useGuidedMode && !isRecording && (
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setCurrentShotIndex(Math.max(0, currentShotIndex - 1))}
                  disabled={currentShotIndex === 0}
                  className="px-4 py-2 bg-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous Shot
                </button>
                <button
                  onClick={() => setCurrentShotIndex(Math.min(SHOT_LIST.length - 1, currentShotIndex + 1))}
                  disabled={currentShotIndex === SHOT_LIST.length - 1}
                  className="px-4 py-2 bg-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip Shot
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Preview Controls */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                {useGuidedMode ? 'Walkthrough Complete' : 'Recording Complete'}
              </h3>
              
              {useGuidedMode && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Completed Shots:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {SHOT_LIST.map((shot) => (
                      <div
                        key={shot.id}
                        className={`p-2 rounded ${
                          completedShots.includes(shot.id)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {shot.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={handleRetake}
                  className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Retake
                </button>
                <button
                  onClick={() => {/* Play preview */}}
                  className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Upload Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="Enter video title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Store *</label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a store</option>
                  {stores?.map((store: any) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUpload}
                disabled={isUploading || !title.trim() || !selectedStore}
                className="w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Settings Panel */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">Capture Settings</h4>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Guided Mode</span>
            <button
              onClick={() => setUseGuidedMode(!useGuidedMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useGuidedMode ? 'bg-green-600' : 'bg-gray-600'
              }`}
              disabled={isRecording}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useGuidedMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-400 mb-1">Quality</label>
            <select
              value={settings.quality}
              onChange={(e) => updateSettings({ quality: e.target.value as any })}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm"
              disabled={isRecording}
            >
              <option value="low">Low (480p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-400 mb-1">Max Duration</label>
            <select
              value={settings.maxDuration}
              onChange={(e) => updateSettings({ maxDuration: parseInt(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm"
              disabled={isRecording}
            >
              <option value={60}>1 minute</option>
              <option value={180}>3 minutes</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
            </select>
          </div>
        </div>
        
        <div className="mt-3 flex items-center">
          <input
            type="checkbox"
            id="autoStop"
            checked={settings.autoStop}
            onChange={(e) => updateSettings({ autoStop: e.target.checked })}
            className="mr-2"
            disabled={isRecording}
          />
          <label htmlFor="autoStop" className="text-sm text-gray-400">
            Auto-stop at max duration
          </label>
        </div>
      </div>
    </div>
  );
}

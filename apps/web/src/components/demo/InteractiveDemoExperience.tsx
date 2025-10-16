import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Upload, Eye, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import SmartUploadModal from './SmartUploadModal';
import ContextualHelp, { DemoHelpTips } from './ContextualHelp';

interface DemoFinding {
  id: number;
  timestamp: number;
  category: 'PPE' | 'SAFETY' | 'CLEANLINESS' | 'UNIFORM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  confidence: number;
  location: string;
}

const DEMO_FINDINGS: DemoFinding[] = [
  {
    id: 1,
    timestamp: 15.2,
    category: 'PPE',
    severity: 'MEDIUM',
    title: 'Missing Hair Nets',
    description: '2 team members observed without proper hair restraints during food prep',
    confidence: 0.92,
    location: 'Main prep station'
  },
  {
    id: 2,
    timestamp: 32.8,
    category: 'CLEANLINESS',
    severity: 'LOW',
    title: 'Sanitizer Bottle Placement',
    description: 'Sanitizer bottle left on food prep surface instead of designated area',
    confidence: 0.87,
    location: 'Prep counter'
  },
  {
    id: 3,
    timestamp: 58.1,
    category: 'SAFETY',
    severity: 'HIGH',
    title: 'Wet Floor Without Signage',
    description: 'Wet area near dishwashing station without proper warning signs',
    confidence: 0.95,
    location: 'Dish pit area'
  },
];

const DEMO_VIDEO = {
  title: "Kitchen Morning Prep - Main Location",
  duration: 142.5,
  thumbnail: "/api/placeholder/640/360",
  overall_score: 78.5,
  scores: {
    ppe: 85,
    safety: 72,
    cleanliness: 80,
    uniform: 75
  }
};

interface InteractiveDemoExperienceProps {
  onSkipToDashboard?: () => void;
}

export default function InteractiveDemoExperience({ onSkipToDashboard }: InteractiveDemoExperienceProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackDemoStarted, trackDemoCompleted, trackDemoSkipped, trackUploadInitiated } = useBehaviorTracking();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [revealedFindings, setRevealedFindings] = useState<number[]>([]);
  const [analysisPhase, setAnalysisPhase] = useState<'waiting' | 'analyzing' | 'complete'>('waiting');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [demoTrackedAsStarted, setDemoTrackedAsStarted] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentTime < DEMO_VIDEO.duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.5;
          
          // Reveal findings as video progresses
          DEMO_FINDINGS.forEach(finding => {
            if (newTime >= finding.timestamp && !revealedFindings.includes(finding.id)) {
              setRevealedFindings(prev => [...prev, finding.id]);
            }
          });
          
          // Complete analysis when video ends
          if (newTime >= DEMO_VIDEO.duration) {
            setIsPlaying(false);
            setAnalysisPhase('complete');
            setShowResults(true);
            
            // Track demo completion
            trackDemoCompleted();
            
            return DEMO_VIDEO.duration;
          }
          
          return newTime;
        });
      }, 500);
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, revealedFindings, trackDemoCompleted]);

  const handlePlayPause = () => {
    if (!isPlaying && analysisPhase === 'waiting') {
      setAnalysisPhase('analyzing');
      
      // Track demo started on first play
      if (!demoTrackedAsStarted) {
        trackDemoStarted();
        setDemoTrackedAsStarted(true);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    setShowResults(false);
    setRevealedFindings([]);
    setAnalysisPhase('waiting');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-700 bg-red-100';
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PPE': return '🥽';
      case 'SAFETY': return '⚠️';
      case 'CLEANLINESS': return '🧹';
      case 'UNIFORM': return '👕';
      default: return '📋';
    }
  };

  const handleSkipToDashboard = () => {
    trackDemoSkipped();
    if (onSkipToDashboard) {
      onSkipToDashboard();
    }
  };

  const handleUploadClick = () => {
    trackUploadInitiated({ source: 'demo_cta' });
    setShowUploadModal(true);
  };

  const handleUploadClose = () => {
    setShowUploadModal(false);
  };

  const handleUpload = (scenario?: string) => {
    setShowUploadModal(false);
    trackUploadInitiated({ 
      source: 'demo_modal', 
      scenario: scenario || 'custom' 
    });
    
    if (scenario) {
      // Navigate with scenario context
      navigate('/videos/upload', { state: { scenario } });
    } else {
      navigate('/videos/upload');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">Welcome to PeakOps, {user?.first_name}! 👋</h1>
            <p className="text-indigo-100 mb-4">
              Experience the power of daily micro-checks with AI feedback in this interactive demo
            </p>
            <div className="flex items-center space-x-4 text-sm text-indigo-200">
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                Watch AI analyze in real-time
              </span>
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                See instant compliance scores
              </span>
              <span className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Get actionable recommendations
              </span>
            </div>
          </div>
          {/* Skip Button - Always visible */}
          {onSkipToDashboard && (
            <button
              onClick={handleSkipToDashboard}
              className="text-indigo-200 hover:text-white transition-colors text-sm underline"
            >
              Skip to Dashboard →
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{DEMO_VIDEO.title}</h3>
                <ContextualHelp tip={DemoHelpTips.VIDEO_PLAYER} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">Demo Location • Kitchen Area</span>
                {analysisPhase === 'analyzing' && (
                  <div className="flex items-center text-sm text-indigo-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                    AI Analyzing...
                  </div>
                )}
              </div>
            </div>
            
            {/* Video Player */}
            <div className="relative bg-gray-900 aspect-video">
              <img 
                src={DEMO_VIDEO.thumbnail}
                alt="Demo video thumbnail"
                className="w-full h-full object-cover"
              />
              
              {/* Play Overlay */}
              {!isPlaying && analysisPhase === 'waiting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handlePlayPause}
                    className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-6 transition-all"
                  >
                    <Play className="w-12 h-12" />
                  </button>
                </div>
              )}
              
              {/* Progress Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="flex items-center justify-between text-white mb-2">
                  <span className="text-sm">{formatTime(currentTime)}</span>
                  <span className="text-sm">{formatTime(DEMO_VIDEO.duration)}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTime / DEMO_VIDEO.duration) * 100}%` }}
                  ></div>
                  
                  {/* Finding Markers */}
                  {DEMO_FINDINGS.map(finding => (
                    <div
                      key={finding.id}
                      className="absolute top-0 w-1 h-2 bg-red-500 rounded-full"
                      style={{ left: `${(finding.timestamp / DEMO_VIDEO.duration) * 100}%` }}
                      title={`${finding.title} at ${formatTime(finding.timestamp)}`}
                    />
                  ))}
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-center space-x-4 mt-3">
                  <button
                    onClick={handleRestart}
                    className="text-white hover:text-indigo-300 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="text-white hover:text-indigo-300 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="space-y-4">
          {/* Live Findings */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-indigo-600" />
                  Live AI Analysis
                </h3>
                <ContextualHelp tip={DemoHelpTips.LIVE_ANALYSIS} />
              </div>
            </div>
            <div className="p-4">
              {revealedFindings.length === 0 && analysisPhase === 'waiting' && (
                <p className="text-gray-500 text-sm">Click play to start AI analysis...</p>
              )}
              
              {analysisPhase === 'analyzing' && revealedFindings.length === 0 && (
                <div className="flex items-center text-sm text-indigo-600">
                  <div className="animate-pulse w-2 h-2 bg-indigo-600 rounded-full mr-2"></div>
                  Scanning for compliance issues...
                </div>
              )}
              
              <div className="space-y-3">
                {DEMO_FINDINGS.filter(f => revealedFindings.includes(f.id)).map((finding) => (
                  <div key={finding.id} className="border rounded-lg p-3 animate-fadeIn">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getCategoryIcon(finding.category)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">{finding.title}</h4>
                          <p className="text-xs text-gray-600">{finding.location}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                        {finding.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{finding.description}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{formatTime(finding.timestamp)}</span>
                      <span>{Math.round(finding.confidence * 100)}% confident</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {showResults && (
            <div className="bg-white rounded-lg shadow-lg animate-slideUp">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Analysis Complete!</h3>
                  <ContextualHelp tip={DemoHelpTips.RESULTS_SUMMARY} />
                </div>
              </div>
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900">{DEMO_VIDEO.overall_score}%</div>
                  <p className="text-sm text-gray-600">Overall Compliance Score</p>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(DEMO_VIDEO.scores).map(([category, score]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-gray-600">{category}:</span>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button 
                    onClick={handleUploadClick}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Try Your Own Video
                  </button>
                  <ContextualHelp tip={DemoHelpTips.UPLOAD_BUTTON} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smart Upload Modal */}
      <SmartUploadModal
        isOpen={showUploadModal}
        onClose={handleUploadClose}
        onUpload={handleUpload}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Camera, CheckCircle, AlertTriangle, ArrowRight, Clock, Target, Loader2 } from 'lucide-react';
import { microCheckAPI } from '@/services/api';
import type { MicroCheckRun, MicroCheckRunItem, CheckResult } from '@/types/microCheck';
import MicroCheckCamera from '@/components/microCheck/MicroCheckCamera';

type CheckStatus = 'PASS' | 'FAIL' | 'SKIPPED';

const MicroCheckPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [run, setRun] = useState<MicroCheckRun | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'overview' | 'check' | 'summary'>('overview');
  const [currentCheckIndex, setCurrentCheckIndex] = useState(0);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [startTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Individual check state
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showFixNote, setShowFixNote] = useState(false);
  const [fixNote, setFixNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No check token provided');
      setLoading(false);
      return;
    }

    const fetchRun = async () => {
      try {
        const data = await microCheckAPI.getRunByToken(token);
        setRun(data);
      } catch (err: any) {
        console.error('Error fetching run:', err);
        setError('Unable to load check. The link may be invalid or expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchRun();
  }, [token]);

  const getElapsedTime = () => {
    return Math.floor((Date.now() - startTime) / 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartChecks = () => {
    setCurrentScreen('check');
  };

  const handleCheckResult = async (status: CheckStatus, photo?: string, note?: string) => {
    if (!run || !token) return;

    const currentItem = run.items[currentCheckIndex];
    const newResult: CheckResult = {
      runItemId: currentItem.id,
      status,
      photo,
      notes: note || '',
      timestamp: new Date().toISOString(),
    };

    setSubmitting(true);

    try {
      // Submit to API
      await microCheckAPI.submitResponseViaToken({
        token,
        run_item: currentItem.id,
        status,
        notes: note,
        photo,
      });

      // Add result to local state
      setCheckResults((prev) => [...prev, newResult]);

      // Reset check state
      setShowCamera(false);
      setCapturedPhoto(null);
      setShowFixNote(false);
      setFixNote('');

      // Move to next check or summary
      if (currentCheckIndex < run.items.length - 1) {
        setTimeout(() => {
          setCurrentCheckIndex(currentCheckIndex + 1);
          setSubmitting(false);
        }, 1000);
      } else {
        setTimeout(() => {
          setCurrentScreen('summary');
          setSubmitting(false);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Error submitting response:', err);
      setError('Failed to submit response. Please try again.');
      setSubmitting(false);
    }
  };

  const handleTakePhoto = () => {
    setShowCamera(true);
  };

  const handlePhotoCapture = (photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl);
    setShowCamera(false);
    // Automatically submit as PASS with photo
    handleCheckResult('PASS', photoDataUrl);
  };

  const handlePhotoCancel = () => {
    setShowCamera(false);
  };

  const handleLooksGood = () => {
    handleCheckResult('PASS');
  };

  const handleNeedsFix = () => {
    setShowFixNote(true);
  };

  const handleSubmitFix = () => {
    handleCheckResult('FAIL', undefined, fixNote);
  };

  const handleCancelFix = () => {
    setShowFixNote(false);
    setFixNote('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading checks...</p>
        </div>
      </div>
    );
  }

  if (error || !run || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-sm mx-auto text-center bg-white rounded-2xl shadow-xl border border-red-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-600 mb-6">{error || 'Unable to load checks'}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Overview Screen
  if (currentScreen === 'overview') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{run.store_name}</h1>
            <p className="text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Let's keep things sharp — three quick checks for today
            </h2>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>0 of {run.items.length} complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-teal-600 h-3 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            {/* Preview of checks */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Today's Checks:</h3>
              <div className="space-y-2">
                {run.items.map((item, index) => (
                  <div key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mr-3 text-sm font-bold text-gray-600">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{item.title_snapshot}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartChecks}
              className="w-full flex items-center justify-center px-6 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-semibold text-lg"
            >
              Start Checks
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>

          {/* Time estimate */}
          <div className="text-center text-sm text-gray-600">
            <Clock className="w-4 h-4 inline mr-1" />
            Estimated time: 2 minutes
          </div>
        </div>
      </div>
    );
  }

  // Summary Screen
  if (currentScreen === 'summary') {
    const totalTime = getElapsedTime();
    const passedCount = checkResults.filter((r) => r.status === 'PASS').length;
    const failedCount = checkResults.filter((r) => r.status === 'FAIL').length;
    const streak = 5; // Mock - would come from API

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">All Done! 🎉</h1>
            <p className="text-gray-600">Great job keeping your store sharp</p>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Run Summary</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                <div className="text-xs text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{failedCount}</div>
                <div className="text-xs text-gray-600">Fixed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatTime(totalTime)}</div>
                <div className="text-xs text-gray-600">Total Time</div>
              </div>
            </div>

            {/* Streak */}
            <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-4 mb-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl mr-2">🔥</span>
                <span className="text-xl font-bold text-orange-600">{streak} days straight</span>
              </div>
              <p className="text-orange-800 text-sm">Keep it going!</p>
            </div>

            {/* Results breakdown */}
            <div className="space-y-3 mb-6">
              {checkResults.map((result, index) => {
                const item = run.items[index];
                return (
                  <div
                    key={result.runItemId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.status === 'PASS'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                          result.status === 'PASS' ? 'bg-green-600' : 'bg-orange-600'
                        }`}
                      >
                        {result.status === 'PASS' ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 block truncate">
                          {item.title_snapshot}
                        </span>
                        {result.notes && (
                          <p className="text-xs text-gray-600 mt-1">{result.notes}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ml-2 flex-shrink-0 ${
                        result.status === 'PASS' ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {result.status === 'PASS' ? 'Looks Good' : 'Fixed'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-3">
              <Link
                to="/"
                className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-center"
              >
                Done
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Individual Check Screen
  const currentItem = run.items[currentCheckIndex];
  const completedCount = checkResults.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-4">
      <div className="max-w-md mx-auto pt-4">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Check {currentCheckIndex + 1} of {run.items.length}
            </span>
            <span>{formatTime(getElapsedTime())}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / run.items.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Check Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 text-center">
            <h1 className="text-xl font-bold mb-2">{currentItem.title_snapshot}</h1>
            <p className="text-teal-100">{currentItem.description_snapshot}</p>
          </div>

          <div className="p-4">
            {/* What "good" looks like */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">What "good" looks like:</h3>
              <p className="text-blue-800 text-sm">{currentItem.pass_criteria_snapshot}</p>
            </div>

            {/* Camera Interface */}
            {showCamera && (
              <div className="mb-6">
                <MicroCheckCamera onCapture={handlePhotoCapture} onCancel={handlePhotoCancel} />
              </div>
            )}

            {/* Fix Note Interface */}
            {showFixNote && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick note about what needs fixing:
                </label>
                <textarea
                  value={fixNote}
                  onChange={(e) => setFixNote(e.target.value)}
                  placeholder="e.g., soap empty, needs wipe-down..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <div className="flex space-x-3 mt-3">
                  <button
                    onClick={handleCancelFix}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitFix}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Fix'}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!showCamera && !showFixNote && (
              <div className="space-y-3">
                {currentItem.photo_required && (
                  <button
                    onClick={handleTakePhoto}
                    disabled={submitting}
                    className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg disabled:opacity-50"
                  >
                    <Camera className="w-6 h-6 mr-3" />
                    📸 Take Photo
                  </button>
                )}

                <button
                  onClick={handleLooksGood}
                  disabled={submitting}
                  className="w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-6 h-6 mr-3" />
                  👍 Looks Good
                </button>

                <button
                  onClick={handleNeedsFix}
                  disabled={submitting}
                  className="w-full flex items-center justify-center px-6 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-semibold text-lg disabled:opacity-50"
                >
                  <AlertTriangle className="w-6 h-6 mr-3" />
                  ⚠️ Needs Fix
                </button>
              </div>
            )}

            {/* Success animation for completed checks */}
            {submitting && (
              <div className="bg-green-100 border border-green-200 rounded-xl p-4 text-center mt-4">
                <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
                <p className="text-green-800 font-medium">Saving...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicroCheckPage;

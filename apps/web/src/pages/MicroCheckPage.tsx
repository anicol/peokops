import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { Camera, CheckCircle, AlertTriangle, ArrowRight, Clock, Target, Loader2 } from 'lucide-react';
import { microCheckAPI } from '@/services/api';
import type { MicroCheckRun, MicroCheckRunItem, CheckResult, CorrectiveAction } from '@/types/microCheck';
import MicroCheckCamera from '@/components/microCheck/MicroCheckCamera';
import FixDecisionBanner from '@/components/FixDecisionBanner';
import InlineFixScreen from '@/components/InlineFixScreen';
import NeedsFixCaptureSheet from '@/components/NeedsFixCaptureSheet';

type CheckStatus = 'PASS' | 'FAIL' | 'SKIPPED';

const MicroCheckPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const token = searchParams.get('token');

  const [run, setRun] = useState<MicroCheckRun | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'overview' | 'check' | 'summary'>('overview');
  const [currentCheckIndex, setCurrentCheckIndex] = useState(0);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]); // All responses for summary screen
  const [storeStreak, setStoreStreak] = useState<number>(0); // Store streak for summary screen
  const [startTime, setStartTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Individual check state
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showNeedsFixCapture, setShowNeedsFixCapture] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inline fix tracking state
  const [showDecisionBanner, setShowDecisionBanner] = useState(false);
  const [inlineFixMode, setInlineFixMode] = useState(false);
  const [savedPosition, setSavedPosition] = useState<{ checkIndex: number; results: CheckResult[] } | null>(null);
  const [currentCorrectiveAction, setCurrentCorrectiveAction] = useState<CorrectiveAction | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState<any>(null);
  const [beforePhotoDataUrl, setBeforePhotoDataUrl] = useState<string | null>(null); // Store the before photo data URL
  const [pendingFixAction, setPendingFixAction] = useState<'continue' | 'fixNow' | null>(null);
  const pendingFixActionRef = useRef<'continue' | 'fixNow' | null>(null); // Use ref to avoid closure issues
  const [fixedRunItemIds, setFixedRunItemIds] = useState<Set<string>>(new Set()); // Track which run items were fixed inline

  useEffect(() => {
    if (!token) {
      setError('No check token provided');
      setLoading(false);
      return;
    }

    const fetchRun = async () => {
      try {
        const data = await microCheckAPI.getRunByToken(token);

        // Check if run is already completed - still load the data but set a flag
        if (data.status === 'COMPLETED') {
          setRun(data);
          setError('This check has already been completed.');
          setLoading(false);
          return;
        }

        // Check if run is expired
        if (data.status === 'EXPIRED') {
          setError('This check has expired and can no longer be completed.');
          setLoading(false);
          return;
        }

        setRun(data);

        // If there are existing responses, set up resume state
        if (data.completed_count > 0) {
          // Find the first uncompleted item
          const firstUncompletedIndex = data.items.findIndex(
            item => !data.completed_item_ids.includes(item.id)
          );

          if (firstUncompletedIndex !== -1) {
            setCurrentCheckIndex(firstUncompletedIndex);
          }

          // Note: We don't pre-populate checkResults because we don't have the full
          // response data (photos, notes, etc.). The backend already tracks responses.
        }
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
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartChecks = () => {
    setStartTime(Date.now());
    setCurrentScreen('check');
  };

  const handleCheckResult = async (status: CheckStatus, photo?: string, note?: string) => {
    if (!run || !token) return;

    const currentItem = run.items[currentCheckIndex];
    const checkIndexAtSubmit = currentCheckIndex; // Capture the index at time of submission

    // Check if this check has already been submitted
    const alreadySubmitted = checkResults.some(r => r.runItemId === currentItem.id);
    if (alreadySubmitted) {
      console.log('Check already submitted, skipping duplicate submission');
      return;
    }

    const newResult: CheckResult = {
      runItemId: currentItem.id,
      status,
      photo,
      notes: note || '',
      timestamp: new Date().toISOString(),
    };

    setSubmitting(true);

    try {
      // If there's a photo, upload it first to get MediaAsset ID
      let mediaId: string | undefined;
      if (photo) {
        try {
          console.log('Uploading before photo...');
          const photoFile = await fetch(photo)
            .then(res => res.blob())
            .then(blob => new File([blob], `check-${Date.now()}.jpg`, { type: 'image/jpeg' }));

          const mediaAsset = await microCheckAPI.uploadMedia(photoFile, run.store);
          mediaId = mediaAsset.id;
          console.log('Before photo uploaded, media ID:', mediaId);
        } catch (err) {
          console.error('Error uploading photo:', err);
          // Continue without photo if upload fails
        }
      }

      console.log('Submitting response with media ID:', mediaId);
      // Submit to API with media ID instead of data URL
      const response = await microCheckAPI.submitResponseViaToken({
        token,
        run_item: currentItem.id,
        status,
        notes: note,
        media: mediaId, // Use media ID instead of photo data URL
      });

      // Store response for potential corrective action lookup
      setSubmittedResponse(response);

      // Store the photo data URL if we have one (for showing in inline fix screen)
      if (photo) {
        setBeforePhotoDataUrl(photo);
      }

      // Add result to local state
      setCheckResults((prev) => [...prev, newResult]);

      // Reset check state (but keep pendingFixAction until we check it)
      setShowCamera(false);
      setCapturedPhoto(null);
      setShowNeedsFixCapture(false);

      // If status is FAIL, handle based on pending action from capture screen
      if (status === 'FAIL') {
        // Wait a moment for the corrective action to be created by backend
        setTimeout(async () => {
          try {
            // Fetch the real corrective action that was created by the backend
            console.log('Fetching corrective action for response:', response.id);
            const actions = await microCheckAPI.getCorrectiveActions(run.store);
            const realAction = actions.find(a => a.response === response.id);

            if (realAction) {
              console.log('Found real corrective action:', realAction.id);
              setCurrentCorrectiveAction(realAction);
            } else {
              console.warn('Corrective action not found yet for response:', response.id);
              // Create placeholder as fallback
              setCurrentCorrectiveAction({
                id: 'temp-' + Date.now(),
                response: response.id,
                store: response.store,
                store_name: '',
                category: response.category,
                category_display: '',
                status: 'OPEN',
                due_at: null,
                assigned_to: null,
                assigned_to_name: '',
                before_media: response.media?.[0] || null,
                after_media: null,
                resolved_at: null,
                resolved_by: null,
                resolved_by_name: '',
                resolution_notes: '',
                fixed_during_session: false,
                created_from: 'MICRO_CHECK',
                verified_at: null,
                verification_confidence: null,
                created_at: new Date().toISOString(),
                created_by: null,
                updated_at: new Date().toISOString(),
                updated_by: null,
              } as CorrectiveAction);
            }

            // Check pending action from capture screen using ref to avoid closure issue
            console.log('Checking pendingFixActionRef.current:', pendingFixActionRef.current);
            if (pendingFixActionRef.current === 'fixNow') {
              console.log('User chose Fix Now - entering inline fix mode');
              // Save the position at time of submission (not current state which may have changed)
              setSavedPosition({
                checkIndex: checkIndexAtSubmit,
                results: checkResults,
              });
              console.log('Saved position:', checkIndexAtSubmit);

              // Enter inline fix mode
              setShowDecisionBanner(false);
              setInlineFixMode(true);
            } else {
              console.log('User chose Continue or no action - moving to next check');
              // User chose "Continue Checks" or timer expired - skip banner, just continue
              moveToNextCheck();
            }

            // Clear pending action after we've checked it
            setPendingFixAction(null);
            pendingFixActionRef.current = null;
            setSubmitting(false);
          } catch (err) {
            console.error('Error processing corrective action:', err);
            // If we can't process, just continue
            moveToNextCheck();
          }
        }, 500);
      } else {
        // For PASS or SKIPPED, move to next check immediately
        moveToNextCheck();
      }
    } catch (err: any) {
      console.error('Error submitting response:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError('Failed to submit response. Please try again.');
      setSubmitting(false);
    }
  };

  const moveToNextCheck = async () => {
    if (!run || !token) return;

    console.log('moveToNextCheck called, current index:', currentCheckIndex);

    // Clear the before photo data URL when moving to next check
    setBeforePhotoDataUrl(null);

    if (currentCheckIndex < run.items.length - 1) {
      setTimeout(() => {
        console.log('Advancing from index', currentCheckIndex, 'to', currentCheckIndex + 1);
        setCurrentCheckIndex(currentCheckIndex + 1);
        setSubmitting(false);
      }, 1000);
    } else {
      // Last check completed - fetch all responses and streak for summary
      setTimeout(async () => {
        try {
          // Fetch all responses for this run to show complete summary
          console.log('Fetching responses for run:', run.id, 'store:', run.store);
          const responses = await microCheckAPI.getResponses(run.store, { run: run.id });
          console.log('Received responses:', responses.length, responses);
          if (responses.length > 0) {
            console.log('First response structure:', responses[0]);
            console.log('First response.run:', responses[0].run);
            console.log('Comparing to run.id:', run.id);
          }

          // Filter responses to only include this run (backend filter not working)
          const filteredResponses = responses.filter(r => r.run === run.id);
          console.log('Filtered to current run:', filteredResponses.length, filteredResponses);
          setAllResponses(filteredResponses);

          // Fetch corrective actions to check which were fixed during session
          const actions = await microCheckAPI.getCorrectiveActions(run.store);
          console.log('Fetched corrective actions for summary:', actions.length);
          console.log('Locally tracked fixed items:', Array.from(fixedRunItemIds));

          const fixedRunItems = new Set<string>(fixedRunItemIds); // Start with locally tracked items
          filteredResponses.forEach(response => {
            if (response.status === 'FAIL' && response.run_item) {
              const action = actions.find(a => a.response === response.id);
              console.log('Response:', response.id, 'run_item:', response.run_item, 'has action:', action?.id, 'fixed_during_session:', action?.fixed_during_session);
              if (action && action.fixed_during_session) {
                fixedRunItems.add(response.run_item);
              }
            }
          });
          console.log('Final fixed run items:', Array.from(fixedRunItems));
          setFixedRunItemIds(fixedRunItems);

          // Fetch store streak for display
          const streakData = await microCheckAPI.getStoreStreak(run.store);
          setStoreStreak(streakData.current_streak);

          // Invalidate dashboard stats cache so it refetches with updated streak
          queryClient.invalidateQueries(['dashboard-stats']);
          queryClient.invalidateQueries('recent-micro-checks');
        } catch (err) {
          console.error('Error fetching summary data:', err);
          // If fetch fails, just use checkResults from this session
        }
        setCurrentScreen('summary');
        setSubmitting(false);
      }, 1000);
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
    setShowNeedsFixCapture(true);
  };

  const handleNeedsFixSubmit = (note: string, photo: File | null, action: 'continue' | 'fixNow') => {
    // Store the user's choice in both state and ref to avoid closure issues
    console.log('handleNeedsFixSubmit called with action:', action);
    setPendingFixAction(action);
    pendingFixActionRef.current = action; // Set ref to avoid closure issue in setTimeout
    console.log('Set pendingFixAction to:', action);

    // Close capture screen
    setShowNeedsFixCapture(false);

    // Convert File to base64 if photo exists (for API submission)
    if (photo) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        console.log('Calling handleCheckResult with FAIL status');
        handleCheckResult('FAIL', base64, note);
      };
      reader.readAsDataURL(photo);
    } else {
      console.log('Calling handleCheckResult with FAIL status (no photo)');
      handleCheckResult('FAIL', undefined, note);
    }
  };

  const handleCancelNeedsFix = () => {
    setShowNeedsFixCapture(false);
    setPendingFixAction(null);
    pendingFixActionRef.current = null;
  };

  // Inline fix flow handlers
  const handleContinueChecks = () => {
    setShowDecisionBanner(false);
    setCurrentCorrectiveAction(null);
    moveToNextCheck();
  };

  const handleFixNow = () => {
    if (!run) return;

    console.log('handleFixNow called, currentCorrectiveAction:', currentCorrectiveAction);

    // Position is already saved in handleCheckResult before we get here
    // Just enter inline fix mode
    setShowDecisionBanner(false);
    setInlineFixMode(true);
    console.log('Entering inline fix mode');
  };

  const handleInlineFixComplete = async (afterPhoto: File, notes: string) => {
    if (!currentCorrectiveAction || !run) return;

    try {
      console.log('Starting inline fix completion for action:', currentCorrectiveAction.id);

      // If we have a temp ID, fetch the real corrective action first with retry logic
      let actionId = currentCorrectiveAction.id;
      if (actionId.startsWith('temp-')) {
        console.log('Temporary action ID detected, fetching real corrective action...');

        // Retry up to 5 times with exponential backoff
        let realAction = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
          const actions = await microCheckAPI.getCorrectiveActions(run.store);
          realAction = actions.find(a => a.response === currentCorrectiveAction.response);

          if (realAction) {
            console.log(`Found real corrective action on attempt ${attempt}:`, realAction.id);
            break;
          }

          if (attempt < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s, 5s, 5s
            console.log(`Corrective action not found, retrying in ${delay}ms... (attempt ${attempt}/5)`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (!realAction) {
          throw new Error('Corrective action not yet created by backend after 5 retries. Please try again later.');
        }

        actionId = realAction.id;
        setCurrentCorrectiveAction(realAction);
      }

      // Upload after photo
      const afterMediaAsset = await microCheckAPI.uploadMedia(afterPhoto, run.store);
      console.log('Uploaded after photo, media ID:', afterMediaAsset.id);

      // Call resolve_inline API with real action ID
      const updatedAction = await microCheckAPI.resolveInline(
        actionId,
        afterMediaAsset.id,
        notes
      );
      console.log('Resolved inline, updated action:', updatedAction);
      console.log('Action fixed_during_session:', updatedAction.fixed_during_session);

      // Mark this run item as fixed
      const currentItem = run.items[currentCheckIndex];
      console.log('Marking run item as fixed:', currentItem.id);
      setFixedRunItemIds(prev => new Set([...prev, currentItem.id]));

      // Exit inline fix mode
      setInlineFixMode(false);
      setCurrentCorrectiveAction(null);

      // Show success toast (simulated with console for now)
      const remainingChecks = run!.items.length - currentCheckIndex - 1;
      console.log(`✅ Fixed — ${remainingChecks} check${remainingChecks !== 1 ? 's' : ''} remaining`);

      // Restore position and continue
      moveToNextCheck();
    } catch (err) {
      console.error('Error resolving inline fix:', err);
      throw err;
    }
  };

  const handleInlineFixCancel = () => {
    console.log('Canceling inline fix, continuing with checks');

    // Exit inline fix mode and continue with the check flow
    setInlineFixMode(false);
    setCurrentCorrectiveAction(null);

    // Move to next check since this one is already submitted as failed
    moveToNextCheck();

    setSubmitting(false);
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
    // Special handling for already completed runs
    const isAlreadyCompleted = error === 'This check has already been completed.';

    if (isAlreadyCompleted && run) {
      const handleViewResults = async () => {
        try {
          // Fetch all responses and streak data for summary
          console.log('Fetching responses for completed run:', run.id, 'store:', run.store);
          const responses = await microCheckAPI.getResponses(run.store, { run: run.id });
          console.log('Received responses for completed run:', responses.length, responses);

          // Filter responses to only include this run (backend filter not working)
          const filteredResponses = responses.filter(r => r.run === run.id);
          console.log('Filtered to current run:', filteredResponses.length, filteredResponses);
          setAllResponses(filteredResponses);

          // Fetch corrective actions for this store and check which were fixed during session
          const actions = await microCheckAPI.getCorrectiveActions(run.store);
          console.log('Fetched corrective actions:', actions.length);

          // Find actions that were fixed during session and match this run's responses
          const fixedRunItems = new Set<string>();
          filteredResponses.forEach(response => {
            if (response.status === 'FAIL' && response.run_item) {
              // Find the corrective action for this response
              const action = actions.find(a => a.response === response.id);
              console.log('Response:', response.id, 'has action:', action?.id, 'fixed_during_session:', action?.fixed_during_session);
              if (action && action.fixed_during_session) {
                fixedRunItems.add(response.run_item);
              }
            }
          });
          console.log('Fixed run items:', Array.from(fixedRunItems));
          setFixedRunItemIds(fixedRunItems);

          const streakData = await microCheckAPI.getStoreStreak(run.store);
          setStoreStreak(streakData.current_streak);

          // Invalidate dashboard stats cache so it refetches with updated streak
          queryClient.invalidateQueries(['dashboard-stats']);
          queryClient.invalidateQueries('recent-micro-checks');

          setError(null); // Clear error to show summary
          setCurrentScreen('summary');
        } catch (err) {
          console.error('Error loading results:', err);
        }
      };

      // Format completion time
      const formatCompletionTime = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      };

      const completedTime = run.completed_at ? formatCompletionTime(run.completed_at) : '';
      const completedByName = run.completed_by_name || 'Someone';

      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
          <div className="max-w-sm mx-auto text-center bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-3">
              ✅ This check is already complete for {run.store_name}.
            </h1>
            <p className="text-gray-600 mb-1">
              Completed by {completedByName} at {completedTime}.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              You can review the results or run a new check.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleViewResults}
                className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                View Results
              </button>
              <Link
                to="/"
                className="w-full px-6 py-3 bg-white text-teal-600 border-2 border-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-medium inline-block"
              >
                Start New Check
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Generic error screen for other errors
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

          {/* Resume Status Banner */}
          {run.completed_count > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <p className="text-sm font-medium text-blue-900">
                  {run.completed_count} check{run.completed_count !== 1 ? 's' : ''} completed — resuming on check {currentCheckIndex + 1}
                </p>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Let's keep things sharp — three quick checks for today
            </h2>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{run.completed_count} of {run.items.length} complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-teal-600 h-3 rounded-full transition-all"
                  style={{ width: `${(run.completed_count / run.items.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Preview of checks */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Your Checks:</h3>
              <div className="space-y-2">
                {run.items.map((item, index) => {
                  const isCompleted = run.completed_item_ids.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center p-3 rounded-lg ${
                        isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-sm font-bold ${
                          isCompleted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span className={isCompleted ? 'text-green-900' : 'text-gray-700'}>
                        {item.title_snapshot}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleStartChecks}
              className="w-full flex items-center justify-center px-6 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-semibold text-lg"
            >
              {run.completed_count > 0 ? 'Resume Checks' : 'Start Checks'}
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
    // Calculate total time - if we don't have startTime (resumed session), calculate from responses
    let totalTime = getElapsedTime();
    if (totalTime === 0 && allResponses.length > 0) {
      // Fallback: calculate from response timestamps if available
      const times = allResponses
        .map(r => r.completed_at ? new Date(r.completed_at).getTime() : 0)
        .filter(t => t > 0);
      if (times.length > 1) {
        const earliest = Math.min(...times);
        const latest = Math.max(...times);
        totalTime = Math.floor((latest - earliest) / 1000);
      }
    }

    // Use allResponses from API if available (includes resumed items), otherwise use checkResults from this session
    const responsesToShow = allResponses.length > 0 ? allResponses : checkResults;

    // Count passed items
    const passedCount = allResponses.length > 0
      ? allResponses.filter((r) => r.status === 'PASS').length
      : checkResults.filter((r) => r.status === 'PASS').length;

    // Count items that failed AND were fixed during session
    const fixedCount = allResponses.length > 0
      ? allResponses.filter((r) => r.status === 'FAIL' && r.run_item && fixedRunItemIds.has(r.run_item)).length
      : checkResults.filter((r) => r.status === 'FAIL' && fixedRunItemIds.has(r.runItemId)).length;

    // Count items that failed but were NOT fixed
    const failedCount = allResponses.length > 0
      ? allResponses.filter((r) => r.status === 'FAIL' && (!r.run_item || !fixedRunItemIds.has(r.run_item))).length
      : checkResults.filter((r) => r.status === 'FAIL' && !fixedRunItemIds.has(r.runItemId)).length;

    console.log('Summary screen - allResponses:', allResponses.length, 'checkResults:', checkResults.length);
    console.log('All responses with status:', allResponses.map(r => ({ title: r.run_item_details?.title_snapshot, status: r.status })));
    console.log('checkResults with status:', checkResults.map((r, idx) => ({ index: idx, runItemId: r.runItemId, status: r.status, title: run.items[idx]?.title_snapshot })));
    console.log('Fixed run item IDs:', Array.from(fixedRunItemIds));
    console.log('Passed:', passedCount, 'Fixed:', fixedCount, 'Failed:', failedCount);

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

          {/* Streak Badge */}
          {storeStreak > 0 && (
            <div className="text-center mb-6">
              <div className="inline-block bg-gradient-to-r from-orange-100 to-red-100 rounded-xl px-6 py-3">
                <p className="text-lg font-bold text-orange-600">
                  🔥 {storeStreak}-day streak — keep it going!
                </p>
              </div>
            </div>
          )}

          {/* Summary Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Run Summary</h2>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{formatTime(totalTime)}</div>
                <div className="text-xs text-gray-600">Total Time</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                <div className="text-xs text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{fixedCount}</div>
                <div className="text-xs text-gray-600">Fixed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
            </div>

            {/* Results breakdown */}
            <div className="space-y-3 mb-6">
              {allResponses.length > 0 ? (
                // Show responses from API (includes resumed items)
                allResponses.map((response) => {
                  const item = run.items.find(i => i.id === response.run_item);
                  if (!item) return null;
                  return (
                    <div
                      key={response.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        response.status === 'PASS'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                            response.status === 'PASS' ? 'bg-green-600' : 'bg-orange-600'
                          }`}
                        >
                          {response.status === 'PASS' ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 block truncate">
                            {item.title_snapshot}
                          </span>
                          {response.notes && (
                            <p className="text-xs text-gray-600 mt-1">{response.notes}</p>
                          )}
                        </div>
                      </div>
                      {response.status === 'FAIL' && response.run_item && fixedRunItemIds.has(response.run_item) && (
                        <span className="text-sm font-medium ml-2 flex-shrink-0 text-orange-600">
                          Fixed
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                // Fallback to checkResults from this session only
                checkResults.map((result, index) => {
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
                      {result.status === 'FAIL' && fixedRunItemIds.has(result.runItemId) && (
                        <span className="text-sm font-medium ml-2 flex-shrink-0 text-orange-600">
                          Fixed
                        </span>
                      )}
                    </div>
                  );
                })
              )}
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


  // Inline Fix Mode Screen
  console.log('Render check - inlineFixMode:', inlineFixMode, 'currentCorrectiveAction:', currentCorrectiveAction?.id, 'savedPosition:', savedPosition);
  if (inlineFixMode && currentCorrectiveAction && savedPosition) {
    console.log('Rendering InlineFixScreen for check index:', savedPosition.checkIndex);
    console.log('submittedResponse:', submittedResponse);
    console.log('submittedResponse.media:', submittedResponse?.media);
    console.log('currentCorrectiveAction:', currentCorrectiveAction);
    console.log('currentCorrectiveAction.before_media:', currentCorrectiveAction.before_media);
    const fixItem = run.items[savedPosition.checkIndex]; // Use saved position, not current index

    // The before photo can be in multiple places depending on the backend response
    // Priority: beforePhotoDataUrl (local state) -> currentCorrectiveAction.before_media -> submittedResponse.media
    let beforePhotoUrl = null;
    if (beforePhotoDataUrl) {
      // Use the locally stored data URL (photo we just took)
      beforePhotoUrl = beforePhotoDataUrl;
    } else if (currentCorrectiveAction.before_media) {
      beforePhotoUrl = currentCorrectiveAction.before_media;
    } else if (submittedResponse?.media) {
      // Media could be a string ID or an array
      beforePhotoUrl = Array.isArray(submittedResponse.media)
        ? submittedResponse.media[0]
        : submittedResponse.media;
    }
    console.log('beforePhotoUrl:', beforePhotoUrl);

    return (
      <InlineFixScreen
        beforePhotoUrl={beforePhotoUrl}
        checkTitle={fixItem.title_snapshot}
        savedPosition={{
          currentCheck: savedPosition.checkIndex + 1, // Display as 1-indexed
          totalChecks: run.items.length,
        }}
        onComplete={handleInlineFixComplete}
        onCancel={handleInlineFixCancel}
      />
    );
  }

  // Individual Check Screen
  const currentItem = run.items[currentCheckIndex];
  // Include both existing completed items from backend AND new results from this session
  const completedCount = run.completed_count + checkResults.length;
  const remainingChecks = run.items.length - currentCheckIndex - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex flex-col">
      <div className="max-w-md mx-auto w-full p-4 py-6">
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

        {/* Decision Banner - shown after FAIL submission */}
        {showDecisionBanner && (
          <FixDecisionBanner
            onContinue={handleContinueChecks}
            onFixNow={handleFixNow}
            remainingChecks={remainingChecks}
          />
        )}

        {/* Check Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white p-6">
            <h1 className="text-xl font-bold mb-2">{currentItem.title_snapshot}</h1>
            {currentItem.template_description && (
              <p className="text-white/90 text-sm">{currentItem.template_description}</p>
            )}
          </div>

          <div className="flex flex-col p-6">
            {/* Content Area */}
            <div>
              {/* Reference Image */}
              {currentItem.template_reference_image && (
                <div className="mb-6">
                  <img
                    src={currentItem.template_reference_image}
                    alt="Reference example"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {/* What "good" looks like */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">What "good" looks like:</h3>
                <p className="text-blue-800 text-sm">{currentItem.success_criteria_snapshot}</p>
              </div>
            </div>

            {/* Camera Interface */}
            {showCamera && (
              <div className="mb-6">
                <MicroCheckCamera onCapture={handlePhotoCapture} onCancel={handlePhotoCancel} />
              </div>
            )}

            {/* Action Buttons */}
            {!showCamera && (
              <div className="space-y-3">
                {currentItem.photo_required && (
                  <button
                    onClick={handleTakePhoto}
                    disabled={submitting}
                    className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg disabled:opacity-50"
                  >
                    <Camera className="w-6 h-6 mr-3" />
                    Take Photo
                  </button>
                )}

                <button
                  onClick={handleLooksGood}
                  disabled={submitting}
                  className="w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-6 h-6 mr-3" />
                  Looks Good
                </button>

                <button
                  onClick={handleNeedsFix}
                  disabled={submitting}
                  className="w-full flex items-center justify-center px-6 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-semibold text-lg disabled:opacity-50"
                >
                  <AlertTriangle className="w-6 h-6 mr-3" />
                  Needs Fix
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

        {/* Needs Fix Capture Sheet - Overlay */}
        {showNeedsFixCapture && (
          <NeedsFixCaptureSheet
            checkTitle={currentItem.title_snapshot}
            onSubmit={handleNeedsFixSubmit}
            onCancel={handleCancelNeedsFix}
          />
        )}
      </div>
    </div>
  );
};

export default MicroCheckPage;

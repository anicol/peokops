import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useMutation } from 'react-query';
import { useLocation } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';

interface BehaviorTracker {
  trackEvent: (eventType: string, metadata?: any) => void;

  // Demo events
  trackDemoStarted: () => void;
  trackDemoCompleted: () => void;
  trackDemoSkipped: () => void;

  // Navigation events
  trackPageView: (page: string, metadata?: any) => void;
  trackFeatureAccessed: (feature: string, metadata?: any) => void;
  trackTabSwitched: (tab: string, metadata?: any) => void;
  trackStoreSwitch: (storeId: number | string, metadata?: any) => void;

  // Micro-Check events
  trackCheckCreated: (checkId: string, metadata?: any) => void;
  trackCheckStarted: (checkId: string, metadata?: any) => void;
  trackCheckCompleted: (checkId: string, metadata?: any) => void;
  trackCorrectiveActionCreated: (actionId: string, metadata?: any) => void;

  // Employee Voice events
  trackPulseCreated: (pulseId: string, metadata?: any) => void;
  trackPulseConfigured: (pulseId: string, metadata?: any) => void;
  trackPulseAnalyticsViewed: (pulseId: string, metadata?: any) => void;

  // Template events
  trackTemplateViewed: (templateId: string, metadata?: any) => void;
  trackTemplateSelected: (templateId: string, metadata?: any) => void;
  trackAIGenerationUsed: (metadata?: any) => void;

  // Analytics events
  trackInsightsViewed: (metadata?: any) => void;
  trackReportFiltered: (filters: any, metadata?: any) => void;
  trackExportClicked: (exportType: string, metadata?: any) => void;
  trackSearchPerformed: (query: string, metadata?: any) => void;

  // Media events
  trackPhotoUploaded: (metadata?: any) => void;
  trackVideoUploaded: (metadata?: any) => void;

  // Legacy events
  trackDashboardView: () => void;
  trackUploadInitiated: (metadata?: any) => void;
}

// Generate a session ID for tracking
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('behavior_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('behavior_session_id', sessionId);
  }
  return sessionId;
};

// API calls for behavior tracking
const behaviorAPI = {
  trackEvent: async (data: { event_type: string; metadata?: any; session_id?: string }) => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/behavior/track_event/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to track behavior event');
    }
    
    return response.json();
  },

  trackDemoStarted: async (session_id: string) => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/behavior/demo_started/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ session_id })
    });
    
    if (!response.ok) {
      throw new Error('Failed to track demo started');
    }
    
    return response.json();
  },

  trackDemoCompleted: async (session_id: string) => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/behavior/demo_completed/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ session_id })
    });
    
    if (!response.ok) {
      throw new Error('Failed to track demo completed');
    }
    
    return response.json();
  },

  trackDemoSkipped: async (session_id: string) => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/behavior/demo_skipped/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ session_id })
    });
    
    if (!response.ok) {
      throw new Error('Failed to track demo skipped');
    }
    
    return response.json();
  },

  trackDashboardView: async (session_id: string) => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/behavior/dashboard_view/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ session_id })
    });
    
    if (!response.ok) {
      throw new Error('Failed to track dashboard view');
    }
    
    return response.json();
  }
};

export function useBehaviorTracking(): BehaviorTracker {
  const sessionId = useMemo(() => getSessionId(), []);

  // Generic event tracking
  const trackEventMutation = useMutation(behaviorAPI.trackEvent, {
    onError: (error) => {
      console.warn('Failed to track behavior event:', error);
    }
  });

  // Demo tracking mutations
  const trackDemoStartedMutation = useMutation(behaviorAPI.trackDemoStarted, {
    onError: (error) => {
      console.warn('Failed to track demo started:', error);
    }
  });

  const trackDemoCompletedMutation = useMutation(behaviorAPI.trackDemoCompleted, {
    onError: (error) => {
      console.warn('Failed to track demo completed:', error);
    }
  });

  const trackDemoSkippedMutation = useMutation(behaviorAPI.trackDemoSkipped, {
    onError: (error) => {
      console.warn('Failed to track demo skipped:', error);
    }
  });

  const trackDashboardViewMutation = useMutation(behaviorAPI.trackDashboardView, {
    onError: (error) => {
      console.warn('Failed to track dashboard view:', error);
    }
  });

  // Use refs to store stable mutation functions
  const mutationsRef = useRef({
    trackEvent: trackEventMutation,
    trackDemoStarted: trackDemoStartedMutation,
    trackDemoCompleted: trackDemoCompletedMutation,
    trackDemoSkipped: trackDemoSkippedMutation,
    trackDashboardView: trackDashboardViewMutation
  });
  
  // Update refs when mutations change
  mutationsRef.current = {
    trackEvent: trackEventMutation,
    trackDemoStarted: trackDemoStartedMutation,
    trackDemoCompleted: trackDemoCompletedMutation,
    trackDemoSkipped: trackDemoSkippedMutation,
    trackDashboardView: trackDashboardViewMutation
  };

  const trackEvent = useCallback((eventType: string, metadata: any = {}) => {
    mutationsRef.current.trackEvent.mutate({
      event_type: eventType,
      metadata,
      session_id: sessionId
    });
  }, [sessionId]);

  const trackDemoStarted = useCallback(() => {
    mutationsRef.current.trackDemoStarted.mutate(sessionId);
  }, [sessionId]);

  const trackDemoCompleted = useCallback(() => {
    mutationsRef.current.trackDemoCompleted.mutate(sessionId);
  }, [sessionId]);

  const trackDemoSkipped = useCallback(() => {
    mutationsRef.current.trackDemoSkipped.mutate(sessionId);
  }, [sessionId]);

  const trackDashboardView = useCallback(() => {
    mutationsRef.current.trackDashboardView.mutate(sessionId);
  }, [sessionId]);

  const trackUploadInitiated = useCallback((metadata: any = {}) => {
    mutationsRef.current.trackEvent.mutate({
      event_type: 'UPLOAD_INITIATED',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        page: 'upload'
      },
      session_id: sessionId
    });
  }, [sessionId]);

  // Navigation tracking
  const trackPageView = useCallback((page: string, metadata: any = {}) => {
    trackEvent('PAGE_VIEW', { page, ...metadata });
  }, [trackEvent]);

  const trackFeatureAccessed = useCallback((feature: string, metadata: any = {}) => {
    trackEvent('FEATURE_ACCESSED', { feature, ...metadata });
  }, [trackEvent]);

  const trackTabSwitched = useCallback((tab: string, metadata: any = {}) => {
    trackEvent('TAB_SWITCHED', { tab, ...metadata });
  }, [trackEvent]);

  const trackStoreSwitch = useCallback((storeId: number | string, metadata: any = {}) => {
    trackEvent('STORE_SWITCHED', { store_id: storeId, ...metadata });
  }, [trackEvent]);

  // Micro-Check tracking
  const trackCheckCreated = useCallback((checkId: string, metadata: any = {}) => {
    trackEvent('CHECK_CREATED', { check_id: checkId, ...metadata });
  }, [trackEvent]);

  const trackCheckStarted = useCallback((checkId: string, metadata: any = {}) => {
    trackEvent('CHECK_STARTED', { check_id: checkId, ...metadata });
  }, [trackEvent]);

  const trackCheckCompleted = useCallback((checkId: string, metadata: any = {}) => {
    trackEvent('CHECK_COMPLETED', { check_id: checkId, ...metadata });
  }, [trackEvent]);

  const trackCorrectiveActionCreated = useCallback((actionId: string, metadata: any = {}) => {
    trackEvent('CORRECTIVE_ACTION_CREATED', { action_id: actionId, ...metadata });
  }, [trackEvent]);

  // Employee Voice tracking
  const trackPulseCreated = useCallback((pulseId: string, metadata: any = {}) => {
    trackEvent('PULSE_CREATED', { pulse_id: pulseId, ...metadata });
  }, [trackEvent]);

  const trackPulseConfigured = useCallback((pulseId: string, metadata: any = {}) => {
    trackEvent('PULSE_CONFIGURED', { pulse_id: pulseId, ...metadata });
  }, [trackEvent]);

  const trackPulseAnalyticsViewed = useCallback((pulseId: string, metadata: any = {}) => {
    trackEvent('PULSE_ANALYTICS_VIEWED', { pulse_id: pulseId, ...metadata });
  }, [trackEvent]);

  // Template tracking
  const trackTemplateViewed = useCallback((templateId: string, metadata: any = {}) => {
    trackEvent('TEMPLATE_VIEWED', { template_id: templateId, ...metadata });
  }, [trackEvent]);

  const trackTemplateSelected = useCallback((templateId: string, metadata: any = {}) => {
    trackEvent('TEMPLATE_SELECTED', { template_id: templateId, ...metadata });
  }, [trackEvent]);

  const trackAIGenerationUsed = useCallback((metadata: any = {}) => {
    trackEvent('AI_GENERATION_USED', metadata);
  }, [trackEvent]);

  // Analytics tracking
  const trackInsightsViewed = useCallback((metadata: any = {}) => {
    trackEvent('INSIGHTS_VIEWED', metadata);
  }, [trackEvent]);

  const trackReportFiltered = useCallback((filters: any, metadata: any = {}) => {
    trackEvent('REPORT_FILTERED', { filters, ...metadata });
  }, [trackEvent]);

  const trackExportClicked = useCallback((exportType: string, metadata: any = {}) => {
    trackEvent('EXPORT_CLICKED', { export_type: exportType, ...metadata });
  }, [trackEvent]);

  const trackSearchPerformed = useCallback((query: string, metadata: any = {}) => {
    trackEvent('SEARCH_PERFORMED', { query, ...metadata });
  }, [trackEvent]);

  // Media tracking
  const trackPhotoUploaded = useCallback((metadata: any = {}) => {
    trackEvent('PHOTO_UPLOADED', metadata);
  }, [trackEvent]);

  const trackVideoUploaded = useCallback((metadata: any = {}) => {
    trackEvent('VIDEO_UPLOADED', metadata);
  }, [trackEvent]);

  // Automatic page view tracking on route change
  const location = useLocation();
  const previousPath = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath !== previousPath.current) {
      // Track page view automatically
      trackPageView(currentPath, {
        from: previousPath.current || 'direct',
        search: location.search,
        timestamp: new Date().toISOString()
      });
      previousPath.current = currentPath;
    }
  }, [location, trackPageView]);

  return {
    trackEvent,

    // Demo events
    trackDemoStarted,
    trackDemoCompleted,
    trackDemoSkipped,

    // Navigation events
    trackPageView,
    trackFeatureAccessed,
    trackTabSwitched,
    trackStoreSwitch,

    // Micro-Check events
    trackCheckCreated,
    trackCheckStarted,
    trackCheckCompleted,
    trackCorrectiveActionCreated,

    // Employee Voice events
    trackPulseCreated,
    trackPulseConfigured,
    trackPulseAnalyticsViewed,

    // Template events
    trackTemplateViewed,
    trackTemplateSelected,
    trackAIGenerationUsed,

    // Analytics events
    trackInsightsViewed,
    trackReportFiltered,
    trackExportClicked,
    trackSearchPerformed,

    // Media events
    trackPhotoUploaded,
    trackVideoUploaded,

    // Legacy events
    trackDashboardView,
    trackUploadInitiated
  };
}
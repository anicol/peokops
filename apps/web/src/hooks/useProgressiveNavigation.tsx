import { useMemo } from 'react';
import { useAuth } from './useAuth';

export interface NavigationState {
  // Core navigation
  showLogo: boolean;
  showUserEmail: boolean;
  showSkipToDashboard: boolean;

  // New simplified navigation items
  home: 'hidden' | 'visible-disabled' | 'enabled';
  checks: 'hidden' | 'enabled';
  walkthroughs: 'hidden' | 'enabled';
  templates: 'hidden' | 'enabled';
  insights: 'hidden' | 'enabled';
  settings: 'hidden' | 'enabled';

  // Legacy navigation items (for backward compatibility)
  dashboard: 'hidden' | 'visible-disabled' | 'enabled';
  videos: 'hidden' | 'enabled';
  inspections: 'hidden' | 'enabled';
  actionItems: 'hidden' | 'enabled';
  stores: 'hidden' | 'enabled';
  users: 'hidden' | 'enabled';
  brands: 'hidden' | 'enabled';
  inspectorQueue: 'hidden' | 'enabled';
  adminQueue: 'hidden' | 'enabled';
  adminUsers: 'hidden' | 'enabled';

  // Never available in trial
  billing: 'hidden';
  teamManagement: 'hidden';
  apiAccess: 'hidden';
}

export function useProgressiveNavigation(): NavigationState {
  const { user } = useAuth();
  
  return useMemo(() => {
    const isEnterprise = user?.role === 'ADMIN' || user?.role === 'INSPECTOR';
    const isCoaching = user?.role === 'OWNER' || user?.role === 'GM';

    // Default state - non-trial users get full access
    if (!user?.is_trial_user) {
      return {
        showLogo: true,
        showUserEmail: true,
        showSkipToDashboard: false,

        // New navigation
        home: 'enabled',
        checks: 'enabled',
        walkthroughs: isCoaching || isEnterprise ? 'enabled' : 'hidden',
        templates: isCoaching || isEnterprise ? 'enabled' : 'hidden',
        insights: 'enabled',
        settings: 'enabled',

        // Legacy navigation
        dashboard: 'enabled',
        videos: 'enabled',
        inspections: 'enabled',
        actionItems: 'enabled',
        stores: 'enabled',
        users: ['OWNER', 'GM', 'ADMIN'].includes(user?.role || '') ? 'enabled' : 'hidden',
        brands: user?.role === 'ADMIN' ? 'enabled' : 'hidden',
        inspectorQueue: ['INSPECTOR', 'ADMIN'].includes(user?.role || '') ? 'enabled' : 'hidden',
        adminQueue: user?.role === 'ADMIN' ? 'enabled' : 'hidden',
        adminUsers: user?.role === 'ADMIN' ? 'enabled' : 'hidden',
        billing: 'hidden',
        teamManagement: 'hidden',
        apiAccess: 'hidden',
      };
    }

    // Get user's progress data
    const trial = user.trial_status;
    const hasCompletedDemo = !!user.demo_completed_at;
    const hasUploadedVideo = (trial?.videos_used || 0) > 0;
    const hasInspections = (user.total_inspections || 0) > 0;
    const hasMultipleVideos = (trial?.videos_used || 0) >= 3;
    const hoursSinceSignup = user.hours_since_signup || 0;
    const hasBeenActive24Hours = hoursSinceSignup >= 24;

    // Trial user progressive navigation logic
    const state: NavigationState = {
      // Always visible during trial
      showLogo: true,
      showUserEmail: true,
      showSkipToDashboard: !hasCompletedDemo, // Hide after demo completion

      // New navigation - Trial users see: Home, Checks, Insights, Settings
      home: hasCompletedDemo
        ? 'enabled'
        : user.has_seen_demo
          ? 'visible-disabled'
          : 'hidden',
      checks: 'enabled', // Always visible
      walkthroughs: 'hidden', // Hidden for trial
      templates: 'hidden', // Hidden for trial
      insights: 'enabled', // Always visible
      settings: 'enabled', // Always visible

      // Legacy navigation
      dashboard: hasCompletedDemo
        ? 'enabled'
        : user.has_seen_demo
          ? 'visible-disabled'
          : 'hidden',
      videos: hasUploadedVideo ? 'enabled' : 'hidden',
      inspections: hasInspections ? 'enabled' : 'hidden',
      actionItems: hasInspections ? 'enabled' : 'hidden',
      stores: (hasBeenActive24Hours || hasMultipleVideos) ? 'enabled' : 'hidden',
      users: (hasBeenActive24Hours || hasMultipleVideos) && ['OWNER', 'GM'].includes(user?.role || '') ? 'enabled' : 'hidden',
      brands: 'hidden',
      inspectorQueue: 'hidden',
      adminQueue: 'hidden',
      adminUsers: 'hidden',
      billing: 'hidden',
      teamManagement: 'hidden',
      apiAccess: 'hidden',
    };

    return state;
  }, [user]);
}

export function useNavigationProgress() {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user?.is_trial_user) {
      return {
        completedStages: [],
        nextStage: null,
        progress: 100,
      };
    }

    const stages = [];
    const trial = user.trial_status;
    const hasCompletedDemo = !!user.demo_completed_at;
    const hasUploadedVideo = (trial?.videos_used || 0) > 0;
    const hasInspections = (user.total_inspections || 0) > 0;
    
    if (user.has_seen_demo) stages.push('demo-started');
    if (hasCompletedDemo) stages.push('demo-completed');
    if (hasUploadedVideo) stages.push('first-upload');
    if (hasInspections) stages.push('first-analysis');
    
    const nextStage = !user.has_seen_demo 
      ? 'start-demo'
      : !hasCompletedDemo 
        ? 'complete-demo'
        : !hasUploadedVideo 
          ? 'upload-video' 
          : !hasInspections 
            ? 'wait-for-analysis'
            : 'explore-features';

    return {
      completedStages: stages,
      nextStage,
      progress: Math.min((stages.length / 4) * 100, 100),
    };
  }, [user]);
}
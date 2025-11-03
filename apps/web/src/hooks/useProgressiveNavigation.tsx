import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useFeatureGates } from './useFeatureGates';

export type NavigationMode = 'TRIAL_MODE' | 'MULTI_STORE_MODE' | 'ENTERPRISE_MODE' | 'SUPER_ADMIN_MODE';

export interface NavigationState {
  // Navigation mode
  navigationMode: NavigationMode;

  // Core navigation
  showLogo: boolean;
  showUserEmail: boolean;
  showSkipToDashboard: boolean;

  // Main navigation items (new structure)
  home: 'hidden' | 'visible-disabled' | 'enabled';
  microChecks: 'hidden' | 'visible-disabled' | 'enabled' | 'teaser';
  aiCoach: 'hidden' | 'visible-disabled' | 'enabled' | 'teaser';
  inspections: 'hidden' | 'visible-disabled' | 'enabled' | 'teaser';
  actions: 'hidden' | 'visible-disabled' | 'enabled';
  insights: 'hidden' | 'visible-disabled' | 'enabled' | 'teaser';
  profile: 'hidden' | 'enabled';
  settings: 'hidden' | 'enabled';
  integrations: 'hidden' | 'enabled';

  // System Administration navigation items
  systemBrands: 'hidden' | 'enabled';
  systemUsers: 'hidden' | 'enabled';
  systemQueue: 'hidden' | 'enabled';

  // Legacy navigation items (for backward compatibility)
  dashboard: 'hidden' | 'visible-disabled' | 'enabled';
  checks: 'hidden' | 'enabled';
  walkthroughs: 'hidden' | 'enabled';
  templates: 'hidden' | 'enabled';
  videos: 'hidden' | 'enabled';
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
  const { isUnlocked } = useFeatureGates();

  return useMemo(() => {
    const role = user?.role;
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isAdmin = role === 'ADMIN'; // Enterprise User (Corporate/Brand HQ)
    const isOwner = role === 'OWNER'; // Multi-Store Manager
    const isTrialAdmin = role === 'TRIAL_ADMIN'; // Trial administrator
    const isGM = role === 'GM'; // Store Manager
    const isInspector = role === 'INSPECTOR';

    // Navigation mode detection - determines which navigation structure to show
    const storeCount = user?.accessible_stores_count || 0;
    let navigationMode: 'TRIAL_MODE' | 'MULTI_STORE_MODE' | 'ENTERPRISE_MODE' | 'SUPER_ADMIN_MODE' = 'TRIAL_MODE';

    if (isSuperAdmin) {
      navigationMode = 'SUPER_ADMIN_MODE';
    } else if (isAdmin) {
      navigationMode = 'ENTERPRISE_MODE';
    } else if (isInspector) {
      navigationMode = 'ENTERPRISE_MODE';
    } else if (isOwner) {
      navigationMode = 'MULTI_STORE_MODE';
    } else if (isGM && storeCount > 1) {
      navigationMode = 'MULTI_STORE_MODE';
    } else if (isTrialAdmin || (isGM && storeCount <= 1)) {
      navigationMode = 'TRIAL_MODE';
    }

    // Mode-based navigation structure
    // Non-trial users get navigation based on their mode
    if (!user?.is_trial_user) {
      // SUPER ADMIN MODE - Full system access including System Administration
      if (navigationMode === 'SUPER_ADMIN_MODE') {
        return {
          navigationMode: 'SUPER_ADMIN_MODE',
          showLogo: true,
          showUserEmail: true,
          showSkipToDashboard: false,

          // Main navigation - Full Enterprise Mode + System Admin
          home: 'enabled',
          microChecks: 'enabled',
          aiCoach: 'enabled',
          inspections: 'enabled',
          actions: 'enabled',
          insights: 'enabled',
          profile: 'enabled',
          settings: 'enabled',
          integrations: 'enabled',

          // System Administration (Super Admin only)
          systemBrands: 'enabled',
          systemUsers: 'enabled',
          systemQueue: 'enabled',

          // Legacy navigation
          dashboard: 'enabled',
          checks: 'enabled',
          walkthroughs: 'enabled',
          templates: 'enabled',
          videos: 'enabled',
          actionItems: 'enabled',
          stores: 'enabled',
          users: 'enabled',
          brands: 'enabled',
          inspectorQueue: 'enabled',
          adminQueue: 'enabled',
          adminUsers: 'enabled',
          billing: 'hidden',
          teamManagement: 'hidden',
          apiAccess: 'hidden',
        };
      }

      // ENTERPRISE MODE - Corporate/Brand HQ (ADMIN, INSPECTOR)
      // Operations: Dashboard, Stores, Walkthroughs, Micro-Checks
      // Management: Template Library, Reports & Trends, Users & Roles
      // Admin: Settings, Security & Compliance
      if (navigationMode === 'ENTERPRISE_MODE') {
        // Inspector has limited Enterprise access
        if (isInspector) {
          return {
            navigationMode: 'ENTERPRISE_MODE',
            showLogo: true,
            showUserEmail: true,
            showSkipToDashboard: false,

            // Main navigation - Inspector workspace
            home: 'enabled', // Assigned inspections and deadlines
            microChecks: 'hidden',
            aiCoach: 'hidden',
            inspections: 'enabled', // Video review workspace
            actions: 'enabled', // Tasks from their reviews
            insights: 'enabled', // Personal stats
            profile: 'enabled',
            settings: 'enabled', // Profile, notifications
            integrations: 'hidden',

            // System Administration
            systemBrands: 'hidden',
            systemUsers: 'hidden',
            systemQueue: 'hidden',

            // Legacy navigation
            dashboard: 'enabled',
            checks: 'hidden',
            walkthroughs: 'hidden',
            templates: 'hidden',
            videos: 'enabled',
            actionItems: 'enabled',
            stores: 'hidden',
            users: 'hidden',
            brands: 'hidden',
            inspectorQueue: 'enabled',
            adminQueue: 'hidden',
            adminUsers: 'hidden',
            billing: 'hidden',
            teamManagement: 'hidden',
            apiAccess: 'hidden',
          };
        }

        // Full Enterprise Mode (ADMIN)
        return {
          navigationMode: 'ENTERPRISE_MODE',
          showLogo: true,
          showUserEmail: true,
          showSkipToDashboard: false,

          // Main navigation - Command Center view
          home: 'enabled',
          microChecks: 'enabled', // Aggregated view only
          aiCoach: 'enabled', // Aggregated insights, no upload
          inspections: 'enabled', // Full access
          actions: 'enabled', // Filter by region/severity
          insights: 'enabled', // Heatmaps, regions
          profile: 'enabled',
          settings: 'enabled', // Manage inspectors, standards
          integrations: 'enabled',

          // System Administration (Admin has access)
          systemBrands: 'enabled',
          systemUsers: 'enabled',
          systemQueue: 'enabled',

          // Legacy navigation
          dashboard: 'enabled',
          checks: 'enabled',
          walkthroughs: 'enabled',
          templates: 'enabled',
          videos: 'enabled',
          actionItems: 'enabled',
          stores: 'enabled',
          users: 'enabled',
          brands: 'enabled',
          inspectorQueue: 'enabled',
          adminQueue: 'enabled',
          adminUsers: 'enabled',
          billing: 'hidden',
          teamManagement: 'hidden',
          apiAccess: 'hidden',
        };
      }

      // MULTI-STORE MODE - Multi-Store Owner (OWNER, GM with 2+ stores)
      // Daily Actions: Overview, Micro-Checks, AI Walkthroughs
      // Insights & Setup: Store Performance, Templates, Team, Settings
      if (navigationMode === 'MULTI_STORE_MODE') {
        return {
          navigationMode: 'MULTI_STORE_MODE',
          showLogo: true,
          showUserEmail: true,
          showSkipToDashboard: false,

          // Main navigation
          home: 'enabled', // Brand summary / Overview
          microChecks: 'enabled',
          aiCoach: isUnlocked('ai-coach') ? 'enabled' : 'teaser',
          inspections: isUnlocked('inspections') ? 'enabled' : 'teaser', // Show teaser "Add Corporate Plan"
          actions: 'enabled', // Rollup + assign to stores
          insights: isUnlocked('insights') ? 'enabled' : 'teaser', // Store comparisons / Store Performance
          profile: 'enabled',
          settings: 'enabled', // Add/remove stores, manage users
          integrations: 'enabled',

          // System Administration
          systemBrands: 'hidden',
          systemUsers: 'hidden',
          systemQueue: 'hidden',

          // Legacy navigation
          dashboard: 'enabled',
          checks: 'enabled',
          walkthroughs: 'enabled',
          templates: 'enabled',
          videos: 'enabled',
          actionItems: 'enabled',
          stores: 'enabled',
          users: 'enabled', // "Team" in Multi-Store Mode
          brands: 'hidden',
          inspectorQueue: 'hidden',
          adminQueue: 'hidden',
          adminUsers: 'hidden',
          billing: 'hidden',
          teamManagement: 'hidden',
          apiAccess: 'hidden',
        };
      }

      // Fallback - minimal access (shouldn't reach here for non-trial users)
      return {
        navigationMode: 'TRIAL_MODE', // Default to trial mode for fallback
        showLogo: true,
        showUserEmail: true,
        showSkipToDashboard: false,
        home: 'enabled',
        microChecks: 'enabled',
        aiCoach: 'hidden',
        inspections: 'hidden',
        actions: 'enabled',
        insights: 'hidden',
        profile: 'enabled',
        settings: 'enabled',
        integrations: 'enabled',
        systemBrands: 'hidden',
        systemUsers: 'hidden',
        systemQueue: 'hidden',
        dashboard: 'enabled',
        checks: 'enabled',
        walkthroughs: 'hidden',
        templates: 'hidden',
        videos: 'hidden',
        actionItems: 'enabled',
        stores: 'enabled',
        users: 'hidden',
        brands: 'hidden',
        inspectorQueue: 'hidden',
        adminQueue: 'hidden',
        adminUsers: 'hidden',
        billing: 'hidden',
        teamManagement: 'hidden',
        apiAccess: 'hidden',
      };
    }

    // TRIAL MODE - Store Manager (TRIAL_ADMIN, GM with 1 store, trial users)
    // Daily Actions: Dashboard, Micro-Checks, AI Walkthrough
    // Insights: My Progress
    // Settings: Settings
    // Goal: Start simple, feel progress fast
    const trial = user.trial_status;
    const hasCompletedDemo = !!user.demo_completed_at;
    const hasUploadedVideo = (trial?.videos_used || 0) > 0;
    const hasInspections = (user.total_inspections || 0) > 0;

    const state: NavigationState = {
      // Always visible during trial
      navigationMode: 'TRIAL_MODE',
      showLogo: true,
      showUserEmail: true,
      showSkipToDashboard: !hasCompletedDemo,

      // Main navigation - Progressive unlock for Mode 1
      home: 'enabled', // Always visible - Dashboard
      microChecks: 'enabled', // Daily Actions - run checks
      aiCoach: isUnlocked('ai-coach') ? 'enabled' : 'teaser', // Daily Actions - AI Walkthrough
      inspections: 'hidden', // Hide inspections in trial for simplicity
      actions: 'enabled', // Simple to-do list
      insights: 'enabled', // Insights (Lite) - Customer + Operational voices visible
      profile: 'enabled',
      settings: 'enabled', // Settings section
      integrations: 'hidden',

      // System Administration - Hidden for trial
      systemBrands: 'hidden',
      systemUsers: 'hidden',
      systemQueue: 'hidden',

      // Legacy navigation
      dashboard: hasCompletedDemo ? 'enabled' : user.has_seen_demo ? 'visible-disabled' : 'hidden',
      checks: 'enabled',
      walkthroughs: 'hidden',
      templates: 'enabled',
      videos: hasUploadedVideo ? 'enabled' : 'hidden',
      actionItems: 'enabled',
      stores: 'enabled',
      users: 'enabled',
      brands: 'hidden',
      inspectorQueue: 'hidden',
      adminQueue: 'hidden',
      adminUsers: 'hidden',
      billing: 'hidden',
      teamManagement: 'hidden',
      apiAccess: 'hidden',
    };

    return state;
  }, [user, isUnlocked]);
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
import { useAuth } from './useAuth';
import { featureRegistry, FeatureKey } from '@/config/featureRegistry';

export function useFeatureGates() {
  const { user } = useAuth();

  // User progress data
  const microChecksCompleted = user?.trial_status?.videos_used ?? 0; // Using videos as proxy for checks
  const stores = user?.trial_status?.stores_used ?? 1;
  const isTrialUser = user?.is_trial_user ?? false;
  const role = user?.role;

  // Determine tier
  const tier = role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'enterprise' :
               isTrialUser ? 'trial' : 'paid';

  const isUnlocked = (featureKey: FeatureKey): boolean => {
    const feature = featureRegistry[featureKey];

    // Super Admin and Admin always have access
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;

    // Inspectors have limited access
    if (role === 'INSPECTOR') {
      return featureKey === 'inspections';
    }

    // Check unlock conditions
    if (feature.unlock.type === 'upgrade') {
      if (feature.unlock.plan === 'enterprise') {
        // Enterprise features locked for non-enterprise users
        return tier === 'enterprise';
      }
      // General upgrade features
      if (featureKey === 'insights') {
        return true; // Show Insights (Lite) in trial - gate premium sections inside the page
      }
      return tier !== 'trial';
    }

    if (feature.unlock.type === 'action') {
      if (featureKey === 'ai-coach') {
        // AI Coach unlocks after threshold micro checks
        return microChecksCompleted >= (feature.unlock.threshold ?? 3);
      }
    }

    return false;
  };

  const getProgress = (featureKey: FeatureKey): string => {
    const feature = featureRegistry[featureKey];

    if (isUnlocked(featureKey)) return '';

    if (feature.unlock.type === 'action' && featureKey === 'ai-coach') {
      const threshold = feature.unlock.threshold ?? 3;
      const progress = Math.min(microChecksCompleted, threshold);
      return `${progress}/${threshold}`;
    }

    return feature.unlock.hint;
  };

  return {
    isUnlocked,
    getProgress,
    registry: featureRegistry
  };
}

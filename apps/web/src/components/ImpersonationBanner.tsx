import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function ImpersonationBanner() {
  const { impersonationContext, stopImpersonation } = useAuth();

  // Don't show if not impersonating
  if (!impersonationContext?.is_impersonating || !impersonationContext.impersonated_user) {
    return null;
  }

  const handleStopImpersonation = async () => {
    try {
      await stopImpersonation();
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
    }
  };

  return (
    <div className="bg-amber-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-semibold">Viewing as:</span>
              <span className="font-bold">
                {impersonationContext.impersonated_user.full_name}
              </span>
              <span className="text-sm">({impersonationContext.impersonated_user.email})</span>
              {impersonationContext.impersonated_user.account_name && (
                <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
                  {impersonationContext.impersonated_user.account_name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleStopImpersonation}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
          >
            <X className="h-4 w-4" />
            <span>Stop Impersonation</span>
          </button>
        </div>
      </div>
    </div>
  );
}

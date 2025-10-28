import { AlertTriangle, Clock, Upload, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { TrialStatus } from '@/types';

interface TrialStatusBannerProps {
  className?: string;
  onUpgradeClick?: () => void;
}

export default function TrialStatusBanner({ className = '', onUpgradeClick }: TrialStatusBannerProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!user?.trial_status?.is_trial || isDismissed) {
    return null;
  }

  const trial = user.trial_status;
  
  // Don't show banner if trial is expired (should be handled elsewhere)
  if (trial.is_expired) {
    return null;
  }

  const getUrgencyLevel = (): 'low' | 'medium' | 'high' | 'critical' => {
    const daysLeft = trial.days_remaining || 0;
    const hoursLeft = trial.hours_remaining || 0;
    const videosUsed = trial.videos_used || 0;

    // Critical urgency (< 24 hours or 9+ videos used)
    if (hoursLeft <= 24 || videosUsed >= 9) {
      return 'critical';
    }
    
    // High urgency (< 2 days or 7+ videos used)
    if (daysLeft <= 2 || videosUsed >= 7) {
      return 'high';
    }
    
    // Medium urgency (< 4 days or 5+ videos used)
    if (daysLeft <= 4 || videosUsed >= 5) {
      return 'medium';
    }
    
    return 'low';
  };

  const urgency = getUrgencyLevel();

  const getBannerConfig = () => {
    const daysLeft = trial.days_remaining || 0;
    const hoursLeft = trial.hours_remaining || 0;
    const videosLeft = trial.videos_remaining || 0;

    switch (urgency) {
      case 'critical':
        return {
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          icon: AlertTriangle,
          title: hoursLeft <= 24 
            ? `⏰ Trial expires in ${hoursLeft} hours!`
            : '🚨 Almost out of trial videos!',
          message: hoursLeft <= 24
            ? `Don't lose access to AI inspections! You have ${videosLeft} video${videosLeft !== 1 ? 's' : ''} remaining.`
            : `Only ${videosLeft} video${videosLeft !== 1 ? 's' : ''} left in your trial. Upgrade now to keep analyzing.`,
          buttonText: 'Upgrade Now',
          buttonStyle: 'bg-red-600 hover:bg-red-700 text-white'
        };
        
      case 'high':
        return {
          bgColor: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
          icon: Clock,
          title: `⚡ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in trial`,
          message: `You've used ${trial.videos_used}/10 videos. Upgrade to continue with unlimited AI inspections.`,
          buttonText: 'Upgrade Trial',
          buttonStyle: 'bg-orange-600 hover:bg-orange-700 text-white'
        };
        
      case 'medium':
        return {
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          icon: Upload,
          title: '📈 Trial going well!',
          message: `${daysLeft} days remaining with ${videosLeft} video${videosLeft !== 1 ? 's' : ''} left. Ready to upgrade for unlimited access?`,
          buttonText: 'See Plans',
          buttonStyle: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
        
      default: {
        const hasCompletedChecks = (trial.videos_used || 0) > 0;
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          icon: Upload,
          title: '🚀 Welcome to your trial!',
          message: hasCompletedChecks
            ? `${daysLeft} days to explore AI-powered micro-checks. Keep checking daily to build your streak!`
            : `${daysLeft} days to explore AI-powered micro-checks. Complete your first check to get started.`,
          buttonText: 'Learn More',
          buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      }
    }
  };

  const config = getBannerConfig();
  const IconComponent = config.icon;

  return (
    <div className={`${config.bgColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <IconComponent className={`w-5 h-5 mt-0.5 ${config.iconColor} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm ${config.textColor}`}>
              {config.title}
            </h3>
            <p className={`text-sm mt-1 ${config.textColor} opacity-90`}>
              {config.message}
            </p>
            
            {/* Progress indicators for high/critical urgency */}
            {(urgency === 'high' || urgency === 'critical') && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={`${config.textColor} opacity-75`}>Videos used</span>
                  <span className={`${config.textColor} font-medium`}>
                    {trial.videos_used}/10
                  </span>
                </div>
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      urgency === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${((trial.videos_used || 0) / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
          <button
            onClick={onUpgradeClick}
            className={`${config.buttonStyle} px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center`}
          >
            {config.buttonText}
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          
          {urgency === 'low' && (
            <button
              onClick={() => setIsDismissed(true)}
              className={`${config.textColor} opacity-50 hover:opacity-75 p-1`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
import { Lock, ArrowRight } from 'lucide-react';
import { ProgressMeter } from './ProgressMeter';

interface VoiceLockedCardProps {
  title: string;
  message: string;
  progress?: {
    current: number;
    required: number;
  };
  ctaText: string;
  onCtaClick: () => void;
}

export function VoiceLockedCard({
  title,
  message,
  progress,
  ctaText,
  onCtaClick,
}: VoiceLockedCardProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{message}</p>

      {progress && (
        <div className="mb-6">
          <ProgressMeter
            current={progress.current}
            required={progress.required}
          />
        </div>
      )}

      <button
        onClick={onCtaClick}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <span className="text-sm font-medium">{ctaText}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

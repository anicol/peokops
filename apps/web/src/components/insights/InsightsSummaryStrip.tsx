import { Activity, Users, ClipboardCheck, TrendingUp } from 'lucide-react';
import { TrendIndicator } from './shared/TrendIndicator';

interface InsightsSummaryStripProps {
  storeHealth: {
    score: number;
    delta: number;
  };
  voices: {
    customer: { locked: boolean; available: boolean };
    employee: { locked: boolean };
    operational: { locked: boolean; available: boolean };
  };
  crossVoiceUnlocked: boolean;
}

export function InsightsSummaryStrip({
  storeHealth,
  voices,
  crossVoiceUnlocked,
}: InsightsSummaryStripProps) {
  const voiceChips = [
    {
      id: 'customer',
      label: 'Customer',
      icon: Users,
      active: !voices.customer.locked && voices.customer.available,
    },
    {
      id: 'employee',
      label: 'Employee',
      icon: Activity,
      active: !voices.employee.locked,
    },
    {
      id: 'operational',
      label: 'Operational',
      icon: ClipboardCheck,
      active: !voices.operational.locked && voices.operational.available,
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: TrendingUp,
      active: crossVoiceUnlocked,
    },
  ];

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Store Health Score */}
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Store Health</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{storeHealth.score}</span>
              <TrendIndicator value={storeHealth.delta} size="sm" />
            </div>
          </div>
        </div>

        {/* Right: Voice Chips */}
        <div className="flex items-center space-x-2">
          {voiceChips.map((voice) => {
            const Icon = voice.icon;
            return (
              <div
                key={voice.id}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  voice.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{voice.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

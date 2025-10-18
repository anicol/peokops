import { Sparkles, FileSearch, BarChart3, LucideIcon } from 'lucide-react';

export interface FeatureConfig {
  name: string;
  icon: LucideIcon;
  lockedRoute: string;
  description: string;
  previewUrl: string;
  unlock: {
    type: 'action' | 'upgrade';
    threshold?: number;
    plan?: string;
    hint: string;
  };
  ctas: {
    demo: boolean;
    upgrade: boolean;
  };
  testimonial?: string;
}

export const featureRegistry: Record<string, FeatureConfig> = {
  'ai-coach': {
    name: 'AI Coach',
    icon: Sparkles,
    lockedRoute: '/locked/ai-coach',
    description: 'Give every manager an AI-powered coach that spots issues early — privately, instantly, and without the pressure of inspection day.',
    previewUrl: '/assets/ai-coach-preview.mp4',
    unlock: { type: 'upgrade', hint: 'Upgrade' },
    ctas: { demo: false, upgrade: true },
    testimonial: 'Build confidence before the audit. AI that helps you shine — not get watched.',
  },
  inspections: {
    name: 'Inspections',
    icon: FileSearch,
    lockedRoute: '/locked/inspections',
    description: 'Invite inspectors to review videos, confirm findings, and track brand consistency.',
    previewUrl: '/assets/inspections-preview.png',
    unlock: { type: 'upgrade', plan: 'enterprise', hint: 'Upgrade' },
    ctas: { demo: false, upgrade: true },
    testimonial: 'Enterprise teams use Inspections to ensure consistent standards.',
  },
  insights: {
    name: 'Insights',
    icon: BarChart3,
    lockedRoute: '/locked/insights',
    description: 'See trends, top issues, and improvements over time across your stores.',
    previewUrl: '/assets/insights-preview.png',
    unlock: { type: 'upgrade', hint: 'Upgrade to unlock Insights' },
    ctas: { demo: false, upgrade: true },
    testimonial: 'Track performance and identify patterns across your business.',
  },
} as const;

export type FeatureKey = keyof typeof featureRegistry;

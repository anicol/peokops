import { ArrowRight } from 'lucide-react';
import DemoProgress from '../DemoProgress';

interface WelcomeStageProps {
  onComplete: () => void;
}

export default function WelcomeStage({ onComplete }: WelcomeStageProps) {
  return (
    <div className="bg-white min-h-screen">
      {/* Progress indicator */}
      <DemoProgress currentStage="welcome" />
      
      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20 text-center">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          Welcome to PeakOps
        </h1>

        {/* Body content */}
        <p className="text-lg md:text-xl text-gray-700 mb-8 leading-relaxed">
          Build operational excellence through simple daily habits.
        </p>
        <p className="text-lg md:text-xl text-gray-700 mb-12 leading-relaxed">
          3 quick checks every day. Get AI feedback instantly.
          Stay inspection-ready without the stress.
        </p>

        {/* Reassurance callout */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-12 max-w-xl mx-auto">
          <p className="text-teal-800 font-medium text-center">
            Private, takes 2 minutes, instant feedback.
          </p>
        </div>
        
        {/* CTA Button - Mobile optimized */}
        <button
          onClick={onComplete}
          className="bg-teal-600 hover:bg-teal-700 text-white py-4 px-8 md:py-4 md:px-8 rounded-lg font-medium text-lg transition-colors inline-flex items-center min-h-[50px] min-w-[200px] justify-center"
        >
          Let's Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
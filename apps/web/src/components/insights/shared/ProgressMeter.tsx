interface ProgressMeterProps {
  current: number;
  required: number;
}

export function ProgressMeter({ current, required }: ProgressMeterProps) {
  const percentage = Math.min((current / required) * 100, 100);
  const remaining = Math.max(required - current, 0);

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span className="font-medium">
          {current}/{required} surveys
        </span>
        {remaining > 0 && (
          <span className="text-gray-500">{remaining} to go</span>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

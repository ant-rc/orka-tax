'use client';

interface ReportLoaderProps {
  open: boolean;
  progress: number;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ReportLoader({ open, progress }: ReportLoaderProps) {
  if (!open) return null;

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = CIRCUMFERENCE * (1 - clampedProgress / 100);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-cyprus-950 rounded-2xl p-12 flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            {/* Background circle */}
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              stroke="white"
              strokeOpacity="0.12"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress arc */}
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              stroke="white"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <span className="absolute text-white text-3xl font-bold tabular-nums">
            {Math.round(clampedProgress)}%
          </span>
        </div>
        <p className="text-white text-sm">Veuillez patienter…</p>
      </div>
    </div>
  );
}

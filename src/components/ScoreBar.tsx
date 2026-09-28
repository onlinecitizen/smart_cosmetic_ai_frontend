"use client";

export function ScoreBar({
  label,
  value,
  helpText,
  invert = false,
}: {
  label: string;
  value: number;
  helpText: string;
  invert?: boolean;
}) {
  const pct = Math.round(value * 100);
  const good = invert ? value < 0.4 : value > 0.6;
  const warn = invert ? value >= 0.4 && value <= 0.6 : value >= 0.4 && value <= 0.6;
  const color = good ? "bg-brand-500" : warn ? "bg-yellow-500" : "bg-red-400";

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-brand-700">{label}</span>
        <span className="text-brand-500">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-brand-100 overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-brand-400 mt-1">{helpText}</p>
    </div>
  );
}

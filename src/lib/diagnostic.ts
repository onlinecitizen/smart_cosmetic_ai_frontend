/**
 * Skin metrics as defined by the backend (app/providers/diagnostic.py):
 * every score is 0.0-1.0 and shown here as 0-100.
 */
export type MetricKey = "hydration" | "redness" | "pore_density" | "barrier_index";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  /** What a higher number means, in plain language. */
  scale: string;
}

export const METRICS: MetricDefinition[] = [
  { key: "hydration", label: "Hydration", scale: "Higher means more hydrated." },
  { key: "redness", label: "Redness", scale: "Higher means more visible redness." },
  { key: "pore_density", label: "Pore density", scale: "Higher means more visible pores." },
  { key: "barrier_index", label: "Barrier index", scale: "Higher means a stronger skin barrier." },
];

export function metricLabel(key: string): string {
  return METRICS.find((m) => m.key === key)?.label ?? key.replace(/_/g, " ");
}

/** 0.0-1.0 -> whole number 0-100. */
export function toScore(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

/**
 * True when a result came from a development provider. The backend records
 * "mock" for the demo skin provider and "mock" / "mock-fallback" for the demo
 * climate provider. Such results must always be labelled as demonstrations.
 */
export function isDemoProvider(provider: string | null | undefined): boolean {
  return !provider || provider.startsWith("mock");
}

/** Backend confidence below this is shown with a "may be unreliable" warning. */
export const LOW_CONFIDENCE = 0.5;

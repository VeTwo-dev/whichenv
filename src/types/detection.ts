/**
 * Confidence level for a detection result.
 * Ranges from 0 (no confidence) to 100 (absolute certainty).
 */
export type ConfidenceScore = number;

/**
 * Severity levels for diagnostics and recommendations.
 */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/**
 * A single piece of evidence supporting a detection.
 */
export interface Evidence {
  source: string;
  type: "file" | "dependency" | "config" | "lockfile" | "structure" | "code" | "env" | "git";
  detail: string;
  path?: string;
  timestamp?: number;
}

/**
 * The result of a single detection run.
 * Generic over T so each detector returns a strongly-typed value.
 */
export interface DetectionResult<T = unknown> {
  detected: boolean;
  name: string;
  value: T | null;
  version: string | null;
  confidence: ConfidenceScore;
  evidence: Evidence[];
  reasoning: string;
  duration: number;
  error?: string;
}

/**
 * A group of detection results for a category.
 */
export interface DetectionGroup<T = unknown> {
  category: string;
  results: DetectionResult<T>[];
  primary: DetectionResult<T> | null;
  totalConfidence: ConfidenceScore;
}

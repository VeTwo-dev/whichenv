import type { ConfidenceScore, Evidence } from "../types/detection.js";

/**
 * Calculate confidence from multiple evidence sources.
 * Uses a weighted voting system.
 */
export function calculateConfidence(evidence: Evidence[]): ConfidenceScore {
  if (evidence.length === 0) return 0;

  const sourceWeights: Record<string, number> = {
    config: 0.9,
    dependency: 0.85,
    lockfile: 0.95,
    file: 0.7,
    structure: 0.6,
    code: 0.8,
    env: 0.5,
    git: 0.3,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const e of evidence) {
    const weight = sourceWeights[e.type] ?? 0.5;
    weightedSum += weight;
    totalWeight += 1;
  }

  if (totalWeight === 0) return 0;

  const baseConfidence = (weightedSum / totalWeight) * 100;

  // Multiple independent sources boost confidence
  const diversityBonus = Math.min(evidence.length * 3, 15);

  // Cap at 100
  return Math.min(Math.round(baseConfidence + diversityBonus), 100);
}

/**
 * Merge confidence scores from multiple detections.
 */
export function mergeConfidence(scores: number[]): ConfidenceScore {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return scores[0]!;

  // Use the highest score, boosted by agreement
  const sorted = [...scores].sort((a, b) => b - a);
  const top = sorted[0]!;
  const agreement = scores.filter(s => s >= 50).length / scores.length;

  return Math.min(Math.round(top * (0.85 + agreement * 0.15)), 100);
}

/**
 * Confidence level label.
 */
export function confidenceLabel(score: ConfidenceScore): string {
  if (score >= 90) return "very-high";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  if (score >= 30) return "low";
  return "very-low";
}

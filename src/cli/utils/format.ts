import pc from "picocolors";

export function formatConfidence(score: number): string {
  const barWidth = 20;
  const filled = Math.round((score / 100) * barWidth);
  const empty = barWidth - filled;

  let color: (str: string) => string;
  if (score >= 80) color = pc.green;
  else if (score >= 60) color = pc.yellow;
  else if (score >= 40) color = pc.yellow;
  else color = pc.red;

  const bar = color("█".repeat(filled)) + pc.dim("░".repeat(empty));
  return `${bar} ${color(`${score}%`)}`;
}

export function formatVersion(version: string | null): string {
  if (!version) return pc.dim("—");
  return pc.cyan(`v${version}`);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatHealthScore(score: number): { label: string; color: (str: string) => string } {
  if (score >= 70) return { label: "Excellent", color: pc.green };
  if (score >= 50) return { label: "Good", color: pc.green };
  if (score >= 40) return { label: "Fair", color: pc.yellow };
  return { label: "Needs Improvement", color: pc.red };
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + " ".repeat(len - str.length);
}

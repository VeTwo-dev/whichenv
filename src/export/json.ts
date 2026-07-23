import type { SerializedProjectAnalysis } from "../types/project.js";

export function toJSON(data: SerializedProjectAnalysis): string {
  return JSON.stringify(data, null, 2);
}

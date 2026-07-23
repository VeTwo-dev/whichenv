import type { DetectionResult } from "../types/detection.js";
import type {
  DetectionContext,
  PipelineStage,
  PipelineConfig,
} from "../types/plugin.js";
import type { PluginRegistry } from "./plugin-system.js";
import { EventEmitter } from "../events.js";
import type { WhichenvEvents } from "../types/plugin.js";

const DEFAULT_STAGES: PipelineStage[] = [
  { name: "runtime", description: "Detect runtime environment", detectors: ["runtime"], parallel: false, required: true },
  { name: "workspace", description: "Detect workspace/monorepo setup", detectors: ["workspace"], parallel: false, required: false },
  { name: "package-manager", description: "Detect package manager", detectors: ["package-manager"], parallel: false, required: false },
  { name: "frameworks", description: "Detect frameworks", detectors: ["framework"], parallel: true, required: false },
  { name: "tooling", description: "Detect build tools, linting, formatting", detectors: ["build-tool", "linting", "formatting", "testing"], parallel: true, required: false },
  { name: "language", description: "Detect language and config", detectors: ["language"], parallel: false, required: false },
  { name: "styling", description: "Detect CSS/styling frameworks", detectors: ["css"], parallel: true, required: false },
  { name: "data", description: "Detect databases and APIs", detectors: ["database", "api"], parallel: true, required: false },
  { name: "ecosystem", description: "Detect state management, UI, auth", detectors: ["state-management", "ui-library", "auth"], parallel: true, required: false },
  { name: "deployment", description: "Detect deployment targets", detectors: ["deployment"], parallel: false, required: false },
  { name: "environment", description: "Detect git and env files", detectors: ["git", "environment"], parallel: true, required: false },
  { name: "config", description: "Detect configuration files", detectors: ["config-file"], parallel: false, required: false },
  { name: "dependencies", description: "Analyze dependencies", detectors: ["dependency"], parallel: false, required: false },
];

export interface PipelineResult {
  results: Map<string, DetectionResult>;
  duration: number;
  stageTimings: Map<string, number>;
}

export class DetectionPipeline {
  private stages: PipelineStage[];
  private emitter: EventEmitter<WhichenvEvents>;
  private concurrency: number;
  private timeout: number;

  constructor(config?: Partial<PipelineConfig>) {
    this.stages = config?.stages ?? DEFAULT_STAGES;
    this.concurrency = config?.concurrency ?? 4;
    this.timeout = config?.timeout ?? 30_000;
    this.emitter = new EventEmitter();
  }

  async execute(
    registry: PluginRegistry,
    context: DetectionContext,
  ): Promise<PipelineResult> {
    const results = new Map<string, DetectionResult>();
    const stageTimings = new Map<string, number>();
    const startTime = Date.now();

    await this.emitter.emit("detection:start", { root: context.root });

    for (const stage of this.stages) {
      const stageStart = Date.now();
      await this.emitter.emit("pipeline:stage:start", { stage: stage.name });

      const detectors = stage.detectors
        .map(name => ({ name, plugin: registry.get(name) }))
        .filter((d): d is { name: string; plugin: NonNullable<typeof d.plugin> } => d.plugin !== undefined);

      if (detectors.length === 0) {
        stageTimings.set(stage.name, Date.now() - stageStart);
        continue;
      }

      if (stage.parallel) {
        const promises = detectors.map(async ({ name, plugin }) => {
          const detectorStart = Date.now();
          try {
            await this.emitter.emit("detection:progress", {
              stage: stage.name,
              detector: name,
              progress: 0,
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const result = await Promise.race([
              plugin.detect({ ...context, signal: controller.signal }),
              new Promise<never>((_, reject) => {
                controller.signal.addEventListener("abort", () => {
                  reject(new Error(`Detector "${name}" timed out after ${this.timeout}ms`));
                });
              }),
            ]);

            clearTimeout(timeoutId);
            results.set(name, result);

            await this.emitter.emit("detection:result", { detector: name, result });
          } catch (error) {
            const errResult: DetectionResult = {
              detected: false,
              name,
              value: null,
              version: null,
              confidence: 0,
              evidence: [],
              reasoning: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
              duration: Date.now() - detectorStart,
              error: error instanceof Error ? error.message : String(error),
            };
            results.set(name, errResult);
            await this.emitter.emit("detection:error", { detector: name, error: error instanceof Error ? error : new Error(String(error)) });
          }
        });

        await Promise.allSettled(promises);
      } else {
        for (const { name, plugin } of detectors) {
          const detectorStart = Date.now();
          try {
            await this.emitter.emit("detection:progress", {
              stage: stage.name,
              detector: name,
              progress: 0,
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const result = await Promise.race([
              plugin.detect({ ...context, signal: controller.signal }),
              new Promise<never>((_, reject) => {
                controller.signal.addEventListener("abort", () => {
                  reject(new Error(`Detector "${name}" timed out after ${this.timeout}ms`));
                });
              }),
            ]);

            clearTimeout(timeoutId);
            results.set(name, result);
            context.previousResults.set(name, result);

            await this.emitter.emit("detection:result", { detector: name, result });
          } catch (error) {
            const errResult: DetectionResult = {
              detected: false,
              name,
              value: null,
              version: null,
              confidence: 0,
              evidence: [],
              reasoning: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
              duration: Date.now() - detectorStart,
              error: error instanceof Error ? error.message : String(error),
            };
            results.set(name, errResult);
            await this.emitter.emit("detection:error", { detector: name, error: error instanceof Error ? error : new Error(String(error)) });
          }
        }
      }

      stageTimings.set(stage.name, Date.now() - stageStart);
      await this.emitter.emit("pipeline:stage:complete", { stage: stage.name, duration: Date.now() - stageStart });
    }

    const totalDuration = Date.now() - startTime;
    await this.emitter.emit("detection:complete", { duration: totalDuration, results });

    return { results, duration: totalDuration, stageTimings };
  }

  on<K extends keyof WhichenvEvents & string>(event: K, callback: (data: WhichenvEvents[K]) => void | Promise<void>): () => void {
    return this.emitter.on(event, callback);
  }

  getStages(): PipelineStage[] {
    return [...this.stages];
  }
}

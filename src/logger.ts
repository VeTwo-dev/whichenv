import type { Logger } from "./types/plugin.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

export class WhichenvLogger implements Logger {
  private level: number;
  private prefix: string;
  private stream: NodeJS.WriteStream;

  constructor(options?: { level?: LogLevel; prefix?: string; stream?: NodeJS.WriteStream }) {
    this.level = LEVEL_PRIORITY[options?.level ?? "info"];
    this.prefix = options?.prefix ?? "whichenv";
    this.stream = options?.stream ?? process.stderr;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log("debug", message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log("info", message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log("warn", message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log("error", message, args);
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (LEVEL_PRIORITY[level] < this.level) return;

    const color = LEVEL_COLORS[level];
    const tag = `${DIM}${new Date().toISOString().slice(11, 23)}${RESET}`;
    const levelTag = `${color}${level.toUpperCase().padEnd(5)}${RESET}`;
    const prefix = `${BOLD}${this.prefix}${RESET}`;
    const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a, null, 0)).join(" ")}` : message;

    this.stream.write(`${tag} ${levelTag} ${prefix} ${msg}\n`);
  }

  child(prefix: string): WhichenvLogger {
    return new WhichenvLogger({
      level: Object.keys(LEVEL_PRIORITY).find(k => LEVEL_PRIORITY[k as LogLevel] === this.level) as LogLevel,
      prefix: `${this.prefix}:${prefix}`,
      stream: this.stream,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = LEVEL_PRIORITY[level];
  }
}

export function createLogger(options?: { level?: LogLevel; prefix?: string }): WhichenvLogger {
  return new WhichenvLogger(options);
}

export const logger = createLogger();

import pc from "picocolors";

export const theme = {
  icons: {
    checkmark: pc.green("✔"),
    warning: pc.yellow("⚠"),
    error: pc.red("✖"),
    info: pc.blue("ℹ"),
    arrow: pc.dim("→"),
    bullet: pc.dim("•"),
    diamond: pc.cyan("◆"),
    star: pc.yellow("★"),
    sparkle: pc.cyan("✦"),
    gear: pc.dim("⚙"),
    folder: pc.blue("📁"),
    file: pc.dim("📄"),
    link: pc.cyan("🔗"),
    clock: pc.dim("⏱"),
    globe: pc.blue("🌐"),
    rocket: pc.magenta("🚀"),
    shield: pc.green("🛡"),
    beaker: pc.magenta("🧪"),
    chart: pc.cyan("📊"),
    wrench: pc.yellow("🔧"),
    check: pc.green("✓"),
    cross: pc.red("✗"),
    dot: pc.dim("·"),
    hLine: pc.dim("─"),
    vLine: pc.dim("│"),
    topLeft: pc.dim("┌"),
    topRight: pc.dim("┐"),
    bottomLeft: pc.dim("└"),
    bottomRight: pc.dim("┘"),
    tee: pc.dim("├"),
    teeRight: pc.dim("┤"),
  },

  colors: {
    primary: pc.cyan,
    success: pc.green,
    warning: pc.yellow,
    danger: pc.red,
    muted: pc.dim,
    bold: pc.bold,
    highlight: pc.magenta,
    accent: pc.blue,
  },

  box: {
    horizontal: "─",
    vertical: "│",
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    teeDown: "┬",
    teeUp: "┴",
    teeLeft: "├",
    teeRight: "┤",
    cross: "┼",
  },

  confidenceColor(score: number): (str: string) => string {
    if (score >= 80) return pc.green;
    if (score >= 60) return pc.yellow;
    if (score >= 40) return pc.yellow;
    return pc.red;
  },

  healthColor(score: number): (str: string) => string {
    if (score >= 70) return pc.green;
    if (score >= 40) return pc.yellow;
    return pc.red;
  },

  severityColor(severity: string): (str: string) => string {
    switch (severity) {
      case "critical":
      case "error":
        return pc.red;
      case "high":
      case "warning":
        return pc.yellow;
      case "medium":
      case "suggestion":
        return pc.blue;
      case "low":
      case "info":
        return pc.dim;
      default:
        return (s: string) => s;
    }
  },

  severityIcon(severity: string): string {
    switch (severity) {
      case "critical":
      case "error":
        return pc.red("✖");
      case "high":
      case "warning":
        return pc.yellow("⚠");
      case "medium":
      case "suggestion":
        return pc.blue("ℹ");
      case "low":
      case "info":
        return pc.dim("·");
      default:
        return " ";
    }
  },
} as const;

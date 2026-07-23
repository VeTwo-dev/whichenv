import { execSync } from "node:child_process";
import type {
  DetectionContext,
  DetectionResult,
  GitInfo,
  DetectorPlugin,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

function git(args: string, cwd: string): string | null {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
}

function detectProvider(remoteUrl: string): string | null {
  if (/github\.com[:/]/i.test(remoteUrl)) return "GitHub";
  if (/gitlab\.com[:/]/i.test(remoteUrl)) return "GitLab";
  if (/bitbucket\.org[:/]/i.test(remoteUrl)) return "Bitbucket";
  if (/azure\.com[:/]/i.test(remoteUrl)) return "Azure DevOps";
  if (/codeberg\.org[:/]/i.test(remoteUrl)) return "Codeberg";
  return null;
}

interface CommitLine {
  hash: string;
  message: string;
  date: string;
}

function parseCommits(raw: string): Array<{ hash: string; message: string; date: string }> {
  const commits: CommitLine[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^(\S+)\s+(.+?)\s+(\d{4}-\d{2}-\d{2})/);
    if (match && match[1] && match[2] && match[3]) {
      commits.push({
        hash: match[1],
        message: match[2],
        date: match[3],
      });
    }
  }
  return commits;
}

export const detector: DetectorPlugin = {
  meta: {
    name: "git",
    version: "1.0.0",
    description: "Detects git repository information and provider",
    author: "whichenv",
    stage: "environment",
    priority: 45,
    dependencies: [],
    tags: ["git", "vcs", "provider"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<GitInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const root = git("rev-parse --show-toplevel", ctx.root);
    if (!root) {
      return {
        detected: false,
        name: "git",
        value: null,
        version: null,
        confidence: 0,
        evidence: [],
        reasoning: "Git is not available or this is not a git repository",
        duration: performance.now() - start,
      };
    }

    evidence.addGit("git-detector", `Git repository root: ${root}`);

    const branch = git("branch --show-current", ctx.root);
    if (branch) {
      evidence.addGit("git-detector", `Current branch: ${branch}`);
    }

    const remote = git("remote get-url origin", ctx.root);
    if (remote) {
      evidence.addGit("git-detector", `Origin remote: ${remote}`);
    }

    const provider = remote ? detectProvider(remote) : null;
    if (provider) {
      evidence.addGit("git-detector", `Detected provider: ${provider}`);
    }

    const statusOutput = git("status --porcelain", ctx.root);
    const dirty = statusOutput !== null && statusOutput.length > 0;
    if (dirty) {
      evidence.addGit("git-detector", "Working directory has uncommitted changes");
    }

    const tagsRaw = git('tag --sort=-creatordate | head -5', ctx.root);
    const tags = tagsRaw ? tagsRaw.split("\n").filter((t) => t.trim()) : [];

    const commitsRaw = git('log --oneline -5 --format="%h %s %ai"', ctx.root);
    const recentCommits = commitsRaw ? parseCommits(commitsRaw) : [];

    const value: GitInfo = {
      root,
      branch,
      remote,
      provider,
      dirty,
      tags,
      recentCommits,
    };

    const duration = performance.now() - start;

    return {
      detected: true,
      name: "git",
      value,
      version: null,
      confidence: 95,
      evidence: evidence.getAll(),
      reasoning: `Git repository detected${provider ? ` hosted on ${provider}` : ""}${branch ? ` on branch "${branch}"` : ""}`,
      duration,
    };
  },
};

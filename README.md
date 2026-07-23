# @vetwo/whichenv

The most advanced JavaScript & TypeScript Project Intelligence Engine.

Automatically discovers and analyzes every aspect of any JavaScript or TypeScript project — frameworks, runtimes, build tools, databases, APIs, testing, linting, deployment, and much more.

## Features

- **30+ detection categories** — runtime, package manager, workspace, frameworks, build tools, language, CSS, databases, APIs, testing, linting, formatting, state management, UI libraries, auth, deployment, git, environment, config files, dependencies
- **Confidence scoring** — every detection includes a confidence score with evidence
- **Plugin architecture** — write custom detectors, extend the engine
- **Interactive CLI wizard** — beautiful TUI with keyboard navigation
- **Multiple export formats** — JSON, Markdown, HTML, YAML, CSV, Mermaid, Graphviz
- **Health scoring** — 0-100 score across architecture, dependencies, testing, security, performance, maintainability
- **Intelligent recommendations** — actionable suggestions to improve your project
- **Zero configuration** — works out of the box with any project

## Quick Start

### CLI

```bash
# Interactive wizard
npx whichenv

# Detect and print results
npx whichenv detect

# Project summary dashboard
npx whichenv summary

# Run diagnostics
npx whichenv doctor

# Generate dependency graph
npx whichenv graph

# Export results
npx whichenv export --format markdown --output report.md
```

### Programmatic API

```ts
import { detectProject } from "@vetwo/whichenv";

const project = await detectProject();

// Check what was detected
console.log(project.summary());
console.log(project.isReact());    // true/false
console.log(project.isNext());     // true/false
console.log(project.isNode());     // true/false
console.log(project.hasTailwind()); // true/false
console.log(project.hasVitest());   // true/false

// Get health score
console.log(`Health: ${project.metrics.healthScore}/100`);

// Get recommendations
for (const rec of project.recommendations) {
  console.log(`[${rec.severity}] ${rec.title}: ${rec.description}`);
}

// Export
console.log(project.toMarkdown());
console.log(project.toJSON());
console.log(project.toMermaid());
```

## Detection Categories

| Category | What it detects |
|----------|----------------|
| Runtime | Node.js, Bun, Deno, Electron, React Native, Expo, Cloudflare Workers, Vercel Edge, etc. |
| Package Manager | npm, pnpm, Yarn (Classic/Berry), Bun, Deno |
| Workspace | Turborepo, Nx, Lerna, Rush, Moonrepo, pnpm/Yarn/npm workspaces |
| Frameworks | React, Next.js, Vue, Nuxt, Angular, Svelte, SvelteKit, Astro, Remix, Solid, Express, Fastify, NestJS, Hono, and 15+ more |
| Build Tools | Vite, Webpack, Rspack, Rolldown, Rollup, esbuild, tsup, SWC, Babel, unbuild |
| Language | JavaScript, TypeScript, JSX, TSX, ESM, CommonJS, tsconfig analysis |
| CSS | Tailwind CSS, UnoCSS, PostCSS, Sass, Emotion, Styled Components, Vanilla Extract, CSS Modules |
| Database | Prisma, Drizzle, MikroORM, Sequelize, TypeORM, Mongoose, PostgreSQL, MySQL, SQLite, MongoDB |
| API | REST, GraphQL, tRPC, gRPC, OpenAPI/Swagger |
| Testing | Vitest, Jest, Playwright, Cypress, AVA, Mocha |
| Linting | ESLint, Biome, Oxlint |
| Formatting | Prettier, Biome, dprint |
| State Management | Redux, Zustand, MobX, Jotai, Pinia, XState |
| UI Libraries | Material UI, Chakra UI, Ant Design, Mantine, Radix UI, shadcn/ui |
| Auth | Auth.js, Better Auth, Clerk, Firebase Auth, Lucia, Passport |
| Deployment | Docker, GitHub Actions, GitLab CI, Vercel, Railway, Netlify, Fly.io |
| Git | Branch, remote, provider, dirty state, tags, recent commits |
| Environment | .env files and variable names (never exposes secrets) |

## Plugin System

```ts
import { detectProject, type DetectorPlugin } from "@vetwo/whichenv";

const myPlugin: DetectorPlugin = {
  meta: {
    name: "my-custom-detector",
    version: "1.0.0",
    description: "Detects my custom tool",
    author: "me",
    stage: "tooling",
    priority: 50,
    dependencies: [],
    tags: ["custom"],
  },
  async detect(ctx) {
    const hasMyTool = ctx.packageJson?.dependencies?.["my-tool"];
    return {
      detected: !!hasMyTool,
      name: "my-tool",
      value: hasMyTool ? { name: "my-tool" } : null,
      version: hasMyTool ? String(hasMyTool) : null,
      confidence: hasMyTool ? 90 : 0,
      evidence: hasMyTool ? [{ source: "package.json", type: "dependency", detail: "Found my-tool" }] : [],
      reasoning: hasMyTool ? "Detected my-tool in dependencies" : "my-tool not found",
      duration: 0,
    };
  },
};
```

## Architecture

```
src/
├── types/          All TypeScript types (zero deps)
├── utils/          Logger, events, filesystem abstraction
├── cache/          In-memory and filesystem caching
├── core/           Plugin system, pipeline, engine
├── detectors/      20 built-in detection plugins
├── analysis/       Health scoring, recommendations, intelligence
├── export/         JSON, Markdown, HTML, YAML, CSV, Mermaid, Graphviz
└── cli/            Interactive TUI wizard
```

## License

MIT
# whichenv

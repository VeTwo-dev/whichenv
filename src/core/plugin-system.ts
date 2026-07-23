import type {
  DetectorPlugin,
  PluginRegistryInterface,
  PluginMeta,
} from "../types/plugin.js";

export class PluginRegistry implements PluginRegistryInterface {
  private plugins = new Map<string, DetectorPlugin>();
  private disabled = new Set<string>();

  register(plugin: DetectorPlugin): void {
    if (this.plugins.has(plugin.meta.name)) {
      throw new Error(`Plugin "${plugin.meta.name}" is already registered`);
    }
    this.plugins.set(plugin.meta.name, plugin);
  }

  get(name: string): DetectorPlugin | undefined {
    if (this.disabled.has(name)) return undefined;
    return this.plugins.get(name);
  }

  getByStage(stage: string): DetectorPlugin[] {
    return this.getAllEnabled()
      .filter(p => p.meta.stage === stage)
      .sort((a, b) => b.meta.priority - a.meta.priority);
  }

  getAll(): DetectorPlugin[] {
    return [...this.plugins.values()];
  }

  getAllEnabled(): DetectorPlugin[] {
    return this.getAll().filter(p => !this.disabled.has(p.meta.name));
  }

  enable(name: string): void {
    this.disabled.delete(name);
  }

  disable(name: string): void {
    this.disabled.add(name);
  }

  isEnabled(name: string): boolean {
    return !this.disabled.has(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  remove(name: string): void {
    this.plugins.delete(name);
    this.disabled.delete(name);
  }

  getMeta(name: string): PluginMeta | undefined {
    return this.plugins.get(name)?.meta;
  }

  listNames(): string[] {
    return [...this.plugins.keys()];
  }

  listEnabledNames(): string[] {
    return this.getAllEnabled().map(p => p.meta.name);
  }

  resolveDependencies(): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const plugin = this.plugins.get(name);
      if (!plugin) return;

      for (const dep of plugin.meta.dependencies) {
        visit(dep);
      }
      resolved.push(name);
    };

    for (const name of this.plugins.keys()) {
      visit(name);
    }

    return resolved;
  }
}

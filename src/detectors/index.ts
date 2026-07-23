import type { PluginRegistry } from "../core/plugin-system.js";
import { detector as runtimeDetector } from "./runtime-detector.js";
import { detector as packageManagerDetector } from "./package-manager-detector.js";
import { detector as workspaceDetector } from "./workspace-detector.js";
import { detector as frameworkDetector } from "./framework-detector.js";
import { detector as buildToolDetector } from "./build-tool-detector.js";
import { detector as languageDetector } from "./language-detector.js";
import { detector as cssDetector } from "./css-detector.js";
import { detector as databaseDetector } from "./database-detector.js";
import { detector as apiDetector } from "./api-detector.js";
import { detector as testingDetector } from "./testing-detector.js";
import { detector as lintingDetector } from "./linting-detector.js";
import { detector as formattingDetector } from "./formatting-detector.js";
import { detector as stateManagementDetector } from "./state-management-detector.js";
import { detector as uiLibraryDetector } from "./ui-library-detector.js";
import { detector as authDetector } from "./auth-detector.js";
import { detector as deploymentDetector } from "./deployment-detector.js";
import { detector as gitDetector } from "./git-detector.js";
import { detector as environmentDetector } from "./environment-detector.js";
import { detector as configFileDetector } from "./config-file-detector.js";
import { detector as dependencyDetector } from "./dependency-detector.js";

export function registerAllDetectors(registry: PluginRegistry): void {
  const detectors = [
    runtimeDetector,
    packageManagerDetector,
    workspaceDetector,
    frameworkDetector,
    buildToolDetector,
    languageDetector,
    cssDetector,
    databaseDetector,
    apiDetector,
    testingDetector,
    lintingDetector,
    formattingDetector,
    stateManagementDetector,
    uiLibraryDetector,
    authDetector,
    deploymentDetector,
    gitDetector,
    environmentDetector,
    configFileDetector,
    dependencyDetector,
  ];

  for (const detector of detectors) {
    try {
      registry.register(detector);
    } catch {
      // Already registered, skip
    }
  }
}

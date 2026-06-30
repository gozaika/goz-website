import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  assetCatalogFileSchema,
  exportPresetsFileSchema,
  marketingScenarioSchema,
  type MarketingScenario,
} from "./schema";
import { lintAllScenarioCopy, type CopyLintIssue } from "./copy-lint";

export type ScenarioValidationResult = {
  readonly scenarios: MarketingScenario[];
  readonly copyIssues: CopyLintIssue[];
  readonly errors: string[];
};

const marketingRoot = join(process.cwd(), "marketing-assets");

function readYamlFile(path: string): unknown {
  return parse(readFileSync(path, "utf8"));
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadMarketingScenarios(rootDir = marketingRoot): MarketingScenario[] {
  const scenarioDir = join(rootDir, "scenarios");
  return readdirSync(scenarioDir)
    .filter((fileName) => fileName.endsWith(".yaml") || fileName.endsWith(".yml"))
    .sort()
    .map((fileName) => {
      const filePath = join(scenarioDir, fileName);
      return marketingScenarioSchema.parse(readYamlFile(filePath));
    });
}

export function validateMarketingAssetFoundation(rootDir = marketingRoot): ScenarioValidationResult {
  const errors: string[] = [];
  let scenarios: MarketingScenario[] = [];

  try {
    scenarios = loadMarketingScenarios(rootDir);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    exportPresetsFileSchema.parse(readJsonFile(join(rootDir, "manifests", "export-presets.json")));
  } catch (error) {
    errors.push(`export-presets.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const catalog = assetCatalogFileSchema.parse(readJsonFile(join(rootDir, "manifests", "asset-catalog.json")));
    const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
    const outputIds = new Set(scenarios.flatMap((scenario) => scenario.plannedOutputs.map((output) => output.id)));

    for (const asset of catalog.assets) {
      if (!scenarioIds.has(asset.scenarioId)) {
        errors.push(`asset-catalog.json: ${asset.id} references unknown scenario ${asset.scenarioId}`);
      }
      if (!outputIds.has(asset.outputId)) {
        errors.push(`asset-catalog.json: ${asset.id} references unknown output ${asset.outputId}`);
      }
    }
  } catch (error) {
    errors.push(`asset-catalog.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    scenarios,
    copyIssues: lintAllScenarioCopy(scenarios),
    errors,
  };
}

import type { MarketingScenario } from "./schema";

export type CopyLintIssue = {
  readonly scenarioId: string;
  readonly field: string;
  readonly term: string;
  readonly message: string;
};

type Rule = {
  readonly term: string;
  readonly pattern: RegExp;
  readonly message: string;
  readonly surfaces?: ReadonlyArray<MarketingScenario["surface"]>;
};

const bannedCopyRules: ReadonlyArray<Rule> = [
  { term: "leftover", pattern: /\bleftovers?\b/i, message: "Use premium discovery language instead." },
  { term: "stale", pattern: /\bstale\b/i, message: "Never imply stale or expired food." },
  { term: "cheap", pattern: /\bcheap(?:est)?\b/i, message: "Use value/access language, not cheapness." },
  { term: "clearance", pattern: /\bclearance\b/i, message: "Avoid clearance retail cues." },
  { term: "liquidation", pattern: /\bliquidation\b/i, message: "Avoid distress-sale language." },
  { term: "food rescue", pattern: /\bfood\s+rescue\b/i, message: "Do not frame the customer product as rescue." },
  { term: "bargain bin", pattern: /\bbargain\s+bin\b/i, message: "Avoid discount-bin language." },
  { term: "discount", pattern: /\bdiscount(?:ed|s|ing)?\b/i, message: "Avoid discount-app positioning." },
  { term: "surplus", pattern: /\bsurplus\b/i, message: "Do not lead launch copy with surplus." },
  { term: "sample", pattern: /\bsamples?\b/i, message: "Avoid sample/freebie positioning." },
];

const boundaryRules: ReadonlyArray<Rule> = [
  {
    term: "commission",
    pattern: /\bcommission\b/i,
    message: "Restaurant economics must not leak into customer-facing copy.",
    surfaces: ["customer", "store"],
  },
  {
    term: "revenue",
    pattern: /\brevenue\b/i,
    message: "Revenue copy requires restaurant surface and verified backing data.",
    surfaces: ["customer", "store"],
  },
  {
    term: "sales lift",
    pattern: /\bsales\s+lift\b/i,
    message: "Performance claims need verified backing data.",
  },
  {
    term: "rating",
    pattern: /\b[0-5](?:\.\d)?\s*stars?\b|\brated\b/i,
    message: "Ratings cannot appear unless captured from real app state.",
  },
  {
    term: "customer count",
    pattern: /\b\d+[kKmM]?\+?\s+(?:customers|users|members)\b/i,
    message: "Audience counts need verified backing data.",
  },
  {
    term: "pickup proof secret",
    pattern: /\b(?:otp|qr|code)\s*[:#-]?\s*[A-Z0-9]{4,}\b/i,
    message: "Never put raw QR, OTP, or pickup proof values in scenario copy.",
  },
  {
    term: "passport",
    pattern: /\bpassport\b/i,
    message: "Consumer loyalty language must not leak into restaurant proof assets.",
    surfaces: ["restaurant"],
  },
];

function copyFields(scenario: MarketingScenario): ReadonlyArray<readonly [string, string]> {
  return [
    ["copy.headline", scenario.copy.headline],
    ["copy.subhead", scenario.copy.subhead ?? ""],
    ...scenario.copy.labels.map((label, index) => [`copy.labels.${index}`, label] as const),
  ];
}

export function lintScenarioCopy(scenario: MarketingScenario): CopyLintIssue[] {
  const issues: CopyLintIssue[] = [];
  const rules = [...bannedCopyRules, ...boundaryRules];

  for (const [field, value] of copyFields(scenario)) {
    for (const rule of rules) {
      if (rule.surfaces && !rule.surfaces.includes(scenario.surface)) continue;
      if (!rule.pattern.test(value)) continue;

      issues.push({
        scenarioId: scenario.id,
        field,
        term: rule.term,
        message: rule.message,
      });
    }
  }

  return issues;
}

export function lintAllScenarioCopy(scenarios: readonly MarketingScenario[]): CopyLintIssue[] {
  return scenarios.flatMap(lintScenarioCopy);
}

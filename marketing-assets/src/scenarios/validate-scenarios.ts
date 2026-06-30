import { validateMarketingAssetFoundation } from "./loader";

const result = validateMarketingAssetFoundation();

for (const error of result.errors) {
  console.error(`ERROR ${error}`);
}

for (const issue of result.copyIssues) {
  console.error(`COPY ${issue.scenarioId} ${issue.field}: ${issue.term} - ${issue.message}`);
}

if (result.errors.length > 0 || result.copyIssues.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`Validated ${result.scenarios.length} launch asset scenarios with clean copy.`);
}

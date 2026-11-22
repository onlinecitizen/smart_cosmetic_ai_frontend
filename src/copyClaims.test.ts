import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the project brief §6 ("do not make unsupported claims"). Each phrase
 * below was removed in Phase 1 because the backend does not do it. If the
 * backend gains the capability, update this list together with the copy and
 * src/lib/siteStatus.ts.
 */
const UNSUPPORTED_CLAIMS: [RegExp, string][] = [
  [/AI[- ](estimate|personali[sz]ed|powered)/i, "skin scores come from a mock provider, not an AI model"],
  [/considered when building/i, "the formulation engine ignores climate"],
  [/labell?ed (with your name|for \$\{)/i, "the lab label payload contains no customer name"],
  [/Detecting facial region|Reading environmental conditions/i, "no face detection step exists"],
  [/updates automatically/i, "order pages do not poll for status"],
  [/["'`>]\s*Confirmed\b/, "submitted orders are never reviewed, so they are not confirmed"],
  [/clinically|dermatologist[- ]approved|guaranteed results/i, "no clinical evidence exists"],
  // Phase 2 (partner catalogue): products carry retailer "listed for" tags, not efficacy evidence.
  [/\b(treats|cures|heals)\b/i, "catalogue tags are listing labels, not efficacy claims"],
  [/safe for (all|everyone|every|sensitive)/i, "missing ingredient data is unknown; nothing is labelled safe for everyone"],
  [/AI[- ](recommend|match|pick)/i, "product matching uses fixed rules (rules-v1), not an AI model"],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("customer-facing copy", () => {
  const files = sourceFiles(join(__dirname));

  it.each(UNSUPPORTED_CLAIMS)("contains no unsupported claim matching %s", (pattern, why) => {
    const hits = files.filter((f) => pattern.test(readFileSync(f, "utf-8")));
    expect(hits, `Unsupported claim (${why}) found in:\n${hits.join("\n")}`).toEqual([]);
  });
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("lib/experience/privacy-buckets.ts", "utf8");
test("analytics policy does not use identifiers, storage or networks", () => {
  assert.doesNotMatch(source, /navigator\.userAgent|localStorage|sessionStorage|document\.cookie|fetch\(|sendBeacon\(|fingerprint|ipAddress\b|emailAddress\b/);
});
test("analytics supports coarse dimensions and suppresses sparse cohorts", () => {
  assert.match(source, /viewportBucket/);
  assert.match(source, /inputBucket/);
  assert.match(source, /quantizeMilliseconds/);
  assert.match(source, /minimum = 20/);
  assert.match(source, /Math\.max\(20, minimum\)/);
  assert.match(source, /count >= threshold \? count : null/);
});

test("event contracts reject unapproved fields and require explicit consent", () => {
  const contract = fs.readFileSync("lib/experience/event-contract.ts", "utf8");
  assert.match(contract, /Object\.keys\(item\)\.some\(key => !KEYS\.has\(key\)\)/);
  assert.match(contract, /Object\.keys\(item\)\.length !== KEYS\.size/);
  assert.match(contract, /consent === "granted" \? parseExperienceEvent\(value\) : null/);
  assert.doesNotMatch(contract, /fetch\(|sendBeacon\(|localStorage|document\.cookie/);
});

test("sparse aggregates cannot reveal fewer than twenty players, including custom thresholds", () => {
  const declaration = source.match(/export function visibleAggregateCount\(count: number, minimum = 20\): number \| null \{[\s\S]*?\n\}/);
  assert.ok(declaration, "Expected pure aggregate count helper");
  const { runInNewContext } = require("node:vm");
  const js = declaration[0].replace("export function", "function").replace("(count: number, minimum = 20): number | null", "(count, minimum = 20)");
  const visible = runInNewContext(js + "\nvisibleAggregateCount");
  assert.equal(visible(19), null);
  assert.equal(visible(19, 1), null);
  assert.equal(visible(20, 0), 20);
  assert.equal(visible(29, 30), null);
  assert.equal(visible(30, 30), 30);
  assert.equal(visible(25, Number.NaN), 25);
});

test("browser Global Privacy Control has priority over stored analytics consent", () => {
  const provider = fs.readFileSync("components/providers/consent-provider.tsx", "utf8");
  const tracking = fs.readFileSync("lib/analytics.ts", "utf8");
  assert.match(provider, /const effectiveAnalytics = analytics && !globalPrivacyControl\(\)/);
  assert.match(provider, /if \(globalPrivacyControl\(\)\) \{/);
  assert.match(provider, /if \(existing\?\.analytics \|\| !existing\) persist\(false\)/);
  assert.match(provider, /choice\?\.analytics && !globalPrivacyControl\(\)/);
  assert.match(tracking, /typeof document === "undefined" \|\| globalPrivacyControl\(\)/);
});

test("consent parsing bounds untrusted anonymous subject identifiers", () => {
  const consent = fs.readFileSync("lib/consent.ts", "utf8");
  assert.match(consent, /typeof parsed\.aid === "string"/);
  assert.match(consent, /\^\[a-z0-9-\]\{1,64\}\$/i);
  assert.match(consent, /\? parsed\.aid : undefined/);
});

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
  assert.match(source, /count >= minimum \? count : null/);
});

test("event contracts reject unapproved fields and require explicit consent", () => {
  const contract = fs.readFileSync("lib/experience/event-contract.ts", "utf8");
  assert.match(contract, /Object\.keys\(item\)\.some\(key => !KEYS\.has\(key\)\)/);
  assert.match(contract, /Object\.keys\(item\)\.length !== KEYS\.size/);
  assert.match(contract, /consent === "granted" \? parseExperienceEvent\(value\) : null/);
  assert.doesNotMatch(contract, /fetch\(|sendBeacon\(|localStorage|document\.cookie/);
});

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

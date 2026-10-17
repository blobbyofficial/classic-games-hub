/** Destructive only to an isolated, disposable staging account and shop fixture.
 * Explicit opt-in, never run against production. Requires an unowned
 * non-boost item with stable price and sufficient test credits.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const { assertIsolatedEnvironment } = require("./assert-isolated-staging.cjs");

const url = process.env.STAGING_SUPABASE_URL;
const anonKey = process.env.STAGING_SUPABASE_ANON_KEY;
const email = process.env.STAGING_PLAYER_A_EMAIL;
const password = process.env.STAGING_PLAYER_A_PASSWORD;
const slug = process.env.STAGING_ECONOMY_ITEM_SLUG;

test("concurrent cosmetic purchase spends only once", { timeout: 60000 }, async () => {
  assert.equal(process.env.STAGING_ECONOMY_WRITES_CONFIRMED, "yes",
    "Explicitly confirm this is a disposable account and item; test writes account data");
  assertIsolatedEnvironment({ confirmed: process.env.STAGING_ISOLATED_CONFIRMED, url, kind: "website" });
  assert.ok(anonKey && email && password && /^[a-z0-9_-]{1,120}$/i.test(slug ?? ""), "Provide synthetic test credentials and safe shop item slug");

  const makeClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const clients = [makeClient(), makeClient()];
  const sessions = await Promise.all(clients.map(client => client.auth.signInWithPassword({ email, password })));
  for (const session of sessions) {
    assert.equal(session.error, null, "Disposable staging login failed");
    assert.ok(session.data.user?.id, "No authenticated test user");
  }
  const uid = sessions[0].data.user.id;
  assert.equal(sessions[1].data.user.id, uid);
  const client = clients[0];
  const { data: item, error: itemError } = await client.from("shop_items")
    .select("id,price,kind,staff_only,available").eq("slug", slug).single();
  assert.equal(itemError, null, "Missing test item");
  assert.ok(item && item.available && !item.staff_only &&
    !["xp_boost","credit_boost"].includes(item.kind) &&
    Number.isSafeInteger(item.price) && item.price >= 0, "Use an available, non-boost cosmetic");

  const { data: owner, error: ownerError } = await client.from("profiles")
    .select("credits").eq("id", uid).single();
  assert.equal(ownerError, null);
  assert.ok(Number.isSafeInteger(owner.credits) && owner.credits >= item.price,
    "Test account must be funded independently in staging");
  const { data: existing, error: existingError } = await client.from("inventory_items")
    .select("id").eq("user_id", uid).eq("item_id", item.id);
  assert.equal(existingError, null);
  assert.equal(existing.length, 0,
    "Fixture already owned: reset disposable staging account before rerunning");

  const results = await Promise.all(clients.map(c => c.rpc("purchase_shop_item", { p_slug: slug })));
  const successes = results.filter(r => !r.error && r.data?.ok === true);
  assert.equal(successes.length, 1, "Exactly one concurrent purchase must succeed");

  const { data: after, error: afterError } = await client.from("profiles")
    .select("credits").eq("id", uid).single();
  assert.equal(afterError, null);
  assert.equal(after.credits, owner.credits - item.price,
    "Only one credit debit may be committed");
  const { data: inventory, error: inventoryError } = await client.from("inventory_items")
    .select("id").eq("user_id", uid).eq("item_id", item.id);
  assert.equal(inventoryError, null);
  assert.equal(inventory.length, 1, "Only one inventory item may be owned");
  await Promise.all(clients.map(c => c.auth.signOut()));
});

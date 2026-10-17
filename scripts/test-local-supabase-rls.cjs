const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");

test("separate local players cannot read private settings or directly mutate economic state", { timeout: 60000 }, async () => {
  const url = process.env.STAGING_SUPABASE_URL;
  assert.equal(process.env.LOCAL_SUPABASE_DEV_CONFIRM, "yes");
  assert.equal(url, "http://127.0.0.1:54321",
    "Refusing RLS tests against anything but disposable loopback Supabase");
  const anon = process.env.STAGING_SUPABASE_ANON_KEY;
  const serviceRole = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  const credentials = [
    [process.env.STAGING_PLAYER_A_EMAIL, process.env.STAGING_PLAYER_A_PASSWORD],
    [process.env.STAGING_PLAYER_B_EMAIL, process.env.STAGING_PLAYER_B_PASSWORD]
  ];
  assert.ok(anon && serviceRole && credentials.every(([email, password]) => email && password));
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const clients = credentials.map(() => createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }));
  try {
    const sessions = await Promise.all(clients.map((c, i) => c.auth.signInWithPassword({
      email: credentials[i][0], password: credentials[i][1]
    })));
    for (const { error, data } of sessions) {
      assert.equal(error, null);
      assert.ok(data.user?.id);
    }
    const [a, b] = sessions.map(x => x.data.user.id);
    assert.notEqual(a, b, "Must test distinct authenticated users");

    const { data: hidden, error: hiddenError } = await clients[0].from("user_settings")
      .select("user_id").eq("user_id", b);
    assert.equal(hiddenError, null);
    assert.equal(hidden.length, 0, "Player A must not see Player B private settings");

    const { data: before, error: beforeError } = await admin.from("profiles")
      .select("credits").eq("id", a).single();
    assert.equal(beforeError, null);
    const directCredits = await clients[0].from("profiles")
      .update({ credits: 999999 }).eq("id", a);
    assert.ok(directCredits.error, "Direct player credit editing must be rejected");
    const { data: after } = await admin.from("profiles").select("credits").eq("id", a).single();
    assert.equal(after.credits, before.credits, "Credits must stay unchanged");

    const directLedger = await clients[0].from("credit_transactions").insert({
      user_id: a, amount: 1000000, balance_after: 1000000, reason: "malicious_client",
    });
    assert.ok(directLedger.error, "Player must not write to the credit ledger");

    const { data: item, error: itemError } = await admin.from("shop_items")
      .select("id").eq("slug", process.env.STAGING_ECONOMY_ITEM_SLUG).single();
    assert.equal(itemError, null);
    const directInventory = await clients[0].from("inventory_items")
      .insert({ user_id: a, item_id: item.id });
    assert.ok(directInventory.error, "Player must not mint inventory items directly");

    const { data: unchecked } = await admin.from("inventory_items")
      .select("id").eq("user_id", a).eq("item_id", item.id);
    assert.equal(unchecked?.length, 0, "Denied inventory insert must leave no owned item");
  } finally {
    await Promise.all(clients.map(c => c.auth.signOut()));
  }
});

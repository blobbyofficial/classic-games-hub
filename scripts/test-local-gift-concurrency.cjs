/** Test repeated real gifts using two sessions on disposable loopback Supabase only. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");

test("same-sender simultaneous gifts debit once and create one recipient item", { timeout: 60000 }, async () => {
  const url = process.env.STAGING_SUPABASE_URL;
  assert.equal(process.env.LOCAL_SUPABASE_DEV_CONFIRM, "yes");
  assert.equal(url, "http://127.0.0.1:54321");
  const anon = process.env.STAGING_SUPABASE_ANON_KEY;
  const service = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  const slug = process.env.STAGING_ECONOMY_ITEM_SLUG;
  assert.ok(anon && service && slug);
  const a = Array.from({length: 2}, () => createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
  const b = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    const users = await Promise.all([
      ...a.map(c => c.auth.signInWithPassword({
        email: process.env.STAGING_PLAYER_A_EMAIL, password: process.env.STAGING_PLAYER_A_PASSWORD
      })),
      b.auth.signInWithPassword({
        email: process.env.STAGING_PLAYER_B_EMAIL, password: process.env.STAGING_PLAYER_B_PASSWORD
      })
    ]);
    assert.ok(users.every(r => !r.error && r.data.user?.id));
    const sender = users[0].data.user.id;
    assert.equal(users[1].data.user.id, sender);
    const recipient = users[2].data.user.id;
    assert.notEqual(sender, recipient);
    const { data: item, error: itemError } = await admin.from("shop_items")
      .select("id,price").eq("slug", slug).single();
    assert.equal(itemError, null);
    assert.ok(Number.isSafeInteger(item.price) && item.price > 0);
    const price = Math.ceil(item.price * .75);
    const { data: before } = await admin.from("profiles").select("credits").eq("id", sender).single();
    assert.ok(before.credits >= price, "Sender's local synthetic wallet must cover one gift");
    const { data: already } = await admin.from("inventory_items")
      .select("id").eq("user_id", recipient).eq("item_id", item.id);
    assert.equal(already?.length, 0, "Fixture recipient must not already own the gift");
    const results = await Promise.all(a.map(c => c.rpc("gift_item", { p_slug: slug, p_to: recipient })));
    assert.equal(results.filter(r => !r.error && r.data?.ok).length, 1,
      "Concurrent identical gifts must produce one successful transfer");
    const { data: after } = await admin.from("profiles")
      .select("credits").eq("id", sender).single();
    assert.equal(after.credits, before.credits - price, "Only one gift debit may persist");
    const { data: owned } = await admin.from("inventory_items")
      .select("id").eq("user_id", recipient).eq("item_id", item.id);
    assert.equal(owned?.length, 1, "Recipient must receive exactly one gift");
  } finally {
    await Promise.all([...a, b].map(c => c.auth.signOut()));
  }
});

/** Real concurrent scoreboard/reward test on disposable LOCAL Supabase only. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");

test("simultaneous score submissions cannot exceed thirty reward windows per hour", { timeout: 120000 }, async () => {
  const url = process.env.STAGING_SUPABASE_URL;
  assert.equal(process.env.LOCAL_SUPABASE_DEV_CONFIRM, "yes");
  assert.equal(url, "http://127.0.0.1:54321");
  const key = process.env.STAGING_SUPABASE_ANON_KEY;
  assert.ok(key && process.env.STAGING_PLAYER_B_EMAIL && process.env.STAGING_PLAYER_B_PASSWORD);
  const players = Array.from({ length: 8 }, () =>
    createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  try {
    const auth = await Promise.all(players.map(c => c.auth.signInWithPassword({
      email: process.env.STAGING_PLAYER_B_EMAIL,
      password: process.env.STAGING_PLAYER_B_PASSWORD,
    })));
    assert.ok(auth.every(x => !x.error && x.data.user?.id));
    const { data: games, error } = await players[0].from("games")
      .select("id,slug").eq("status", "published").limit(1);
    assert.equal(error, null);
    assert.ok(games?.length, "Published synthetic game required");
    const game = games[0];
    const results = [];
    for (let round = 0; round < 4; round++) {
      const batchSize = round === 3 ? 7 : 8;
      const batch = await Promise.all(players.slice(0, batchSize).map(c =>
        c.rpc("submit_score", {
          p_slug: game.slug, p_score: 10, p_duration: 30, p_difficulty: "regular"
        })
      ));
      results.push(...batch);
    }
    assert.equal(results.length, 31);
    const failures = results.filter(r => r.error || !r.data?.ok);
    assert.equal(failures.length, 0,
      "All 31 valid local score submissions should record a session");
    const rewarded = results.filter(r => r.data.rewarded === true);
    assert.equal(rewarded.length, 30,
      "Exactly 30 of 31 parallel submissions may grant normal rewards");
    const cutoff = results.filter(r => r.data.rewarded === false);
    assert.equal(cutoff.length, 1);
    assert.equal(cutoff[0].data.credits_earned, 0,
      "Unrewarded sessions must not grant credits");
  } finally {
    await Promise.all(players.map(c => c.auth.signOut()));
  }
});

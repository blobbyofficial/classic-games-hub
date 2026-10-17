/** Real synthetic social lifecycle and blocked-account authorization checks.
 * Tests a disposable LOCAL Supabase; does not contact any hosted services.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");

test("two real local accounts respect friend-request, block and DM boundaries", { timeout: 60000 }, async () => {
  const url = process.env.STAGING_SUPABASE_URL;
  assert.equal(process.env.LOCAL_SUPABASE_DEV_CONFIRM, "yes");
  assert.equal(url, "http://127.0.0.1:54321");
  const anon = process.env.STAGING_SUPABASE_ANON_KEY;
  const service = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(anon && service);
  const a = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const b = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    const [aAuth, bAuth] = await Promise.all([
      a.auth.signInWithPassword({ email: process.env.STAGING_PLAYER_A_EMAIL, password: process.env.STAGING_PLAYER_A_PASSWORD }),
      b.auth.signInWithPassword({ email: process.env.STAGING_PLAYER_B_EMAIL, password: process.env.STAGING_PLAYER_B_PASSWORD })
    ]);
    assert.equal(aAuth.error, null);
    assert.equal(bAuth.error, null);
    const aid = aAuth.data.user.id, bid = bAuth.data.user.id;
    assert.notEqual(aid, bid);
    const { data: receiver, error: lookupError } = await admin.from("profiles").select("username").eq("id", bid).single();
    assert.equal(lookupError, null);

    const first = await a.rpc("send_friend_request", { p_username: receiver.username });
    assert.equal(first.error, null);
    assert.equal(first.data?.ok, true);
    const repeat = await a.rpc("send_friend_request", { p_username: receiver.username });
    assert.equal(repeat.data?.ok, false, "Duplicate friend requests must not create new rows");

    const { data: request, error: requestError } = await admin.from("friendships")
      .select("id,status").eq("requester_id", aid).eq("addressee_id", bid).single();
    assert.equal(requestError, null);
    assert.equal(request.status, "pending");

    const response = await b.rpc("respond_friend_request", { p_id: request.id, p_accept: true });
    assert.equal(response.error, null);
    assert.equal(response.data?.ok, true);
    const { data: accepted } = await admin.from("friendships")
      .select("status").eq("id", request.id).single();
    assert.equal(accepted?.status, "accepted");

    const block = await b.rpc("block_user", { p_user: aid });
    assert.equal(block.error, null);
    const { data: friendship } = await admin.from("friendships")
      .select("id").eq("id", request.id);
    assert.equal(friendship?.length, 0, "Blocking removes established friend access");
    const blockedRequest = await a.rpc("send_friend_request", { p_username: receiver.username });
    assert.equal(blockedRequest.data?.ok, false, "A blocked player cannot re-request");
    const blockedDm = await a.rpc("get_or_create_dm", { p_user: bid });
    assert.ok(blockedDm.error, "Blocked player cannot establish a direct message");
    const unblock = await b.rpc("unblock_user", { p_user: aid });
    assert.equal(unblock.error, null);
  } finally {
    await Promise.all([a.auth.signOut(), b.auth.signOut()]);
  }
});

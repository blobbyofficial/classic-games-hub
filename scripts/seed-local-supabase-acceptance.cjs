/** Create synthetic users and an expendable shop fixture in a disposable LOCAL
 * Supabase instance. Requires literal loopback URL and explicit confirmation.
 * This file must never be run against production or hosted Supabase.
 */
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.API_URL;
  const anon = process.env.ANON_KEY;
  const serviceRole = process.env.SERVICE_ROLE_KEY;
  const envFile = process.env.GITHUB_ENV;
  if (process.env.LOCAL_SUPABASE_DEV_CONFIRM !== "yes" ||
      url !== "http://127.0.0.1:54321" || !anon || !serviceRole || !envFile) {
    throw Error("Only a disposable loopback Supabase instance is allowed");
  }
  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const username = "e2e" + randomUUID().replaceAll("-", "").slice(0, 12);
  const email = username + "@example.invalid";
  const password = "Local-E2E-" + randomUUID();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { user_name: username }
  });
  if (authError || !created?.user?.id) throw Error("Could not create synthetic local account: " + (authError?.message ?? "unknown"));
  const userId = created.user.id;
  const { data: profile, error: profileError } = await admin.from("profiles")
    .update({ credits: 5000 }).eq("id", userId).select("id").single();
  if (profileError || profile?.id !== userId) {
    throw Error("Failed to fund isolated synthetic account: " + (profileError?.message ?? "missing profile"));
  }
  const { data: items, error: itemsError } = await admin.from("shop_items")
    .select("slug,price,kind,staff_only,available")
    .eq("available", true).eq("staff_only", false)
    .order("price", { ascending: true }).limit(100);
  if (itemsError) throw Error("Local shop query failed: " + itemsError.message);
  const item = items?.find(x =>
    !["xp_boost", "credit_boost"].includes(x.kind) &&
    Number.isSafeInteger(x.price) && x.price >= 0 && x.price <= 5000
  );
  if (!item) throw Error("No expendable local cosmetic shop item available");
  const variables = {
    STAGING_SUPABASE_URL: url,
    STAGING_SUPABASE_ANON_KEY: anon,
    STAGING_PLAYER_A_EMAIL: email,
    STAGING_PLAYER_A_PASSWORD: password,
    STAGING_ECONOMY_ITEM_SLUG: item.slug,
    STAGING_ISOLATED_CONFIRMED: "yes",
    STAGING_ECONOMY_WRITES_CONFIRMED: "yes",
    LOCAL_SUPABASE_DEV_CONFIRM: "yes",
  };
  // GITHUB_ENV is a private runner file. Never print credentials or passwords.
  fs.appendFileSync(envFile, Object.entries(variables).map(([k, v]) => `${k}=${v}\n`).join(""));
  console.log("Created isolated synthetic local account and expendable cosmetic fixture");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

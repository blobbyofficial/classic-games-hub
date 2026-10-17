const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../database/migrations/0082_economy_concurrency_guards.sql"),"utf8");
test("purchase balance is row-locked before debit", () => {
  const fn = source.slice(source.indexOf("function public.purchase_shop_item"),source.indexOf("function public.gift_item"));
  const lock = fn.indexOf("where id = v_me for update");
  const debit = fn.indexOf("perform public.award_credits");
  assert.ok(lock >= 0 && debit > lock);
});
test("paid gifting aborts when recipient already owns the gift", () => {
  const fn = source.slice(source.indexOf("function public.gift_item"));
  assert.match(fn, /on conflict do nothing;\s*if not found then\s*raise exception/);
  assert.match(fn, /where id = v_me for update/);
});
test("security definer RPCs are restricted to authenticated clients", () => {
  for(const signature of ["purchase_shop_item(text)", "gift_item(text, uuid)"]) {
    assert.ok(source.includes(`revoke execute on function public.${signature} from public, anon;`));
    assert.ok(source.includes(`grant execute on function public.${signature} to authenticated;`));
  }
});

test("score reward count is serialized by a player-level row lock", () => {
  const scoreSql = fs.readFileSync(
    path.join(__dirname, "../database/migrations/0083_score_submission_serialization.sql"), "utf8",
  );
  const lock = scoreSql.indexOf("where id = v_me for update");
  const count = scoreSql.indexOf("select count(*) into v_recent");
  const insert = scoreSql.indexOf("insert into public.play_sessions");
  assert.ok(lock >= 0 && count > lock && insert > count);
  assert.match(scoreSql, /revoke execute on function public\.submit_score\(text, bigint, integer, text\) from public, anon;/);
});

test("concurrent duplicate cosmetic purchases recheck ownership after wallet lock before debit", () => {
  const purchase = source.slice(source.indexOf("function public.purchase_shop_item"), source.indexOf("function public.gift_item"));
  const lock = purchase.indexOf("select credits into v_credits from public.profiles where id = v_me for update");
  const recheck = purchase.indexOf("-- Recheck after locking, before debiting", lock);
  const debit = purchase.indexOf("perform public.award_credits", lock);
  assert.ok(lock >= 0 && recheck > lock && debit > recheck, "Ownership must be rechecked under lock before any debit");
  assert.match(purchase.slice(recheck, debit), /not v_boost and exists[\\s\\S]*?inventory_items/);
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../database/migrations/0080_economy_concurrency_guards.sql"),"utf8");
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

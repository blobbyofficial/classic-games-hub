import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { InventoryCorrection, type AdminInventoryEntry } from "@/features/admin/inventory-correction";

export default async function AdminInventoryPage({
  searchParams,
}: { searchParams: Promise<{ user?: string }> }) {
  const actor = await getCurrentProfile();
  if (actor?.role !== "admin") return <p>Administrator access required.</p>;
  const { user } = await searchParams;
  const supabase = await createClient();
  const [{ data: accounts }, { data: owner }] = await Promise.all([
    supabase.from("profiles").select("id, username").order("username").limit(500),
    user ? supabase.from("profiles").select("id, username").eq("id", user).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  let entries: AdminInventoryEntry[] = [];
  if (owner) {
    const { data } = await supabase.from("inventory_items")
      .select("id, acquired_at, shop_items(name, slug)")
      .eq("user_id", owner.id).order("acquired_at", { ascending: false });
    entries = (data ?? []).map((row) => {
      const product = row.shop_items as unknown as { name: string; slug: string } | null;
      return { id: row.id, acquiredAt: row.acquired_at, itemName: product?.name ?? "Unknown item", itemSlug: product?.slug ?? "" };
    });
  }
  const users = (accounts ?? []).map((u) => ({ id: u.id, username: String(u.username) }));
  return (
    <div className="space-y-5">
      <Link className="text-sm text-primary hover:underline" href="/admin/users">← Back to users</Link>
      <div>
        <h1 className="text-2xl font-bold">Inventory corrections</h1>
        <p className="text-sm text-muted-foreground">Administrator-only removal and recovery of cosmetics. Every change requires a reason and is audited.</p>
      </div>
      <form action="/admin/users/inventory" className="flex flex-wrap gap-2">
        <select name="user" defaultValue={owner?.id ?? ""} className="min-w-56 rounded-lg border border-border bg-background p-2">
          <option value="">Choose a user…</option>
          {users.map((u) => <option key={u.id} value={u.id}>@{u.username}</option>)}
        </select>
        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm">View inventory</button>
      </form>
      {owner && <InventoryCorrection key={owner.id} ownerId={owner.id} entries={entries} users={users} />}
      {user && !owner && <p className="text-sm text-muted-foreground">User not found.</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adminCorrectInventory } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AdminInventoryEntry {
  id: number;
  itemName: string;
  itemSlug: string;
  acquiredAt: string;
}

export function InventoryCorrection({
  ownerId, entries, users,
}: {
  ownerId: string;
  entries: AdminInventoryEntry[];
  users: { id: string; username: string }[];
}) {
  const [pending, start] = useTransition();
  const [items, setItems] = useState(entries);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"remove" | "transfer">("remove");
  const [refund, setRefund] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [reason, setReason] = useState("");
  const item = items.find((i) => i.id === selected);
  const submit = () => {
    if (!item || reason.trim().length < 5 || (mode === "transfer" && !recipient)) {
      toast.error("Select an item, provide a reason and choose a recipient for transfers.");
      return;
    }
    if (!window.confirm(`${mode === "remove" ? "Remove" : "Transfer"} ${item.itemName}? This action is recorded in the admin audit log.`)) return;
    start(async () => {
      const res = await adminCorrectInventory({
        ownerId, inventoryId: item.id, mode,
        recipientId: mode === "transfer" ? recipient : undefined,
        refund: mode === "remove" && refund, reason,
      });
      if (!res.ok) { toast.error(res.error ?? "Operation failed"); return; }
      setItems((current) => current.filter((i) => i.id !== item.id));
      setSelected(null); setReason(""); setRefund(false); setRecipient("");
      toast.success(mode === "remove" ? "Item removed." : "Item transferred.");
    });
  };
  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="text-sm text-muted-foreground">No inventory items for this user.</p>}
      <div className="space-y-2">
        {items.map((i) => (
          <button key={i.id} type="button" onClick={() => setSelected(i.id)} disabled={pending}
            className={`w-full rounded-lg border p-3 text-left text-sm hover:bg-muted ${selected === i.id ? "border-primary" : "border-border"}`}>
            <span className="font-medium">{i.itemName}</span>
            <span className="ml-2 text-muted-foreground">({i.itemSlug})</span>
          </button>
        ))}
      </div>
      {item && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="font-semibold">Manage: {item.itemName}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mode === "remove" ? "default" : "outline"} onClick={() => setMode("remove")}>Remove item</Button>
            <Button type="button" variant={mode === "transfer" ? "default" : "outline"} onClick={() => { setMode("transfer"); setRefund(false); }}>Transfer to user</Button>
          </div>
          {mode === "remove" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)}/>
              Refund original paid credits (if a purchase exists)
            </label>
          ) : (
            <label className="block space-y-1 text-sm">
              <span>Recipient</span>
              <select className="w-full rounded-lg border border-border bg-background p-2" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                <option value="">Choose a different user…</option>
                {users.filter((u) => u.id !== ownerId).map((u) => <option key={u.id} value={u.id}>@{u.username}</option>)}
              </select>
            </label>
          )}
          <label className="block space-y-1 text-sm">
            <span>Required audit reason</span>
            <Input value={reason} maxLength={400} onChange={(e) => setReason(e.target.value)} placeholder="Why is this item being corrected?"/>
          </label>
          <p className="text-xs text-muted-foreground">
            Transfers do not refund. The recipient must not already own this cosmetic. Removal clears the current equipped appearance.
          </p>
          <Button type="button" disabled={pending || reason.trim().length < 5 || (mode === "transfer" && !recipient)} onClick={submit}>
            {pending ? "Applying…" : mode === "remove" ? "Confirm removal" : "Confirm transfer"}
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adminSetBannerPayload, adminSetFlag } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BannerVariant, FeatureFlag } from "@/types";

const VARIANTS: { value: BannerVariant; label: string }[] = [
  { value: "info", label: "Info (violet)" },
  { value: "success", label: "Success (green)" },
  { value: "warning", label: "Warning (amber)" },
  { value: "promo", label: "Promo (gradient)" },
];

function readString(payload: unknown, key: string): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  return typeof p[key] === "string" ? (p[key] as string) : "";
}

function readVariant(payload: unknown): BannerVariant {
  const v = readString(payload, "variant");
  return VARIANTS.some((o) => o.value === v) ? (v as BannerVariant) : "info";
}

export function BannerEditor({
  flag,
  kind,
  title,
}: {
  flag: FeatureFlag;
  kind: "maintenance" | "site";
  title: string;
}) {
  const router = useRouter();
  const isSite = kind === "site";

  const [enabled, setEnabled] = useState(flag.enabled);
  const [message, setMessage] = useState(readString(flag.payload, "message"));
  const [variant, setVariant] = useState<BannerVariant>(readVariant(flag.payload));
  const [linkLabel, setLinkLabel] = useState(readString(flag.payload, "link_label"));
  const [linkHref, setLinkHref] = useState(readString(flag.payload, "link_href"));
  const [pending, start] = useTransition();

  const toggle = (v: boolean) => {
    setEnabled(v);
    start(async () => {
      const res = await adminSetFlag(flag.key, v);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        setEnabled(!v);
        return;
      }
      toast.success(v ? "Banner shown" : "Banner hidden");
      router.refresh();
    });
  };

  const save = () =>
    start(async () => {
      const payload = isSite
        ? { message, variant, link_label: linkLabel, link_href: linkHref }
        : { message };
      const res = await adminSetBannerPayload(flag.key, payload);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success("Banner saved");
      router.refresh();
    });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {flag.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>
          )}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          {enabled ? "Live" : "Hidden"}
          <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} />
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder={
              isSite
                ? "e.g. Double credits all weekend - play now!"
                : "Scheduled maintenance in progress…"
            }
          />
          <p className="text-right text-xs text-muted-foreground">{message.length}/200</p>
        </div>

        {isSite && (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label>Style</Label>
                <Select value={variant} onValueChange={(v) => setVariant(v as BannerVariant)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIANTS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Link label (optional)</Label>
                <Input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  maxLength={40}
                  placeholder="Learn more"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link URL (optional)</Label>
                <Input
                  value={linkHref}
                  onChange={(e) => setLinkHref(e.target.value)}
                  maxLength={300}
                  placeholder="/shop or https://…"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button variant="gradient" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save banner"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

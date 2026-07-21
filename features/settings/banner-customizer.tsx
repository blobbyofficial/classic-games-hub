"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon, Loader2, Check, Upload, Lock } from "lucide-react";
import { toast } from "sonner";
import { setBannerColor, setBannerUrl, uploadUserMedia } from "@/actions/profile";
import { useSessionStore } from "@/lib/stores/session-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { bannerBackground } from "@/components/profile/profile-theme";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

const SOLID_PRESETS = ["#6d28d9", "#2563eb", "#059669", "#dc2626", "#db2777", "#ea580c", "#0891b2", "#334155"];

export function BannerCustomizer({ profile }: { profile: Profile }) {
  const patchProfile = useSessionStore((s) => s.patchProfile);
  const [equipped, setEquipped] = useState<Record<string, string>>(profile.equipped ?? {});
  const [bannerUrl, setUrl] = useState(profile.banner_url);
  const [color, setColor] = useState(
    typeof equipped.banner === "string" && /^#[0-9a-fA-F]{6}$/.test(equipped.banner) ? equipped.banner : "#6d28d9",
  );
  const [uploading, setUploading] = useState(false);
  const [, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const canUpload = profile.discord_linked; // booster tier proxied by a linked Discord until the bot lands

  const applyColor = (c: string) => {
    setColor(c);
    start(async () => {
      const res = await setBannerColor(c);
      if (!res.ok) return void toast.error(res.error ?? "Could not save");
      const next = res.equipped as Record<string, string>;
      setEquipped(next);
      patchProfile({ equipped: next });
      toast.success("Banner colour applied");
    });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await uploadUserMedia("banners", file);
    setUploading(false);
    if (!res.ok) return void toast.error(res.error ?? "Upload failed");
    setUrl(res.url as string);
    patchProfile({ banner_url: res.url as string });
    toast.success("Custom banner uploaded");
  };

  const clearUpload = () =>
    start(async () => {
      const res = await setBannerUrl(null);
      if (!res.ok) return void toast.error(res.error ?? "Could not remove");
      setUrl(null);
      patchProfile({ banner_url: null });
      toast.success("Custom banner removed");
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-5 text-primary" /> Banner
        </CardTitle>
        <CardDescription>
          A solid colour is free for everyone. Gradient & premade banners come from the shop, and Discord-linked
          members can upload their own image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Live preview */}
        <div
          className="relative h-20 overflow-hidden rounded-xl border border-border"
          style={{ background: bannerBackground(equipped) }}
        >
          {bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />
          )}
        </div>

        {/* Solid colour (email tier) */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Solid colour</p>
          <div className="flex flex-wrap items-center gap-2">
            {SOLID_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => applyColor(c)}
                className={cn(
                  "size-8 rounded-lg ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                  equipped.banner === c ? "ring-primary" : "ring-transparent",
                )}
                style={{ background: c }}
                aria-label={`Banner colour ${c}`}
              >
                {equipped.banner === c && <Check className="mx-auto size-4 text-white" />}
              </button>
            ))}
            <label className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={(e) => applyColor(e.target.value)}
                className="size-5 cursor-pointer bg-transparent"
              />
              Custom
            </label>
          </div>
        </div>

        {/* Upload (Discord-linked tier) */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            Custom image {!canUpload && <Lock className="size-3.5 text-muted-foreground" />}
          </p>
          {canUpload ? (
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload image
              </Button>
              {bannerUrl && (
                <Button variant="ghost" size="sm" onClick={clearUpload}>
                  Remove
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Link your Discord account to upload a custom banner image.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

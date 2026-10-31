"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, uploadUserMedia } from "@/actions/profile";
import { changeUsername } from "@/actions/profile";
import { useSessionStore } from "@/lib/stores/session-store";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { USERNAME_CHANGE_COST } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import type { Profile } from "@/types";

export function ProfileSettings({ profile }: { profile: Profile }) {
  const patchProfile = useSessionStore((s) => s.patchProfile);
  const setCredits = useSessionStore((s) => s.setCredits);
  const credits = useSessionStore((s) => s.profile?.credits ?? profile.credits);

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [pronouns, setPronouns] = useState(profile.pronouns ?? "");
  const [statusText, setStatusText] = useState(profile.status_text ?? "");
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [usernameOpen, setUsernameOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(profile.username);
  const [changing, startChange] = useTransition();

  const save = () =>
    startSave(async () => {
      const res = await updateProfile({ display_name: displayName, bio, pronouns, status_text: statusText });
      if (!res.ok) { toast.error(res.error ?? "Could not save"); return; }
      patchProfile({
        display_name: displayName || null,
        bio: bio || null,
        pronouns: pronouns || null,
        status_text: statusText || null,
      });
      toast.success("Profile saved");
    });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await uploadUserMedia("avatars", file);
    setUploading(false);
    if (!res.ok) { toast.error(res.error ?? "Upload failed"); return; }
    setAvatar(res.url as string);
    patchProfile({ avatar_url: res.url as string });
    toast.success("Avatar updated");
  };

  const doChangeUsername = () =>
    startChange(async () => {
      const res = await changeUsername(newUsername);
      if (!res.ok) { toast.error(res.error ?? "Could not change username"); return; }
      patchProfile({ username: newUsername });
      setCredits(credits - USERNAME_CHANGE_COST);
      setUsernameOpen(false);
      toast.success(`You are now @${newUsername}`);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>This is how other players see you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="focus-visible-ring group relative rounded-full"
            aria-label="Change avatar"
          >
            <UserAvatar
              src={avatar}
              name={displayName || profile.username}
              frame={profile.equipped?.avatar_frame}
              className="size-20"
            />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {uploading ? <Loader2 className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
          <div>
            <p className="text-sm font-medium">Avatar</p>
            <p className="text-xs text-muted-foreground">PNG, JPG or GIF. Max 4MB.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Username</Label>
            <Button variant="ghost" size="sm" onClick={() => setUsernameOpen(true)}>
              Change (<Coins className="size-3" /> {USERNAME_CHANGE_COST})
            </Button>
          </div>
          <Input value={`@${profile.username}`} disabled />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="Your public name"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pronouns">Pronouns</Label>
            <Input
              id="pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              maxLength={24}
              placeholder="they/them"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              maxLength={80}
              placeholder="What you're up to"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} placeholder="Tell players about yourself…" />
          <p className="text-right text-xs text-muted-foreground">{bio.length}/500</p>
        </div>

        <Button onClick={save} disabled={saving} variant="gradient">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>

      <Dialog open={usernameOpen} onOpenChange={setUsernameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change username</DialogTitle>
            <DialogDescription>
              Costs {USERNAME_CHANGE_COST} credits. You have {formatNumber(credits)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-username">New username</Label>
            <Input
              id="new-username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              maxLength={24}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUsernameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={doChangeUsername}
              disabled={changing || credits < USERNAME_CHANGE_COST || newUsername === profile.username}
            >
              {changing ? "Changing…" : `Change for ${USERNAME_CHANGE_COST}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

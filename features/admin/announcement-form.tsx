"use client";

import { useState, useTransition } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adminPublishAnnouncement } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [publish, setPublish] = useState(true);
  const [notify, setNotify] = useState(true);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await adminPublishAnnouncement({
        title,
        body,
        level,
        published: publish,
        notify,
        link_label: linkLabel,
        link_href: linkHref,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success(
        publish
          ? notify
            ? "Published & sent to every player"
            : "Announcement published"
          : "Announcement saved as draft",
      );
      setTitle("");
      setBody("");
      setLinkLabel("");
      setLinkHref("");
      router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4 text-primary" /> New announcement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Link label (optional)</Label>
            <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} maxLength={40} placeholder="Learn more" />
          </div>
          <div className="space-y-1.5">
            <Label>Link URL (optional)</Label>
            <Input value={linkHref} onChange={(e) => setLinkHref(e.target.value)} maxLength={300} placeholder="/shop or https://…" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={publish} onCheckedChange={setPublish} />
            Publish now
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={notify} onCheckedChange={setNotify} disabled={!publish} />
            Notify everyone
          </label>
          <Button variant="gradient" className="ml-auto" onClick={submit} disabled={pending || !title || !body}>
            {pending ? "Sending…" : publish ? "Publish" : "Save draft"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

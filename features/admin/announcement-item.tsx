"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminUpdateAnnouncement, adminDeleteAnnouncement } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { timeAgo } from "@/lib/utils";

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  level: string;
  published: boolean;
  created_at: string;
}

export function AnnouncementItem({ item }: { item: AdminAnnouncement }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [level, setLevel] = useState(item.level);
  const [published, setPublished] = useState(item.published);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await adminUpdateAnnouncement(item.id, { title, body, level, published });
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success("Announcement updated");
      setEditOpen(false);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const res = await adminDeleteAnnouncement(item.id);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success("Announcement deleted");
      setDelOpen(false);
      router.refresh();
    });

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="font-medium">{item.title}</span>
        <Badge variant={item.published ? "success" : "secondary"}>
          {item.published ? "Published" : "Draft"}
        </Badge>
        <Badge variant="outline">{item.level}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} aria-label="Edit">
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDelOpen(true)}
          aria-label="Delete"
          className="text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} />
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
                <Switch checked={published} onCheckedChange={setPublished} />
                Published
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={save} disabled={pending || !title || !body}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this announcement?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{item.title}&rdquo; will be permanently removed. This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDelOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitReport } from "@/actions/social";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REASONS = [
  "Harassment or bullying",
  "Spam or scam",
  "Hate speech",
  "Inappropriate content",
  "Cheating or exploits",
  "Impersonation",
  "Other",
];

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetUserId,
  targetId,
  label,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetType: "user" | "message" | "review";
  targetUserId?: string;
  targetId?: string;
  label: string;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await submitReport({ target_type: targetType, target_user_id: targetUserId, target_id: targetId, reason, details });
      if (!res.ok) { toast.error(res.error ?? "Could not submit report"); return; }
      toast.success("Report submitted. Thanks for keeping the Hub safe.");
      onOpenChange(false);
      setDetails("");
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {label}</DialogTitle>
          <DialogDescription>Reports are reviewed by our moderation team and kept confidential.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="details">Details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={2000}
              placeholder="Add any context that will help us review this…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

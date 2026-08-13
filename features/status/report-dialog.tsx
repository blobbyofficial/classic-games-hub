"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { reportProblem } from "@/actions/status";
import { REPORT_PROBLEMS, type ReportProblem, type StatusComponentSummary } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * "Report a problem", the other half of the Downdetector idea.
 *
 * No sign-in gate, because the person best placed to tell us sign-in is broken
 * is the person who cannot sign in. The problems are phrased as symptoms rather
 * than causes - see REPORT_PROBLEMS - and the whole form is two required taps,
 * since anything longer gets abandoned by exactly the frustrated visitor whose
 * report is most worth having.
 */
export function ReportDialog({
  components,
  defaultSlug,
  className,
}: {
  components: StatusComponentSummary[];
  defaultSlug?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<ReportProblem | "">("");
  const [slug, setSlug] = useState(defaultSlug ?? "site");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      if (!problem) {
        toast.error("Pick what is going wrong.");
        return;
      }
      const res = await reportProblem({
        slug: slug === "site" ? null : slug,
        problem,
        note,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not send that report.");
        return;
      }
      toast.success("Thanks - your report has been counted.");
      setOpen(false);
      setProblem("");
      setNote("");
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Megaphone className="size-4" />
          Report a problem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Tell us what is not working. Reports are anonymous and counted together - they are what
            shows a problem before our own checks catch it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-problem">What is going wrong?</Label>
            <Select value={problem} onValueChange={(v) => setProblem(v as ReportProblem)}>
              <SelectTrigger id="report-problem">
                <SelectValue placeholder="Pick the closest thing" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_PROBLEMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {problem && (
              <p className="text-xs text-muted-foreground">
                {REPORT_PROBLEMS.find((p) => p.value === problem)?.hint}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-area">Where?</Label>
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger id="report-area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="site">The whole site</SelectItem>
                {components.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-note">Anything else? (optional)</Label>
            <Textarea
              id="report-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="What were you doing when it broke?"
            />
            <p className="text-right text-xs text-muted-foreground tnum">{note.length}/200</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !problem}>
            {pending ? "Sending..." : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

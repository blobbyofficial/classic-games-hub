"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { rateGame } from "@/actions/games";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function RateGame({
  gameId,
  slug,
  initialRating,
  initialReview,
  isAuthed,
}: {
  gameId: string;
  slug: string;
  initialRating?: number;
  initialReview?: string;
  isAuthed: boolean;
}) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(initialReview ?? "");
  const [pending, start] = useTransition();

  if (!isAuthed) {
    return (
      <p className="text-sm text-muted-foreground">
        <a href="/login" className="font-medium text-primary hover:underline">
          Log in
        </a>{" "}
        to rate this game.
      </p>
    );
  }

  const submit = () => {
    if (rating === 0) {
      toast.error("Pick a star rating first");
      return;
    }
    start(async () => {
      const res = await rateGame(gameId, slug, { rating, review });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save rating");
        return;
      }
      toast.success("Thanks for your rating!");
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star className={cn("size-7", (hover || rating) >= i ? "fill-gold text-gold" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <Textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Share your thoughts (optional)…"
      />
      <Button onClick={submit} disabled={pending} variant="gradient" size="sm">
        {pending ? "Saving…" : initialRating ? "Update rating" : "Submit rating"}
      </Button>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteStory, postStory } from "@/actions/social";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, timeAgo } from "@/lib/utils";
import type { StoryItem } from "@/services/social";

interface CurrentUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  canPost: boolean;
}

interface AuthorGroup {
  user_id: string;
  author: StoryItem["author"];
  stories: StoryItem[];
}

export function StoriesStrip({ stories, currentUser }: { stories: StoryItem[]; currentUser: CurrentUser }) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewing, setViewing] = useState<AuthorGroup | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  const groups = useMemo<AuthorGroup[]>(() => {
    const map = new Map<string, AuthorGroup>();
    for (const s of stories) {
      const g = map.get(s.user_id) ?? { user_id: s.user_id, author: s.author, stories: [] };
      g.stories.push(s);
      map.set(s.user_id, g);
    }
    // put my own group first
    return [...map.values()].sort((a, b) => (a.user_id === currentUser.id ? -1 : b.user_id === currentUser.id ? 1 : 0));
  }, [stories, currentUser.id]);

  const mine = groups.find((g) => g.user_id === currentUser.id);
  const others = groups.filter((g) => g.user_id !== currentUser.id);

  const post = () =>
    start(async () => {
      const res = await postStory("text", text);
      if (!res.ok) return void toast.error(res.error ?? "Could not post");
      toast.success("Story posted - visible for 24 hours");
      setText("");
      setComposeOpen(false);
      router.refresh();
    });

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {/* Your story.
          Two controls rather than one: the avatar opens what you have posted,
          the + adds to it. They used to be a single button that chose between
          them, which meant that the moment you had one story the composer
          became unreachable - the reason it looked like only one story at a
          time was allowed. The database has always permitted several. */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span className="relative">
          <button
            onClick={() =>
              mine
                ? setViewing(mine)
                : currentUser.canPost
                  ? setComposeOpen(true)
                  : toast.error("Link your Discord account or reach level 15 to post stories")
            }
            aria-label={mine ? "View your story" : "Add to your story"}
          >
            <span
              className={cn(
                "block rounded-full p-0.5",
                mine ? "bg-gradient-to-tr from-primary to-accent" : "bg-transparent",
              )}
            >
              <UserAvatar
                src={currentUser.avatar_url}
                name={currentUser.display_name ?? currentUser.username}
                className="size-14 border-2 border-background"
              />
            </span>
          </button>
          {currentUser.canPost && (
            <button
              onClick={() => setComposeOpen(true)}
              aria-label="Add to your story"
              className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background transition hover:brightness-110"
            >
              <Plus className="size-3" />
            </button>
          )}
        </span>
        <span className="max-w-16 truncate text-[11px] text-muted-foreground">
          {mine ? `Your story${mine.stories.length > 1 ? ` (${mine.stories.length})` : ""}` : "Your story"}
        </span>
      </div>

      {others.map((g) => (
        <button key={g.user_id} onClick={() => setViewing(g)} className="flex shrink-0 flex-col items-center gap-1">
          <span className="block rounded-full bg-gradient-to-tr from-primary to-accent p-0.5">
            <UserAvatar
              src={g.author.avatar_url}
              name={g.author.display_name ?? g.author.username}
              className="size-14 border-2 border-background"
            />
          </span>
          <span className="max-w-16 truncate text-[11px] text-muted-foreground">
            {g.author.display_name ?? g.author.username}
          </span>
        </button>
      ))}

      {/* Composer */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to your story</DialogTitle>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="Share what you're up to… (visible to friends for 24 hours)"
          />
          <DialogFooter>
            <Button variant="gradient" onClick={post} disabled={pending || !text.trim()}>
              {pending ? "Posting…" : "Post story"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewer */}
      <StoryViewer
        group={viewing}
        isMine={viewing?.user_id === currentUser.id}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function StoryViewer({
  group,
  isMine,
  onClose,
}: {
  group: AuthorGroup | null;
  isMine: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [pending, start] = useTransition();
  const story = group?.stories[idx];

  const next = () => {
    if (!group) return;
    if (idx < group.stories.length - 1) setIdx(idx + 1);
    else {
      setIdx(0);
      onClose();
    }
  };

  const remove = () => {
    if (!story) return;
    start(async () => {
      const res = await deleteStory(story.id);
      if (!res.ok) return void toast.error(res.error ?? "Could not delete");
      toast.success("Story deleted");
      // Close rather than trying to re-index into a list the server is about to
      // replace: `stories` is server data, and refresh() is what re-derives the
      // groups. Stepping the index locally would show a story that no longer
      // exists until the refresh landed.
      setIdx(0);
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={Boolean(group)}
      onOpenChange={(v) => {
        if (!v) {
          setIdx(0);
          onClose();
        }
      }}
    >
      <DialogContent hideClose className="max-w-sm p-0">
        {group && story && (
          <div className="overflow-hidden rounded-2xl">
            {/* progress bars */}
            <div className="flex gap-1 p-2">
              {group.stories.map((_, i) => (
                <span
                  key={i}
                  className={cn("h-0.5 flex-1 rounded-full", i <= idx ? "bg-primary" : "bg-muted")}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 pb-2">
              <UserAvatar
                src={group.author.avatar_url}
                name={group.author.display_name ?? group.author.username}
                className="size-8"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{group.author.display_name ?? group.author.username}</p>
                <p className="text-[11px] text-muted-foreground">{timeAgo(story.created_at)}</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>
            <button
              onClick={next}
              className="grid min-h-52 w-full place-items-center bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center"
            >
              <p className="text-lg font-medium">{story.content}</p>
            </button>
            <div className="flex items-center justify-between gap-2 p-2">
              {isMine ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={remove}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" /> {pending ? "Deleting…" : "Delete"}
                </Button>
              ) : (
                <span />
              )}
              <Button variant="ghost" size="sm" onClick={next}>
                {idx < group.stories.length - 1 ? "Next" : "Done"} <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

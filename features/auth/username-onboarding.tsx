"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { chooseUsername } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UsernameOnboarding({ suggested }: { suggested: string }) {
  const [value, setValue] = useState(suggested);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await chooseUsername(value.trim());
      if (!res.ok) {
        toast.error(res.error ?? "Could not set that username");
        return;
      }
      toast.success("You're all set - welcome aboard!");
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          autoComplete="off"
          maxLength={24}
          placeholder="your_name"
        />
        <p className="text-xs text-muted-foreground">
          3–24 letters, numbers or underscores. This one&apos;s on us - you can change it later.
        </p>
      </div>
      <Button type="submit" variant="gradient" className="h-11 w-full" disabled={pending}>
        {pending ? "Saving…" : "Claim username"}
      </Button>
    </form>
  );
}

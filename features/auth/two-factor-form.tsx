"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { verifyTwoFactorChallenge, useRecoveryCode, type TwoFactorState } from "@/actions/two-factor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The login challenge. The session behind it is authenticated but `aal1`, so
 * until one of these two forms succeeds it can reach nothing - see
 * lib/supabase/middleware.ts.
 */
export function TwoFactorForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"code" | "recovery">("code");
  const [value, setValue] = useState("");
  const [state, setState] = useState<TwoFactorState>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = mode === "code" ? await verifyTwoFactorChallenge(value) : await useRecoveryCode(value);
      setState(res);
      if (res?.message) {
        // The proxy decides where a cleared session may go; refresh so it gets
        // the chance rather than pushing straight to `next` on trust.
        router.replace(next);
        router.refresh();
      }
    });
  };

  const switchMode = (to: "code" | "recovery") => {
    setMode(to);
    setValue("");
    setState(null);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "code" ? (
        <div className="space-y-1.5">
          <Label htmlFor="totp">6-digit code</Label>
          <Input
            id="totp"
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            placeholder="123456"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-center font-mono text-lg tracking-[0.4em]"
            required
          />
          <p className="text-xs text-muted-foreground">
            From the authenticator app you set up. It changes every 30 seconds.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="recovery">Recovery code</Label>
          <Input
            id="recovery"
            name="recovery"
            autoComplete="off"
            autoFocus
            placeholder="ABCDE-FGHIJ"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-center font-mono tracking-widest uppercase"
            required
          />
          <p className="text-xs text-muted-foreground">
            One of the codes you saved when you turned two-factor on. Each one works once, and using
            one turns two-factor off so you can set it up again.
          </p>
        </div>
      )}

      {state?.error && (
        <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </p>
      )}

      <Button type="submit" variant="gradient" className="h-11 w-full" disabled={pending}>
        {pending ? "Checking…" : mode === "code" ? "Verify" : "Use recovery code"}
      </Button>

      <button
        type="button"
        onClick={() => switchMode(mode === "code" ? "recovery" : "code")}
        className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        {mode === "code" ? (
          <>
            <KeyRound className="size-4" /> Lost your phone? Use a recovery code
          </>
        ) : (
          <>
            <ShieldCheck className="size-4" /> Back to the authenticator code
          </>
        )}
      </button>
    </form>
  );
}

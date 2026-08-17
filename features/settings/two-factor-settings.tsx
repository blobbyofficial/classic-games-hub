"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import {
  cancelTwoFactorEnrollment,
  confirmTwoFactorEnrollment,
  disableTwoFactor,
  regenerateRecoveryCodes,
  startTwoFactorEnrollment,
  type EnrollmentStart,
} from "@/actions/two-factor";
import type { TwoFactorState } from "@/services/two-factor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Two-factor authentication in Settings → Security.
 *
 * Three states, and the middle one is the fiddly bit: off, mid-enrolment (a QR
 * on screen and an unverified factor on the server), and on. Closing the dialog
 * during enrolment cancels the factor rather than leaving it half-made, so the
 * page never disagrees with what a login will ask for.
 */
export function TwoFactorSettings({ state }: { state: TwoFactorState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [enrollment, setEnrollment] = useState<EnrollmentStart | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  const reset = () => {
    setCode("");
    setDisableCode("");
    setError(null);
  };

  const begin = () =>
    startTransition(async () => {
      reset();
      setNotice(null);
      const res = await startTwoFactorEnrollment();
      if (!res.ok) setError(res.error);
      else setEnrollment(res.enrollment);
    });

  const closeEnrollment = () => {
    const factorId = enrollment?.factorId;
    setEnrollment(null);
    reset();
    if (factorId) startTransition(() => cancelTwoFactorEnrollment(factorId));
  };

  const confirm = () =>
    startTransition(async () => {
      if (!enrollment) return;
      setError(null);
      const res = await confirmTwoFactorEnrollment(enrollment.factorId, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEnrollment(null);
      setCode("");
      setRecoveryCodes(res.recoveryCodes);
      router.refresh();
    });

  const regenerate = () =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const res = await regenerateRecoveryCodes();
      if (!res.ok) setError(res.error);
      else {
        setRecoveryCodes(res.recoveryCodes);
        router.refresh();
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      setError(null);
      const res = await disableTwoFactor(disableCode);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDisabling(false);
      setDisableCode("");
      setNotice(res?.message ?? null);
      router.refresh();
    });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              {state.enabled ? (
                <ShieldCheck className="size-5 text-success" />
              ) : (
                <ShieldOff className="size-5 text-muted-foreground" />
              )}
              Two-factor authentication
            </CardTitle>
            <Badge variant={state.enabled ? "success" : "secondary"}>
              {state.enabled ? "On" : "Off"}
            </Badge>
          </div>
          <CardDescription>
            {state.enabled
              ? "Logging in asks for a code from your authenticator app as well as your password."
              : "Ask for a code from an authenticator app at login, so a stolen password is not enough on its own."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state.enabled ? (
            <>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Smartphone className="size-4 text-muted-foreground" />
                  {state.factors[0]?.friendlyName ?? "Authenticator app"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Added {formatDate(state.factors[0]?.createdAt)} ·{" "}
                  {state.recovery.remaining} of {state.recovery.total || 0} recovery codes left
                </p>
              </div>

              {state.recovery.remaining === 0 && (
                <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  You have no recovery codes left. Generate a new set - without one, losing your
                  phone means losing the account.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={regenerate} disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Generate new recovery codes
                </Button>
                <Button variant="destructive" onClick={() => setDisabling(true)} disabled={pending}>
                  Turn off
                </Button>
              </div>
            </>
          ) : (
            <Button variant="gradient" onClick={begin} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Set up two-factor
            </Button>
          )}

          {error && !enrollment && !disabling && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </p>
          )}
          {notice && (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" /> {notice}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Enrolment ── */}
      <Dialog open={enrollment !== null} onOpenChange={(open) => !open && closeEnrollment()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up your authenticator app</DialogTitle>
            <DialogDescription>
              Scan this with Google Authenticator, Authy, 1Password, or any other TOTP app, then
              enter the code it shows.
            </DialogDescription>
          </DialogHeader>

          {enrollment && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {/* An inline SVG data URL from the action - nothing to fetch, and
                    nothing for next/image to optimise. */}
                <img
                  src={enrollment.qr}
                  alt="QR code for your authenticator app"
                  width={180}
                  height={180}
                  className="rounded-lg bg-white p-2"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Or enter this key by hand</Label>
                <CopyRow value={enrollment.secret} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="enroll-code">6-digit code</Label>
                <Input
                  id="enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center font-mono text-lg tracking-[0.4em]"
                />
              </div>

              {error && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" /> {error}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeEnrollment} disabled={pending}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={confirm} disabled={pending || code.length < 6}>
              {pending ? "Verifying…" : "Turn on"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Recovery codes, shown once ── */}
      <Dialog open={recoveryCodes !== null} onOpenChange={(open) => !open && setRecoveryCodes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your recovery codes</DialogTitle>
            <DialogDescription>
              Each code works once, and this is the only time they are shown. Keep them somewhere you
              can reach without your phone.
            </DialogDescription>
          </DialogHeader>

          {recoveryCodes && (
            <>
              <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm">
                {recoveryCodes.map((c) => (
                  <li key={c} className="text-center tracking-wider">
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={recoveryCodes.join("\n")} label="Copy all" />
                <Button variant="outline" size="sm" onClick={() => downloadCodes(recoveryCodes)}>
                  <Download className="size-4" /> Download
                </Button>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="gradient" onClick={() => setRecoveryCodes(null)}>
              I have saved them
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Turning it off ── */}
      <Dialog
        open={disabling}
        onOpenChange={(open) => {
          if (!open) {
            setDisabling(false);
            reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn off two-factor authentication?</DialogTitle>
            <DialogDescription>
              Your password alone will be enough to log in. Enter a code from your app to confirm it
              is you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="disable-code">6-digit code</Label>
            <Input
              id="disable-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              className="text-center font-mono text-lg tracking-[0.4em]"
            />
            {error && (
              <p className="flex items-center gap-2 pt-1 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" /> {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDisabling(false);
                reset();
              }}
              disabled={pending}
            >
              Keep it on
            </Button>
            <Button variant="destructive" onClick={turnOff} disabled={pending || disableCode.length < 6}>
              {pending ? "Turning off…" : "Turn off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CopyRow({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wider">
        {value}
      </code>
      <CopyButton value={value} label="Copy" />
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied - the value is on screen to be selected.
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={copy} type="button">
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** A text file of the codes, built and revoked in the browser. */
function downloadCodes(codes: string[]) {
  const body = [
    "Classic Games Hub - two-factor recovery codes",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Each code works once. Keep them somewhere you can reach without your phone.",
    "",
    ...codes.map((c) => `  ${c}`),
    "",
  ].join("\n");

  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "classic-games-hub-recovery-codes.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso?: string) {
  if (!iso) return "recently";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

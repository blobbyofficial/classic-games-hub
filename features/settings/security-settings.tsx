"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { updatePassword, type AuthState } from "@/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" disabled={pending}>
      {pending ? "Updating…" : "Update password"}
    </Button>
  );
}

export function SecuritySettings() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Set or change the password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required />
          </div>
          {state?.error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </p>
          )}
          {state?.message && (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> {state.message}
            </p>
          )}
          <Submit />
        </form>
      </CardContent>
    </Card>
  );
}

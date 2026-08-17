import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { TwoFactorForm } from "@/features/auth/two-factor-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Two-factor authentication", robots: { index: false } };

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // The proxy already keeps satisfied and signed-out sessions off this page;
  // this is the same check on the page itself, so a direct render cannot show a
  // challenge to somebody who has nothing to answer.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next ?? "/")}`);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!(aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2")) redirect(next ?? "/");

  // A relative path only: `next` arrives in a URL and must not be able to send
  // anyone to another origin after they authenticate.
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <Card className="glass border-border/60 shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <CardTitle className="text-2xl">One more step</CardTitle>
        <CardDescription>
          This account is protected by two-factor authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <TwoFactorForm next={target} />

        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full text-muted-foreground">
            Sign out instead
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

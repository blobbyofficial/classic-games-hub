import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { UsernameOnboarding } from "@/features/auth/username-onboarding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Choose your username" };

export default async function WelcomePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.needs_username) redirect("/");

  return (
    <Card className="glass border-border/60 shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 grid size-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),oklch(0.6_0.2_330))] text-white shadow-lg shadow-primary/30">
          <Sparkles className="size-5" />
        </div>
        <CardTitle className="text-2xl">Pick your username</CardTitle>
        <CardDescription>It&apos;s how other players will find you on the leaderboards.</CardDescription>
      </CardHeader>
      <CardContent>
        <UsernameOnboarding suggested={profile.username} />
      </CardContent>
    </Card>
  );
}

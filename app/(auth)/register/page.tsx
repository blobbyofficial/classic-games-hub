import Link from "next/link";
import type { Metadata } from "next";
import { Coins, Trophy, Users } from "lucide-react";
import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign up" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <Card className="glass border-border/60 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Free forever. Start with 100 credits on us.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
          <Perk icon={Coins} label="100 credits" />
          <Perk icon={Trophy} label="Achievements" />
          <Perk icon={Users} label="Friends & chat" />
        </div>

        <OAuthButtons next={next} />

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to play fair and be kind to other players.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Perk({ icon: Icon, label }: { icon: typeof Coins; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 py-2">
      <Icon className="size-4 text-primary" />
      {label}
    </div>
  );
}

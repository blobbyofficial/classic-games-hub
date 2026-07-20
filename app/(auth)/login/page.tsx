import Link from "next/link";
import type { Metadata } from "next";
import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { PasswordForm } from "@/features/auth/password-form";
import { AuthDivider } from "@/features/auth/auth-divider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <Card className="glass border-border/60 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to keep your credits, streak and progress.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <PasswordForm mode="login" next={next} />

        <AuthDivider />

        <OAuthButtons next={next} />

        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

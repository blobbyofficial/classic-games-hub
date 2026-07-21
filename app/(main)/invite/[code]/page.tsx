import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Group invite" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/invite/${code}`);

  const supabase = await createClient();
  const { data } = await supabase.rpc("join_group", { p_code: code });
  const res = data as { ok: boolean; conversation_id?: string; error?: string } | null;

  if (res?.ok && res.conversation_id) {
    redirect(`/messages/${res.conversation_id}`);
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardContent className="grid place-items-center gap-3 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </span>
          <p className="font-semibold">This invite isn&apos;t valid</p>
          <p className="text-sm text-muted-foreground">{res?.error ?? "The group may have been removed."}</p>
          <Link href="/messages" className="mt-1 text-sm font-medium text-primary hover:underline">
            Back to messages
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

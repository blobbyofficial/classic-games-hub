"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred. You can try again, or head back home.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="gradient" onClick={reset}>
            <RotateCcw /> Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home /> Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center motion-safe:animate-pop">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="text-title font-bold">Something went wrong</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          This page hit an unexpected error. Trying again usually sorts it - if it doesn&apos;t,
          head home and carry on from there.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button variant="gradient" onClick={reset}>
            <RotateCcw /> Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home /> Home
            </Link>
          </Button>
        </div>
        {error.digest && (
          /* The digest is the only handle support has on a specific failure -
             worth showing, quietly. */
          <p className="mt-6 font-mono text-[11px] text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

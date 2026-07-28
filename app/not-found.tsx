import Link from "next/link";
import { Home, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";

export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-aurora px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="relative text-center motion-safe:animate-rise">
        <Logo className="mb-10 justify-center" />
        <p className="text-[clamp(5rem,22vw,9rem)] font-black leading-none text-gradient">404</p>
        <h1 className="mt-3 text-title font-bold">Game over — page not found</h1>
        <p className="mx-auto mt-2 max-w-sm leading-relaxed text-muted-foreground">
          This screen doesn&apos;t exist. Let&apos;s get you back in the game.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button size="lg" variant="gradient" asChild>
            <Link href="/">
              <Home /> Home
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/games">
              <Gamepad2 /> Browse games
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

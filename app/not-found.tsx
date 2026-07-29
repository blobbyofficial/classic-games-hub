import Link from "next/link";
import { Home, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-grid px-4">
      <div className="text-center">
        <Logo className="mb-8 justify-center" />
        <p className="text-[8rem] font-black leading-none text-gradient">404</p>
        <h1 className="mt-2 text-2xl font-bold">Game over - page not found</h1>
        <p className="mt-2 text-muted-foreground">This screen doesn&apos;t exist. Let&apos;s get you back in the game.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="gradient" asChild>
            <Link href="/">
              <Home /> Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/games">
              <Gamepad2 /> Browse games
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

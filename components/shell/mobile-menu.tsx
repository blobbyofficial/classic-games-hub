"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Menu, X, ExternalLink, LogOut, Settings, UserRound } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { DiscordIcon } from "@/components/icons";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/actions/auth";
import { PRIMARY_NAV, SOCIAL_NAV, LIBRARY_NAV, SITE, type NavItem } from "@/lib/constants";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn, formatNumber } from "@/lib/utils";

/** Slide-in navigation drawer for phones - opened from the navbar hamburger. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const userId = useSessionStore((s) => s.userId);
  const profile = useSessionStore((s) => s.profile);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="focus-visible-ring grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[80%] max-w-xs flex-col border-r border-border bg-background shadow-2xl duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>

          <div className="flex items-center justify-between px-4 py-3.5">
            <Logo />
            <Dialog.Close className="focus-visible-ring grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent/60 hover:text-foreground">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          {/* Account block */}
          <div className="px-4 pb-2">
            {userId && profile ? (
              <Link
                href={`/u/${profile.username}`}
                onClick={close}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <UserAvatar src={profile.avatar_url} name={profile.display_name ?? profile.username} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{profile.display_name ?? profile.username}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Lv {profile.level} · {formatNumber(profile.credits)} credits
                  </p>
                </div>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild onClick={close}>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button variant="gradient" asChild onClick={close}>
                  <Link href="/register">Sign up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            <nav className="space-y-0.5">
              {PRIMARY_NAV.map((item) => (
                <DrawerLink key={item.href} item={item} onNavigate={close} />
              ))}
            </nav>

            {userId && (
              <>
                <SectionLabel>Social</SectionLabel>
                <nav className="space-y-0.5">
                  {SOCIAL_NAV.map((item) => (
                    <DrawerLink key={item.href} item={item} onNavigate={close} />
                  ))}
                </nav>
                <SectionLabel>Library</SectionLabel>
                <nav className="space-y-0.5">
                  {LIBRARY_NAV.map((item) => (
                    <DrawerLink key={item.href} item={item} onNavigate={close} />
                  ))}
                </nav>
              </>
            )}

            <Separator className="my-2" />
            <Link
              href="/roadmap"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <UserRound className="size-[18px]" /> Roadmap
            </Link>
            {userId && (
              <Link
                href="/settings"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <Settings className="size-[18px]" /> Settings
              </Link>
            )}
          </div>

          {/* Footer actions */}
          <div className="space-y-2 border-t border-border/60 p-3">
            <div className="flex items-center justify-between rounded-xl px-3 py-1.5">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <a
              href={SITE.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-[#5865F2]/10 px-3 py-2.5 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/20"
            >
              <DiscordIcon className="size-[18px]" /> Join Discord
              <ExternalLink className="ml-auto size-3.5 opacity-60" />
            </a>
            {userId && (
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-[18px]" /> Sign out
                </button>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </p>
  );
}

function DrawerLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const badge = useSessionStore((s) =>
    item.badgeKey === "notifications"
      ? s.unreadNotifications
      : item.badgeKey === "friendRequests"
        ? s.pendingFriendRequests
        : 0,
  );

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="mobile-menu-active"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <item.icon className="relative z-10 size-[18px]" />
      <span className="relative z-10">{item.label}</span>
      {badge > 0 && (
        <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white tabular-nums">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

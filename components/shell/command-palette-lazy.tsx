"use client";

import dynamic from "next/dynamic";

// The command palette (cmdk) is only needed after hydration and on demand, so
// split it into its own chunk instead of shipping it in every page's bundle.
const CommandPalette = dynamic(
  () => import("./command-palette").then((m) => m.CommandPalette),
  { ssr: false },
);

export function CommandPaletteLazy() {
  return <CommandPalette />;
}

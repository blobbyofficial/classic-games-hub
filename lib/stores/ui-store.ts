"use client";

import { create } from "zustand";

interface UIState {
  commandOpen: boolean;
  mobileNavOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setMobileNav: (open: boolean) => void;
}

/** Global UI toggles shared across the shell (command palette, mobile nav). */
export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  mobileNavOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
}));

"use client";

import { create } from "zustand";
import type { Profile, UserSettings } from "@/types";

interface SessionState {
  userId: string | null;
  profile: Profile | null;
  settings: UserSettings | null;
  unreadNotifications: number;
  pendingFriendRequests: number;
  setSession: (data: {
    userId: string | null;
    profile: Profile | null;
    settings: UserSettings | null;
  }) => void;
  patchProfile: (patch: Partial<Profile>) => void;
  setCredits: (credits: number) => void;
  setUnread: (n: number) => void;
  setPendingRequests: (n: number) => void;
}

/**
 * Lightweight client mirror of the current user's identity + economy figures.
 * Hydrated once from the server layout, then patched optimistically by actions
 * (credits after a purchase, unread badge on realtime notifications, etc.).
 */
export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  profile: null,
  settings: null,
  unreadNotifications: 0,
  pendingFriendRequests: 0,
  setSession: ({ userId, profile, settings }) => set({ userId, profile, settings }),
  patchProfile: (patch) =>
    set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : {})),
  setCredits: (credits) => set((s) => (s.profile ? { profile: { ...s.profile, credits } } : {})),
  setUnread: (unreadNotifications) => set({ unreadNotifications }),
  setPendingRequests: (pendingFriendRequests) => set({ pendingFriendRequests }),
}));

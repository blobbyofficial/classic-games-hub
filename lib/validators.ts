import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(24, "At most 24 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only");

export const emailSchema = z.string().trim().email("Enter a valid email");

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "At most 72 characters");

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().max(40).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

export const messageSchema = z.string().trim().min(1).max(2000);

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const reportSchema = z.object({
  target_type: z.enum(["user", "message", "review"]),
  target_user_id: z.string().uuid().optional(),
  target_id: z.string().optional(),
  reason: z.string().trim().min(3).max(100),
  details: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  ads_enabled: z.boolean().optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  reduced_motion: z.boolean().optional(),
  show_online_status: z.boolean().optional(),
  allow_friend_requests: z.boolean().optional(),
  allow_dms: z.enum(["everyone", "friends", "none"]).optional(),
  email_notifications: z.boolean().optional(),
});

export const gameUpsertSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(80),
  tagline: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.string().min(1),
  engine_id: z.string().min(1),
  status: z.enum(["published", "draft", "archived", "coming_soon"]),
  featured: z.boolean(),
  difficulty: z.enum(["easy", "normal", "hard"]),
});

export const bannerPayloadSchema = z.object({
  message: z.string().trim().max(200, "At most 200 characters"),
  variant: z.enum(["info", "success", "warning", "promo"]).optional(),
  link_label: z.string().trim().max(40, "At most 40 characters").optional().or(z.literal("")),
  link_href: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v),
      "Use a full URL or an internal path starting with /",
    )
    .optional()
    .or(z.literal("")),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  level: z.enum(["info", "update", "event", "alert"]),
  published: z.boolean(),
});

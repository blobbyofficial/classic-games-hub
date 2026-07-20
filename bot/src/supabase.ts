import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

/**
 * Server-side Supabase client using the SECRET (service_role) key. Only the
 * bot_* RPCs are granted to service_role, so all Hub access goes through them.
 */
export const supabase = createClient(config.supabaseUrl, config.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

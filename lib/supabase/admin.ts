import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env, requireServiceRole } from "@/lib/env";

export function createSupabaseAdminClient() {
  return createClient<Database>(env.supabaseUrl, requireServiceRole(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

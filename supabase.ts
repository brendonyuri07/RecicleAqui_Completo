import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

export type SupabaseDb = SupabaseClient;

let client: SupabaseDb | null = null;

export function getSupabase(): SupabaseDb {
  if (!ENV.supabaseUrl || !ENV.supabaseServerKey) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVER_KEY precisam estar configurados.");
  }
  if (!client) {
    client = createClient(ENV.supabaseUrl, ENV.supabaseServerKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export function isSupabaseConfigured() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseServerKey);
}

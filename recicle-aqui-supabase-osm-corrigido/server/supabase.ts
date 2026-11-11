import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import { throwDatabaseError } from "./errors";

export type SupabaseDb = SupabaseClient;

let client: SupabaseDb | null = null;

export function getSupabase(): SupabaseDb {
  if (!ENV.supabaseUrl || !ENV.supabaseServerKey) {
    throwDatabaseError({});
  }
  if (!client) {
    client = createClient(ENV.supabaseUrl, ENV.supabaseServerKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: timedFetch },
    });
  }
  return client;
}

export function isSupabaseConfigured() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseServerKey);
}

// Login uses an isolated client so a user session cannot replace the service-role session.
export function createAuthClient(): SupabaseDb {
  if (!ENV.supabaseUrl || !ENV.supabaseServerKey) throwDatabaseError({});
  return createClient(
    ENV.supabaseUrl,
    ENV.supabasePublishableKey || ENV.supabaseServerKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { fetch: timedFetch },
    }
  );
}

const timedFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(8_000)])
      : AbortSignal.timeout(8_000),
  });

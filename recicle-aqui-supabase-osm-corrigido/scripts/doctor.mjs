import "dotenv/config";
import { lookup } from "node:dns/promises";
import { createClient } from "@supabase/supabase-js";
let failures = 0;
function report(ok, text) {
  console.log(`${ok ? "OK" : "PENDENTE"}: ${text}`);
  if (!ok) failures++;
}
const url = process.env.SUPABASE_URL?.trim();
const key =
  process.env.SUPABASE_SERVER_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
report(
  (process.env.JWT_SECRET?.length ?? 0) >= 32,
  "JWT_SECRET com pelo menos 32 caracteres"
);
report(
  Boolean(process.env.OWNER_OPEN_ID),
  "UUID da conta proprietária configurado"
);
report(Boolean(key), "Chave privada do Supabase configurada no servidor");
let reachable = false;
try {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error();
  await lookup(parsed.hostname);
  reachable = true;
} catch {}
report(
  reachable,
  "Project URL válido e com DNS acessível (copie a URL do painel Supabase)"
);
if (reachable && key) {
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
    },
  });
  for (const table of [
    "users",
    "collection_points",
    "point_materials",
    "point_messages",
    "activity_logs",
  ]) {
    const { error } = await db
      .from(table)
      .select("id", { count: "exact", head: true });
    report(!error, `Acesso à tabela ${table}`);
  }
}
process.exitCode = failures ? 1 : 0;

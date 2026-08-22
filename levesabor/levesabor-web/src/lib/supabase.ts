// INT-01 · Cliente Supabase Auth singleton (decisão BE-B01: o frontend fala
// directamente com o Supabase Auth via supabase-js, não com endpoints de
// login/refresh/logout próprios). persistSession/autoRefreshToken vêm true
// por omissão no SDK — é o que resolve o gap de sessão não sobreviver a
// reload, ver auth.ts.
//
// Construção PREGUIÇOSA (não ao carregar o módulo): auth.ts continua a
// suportar NEXT_PUBLIC_USE_MOCKS=true (dev sem Supabase real nenhum) — se
// createClient() corresse eagerly aqui, faltar as env vars partia a app
// mesmo em modo mocks, que nunca chega a usar isto.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta — copia .env.example para .env.local.",
      );
    }
    client = createClient(url, anonKey);
  }
  return client;
}

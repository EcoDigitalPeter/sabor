import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(__dirname, ".env.seed"));

const DRY_RUN = process.argv.includes("--dry-run");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente em falta: ${name} (ver scripts/.env.seed.example)`);
  }
  return value;
}

async function loginAdmin(): Promise<string> {
  const supabaseUrl = requireEnv("SEED_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SEED_SUPABASE_ANON_KEY");
  const email = requireEnv("SEED_ADMIN_EMAIL");
  const password = requireEnv("SEED_ADMIN_PASSWORD");

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Falha no login Supabase: ${error?.message ?? "sem sessão"}`);
  }

  const payload = JSON.parse(
    Buffer.from(data.session.access_token.split(".")[1], "base64url").toString("utf-8"),
  );
  if (payload.role !== "ADMIN") {
    throw new Error(
      `Utilizador ${email} não tem claim role=ADMIN neste token (tem "${payload.role}"). ` +
        `Promove-o em users.role e faz login de novo antes de correr o seed — ver Task 5 do plano.`,
    );
  }

  return data.session.access_token;
}

async function main() {
  const apiUrl = requireEnv("SEED_API_URL");
  console.log(`A autenticar contra ${process.env.SEED_SUPABASE_URL}...`);
  const token = await loginAdmin();
  console.log(`Login OK, role=ADMIN confirmado. Alvo da API: ${apiUrl}${DRY_RUN ? " (--dry-run)" : ""}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

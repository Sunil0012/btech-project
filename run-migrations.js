import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = "https://ukiuxecvybwvngwirjqt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_KEY environment variable not set");
  console.error(
    "Please set your Supabase service role key as SUPABASE_SERVICE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigrations() {
  const migrationsDir = path.join(
    process.cwd(),
    "supabase",
    "migrations"
  );
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`\nRunning migration: ${file}`);
    try {
      const { error } = await supabase.rpc("exec", { sql });
      if (error) {
        console.error(`Error in ${file}:`, error);
      } else {
        console.log(`✓ Completed: ${file}`);
      }
    } catch (err) {
      console.error(`Exception in ${file}:`, err.message);
    }
  }

  console.log("\n✓ All migrations processed");
}

runMigrations().catch(console.error);

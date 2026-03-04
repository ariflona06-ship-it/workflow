import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

// Lazy initialization - only creates connection when actually called at runtime
export function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql;
}

// Alias for getDb
export const getDb = sql;

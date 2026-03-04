import { neon } from "@neondatabase/serverless";

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(process.env.DATABASE_URL!);
}

// Convenience tagged-template export used by API routes
export const sql = neon(process.env.DATABASE_URL!);

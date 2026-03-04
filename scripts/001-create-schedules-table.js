import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Creating user_schedules table...');

  await sql`
    CREATE TABLE IF NOT EXISTS user_schedules (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      schedule_type TEXT NOT NULL DEFAULT 'week',
      schedule_data JSONB NOT NULL,
      preferences JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_schedules_user_id ON user_schedules(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_schedules_email ON user_schedules(user_email)
  `;

  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

CREATE TABLE IF NOT EXISTS user_schedules (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'week',
  schedule_data JSONB NOT NULL,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_schedules_user_id ON user_schedules (user_id);

-- Only keep one active schedule per user (latest one)
-- We'll handle this in app logic by upserting

-- Migration 004: user_notification_preferences
-- stores granular opt-in/out per notification category per user

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  alimentacao   BOOLEAN NOT NULL DEFAULT true,
  vacinas       BOOLEAN NOT NULL DEFAULT true,
  social_likes  BOOLEAN NOT NULL DEFAULT true,
  social_follows BOOLEAN NOT NULL DEFAULT true,
  aniversario   BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- only the owner can read/write their own preferences
CREATE POLICY "users can manage own preferences"
  ON user_notification_preferences
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

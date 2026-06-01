-- Migration 009: add fcm_token column to push_tokens for Firebase Cloud Messaging
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Also add a notifications table if it doesn't exist already
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'social',
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB,
  read_at     TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Ensure consultations have a notified column for push scheduling
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS notified BOOLEAN NOT NULL DEFAULT false;

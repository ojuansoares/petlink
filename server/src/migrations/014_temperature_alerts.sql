-- Add temperatura column to user_notification_preferences
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS temperatura BOOLEAN NOT NULL DEFAULT true;

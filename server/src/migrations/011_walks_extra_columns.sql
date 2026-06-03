-- Migration 011: add photo_url, calories, avg_pace_min_km, max_speed_kmh to walks
ALTER TABLE walks ADD COLUMN IF NOT EXISTS photo_url        text;
ALTER TABLE walks ADD COLUMN IF NOT EXISTS calories         numeric;
ALTER TABLE walks ADD COLUMN IF NOT EXISTS avg_pace_min_km  numeric;
ALTER TABLE walks ADD COLUMN IF NOT EXISTS max_speed_kmh    numeric;

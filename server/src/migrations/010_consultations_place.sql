-- Migration 010: add place columns to consultations for OpenStreetMap location linking
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS place_osm_id     bigint;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS place_osm_type   text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS place_name       text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS place_address    text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS place_lat        numeric;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS place_lng        numeric;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS place_category   text;

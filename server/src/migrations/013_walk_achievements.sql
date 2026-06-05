-- Migration 013: walk achievements
-- Run in Supabase SQL Editor

INSERT INTO public.achievements (key, name, description, icon, category, xp_reward, criteria_type, criteria_threshold, sort_order) VALUES
  ('first_walk',        'Primeiro Passeio',      'Completou o primeiro passeio',                     'walk-outline',          'activity',  50,   'walk_count',     1,      10),
  ('regular_walker',    'Caminhante Regular',    'Completou 10 passeios',                            'footsteps-outline',     'activity', 100,   'walk_count',     10,     11),
  ('explorer',          'Explorador',            'Completou 30 passeios',                            'compass-outline',       'activity', 200,   'walk_count',     30,     12),
  ('distance_10km',     '10 km Percorridos',     'Percorreu 10 km em passeios',                      'map-outline',           'activity', 100,   'walk_distance',  10000,  13),
  ('distance_50km',     '50 km Percorridos',     'Percorreu 50 km em passeios',                      'earth-outline',         'activity', 300,   'walk_distance',  50000,  14),
  ('distance_100km',    '100 km Percorridos',    'Percorreu 100 km em passeios',                     'rocket-outline',        'activity', 500,   'walk_distance',  100000, 15)
ON CONFLICT (key) DO NOTHING;

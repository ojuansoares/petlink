-- Migration 006: gamification — achievements, user_achievements
-- Run in Supabase SQL Editor

-- 1. Achievements catalog (predefined badges)
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'trophy-outline',
  category text NOT NULL DEFAULT 'milestone',
  xp_reward integer NOT NULL DEFAULT 0,
  criteria_type text NOT NULL,
  criteria_threshold integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievements"
  ON public.achievements FOR SELECT USING (true);

-- 2. User achievements (which badges each user unlocked)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
  ON public.user_achievements FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT WITH CHECK (true);

-- 3. Seed achievements
INSERT INTO public.achievements (key, name, description, icon, category, xp_reward, criteria_type, criteria_threshold, sort_order) VALUES
  ('first_post',       'Primeiro Post',        'Publicou seu primeiro post no feed',                  'camera-outline',         'social',     50,  'post_count',      1,   1),
  ('paparazzi',        'Paparazzi',            'Publicou 10 posts no feed',                           'images-outline',         'social',    100,  'post_count',     10,   2),
  ('vaccinated',       'Vacina em Dia',        'Registrou 3 vacinas como concluídas',                 'medkit-outline',         'health',    100,  'vaccine_count',   3,   3),
  ('protector',        'Protetor',             'Registrou 10 vacinas como concluídas',                'shield-checkmark-outline', 'health', 200,  'vaccine_count',  10,   4),
  ('feeding_week',     'Refeição Feita',       'Completou a alimentação por 7 dias',                  'nutrition-outline',      'feeding',   100,  'feeding_days',    7,   5),
  ('feeding_month',    'Dieta de Ouro',        'Completou a alimentação por 30 dias',                 'flame-outline',          'feeding',   300,  'feeding_days',   30,   6),
  ('social',           'Social',               'Entrou em 3 grupos',                                 'people-outline',         'social',    100,  'groups_joined',   3,   7),
  ('leader',           'Líder',                'Criou um grupo',                                     'star-outline',           'social',    150,  'groups_created',  1,   8),
  ('veteran',          'Veterano',             'Acumulou 1.000 XP de atividades',                     'trophy-outline',         'milestone', 500,  'total_xp',     1000,   9)
ON CONFLICT (key) DO NOTHING;

-- Migration 005: groups + group_members
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  photo_url text,
  species text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);

-- Add columns that may be missing if table was created in a previous partial run
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS species text;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS member_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups"
  ON public.groups
  FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Members can view their groups"
  ON public.groups
  FOR SELECT
  USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update their group"
  ON public.groups
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete their group"
  ON public.groups
  FOR DELETE
  USING (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_unique UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view members of their groups"
  ON public.group_members
  FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join public groups"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND group_id IN (SELECT id FROM public.groups WHERE is_public = true)
  );

CREATE POLICY "Users can leave groups"
  ON public.group_members
  FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members (group_id);
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups USING gin (name gin_trgm_ops);

-- Functions to update member_count atomically
CREATE OR REPLACE FUNCTION increment_group_member_count(group_id uuid)
RETURNS void AS $$
  UPDATE public.groups SET member_count = member_count + 1 WHERE id = group_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION decrement_group_member_count(group_id uuid)
RETURNS void AS $$
  UPDATE public.groups SET member_count = member_count - 1 WHERE id = group_id;
$$ LANGUAGE sql;

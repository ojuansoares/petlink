-- Migration 008: group_invites — sistema de convites entre usuários
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_invites_pkey PRIMARY KEY (id),
  CONSTRAINT group_invites_unique UNIQUE (group_id, invited_user_id)
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invites"
  ON public.group_invites
  FOR SELECT
  USING (invited_user_id = auth.uid());

CREATE POLICY "Admins can create invites"
  ON public.group_invites
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can accept their own invites"
  ON public.group_invites
  FOR UPDATE
  USING (invited_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (invited_user_id = auth.uid() AND status IN ('accepted', 'rejected'));

CREATE POLICY "Users can reject their own invites"
  ON public.group_invites
  FOR DELETE
  USING (invited_user_id = auth.uid() AND status = 'pending');

CREATE INDEX IF NOT EXISTS idx_group_invites_user ON public.group_invites (invited_user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_group ON public.group_invites (group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON public.group_invites (status);

-- Migration: feeding_plans + feeding_logs
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.feeding_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  meal_name text NOT NULL,
  meal_time time NOT NULL,
  quantity text,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feeding_plans_pkey PRIMARY KEY (id)
);

ALTER TABLE public.feeding_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their pets feeding plans"
  ON public.feeding_plans
  FOR ALL
  USING (
    pet_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.feeding_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  meal_plan_id uuid NOT NULL REFERENCES public.feeding_plans(id) ON DELETE CASCADE,
  meal_name text NOT NULL,
  scheduled_time time NOT NULL,
  quantity text,
  order_index integer NOT NULL DEFAULT 0,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  checked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feeding_logs_pkey PRIMARY KEY (id),
  CONSTRAINT feeding_logs_unique UNIQUE (meal_plan_id, log_date)
);

ALTER TABLE public.feeding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their pets feeding logs"
  ON public.feeding_logs
  FOR ALL
  USING (
    pet_id IN (SELECT id FROM public.pets WHERE owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_feeding_logs_pet_date ON public.feeding_logs (pet_id, log_date);

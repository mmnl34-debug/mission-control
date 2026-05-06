-- Mission Control: agenda_categories tabel + category kolom voor planner_events
-- Uit te voeren in Supabase SQL editor (1x)

ALTER TABLE public.planner_events
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Algemeen';

CREATE TABLE IF NOT EXISTS public.agenda_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agenda_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_agenda_categories" ON public.agenda_categories;
CREATE POLICY "anon_all_agenda_categories" ON public.agenda_categories
  FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);

ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_categories;

INSERT INTO public.agenda_categories (name, color, is_default) VALUES
  ('Klant',             '#3b82f6', TRUE),
  ('Dokter/Ziekenhuis', '#ef4444', TRUE),
  ('Algemeen',          '#94a3b8', TRUE)
ON CONFLICT (name) DO NOTHING;

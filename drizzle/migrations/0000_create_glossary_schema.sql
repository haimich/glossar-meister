CREATE TABLE public.glossaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glossaries TO authenticated;
GRANT ALL ON public.glossaries TO service_role;
ALTER TABLE public.glossaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own glossaries select" ON public.glossaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own glossaries insert" ON public.glossaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own glossaries update" ON public.glossaries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own glossaries delete" ON public.glossaries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glossary_id UUID NOT NULL REFERENCES public.glossaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  de TEXT NOT NULL,
  ro TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX terms_glossary_idx ON public.terms(glossary_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own terms select" ON public.terms FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own terms insert" ON public.terms FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own terms update" ON public.terms FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own terms delete" ON public.terms FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.card_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  direction TEXT NOT NULL,
  level SMALLINT NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_id, direction)
);
CREATE INDEX card_progress_user_idx ON public.card_progress(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_progress TO authenticated;
GRANT ALL ON public.card_progress TO service_role;
ALTER TABLE public.card_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress select" ON public.card_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own progress insert" ON public.card_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress update" ON public.card_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress delete" ON public.card_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
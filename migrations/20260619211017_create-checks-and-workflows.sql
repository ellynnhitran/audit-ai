CREATE TYPE public.input_type AS ENUM ('document', 'audio', 'any');

CREATE TABLE public.checks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  applicable_input public.input_type NOT NULL DEFAULT 'any',
  is_deterministic BOOLEAN NOT NULL DEFAULT TRUE,
  default_parameters JSONB NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can view checks"
  ON public.checks FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON public.checks TO authenticated;

INSERT INTO public.checks (id, name, description, category, applicable_input, is_deterministic, display_order) VALUES
  ('spelling',        'Spelling & Typos',       'Detect misspelled words, typos, and commonly confused words',     'language',  'document', TRUE,  1),
  ('grammar',         'Grammar & Punctuation',  'Check grammar rules and punctuation usage',                       'language',  'document', TRUE,  2),
  ('readability',     'Clarity & Readability',  'Assess reading level, sentence complexity, and ambiguity',        'language',  'document', TRUE,  3),
  ('tone',            'Tone & Consistency',     'Analyze tone, voice consistency, formality, and register',        'language',  'any',      FALSE, 4),
  ('content-issues',  'Content Issues',         'Detect unsupported claims, contradictions, jargon, and gaps',     'content',   'any',      FALSE, 5),
  ('formatting',      'Formatting Hygiene',     'Check heading hierarchy, list consistency, and whitespace',       'structure', 'document', TRUE,  6),
  ('structure',       'Document Structure',     'Evaluate logical flow, organization, and completeness',           'structure', 'document', FALSE, 7),
  ('filler-words',    'Filler Words',           'Detect um, uh, like, you know, and other crutch phrases',         'audio',     'audio',    TRUE,  8),
  ('pacing',          'Pacing (WPM)',           'Measure words-per-minute and flag rushing or dragging',           'audio',     'audio',    TRUE,  9),
  ('pauses',          'Pauses & Dead Air',      'Identify awkward silences and run-on stretches',                  'audio',     'audio',    TRUE,  10),
  ('clarity-audio',   'Audio Clarity',          'Flag low-confidence transcription regions as unclear speech',     'audio',     'audio',    TRUE,  11),
  ('audio-anomalies', 'Audio Abnormalities',    'Detect background noise, clipping, and level changes',           'audio',     'audio',    TRUE,  12),
  ('custom-llm',      'Custom Instructions',    'Apply user-defined plain-English audit instructions via AI',     'custom',    'any',      FALSE, 13);

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  input_type public.input_type NOT NULL DEFAULT 'any',
  check_order TEXT[] NOT NULL DEFAULT '{}',
  custom_instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own workflows"
  ON public.workflows FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "users can insert own workflows"
  ON public.workflows FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users can update own workflows"
  ON public.workflows FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users can delete own workflows"
  ON public.workflows FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

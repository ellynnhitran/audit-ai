CREATE TYPE public.audit_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  status public.audit_status NOT NULL DEFAULT 'pending',
  check_order TEXT[] NOT NULL DEFAULT '{}',
  custom_instructions TEXT,
  summary_metrics JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own audits"
  ON public.audits FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "users can insert own audits"
  ON public.audits FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users can update own audits"
  ON public.audits FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.audits TO authenticated;

CREATE INDEX idx_audits_user_id ON public.audits(user_id);
CREATE INDEX idx_audits_asset_id ON public.audits(asset_id);
CREATE INDEX idx_audits_status ON public.audits(status);

CREATE TRIGGER audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

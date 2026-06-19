CREATE TYPE public.finding_severity AS ENUM ('info', 'minor', 'major');
CREATE TYPE public.finding_disposition AS ENUM ('pending', 'accepted', 'dismissed');

CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL REFERENCES public.checks(id),
  category TEXT NOT NULL,
  severity public.finding_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  location JSONB NOT NULL DEFAULT '{}',
  suggested_fix TEXT,
  original_text TEXT,
  disposition public.finding_disposition NOT NULL DEFAULT 'pending',
  user_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view findings for own audits"
  ON public.findings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audits
      WHERE audits.id = findings.audit_id
        AND audits.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "users can update findings for own audits"
  ON public.findings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audits
      WHERE audits.id = findings.audit_id
        AND audits.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audits
      WHERE audits.id = findings.audit_id
        AND audits.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, UPDATE ON public.findings TO authenticated;

CREATE INDEX idx_findings_audit_id ON public.findings(audit_id);
CREATE INDEX idx_findings_severity ON public.findings(severity);
CREATE INDEX idx_findings_disposition ON public.findings(disposition);

CREATE TRIGGER findings_updated_at
  BEFORE UPDATE ON public.findings
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- Channel patterns for audit status and findings
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
  ('audit:%', 'Per-audit status updates and findings', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description, enabled = EXCLUDED.enabled;

-- Publish audit status changes
CREATE OR REPLACE FUNCTION public.notify_audit_status()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'audit:' || NEW.id::text,
    'audit_status',
    jsonb_build_object(
      'id', NEW.id,
      'status', NEW.status,
      'summary_metrics', NEW.summary_metrics,
      'error_message', NEW.error_message,
      'completed_at', NEW.completed_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp;

CREATE TRIGGER audit_status_trigger
AFTER UPDATE ON public.audits
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_audit_status();

-- Publish new findings
CREATE OR REPLACE FUNCTION public.notify_new_finding()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'audit:' || NEW.audit_id::text,
    'new_finding',
    jsonb_build_object(
      'id', NEW.id,
      'audit_id', NEW.audit_id,
      'check_id', NEW.check_id,
      'category', NEW.category,
      'severity', NEW.severity,
      'title', NEW.title,
      'explanation', NEW.explanation,
      'location', NEW.location,
      'suggested_fix', NEW.suggested_fix,
      'original_text', NEW.original_text,
      'disposition', NEW.disposition,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp;

CREATE TRIGGER finding_insert_trigger
AFTER INSERT ON public.findings
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_finding();

-- Restrict channel access to audit owners
ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_subscribe_own_audits
ON realtime.channels FOR SELECT
TO authenticated
USING (
  pattern = 'audit:%'
  AND EXISTS (
    SELECT 1 FROM public.audits
    WHERE id = NULLIF(split_part(realtime.channel_name(), ':', 2), '')::uuid
      AND user_id = (SELECT auth.uid())
  )
);

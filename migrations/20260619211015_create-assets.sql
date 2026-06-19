CREATE TYPE public.asset_type AS ENUM ('document', 'audio');
CREATE TYPE public.asset_status AS ENUM ('uploaded', 'processing', 'ready', 'error');

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.asset_type NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  status public.asset_status NOT NULL DEFAULT 'uploaded',
  metadata JSONB NOT NULL DEFAULT '{}',
  extracted_text TEXT,
  transcript JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own assets"
  ON public.assets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "users can insert own assets"
  ON public.assets FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users can update own assets"
  ON public.assets FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users can delete own assets"
  ON public.assets FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;

CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_status ON public.assets(status);

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

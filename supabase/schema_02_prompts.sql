CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  category TEXT CHECK (category IN ('code', 'writing', 'analysis', 'creative', 'business')),
  vektor FLOAT[] DEFAULT '{0.5, 0.5, 0.5, 0.5, 0.5, 0.5}',
  erfolgsrate FLOAT DEFAULT 0.5 CHECK (erfolgsrate >= 0.0 AND erfolgsrate <= 1.0),
  nutzungen INT DEFAULT 0,
  parent_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  generation INT DEFAULT 0,
  kollektiver_score FLOAT DEFAULT 0.5 CHECK (kollektiver_score >= 0.0 AND kollektiver_score <= 1.0),
  is_public BOOLEAN DEFAULT false,
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_kollektiver_score ON prompts(kollektiver_score DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_is_public ON prompts(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_prompts_parent_id ON prompts(parent_id);
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Oeffentliche Prompts sind fuer alle lesbar" ON prompts FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Nutzer kann eigene Prompts anlegen" ON prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Nutzer kann eigene Prompts updaten" ON prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Nutzer kann eigene Prompts loeschen" ON prompts FOR DELETE USING (auth.uid() = user_id);

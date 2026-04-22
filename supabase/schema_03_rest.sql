CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal INT CHECK (signal IN (-1, 1)),
  kontext TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_feedback_prompt_id ON feedback(prompt_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feedback anlegen wenn eingeloggt" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eigenes Feedback lesen" ON feedback FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS genealogie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  child_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  generation INT NOT NULL,
  vererbungs_rate FLOAT DEFAULT 0.7 CHECK (vererbungs_rate > 0.0 AND vererbungs_rate <= 1.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_genealogie_parent_id ON genealogie(parent_id);
CREATE INDEX IF NOT EXISTS idx_genealogie_child_id ON genealogie(child_id);
ALTER TABLE genealogie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Genealogie ist oeffentlich lesbar" ON genealogie FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service Role kann Genealogie anlegen" ON genealogie FOR INSERT TO service_role WITH CHECK (true);

CREATE TABLE IF NOT EXISTS kis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  score FLOAT NOT NULL,
  erfolgsrate FLOAT NOT NULL,
  nutzungen INT NOT NULL,
  berechnet_am DATE DEFAULT CURRENT_DATE,
  UNIQUE(prompt_id, berechnet_am)
);
CREATE INDEX IF NOT EXISTS idx_kis_history_prompt_id ON kis_history(prompt_id);
CREATE INDEX IF NOT EXISTS idx_kis_history_berechnet_am ON kis_history(berechnet_am DESC);
ALTER TABLE kis_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KIS History ist oeffentlich lesbar" ON kis_history FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS vektor_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  vektor FLOAT[] NOT NULL,
  trigger_type TEXT CHECK (trigger_type IN ('feedback', 'mutation', 'vererbung')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vektor_history_prompt_id ON vektor_history(prompt_id);
ALTER TABLE vektor_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vektor History lesbar fuer Prompt-Besitzer" ON vektor_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM prompts WHERE prompts.id = vektor_history.prompt_id AND prompts.user_id = auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE prompts;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

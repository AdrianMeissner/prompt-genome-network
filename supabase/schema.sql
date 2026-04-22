-- ============================================================
-- PROMPT GENOME NETWORK — Supabase PostgreSQL Schema
-- Entscheidung: pgvector wird NICHT genutzt, da der 6D-Vektor
-- als FLOAT[] gespeichert wird und Pinecone die Ähnlichkeitssuche
-- übernimmt. Das hält Supabase lean und Pinecone als einzige
-- Vektorquelle.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- Erweiterung der auth.users Tabelle von Supabase Auth
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  api_key TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  prompts_verwendet INT DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS für profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigenes Profil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Nutzer kann eigenes Profil anlegen"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Nutzer kann eigenes Profil updaten"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: Profil automatisch bei Registrierung anlegen
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PROMPTS
-- Kern-Tabelle: Jeder Prompt hat einen 6D-Genotyp-Vektor
-- ============================================================
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  category TEXT CHECK (category IN ('code', 'writing', 'analysis', 'creative', 'business')),
  -- Genotyp-Vektor: [klarheit, spezifität, struktur, ton, kontext_tiefe, erfolgsrate]
  vektor FLOAT[] DEFAULT '{0.5, 0.5, 0.5, 0.5, 0.5, 0.5}',
  erfolgsrate FLOAT DEFAULT 0.5 CHECK (erfolgsrate >= 0.0 AND erfolgsrate <= 1.0),
  nutzungen INT DEFAULT 0,
  parent_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  generation INT DEFAULT 0,
  -- KIS = Kollektiver Intelligenz Score (täglich neu berechnet)
  kollektiver_score FLOAT DEFAULT 0.5 CHECK (kollektiver_score >= 0.0 AND kollektiver_score <= 1.0),
  is_public BOOLEAN DEFAULT false,
  -- Pinecone Vector ID für schnelles Lookup
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für häufige Queries
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_category ON prompts(category);
CREATE INDEX idx_prompts_kollektiver_score ON prompts(kollektiver_score DESC);
CREATE INDEX idx_prompts_is_public ON prompts(is_public) WHERE is_public = true;
CREATE INDEX idx_prompts_parent_id ON prompts(parent_id);

-- updated_at automatisch setzen
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS für prompts
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Öffentliche Prompts sind für alle lesbar"
  ON prompts FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Nutzer kann eigene Prompts anlegen"
  ON prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nutzer kann eigene Prompts updaten"
  ON prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Nutzer kann eigene Prompts löschen"
  ON prompts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- FEEDBACK
-- Jedes Feedback löst eine Vektor-Mutation aus
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal INT CHECK (signal IN (-1, 1)),
  kontext TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique: Ein Nutzer kann pro Prompt nur einmal abstimmen
  UNIQUE(prompt_id, user_id)
);

CREATE INDEX idx_feedback_prompt_id ON feedback(prompt_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback anlegen wenn eingeloggt"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Eigenes Feedback lesen"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- GENEALOGIE
-- Stammbaum-Datenstruktur: Parent → Child Beziehungen
-- ============================================================
CREATE TABLE IF NOT EXISTS genealogie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  child_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  generation INT NOT NULL,
  -- Vererbungsrate: Standard 0.7 (70% Eltern-Vektor, 30% Mutation)
  vererbungs_rate FLOAT DEFAULT 0.7 CHECK (vererbungs_rate > 0.0 AND vererbungs_rate <= 1.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

CREATE INDEX idx_genealogie_parent_id ON genealogie(parent_id);
CREATE INDEX idx_genealogie_child_id ON genealogie(child_id);

ALTER TABLE genealogie ENABLE ROW LEVEL SECURITY;

-- Genealogie ist öffentlich lesbar (für Stammbaum-Visualisierung)
CREATE POLICY "Genealogie ist öffentlich lesbar"
  ON genealogie FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service Role kann Genealogie anlegen"
  ON genealogie FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- KIS HISTORY
-- Tägliche Snapshots des Kollektiven Intelligenz Scores
-- Entscheidung: Eigene Tabelle statt JSON in prompts,
-- damit Analytics über Zeit möglich ist
-- ============================================================
CREATE TABLE IF NOT EXISTS kis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  score FLOAT NOT NULL,
  erfolgsrate FLOAT NOT NULL,
  nutzungen INT NOT NULL,
  berechnet_am DATE DEFAULT CURRENT_DATE,
  UNIQUE(prompt_id, berechnet_am)
);

CREATE INDEX idx_kis_history_prompt_id ON kis_history(prompt_id);
CREATE INDEX idx_kis_history_berechnet_am ON kis_history(berechnet_am DESC);

ALTER TABLE kis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KIS History ist öffentlich lesbar"
  ON kis_history FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- VEKTOR HISTORY
-- Entwicklung des Genotyp-Vektors über Zeit (für Analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS vektor_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  vektor FLOAT[] NOT NULL,
  trigger_type TEXT CHECK (trigger_type IN ('feedback', 'mutation', 'vererbung')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vektor_history_prompt_id ON vektor_history(prompt_id);

ALTER TABLE vektor_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vektor History lesbar für Prompt-Besitzer"
  ON vektor_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = vektor_history.prompt_id
      AND prompts.user_id = auth.uid()
    )
  );

-- ============================================================
-- SUPABASE REALTIME: Tabellen für Live-Updates aktivieren
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE prompts;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

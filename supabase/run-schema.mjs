/**
 * Spielt das Datenbankschema Abschnitt für Abschnitt in Supabase ein.
 * Ausführen mit: node supabase/run-schema.mjs
 */

// Werte aus Supabase Dashboard → Project Settings → API
const PAT = process.env.SUPABASE_ACCESS_TOKEN ?? 'DEIN_SUPABASE_PAT'
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'DEIN_PROJECT_REF'
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function sql(query, label) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (res.ok) {
    console.log(`✓ ${label}`)
  } else {
    const err = await res.text()
    console.error(`✗ ${label}: ${err}`)
  }
}

// Statements einzeln ausführen
await sql(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, 'uuid-ossp Extension')

await sql(`
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  api_key TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  prompts_verwendet INT DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`, 'profiles Tabelle')

await sql(`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`, 'profiles RLS')
await sql(`CREATE POLICY "Nutzer sieht nur eigenes Profil" ON profiles FOR SELECT USING (auth.uid() = id)`, 'profiles Policy SELECT')
await sql(`CREATE POLICY "Nutzer kann eigenes Profil anlegen" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)`, 'profiles Policy INSERT')
await sql(`CREATE POLICY "Nutzer kann eigenes Profil updaten" ON profiles FOR UPDATE USING (auth.uid() = id)`, 'profiles Policy UPDATE')

await sql(`
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`, 'handle_new_user Funktion')

await sql(`
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user()`, 'on_auth_user_created Trigger')

await sql(`
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
)`, 'prompts Tabelle')

await sql(`CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id)`, 'prompts Index user_id')
await sql(`CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category)`, 'prompts Index category')
await sql(`CREATE INDEX IF NOT EXISTS idx_prompts_kollektiver_score ON prompts(kollektiver_score DESC)`, 'prompts Index KIS')
await sql(`CREATE INDEX IF NOT EXISTS idx_prompts_is_public ON prompts(is_public) WHERE is_public = true`, 'prompts Index public')
await sql(`CREATE INDEX IF NOT EXISTS idx_prompts_parent_id ON prompts(parent_id)`, 'prompts Index parent_id')

await sql(`
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`, 'update_updated_at Funktion')

await sql(`
CREATE OR REPLACE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at()`, 'prompts_updated_at Trigger')

await sql(`ALTER TABLE prompts ENABLE ROW LEVEL SECURITY`, 'prompts RLS')
await sql(`CREATE POLICY "Oeffentliche Prompts lesbar" ON prompts FOR SELECT USING (is_public = true OR auth.uid() = user_id)`, 'prompts Policy SELECT')
await sql(`CREATE POLICY "Nutzer kann eigene Prompts anlegen" ON prompts FOR INSERT WITH CHECK (auth.uid() = user_id)`, 'prompts Policy INSERT')
await sql(`CREATE POLICY "Nutzer kann eigene Prompts updaten" ON prompts FOR UPDATE USING (auth.uid() = user_id)`, 'prompts Policy UPDATE')
await sql(`CREATE POLICY "Nutzer kann eigene Prompts loeschen" ON prompts FOR DELETE USING (auth.uid() = user_id)`, 'prompts Policy DELETE')

await sql(`
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal INT CHECK (signal IN (-1, 1)),
  kontext TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, user_id)
)`, 'feedback Tabelle')

await sql(`CREATE INDEX IF NOT EXISTS idx_feedback_prompt_id ON feedback(prompt_id)`, 'feedback Index')
await sql(`CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC)`, 'feedback Index created_at')
await sql(`ALTER TABLE feedback ENABLE ROW LEVEL SECURITY`, 'feedback RLS')
await sql(`CREATE POLICY "Feedback anlegen" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id)`, 'feedback Policy INSERT')
await sql(`CREATE POLICY "Eigenes Feedback lesen" ON feedback FOR SELECT USING (auth.uid() = user_id)`, 'feedback Policy SELECT')

await sql(`
CREATE TABLE IF NOT EXISTS genealogie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  child_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  generation INT NOT NULL,
  vererbungs_rate FLOAT DEFAULT 0.7 CHECK (vererbungs_rate > 0.0 AND vererbungs_rate <= 1.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
)`, 'genealogie Tabelle')

await sql(`CREATE INDEX IF NOT EXISTS idx_genealogie_parent_id ON genealogie(parent_id)`, 'genealogie Index parent')
await sql(`CREATE INDEX IF NOT EXISTS idx_genealogie_child_id ON genealogie(child_id)`, 'genealogie Index child')
await sql(`ALTER TABLE genealogie ENABLE ROW LEVEL SECURITY`, 'genealogie RLS')
await sql(`CREATE POLICY "Genealogie lesbar" ON genealogie FOR SELECT TO authenticated USING (true)`, 'genealogie Policy SELECT')
await sql(`CREATE POLICY "Service Role Genealogie" ON genealogie FOR INSERT TO service_role WITH CHECK (true)`, 'genealogie Policy INSERT')

await sql(`
CREATE TABLE IF NOT EXISTS kis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  score FLOAT NOT NULL,
  erfolgsrate FLOAT NOT NULL,
  nutzungen INT NOT NULL,
  berechnet_am DATE DEFAULT CURRENT_DATE,
  UNIQUE(prompt_id, berechnet_am)
)`, 'kis_history Tabelle')

await sql(`CREATE INDEX IF NOT EXISTS idx_kis_history_prompt_id ON kis_history(prompt_id)`, 'kis_history Index')
await sql(`CREATE INDEX IF NOT EXISTS idx_kis_history_berechnet_am ON kis_history(berechnet_am DESC)`, 'kis_history Index datum')
await sql(`ALTER TABLE kis_history ENABLE ROW LEVEL SECURITY`, 'kis_history RLS')
await sql(`CREATE POLICY "KIS History lesbar" ON kis_history FOR SELECT TO authenticated USING (true)`, 'kis_history Policy')

await sql(`
CREATE TABLE IF NOT EXISTS vektor_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  vektor FLOAT[] NOT NULL,
  trigger_type TEXT CHECK (trigger_type IN ('feedback', 'mutation', 'vererbung')),
  created_at TIMESTAMPTZ DEFAULT NOW()
)`, 'vektor_history Tabelle')

await sql(`CREATE INDEX IF NOT EXISTS idx_vektor_history_prompt_id ON vektor_history(prompt_id)`, 'vektor_history Index')
await sql(`ALTER TABLE vektor_history ENABLE ROW LEVEL SECURITY`, 'vektor_history RLS')
await sql(`
CREATE POLICY "Vektor History lesbar fuer Besitzer" ON vektor_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM prompts WHERE prompts.id = vektor_history.prompt_id AND prompts.user_id = auth.uid())
)`, 'vektor_history Policy')

await sql(`ALTER PUBLICATION supabase_realtime ADD TABLE prompts`, 'Realtime prompts')
await sql(`ALTER PUBLICATION supabase_realtime ADD TABLE feedback`, 'Realtime feedback')

console.log('\n🎉 Schema eingespielt!')

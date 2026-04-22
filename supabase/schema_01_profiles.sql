CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  api_key TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  prompts_verwendet INT DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nutzer sieht nur eigenes Profil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Nutzer kann eigenes Profil anlegen" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Nutzer kann eigenes Profil updaten" ON profiles FOR UPDATE USING (auth.uid() = id);
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

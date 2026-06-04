-- ════════════════════════════════════════════
-- JAPA APP — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor
-- ════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES (extends Supabase auth.users) ──────────────────────────────────
CREATE TABLE profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  country_target TEXT,
  visa_type     TEXT,
  is_relocated  BOOLEAN DEFAULT FALSE,
  relocated_to  TEXT,
  bio           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── AGENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE agents (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  city            TEXT,
  nis_licence     TEXT UNIQUE,
  cac_number      TEXT,
  bio             TEXT,
  years_exp       INTEGER DEFAULT 0,
  countries       TEXT[] DEFAULT '{}',
  visa_types      TEXT[] DEFAULT '{}',
  languages       TEXT[] DEFAULT '{"English"}',
  price_from      INTEGER DEFAULT 0,
  price_full      INTEGER DEFAULT 0,
  verified        BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending',
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  tier            TEXT DEFAULT 'free',
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOOKINGS ────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id) ON DELETE CASCADE,
  service_type    TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'pending',
  escrow_amount   INTEGER DEFAULT 0,
  escrow_released BOOLEAN DEFAULT FALSE,
  milestone_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REVIEWS ─────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id),
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  content     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Auto-update agent avg rating after review
CREATE OR REPLACE FUNCTION update_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agents SET
    avg_rating   = (SELECT AVG(rating) FROM reviews WHERE agent_id = NEW.agent_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE agent_id = NEW.agent_id)
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_review_insert
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_agent_rating();

-- ── POSTS (Community) ────────────────────────────────────────────────────────
CREATE TABLE posts (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  channel     TEXT NOT NULL,
  tags        TEXT[] DEFAULT '{}',
  upvotes     INTEGER DEFAULT 0,
  pinned      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE comments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── POST UPVOTES (prevent double-voting) ────────────────────────────────────
CREATE TABLE post_upvotes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- ── CHECKLISTS ──────────────────────────────────────────────────────────────
CREATE TABLE checklists (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  country         TEXT,
  visa_type       TEXT,
  completed_items JSONB DEFAULT '[]',
  share_token     TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 12),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SCAM REPORTS ────────────────────────────────────────────────────────────
CREATE TABLE scam_reports (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id   UUID REFERENCES auth.users(id),
  agent_name    TEXT NOT NULL,
  company_name  TEXT,
  location      TEXT,
  amount_lost   INTEGER,
  description   TEXT NOT NULL,
  evidence_url  TEXT,
  status        TEXT DEFAULT 'under_review',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scam_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, edit own
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Agents: publicly readable, owners can edit
CREATE POLICY "Agents are publicly readable" ON agents FOR SELECT USING (true);
CREATE POLICY "Agents can edit own listing" ON agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can register as agent" ON agents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookings: private to user
CREATE POLICY "Users see own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id);

-- Reviews: public read, authenticated write
CREATE POLICY "Reviews are public" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users write own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Posts: public read, authenticated write
CREATE POLICY "Posts are public" ON posts FOR SELECT USING (true);
CREATE POLICY "Users create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);

-- Comments: public read, authenticated write
CREATE POLICY "Comments are public" ON comments FOR SELECT USING (true);
CREATE POLICY "Users write comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Upvotes
CREATE POLICY "Upvotes public" ON post_upvotes FOR SELECT USING (true);
CREATE POLICY "Users manage own upvotes" ON post_upvotes FOR ALL USING (auth.uid() = user_id);

-- Checklists: private + sharable
CREATE POLICY "Users see own checklist" ON checklists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own checklist" ON checklists FOR ALL USING (auth.uid() = user_id);

-- Scam reports
CREATE POLICY "Scam reports public read" ON scam_reports FOR SELECT USING (true);
CREATE POLICY "Auth users submit reports" ON scam_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ── SEED: Sample verified agents ────────────────────────────────────────────
INSERT INTO agents (full_name, email, city, nis_licence, bio, years_exp, countries, visa_types, price_from, price_full, verified, avg_rating, review_count, tier) VALUES
('Adaeze Nwosu',   'adaeze@example.com',  'Abuja',          'NG-2019-0421', 'Licensed immigration consultant with 8 years experience. 95% success rate on Express Entry applications.', 8, '{"Canada"}',            '{"Express Entry","PR","Work Permit"}',  35000, 280000, true, 4.90, 143, 'pro'),
('Kelechi Eze',    'kelechi@example.com', 'Lagos',          'NG-2017-0188', 'Specialises in UK Skilled Worker and Germany Job Seeker visas. Former UKVI staff member.',            10, '{"UK","Germany"}',      '{"Skilled Worker","Study"}',            40000, 320000, true, 4.80, 211, 'pro'),
('Bukola Adesanya','bukola@example.com',  'Port Harcourt',  'NG-2020-0654', 'Education specialist helping Nigerian students get into top universities in Australia and Canada.',   6,  '{"Australia","Canada"}','{"Study","Student Visa"}',              25000, 220000, true, 4.70, 89,  'standard'),
('Tokunbo Afolabi','tokunbo@example.com', 'Lagos',          'NG-2016-0099', 'US immigration attorney with 12 years practice. Specialises in tech worker visas and NIW.',          12, '{"USA"}',               '{"H-1B","O-1","EB-2 NIW"}',            50000, 450000, true, 4.90, 178, 'pro'),
('Funmi Adeleke',  'funmi@example.com',   'Ibadan',         'NG-2021-0832', 'European relocation specialist. Fluent in German. Helps engineers, nurses, and IT professionals.',   5,  '{"Germany","Netherlands"}','{"Blue Card","Job Seeker"}',           30000, 260000, true, 4.60, 67,  'standard'),
('Obinna Okafor',  'obinna@example.com',  'Enugu',          'NG-2018-0345', 'Family reunification and business visa expert. 9 years experience.',                               9,  '{"UAE","Canada"}',      '{"Family Visa","Business"}',            28000, 240000, true, 4.80, 122, 'standard');

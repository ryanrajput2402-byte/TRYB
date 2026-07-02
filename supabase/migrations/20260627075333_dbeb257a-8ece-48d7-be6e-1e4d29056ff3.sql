
-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  avatar_url TEXT,
  travel_personality TEXT,
  travel_style TEXT,
  budget_range TEXT,
  vibe TEXT,
  group_preference TEXT,
  interests TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  trips_count INT NOT NULL DEFAULT 0,
  countries_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ trips ============
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  country TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_members INT NOT NULL DEFAULT 6,
  cover_image TEXT,
  description TEXT DEFAULT '',
  vibe_tags TEXT[] DEFAULT '{}',
  budget_min INT,
  budget_max INT,
  currency TEXT DEFAULT 'USD',
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ trip_members ============
CREATE TABLE public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_members TO authenticated;
GRANT ALL ON public.trip_members TO service_role;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_trip_organizer(_trip_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.trips WHERE id = _trip_id AND organizer_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_trip_approved_member(_trip_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.trip_members
    WHERE trip_id = _trip_id AND user_id = _user_id AND status = 'approved'
  ) OR public.is_trip_organizer(_trip_id, _user_id);
$$;

-- Trips visibility
CREATE POLICY "Public trips viewable by all signed-in" ON public.trips
  FOR SELECT TO authenticated
  USING (privacy = 'public' OR organizer_id = auth.uid() OR public.is_trip_approved_member(id, auth.uid()));
CREATE POLICY "Users create own trips" ON public.trips
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizer updates trip" ON public.trips
  FOR UPDATE TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizer deletes trip" ON public.trips
  FOR DELETE TO authenticated USING (auth.uid() = organizer_id);

-- trip_members policies
CREATE POLICY "Members view their trip memberships" ON public.trip_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_trip_organizer(trip_id, auth.uid()) OR public.is_trip_approved_member(trip_id, auth.uid()));
CREATE POLICY "Users request to join" ON public.trip_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Organizer manages members" ON public.trip_members
  FOR UPDATE TO authenticated USING (public.is_trip_organizer(trip_id, auth.uid()));
CREATE POLICY "Organizer or self removes membership" ON public.trip_members
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_trip_organizer(trip_id, auth.uid()));

-- Auto-add organizer as approved member
CREATE OR REPLACE FUNCTION public.add_organizer_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.trip_members(trip_id, user_id, status, role)
  VALUES (NEW.id, NEW.organizer_id, 'approved', 'organizer')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trips_add_organizer AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.add_organizer_as_member();

-- ============ messages ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','keyo','system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members view messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_trip_approved_member(trip_id, auth.uid()));
CREATE POLICY "Approved members send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (public.is_trip_approved_member(trip_id, auth.uid()) AND (sender_id = auth.uid() OR message_type = 'keyo'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ expenses ============
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  split_user_ids UUID[] NOT NULL DEFAULT '{}',
  settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members view expenses" ON public.expenses
  FOR SELECT TO authenticated USING (public.is_trip_approved_member(trip_id, auth.uid()));
CREATE POLICY "Approved members add expenses" ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (public.is_trip_approved_member(trip_id, auth.uid()) AND payer_id = auth.uid());
CREATE POLICY "Payer updates own expense" ON public.expenses
  FOR UPDATE TO authenticated USING (payer_id = auth.uid()) WITH CHECK (payer_id = auth.uid());
CREATE POLICY "Payer deletes own expense" ON public.expenses
  FOR DELETE TO authenticated USING (payer_id = auth.uid());

CREATE INDEX trips_organizer_idx ON public.trips(organizer_id);
CREATE INDEX trip_members_trip_idx ON public.trip_members(trip_id);
CREATE INDEX trip_members_user_idx ON public.trip_members(user_id);
CREATE INDEX messages_trip_idx ON public.messages(trip_id, created_at);
CREATE INDEX expenses_trip_idx ON public.expenses(trip_id);


-- Table for shortened URLs
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  slug text NOT NULL UNIQUE,
  title text,
  is_password_protected boolean DEFAULT false,
  password_hash text,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  last_clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table for click tracking
CREATE TABLE public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  country text,
  city text,
  device_type text,
  browser text,
  os text,
  referrer text,
  ip_hash text
);

-- Enable RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for short_links
CREATE POLICY "Users can manage own short links"
  ON public.short_links FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read active short links by slug (for redirect)
CREATE POLICY "Anyone can read active links by slug"
  ON public.short_links FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- RLS policies for link_clicks
CREATE POLICY "Anyone can insert clicks"
  ON public.link_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view clicks on their own links
CREATE POLICY "Users can view own link clicks"
  ON public.link_clicks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.short_links
    WHERE short_links.id = link_clicks.short_link_id
    AND short_links.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_short_links_updated_at
  BEFORE UPDATE ON public.short_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

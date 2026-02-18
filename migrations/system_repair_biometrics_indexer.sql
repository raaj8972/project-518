-- Migration: System Repair for Biometrics & Face Indexing
-- Description: Creates missing tables and RLS policies for passkeys and face indexing.

-- 1. Create passkeys table (for WebAuthn/Biometric Login)
CREATE TABLE IF NOT EXISTS public.passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    transports TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ
);

-- 2. Create passkey_challenges table (temporary registration/login challenges)
CREATE TABLE IF NOT EXISTS public.passkey_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create gallery_faces table (for storing AI-detected facial embeddings)
-- Note: Using double precision[] for embeddings as it matches face-api.js output
CREATE TABLE IF NOT EXISTS public.gallery_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id INTEGER NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
    embedding DOUBLE PRECISION[] NOT NULL,
    bounds JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_faces ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Passkeys
-- Admin can manage their own passkeys
CREATE POLICY "Users can manage their own passkeys"
ON public.passkeys
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. RLS Policies for Passkey Challenges
-- Service role handles most challenge management via Netlify functions
-- But we allow authenticated users to see their own challenges
CREATE POLICY "Users can see their own challenges"
ON public.passkey_challenges
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. RLS Policies for Gallery Faces
-- Public query access for face search
CREATE POLICY "Public read access for faces"
ON public.gallery_faces
FOR SELECT
TO anon, authenticated
USING (true);

-- Admin can manage faces
CREATE POLICY "Admin can manage faces"
ON public.gallery_faces
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON public.passkeys(credential_id);
CREATE INDEX IF NOT EXISTS idx_gallery_faces_image_id ON public.gallery_faces(image_id);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires_at ON public.passkey_challenges(expires_at);

-- 9. Documentation
COMMENT ON TABLE public.passkeys IS 'Stores WebAuthn credentials for biometric authentication.';
COMMENT ON TABLE public.passkey_challenges IS 'Temporary storage for WebAuthn registration and login challenges.';
COMMENT ON TABLE public.gallery_faces IS 'Stores facial descriptors and bounding boxes for gallery images.';

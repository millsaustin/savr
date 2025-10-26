-- Migration: Image Pipeline Schema Extension
-- Purpose: Add stock-first + self-hosted diffusion fallback support
-- Safe to run multiple times (uses IF NOT EXISTS guards)

-- ============================================================================
-- 1. CREATE ENUM TYPE FOR IMAGE SOURCES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'image_source') THEN
        CREATE TYPE image_source AS ENUM ('stock', 'generated', 'placeholder');
    END IF;
END $$;

-- ============================================================================
-- 2. EXTEND IMAGES TABLE
-- ============================================================================

-- Add new columns if they don't exist
DO $$
BEGIN
    -- source column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'source'
    ) THEN
        ALTER TABLE images ADD COLUMN source image_source;
    END IF;

    -- stock_provider column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'stock_provider'
    ) THEN
        ALTER TABLE images ADD COLUMN stock_provider text;
    END IF;

    -- photographer_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'photographer_name'
    ) THEN
        ALTER TABLE images ADD COLUMN photographer_name text;
    END IF;

    -- license_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'license_url'
    ) THEN
        ALTER TABLE images ADD COLUMN license_url text;
    END IF;

    -- hash column (unique)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'hash'
    ) THEN
        ALTER TABLE images ADD COLUMN hash text;
    END IF;

    -- style_version column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'style_version'
    ) THEN
        ALTER TABLE images ADD COLUMN style_version text;
    END IF;

    -- prompt column (for AI-generated images)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'prompt'
    ) THEN
        ALTER TABLE images ADD COLUMN prompt text;
    END IF;

    -- generated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'generated_at'
    ) THEN
        ALTER TABLE images ADD COLUMN generated_at timestamptz DEFAULT now();
    END IF;

    -- last_used column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'last_used'
    ) THEN
        ALTER TABLE images ADD COLUMN last_used timestamptz;
    END IF;
END $$;

-- ============================================================================
-- 3. ADD FOREIGN KEY CONSTRAINT (if not exists)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_images_recipe_id'
        AND table_name = 'images'
    ) THEN
        ALTER TABLE images
        ADD CONSTRAINT fk_images_recipe_id
        FOREIGN KEY (recipe_id)
        REFERENCES recipes(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 4. CREATE UNIQUE CONSTRAINT ON HASH
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'images_hash_key'
        AND table_name = 'images'
    ) THEN
        ALTER TABLE images ADD CONSTRAINT images_hash_key UNIQUE (hash);
    END IF;
END $$;

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on recipe_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_images_recipe_id ON images(recipe_id);

-- Index on hash for deduplication checks
CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash);

-- Index on source for filtering by image type
CREATE INDEX IF NOT EXISTS idx_images_source ON images(source);

-- Index on last_used for cache cleanup/analytics
CREATE INDEX IF NOT EXISTS idx_images_last_used ON images(last_used);

-- Composite index for common queries (recipe + source)
CREATE INDEX IF NOT EXISTS idx_images_recipe_source ON images(recipe_id, source);

-- ============================================================================
-- 6. CREATE PLACEHOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS placeholders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_slug text UNIQUE NOT NULL,
    url text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index on category_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_placeholders_category_slug ON placeholders(category_slug);

-- ============================================================================
-- 7. INSERT DEFAULT PLACEHOLDER ENTRIES (optional seed data)
-- ============================================================================

INSERT INTO placeholders (category_slug, url) VALUES
    ('high-protein', '/placeholders/high-protein.png'),
    ('low-carb', '/placeholders/low-carb.png'),
    ('vegetarian', '/placeholders/vegetarian.png'),
    ('vegan', '/placeholders/vegan.png'),
    ('keto', '/placeholders/keto.png'),
    ('paleo', '/placeholders/paleo.png'),
    ('mediterranean', '/placeholders/mediterranean.png'),
    ('asian', '/placeholders/asian.png'),
    ('mexican', '/placeholders/mexican.png'),
    ('italian', '/placeholders/italian.png'),
    ('breakfast', '/placeholders/breakfast.png'),
    ('lunch', '/placeholders/lunch.png'),
    ('dinner', '/placeholders/dinner.png'),
    ('dessert', '/placeholders/dessert.png'),
    ('snack', '/placeholders/snack.png'),
    ('default', '/placeholders/default.png')
ON CONFLICT (category_slug) DO NOTHING;

-- ============================================================================
-- 8. CREATE HELPER FUNCTION: Update last_used timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_image_last_used(image_id_param uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE images
    SET last_used = now()
    WHERE id = image_id_param;
END;
$$;

-- ============================================================================
-- 9. CREATE HELPER FUNCTION: Find image by hash
-- ============================================================================

CREATE OR REPLACE FUNCTION find_image_by_hash(hash_param text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    image_id_result uuid;
BEGIN
    SELECT id INTO image_id_result
    FROM images
    WHERE hash = hash_param
    LIMIT 1;

    RETURN image_id_result;
END;
$$;

-- ============================================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN images.source IS 'Origin of the image: stock (free APIs), generated (local AI), or placeholder';
COMMENT ON COLUMN images.stock_provider IS 'Name of stock photo provider: pexels, unsplash, or pixabay';
COMMENT ON COLUMN images.photographer_name IS 'Credit attribution for stock photos';
COMMENT ON COLUMN images.license_url IS 'URL to license/attribution page for stock photos';
COMMENT ON COLUMN images.hash IS 'SHA-256 hash of image file for deduplication';
COMMENT ON COLUMN images.style_version IS 'Version tag for AI generation prompt style (e.g., v1.0-rustic-light)';
COMMENT ON COLUMN images.prompt IS 'Full prompt used for AI image generation';
COMMENT ON COLUMN images.generated_at IS 'Timestamp when image was first created/downloaded';
COMMENT ON COLUMN images.last_used IS 'Timestamp when image was last served to a user';

COMMENT ON TABLE placeholders IS 'Default placeholder images by category when stock/generation fails';
COMMENT ON COLUMN placeholders.category_slug IS 'URL-safe category identifier (e.g., high-protein, keto)';
COMMENT ON COLUMN placeholders.url IS 'Path or URL to placeholder image file';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Image pipeline schema migration completed successfully';
    RAISE NOTICE 'Tables extended: images';
    RAISE NOTICE 'Tables created: placeholders';
    RAISE NOTICE 'Indexes created: 6 indexes on images, 1 on placeholders';
    RAISE NOTICE 'Helper functions: update_image_last_used, find_image_by_hash';
END $$;

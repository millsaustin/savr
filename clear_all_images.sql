-- Clear all cached images and start fresh with Replicate
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yxiqiwvmpxkvwqztqyol/editor

-- Step 1: Unlink all images from recipes
UPDATE recipes
SET image_id = NULL
WHERE image_id IS NOT NULL;

-- Step 2: Delete all images from the images table
DELETE FROM images;

-- Step 3: (Optional) Clear the Recipes storage bucket
-- You'll need to do this manually in the Supabase Storage UI:
-- Go to: Storage > Recipes > Select all files > Delete

-- Verification: Check that all images are cleared
SELECT COUNT(*) as remaining_images FROM images;
SELECT COUNT(*) as recipes_with_images FROM recipes WHERE image_id IS NOT NULL;

-- Expected results: both should show 0

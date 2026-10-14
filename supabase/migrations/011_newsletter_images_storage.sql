-- Migration: 011_newsletter_images_storage.sql
-- Storage bucket and Row Level Security policies for newsletter images

-- 1. Create or configure 'newsletter-images' public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'newsletter-images',
  'newsletter-images',
  true,
  3145728, -- 3MB limit (3 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Policy on storage.buckets: allow public/anon/authenticated to read newsletter-images bucket metadata
DROP POLICY IF EXISTS "Allow public read on newsletter-images bucket" ON storage.buckets;
CREATE POLICY "Allow public read on newsletter-images bucket"
  ON storage.buckets FOR SELECT
  USING (id = 'newsletter-images');

-- 3. Policies on storage.objects

-- 3a. Public read access to all objects in 'newsletter-images'
DROP POLICY IF EXISTS "Public read for newsletter-images" ON storage.objects;
CREATE POLICY "Public read for newsletter-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'newsletter-images');

-- 3b. Authenticated users can upload images only into their own user folder: {user_id}/...
DROP POLICY IF EXISTS "Users can upload newsletter images to own folder" ON storage.objects;
CREATE POLICY "Users can upload newsletter images to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'newsletter-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3c. Users can update only their own images
DROP POLICY IF EXISTS "Users can update own newsletter images" ON storage.objects;
CREATE POLICY "Users can update own newsletter images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'newsletter-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'newsletter-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3d. Users can delete only their own images
DROP POLICY IF EXISTS "Users can delete own newsletter images" ON storage.objects;
CREATE POLICY "Users can delete own newsletter images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'newsletter-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

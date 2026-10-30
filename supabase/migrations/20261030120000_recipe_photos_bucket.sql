-- Milestone 5: the recipe-photos Storage bucket, with policies.
--
-- Supabase Storage keeps one row per file in the table storage.objects
-- (bucket_id, name = the file's path, owner, ...). RLS is already enabled on
-- that table, so files follow the same rules as our own tables: nothing is
-- allowed until a policy allows it.


-- ─── the bucket ──────────────────────────────────────────────────────────────
-- public = false: there are no permanent public URLs. The app asks for
-- short-lived signed URLs, which the select policy below only gives to
-- signed-in users.
--
-- The app shrinks every photo to a JPEG in the browser before uploading, so
-- the bucket only accepts JPEGs, at most 5 MB (5 * 1024 * 1024 bytes).
-- A resized photo is ~300 KB, so 5 MB only blocks something going wrong.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 5242880, array['image/jpeg']);


-- ─── policies on storage.objects ─────────────────────────────────────────────
-- storage.objects holds files from every bucket, so each policy must check
-- bucket_id. Otherwise it would also apply to buckets we add later.

-- Everyone signed in can view photos (and create signed URLs for them).
create policy "Signed-in users can read recipe photos"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'recipe-photos');

-- Only the editor can upload.
create policy "Editor can upload recipe photos"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'recipe-photos' and (select public.is_editor()));

-- Only the editor can delete (used when a photo is replaced or removed).
create policy "Editor can delete recipe photos"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'recipe-photos' and (select public.is_editor()));

-- No update policy: replacing a photo uploads a new file under a new name and
-- deletes the old one, so files never change in place. (Same idea as
-- reactions: insert and delete only.)

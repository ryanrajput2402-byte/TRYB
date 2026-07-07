/*
# Post & project image storage

Phase 1 of the MAJOR TRYB OVERHAUL. Two public buckets, mirroring the
existing `avatars` bucket pattern exactly: public read (photos are shown
across the app to every viewer), writes restricted to the uploading
user's own folder (`{bucket}/{user_id}/{filename}`). Separate buckets per
feature (rather than one shared bucket) mirrors the existing
one-bucket-per-purpose precedent and keeps lifecycle/cleanup simple if a
feature is ever removed.
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Post images are publicly accessible"
on storage.objects for select
using (bucket_id = 'post-images');

create policy "Users can upload their own post images"
on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own post images"
on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Project images are publicly accessible"
on storage.objects for select
using (bucket_id = 'project-images');

create policy "Users can upload their own project images"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own project images"
on storage.objects for update to authenticated
using (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own project images"
on storage.objects for delete to authenticated
using (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text);

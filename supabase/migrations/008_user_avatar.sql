-- Add avatar URL column to users
alter table public.users
  add column if not exists avatar_url text;

-- Create a public avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users can upload/replace their own avatar (path must start with their user ID)
create policy "avatars: users upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: users update own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is public, but explicit policy is good practice)
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

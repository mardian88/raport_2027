-- Create storage bucket for raport assets
insert into storage.buckets (id, name, public)
values ('raport-assets', 'raport-assets', true)
on conflict (id) do nothing;

-- Policy: Allow authenticated users to upload files
create policy "Authenticated can upload assets"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'raport-assets' );

-- Policy: Allow authenticated users to update their own files (or all files for simplicity in this context)
create policy "Authenticated can update assets"
on storage.objects for update
to authenticated
using ( bucket_id = 'raport-assets' );

-- Policy: Allow public access to view assets (needed for printing)
create policy "Public can view assets"
on storage.objects for select
to public
using ( bucket_id = 'raport-assets' );

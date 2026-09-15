-- SCRIPT: Buka Akses Database untuk Frontend (Permissive Access)
-- Script ini akan memberikan izin baca & tulis secara penuh kepada aplikasi (Frontend)
-- sehingga komunikasi berjalan lancar tanpa terhalang error keamanan / RLS (Row Level Security).

DO $$ 
DECLARE
    t_name text;
BEGIN
    -- Loop ke semua tabel yang ada di public schema
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        -- Aktifkan RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        
        -- Hapus policy permissive yang lama (jika ada) agar tidak duplikat
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Buka Semua Akses" ON public.%I;', t_name);
        EXCEPTION WHEN others THEN
            -- Abaikan jika error
        END;

        -- Buat policy baru yang mengizinkan SEMUA aksi (SELECT, INSERT, UPDATE, DELETE)
        -- untuk semua pengguna (anon & authenticated)
        BEGIN
            EXECUTE format('CREATE POLICY "Buka Semua Akses" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t_name);
        EXCEPTION WHEN others THEN
            -- Abaikan jika tabel tidak mendukung
        END;
    END LOOP;
END $$;

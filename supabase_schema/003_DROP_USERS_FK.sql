-- SCRIPT: Memutuskan koneksi antara public.users dan auth.users
-- Ini memungkinkan kita menyimpan data guru seperti data biasa tanpa harus
-- mendaftarkannya ke sistem Autentikasi Supabase.

DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
END $$;

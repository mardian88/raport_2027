-- Add role column to teacher_assignments table
-- Default to 'guru' (ordinary teacher), can be 'pembimbing' (advisor)

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_assignments' AND column_name = 'role') THEN
        ALTER TABLE teacher_assignments ADD COLUMN role text DEFAULT 'guru';
    END IF;
END $$;

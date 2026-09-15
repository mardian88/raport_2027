-- Add halaqah_id to tahsin_master for per-halaqah configuration
-- NULL halaqah_id means global/default for all halaqah

ALTER TABLE tahsin_master 
ADD COLUMN halaqah_id UUID REFERENCES halaqah(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_tahsin_master_halaqah ON tahsin_master(halaqah_id);

-- Update RLS policies to allow filtering by halaqah
DROP POLICY IF EXISTS "Allow read access to tahsin_master for authenticated users" ON tahsin_master;
DROP POLICY IF EXISTS "Allow insert access to tahsin_master for authenticated users" ON tahsin_master;
DROP POLICY IF EXISTS "Allow update access to tahsin_master for authenticated users" ON tahsin_master;
DROP POLICY IF EXISTS "Allow delete access to tahsin_master for authenticated users" ON tahsin_master;

CREATE POLICY "Allow read access to tahsin_master for authenticated users"
    ON tahsin_master FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to tahsin_master for authenticated users"
    ON tahsin_master FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to tahsin_master for authenticated users"
    ON tahsin_master FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow delete access to tahsin_master for authenticated users"
    ON tahsin_master FOR DELETE
    TO authenticated
    USING (true);

-- Add comment
COMMENT ON COLUMN tahsin_master.halaqah_id IS 'NULL = global/default for all halaqah, specific UUID = only for that halaqah';

-- Create Tahsin Master Table
CREATE TABLE IF NOT EXISTS tahsin_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_item TEXT NOT NULL UNIQUE,
    urutan INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default Tahsin items
INSERT INTO tahsin_master (nama_item, urutan, is_active) VALUES
    ('Makhroj Huruf', 1, true),
    ('Mad', 2, true),
    ('Hukum Nun Sukun', 3, true),
    ('Hukum Mim Sukun', 4, true),
    ('Hukum Alif Lam', 5, true),
    ('Qolqolah', 6, true),
    ('Lafdzul Jalalah', 7, true),
    ('Hukum Gunnah', 8, true),
    ('Waqof-Washol', 9, true),
    ('Idzhar, Idghom, Ikhfa lanjutan', 10, true)
ON CONFLICT (nama_item) DO NOTHING;

-- Add RLS policies
ALTER TABLE tahsin_master ENABLE ROW LEVEL SECURITY;

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

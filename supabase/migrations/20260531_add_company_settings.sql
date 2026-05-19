-- Create company_settings table for storing per-company auto-close and notification preferences
-- This table allows each company to configure ticket auto-close behavior and notification routing

CREATE TABLE IF NOT EXISTS company_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Auto-close configuration
    auto_close_enabled boolean DEFAULT true NOT NULL,
    auto_close_days integer DEFAULT 7 NOT NULL CHECK (auto_close_days > 0),
    
    -- Notification configuration
    email_notifications_enabled boolean DEFAULT true NOT NULL,
    admin_alerts_enabled boolean DEFAULT true NOT NULL,
    digest_frequency text DEFAULT 'daily' NOT NULL CHECK (digest_frequency IN ('daily', 'weekly', 'disabled')),
    
    -- Audit fields
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Service role (backend) has full access
CREATE POLICY "Service role full access" ON company_settings
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policy 2: Users can view settings for their company
CREATE POLICY "Users can view own company settings" ON company_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

-- Trigger to auto-update updated_at on modification
CREATE TRIGGER update_company_settings_timestamp
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Create index on company_id for fast lookups
CREATE INDEX idx_company_settings_company_id ON company_settings(company_id);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON company_settings TO authenticated;
GRANT ALL ON company_settings TO service_role;

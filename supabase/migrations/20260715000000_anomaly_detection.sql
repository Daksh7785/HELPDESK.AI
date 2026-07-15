-- Anomaly Detection: anomaly_events table and system_settings extensions
-- Stores detected anomalies per-company for admin review and acknowledgement.

-- 1. Create anomaly_events table
CREATE TABLE IF NOT EXISTS anomaly_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    anomaly_type        TEXT        NOT NULL,
    severity            TEXT        NOT NULL DEFAULT 'medium'
                                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title               TEXT        NOT NULL,
    description         TEXT        NOT NULL,
    metric_value        FLOAT,
    baseline_value      FLOAT,
    deviation_pct       FLOAT,
    affected_entity     TEXT,
    recommended_action  TEXT,
    metadata            JSONB       DEFAULT '{}',
    acknowledged        BOOLEAN     NOT NULL DEFAULT FALSE,
    acknowledged_by     UUID        REFERENCES auth.users(id),
    acknowledged_at     TIMESTAMPTZ,
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: company members can read their anomalies
CREATE POLICY "Company members can view own anomalies" ON anomaly_events
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 4. RLS Policy: admins can update (acknowledge) anomalies
CREATE POLICY "Admins can acknowledge anomalies" ON anomaly_events
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- 5. Service role can insert (background detection loop)
CREATE POLICY "Service role can insert anomalies" ON anomaly_events
    FOR INSERT
    WITH CHECK (true);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_anomaly_events_company_detected
    ON anomaly_events(company_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_anomaly_events_company_severity
    ON anomaly_events(company_id, severity);

CREATE INDEX IF NOT EXISTS idx_anomaly_events_company_type
    ON anomaly_events(company_id, anomaly_type);

CREATE INDEX IF NOT EXISTS idx_anomaly_events_acknowledged
    ON anomaly_events(company_id, acknowledged)
    WHERE acknowledged = FALSE;

-- 7. Grant permissions
GRANT SELECT, UPDATE ON anomaly_events TO authenticated;
GRANT ALL ON anomaly_events TO service_role;

-- 8. Extend system_settings with anomaly detection configuration
ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS anomaly_detection_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS anomaly_detection_interval INTEGER NOT NULL DEFAULT 300;

-- Work table for IWMS PDCC
-- Contains comprehensive work information with all required fields

CREATE TABLE IF NOT EXISTS iwms_work (
    work_id SERIAL PRIMARY KEY,
    
    -- Basic Information
    plan_name VARCHAR(100), -- योजनेचे नाव
    ledger_head VARCHAR(200), -- लेखाशिर्ष
    taluka VARCHAR(100), -- तालुका
    work_name VARCHAR(500) NOT NULL, -- कामाचे नाव
    tender_amount DECIMAL(15,2), -- निविदा रक्कम
    work_type VARCHAR(50), -- वर्क टाईप (Civil, Electrical, etc.)
    
    -- Administrative Details
    outward_number VARCHAR(200), -- जावक नंबर / प्रमा नंबर / दिनांक
    outward_date DATE, -- दिनांक
    admin_approval_authority VARCHAR(200), -- प्रशासकीय मंजूरीचा अधिकार
    outward_ref_date DATE, -- जावक.क्र दिनांक
    technical_approval_order VARCHAR(200), -- तांत्रिक मंजूर आदेश क्र.
    budget_provision_year VARCHAR(20), -- अंदाजपत्रकीय तरतूद सन
    work_completion_period VARCHAR(100), -- काम पुर्ण करणेची मुदत
    tender_type VARCHAR(50), -- टेंडरचा प्रकार
    
    -- Recapitulation (Financial Breakdown)
    recap_work_portion DECIMAL(15,2) DEFAULT 0, -- Work Portion
    recap_insurance DECIMAL(15,2) DEFAULT 0, -- Insurance
    recap_gst DECIMAL(15,2) DEFAULT 0, -- GST
    recap_other DECIMAL(15,2) DEFAULT 0, -- Other
    recap_total DECIMAL(15,2) DEFAULT 0, -- Total
    
    -- Document Uploads (Store file paths)
    aa_upload_path VARCHAR(500), -- AA Upload
    recap_upload_path VARCHAR(500), -- Recap Upload
    ts_upload_path VARCHAR(500), -- TS Upload
    dtp_upload_path VARCHAR(500), -- DTP Upload
    
    -- Common fields
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES iwms_users(user_id),
    updated_by INTEGER REFERENCES iwms_users(user_id),
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER REFERENCES iwms_users(user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_iwms_work_name ON iwms_work(work_name);
CREATE INDEX IF NOT EXISTS idx_iwms_work_status ON iwms_work(status);
CREATE INDEX IF NOT EXISTS idx_iwms_work_plan_name ON iwms_work(plan_name);
CREATE INDEX IF NOT EXISTS idx_iwms_work_taluka ON iwms_work(taluka);
CREATE INDEX IF NOT EXISTS idx_iwms_work_type ON iwms_work(work_type);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_iwms_work_updated_at 
    BEFORE UPDATE ON iwms_work 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

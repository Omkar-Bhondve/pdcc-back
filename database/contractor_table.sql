-- Contractor table for IWMS PDCC
-- Contains contractor information with type (majur/sube) and audit fields

CREATE TABLE IF NOT EXISTS iwms_contractor (
    contractor_id SERIAL PRIMARY KEY,
    contractor_type VARCHAR(20) NOT NULL CHECK (contractor_type IN ('majur', 'sube')),
    
    -- Authentication fields
    email VARCHAR(255),
    password_hash VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_token_expires_at TIMESTAMP NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    
    -- Sube specific fields (Personal Details)
    sube_title VARCHAR(50), -- श्री/श्रीमती
    sube_first_name VARCHAR(100), -- पहिले नाव
    sube_father_husband_name VARCHAR(100), -- वडीलांचे नाव / पतीचे नाव
    sube_last_name VARCHAR(100), -- अर्जदार आडनाव
    sube_whatsapp_number VARCHAR(20), -- व्हॉट्सॲप नंबर
    sube_username VARCHAR(100), -- युजर नेम
    sube_birth_place VARCHAR(100), -- जन्म स्थान
    sube_birth_date DATE, -- जन्मतारीख
    sube_taluka VARCHAR(100), -- तालुका
    sube_aadhar_number VARCHAR(20), -- आधार क्रमांक
    sube_pan_number VARCHAR(20), -- पॅन क्रमांक
    sube_gst_number VARCHAR(30), -- जी.एस.टी क्रमांक
    sube_current_address TEXT, -- सध्याचा पत्ता
    
    -- Sube Education/Qualification Details
    sube_technical_qualification VARCHAR(100), -- तांत्रिक पात्रता
    sube_trade VARCHAR(100), -- ट्रेड
    sube_institution_name VARCHAR(200), -- शिक्षण संस्थेचे नाव
    sube_university_name VARCHAR(200), -- विद्यापीठाचे नाव
    sube_passing_year VARCHAR(10), -- उत्तीर्ण वर्ष
    
    -- Sube Business Details
    sube_business_location VARCHAR(200), -- व्यवसायाचे ठिकाण
    sube_bank_name VARCHAR(100), -- बँकेचे नाव
    sube_bank_address TEXT, -- बँकेचा पत्ता
    
    -- Majur specific fields (Cooperative Society Details)
    majur_society_name VARCHAR(200), -- मजूर सहकारी संस्थेचे नाव
    majur_society_address TEXT, -- मजूर सहकारी संस्थेचा संपूर्ण पत्ता
    majur_registration_district VARCHAR(100), -- मजूर सहकारी संस्थेची नोंदणी करणारा जिल्हा
    majur_sub_registrar VARCHAR(200), -- उपनिबंधक / सहाय्यक उपनिबंधक
    majur_registration_number VARCHAR(50), -- नोंदणी क्रमांक
    majur_registration_date DATE, -- नोंदणी दिनांक
    majur_taluka VARCHAR(100), -- तालुका
    majur_financial_stability VARCHAR(200), -- मजूर सहकारी संस्थेचे आर्थिक स्थैर्य
    majur_share_capital VARCHAR(50), -- स्वत:चे भाग भांडवल
    majur_government_share VARCHAR(50), -- शासकीय सहभाग रू
    majur_registration_class VARCHAR(50), -- कोणत्या वर्गात नोंदणी हवी आहे
    majur_inspection_class VARCHAR(50), -- मजूर सहकारी संस्थेचे मिळालेला तपासणी वर्ग
    majur_other_department_classification TEXT, -- इतर कोणत्या खात्याकडे संस्थेचे वर्गीकरण झाले आहे काय
    majur_member_in_other_society TEXT, -- मजूर सहकारी संस्थेचा कोणी सभासद इतर संस्थेत सभासद आहे काय
    majur_chairman_name VARCHAR(100), -- अर्ज करतेवेळीच्या संस्थेच्या चेअरमेनचे नाव
    majur_chairman_whatsapp VARCHAR(20), -- चेअरमेन व्हॉट्सॲप नंबर
    majur_chairman_aadhar VARCHAR(20), -- चेअरमन आधार क्रमांक
    majur_society_pan VARCHAR(20), -- संस्थेचा पॅन नंबर
    majur_society_gst VARCHAR(30), -- संस्थेचा जी.एस.टी. नंबर
    majur_chairman_address TEXT, -- मजूर सहकारी संस्थेच्या चेअरमेनचा पत्ता
    
    -- Common fields
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES iwms_users(user_id),
    updated_by INTEGER REFERENCES iwms_users(user_id),
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER REFERENCES iwms_users(user_id)
);

-- Remove legacy per-contractor role storage from existing databases
DROP INDEX IF EXISTS idx_iwms_contractor_role_id;
ALTER TABLE iwms_contractor DROP COLUMN IF EXISTS role_id;

-- Add password reset support for existing contractor tables
ALTER TABLE iwms_contractor ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE iwms_contractor ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMP NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_iwms_contractor_type ON iwms_contractor(contractor_type);
CREATE INDEX IF NOT EXISTS idx_iwms_contractor_status ON iwms_contractor(status);
CREATE INDEX IF NOT EXISTS idx_iwms_contractor_email ON iwms_contractor(email);
CREATE INDEX IF NOT EXISTS idx_iwms_contractor_email_sent ON iwms_contractor(email_sent);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contractor_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_iwms_contractor_updated_at 
    BEFORE UPDATE ON iwms_contractor 
    FOR EACH ROW 
    EXECUTE FUNCTION update_contractor_updated_at_column();

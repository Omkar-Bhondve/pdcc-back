-- Password reset support for users and contractors
-- Safe to run multiple times.

ALTER TABLE iwms_users
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

ALTER TABLE iwms_users
    ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMP NULL;

ALTER TABLE iwms_contractor
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

ALTER TABLE iwms_contractor
    ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMP NULL;

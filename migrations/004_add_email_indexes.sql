-- Covers: WHERE account_id = ? AND folder_id = ? ORDER BY uid DESC
-- Enables index-only seeks for both the list query and COUNT(*).
CREATE INDEX IF NOT EXISTS idx_emails_account_folder_uid
ON emails(account_id, folder_id, uid DESC);

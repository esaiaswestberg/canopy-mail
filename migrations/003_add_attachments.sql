ALTER TABLE emails ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS attachment_data (
    email_id   TEXT    NOT NULL,
    account_id TEXT    NOT NULL,
    folder_id  TEXT    NOT NULL,
    idx        INTEGER NOT NULL,
    data       BLOB    NOT NULL,
    PRIMARY KEY (email_id, account_id, folder_id, idx),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

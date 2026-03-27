CREATE TABLE IF NOT EXISTS folders (
    id           TEXT NOT NULL,
    account_id   TEXT NOT NULL,
    label        TEXT NOT NULL,
    icon         TEXT NOT NULL,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_system    BOOLEAN NOT NULL DEFAULT 0,
    PRIMARY KEY (id, account_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS emails (
    id             TEXT NOT NULL,
    uid            INTEGER NOT NULL,
    account_id     TEXT NOT NULL,
    folder_id      TEXT NOT NULL,
    sender_name    TEXT NOT NULL,
    sender_email   TEXT NOT NULL,
    subject        TEXT NOT NULL,
    preview        TEXT NOT NULL DEFAULT '',
    timestamp      TEXT NOT NULL,
    is_read        BOOLEAN NOT NULL DEFAULT 0,
    is_starred     BOOLEAN NOT NULL DEFAULT 0,
    has_attachment BOOLEAN NOT NULL DEFAULT 0,
    body_html      TEXT NOT NULL DEFAULT '',
    recipients     TEXT NOT NULL DEFAULT '[]', -- JSON array
    cc             TEXT NOT NULL DEFAULT '[]', -- JSON array
    PRIMARY KEY (id, account_id, folder_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

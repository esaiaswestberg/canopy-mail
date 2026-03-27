package main

import (
	"database/sql"
	"encoding/json"
)

type cacheService struct {
	db *sql.DB
}

func newCacheService(db *sql.DB) *cacheService {
	return &cacheService{db: db}
}

func (s *cacheService) SaveFolders(accountID string, folders []Folder) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	// Delete old folders not in the current list?
	// For now, let's just clear and insert, or upsert.
	_, err = tx.Exec(`DELETE FROM folders WHERE account_id = ?`, accountID)
	if err != nil {
		return err
	}

	stmt, err := tx.Prepare(`
		INSERT INTO folders (id, account_id, label, icon, unread_count, is_system)
		VALUES (?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, f := range folders {
		_, err := stmt.Exec(f.ID, accountID, f.Label, f.Icon, f.UnreadCount, f.IsSystem)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *cacheService) GetFolders(accountID string) ([]Folder, error) {
	rows, err := s.db.Query(`
		SELECT id, label, icon, unread_count, is_system
		FROM folders
		WHERE account_id = ?
		ORDER BY is_system DESC, label ASC
	`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []Folder
	for rows.Next() {
		var f Folder
		if err := rows.Scan(&f.ID, &f.Label, &f.Icon, &f.UnreadCount, &f.IsSystem); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, nil
}

func (s *cacheService) SaveEmails(accountID string, folderID string, emails []EmailDetail) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	stmt, err := tx.Prepare(`
		INSERT INTO emails (
			id, uid, account_id, folder_id, sender_name, sender_email,
			subject, preview, timestamp, is_read, is_starred, has_attachment,
			body_html, recipients, cc
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id, account_id, folder_id) DO UPDATE SET
			is_read = excluded.is_read,
			is_starred = excluded.is_starred,
			body_html = CASE WHEN excluded.body_html != '' THEN excluded.body_html ELSE emails.body_html END
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, e := range emails {
		recipientsJSON, _ := json.Marshal(e.Recipients)
		ccJSON, _ := json.Marshal(e.Cc)

		_, err := stmt.Exec(
			e.ID, e.UID, accountID, folderID, e.Sender.Name, e.Sender.Email,
			e.Subject, e.Preview, e.Timestamp, e.IsRead, e.IsStarred, e.HasAttachment,
			e.BodyHtml, string(recipientsJSON), string(ccJSON),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *cacheService) GetEmails(accountID string, folderID string) ([]EmailListItem, error) {
	rows, err := s.db.Query(`
		SELECT id, uid, sender_name, sender_email, subject, preview, timestamp,
		       is_read, is_starred, has_attachment
		FROM emails
		WHERE account_id = ? AND folder_id = ?
		ORDER BY uid DESC
	`, accountID, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []EmailListItem
	for rows.Next() {
		var e EmailListItem
		e.AccountID = accountID
		e.FolderID = folderID
		if err := rows.Scan(
			&e.ID, &e.UID, &e.Sender.Name, &e.Sender.Email, &e.Subject,
			&e.Preview, &e.Timestamp, &e.IsRead, &e.IsStarred, &e.HasAttachment,
		); err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, nil
}

func (s *cacheService) UpdateEmailBody(accountID, folderID string, uid uint32, bodyHtml string) error {
	_, err := s.db.Exec(`UPDATE emails SET body_html = ? WHERE account_id = ? AND folder_id = ? AND uid = ?`,
		bodyHtml, accountID, folderID, uid)
	return err
}

func (s *cacheService) GetEmailDetail(accountID string, folderID string, uid uint32) (*EmailDetail, error) {
	var e EmailDetail
	e.AccountID = accountID
	e.FolderID = folderID

	var recipientsJSON, ccJSON string

	err := s.db.QueryRow(`
		SELECT id, uid, sender_name, sender_email, subject, preview, timestamp,
		       is_read, is_starred, has_attachment, body_html, recipients, cc
		FROM emails
		WHERE account_id = ? AND folder_id = ? AND uid = ?
	`, accountID, folderID, uid).Scan(
		&e.ID, &e.UID, &e.Sender.Name, &e.Sender.Email, &e.Subject,
		&e.Preview, &e.Timestamp, &e.IsRead, &e.IsStarred, &e.HasAttachment,
		&e.BodyHtml, &recipientsJSON, &ccJSON,
	)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(recipientsJSON), &e.Recipients); err != nil {
		e.Recipients = []EmailSender{}
	}
	if err := json.Unmarshal([]byte(ccJSON), &e.Cc); err != nil {
		e.Cc = []EmailSender{}
	}

	return &e, nil
}

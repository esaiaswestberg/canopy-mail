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
			body_html, recipients, cc, attachments
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id, account_id, folder_id) DO UPDATE SET
			is_read = excluded.is_read,
			is_starred = excluded.is_starred,
			has_attachment = CASE WHEN excluded.has_attachment THEN excluded.has_attachment ELSE emails.has_attachment END,
			body_html = CASE WHEN excluded.body_html != '' THEN excluded.body_html ELSE emails.body_html END,
			attachments = CASE WHEN excluded.attachments != '[]' THEN excluded.attachments ELSE emails.attachments END
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	dataStmt, err := tx.Prepare(`
		INSERT OR REPLACE INTO attachment_data (email_id, account_id, folder_id, idx, data)
		VALUES (?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer dataStmt.Close()

	for _, e := range emails {
		recipientsJSON, _ := json.Marshal(e.Recipients)
		ccJSON, _ := json.Marshal(e.Cc)

		type attachmentMeta struct {
			Name        string `json:"name"`
			ContentType string `json:"contentType"`
			Size        int    `json:"size"`
		}
		metas := make([]attachmentMeta, len(e.Attachments))
		for i, a := range e.Attachments {
			metas[i] = attachmentMeta{Name: a.Name, ContentType: a.ContentType, Size: a.Size}
		}
		attachmentsJSON, _ := json.Marshal(metas)

		_, err := stmt.Exec(
			e.ID, e.UID, accountID, folderID, e.Sender.Name, e.Sender.Email,
			e.Subject, e.Preview, e.Timestamp, e.IsRead, e.IsStarred, e.HasAttachment,
			e.BodyHtml, string(recipientsJSON), string(ccJSON), string(attachmentsJSON),
		)
		if err != nil {
			return err
		}

		for i, a := range e.Attachments {
			if _, err := dataStmt.Exec(e.ID, accountID, folderID, i, a.Data); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (s *cacheService) GetEmails(accountID string, folderID string, limit int, offset int) ([]EmailListItem, int, error) {
	total, err := s.GetEmailCount(accountID, folderID)
	if err != nil {
		return nil, 0, err
	}

	rows, err := s.db.Query(`
		SELECT id, uid, sender_name, sender_email, subject, preview, timestamp,
		       is_read, is_starred, has_attachment
		FROM emails
		WHERE account_id = ? AND folder_id = ?
		ORDER BY uid DESC
		LIMIT ? OFFSET ?
	`, accountID, folderID, limit, offset)
	if err != nil {
		return nil, 0, err
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
			return nil, 0, err
		}
		emails = append(emails, e)
	}
	return emails, total, nil
}

func (s *cacheService) GetEmailCount(accountID, folderID string) (int, error) {
	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM emails WHERE account_id = ? AND folder_id = ?`,
		accountID, folderID,
	).Scan(&count)
	return count, err
}


func (s *cacheService) UpdateEmailDetail(accountID, folderID string, uid uint32, bodyHtml string, hasAttachment bool, attachments []Attachment) error {
	type attachmentMeta struct {
		Name        string `json:"name"`
		ContentType string `json:"contentType"`
		Size        int    `json:"size"`
	}
	metas := make([]attachmentMeta, len(attachments))
	for i, a := range attachments {
		metas[i] = attachmentMeta{Name: a.Name, ContentType: a.ContentType, Size: a.Size}
	}
	attachmentsJSON, _ := json.Marshal(metas)

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var emailID string
	if err := tx.QueryRow(`SELECT id FROM emails WHERE account_id = ? AND folder_id = ? AND uid = ?`,
		accountID, folderID, uid).Scan(&emailID); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`UPDATE emails SET body_html = ?, has_attachment = ?, attachments = ? WHERE account_id = ? AND folder_id = ? AND uid = ?`,
		bodyHtml, hasAttachment, string(attachmentsJSON), accountID, folderID, uid,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`DELETE FROM attachment_data WHERE email_id = ? AND account_id = ? AND folder_id = ?`,
		emailID, accountID, folderID,
	); err != nil {
		return err
	}

	for i, a := range attachments {
		if _, err := tx.Exec(
			`INSERT INTO attachment_data (email_id, account_id, folder_id, idx, data) VALUES (?, ?, ?, ?, ?)`,
			emailID, accountID, folderID, i, a.Data,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *cacheService) GetEmailDetail(accountID string, folderID string, uid uint32) (*EmailDetail, error) {
	var e EmailDetail
	e.AccountID = accountID
	e.FolderID = folderID

	var recipientsJSON, ccJSON, attachmentsJSON string

	err := s.db.QueryRow(`
		SELECT id, uid, sender_name, sender_email, subject, preview, timestamp,
		       is_read, is_starred, has_attachment, body_html, recipients, cc, attachments
		FROM emails
		WHERE account_id = ? AND folder_id = ? AND uid = ?
	`, accountID, folderID, uid).Scan(
		&e.ID, &e.UID, &e.Sender.Name, &e.Sender.Email, &e.Subject,
		&e.Preview, &e.Timestamp, &e.IsRead, &e.IsStarred, &e.HasAttachment,
		&e.BodyHtml, &recipientsJSON, &ccJSON, &attachmentsJSON,
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

	type attachmentMeta struct {
		Name        string `json:"name"`
		ContentType string `json:"contentType"`
		Size        int    `json:"size"`
	}
	var metas []attachmentMeta
	if err := json.Unmarshal([]byte(attachmentsJSON), &metas); err != nil {
		metas = nil
	}

	if len(metas) > 0 {
		e.Attachments = make([]Attachment, len(metas))
		for i, m := range metas {
			e.Attachments[i] = Attachment{Name: m.Name, ContentType: m.ContentType, Size: m.Size}
		}

		rows, err := s.db.Query(
			`SELECT idx, data FROM attachment_data WHERE email_id = ? AND account_id = ? AND folder_id = ? ORDER BY idx`,
			e.ID, accountID, folderID,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var idx int
				var data []byte
				if err := rows.Scan(&idx, &data); err == nil && idx < len(e.Attachments) {
					e.Attachments[idx].Data = data
				}
			}
		}
	}

	return &e, nil
}

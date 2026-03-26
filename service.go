package main

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type accountService struct {
	db  *sql.DB
	key []byte
}

func newAccountService(db *sql.DB, key []byte) *accountService {
	return &accountService{db: db, key: key}
}

func (s *accountService) getAll() ([]Account, error) {
	rows, err := s.db.Query(`
		SELECT id, email, display_name, avatar_initials, avatar_color,
		       imap_host, imap_port, imap_security, imap_username, imap_auth_method,
		       smtp_host, smtp_port, smtp_security, smtp_username, smtp_auth_method
		FROM accounts
		ORDER BY created_at
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []Account
	for rows.Next() {
		var a Account
		if err := rows.Scan(
			&a.ID, &a.Email, &a.DisplayName, &a.AvatarInitials, &a.AvatarColor,
			&a.IMAP.Host, &a.IMAP.Port, &a.IMAP.Security, &a.IMAP.Username, &a.IMAP.AuthMethod,
			&a.SMTP.Host, &a.SMTP.Port, &a.SMTP.Security, &a.SMTP.Username, &a.SMTP.AuthMethod,
		); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, rows.Err()
}

func (s *accountService) add(req AddAccountRequest) (*Account, error) {
	// Validate credentials against the IMAP server before storing anything.
	if err := checkIMAPCredentials(req.IMAP, req.Password); err != nil {
		return nil, err
	}

	encPwd, err := encrypt(s.key, []byte(req.Password))
	if err != nil {
		return nil, fmt.Errorf("encrypt password: %w", err)
	}

	id := uuid.New().String()
	initials := deriveInitials(req.DisplayName)

	_, err = s.db.Exec(`
		INSERT INTO accounts (
			id, email, display_name, avatar_initials, avatar_color,
			imap_host, imap_port, imap_security, imap_username, imap_auth_method,
			smtp_host, smtp_port, smtp_security, smtp_username, smtp_auth_method,
			password_enc
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		id, req.Email, req.DisplayName, initials, req.AvatarColor,
		req.IMAP.Host, req.IMAP.Port, req.IMAP.Security, req.IMAP.Username, req.IMAP.AuthMethod,
		req.SMTP.Host, req.SMTP.Port, req.SMTP.Security, req.SMTP.Username, req.SMTP.AuthMethod,
		encPwd,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			return nil, fmt.Errorf("an account with this email address already exists")
		}
		return nil, fmt.Errorf("save account: %w", err)
	}

	return &Account{
		ID:             id,
		Email:          req.Email,
		DisplayName:    req.DisplayName,
		AvatarInitials: initials,
		AvatarColor:    req.AvatarColor,
		IMAP:           req.IMAP,
		SMTP:           req.SMTP,
	}, nil
}

func (s *accountService) update(req UpdateAccountRequest) (*Account, error) {
	initials := deriveInitials(req.DisplayName)

	res, err := s.db.Exec(`
		UPDATE accounts
		SET display_name     = ?,
		    avatar_initials  = ?,
		    avatar_color     = ?,
		    imap_host        = ?,
		    imap_port        = ?,
		    imap_security    = ?,
		    imap_username    = ?,
		    imap_auth_method = ?,
		    smtp_host        = ?,
		    smtp_port        = ?,
		    smtp_security    = ?,
		    smtp_username    = ?,
		    smtp_auth_method = ?,
		    updated_at       = ?
		WHERE id = ?
	`,
		req.DisplayName, initials, req.AvatarColor,
		req.IMAP.Host, req.IMAP.Port, req.IMAP.Security, req.IMAP.Username, req.IMAP.AuthMethod,
		req.SMTP.Host, req.SMTP.Port, req.SMTP.Security, req.SMTP.Username, req.SMTP.AuthMethod,
		time.Now().UTC().Format(time.RFC3339),
		req.ID,
	)
	if err != nil {
		return nil, fmt.Errorf("update account: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, fmt.Errorf("account not found")
	}

	var email string
	s.db.QueryRow(`SELECT email FROM accounts WHERE id = ?`, req.ID).Scan(&email) //nolint:errcheck

	return &Account{
		ID:             req.ID,
		Email:          email,
		DisplayName:    req.DisplayName,
		AvatarInitials: initials,
		AvatarColor:    req.AvatarColor,
		IMAP:           req.IMAP,
		SMTP:           req.SMTP,
	}, nil
}

func (s *accountService) delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM accounts WHERE id = ?`, id)
	return err
}

// deriveInitials returns the first letter of each of the first two words,
// uppercased (e.g. "Alex Morgan" → "AM").
func deriveInitials(displayName string) string {
	words := strings.Fields(displayName)
	if len(words) == 0 {
		return "?"
	}
	runes := []rune(words[0])
	if len(words) == 1 {
		return strings.ToUpper(string(runes[:1]))
	}
	return strings.ToUpper(string(runes[:1]) + string([]rune(words[1])[:1]))
}

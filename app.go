package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App is the Wails application struct. Its exported methods are bound to the
// frontend and callable from JavaScript/TypeScript.
type App struct {
	ctx      context.Context
	db       *sql.DB
	accounts *accountService
	cache    *cacheService
	syncer   *syncManager
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	dataDir, err := appDataDir()
	if err != nil {
		fmt.Println("[startup] data dir:", err)
		return
	}

	db, err := openDB(dataDir)
	if err != nil {
		fmt.Println("[startup] database:", err)
		return
	}
	a.db = db

	key, err := loadOrCreateKey(dataDir)
	if err != nil {
		fmt.Println("[startup] crypto key:", err)
		return
	}

	a.accounts = newAccountService(db, key)
	a.cache = newCacheService(db)
	a.syncer = newSyncManager(a.accounts, a.cache)

	a.syncer.Start(ctx)
}

// GetAccounts returns all stored accounts (without passwords).
func (a *App) GetAccounts() ([]Account, error) {
	if a.accounts == nil {
		return []Account{}, nil
	}
	accounts, err := a.accounts.getAll()
	if err != nil {
		return nil, err
	}
	if accounts == nil {
		return []Account{}, nil
	}
	return accounts, nil
}

// AddAccount validates IMAP credentials and, if successful, persists the
// account and returns it.
func (a *App) AddAccount(req AddAccountRequest) (*Account, error) {
	if a.accounts == nil {
		return nil, fmt.Errorf("service not ready")
	}
	acc, err := a.accounts.add(req)
	if err != nil {
		return nil, err
	}
	if a.syncer != nil {
		go a.syncer.SyncAccount(acc.ID)
	}
	return acc, nil
}

// UpdateAccount updates a stored account's metadata (never the password).
func (a *App) UpdateAccount(req UpdateAccountRequest) (*Account, error) {
	if a.accounts == nil {
		return nil, fmt.Errorf("service not ready")
	}
	return a.accounts.update(req)
}

// DeleteAccount removes an account by ID.
func (a *App) DeleteAccount(id string) error {
	if a.accounts == nil {
		return fmt.Errorf("service not ready")
	}
	return a.accounts.delete(id)
}

// GetFolders fetches IMAP folders for an account.
func (a *App) GetFolders(accountID string) ([]Folder, error) {
	if a.cache == nil {
		return nil, fmt.Errorf("service not ready")
	}
	return a.cache.GetFolders(accountID)
}

// GetEmails fetches a page of emails for a folder.
// When cursorUID > 0 and page > 1, uses cursor-based pagination (O(1) for any depth).
// Falls back to offset-based pagination when cursorUID == 0.
func (a *App) GetEmails(accountID string, folder string, page int, pageSize int, cursorUID uint32) (*EmailPage, error) {
	if a.cache == nil {
		return nil, fmt.Errorf("service not ready")
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize
	emails, total, err := a.cache.GetEmails(accountID, folder, pageSize, offset, cursorUID)
	if err != nil {
		return nil, err
	}
	if emails == nil {
		emails = []EmailListItem{}
	}
	var nextCursor uint32
	if len(emails) > 0 {
		nextCursor = emails[len(emails)-1].UID
	}
	return &EmailPage{
		Emails:     emails,
		Total:      total,
		HasMore:    offset+len(emails) < total,
		NextCursor: nextCursor,
	}, nil
}

// GetEmailDetail fetches the full content of an email by UID from the local cache.
func (a *App) GetEmailDetail(accountID string, folder string, uid uint32) (*EmailDetail, error) {
	if a.cache == nil {
		return nil, fmt.Errorf("service not ready")
	}
	return a.cache.GetEmailDetail(accountID, folder, uid)
}

// FetchEmailBody fetches the full email detail from IMAP (body + attachments), caches it, and returns the detail.
func (a *App) FetchEmailBody(accountID string, folder string, uid uint32) (*EmailDetail, error) {
	if a.cache == nil || a.accounts == nil {
		return nil, fmt.Errorf("service not ready")
	}

	acc, err := a.accounts.getByID(accountID)
	if err != nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}

	pwd, err := a.accounts.getPassword(accountID)
	if err != nil {
		return nil, fmt.Errorf("auth error: %w", err)
	}

	detail, err := getEmailDetail(acc.IMAP, pwd, folder, uid, accountID)
	if err != nil {
		return nil, err
	}

	if err := a.cache.UpdateEmailDetail(accountID, folder, uid, detail.BodyHtml, detail.HasAttachment, detail.Attachments); err != nil {
		fmt.Printf("[FetchEmailBody] failed to cache detail for uid %d: %v\n", uid, err)
	}

	return detail, nil
}

// SendEmail composes and delivers an outgoing email via the account's SMTP server.
func (a *App) SendEmail(req SendRequest) error {
	if a.accounts == nil {
		return fmt.Errorf("service not ready")
	}
	acc, err := a.accounts.getByID(req.AccountID)
	if err != nil {
		return fmt.Errorf("account not found: %w", err)
	}
	pwd, err := a.accounts.getPassword(req.AccountID)
	if err != nil {
		return fmt.Errorf("auth error: %w", err)
	}
	return sendEmail(acc.SMTP, acc.Email, pwd, req)
}

// SaveAttachment shows a native save dialog and writes the attachment data to the chosen path.
func (a *App) SaveAttachment(name, contentType string, data []byte) error {
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: name,
		Title:           "Save Attachment",
	})
	if err != nil || savePath == "" {
		return err
	}
	return os.WriteFile(savePath, data, 0644)
}

// appDataDir returns the platform-appropriate directory for storing app data.
func appDataDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "canopy-mail"), nil
}

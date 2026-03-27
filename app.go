package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
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

// GetEmails fetches recent emails for a folder.
func (a *App) GetEmails(accountID string, folder string) ([]EmailListItem, error) {
	if a.cache == nil {
		return nil, fmt.Errorf("service not ready")
	}
	return a.cache.GetEmails(accountID, folder)
}

// GetEmailDetail fetches the full content of an email by UID from the local cache.
func (a *App) GetEmailDetail(accountID string, folder string, uid uint32) (*EmailDetail, error) {
	if a.cache == nil {
		return nil, fmt.Errorf("service not ready")
	}
	return a.cache.GetEmailDetail(accountID, folder, uid)
}

// FetchEmailBody fetches the body of an email from IMAP, caches it, and returns the HTML.
func (a *App) FetchEmailBody(accountID string, folder string, uid uint32) (string, error) {
	if a.cache == nil || a.accounts == nil {
		return "", fmt.Errorf("service not ready")
	}

	acc, err := a.accounts.getByID(accountID)
	if err != nil {
		return "", fmt.Errorf("account not found: %w", err)
	}

	pwd, err := a.accounts.getPassword(accountID)
	if err != nil {
		return "", fmt.Errorf("auth error: %w", err)
	}

	detail, err := getEmailDetail(acc.IMAP, pwd, folder, uid, accountID)
	if err != nil {
		return "", err
	}

	if err := a.cache.UpdateEmailBody(accountID, folder, uid, detail.BodyHtml); err != nil {
		fmt.Printf("[FetchEmailBody] failed to cache body for uid %d: %v\n", uid, err)
	}

	return detail.BodyHtml, nil
}

// appDataDir returns the platform-appropriate directory for storing app data.
func appDataDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "canopy-mail"), nil
}

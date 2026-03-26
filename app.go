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
	return a.accounts.add(req)
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
	if a.accounts == nil {
		return nil, fmt.Errorf("service not ready")
	}
	acc, err := a.accounts.getByID(accountID)
	if err != nil {
		return nil, err
	}
	pwd, err := a.accounts.getPassword(accountID)
	if err != nil {
		return nil, err
	}
	return getFolders(acc.IMAP, pwd)
}

// GetEmails fetches recent emails for a folder.
func (a *App) GetEmails(accountID string, folder string) ([]EmailListItem, error) {
	if a.accounts == nil {
		return nil, fmt.Errorf("service not ready")
	}
	acc, err := a.accounts.getByID(accountID)
	if err != nil {
		return nil, err
	}
	pwd, err := a.accounts.getPassword(accountID)
	if err != nil {
		return nil, err
	}
	return getEmails(acc.IMAP, pwd, folder, accountID)
}

// GetEmailDetail fetches the full content of an email by UID.
func (a *App) GetEmailDetail(accountID string, folder string, uid uint32) (*EmailDetail, error) {
	if a.accounts == nil {
		return nil, fmt.Errorf("service not ready")
	}
	acc, err := a.accounts.getByID(accountID)
	if err != nil {
		return nil, err
	}
	pwd, err := a.accounts.getPassword(accountID)
	if err != nil {
		return nil, err
	}
	return getEmailDetail(acc.IMAP, pwd, folder, uid, accountID)
}

// appDataDir returns the platform-appropriate directory for storing app data.
func appDataDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "canopy-mail"), nil
}

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

// appDataDir returns the platform-appropriate directory for storing app data.
func appDataDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "canopy-mail"), nil
}

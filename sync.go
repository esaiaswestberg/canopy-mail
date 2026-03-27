package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type syncManager struct {
	ctx      context.Context
	accounts *accountService
	cache    *cacheService
	active   sync.Map
}

func newSyncManager(accounts *accountService, cache *cacheService) *syncManager {
	return &syncManager{
		accounts: accounts,
		cache:    cache,
	}
}

func (s *syncManager) Start(ctx context.Context) {
	s.ctx = ctx
	accs, _ := s.accounts.getAll()
	for _, acc := range accs {
		go s.SyncAccount(acc.ID)
	}
}

type syncStatus struct {
	AccountID string `json:"accountId"`
	Status    string `json:"status"`   // "syncing", "idle", "error"
	Progress  string `json:"progress"` // "Folders", "Inbox (10/100)", etc.
}

func (s *syncManager) SyncAccount(accountID string) {
	if _, loaded := s.active.LoadOrStore(accountID, true); loaded {
		return // already syncing
	}
	defer s.active.Delete(accountID)

	s.emitStatus(accountID, "syncing", "Connecting...")

	acc, err := s.accounts.getByID(accountID)
	if err != nil {
		s.emitStatus(accountID, "error", "Account not found")
		return
	}

	pwd, err := s.accounts.getPassword(accountID)
	if err != nil {
		s.emitStatus(accountID, "error", "Auth error")
		return
	}

	s.emitStatus(accountID, "syncing", "Folders")
	folders, err := getFolders(acc.IMAP, pwd)
	if err != nil {
		s.emitStatus(accountID, "error", "Folder sync failed")
		return
	}

	if err := s.cache.SaveFolders(accountID, folders); err != nil {
		fmt.Printf("failed to save folders: %v\n", err)
	}

	// Let frontend know folders are ready
	runtime.EventsEmit(s.ctx, "cache:updated", map[string]string{"type": "folders", "accountId": accountID})

	batchSize := uint32(50)
	fetchTimeout := 2 * time.Minute

	// Fetch all emails for each folder in batches
	for _, f := range folders {
		fmt.Printf("sync: starting folder %s\n", f.ID)
		s.emitStatus(accountID, "syncing", fmt.Sprintf("Emails: %s", f.Label))

		c, err := openIMAPClient(acc.IMAP, pwd, fetchTimeout)
		if err != nil {
			fmt.Printf("sync: failed to connect for %s: %v\n", f.ID, err)
			continue
		}

		mbox, err := c.Select(f.ID, true)
		if err != nil {
			fmt.Printf("sync: failed to select folder %s: %v\n", f.ID, err)
			c.Logout() //nolint:errcheck
			continue
		}
		fmt.Printf("sync: folder %s has %d messages\n", f.ID, mbox.Messages)
		total := mbox.Messages
		if total == 0 {
			fmt.Printf("sync: no messages for %s\n", f.ID)
			continue
		}

		synced := uint32(0)
		for end := total; end >= 1; end -= batchSize {
			start := uint32(1)
			if end >= batchSize {
				start = end - batchSize + 1
			}

			s.emitStatus(accountID, "syncing", fmt.Sprintf("Emails: %s (%d/%d)", f.Label, synced, total))
			batchStart := time.Now()

			emails, err := fetchEnvelopesForRange(c, f.ID, start, end, accountID)
			if err != nil {
				fmt.Printf("sync: failed to fetch emails for %s range %d-%d: %v\n", f.ID, start, end, err)
				fmt.Printf("sync: retrying range %d-%d for %s\n", start, end, f.ID)

				c.Logout() //nolint:errcheck
				c, err = openIMAPClient(acc.IMAP, pwd, fetchTimeout)
				if err != nil {
					fmt.Printf("sync: reconnect failed for %s: %v\n", f.ID, err)
					break
				}
				if _, err := c.Select(f.ID, true); err != nil {
					fmt.Printf("sync: reselect failed for %s: %v\n", f.ID, err)
					c.Logout() //nolint:errcheck
					break
				}

				emails, err = fetchEnvelopesForRange(c, f.ID, start, end, accountID)
				if err != nil {
					fmt.Printf("sync: retry failed for %s range %d-%d: %v\n", f.ID, start, end, err)
					c.Logout() //nolint:errcheck
					break
				}
			}

			if err := s.cache.SaveEmails(accountID, f.ID, emails); err != nil {
				fmt.Printf("sync: failed to save emails for %s: %v\n", f.ID, err)
			}

			synced += uint32(len(emails))
			fmt.Printf("sync: saved %d emails for %s range %d-%d in %s\n", len(emails), f.ID, start, end, time.Since(batchStart))

			// Let frontend know this folder has emails ready
			runtime.EventsEmit(s.ctx, "cache:updated", map[string]string{"type": "emails", "accountId": accountID, "folderId": f.ID})

			// Sleep briefly to avoid hammering the IMAP server
			time.Sleep(300 * time.Millisecond)
		}

		fmt.Printf("sync: completed folder %s (%d/%d)\n", f.ID, synced, total)
		c.Logout() //nolint:errcheck

		// Sleep briefly to avoid hammering the IMAP server
		time.Sleep(500 * time.Millisecond)
	}

	s.emitStatus(accountID, "idle", "Up to date")
}

func (s *syncManager) emitStatus(accountID, status, progress string) {
	if s.ctx == nil {
		return
	}
	runtime.EventsEmit(s.ctx, "sync:status", syncStatus{
		AccountID: accountID,
		Status:    status,
		Progress:  progress,
	})
}

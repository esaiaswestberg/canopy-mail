package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/emersion/go-imap/client"
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
		go s.startIdleWatcher(acc.ID)
	}

	go func() {
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				accs, _ := s.accounts.getAll()
				for _, acc := range accs {
					go s.SyncAccount(acc.ID)
				}
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (s *syncManager) startIdleWatcher(accountID string) {
	const backoff = 3 * time.Second
	for {
		if s.ctx.Err() != nil {
			return
		}

		acc, err := s.accounts.getByID(accountID)
		if err != nil {
			return
		}
		pwd, err := s.accounts.getPassword(accountID)
		if err != nil {
			return
		}

		err = s.idleLoop(*acc, pwd)
		if s.ctx.Err() != nil {
			return
		}
		if err != nil {
			fmt.Printf("[idle] %s: error: %v — retrying in %s\n", acc.Email, err, backoff)
			time.Sleep(backoff)
		}
	}
}

func (s *syncManager) idleLoop(acc Account, password string) error {
	c, err := openIMAPClient(acc.IMAP, password, 0)
	if err != nil {
		return err
	}
	defer c.Logout() //nolint:errcheck

	updates := make(chan client.Update, 10)
	c.Updates = updates

	mbox, err := c.Select("INBOX", false)
	if err != nil {
		return err
	}
	known := mbox.Messages
	fmt.Printf("[idle] %s: watching INBOX (current: %d messages)\n", acc.Email, known)

	stop := make(chan struct{})
	done := make(chan error, 1)
	go func() {
		done <- c.Idle(stop, nil)
	}()

	for {
		select {
		case update := <-updates:
			if u, ok := update.(*client.MailboxUpdate); ok {
				if u.Mailbox.Messages > known {
					fmt.Printf("[idle] %s: new messages detected (%d → %d), triggering sync\n", acc.Email, known, u.Mailbox.Messages)
					close(stop)
					<-done
					go s.SyncAccount(acc.ID)
					return nil
				}
				known = u.Mailbox.Messages
			}
		case err := <-done:
			return err
		case <-s.ctx.Done():
			close(stop)
			<-done
			return nil
		}
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

	fmt.Printf("[sync] starting sync for account %s (%s:%d)\n", acc.Email, acc.IMAP.Host, acc.IMAP.Port)

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
	fmt.Printf("[sync] found %d folders\n", len(folders))

	if err := s.cache.SaveFolders(accountID, folders); err != nil {
		fmt.Printf("failed to save folders: %v\n", err)
	}

	// Let frontend know folders are ready
	runtime.EventsEmit(s.ctx, "cache:updated", map[string]string{"type": "folders", "accountId": accountID})

	fetchTimeout := 5 * time.Minute

	for _, f := range folders {
		fmt.Printf("[sync] folder %q: checking\n", f.ID)
		s.emitStatus(accountID, "syncing", fmt.Sprintf("Checking: %s", f.Label))

		connectT := time.Now()
		c, err := openIMAPClient(acc.IMAP, pwd, fetchTimeout)
		if err != nil {
			fmt.Printf("[sync] folder %q: connect failed after %s: %v\n", f.ID, time.Since(connectT), err)
			continue
		}
		fmt.Printf("[sync] folder %q: connected in %s\n", f.ID, time.Since(connectT))

		imapTotal, err := getIMAPTotal(c, f.ID)
		if err != nil {
			fmt.Printf("[sync] folder %q: select failed: %v\n", f.ID, err)
			c.Logout() //nolint:errcheck
			continue
		}

		cachedCount, err := s.cache.GetEmailCount(accountID, f.ID)
		fmt.Printf("[sync] folder %q: server=%d cached=%d\n", f.ID, imapTotal, cachedCount)
		if err == nil && uint32(cachedCount) == imapTotal {
			fmt.Printf("[sync] folder %q: up to date, skipping\n", f.ID)
			c.Logout() //nolint:errcheck
			continue
		}

		missing := int(imapTotal) - cachedCount
		if missing <= 0 {
			fmt.Printf("[sync] folder %q: nothing to fetch (possible deletions)\n", f.ID)
			c.Logout() //nolint:errcheck
			continue
		}

		const (
			batchSize     = 50
			pipelineWidth = 3
		)
		fmt.Printf("[sync] folder %q: fetching %d missing emails in batches of %d (pipeline=%d)\n", f.ID, missing, batchSize, pipelineWidth)

		// Build the list of batches (newest-first: missing down to 1)
		type batchRange struct{ start, end int }
		var batches []batchRange
		for end := missing; end >= 1; end -= batchSize {
			start := end - batchSize + 1
			if start < 1 {
				start = 1
			}
			batches = append(batches, batchRange{start, end})
		}

		// Open additional connections (pipelineWidth - 1 extra; reuse c as the first)
		conns := []*client.Client{c}
		for i := 1; i < pipelineWidth && i < len(batches); i++ {
			extra, err := openIMAPClient(acc.IMAP, pwd, fetchTimeout)
			if err != nil {
				fmt.Printf("[sync] folder %q: extra conn %d failed: %v — using %d connections\n", f.ID, i, err, len(conns))
				break
			}
			if _, err = getIMAPTotal(extra, f.ID); err != nil {
				fmt.Printf("[sync] folder %q: extra conn %d select failed: %v\n", f.ID, i, err)
				extra.Logout() //nolint:errcheck
				break
			}
			conns = append(conns, extra)
		}
		fmt.Printf("[sync] folder %q: using %d parallel connections\n", f.ID, len(conns))

		type batchResult struct {
			emails     []EmailDetail
			err        error
			start, end int
		}

		resultCh := make(chan batchResult, len(batches))
		var wg sync.WaitGroup

		// Distribute batches across connections round-robin; each connection
		// fetches its assigned batches sequentially (one conn = one goroutine).
		// On failure the goroutine reconnects once and retries before skipping.
		for i, initialConn := range conns {
			var myBatches []batchRange
			for j := i; j < len(batches); j += len(conns) {
				myBatches = append(myBatches, batches[j])
			}
			wg.Add(1)
			go func(conn *client.Client, myBatches []batchRange) {
				defer wg.Done()
				defer conn.Logout() //nolint:errcheck
				for _, b := range myBatches {
					fmt.Printf("[sync] folder %q: fetching seq %d-%d\n", f.ID, b.start, b.end)
					fetchT := time.Now()
					seqStart := uint32(cachedCount) + uint32(b.start)
					seqEnd := uint32(cachedCount) + uint32(b.end)
					emails, err := fetchEnvelopesForRange(conn, f.ID, seqStart, seqEnd, accountID)
					if err != nil {
						fmt.Printf("[sync] folder %q: fetch failed for seq %d-%d after %s: %v — reconnecting\n", f.ID, b.start, b.end, time.Since(fetchT), err)
						conn.Logout() //nolint:errcheck
						conn, err = openIMAPClient(acc.IMAP, pwd, fetchTimeout)
						if err != nil {
							fmt.Printf("[sync] folder %q: reconnect failed: %v — worker stopping\n", f.ID, err)
							resultCh <- batchResult{nil, err, b.start, b.end}
							return
						}
						if _, err = getIMAPTotal(conn, f.ID); err != nil {
							fmt.Printf("[sync] folder %q: reselect failed: %v — worker stopping\n", f.ID, err)
							conn.Logout() //nolint:errcheck
							resultCh <- batchResult{nil, err, b.start, b.end}
							return
						}
						emails, err = fetchEnvelopesForRange(conn, f.ID, seqStart, seqEnd, accountID)
						if err != nil {
							fmt.Printf("[sync] folder %q: retry failed for seq %d-%d: %v\n", f.ID, b.start, b.end, err)
							resultCh <- batchResult{nil, err, b.start, b.end}
							continue
						}
					}
					fmt.Printf("[sync] folder %q: seq %d-%d fetched in %s\n", f.ID, b.start, b.end, time.Since(fetchT))
					resultCh <- batchResult{emails, nil, b.start, b.end}
				}
			}(initialConn, myBatches)
		}

		go func() {
			wg.Wait()
			close(resultCh)
		}()

		synced := 0
		for res := range resultCh {
			if res.err != nil {
				fmt.Printf("[sync] folder %q: skipping seq %d-%d due to error: %v\n", f.ID, res.start, res.end, res.err)
				continue
			}
			if err := s.cache.SaveEmails(accountID, f.ID, res.emails); err != nil {
				fmt.Printf("[sync] folder %q: save failed: %v\n", f.ID, err)
			}
			synced += len(res.emails)
			fmt.Printf("[sync] folder %q: seq %d-%d saved (%d/%d total)\n", f.ID, res.start, res.end, synced, missing)
			s.emitStatus(accountID, "syncing", fmt.Sprintf("Emails: %s (%d/%d)", f.Label, synced, missing))
			runtime.EventsEmit(s.ctx, "cache:updated", map[string]string{"type": "emails", "accountId": accountID, "folderId": f.ID})
		}

		fmt.Printf("[sync] folder %q: done — %d new emails\n", f.ID, synced)
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

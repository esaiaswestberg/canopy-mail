package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"strings"
	"time"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
)

// checkIMAPCredentials connects to the IMAP server and attempts a LOGIN.
// It returns nil on success, or an error describing what went wrong.
func checkIMAPCredentials(cfg ServerConfig, password string) error {
	c, err := dialIMAP(cfg)
	if err != nil {
		return err
	}
	defer c.Logout() //nolint:errcheck

	if err := c.Login(cfg.Username, password); err != nil {
		return fmt.Errorf("authentication failed: wrong username or password")
	}
	return nil
}

func dialIMAP(cfg ServerConfig) (*client.Client, error) {
	addr := net.JoinHostPort(cfg.Host, fmt.Sprintf("%d", cfg.Port))
	dialer := &net.Dialer{Timeout: 15 * time.Second}

	switch cfg.Security {
	case "ssl":
		tlsCfg := &tls.Config{ServerName: cfg.Host}
		conn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
		if err != nil {
			return nil, fmt.Errorf("connection failed: %w", err)
		}
		c, err := client.New(conn)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("imap handshake failed: %w", err)
		}
		return c, nil

	case "starttls":
		conn, err := dialer.Dial("tcp", addr)
		if err != nil {
			return nil, fmt.Errorf("connection failed: %w", err)
		}
		c, err := client.New(conn)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("imap handshake failed: %w", err)
		}
		if err := c.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
			c.Logout() //nolint:errcheck
			return nil, fmt.Errorf("starttls failed: %w", err)
		}
		return c, nil

	case "none":
		conn, err := dialer.Dial("tcp", addr)
		if err != nil {
			return nil, fmt.Errorf("connection failed: %w", err)
		}
		c, err := client.New(conn)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("imap handshake failed: %w", err)
		}
		return c, nil

	default:
		return nil, fmt.Errorf("unknown security type: %q", cfg.Security)
	}
}

func getFolders(cfg ServerConfig, password string) ([]Folder, error) {
	c, err := dialIMAP(cfg)
	if err != nil {
		return nil, err
	}
	defer c.Logout() //nolint:errcheck

	if err := c.Login(cfg.Username, password); err != nil {
		return nil, err
	}

	mailboxes := make(chan *imap.MailboxInfo, 10)
	done := make(chan error, 1)
	go func() {
		done <- c.List("", "*", mailboxes)
	}()

	var folders []Folder
	for m := range mailboxes {
		icon := "archive"
		isSystem := false

		nameLower := strings.ToLower(m.Name)
		if strings.Contains(nameLower, "inbox") {
			icon = "inbox"
			isSystem = true
		} else if strings.Contains(nameLower, "sent") {
			icon = "sent"
			isSystem = true
		} else if strings.Contains(nameLower, "draft") {
			icon = "drafts"
			isSystem = true
		} else if strings.Contains(nameLower, "trash") || strings.Contains(nameLower, "bin") {
			icon = "trash"
			isSystem = true
		} else if strings.Contains(nameLower, "spam") || strings.Contains(nameLower, "junk") {
			icon = "spam"
			isSystem = true
		}

		folders = append(folders, Folder{
			ID:          m.Name,
			Label:       m.Name,
			Icon:        icon,
			UnreadCount: 0,
			IsSystem:    isSystem,
		})
	}

	if err := <-done; err != nil {
		return nil, err
	}

	return folders, nil
}

func getEmails(cfg ServerConfig, password string, folder string, accountID string) ([]EmailListItem, error) {
	c, err := dialIMAP(cfg)
	if err != nil {
		return nil, err
	}
	defer c.Logout() //nolint:errcheck

	if err := c.Login(cfg.Username, password); err != nil {
		return nil, err
	}

	mbox, err := c.Select(folder, true)
	if err != nil {
		return nil, err
	}

	if mbox.Messages == 0 {
		return []EmailListItem{}, nil
	}

	from := uint32(1)
	to := mbox.Messages
	if mbox.Messages > 50 {
		from = mbox.Messages - 49
	}

	seqset := new(imap.SeqSet)
	seqset.AddRange(from, to)

	items := []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchUid}
	messages := make(chan *imap.Message, 50)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, items, messages)
	}()

	var emails []EmailListItem
	for msg := range messages {
		isRead := false
		isStarred := false
		for _, flag := range msg.Flags {
			if flag == imap.SeenFlag {
				isRead = true
			}
			if flag == imap.FlaggedFlag {
				isStarred = true
			}
		}

		var sender EmailSender
		if len(msg.Envelope.From) > 0 {
			sender.Name = msg.Envelope.From[0].PersonalName
			if sender.Name == "" {
				sender.Name = msg.Envelope.From[0].MailboxName
			}
			sender.Email = msg.Envelope.From[0].MailboxName + "@" + msg.Envelope.From[0].HostName
		}

		timestamp := ""
		if !msg.Envelope.Date.IsZero() {
			timestamp = msg.Envelope.Date.Format(time.RFC3339)
		}

		emails = append(emails, EmailListItem{
			ID:            fmt.Sprintf("%d", msg.Uid),
			UID:           msg.Uid,
			Sender:        sender,
			Subject:       msg.Envelope.Subject,
			Timestamp:     timestamp,
			IsRead:        isRead,
			IsStarred:     isStarred,
			HasAttachment: false,
			FolderID:      folder,
			AccountID:     accountID,
		})
	}

	if err := <-done; err != nil {
		return nil, err
	}

	for i, j := 0, len(emails)-1; i < j; i, j = i+1, j-1 {
		emails[i], emails[j] = emails[j], emails[i]
	}

	return emails, nil
}

func getEmailDetail(cfg ServerConfig, password string, folder string, uid uint32, accountID string) (*EmailDetail, error) {
	c, err := dialIMAP(cfg)
	if err != nil {
		return nil, err
	}
	defer c.Logout() //nolint:errcheck

	if err := c.Login(cfg.Username, password); err != nil {
		return nil, err
	}

	_, err = c.Select(folder, true)
	if err != nil {
		return nil, err
	}

	seqset := new(imap.SeqSet)
	seqset.AddNum(uid)

	section := &imap.BodySectionName{}
	items := []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchUid, section.FetchItem()}

	messages := make(chan *imap.Message, 1)
	done := make(chan error, 1)
	go func() {
		done <- c.UidFetch(seqset, items, messages)
	}()

	var msg *imap.Message
	for m := range messages {
		msg = m
	}

	if err := <-done; err != nil {
		return nil, err
	}

	if msg == nil {
		return nil, fmt.Errorf("message not found")
	}

	r := msg.GetBody(section)
	if r == nil {
		return nil, fmt.Errorf("could not get message body")
	}

	mr, err := mail.CreateReader(r)
	if err != nil {
		return nil, err
	}

	var bodyHtml string
	var bodyText string

	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		} else if err != nil {
			continue
		}

		switch h := p.Header.(type) {
		case *mail.InlineHeader:
			b, _ := io.ReadAll(p.Body)
			contentType, _, _ := h.ContentType()
			if contentType == "text/html" {
				bodyHtml = string(b)
			} else if contentType == "text/plain" {
				bodyText = string(b)
			}
		}
	}

	if bodyHtml == "" && bodyText != "" {
		bodyHtml = "<p>" + strings.ReplaceAll(bodyText, "\n", "<br>") + "</p>"
	}

	isRead := false
	isStarred := false
	for _, flag := range msg.Flags {
		if flag == imap.SeenFlag {
			isRead = true
		}
		if flag == imap.FlaggedFlag {
			isStarred = true
		}
	}

	var sender EmailSender
	if len(msg.Envelope.From) > 0 {
		sender.Name = msg.Envelope.From[0].PersonalName
		if sender.Name == "" {
			sender.Name = msg.Envelope.From[0].MailboxName
		}
		sender.Email = msg.Envelope.From[0].MailboxName + "@" + msg.Envelope.From[0].HostName
	}

	var recipients []EmailSender
	for _, to := range msg.Envelope.To {
		recipients = append(recipients, EmailSender{
			Name:  to.PersonalName,
			Email: to.MailboxName + "@" + to.HostName,
		})
	}

	var cc []EmailSender
	for _, to := range msg.Envelope.Cc {
		cc = append(cc, EmailSender{
			Name:  to.PersonalName,
			Email: to.MailboxName + "@" + to.HostName,
		})
	}

	timestamp := ""
	if !msg.Envelope.Date.IsZero() {
		timestamp = msg.Envelope.Date.Format(time.RFC3339)
	}

	detail := &EmailDetail{
		EmailListItem: EmailListItem{
			ID:            fmt.Sprintf("%d", msg.Uid),
			UID:           msg.Uid,
			Sender:        sender,
			Subject:       msg.Envelope.Subject,
			Timestamp:     timestamp,
			IsRead:        isRead,
			IsStarred:     isStarred,
			HasAttachment: false,
			FolderID:      folder,
			AccountID:     accountID,
		},
		BodyHtml:   bodyHtml,
		Recipients: recipients,
		Cc:         cc,
	}

	return detail, nil
}

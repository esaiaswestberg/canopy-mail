package main

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/smtp"
	"net/textproto"
	"strings"
	"time"
)

// plainAuth is a custom SMTP PLAIN authenticator that skips the TLS check
// performed by smtp.PlainAuth. This is necessary for implicit-TLS connections
// (port 465) where we dial TLS ourselves but the smtp.Client does not set its
// internal tls flag, causing smtp.PlainAuth to refuse with "unencrypted connection".
type plainAuth struct{ username, password string }

func (a plainAuth) Start(_ *smtp.ServerInfo) (string, []byte, error) {
	creds := "\x00" + a.username + "\x00" + a.password
	return "PLAIN", []byte(creds), nil
}

func (a plainAuth) Next(_ []byte, more bool) ([]byte, error) {
	if more {
		return nil, fmt.Errorf("unexpected server challenge")
	}
	return nil, nil
}

// dialSMTP connects to the SMTP server described by cfg and returns a ready
// (but not yet authenticated) smtp.Client. Mirrors the dialIMAP pattern.
func dialSMTP(cfg ServerConfig) (*smtp.Client, error) {
	addr := net.JoinHostPort(cfg.Host, fmt.Sprintf("%d", cfg.Port))

	switch cfg.Security {
	case "ssl":
		tlsCfg := &tls.Config{ServerName: cfg.Host}
		conn, err := tls.Dial("tcp", addr, tlsCfg)
		if err != nil {
			return nil, fmt.Errorf("smtp connection failed: %w", err)
		}
		c, err := smtp.NewClient(conn, cfg.Host)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("smtp handshake failed: %w", err)
		}
		return c, nil

	case "starttls":
		c, err := smtp.Dial(addr)
		if err != nil {
			return nil, fmt.Errorf("smtp connection failed: %w", err)
		}
		if err := c.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
			c.Close()
			return nil, fmt.Errorf("starttls failed: %w", err)
		}
		return c, nil

	case "none":
		c, err := smtp.Dial(addr)
		if err != nil {
			return nil, fmt.Errorf("smtp connection failed: %w", err)
		}
		return c, nil

	default:
		return nil, fmt.Errorf("unknown security type: %q", cfg.Security)
	}
}

// sendEmail connects to the SMTP server, authenticates, and delivers the message.
func sendEmail(cfg ServerConfig, fromEmail, password string, req SendRequest) error {
	raw, err := buildMIMEMessage(fromEmail, req)
	if err != nil {
		return fmt.Errorf("build message: %w", err)
	}

	c, err := dialSMTP(cfg)
	if err != nil {
		return err
	}
	defer c.Close()

	if err := c.Auth(plainAuth{cfg.Username, password}); err != nil {
		return fmt.Errorf("smtp auth failed: %w", err)
	}

	if err := c.Mail(fromEmail); err != nil {
		return fmt.Errorf("MAIL FROM failed: %w", err)
	}
	for _, to := range req.To {
		if err := c.Rcpt(to); err != nil {
			return fmt.Errorf("RCPT TO %s failed: %w", to, err)
		}
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("DATA failed: %w", err)
	}
	if _, err := w.Write(raw); err != nil {
		return fmt.Errorf("write message: %w", err)
	}
	return w.Close()
}

// buildMIMEMessage constructs a complete RFC 2822 + MIME message ready to pipe
// to an SMTP DATA command.
func buildMIMEMessage(fromEmail string, req SendRequest) ([]byte, error) {
	var buf bytes.Buffer

	subject := mime.QEncoding.Encode("utf-8", req.Subject)
	date := time.Now().Format(time.RFC1123Z)

	if len(req.Attachments) == 0 {
		// Simple HTML-only message.
		buf.WriteString("From: " + fromEmail + "\r\n")
		buf.WriteString("To: " + strings.Join(req.To, ", ") + "\r\n")
		buf.WriteString("Subject: " + subject + "\r\n")
		buf.WriteString("Date: " + date + "\r\n")
		buf.WriteString("MIME-Version: 1.0\r\n")
		buf.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n")
		buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
		buf.WriteString("\r\n")

		qp := quotedprintable.NewWriter(&buf)
		if _, err := qp.Write([]byte(req.BodyHtml)); err != nil {
			return nil, err
		}
		qp.Close()
	} else {
		// Build the multipart body first so we know the boundary before writing headers.
		var body bytes.Buffer
		mw := multipart.NewWriter(&body)

		// HTML part.
		htmlHeader := textproto.MIMEHeader{}
		htmlHeader.Set("Content-Type", `text/html; charset="utf-8"`)
		htmlHeader.Set("Content-Transfer-Encoding", "quoted-printable")
		htmlPart, err := mw.CreatePart(htmlHeader)
		if err != nil {
			return nil, err
		}
		qp := quotedprintable.NewWriter(htmlPart)
		if _, err := qp.Write([]byte(req.BodyHtml)); err != nil {
			return nil, err
		}
		qp.Close()

		// Attachment parts.
		for _, att := range req.Attachments {
			attHeader := textproto.MIMEHeader{}
			attHeader.Set("Content-Type", att.ContentType)
			attHeader.Set("Content-Transfer-Encoding", "base64")
			attHeader.Set("Content-Disposition", fmt.Sprintf(
				`attachment; filename="%s"`,
				mime.QEncoding.Encode("utf-8", att.Name),
			))
			attPart, err := mw.CreatePart(attHeader)
			if err != nil {
				return nil, err
			}
			enc := base64.NewEncoder(base64.StdEncoding, attPart)
			if _, err := enc.Write(att.Data); err != nil {
				return nil, err
			}
			enc.Close()
		}
		mw.Close()

		// Now write the headers — boundary is known.
		buf.WriteString("From: " + fromEmail + "\r\n")
		buf.WriteString("To: " + strings.Join(req.To, ", ") + "\r\n")
		buf.WriteString("Subject: " + subject + "\r\n")
		buf.WriteString("Date: " + date + "\r\n")
		buf.WriteString("MIME-Version: 1.0\r\n")
		buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n", mw.Boundary()))
		buf.WriteString("\r\n")
		buf.Write(body.Bytes())
	}

	return buf.Bytes(), nil
}

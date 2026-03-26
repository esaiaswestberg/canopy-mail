package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"time"

	"github.com/emersion/go-imap/client"
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

package main

// ServerConfig holds the connection settings for an IMAP or SMTP server.
type ServerConfig struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Security   string `json:"security"`   // "ssl", "starttls", "none"
	Username   string `json:"username"`
	AuthMethod string `json:"authMethod"` // "password", "app-password", "oauth2"
}

// Account is returned to the frontend. It never includes the password.
type Account struct {
	ID             string       `json:"id"`
	Email          string       `json:"email"`
	DisplayName    string       `json:"displayName"`
	AvatarInitials string       `json:"avatarInitials"`
	AvatarColor    string       `json:"avatarColor"`
	IMAP           ServerConfig `json:"imap"`
	SMTP           ServerConfig `json:"smtp"`
}

// AddAccountRequest is sent by the frontend when the user completes the wizard.
type AddAccountRequest struct {
	Email       string       `json:"email"`
	DisplayName string       `json:"displayName"`
	AvatarColor string       `json:"avatarColor"`
	Password    string       `json:"password"`
	IMAP        ServerConfig `json:"imap"`
	SMTP        ServerConfig `json:"smtp"`
}

// UpdateAccountRequest is sent when the user saves changes in the edit form.
// Email and password are not part of the update flow.
type UpdateAccountRequest struct {
	ID          string       `json:"id"`
	DisplayName string       `json:"displayName"`
	AvatarColor string       `json:"avatarColor"`
	IMAP        ServerConfig `json:"imap"`
	SMTP        ServerConfig `json:"smtp"`
}

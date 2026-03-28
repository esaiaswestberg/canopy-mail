package main

// ServerConfig holds the connection settings for an IMAP or SMTP server.
type ServerConfig struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Security   string `json:"security"` // "ssl", "starttls", "none"
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

type Folder struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Icon        string `json:"icon"`
	UnreadCount int    `json:"unreadCount"`
	IsSystem    bool   `json:"isSystem"`
}

type EmailSender struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type EmailListItem struct {
	ID            string      `json:"id"`
	UID           uint32      `json:"uid"` // Need UID for fetching email detail
	Sender        EmailSender `json:"sender"`
	Subject       string      `json:"subject"`
	Preview       string      `json:"preview"` // Keeping this empty since user preferred fast loading
	Timestamp     string      `json:"timestamp"`
	IsRead        bool        `json:"isRead"`
	IsStarred     bool        `json:"isStarred"`
	HasAttachment bool        `json:"hasAttachment"`
	FolderID      string      `json:"folderId"`
	AccountID     string      `json:"accountId"`
}

type Attachment struct {
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
	Size        int    `json:"size"`
	Data        []byte `json:"data"`
}

type EmailDetail struct {
	EmailListItem
	BodyHtml    string       `json:"bodyHtml"`
	Recipients  []EmailSender `json:"recipients"`
	Cc          []EmailSender `json:"cc"`
	Attachments []Attachment  `json:"attachments"`
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

// SendRequest carries the data needed to send an outgoing email.
type SendRequest struct {
	AccountID   string       `json:"accountId"`
	To          []string     `json:"to"`
	Subject     string       `json:"subject"`
	BodyHtml    string       `json:"bodyHtml"`
	Attachments []Attachment `json:"attachments"`
}

// EmailPage is the paginated response for GetEmails.
type EmailPage struct {
	Emails  []EmailListItem `json:"emails"`
	Total   int             `json:"total"`
	HasMore bool            `json:"hasMore"`
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

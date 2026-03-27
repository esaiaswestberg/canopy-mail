export type ConnectionSecurity = 'ssl' | 'starttls' | 'none'
export type AuthMethod = 'password' | 'app-password' | 'oauth2'

export interface ServerConfig {
    host: string
    port: number
    security: ConnectionSecurity
    username: string
    authMethod: AuthMethod
}

export interface Account {
    id: string
    email: string
    displayName: string
    avatarInitials: string
    avatarColor: string
    imap: ServerConfig
    smtp: ServerConfig
}

export type FolderIcon =
    | 'inbox'
    | 'sent'
    | 'drafts'
    | 'trash'
    | 'spam'
    | 'archive'
    | 'star'

export interface Folder {
    id: string
    label: string
    icon: FolderIcon
    unreadCount?: number
    isSystem: boolean
}

export interface EmailSender {
    name: string
    email: string
}

export interface EmailListItem {
    id: string
    uid: number
    sender: EmailSender
    subject: string
    preview: string
    timestamp: string
    isRead: boolean
    isStarred: boolean
    hasAttachment: boolean
    folderId: string
    accountId: string
}

export interface EmailDetail extends EmailListItem {
    bodyHtml: string
    recipients: EmailSender[]
    cc?: EmailSender[]
}

export interface SyncStatus {
    accountId: string
    status: 'syncing' | 'idle' | 'error'
    progress: string
}

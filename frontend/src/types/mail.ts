export interface Account {
    id: string
    email: string
    displayName: string
    avatarInitials: string
    avatarColor: string
    isActive: boolean
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

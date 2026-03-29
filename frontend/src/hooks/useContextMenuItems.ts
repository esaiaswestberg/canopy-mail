import {
    Archive,
    BookOpen,
    FileText,
    Forward,
    FolderInput,
    Inbox,
    MailOpen,
    Pencil,
    Reply,
    Send,
    ShieldAlert,
    Star,
    StarOff,
    Trash2,
} from 'lucide-react'
import { createElement } from 'react'
import { ContextMenuItem } from '../context/ContextMenuContext'
import { EmailListItem, Folder, FolderIcon } from '../types/mail'

const folderIconMap: Record<FolderIcon, React.ElementType> = {
    inbox:   Inbox,
    sent:    Send,
    drafts:  FileText,
    archive: Archive,
    spam:    ShieldAlert,
    trash:   Trash2,
    star:    Star,
}

function icon(component: React.ElementType) {
    return createElement(component, { size: 13 })
}

export function useEmailContextMenuItems(email: EmailListItem, folders: Folder[], onMarkEmailRead: (email: EmailListItem, isRead: boolean) => void, onReply: (email: EmailListItem) => void, onForward: (email: EmailListItem) => void): ContextMenuItem[] {
    return [
        email.isRead
            ? {
                  type: 'action',
                  label: 'Mark as Unread',
                  icon: icon(MailOpen),
                  onClick: () => onMarkEmailRead(email, false),
              }
            : {
                  type: 'action',
                  label: 'Mark as Read',
                  icon: icon(BookOpen),
                  onClick: () => onMarkEmailRead(email, true),
              },
        email.isStarred
            ? {
                  type: 'action',
                  label: 'Unstar',
                  icon: icon(StarOff),
                  onClick: () => console.log('unstar', email.id),
              }
            : {
                  type: 'action',
                  label: 'Star',
                  icon: icon(Star),
                  onClick: () => console.log('star', email.id),
              },
        { type: 'divider' },
        {
            type: 'action',
            label: 'Reply',
            icon: icon(Reply),
            onClick: () => onReply(email),
        },
        {
            type: 'action',
            label: 'Forward',
            icon: icon(Forward),
            onClick: () => onForward(email),
        },
        { type: 'divider' },
        {
            type: 'action',
            label: 'Archive',
            icon: icon(Archive),
            onClick: () => console.log('archive', email.id),
        },
        {
            type: 'submenu',
            label: 'Move to',
            icon: icon(FolderInput),
            items: folders
                .filter((f: Folder) => f.id !== email.folderId)
                .map((f: Folder) => ({
                    type: 'action' as const,
                    label: f.label,
                    icon: icon(folderIconMap[f.icon]),
                    onClick: () => console.log('move', email.id, 'to', f.id),
                })),
        },
        { type: 'divider' },
        {
            type: 'action',
            label: 'Move to Trash',
            icon: icon(Trash2),
            danger: true,
            onClick: () => console.log('trash', email.id),
        },
    ]
}

export function useFolderContextMenuItems(folder: Folder): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
        {
            type: 'action',
            label: 'Mark All as Read',
            icon: icon(BookOpen),
            onClick: () => console.log('mark all read', folder.id),
        },
    ]

    if (!folder.isSystem) {
        items.push(
            { type: 'divider' },
            {
                type: 'action',
                label: 'Rename',
                icon: icon(Pencil),
                onClick: () => console.log('rename folder', folder.id),
            },
            {
                type: 'action',
                label: 'Delete Folder',
                icon: icon(Trash2),
                danger: true,
                onClick: () => console.log('delete folder', folder.id),
            }
        )
    }

    return items
}

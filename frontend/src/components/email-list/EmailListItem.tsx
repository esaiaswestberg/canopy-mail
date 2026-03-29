import { Paperclip, Star } from 'lucide-react'
import { EmailListItem as EmailListItemType, Folder } from '../../types/mail'
import { formatTimestamp } from '../../utils/time'
import { useContextMenu } from '../../context/ContextMenuContext'
import { useEmailContextMenuItems } from '../../hooks/useContextMenuItems'
import './EmailListItem.css'

interface EmailListItemProps {
    email: EmailListItemType
    folders: Folder[]
    isSelected: boolean
    onClick: () => void
    onMarkEmailRead: (email: EmailListItemType, isRead: boolean) => void
    onReply: (email: EmailListItemType) => void
    onForward: (email: EmailListItemType) => void
}

function getInitial(name: string): string {
    return name.charAt(0).toUpperCase()
}

// Deterministic color from sender name
const AVATAR_COLORS = ['#6b7bff', '#4caf8f', '#e07b54', '#c95f8e', '#5fa8d3', '#8b6bff']
function avatarColor(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function EmailListItem({ email, folders, isSelected, onClick, onMarkEmailRead, onReply, onForward }: EmailListItemProps) {
    const { openMenu } = useContextMenu()
    const menuItems = useEmailContextMenuItems(email, folders, onMarkEmailRead, onReply, onForward)

    function handleContextMenu(e: React.MouseEvent) {
        e.preventDefault()
        openMenu(e.clientX, e.clientY, menuItems)
    }

    return (
        <button
            className={`email-list-item${isSelected ? ' email-list-item--selected' : ''}${!email.isRead ? ' email-list-item--unread' : ''}`}
            onClick={onClick}
            onContextMenu={handleContextMenu}
        >
            <div className="email-list-item__left">
                {!email.isRead && <span className="email-list-item__dot" />}
                <div
                    className="email-list-item__avatar"
                    style={{ backgroundColor: avatarColor(email.sender.name) }}
                >
                    {getInitial(email.sender.name)}
                </div>
            </div>
            <div className="email-list-item__body">
                <div className="email-list-item__row">
                    <span className="email-list-item__sender">{email.sender.name}</span>
                    <span className="email-list-item__time">{formatTimestamp(email.timestamp)}</span>
                </div>
                <div className="email-list-item__subject">{email.subject}</div>
                <div className="email-list-item__preview-row">
                    <span className="email-list-item__preview">{email.preview}</span>
                    <span className="email-list-item__icons">
                        {email.hasAttachment && <Paperclip size={11} className="email-list-item__icon" />}
                        {email.isStarred && <Star size={11} className="email-list-item__icon email-list-item__icon--starred" />}
                    </span>
                </div>
            </div>
        </button>
    )
}

import {
    Archive,
    FileText,
    Inbox,
    Send,
    ShieldAlert,
    Star,
    Trash2,
} from 'lucide-react'
import { Folder, FolderIcon } from '../../types/mail'
import './FolderItem.css'

const iconMap: Record<FolderIcon, React.ReactNode> = {
    inbox:   <Inbox size={15} />,
    sent:    <Send size={15} />,
    drafts:  <FileText size={15} />,
    archive: <Archive size={15} />,
    spam:    <ShieldAlert size={15} />,
    trash:   <Trash2 size={15} />,
    star:    <Star size={15} />,
}

interface FolderItemProps {
    folder: Folder
    isActive: boolean
    onClick: () => void
}

export default function FolderItem({ folder, isActive, onClick }: FolderItemProps) {
    return (
        <button
            className={`folder-item${isActive ? ' folder-item--active' : ''}`}
            onClick={onClick}
        >
            <span className={`folder-item__icon${folder.id === 'trash' ? ' folder-item__icon--danger' : ''}`}>
                {iconMap[folder.icon]}
            </span>
            <span className="folder-item__label">{folder.label}</span>
            {folder.unreadCount !== undefined && folder.unreadCount > 0 && (
                <span className="folder-item__badge">{folder.unreadCount}</span>
            )}
        </button>
    )
}

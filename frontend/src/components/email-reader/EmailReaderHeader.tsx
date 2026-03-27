import { Archive, Forward, Reply, Star, Trash2 } from 'lucide-react'
import { EmailDetail } from '../../types/mail'
import { formatTimestamp } from '../../data/mockData'
import './EmailReaderHeader.css'

interface EmailReaderHeaderProps {
    email: EmailDetail
    onReply: () => void
    onForward: () => void
}

export default function EmailReaderHeader({ email, onReply, onForward }: EmailReaderHeaderProps) {
    const recipientList = email.recipients.map(r => r.name || r.email).join(', ')

    return (
        <div className="reader-header">
            <div className="reader-header__subject">{email.subject}</div>
            <div className="reader-header__meta">
                <div className="reader-header__sender-row">
                    <div className="reader-header__sender-info">
                        <span className="reader-header__sender-name">{email.sender.name}</span>
                        <span className="reader-header__sender-email">&lt;{email.sender.email}&gt;</span>
                    </div>
                    <span className="reader-header__timestamp">{formatTimestamp(email.timestamp)}</span>
                </div>
                <div className="reader-header__recipients">
                    To: <span className="reader-header__recipients-list">{recipientList}</span>
                </div>
            </div>
            <div className="reader-header__actions">
                <button className="reader-header__action" title="Reply" onClick={onReply}>
                    <Reply size={15} />
                    <span>Reply</span>
                </button>
                <button className="reader-header__action" title="Forward" onClick={onForward}>
                    <Forward size={15} />
                    <span>Forward</span>
                </button>
                <div className="reader-header__action-divider" />
                <button className="reader-header__action reader-header__action--icon" title="Star">
                    <Star size={15} className={email.isStarred ? 'reader-header__icon--starred' : ''} />
                </button>
                <button className="reader-header__action reader-header__action--icon" title="Archive">
                    <Archive size={15} />
                </button>
                <button className="reader-header__action reader-header__action--icon reader-header__action--danger" title="Delete">
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    )
}

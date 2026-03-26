import { EmailListItem as EmailListItemType, Folder } from '../../types/mail'
import EmailListHeader from './EmailListHeader'
import EmailListItem from './EmailListItem'
import './EmailList.css'

interface EmailListProps {
    folder: Folder
    emails: EmailListItemType[]
    selectedEmailId: string | null
    onSelectEmail: (id: string) => void
}

export default function EmailList({ folder, emails, selectedEmailId, onSelectEmail }: EmailListProps) {
    return (
        <div className="email-list">
            <EmailListHeader folderLabel={folder.label} emailCount={emails.length} />
            <div className="email-list__items">
                {emails.length === 0 ? (
                    <div className="email-list__empty">No messages</div>
                ) : (
                    emails.map(email => (
                        <EmailListItem
                            key={email.id}
                            email={email}
                            isSelected={email.id === selectedEmailId}
                            onClick={() => onSelectEmail(email.id)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

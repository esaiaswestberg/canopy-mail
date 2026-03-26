import { Pencil, Trash2 } from 'lucide-react'
import { Account } from '../../../types/mail'
import './AccountRow.css'

interface AccountRowProps {
    account: Account
    isOnly: boolean
    isEditing: boolean
    onEdit: (account: Account) => void
    onDelete: (id: string) => void
}

export default function AccountRow({ account, isOnly, isEditing, onEdit, onDelete }: AccountRowProps) {
    return (
        <div className={`account-row${isEditing ? ' account-row--editing' : ''}`}>
            <div
                className="account-row__avatar"
                style={{ backgroundColor: account.avatarColor }}
            >
                {account.avatarInitials}
            </div>
            <div className="account-row__info">
                <span className="account-row__name">{account.displayName}</span>
                <span className="account-row__email">{account.email}</span>
            </div>
            <div className="account-row__actions">
                <button
                    className="account-row__action-btn"
                    onClick={() => onEdit(account)}
                    aria-label="Edit account"
                    title="Edit"
                >
                    <Pencil size={14} />
                </button>
                {!isOnly && (
                    <button
                        className="account-row__action-btn account-row__action-btn--danger"
                        onClick={() => onDelete(account.id)}
                        aria-label="Delete account"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    )
}

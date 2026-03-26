import { Account } from '../../../types/mail'
import './DeleteAccountDialog.css'

interface DeleteAccountDialogProps {
    account: Account
    onConfirm: () => void
    onCancel: () => void
}

export default function DeleteAccountDialog({ account, onConfirm, onCancel }: DeleteAccountDialogProps) {
    return (
        <div className="delete-dialog" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
            <div className="delete-dialog__box">
                <h3 className="delete-dialog__title">Remove account?</h3>
                <p className="delete-dialog__body">
                    <strong>{account.displayName}</strong> ({account.email}) will be removed.
                    This cannot be undone.
                </p>
                <div className="delete-dialog__actions">
                    <button className="delete-dialog__cancel-btn" onClick={onCancel}>Cancel</button>
                    <button className="delete-dialog__confirm-btn" onClick={onConfirm}>Remove</button>
                </div>
            </div>
        </div>
    )
}

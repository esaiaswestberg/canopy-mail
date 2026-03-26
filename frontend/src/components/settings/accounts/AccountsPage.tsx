import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Account } from '../../../types/mail'
import AccountRow from './AccountRow'
import EditAccountForm from './EditAccountForm'
import DeleteAccountDialog from './DeleteAccountDialog'
import './AccountsPage.css'

interface AccountsPageProps {
    accounts: Account[]
    onOpenWizard: () => void
    onUpdateAccount: (account: Account) => void
    onDeleteAccount: (id: string) => void
}

export default function AccountsPage({ accounts, onOpenWizard, onUpdateAccount, onDeleteAccount }: AccountsPageProps) {
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)

    const deletingAccount = deletingAccountId ? accounts.find(a => a.id === deletingAccountId) : null

    return (
        <div className="accounts-page">
            <div className="accounts-page__header">
                <h2 className="accounts-page__title">Accounts</h2>
                <button
                    className="accounts-page__add-btn"
                    onClick={() => { setEditingAccount(null); onOpenWizard() }}
                >
                    <Plus size={14} />
                    Add Account
                </button>
            </div>

            <div className="accounts-page__list">
                {accounts.map(account => (
                    <div key={account.id}>
                        <AccountRow
                            account={account}
                            isOnly={accounts.length === 1}
                            isEditing={editingAccount?.id === account.id}
                            onEdit={a => setEditingAccount(editingAccount?.id === a.id ? null : a)}
                            onDelete={id => setDeletingAccountId(id)}
                        />
                        {editingAccount?.id === account.id && (
                            <EditAccountForm
                                account={editingAccount}
                                onSave={updated => {
                                    onUpdateAccount(updated)
                                    setEditingAccount(null)
                                }}
                                onCancel={() => setEditingAccount(null)}
                            />
                        )}
                    </div>
                ))}
            </div>

            {deletingAccount && (
                <DeleteAccountDialog
                    account={deletingAccount}
                    onConfirm={() => {
                        onDeleteAccount(deletingAccount.id)
                        setDeletingAccountId(null)
                    }}
                    onCancel={() => setDeletingAccountId(null)}
                />
            )}
        </div>
    )
}

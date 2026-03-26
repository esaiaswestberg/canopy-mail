import { useEffect, useRef, useState } from 'react'
import { Account } from '../../types/mail'
import SettingsNav, { SettingsSection } from './SettingsNav'
import AccountsPage from './accounts/AccountsPage'
import AddAccountWizard from './accounts/AddAccountWizard'
import './SettingsModal.css'

interface SettingsModalProps {
    accounts: Account[]
    onClose: () => void
    onAddAccount: (account: Account) => void
    onUpdateAccount: (account: Account) => void
    onDeleteAccount: (id: string) => void
}

export default function SettingsModal({ accounts, onClose, onAddAccount, onUpdateAccount, onDeleteAccount }: SettingsModalProps) {
    const [activeSection, setActiveSection] = useState<SettingsSection>('accounts')
    const [wizardOpen, setWizardOpen] = useState(false)
    const dialogRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        dialogRef.current?.focus()
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                if (wizardOpen) setWizardOpen(false)
                else onClose()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose, wizardOpen])

    function handleBackdropMouseDown(e: React.MouseEvent) {
        if (e.target === e.currentTarget) onClose()
    }

    return (
        <div className="settings-modal" onMouseDown={handleBackdropMouseDown}>
            <div className="settings-modal__dialog" ref={dialogRef} tabIndex={-1}>
                {wizardOpen ? (
                    <AddAccountWizard
                        onComplete={account => {
                            onAddAccount(account)
                            setWizardOpen(false)
                        }}
                        onCancel={() => setWizardOpen(false)}
                    />
                ) : (
                    <>
                        <SettingsNav
                            activeSection={activeSection}
                            onSelectSection={setActiveSection}
                            onClose={onClose}
                        />
                        <div className="settings-modal__content">
                            {activeSection === 'accounts' && (
                                <AccountsPage
                                    accounts={accounts}
                                    onOpenWizard={() => setWizardOpen(true)}
                                    onUpdateAccount={onUpdateAccount}
                                    onDeleteAccount={onDeleteAccount}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

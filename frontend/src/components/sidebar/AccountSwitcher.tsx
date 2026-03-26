import { Check, ChevronDown, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Account } from '../../types/mail'
import './AccountSwitcher.css'

interface AccountSwitcherProps {
    accounts: Account[]
    activeAccount: Account
    onSelectAccount: (id: string) => void
}

export default function AccountSwitcher({ accounts, activeAccount, onSelectAccount }: AccountSwitcherProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    function handleSelect(id: string) {
        onSelectAccount(id)
        setOpen(false)
    }

    return (
        <div className="account-switcher" ref={ref}>
            <button
                className="account-switcher__trigger"
                onClick={() => setOpen(o => !o)}
            >
                <div
                    className="account-switcher__avatar"
                    style={{ backgroundColor: activeAccount.avatarColor }}
                >
                    {activeAccount.avatarInitials}
                </div>
                <div className="account-switcher__info">
                    <span className="account-switcher__name">{activeAccount.displayName}</span>
                    <span className="account-switcher__email">{activeAccount.email}</span>
                </div>
                <ChevronDown
                    size={14}
                    className={`account-switcher__chevron${open ? ' account-switcher__chevron--open' : ''}`}
                />
            </button>

            {open && (
                <div className="account-switcher__dropdown">
                    <div className="account-switcher__dropdown-label">Accounts</div>
                    {accounts.map(account => (
                        <button
                            key={account.id}
                            className="account-switcher__dropdown-item"
                            onClick={() => handleSelect(account.id)}
                        >
                            <div
                                className="account-switcher__avatar account-switcher__avatar--sm"
                                style={{ backgroundColor: account.avatarColor }}
                            >
                                {account.avatarInitials}
                            </div>
                            <div className="account-switcher__info">
                                <span className="account-switcher__name">{account.displayName}</span>
                                <span className="account-switcher__email">{account.email}</span>
                            </div>
                            {account.id === activeAccount.id && (
                                <Check size={13} className="account-switcher__check" />
                            )}
                        </button>
                    ))}
                    <div className="account-switcher__dropdown-divider" />
                    <button className="account-switcher__dropdown-item account-switcher__dropdown-item--add">
                        <Plus size={14} />
                        <span>Add account</span>
                    </button>
                </div>
            )}
        </div>
    )
}

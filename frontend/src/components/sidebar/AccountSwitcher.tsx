import { ChevronDown } from 'lucide-react'
import { Account } from '../../types/mail'
import './AccountSwitcher.css'

interface AccountSwitcherProps {
    account: Account
}

export default function AccountSwitcher({ account }: AccountSwitcherProps) {
    return (
        <div className="account-switcher">
            <div
                className="account-switcher__avatar"
                style={{ backgroundColor: account.avatarColor }}
            >
                {account.avatarInitials}
            </div>
            <div className="account-switcher__info">
                <span className="account-switcher__name">{account.displayName}</span>
                <span className="account-switcher__email">{account.email}</span>
            </div>
            <ChevronDown size={14} className="account-switcher__chevron" />
        </div>
    )
}

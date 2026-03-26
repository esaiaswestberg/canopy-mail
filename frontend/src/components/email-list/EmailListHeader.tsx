import { Search } from 'lucide-react'
import './EmailListHeader.css'

interface EmailListHeaderProps {
    folderLabel: string
    emailCount: number
}

export default function EmailListHeader({ folderLabel, emailCount }: EmailListHeaderProps) {
    return (
        <div className="email-list-header">
            <div className="email-list-header__top">
                <h2 className="email-list-header__title">{folderLabel}</h2>
                <span className="email-list-header__count">{emailCount}</span>
            </div>
            <div className="email-list-header__search">
                <Search size={13} className="email-list-header__search-icon" />
                <input
                    className="email-list-header__search-input"
                    type="text"
                    placeholder="Search messages…"
                />
            </div>
        </div>
    )
}

import { Users, X } from 'lucide-react'
import './SettingsNav.css'

export type SettingsSection = 'accounts'

interface SettingsNavProps {
    activeSection: SettingsSection
    onSelectSection: (section: SettingsSection) => void
    onClose: () => void
}

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'accounts', label: 'Accounts', icon: <Users size={15} /> },
]

export default function SettingsNav({ activeSection, onSelectSection, onClose }: SettingsNavProps) {
    return (
        <nav className="settings-nav">
            <div className="settings-nav__header">
                <span className="settings-nav__title">Settings</span>
                <button className="settings-nav__close-btn" onClick={onClose} aria-label="Close settings">
                    <X size={15} />
                </button>
            </div>
            <ul className="settings-nav__list">
                {NAV_ITEMS.map(item => (
                    <li key={item.id}>
                        <button
                            className={`settings-nav__item${activeSection === item.id ? ' settings-nav__item--active' : ''}`}
                            onClick={() => onSelectSection(item.id)}
                        >
                            <span className="settings-nav__item-icon">{item.icon}</span>
                            <span className="settings-nav__item-label">{item.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    )
}

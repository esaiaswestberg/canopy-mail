import { useState } from 'react'
import { Account, ServerConfig, ConnectionSecurity } from '../../../types/mail'
import { AVATAR_COLORS } from './avatarColors'
import './EditAccountForm.css'

interface EditAccountFormProps {
    account: Account
    onSave: (updated: Account) => void
    onCancel: () => void
}

const SECURITY_LABELS: Record<ConnectionSecurity, string> = {
    ssl:      'SSL / TLS',
    starttls: 'STARTTLS',
    none:     'None',
}

function ServerSection({ title, config, onChange }: {
    title: string
    config: ServerConfig
    onChange: (updated: ServerConfig) => void
}) {
    return (
        <div className="edit-account-form__server-section">
            <div className="edit-account-form__server-section-title">{title}</div>
            <div className="edit-account-form__server-row">
                <div className="edit-account-form__field edit-account-form__field--host">
                    <label className="edit-account-form__label">Host</label>
                    <input
                        className="edit-account-form__input"
                        type="text"
                        value={config.host}
                        onChange={e => onChange({ ...config, host: e.target.value })}
                        placeholder="mail.example.com"
                    />
                </div>
                <div className="edit-account-form__field edit-account-form__field--port">
                    <label className="edit-account-form__label">Port</label>
                    <input
                        className="edit-account-form__input"
                        type="number"
                        value={config.port}
                        onChange={e => onChange({ ...config, port: Number(e.target.value) })}
                        min={1}
                        max={65535}
                    />
                </div>
                <div className="edit-account-form__field edit-account-form__field--security">
                    <label className="edit-account-form__label">Security</label>
                    <select
                        className="edit-account-form__select"
                        value={config.security}
                        onChange={e => onChange({ ...config, security: e.target.value as ConnectionSecurity })}
                    >
                        {(Object.keys(SECURITY_LABELS) as ConnectionSecurity[]).map(k => (
                            <option key={k} value={k}>{SECURITY_LABELS[k]}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="edit-account-form__field">
                <label className="edit-account-form__label">Username</label>
                <input
                    className="edit-account-form__input"
                    type="text"
                    value={config.username}
                    onChange={e => onChange({ ...config, username: e.target.value })}
                    placeholder="user@example.com"
                />
            </div>
        </div>
    )
}

export default function EditAccountForm({ account, onSave, onCancel }: EditAccountFormProps) {
    const [displayName, setDisplayName] = useState(account.displayName)
    const [avatarColor, setAvatarColor] = useState(account.avatarColor)
    const [imap, setImap] = useState<ServerConfig>(account.imap)
    const [smtp, setSmtp] = useState<ServerConfig>(account.smtp)

    function handleSave() {
        if (!displayName.trim()) return
        const words = displayName.trim().split(/\s+/).filter(Boolean)
        const initials = words.length === 1
            ? words[0][0].toUpperCase()
            : (words[0][0] + words[1][0]).toUpperCase()
        onSave({ ...account, displayName: displayName.trim(), avatarInitials: initials, avatarColor, imap, smtp })
    }

    return (
        <div className="edit-account-form">
            <div className="edit-account-form__row">
                <div className="edit-account-form__field edit-account-form__field--name">
                    <label className="edit-account-form__label">Display name</label>
                    <input
                        className="edit-account-form__input"
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        autoFocus
                    />
                </div>
                <div className="edit-account-form__field">
                    <label className="edit-account-form__label">Color</label>
                    <div className="edit-account-form__color-picker">
                        {AVATAR_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                className={`edit-account-form__color-swatch${avatarColor === color ? ' edit-account-form__color-swatch--selected' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setAvatarColor(color)}
                                aria-label={color}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="edit-account-form__servers">
                <ServerSection title="IMAP" config={imap} onChange={setImap} />
                <ServerSection title="SMTP" config={smtp} onChange={setSmtp} />
            </div>

            <div className="edit-account-form__actions">
                <button className="edit-account-form__cancel-btn" onClick={onCancel}>Cancel</button>
                <button className="edit-account-form__save-btn" onClick={handleSave} disabled={!displayName.trim()}>Save</button>
            </div>
        </div>
    )
}

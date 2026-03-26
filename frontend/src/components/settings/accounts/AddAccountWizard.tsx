import React, { useState } from 'react'
import { AddAccount } from '../../../../wailsjs/go/main/App'
import { main as WailsModels } from '../../../../wailsjs/go/models'
import { Mail } from 'lucide-react'
import { Account, ConnectionSecurity, AuthMethod } from '../../../types/mail'
import { AVATAR_COLORS, AvatarColor } from './avatarColors'
import {
    detectProvider, deriveAvatarInitials, PROVIDER_CONFIGS, KnownProvider,
    IMAP_DEFAULT_PORTS, SMTP_DEFAULT_PORTS,
} from './providerDetection'
import './AddAccountWizard.css'

interface AddAccountWizardProps {
    onComplete: (account: Account) => void
    onCancel: () => void
}

type WizardStep = 1 | 2 | 3

const SECURITY_LABELS: Record<ConnectionSecurity, string> = {
    ssl:      'SSL / TLS',
    starttls: 'STARTTLS',
    none:     'None (unencrypted)',
}

const AUTH_LABELS: Record<AuthMethod, string> = {
    'password':     'Normal password',
    'app-password': 'App password',
    'oauth2':       'OAuth2',
}

// ── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step, labels }: { step: WizardStep; labels: string[] }) {
    return (
        <div className="wizard-steps">
            {labels.map((label, i) => {
                const s = (i + 1) as WizardStep
                return (
                    <React.Fragment key={s}>
                        {i > 0 && (
                            <div className={`wizard-steps__connector${step > s - 1 ? ' wizard-steps__connector--done' : ''}`} />
                        )}
                        <div className={`wizard-steps__item${step === s ? ' wizard-steps__item--active' : step > s ? ' wizard-steps__item--done' : ''}`}>
                            <div className="wizard-steps__dot">
                                {step > s ? '✓' : s}
                            </div>
                            <span className="wizard-steps__label">{label}</span>
                        </div>
                    </React.Fragment>
                )
            })}
        </div>
    )
}

// ── Server config section ───────────────────────────────────────────────────

interface ServerSectionProps {
    title: string
    defaultPorts: typeof IMAP_DEFAULT_PORTS
    host: string; onChangeHost: (v: string) => void
    port: number; onChangePort: (v: number) => void
    security: ConnectionSecurity; onChangeSecurity: (v: ConnectionSecurity) => void
    username: string; onChangeUsername: (v: string) => void
    authMethod: AuthMethod; onChangeAuthMethod: (v: AuthMethod) => void
}

function ServerSection({ title, defaultPorts, host, onChangeHost, port, onChangePort, security, onChangeSecurity, username, onChangeUsername, authMethod, onChangeAuthMethod }: ServerSectionProps) {
    function handleSecurityChange(v: ConnectionSecurity) {
        onChangeSecurity(v)
        onChangePort(defaultPorts[v])
    }

    return (
        <div className="wizard-server">
            <div className="wizard-server__title">{title}</div>

            <div className="wizard-field">
                <label className="wizard-label">Hostname</label>
                <input
                    className="wizard-input"
                    type="text"
                    value={host}
                    onChange={e => onChangeHost(e.target.value)}
                    placeholder="mail.example.com"
                />
            </div>

            <div className="wizard-server__row">
                <div className="wizard-field wizard-field--port">
                    <label className="wizard-label">Port</label>
                    <input
                        className="wizard-input"
                        type="number"
                        value={port}
                        onChange={e => onChangePort(Number(e.target.value))}
                        min={1}
                        max={65535}
                    />
                </div>
                <div className="wizard-field wizard-field--grow">
                    <label className="wizard-label">Connection security</label>
                    <select
                        className="wizard-select"
                        value={security}
                        onChange={e => handleSecurityChange(e.target.value as ConnectionSecurity)}
                    >
                        {(Object.keys(SECURITY_LABELS) as ConnectionSecurity[]).map(k => (
                            <option key={k} value={k}>{SECURITY_LABELS[k]}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="wizard-field">
                <label className="wizard-label">Username</label>
                <input
                    className="wizard-input"
                    type="text"
                    value={username}
                    onChange={e => onChangeUsername(e.target.value)}
                    placeholder="user@example.com"
                />
            </div>

            <div className="wizard-field">
                <label className="wizard-label">Authentication method</label>
                <select
                    className="wizard-select"
                    value={authMethod}
                    onChange={e => onChangeAuthMethod(e.target.value as AuthMethod)}
                >
                    {(Object.keys(AUTH_LABELS) as AuthMethod[]).map(k => (
                        <option key={k} value={k}>{AUTH_LABELS[k]}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}

// ── Main wizard ─────────────────────────────────────────────────────────────

export default function AddAccountWizard({ onComplete, onCancel }: AddAccountWizardProps) {
    const [step, setStep] = useState<WizardStep>(1)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Step 1
    const [email, setEmail] = useState('')
    const [detectedProvider, setDetectedProvider] = useState<KnownProvider | null>(null)

    // Step 2 — IMAP
    const [imapHost, setImapHost] = useState('')
    const [imapPort, setImapPort] = useState(993)
    const [imapSecurity, setImapSecurity] = useState<ConnectionSecurity>('ssl')
    const [imapUsername, setImapUsername] = useState('')
    const [imapAuthMethod, setImapAuthMethod] = useState<AuthMethod>('password')

    // Step 2 — SMTP
    const [smtpHost, setSmtpHost] = useState('')
    const [smtpPort, setSmtpPort] = useState(587)
    const [smtpSecurity, setSmtpSecurity] = useState<ConnectionSecurity>('starttls')
    const [smtpUsername, setSmtpUsername] = useState('')
    const [smtpAuthMethod, setSmtpAuthMethod] = useState<AuthMethod>('password')

    // Step 3
    const [displayName, setDisplayName] = useState('')
    const [password, setPassword] = useState('')
    const [avatarColor, setAvatarColor] = useState<AvatarColor>(AVATAR_COLORS[0])

    function goToStep2() {
        setError(null)
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email address.')
            return
        }
        const provider = detectProvider(email)
        setDetectedProvider(provider)
        if (provider) {
            const cfg = PROVIDER_CONFIGS[provider]
            setImapHost(cfg.imap.host)
            setImapPort(cfg.imap.port)
            setImapSecurity(cfg.imap.security ?? 'ssl')
            setImapUsername(email.trim())
            setImapAuthMethod(cfg.imap.authMethod ?? 'password')
            setSmtpHost(cfg.smtp.host)
            setSmtpPort(cfg.smtp.port)
            setSmtpSecurity(cfg.smtp.security ?? 'starttls')
            setSmtpUsername(email.trim())
            setSmtpAuthMethod(cfg.smtp.authMethod ?? 'password')
        } else {
            setImapUsername(email.trim())
            setSmtpUsername(email.trim())
        }
        setStep(2)
    }

    function goToStep3() {
        setError(null)
        if (!imapHost.trim() || !smtpHost.trim()) {
            setError('Please fill in both IMAP and SMTP hostnames.')
            return
        }
        setStep(3)
    }

    async function handleSubmit() {
        setError(null)
        if (!displayName.trim()) {
            setError('Please enter a display name.')
            return
        }
        if (!password) {
            setError('Please enter your password.')
            return
        }
        setLoading(true)
        try {
            const account = await AddAccount(WailsModels.AddAccountRequest.createFrom({
                email: email.trim(),
                displayName: displayName.trim(),
                avatarColor,
                password,
                imap: { host: imapHost, port: imapPort, security: imapSecurity, username: imapUsername, authMethod: imapAuthMethod },
                smtp: { host: smtpHost, port: smtpPort, security: smtpSecurity, username: smtpUsername, authMethod: smtpAuthMethod },
            }))
            onComplete(account as Account)
        } catch (err: unknown) {
            const msg = String(err)
            if (msg.includes('authentication failed')) {
                setError('Wrong username or password. Check your credentials and try again.')
            } else if (msg.includes('connection failed')) {
                setError('Could not connect to the mail server. Check the hostname and port.')
            } else if (msg.includes('already exists')) {
                setError('An account with this email address is already configured.')
            } else {
                setError(`Failed to add account: ${msg}`)
            }
        } finally {
            setLoading(false)
        }
    }

    const stepLabels = ['Email address', 'Server settings', 'Credentials']

    const stepTitles: Record<WizardStep, string> = {
        1: 'Add an account',
        2: 'Configure your mail servers',
        3: 'Almost done',
    }

    const stepSubtitles: Record<WizardStep, string> = {
        1: 'Enter the email address you want to add.',
        2: 'Review or adjust the incoming and outgoing mail server settings.',
        3: 'Set your password, name, and how your account will appear.',
    }

    const avatarInitialsPreview = displayName.trim() ? deriveAvatarInitials(displayName) : '?'

    return (
        <div className="add-account-wizard">

            {/* ── Pinned header ── */}
            <div className="add-account-wizard__header">
                <div className="add-account-wizard__header-top">
                    <StepIndicator step={step} labels={stepLabels} />
                </div>
                <div className="add-account-wizard__header-titles">
                    <h2 className="add-account-wizard__title">{stepTitles[step]}</h2>
                    <p className="add-account-wizard__subtitle">{stepSubtitles[step]}</p>
                    {step === 2 && detectedProvider && (
                        <div className="add-account-wizard__provider-badge">
                            <Mail size={12} />
                            {PROVIDER_CONFIGS[detectedProvider].name} detected — settings pre-filled
                        </div>
                    )}
                </div>
            </div>

            {/* ── Scrollable content ── */}
            <div className="add-account-wizard__body">

                {step === 1 && (
                    <div className="add-account-wizard__step-1">
                        <div className="wizard-field">
                            <label className="wizard-label">Email address</label>
                            <input
                                className="wizard-input wizard-input--lg"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && goToStep2()}
                                placeholder="you@example.com"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="add-account-wizard__step-2">
                        <ServerSection
                            title="IMAP — Incoming mail"
                            defaultPorts={IMAP_DEFAULT_PORTS}
                            host={imapHost} onChangeHost={setImapHost}
                            port={imapPort} onChangePort={setImapPort}
                            security={imapSecurity} onChangeSecurity={setImapSecurity}
                            username={imapUsername} onChangeUsername={setImapUsername}
                            authMethod={imapAuthMethod} onChangeAuthMethod={setImapAuthMethod}
                        />
                        <div className="add-account-wizard__server-divider" />
                        <ServerSection
                            title="SMTP — Outgoing mail"
                            defaultPorts={SMTP_DEFAULT_PORTS}
                            host={smtpHost} onChangeHost={setSmtpHost}
                            port={smtpPort} onChangePort={setSmtpPort}
                            security={smtpSecurity} onChangeSecurity={setSmtpSecurity}
                            username={smtpUsername} onChangeUsername={setSmtpUsername}
                            authMethod={smtpAuthMethod} onChangeAuthMethod={setSmtpAuthMethod}
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="add-account-wizard__step-3">
                        <div className="add-account-wizard__step-3-left">
                            <div className="wizard-field">
                                <label className="wizard-label">Display name</label>
                                <input
                                    className="wizard-input"
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Your name"
                                    autoFocus
                                />
                            </div>
                            <div className="wizard-field">
                                <label className="wizard-label">Password</label>
                                <input
                                    className="wizard-input"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="wizard-field">
                                <label className="wizard-label">Avatar color</label>
                                <div className="add-account-wizard__color-picker">
                                    {AVATAR_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`add-account-wizard__color-swatch${avatarColor === color ? ' add-account-wizard__color-swatch--selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setAvatarColor(color)}
                                            aria-label={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="add-account-wizard__step-3-right">
                            <div className="add-account-wizard__avatar-preview" style={{ backgroundColor: avatarColor }}>
                                {avatarInitialsPreview}
                            </div>
                            <div className="add-account-wizard__avatar-preview-name">
                                {displayName || 'Your name'}
                            </div>
                            <div className="add-account-wizard__avatar-preview-email">
                                {email}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Pinned footer ── */}
            <div className="add-account-wizard__footer">
                {error && <div className="add-account-wizard__error">{error}</div>}
                <div className="add-account-wizard__actions">
                    <button 
                        className="add-account-wizard__cancel-btn" 
                        onClick={() => { setError(null); if (step > 1) setStep(s => (s - 1) as WizardStep); else onCancel() }}
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    {step < 3
                        ? <button className="add-account-wizard__next-btn" onClick={step === 1 ? goToStep2 : goToStep3}>Continue</button>
                        : <button className="add-account-wizard__submit-btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Verifying…' : 'Add Account'}
                          </button>
                    }
                </div>
            </div>
        </div>
    )
}

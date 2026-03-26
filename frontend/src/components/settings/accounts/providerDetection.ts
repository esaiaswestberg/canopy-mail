import { ServerConfig } from '../../../types/mail'

export type KnownProvider = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'fastmail'

export interface ProviderConfig {
    name: string
    imap: ServerConfig
    smtp: ServerConfig
}

export const PROVIDER_CONFIGS: Record<KnownProvider, ProviderConfig> = {
    gmail: {
        name: 'Gmail',
        imap: { host: 'imap.gmail.com', port: 993, tls: true, security: 'ssl', authMethod: 'app-password' },
        smtp: { host: 'smtp.gmail.com', port: 587, tls: true, security: 'starttls', authMethod: 'app-password' },
    },
    outlook: {
        name: 'Outlook',
        imap: { host: 'outlook.office365.com', port: 993, tls: true, security: 'ssl', authMethod: 'password' },
        smtp: { host: 'smtp.office365.com', port: 587, tls: true, security: 'starttls', authMethod: 'password' },
    },
    yahoo: {
        name: 'Yahoo Mail',
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true, security: 'ssl', authMethod: 'app-password' },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, tls: true, security: 'starttls', authMethod: 'app-password' },
    },
    icloud: {
        name: 'iCloud Mail',
        imap: { host: 'imap.mail.me.com', port: 993, tls: true, security: 'ssl', authMethod: 'app-password' },
        smtp: { host: 'smtp.mail.me.com', port: 587, tls: true, security: 'starttls', authMethod: 'app-password' },
    },
    fastmail: {
        name: 'Fastmail',
        imap: { host: 'imap.fastmail.com', port: 993, tls: true, security: 'ssl', authMethod: 'password' },
        smtp: { host: 'smtp.fastmail.com', port: 587, tls: true, security: 'starttls', authMethod: 'password' },
    },
}

const DOMAIN_MAP: Record<string, KnownProvider> = {
    'gmail.com': 'gmail',
    'googlemail.com': 'gmail',
    'outlook.com': 'outlook',
    'hotmail.com': 'outlook',
    'live.com': 'outlook',
    'msn.com': 'outlook',
    'yahoo.com': 'yahoo',
    'yahoo.co.uk': 'yahoo',
    'icloud.com': 'icloud',
    'me.com': 'icloud',
    'mac.com': 'icloud',
    'fastmail.com': 'fastmail',
    'fastmail.fm': 'fastmail',
}

export function detectProvider(email: string): KnownProvider | null {
    const domain = email.split('@')[1]?.toLowerCase()
    return domain ? (DOMAIN_MAP[domain] ?? null) : null
}

export function deriveAvatarInitials(displayName: string): string {
    const words = displayName.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return '?'
    if (words.length === 1) return words[0][0].toUpperCase()
    return (words[0][0] + words[1][0]).toUpperCase()
}

export const IMAP_DEFAULT_PORTS: Record<string, number> = { ssl: 993, starttls: 143, none: 143 }
export const SMTP_DEFAULT_PORTS: Record<string, number> = { ssl: 465, starttls: 587, none: 25 }

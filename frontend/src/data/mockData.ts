import { Account, EmailDetail, EmailListItem, Folder } from '../types/mail'

export const mockAccounts: Account[] = [
    {
        id: 'acc-1',
        email: 'alex@personal.dev',
        displayName: 'Alex Morgan',
        avatarInitials: 'AM',
        avatarColor: '#6b7bff',
        isActive: true,
    },
    {
        id: 'acc-2',
        email: 'alex@work.io',
        displayName: 'Alex Morgan (Work)',
        avatarInitials: 'AW',
        avatarColor: '#4caf8f',
        isActive: false,
    },
]

export const mockFolders: Folder[] = [
    { id: 'inbox',   label: 'Inbox',   icon: 'inbox',   unreadCount: 5,  isSystem: true },
    { id: 'sent',    label: 'Sent',    icon: 'sent',                     isSystem: true },
    { id: 'drafts',  label: 'Drafts',  icon: 'drafts',  unreadCount: 2,  isSystem: true },
    { id: 'archive', label: 'Archive', icon: 'archive',                  isSystem: true },
    { id: 'spam',    label: 'Spam',    icon: 'spam',    unreadCount: 12, isSystem: true },
    { id: 'trash',   label: 'Trash',   icon: 'trash',                    isSystem: true },
]

export const mockEmails: EmailListItem[] = [
    {
        id: 'email-1',
        sender: { name: 'Sarah Chen', email: 'sarah.chen@designco.io' },
        subject: 'Updated mockups for the onboarding flow',
        preview: 'Hey! I\'ve finished the revised screens. The main change is the welcome step now includes a short product tour before asking for permissions...',
        timestamp: '2026-03-26T10:42:00Z',
        isRead: false,
        isStarred: true,
        hasAttachment: true,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
    {
        id: 'email-2',
        sender: { name: 'GitHub', email: 'noreply@github.com' },
        subject: '[canopy-mail] PR #47: Add IMAP connection pooling',
        preview: 'Jordan Lee opened a pull request. This adds a connection pool to the IMAP service layer, reducing latency on folder switches by about 40%...',
        timestamp: '2026-03-26T09:15:00Z',
        isRead: false,
        isStarred: false,
        hasAttachment: false,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
    {
        id: 'email-3',
        sender: { name: 'Vercel', email: 'no-reply@vercel.com' },
        subject: 'Deployment successful: canopy-web → production',
        preview: 'Your deployment to production is live. 47 files changed, bundle size: 142 kB gzipped. View deployment →',
        timestamp: '2026-03-26T08:03:00Z',
        isRead: true,
        isStarred: false,
        hasAttachment: false,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
    {
        id: 'email-4',
        sender: { name: 'Marcus Webb', email: 'm.webb@example.com' },
        subject: 'Re: Q2 roadmap sync',
        preview: 'Sounds good to me. I\'ll block off Thursday afternoon. One thing I want to make sure we cover is the performance regression we saw in the last...',
        timestamp: '2026-03-25T17:30:00Z',
        isRead: false,
        isStarred: false,
        hasAttachment: false,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
    {
        id: 'email-5',
        sender: { name: 'Stripe', email: 'no-reply@stripe.com' },
        subject: 'Your monthly invoice is ready',
        preview: 'Invoice #INV-20260301 for $49.00 is available in your dashboard. Payment will be collected automatically on April 1st...',
        timestamp: '2026-03-25T12:00:00Z',
        isRead: true,
        isStarred: false,
        hasAttachment: true,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
    {
        id: 'email-6',
        sender: { name: 'Priya Nair', email: 'priya@opensourcefund.org' },
        subject: 'Sponsorship opportunity — Open Source Fund',
        preview: 'Hi Alex, we\'ve been following Canopy Mail and love the direction you\'re taking it. We\'d love to discuss a potential sponsorship through our...',
        timestamp: '2026-03-24T14:22:00Z',
        isRead: false,
        isStarred: true,
        hasAttachment: false,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
    {
        id: 'email-7',
        sender: { name: 'Linear', email: 'notifications@linear.app' },
        subject: 'Issue assigned: CAN-112 — Search indexing performance',
        preview: 'Jordan Lee assigned you to CAN-112: Search indexing is taking too long on large mailboxes (>50k emails). Needs investigation into the SQLite...',
        timestamp: '2026-03-24T11:05:00Z',
        isRead: true,
        isStarred: false,
        hasAttachment: false,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
    {
        id: 'email-8',
        sender: { name: 'Tom Richards', email: 'tom.r@oldcorp.net' },
        subject: 'Coffee chat this week?',
        preview: 'Hey Alex, been a while! I\'m in your city Tuesday through Thursday — would love to catch up over coffee if you have an hour free...',
        timestamp: '2026-03-23T09:48:00Z',
        isRead: true,
        isStarred: false,
        hasAttachment: false,
        folderId: 'inbox',
        accountId: 'acc-1',
    },
]

export const mockEmailDetail: EmailDetail = {
    ...mockEmails[0],
    recipients: [{ name: 'Alex Morgan', email: 'alex@personal.dev' }],
    cc: [],
    bodyHtml: `
<p>Hey Alex,</p>

<p>I've finished the revised screens for the onboarding flow. The main change is that the welcome step now includes a short product tour <em>before</em> we ask for notification and account permissions — early user testing showed a 23% improvement in permission grant rate when users understand what they're getting first.</p>

<p>Key changes in this revision:</p>
<ul>
  <li><strong>Welcome screen</strong> — New illustration, shorter headline, added "takes 2 minutes" reassurance copy</li>
  <li><strong>Account setup</strong> — Split into two steps (provider select → credentials) to reduce cognitive load</li>
  <li><strong>Permissions step</strong> — Added brief explainer for each permission with a "why we need this" tooltip</li>
  <li><strong>Finish screen</strong> — New animation, direct CTA to open inbox instead of "explore settings"</li>
</ul>

<p>The Figma file is in the shared workspace under <code>Canopy / Onboarding v3</code>. I've also attached a PDF export if you prefer to review offline.</p>

<p>Let me know what you think — I'm free for a quick call Thursday afternoon if you want to walk through it together.</p>

<p>Best,<br>Sarah</p>
    `.trim(),
}

export function formatTimestamp(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

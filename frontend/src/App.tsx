import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import EmailList from './components/email-list/EmailList'
import EmailReader from './components/email-reader/EmailReader'
import EmailComposer from './components/email-composer/EmailComposer'
import ContextMenu from './components/context-menu/ContextMenu'
import SettingsModal from './components/settings/SettingsModal'
import { Account, ComposerConfig, EmailDetail, EmailListItem, EmailPage, Folder, SyncStatus } from './types/mail'
import { ContextMenuContext, ContextMenuState, ContextMenuItem } from './context/ContextMenuContext'
import { GetAccounts, UpdateAccount, DeleteAccount, GetFolders, GetEmails, GetEmailDetail, FetchEmailBody, MarkEmailRead } from '../wailsjs/go/main/App'
import { main as WailsModels } from '../wailsjs/go/models'
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime'

function App() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [selectedFolderId, setSelectedFolderId] = useState('inbox')
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)

    const [folders, setFolders] = useState<Folder[]>([])
    const [emails, setEmails] = useState<(EmailListItem | null)[]>([])
    const emailsRef = useRef<(EmailListItem | null)[]>([])
    const fetchedPagesRef = useRef<Set<number>>(new Set())
    const pageCursorsRef = useRef<Map<number, number>>(new Map())
    const [selectedEmailDetail, setSelectedEmailDetail] = useState<EmailDetail | null>(null)

    const [loadingFolders, setLoadingFolders] = useState(false)
    const [loadingEmails, setLoadingEmails] = useState(false)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [loadingBody, setLoadingBody] = useState(false)

    const PAGE_SIZE = 50

    const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({})

    const [menuState, setMenuState] = useState<ContextMenuState | null>(null)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [composerConfig, setComposerConfig] = useState<ComposerConfig | null>(null)

    // Load accounts from the backend on startup.
    useEffect(() => {
        GetAccounts().then(accs => {
            const list = accs ?? []
            setAccounts(list as Account[])
            if (list.length > 0 && selectedAccountId === null) {
                setSelectedAccountId(list[0].id)
            }
        }).catch(console.error)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onSyncStatus = (status: SyncStatus) => {
            setSyncStatuses(prev => ({
                ...prev,
                [status.accountId]: status
            }))
        }

        const onCacheUpdated = (data: { type: string, accountId: string, folderId?: string }) => {
            if (data.type === 'folders' && selectedAccountId === data.accountId) {
                GetFolders(data.accountId).then(res => {
                    setFolders((res ?? []) as Folder[])
                }).catch(console.error)
            } else if (data.type === 'emails' && selectedAccountId === data.accountId && selectedFolderId === data.folderId) {
                // New emails shift all indices — reinitialize the sparse array from page 1.
                // Pages 2+ will be re-fetched on scroll.
                GetEmails(data.accountId, data.folderId, 1, PAGE_SIZE, 0).then(res => {
                    const page = res as EmailPage
                    const sparse = new Array<EmailListItem | null>(page.total).fill(null)
                    page.emails.forEach((e, i) => { sparse[i] = e })
                    emailsRef.current = sparse
                    setEmails(sparse)
                    fetchedPagesRef.current = new Set([1])
                    pageCursorsRef.current = new Map([[1, page.nextCursor]])
                }).catch(console.error)
            }
        }

        EventsOn('sync:status', onSyncStatus)
        EventsOn('cache:updated', onCacheUpdated)

        return () => {
            EventsOff('sync:status', 'cache:updated')
        }
    }, [selectedAccountId, selectedFolderId])

    const activeAccount = accounts.find(a => a.id === selectedAccountId) ?? accounts[0] ?? null

    useEffect(() => {
        if (!activeAccount) {
            setFolders([])
            return
        }
        setLoadingFolders(true)
        GetFolders(activeAccount.id).then(res => {
            const list = (res ?? []) as Folder[]
            setFolders(list)
            if (list.length > 0) {
                const hasSelected = list.some(f => f.id === selectedFolderId)
                if (!hasSelected) {
                    const inbox = list.find(f => f.id.toLowerCase() === 'inbox') || list[0]
                    setSelectedFolderId(inbox.id)
                }
            }
        }).catch(console.error).finally(() => setLoadingFolders(false))
    }, [activeAccount?.id])

    useEffect(() => {
        if (!activeAccount || !selectedFolderId) {
            setEmails([]); emailsRef.current = []
            fetchedPagesRef.current = new Set()
            pageCursorsRef.current = new Map()
            return
        }
        setLoadingEmails(true)
        setEmails([]); emailsRef.current = []
        fetchedPagesRef.current = new Set()
        pageCursorsRef.current = new Map()
        GetEmails(activeAccount.id, selectedFolderId, 1, PAGE_SIZE, 0).then(res => {
            const page = res as EmailPage
            const sparse = new Array<EmailListItem | null>(page.total).fill(null)
            page.emails.forEach((e, i) => { sparse[i] = e })
            emailsRef.current = sparse
            setEmails(sparse)
            fetchedPagesRef.current = new Set([1])
            pageCursorsRef.current = new Map([[1, page.nextCursor]])
        }).catch(console.error).finally(() => setLoadingEmails(false))
    }, [activeAccount?.id, selectedFolderId])

    function handleMarkEmailRead(email: EmailListItem, isRead: boolean) {
        // Optimistic update
        setEmails(prev => {
            const next = prev.map(e => e?.id === email.id ? { ...e, isRead } : e)
            emailsRef.current = next
            return next
        })
        setSelectedEmailDetail(prev => prev?.id === email.id ? { ...prev, isRead } : prev)

        MarkEmailRead(email.accountId, email.folderId, email.uid, isRead).catch(err => {
            console.error('MarkEmailRead failed:', err)
            // Revert optimistic update on failure
            setEmails(prev => {
                const next = prev.map(e => e?.id === email.id ? { ...e, isRead: !isRead } : e)
                emailsRef.current = next
                return next
            })
            setSelectedEmailDetail(prev => prev?.id === email.id ? { ...prev, isRead: !isRead } : prev)
        })
    }

    useEffect(() => {
        if (!activeAccount || !selectedFolderId || !selectedEmailId) {
            setSelectedEmailDetail(null)
            setLoadingBody(false)
            return
        }
        const emailListItem = emailsRef.current.find(e => e?.id === selectedEmailId)
        if (!emailListItem) return

        const accountId = activeAccount.id
        const folderId = selectedFolderId
        const uid = emailListItem.uid || parseInt(emailListItem.id)

        if (!emailListItem.isRead) {
            handleMarkEmailRead(emailListItem, true)
        }

        let cancelled = false

        setLoadingDetail(true)
        setLoadingBody(false)
        GetEmailDetail(accountId, folderId, uid).then(res => {
            if (cancelled) return
            const detail = res as EmailDetail
            setSelectedEmailDetail(detail)
            if (!detail.bodyHtml || detail.bodyHtml.includes('cid:')) {
                setLoadingBody(true)
                FetchEmailBody(accountId, folderId, uid).then(freshDetail => {
                    if (!cancelled) {
                        setSelectedEmailDetail(prev => prev ? {
                            ...prev,
                            bodyHtml: freshDetail.bodyHtml,
                            attachments: freshDetail.attachments,
                        } : prev)
                    }
                }).catch(console.error).finally(() => {
                    if (!cancelled) {
                        setLoadingBody(false)
                    }
                })
            }
        }).catch(console.error).finally(() => {
            if (!cancelled) setLoadingDetail(false)
        })

        return () => { cancelled = true }
    }, [activeAccount?.id, selectedFolderId, selectedEmailId])

    const loadMoreEmails = useCallback((startIndex: number, stopIndex: number) => {
        if (!activeAccount || !selectedFolderId) return
        const accountId = activeAccount.id
        const folderId = selectedFolderId

        const startPage = Math.floor(startIndex / PAGE_SIZE) + 1
        const endPage = Math.floor(stopIndex / PAGE_SIZE) + 1

        for (let p = startPage; p <= endPage; p++) {
            if (fetchedPagesRef.current.has(p)) continue
            fetchedPagesRef.current.add(p)
            const offset = (p - 1) * PAGE_SIZE
            // Use cursor from the previous page when available (O(1) for any depth).
            // Fall back to offset when scrolling to a page whose predecessor isn't loaded yet.
            const cursor = pageCursorsRef.current.get(p - 1) ?? 0
            GetEmails(accountId, folderId, p, PAGE_SIZE, cursor).then(res => {
                const page = res as EmailPage
                pageCursorsRef.current.set(p, page.nextCursor)
                setEmails(prev => {
                    const next = [...prev]
                    page.emails.forEach((e, i) => { next[offset + i] = e })
                    emailsRef.current = next
                    return next
                })
            }).catch(() => {
                fetchedPagesRef.current.delete(p)
            })
        }
    }, [activeAccount?.id, selectedFolderId]) // eslint-disable-line react-hooks/exhaustive-deps

    const activeFolder = folders.find(f => f.id === selectedFolderId) || { id: selectedFolderId, label: selectedFolderId, icon: 'inbox', isSystem: false }

    function handleSelectFolder(id: string) {
        setSelectedFolderId(id)
        setSelectedEmailId(null)
    }

    function handleSelectAccount(id: string) {
        setSelectedAccountId(id)
        setSelectedEmailId(null)
    }

    function buildQuote(email: EmailDetail): string {
        const date = new Date(email.timestamp).toLocaleString()
        return `<br><br><div style="border-left:2px solid #6b7bff;padding-left:12px;margin-top:8px;color:#8b8fa8"><div style="font-size:12px;margin-bottom:6px">On ${date}, ${email.sender.name} &lt;${email.sender.email}&gt; wrote:</div>${email.bodyHtml ?? ''}</div>`
    }

    function handleReply(email: EmailDetail) {
        const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
        setComposerConfig({
            mode: 'reply',
            initialTo: email.sender.email,
            initialSubject: subject,
            initialBody: buildQuote(email),
            initialAttachments: email.attachments ?? [],
        })
    }

    function handleForward(email: EmailDetail) {
        const subject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`
        setComposerConfig({
            mode: 'forward',
            initialTo: '',
            initialSubject: subject,
            initialBody: buildQuote(email),
            initialAttachments: email.attachments ?? [],
        })
    }

    function handleMailto(to: string, subject?: string, body?: string) {
        setComposerConfig({
            mode: 'compose',
            initialTo: to,
            initialSubject: subject,
            initialBody: body,
        })
    }

    // Called by the wizard after it has already persisted the account.
    function handleAddAccount(account: Account) {
        setAccounts(prev => [...prev, account])
        if (accounts.length === 0) {
            setSelectedAccountId(account.id)
        }
    }

    async function handleUpdateAccount(updated: Account) {
        try {
            const req = WailsModels.UpdateAccountRequest.createFrom({
                id: updated.id,
                displayName: updated.displayName,
                avatarColor: updated.avatarColor,
                imap: updated.imap,
                smtp: updated.smtp,
            })
            const result = await UpdateAccount(req)
            setAccounts(prev => prev.map(a => a.id === result.id ? result as Account : a))
        } catch (err) {
            console.error('UpdateAccount failed:', err)
        }
    }

    async function handleDeleteAccount(id: string) {
        try {
            await DeleteAccount(id)
            setAccounts(prev => {
                const next = prev.filter(a => a.id !== id)
                if (selectedAccountId === id && next.length > 0) {
                    setSelectedAccountId(next[0].id)
                } else if (next.length === 0) {
                    setSelectedAccountId(null)
                }
                return next
            })
        } catch (err) {
            console.error('DeleteAccount failed:', err)
        }
    }

    function openMenu(x: number, y: number, items: ContextMenuItem[]) {
        setMenuState({ x, y, items })
    }

    function closeMenu() {
        setMenuState(null)
    }

    return (
        <ContextMenuContext.Provider value={{ openMenu, closeMenu }}>
            <div id="App">
                {activeAccount ? (
                    <>
                        <Sidebar
                            accounts={accounts}
                            activeAccount={activeAccount}
                            onSelectAccount={handleSelectAccount}
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={handleSelectFolder}
                            onOpenSettings={() => setSettingsOpen(true)}
                            onCompose={() => setComposerConfig({ mode: 'compose' })}
                            syncStatus={syncStatuses[activeAccount.id]}
                        />
                        <EmailList
                            folder={activeFolder}
                            folders={folders}
                            emails={emails}
                            selectedEmailId={selectedEmailId}
                            onSelectEmail={setSelectedEmailId}
                            onLoadMore={loadMoreEmails}
                            onMarkEmailRead={handleMarkEmailRead}
                        />
                        {composerConfig !== null
                            ? <EmailComposer onClose={() => setComposerConfig(null)} account={activeAccount} config={composerConfig} />
                            : <EmailReader email={selectedEmailDetail} loadingBody={loadingBody} onReply={handleReply} onForward={handleForward} onMailto={handleMailto} />
                        }
                    </>
                ) : (
                    <div className="app-empty">
                        <button
                            className="app-empty__btn"
                            onClick={() => setSettingsOpen(true)}
                        >
                            Add your first account
                        </button>
                    </div>
                )}
            </div>
            {menuState && createPortal(
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    items={menuState.items}
                    onClose={closeMenu}
                />,
                document.body
            )}
            {settingsOpen && createPortal(
                <SettingsModal
                    accounts={accounts}
                    onClose={() => setSettingsOpen(false)}
                    onAddAccount={handleAddAccount}
                    onUpdateAccount={handleUpdateAccount}
                    onDeleteAccount={handleDeleteAccount}
                />,
                document.body
            )}
        </ContextMenuContext.Provider>
    )
}

export default App

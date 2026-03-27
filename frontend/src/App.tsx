import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import EmailList from './components/email-list/EmailList'
import EmailReader from './components/email-reader/EmailReader'
import ContextMenu from './components/context-menu/ContextMenu'
import SettingsModal from './components/settings/SettingsModal'
import { Account, EmailDetail, EmailListItem, Folder, SyncStatus } from './types/mail'
import { ContextMenuContext, ContextMenuState, ContextMenuItem } from './context/ContextMenuContext'
import { GetAccounts, UpdateAccount, DeleteAccount, GetFolders, GetEmails, GetEmailDetail, FetchEmailBody } from '../wailsjs/go/main/App'
import { main as WailsModels } from '../wailsjs/go/models'
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime'

function App() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [selectedFolderId, setSelectedFolderId] = useState('inbox')
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
    
    const [folders, setFolders] = useState<Folder[]>([])
    const [emails, setEmails] = useState<EmailListItem[]>([])
    const emailsRef = useRef<EmailListItem[]>([])
    const [selectedEmailDetail, setSelectedEmailDetail] = useState<EmailDetail | null>(null)

    const [loadingFolders, setLoadingFolders] = useState(false)
    const [loadingEmails, setLoadingEmails] = useState(false)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [loadingBody, setLoadingBody] = useState(false)

    const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({})

    const [menuState, setMenuState] = useState<ContextMenuState | null>(null)
    const [settingsOpen, setSettingsOpen] = useState(false)

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
                // Refresh folders
                GetFolders(data.accountId).then(res => {
                    setFolders((res ?? []) as Folder[])
                }).catch(console.error)
            } else if (data.type === 'emails' && selectedAccountId === data.accountId && selectedFolderId === data.folderId) {
                // Refresh emails
                GetEmails(data.accountId, data.folderId).then(res => {
                    const list = (res ?? []) as EmailListItem[]
                    emailsRef.current = list
                    setEmails(list)
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
            setEmails([])
            return
        }
        setLoadingEmails(true)
        GetEmails(activeAccount.id, selectedFolderId).then(res => {
            const list = (res ?? []) as EmailListItem[]
            emailsRef.current = list
            setEmails(list)
        }).catch(console.error).finally(() => setLoadingEmails(false))
    }, [activeAccount?.id, selectedFolderId])

    useEffect(() => {
        if (!activeAccount || !selectedFolderId || !selectedEmailId) {
            setSelectedEmailDetail(null)
            setLoadingBody(false)
            return
        }
        const emailListItem = emailsRef.current.find(e => e.id === selectedEmailId)
        if (!emailListItem) return

        const accountId = activeAccount.id
        const folderId = selectedFolderId
        const uid = emailListItem.uid || parseInt(emailListItem.id)

        let cancelled = false

        setLoadingDetail(true)
        setLoadingBody(false)
        GetEmailDetail(accountId, folderId, uid).then(res => {
            if (cancelled) return
            const detail = res as EmailDetail
            setSelectedEmailDetail(detail)
            if (!detail.bodyHtml) {
                setLoadingBody(true)
                FetchEmailBody(accountId, folderId, uid).then(bodyHtml => {
                    if (!cancelled) {
                        setSelectedEmailDetail(prev => prev ? { ...prev, bodyHtml } : prev)
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

    const activeFolder = folders.find(f => f.id === selectedFolderId) || { id: selectedFolderId, label: selectedFolderId, icon: 'inbox', isSystem: false }

    function handleSelectFolder(id: string) {
        setSelectedFolderId(id)
        setSelectedEmailId(null)
    }

    function handleSelectAccount(id: string) {
        setSelectedAccountId(id)
        setSelectedEmailId(null)
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
                            syncStatus={syncStatuses[activeAccount.id]}
                        />
                        <EmailList
                            folder={activeFolder}
                            emails={emails}
                            selectedEmailId={selectedEmailId}
                            onSelectEmail={setSelectedEmailId}
                        />
                        <EmailReader email={selectedEmailDetail} loadingBody={loadingBody} />
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

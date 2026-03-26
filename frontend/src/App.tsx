import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import EmailList from './components/email-list/EmailList'
import EmailReader from './components/email-reader/EmailReader'
import ContextMenu from './components/context-menu/ContextMenu'
import SettingsModal from './components/settings/SettingsModal'
import { Account, EmailDetail, EmailListItem, Folder } from './types/mail'
import { ContextMenuContext, ContextMenuState, ContextMenuItem } from './context/ContextMenuContext'
import { GetAccounts, UpdateAccount, DeleteAccount, GetFolders, GetEmails, GetEmailDetail } from '../wailsjs/go/main/App'
import { main as WailsModels } from '../wailsjs/go/models'

function App() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [selectedFolderId, setSelectedFolderId] = useState('inbox')
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
    
    const [folders, setFolders] = useState<Folder[]>([])
    const [emails, setEmails] = useState<EmailListItem[]>([])
    const [selectedEmailDetail, setSelectedEmailDetail] = useState<EmailDetail | null>(null)

    const [loadingFolders, setLoadingFolders] = useState(false)
    const [loadingEmails, setLoadingEmails] = useState(false)
    const [loadingDetail, setLoadingDetail] = useState(false)

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
            setEmails((res ?? []) as EmailListItem[])
        }).catch(console.error).finally(() => setLoadingEmails(false))
    }, [activeAccount?.id, selectedFolderId])

    useEffect(() => {
        if (!activeAccount || !selectedFolderId || !selectedEmailId) {
            setSelectedEmailDetail(null)
            return
        }
        const emailListItem = emails.find(e => e.id === selectedEmailId)
        if (!emailListItem) return

        setLoadingDetail(true)
        GetEmailDetail(activeAccount.id, selectedFolderId, emailListItem.uid || parseInt(emailListItem.id)).then(res => {
            setSelectedEmailDetail(res as EmailDetail)
        }).catch(console.error).finally(() => setLoadingDetail(false))
    }, [activeAccount?.id, selectedFolderId, selectedEmailId, emails])

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
                        />
                        <EmailList
                            folder={activeFolder}
                            emails={emails}
                            selectedEmailId={selectedEmailId}
                            onSelectEmail={setSelectedEmailId}
                        />
                        <EmailReader email={selectedEmailDetail} />
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

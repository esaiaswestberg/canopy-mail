import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import EmailList from './components/email-list/EmailList'
import EmailReader from './components/email-reader/EmailReader'
import ContextMenu from './components/context-menu/ContextMenu'
import SettingsModal from './components/settings/SettingsModal'
import { mockEmails, mockEmailDetail, mockFolders } from './data/mockData'
import { Account, EmailDetail } from './types/mail'
import { ContextMenuContext, ContextMenuState, ContextMenuItem } from './context/ContextMenuContext'
import { GetAccounts, UpdateAccount, DeleteAccount } from '../wailsjs/go/main/App'
import { main as WailsModels } from '../wailsjs/go/models'

function App() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [selectedFolderId, setSelectedFolderId] = useState('inbox')
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(mockEmails[0].id)
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

    const filteredEmails = useMemo(
        () => mockEmails.filter(e => e.folderId === selectedFolderId && e.accountId === selectedAccountId),
        [selectedFolderId, selectedAccountId]
    )

    const activeFolder = mockFolders.find(f => f.id === selectedFolderId)!

    const selectedEmail: EmailDetail | null = useMemo(() => {
        if (!selectedEmailId || !activeAccount) return null
        if (selectedEmailId === mockEmailDetail.id) return mockEmailDetail
        const found = mockEmails.find(e => e.id === selectedEmailId)
        if (!found) return null
        return {
            ...found,
            bodyHtml: '<p>No preview available.</p>',
            recipients: [{ name: activeAccount.displayName, email: activeAccount.email }],
        }
    }, [selectedEmailId, activeAccount])

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
                            folders={mockFolders}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={handleSelectFolder}
                            onOpenSettings={() => setSettingsOpen(true)}
                        />
                        <EmailList
                            folder={activeFolder}
                            emails={filteredEmails}
                            selectedEmailId={selectedEmailId}
                            onSelectEmail={setSelectedEmailId}
                        />
                        <EmailReader email={selectedEmail} />
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

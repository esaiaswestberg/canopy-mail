import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import EmailList from './components/email-list/EmailList'
import EmailReader from './components/email-reader/EmailReader'
import ContextMenu from './components/context-menu/ContextMenu'
import SettingsModal from './components/settings/SettingsModal'
import { mockAccounts, mockEmails, mockEmailDetail, mockFolders } from './data/mockData'
import { Account, EmailDetail } from './types/mail'
import { ContextMenuContext, ContextMenuState, ContextMenuItem } from './context/ContextMenuContext'

function App() {
    const [accounts, setAccounts] = useState<Account[]>(mockAccounts)
    const [selectedAccountId, setSelectedAccountId] = useState(mockAccounts[0].id)
    const [selectedFolderId, setSelectedFolderId] = useState('inbox')
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(mockEmails[0].id)
    const [menuState, setMenuState] = useState<ContextMenuState | null>(null)
    const [settingsOpen, setSettingsOpen] = useState(false)

    const activeAccount = accounts.find(a => a.id === selectedAccountId) ?? accounts[0]

    const filteredEmails = useMemo(
        () => mockEmails.filter(e => e.folderId === selectedFolderId && e.accountId === selectedAccountId),
        [selectedFolderId, selectedAccountId]
    )

    const activeFolder = mockFolders.find(f => f.id === selectedFolderId)!

    const selectedEmail: EmailDetail | null = useMemo(() => {
        if (!selectedEmailId) return null
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

    function handleAddAccount(account: Account) {
        setAccounts(prev => [...prev, account])
    }

    function handleUpdateAccount(updated: Account) {
        setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
    }

    function handleDeleteAccount(id: string) {
        setAccounts(prev => {
            const next = prev.filter(a => a.id !== id)
            if (selectedAccountId === id && next.length > 0) {
                setSelectedAccountId(next[0].id)
            }
            return next
        })
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

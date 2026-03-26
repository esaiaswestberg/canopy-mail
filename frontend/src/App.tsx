import { useState, useMemo } from 'react'
import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import EmailList from './components/email-list/EmailList'
import EmailReader from './components/email-reader/EmailReader'
import { mockAccounts, mockEmails, mockEmailDetail, mockFolders } from './data/mockData'
import { EmailDetail } from './types/mail'

function App() {
    const [selectedAccountId, setSelectedAccountId] = useState(mockAccounts[0].id)
    const [selectedFolderId, setSelectedFolderId] = useState('inbox')
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(mockEmails[0].id)

    const activeAccount = mockAccounts.find(a => a.id === selectedAccountId)!

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

    return (
        <div id="App">
            <Sidebar
                accounts={mockAccounts}
                activeAccount={activeAccount}
                onSelectAccount={handleSelectAccount}
                folders={mockFolders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={handleSelectFolder}
            />
            <EmailList
                folder={activeFolder}
                emails={filteredEmails}
                selectedEmailId={selectedEmailId}
                onSelectEmail={setSelectedEmailId}
            />
            <EmailReader email={selectedEmail} />
        </div>
    )
}

export default App

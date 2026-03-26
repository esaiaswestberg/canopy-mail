import { Settings } from 'lucide-react'
import { Account, Folder } from '../../types/mail'
import AccountSwitcher from './AccountSwitcher'
import FolderTree from './FolderTree'
import './Sidebar.css'

interface SidebarProps {
    accounts: Account[]
    activeAccount: Account
    onSelectAccount: (id: string) => void
    folders: Folder[]
    selectedFolderId: string
    onSelectFolder: (id: string) => void
}

export default function Sidebar({ accounts, activeAccount, onSelectAccount, folders, selectedFolderId, onSelectFolder }: SidebarProps) {
    return (
        <aside className="sidebar">
            <AccountSwitcher accounts={accounts} activeAccount={activeAccount} onSelectAccount={onSelectAccount} />
            <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
            />
            <div className="sidebar__footer">
                <button className="sidebar__settings-btn">
                    <Settings size={15} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    )
}

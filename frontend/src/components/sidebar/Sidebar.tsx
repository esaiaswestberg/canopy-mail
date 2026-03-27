import { Settings, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Account, Folder, SyncStatus } from '../../types/mail'
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
    onOpenSettings: () => void
    syncStatus?: SyncStatus
}

export default function Sidebar({ accounts, activeAccount, onSelectAccount, folders, selectedFolderId, onSelectFolder, onOpenSettings, syncStatus }: SidebarProps) {
    return (
        <aside className="sidebar">
            <AccountSwitcher accounts={accounts} activeAccount={activeAccount} onSelectAccount={onSelectAccount} onOpenSettings={onOpenSettings} />
            <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
            />
            <div className="sidebar__footer">
                {syncStatus && syncStatus.status !== 'idle' && (
                    <div className={`sidebar__sync-status ${syncStatus.status}`}>
                        {syncStatus.status === 'syncing' && <RefreshCw size={14} className="sync-spin" />}
                        {syncStatus.status === 'error' && <AlertCircle size={14} />}
                        <span className="sync-text">{syncStatus.progress || 'Syncing...'}</span>
                    </div>
                )}
                <button className="sidebar__settings-btn" onClick={onOpenSettings}>
                    <Settings size={15} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    )
}

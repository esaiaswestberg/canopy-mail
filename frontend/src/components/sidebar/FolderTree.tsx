import { Folder } from '../../types/mail'
import FolderItem from './FolderItem'
import './FolderTree.css'

interface FolderTreeProps {
    folders: Folder[]
    selectedFolderId: string
    onSelectFolder: (id: string) => void
}

export default function FolderTree({ folders, selectedFolderId, onSelectFolder }: FolderTreeProps) {
    return (
        <nav className="folder-tree">
            <div className="folder-tree__section-label">Mailboxes</div>
            <div className="folder-tree__list">
                {folders.map(folder => (
                    <FolderItem
                        key={folder.id}
                        folder={folder}
                        isActive={folder.id === selectedFolderId}
                        onClick={() => onSelectFolder(folder.id)}
                    />
                ))}
            </div>
        </nav>
    )
}

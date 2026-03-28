import { List, AutoSizer, ListRowProps } from 'react-virtualized'
import 'react-virtualized/styles.css'
import { EmailListItem as EmailListItemType, Folder } from '../../types/mail'
import EmailListHeader from './EmailListHeader'
import EmailListItem from './EmailListItem'
import './EmailList.css'

interface EmailListProps {
    folder: Folder
    folders: Folder[]
    emails: (EmailListItemType | null)[]
    selectedEmailId: string | null
    onSelectEmail: (id: string) => void
    onLoadMore: (startIndex: number, stopIndex: number) => void
}

const ROW_HEIGHT = 80

export default function EmailList({ folder, folders, emails, selectedEmailId, onSelectEmail, onLoadMore }: EmailListProps) {
    function rowRenderer({ index, key, style }: ListRowProps) {
        const email = emails[index]
        if (!email) {
            return <div key={key} style={style} className="email-list__skeleton" />
        }
        return (
            <div key={key} style={style}>
                <EmailListItem
                    email={email}
                    folders={folders}
                    isSelected={email.id === selectedEmailId}
                    onClick={() => onSelectEmail(email.id)}
                />
            </div>
        )
    }

    function handleRowsRendered({ startIndex, stopIndex }: { startIndex: number, stopIndex: number }) {
        onLoadMore(startIndex, stopIndex)
    }

    return (
        <div className="email-list">
            <EmailListHeader folderLabel={folder.label} emailCount={emails.length} />
            <div className="email-list__items">
                {emails.length === 0 ? (
                    <div className="email-list__empty">No messages</div>
                ) : (
                    <AutoSizer>
                        {({ width, height }) => (
                            <List
                                width={width}
                                height={height}
                                rowCount={emails.length}
                                rowHeight={ROW_HEIGHT}
                                rowRenderer={rowRenderer}
                                onRowsRendered={handleRowsRendered}
                                overscanRowCount={5}
                            />
                        )}
                    </AutoSizer>
                )}
            </div>
        </div>
    )
}

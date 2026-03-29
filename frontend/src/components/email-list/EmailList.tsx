import { List, AutoSizer, ListRowProps } from 'react-virtualized'
import 'react-virtualized/styles.css'
import { useRef } from 'react'
import { EmailListItem as EmailListItemType, Folder } from '../../types/mail'
import EmailListHeader from './EmailListHeader'
import EmailListItem from './EmailListItem'
import { useMultiEmailContextMenuItems } from '../../hooks/useContextMenuItems'
import './EmailList.css'

interface EmailListProps {
    folder: Folder
    folders: Folder[]
    emails: (EmailListItemType | null)[]
    selectedEmailIds: Set<string>
    onSelectionChange: (ids: Set<string>) => void
    onLoadMore: (startIndex: number, stopIndex: number) => void
    onMarkEmailRead: (email: EmailListItemType, isRead: boolean) => void
    onMultiMarkEmailRead: (emails: EmailListItemType[], isRead: boolean) => void
    onReply: (email: EmailListItemType) => void
    onForward: (email: EmailListItemType) => void
}

const ROW_HEIGHT = 80

export default function EmailList({ folder, folders, emails, selectedEmailIds, onSelectionChange, onLoadMore, onMarkEmailRead, onMultiMarkEmailRead, onReply, onForward }: EmailListProps) {
    const lastClickedIndexRef = useRef<number | null>(null)

    const selectedEmailsList = emails.filter(e => e && selectedEmailIds.has(e.id)) as EmailListItemType[]
    const multiSelectMenuItems = useMultiEmailContextMenuItems(selectedEmailsList, folders, onMultiMarkEmailRead)

    function handleEmailClick(index: number, emailId: string, e: React.MouseEvent) {
        if (e.shiftKey && lastClickedIndexRef.current !== null) {
            const start = Math.min(lastClickedIndexRef.current, index)
            const end = Math.max(lastClickedIndexRef.current, index)
            const rangeIds = new Set<string>()
            for (let i = start; i <= end; i++) {
                const item = emails[i]
                if (item) rangeIds.add(item.id)
            }
            onSelectionChange(rangeIds)
        } else if (e.ctrlKey || e.metaKey) {
            const next = new Set(selectedEmailIds)
            if (next.has(emailId)) {
                next.delete(emailId)
            } else {
                next.add(emailId)
            }
            onSelectionChange(next)
            lastClickedIndexRef.current = index
        } else {
            onSelectionChange(new Set([emailId]))
            lastClickedIndexRef.current = index
        }
    }

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
                    isSelected={selectedEmailIds.has(email.id)}
                    onClick={(e) => handleEmailClick(index, email.id, e)}
                    onSingleSelect={() => onSelectionChange(new Set([email.id]))}
                    onMarkEmailRead={onMarkEmailRead}
                    onReply={onReply}
                    onForward={onForward}
                    multiSelectMenuItems={selectedEmailIds.size > 1 ? multiSelectMenuItems : undefined}
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

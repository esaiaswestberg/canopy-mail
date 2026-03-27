import { File, FileImage, FileText, FileArchive, Download } from 'lucide-react'
import { Attachment } from '../../types/mail'
import { SaveAttachment } from '../../../wailsjs/go/main/App'
import './EmailReaderAttachments.css'

interface EmailReaderAttachmentsProps {
    attachments: Attachment[]
}

function getFileIcon(contentType: string) {
    if (contentType.startsWith('image/')) return FileImage
    if (contentType === 'application/pdf' || contentType.startsWith('text/')) return FileText
    if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('gzip') || contentType.includes('compressed')) return FileArchive
    return File
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EmailReaderAttachments({ attachments }: EmailReaderAttachmentsProps) {
    function handleDownload(attachment: Attachment) {
        SaveAttachment(attachment.name, attachment.contentType, attachment.data).catch(console.error)
    }

    return (
        <div className="reader-attachments">
            <div className="reader-attachments__list">
                {attachments.map((attachment, index) => {
                    const Icon = getFileIcon(attachment.contentType)
                    return (
                        <button
                            key={index}
                            className="reader-attachments__chip"
                            onClick={() => handleDownload(attachment)}
                            title={attachment.name}
                        >
                            <Icon size={16} className="reader-attachments__chip-icon reader-attachments__chip-icon--file" />
                            <Download size={16} className="reader-attachments__chip-icon reader-attachments__chip-icon--download" />
                            <div className="reader-attachments__chip-info">
                                <span className="reader-attachments__chip-name">{attachment.name}</span>
                                <span className="reader-attachments__chip-size">{formatSize(attachment.size)}</span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

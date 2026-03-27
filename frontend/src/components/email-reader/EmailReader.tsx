import { Mail } from 'lucide-react'
import { EmailDetail } from '../../types/mail'
import EmailReaderHeader from './EmailReaderHeader'
import EmailReaderBody from './EmailReaderBody'
import EmailReaderAttachments from './EmailReaderAttachments'
import './EmailReader.css'

interface EmailReaderProps {
    email: EmailDetail | null
    loadingBody: boolean
}

export default function EmailReader({ email, loadingBody }: EmailReaderProps) {
    if (!email) {
        return (
            <div className="email-reader email-reader--empty">
                <Mail size={40} className="email-reader__empty-icon" />
                <p className="email-reader__empty-text">Select a message to read</p>
            </div>
        )
    }

    return (
        <div className="email-reader">
            <EmailReaderHeader email={email} />
            <EmailReaderBody bodyHtml={email.bodyHtml} loading={loadingBody} />
            {email.attachments && email.attachments.length > 0 && (
                <EmailReaderAttachments attachments={email.attachments} />
            )}
        </div>
    )
}

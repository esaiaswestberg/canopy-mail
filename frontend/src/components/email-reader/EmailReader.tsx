import { Mail } from 'lucide-react'
import { EmailDetail } from '../../types/mail'
import EmailReaderHeader from './EmailReaderHeader'
import EmailReaderBody from './EmailReaderBody'
import './EmailReader.css'

interface EmailReaderProps {
    email: EmailDetail | null
}

export default function EmailReader({ email }: EmailReaderProps) {
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
            <EmailReaderBody bodyHtml={email.bodyHtml} />
        </div>
    )
}

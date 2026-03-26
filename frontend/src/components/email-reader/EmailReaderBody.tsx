import './EmailReaderBody.css'

interface EmailReaderBodyProps {
    bodyHtml: string
}

export default function EmailReaderBody({ bodyHtml }: EmailReaderBodyProps) {
    return (
        <div className="reader-body-wrapper">
            <div
                className="reader-body"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
        </div>
    )
}

import './EmailReaderBody.css'

interface EmailReaderBodyProps {
    bodyHtml: string
    loading: boolean
}

export default function EmailReaderBody({ bodyHtml, loading }: EmailReaderBodyProps) {
    if (loading) {
        return (
            <div className="reader-body-wrapper reader-body-wrapper--loading">
                <div className="reader-body-spinner" />
            </div>
        )
    }

    return (
        <div className="reader-body-wrapper">
            <div
                className="reader-body"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
        </div>
    )
}

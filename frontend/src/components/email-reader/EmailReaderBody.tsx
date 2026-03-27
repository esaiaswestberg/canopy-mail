import { useRef, useCallback } from 'react'
import './EmailReaderBody.css'

interface EmailReaderBodyProps {
    bodyHtml: string
    loading: boolean
}

const DEFAULT_STYLES = `
    body {
        margin: 0;
        padding: 24px;
        color: #e8eaf2;
        background-color: #1a1b24;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
        line-height: 1.7;
        -webkit-font-smoothing: antialiased;
    }

    p {
        margin: 0 0 16px;
        color: #e8eaf2;
    }

    p:last-child {
        margin-bottom: 0;
    }

    ul, ol {
        margin: 0 0 16px;
        padding-left: 20px;
        color: #e8eaf2;
    }

    li {
        margin-bottom: 4px;
    }

    a {
        color: #8b99ff;
        text-decoration: underline;
        text-decoration-color: #3d4699;
    }

    a:hover {
        color: #8b99ff;
        text-decoration-color: #8b99ff;
    }

    strong {
        font-weight: 600;
        color: #ffffff;
    }

    em {
        font-style: italic;
        color: #8b8fa8;
    }

    code {
        font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
        font-size: 0.9em;
        background-color: #1f2130;
        border: 1px solid #22243a;
        padding: 1px 5px;
        border-radius: 4px;
        color: #e8eaf2;
    }

    blockquote {
        border-left: 3px solid #2e3150;
        margin: 0 0 16px;
        padding-left: 16px;
        color: #8b8fa8;
    }

    ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    ::-webkit-scrollbar-track {
        background: #0d0e11;
    }

    ::-webkit-scrollbar-thumb {
        background: #2e3150;
        border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #555872;
    }
`

export default function EmailReaderBody({ bodyHtml, loading }: EmailReaderBodyProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const handleLoad = useCallback(() => {
        const iframe = iframeRef.current
        if (!iframe?.contentDocument) return

        const style = iframe.contentDocument.createElement('style')
        style.textContent = DEFAULT_STYLES
        iframe.contentDocument.head.insertBefore(style, iframe.contentDocument.head.firstChild)
    }, [])

    if (loading) {
        return (
            <div className="reader-body-wrapper reader-body-wrapper--loading">
                <div className="reader-body-spinner" />
            </div>
        )
    }

    return (
        <div className="reader-body-wrapper">
            <iframe
                ref={iframeRef}
                className="reader-body"
                srcDoc={bodyHtml}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                onLoad={handleLoad}
            />
        </div>
    )
}

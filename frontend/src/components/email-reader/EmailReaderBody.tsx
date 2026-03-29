import { useEffect, useMemo } from 'react'
import { OpenURL } from '../../../wailsjs/go/main/App'
import './EmailReaderBody.css'

interface EmailReaderBodyProps {
    bodyHtml: string
    loading: boolean
    onMailto: (to: string, subject?: string, body?: string) => void
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

const CLICK_HANDLER_SCRIPT = `
    document.addEventListener('click', function(e) {
        var a = e.target.closest('a');
        if (!a) return;
        e.preventDefault();
        window.parent.postMessage({ type: 'canopy-link', href: a.getAttribute('href') || '' }, '*');
    });
`

function buildSrcDoc(bodyHtml: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(bodyHtml, 'text/html')

    // Strip scripts and unsafe event handlers from email HTML
    doc.querySelectorAll('script, noscript').forEach(el => el.remove())
    doc.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) el.removeAttribute(attr.name)
        })
        const href = el.getAttribute('href')
        if (href?.toLowerCase().startsWith('javascript:')) el.removeAttribute('href')
    })

    const style = doc.createElement('style')
    style.textContent = DEFAULT_STYLES
    doc.head.insertBefore(style, doc.head.firstChild)

    const script = doc.createElement('script')
    script.textContent = CLICK_HANDLER_SCRIPT
    doc.body.appendChild(script)

    return doc.documentElement.outerHTML
}

export default function EmailReaderBody({ bodyHtml, loading, onMailto }: EmailReaderBodyProps) {
    const srcDoc = useMemo(() => buildSrcDoc(bodyHtml), [bodyHtml])

    useEffect(() => {
        function handleMessage(e: MessageEvent) {
            if (!e.data || e.data.type !== 'canopy-link') return
            const href: string = e.data.href
            if (href.startsWith('http://') || href.startsWith('https://')) {
                OpenURL(href)
            } else if (href.startsWith('mailto:')) {
                const url = new URL(href)
                onMailto(url.pathname, url.searchParams.get('subject') ?? undefined, url.searchParams.get('body') ?? undefined)
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [onMailto])

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
                className="reader-body"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    )
}

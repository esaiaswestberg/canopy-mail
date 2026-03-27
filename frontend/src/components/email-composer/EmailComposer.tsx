import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, File, FileImage, FileText, FileArchive, X } from 'lucide-react'
import { Account, Attachment, ComposerConfig } from '../../types/mail'
import { SendEmail } from '../../../wailsjs/go/main/App'
import { main as WailsModels } from '../../../wailsjs/go/models'
import EmailComposerToolbar from './EmailComposerToolbar'
import TagInput from './TagInput'
import './EmailComposer.css'

interface EmailComposerProps {
    onClose: () => void
    account: Account
    config: ComposerConfig
}

const TITLES: Record<ComposerConfig['mode'], string> = {
    compose: 'New Message',
    reply: 'Reply',
    forward: 'Forward',
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

const EDITOR_STYLES = `
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 16px 24px;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.6;
        color: #e8eaf2;
        background: #1a1b24;
        outline: none;
        min-height: 100%;
        word-break: break-word;
    }
    a { color: #6b7bff; }
    blockquote {
        border-left: 2px solid #6b7bff;
        margin: 0;
        padding-left: 12px;
        color: #8b8fa8;
    }
    ul, ol { padding-left: 20px; margin: 4px 0; }
    img, video { max-width: 100%; border-radius: 4px; margin: 4px 0; display: block; }
`

export default function EmailComposer({ onClose, account, config }: EmailComposerProps) {
    const [toTags, setToTags] = useState<string[]>(config.initialTo ? [config.initialTo] : [])
    const [subject, setSubject] = useState(config.initialSubject ?? '')
    const [attachments, setAttachments] = useState<Attachment[]>(config.initialAttachments ?? [])
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const savedRangeRef = useRef<Range | null>(null)

    useEffect(() => {
        const iframe = iframeRef.current
        if (!iframe) return
        const doc = iframe.contentDocument!
        doc.open()
        doc.write(`<!DOCTYPE html><html><head><style>${EDITOR_STYLES}</style></head><body>${config.initialBody ?? ''}</body></html>`)
        doc.close()
        doc.designMode = 'on'
        if (config.mode === 'reply') {
            const range = doc.createRange()
            range.setStart(doc.body, 0)
            range.collapse(true)
            const sel = doc.getSelection()
            if (sel) { sel.removeAllRanges(); sel.addRange(range) }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function saveSelection() {
        const doc = iframeRef.current?.contentDocument
        if (!doc) return
        const sel = doc.getSelection()
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange()
        }
    }

    function execCommand(command: string, value?: string) {
        const doc = iframeRef.current?.contentDocument
        if (!doc) return
        if (command === 'foreColor' && savedRangeRef.current) {
            iframeRef.current?.contentWindow?.focus()
            const sel = doc.getSelection()
            if (sel) {
                sel.removeAllRanges()
                sel.addRange(savedRangeRef.current)
            }
            savedRangeRef.current = null
        }
        doc.execCommand(command, false, value ?? undefined)
    }

    async function insertMedia(file: File) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
        const doc = iframeRef.current?.contentDocument
        if (!doc) return
        iframeRef.current?.contentWindow?.focus()
        if (savedRangeRef.current) {
            const sel = doc.getSelection()
            if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current) }
            savedRangeRef.current = null
        }
        if (file.type.startsWith('image/')) {
            doc.execCommand('insertImage', false, dataUrl)
        } else {
            doc.execCommand('insertHTML', false, `<video src="${dataUrl}" controls></video>`)
        }
    }

    function getHtmlBody(): string {
        return iframeRef.current?.contentDocument?.body.innerHTML ?? ''
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        const read = await Promise.all(files.map(async (file) => {
            const buffer = await file.arrayBuffer()
            return {
                name: file.name,
                contentType: file.type || 'application/octet-stream',
                size: file.size,
                data: Array.from(new Uint8Array(buffer)),
            }
        }))
        setAttachments(prev => [...prev, ...read])
        e.target.value = ''
    }

    function removeAttachment(index: number) {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    async function handleSend() {
        setSending(true)
        setSendError(null)
        try {
            await SendEmail(WailsModels.SendRequest.createFrom({
                accountId: account.id,
                to: toTags,
                subject,
                bodyHtml: getHtmlBody(),
                attachments,
            }))
            onClose()
        } catch (err) {
            setSendError(err instanceof Error ? err.message : String(err))
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="email-composer">
            <div className="email-composer__header">
                <h2 className="email-composer__title">{TITLES[config.mode]}</h2>
                {sendError && <span className="email-composer__send-error">{sendError}</span>}
                <div className="email-composer__actions">
                    <button className="email-composer__discard-btn" onClick={onClose} disabled={sending}>
                        <Trash2 size={14} />
                        Discard
                    </button>
                    <button className="email-composer__send-btn" onClick={handleSend} disabled={sending}>
                        <Send size={14} />
                        {sending ? 'Sending…' : 'Send'}
                    </button>
                </div>
            </div>
            <div className="email-composer__fields">
                <div className="email-composer__field">
                    <span className="email-composer__field-label">From</span>
                    <input
                        className="email-composer__field-input"
                        type="text"
                        value={account.email}
                        readOnly
                    />
                </div>
                <div className="email-composer__field">
                    <span className="email-composer__field-label">To</span>
                    <TagInput
                        tags={toTags}
                        onChange={setToTags}
                        placeholder="recipient@example.com"
                        autoFocus={config.mode !== 'reply'}
                    />
                </div>
                <div className="email-composer__field">
                    <span className="email-composer__field-label">Subject</span>
                    <input
                        className="email-composer__field-input"
                        type="text"
                        placeholder="Subject"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                    />
                </div>
            </div>
            <EmailComposerToolbar
                onCommand={execCommand}
                onAttach={() => fileInputRef.current?.click()}
                onInsertMedia={insertMedia}
                onSaveSelection={saveSelection}
            />
            <div className="email-composer__editor">
                <iframe
                    ref={iframeRef}
                    className="email-composer__iframe"
                />
            </div>
            {attachments.length > 0 && (
                <div className="email-composer__attachments">
                    {attachments.map((att, i) => {
                        const Icon = getFileIcon(att.contentType)
                        return (
                            <div key={i} className="email-composer__att-chip">
                                <Icon size={14} className="email-composer__att-icon" />
                                <span className="email-composer__att-name">{att.name}</span>
                                <span className="email-composer__att-size">{formatSize(att.size)}</span>
                                <button className="email-composer__att-remove" onClick={() => removeAttachment(i)} title="Remove attachment">
                                    <X size={12} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />
        </div>
    )
}

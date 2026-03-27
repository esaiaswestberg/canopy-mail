import { useRef } from 'react'
import { Bold, Italic, Underline, Strikethrough, Palette, List, ListOrdered, Paperclip, ImagePlus } from 'lucide-react'
import './EmailComposerToolbar.css'

interface EmailComposerToolbarProps {
    onCommand: (command: string, value?: string) => void
    onAttach: () => void
    onInsertMedia: (file: File) => void
    onSaveSelection: () => void
}

export default function EmailComposerToolbar({ onCommand, onAttach, onInsertMedia, onSaveSelection }: EmailComposerToolbarProps) {
    const colorInputRef = useRef<HTMLInputElement>(null)
    const mediaInputRef = useRef<HTMLInputElement>(null)

    return (
        <div className="composer-toolbar">
            <button className="composer-toolbar__btn" title="Bold" onMouseDown={e => { e.preventDefault(); onCommand('bold') }}>
                <Bold size={14} />
            </button>
            <button className="composer-toolbar__btn" title="Italic" onMouseDown={e => { e.preventDefault(); onCommand('italic') }}>
                <Italic size={14} />
            </button>
            <button className="composer-toolbar__btn" title="Underline" onMouseDown={e => { e.preventDefault(); onCommand('underline') }}>
                <Underline size={14} />
            </button>
            <button className="composer-toolbar__btn" title="Strikethrough" onMouseDown={e => { e.preventDefault(); onCommand('strikeThrough') }}>
                <Strikethrough size={14} />
            </button>

            <div className="composer-toolbar__divider" />

            <button className="composer-toolbar__btn" title="Text color" onMouseDown={e => { e.preventDefault(); onSaveSelection(); colorInputRef.current?.click() }}>
                <Palette size={14} />
            </button>
            <input
                ref={colorInputRef}
                type="color"
                hidden
                onChange={e => onCommand('foreColor', e.target.value)}
            />

            <div className="composer-toolbar__divider" />

            <button className="composer-toolbar__btn" title="Bullet list" onMouseDown={e => { e.preventDefault(); onCommand('insertUnorderedList') }}>
                <List size={14} />
            </button>
            <button className="composer-toolbar__btn" title="Numbered list" onMouseDown={e => { e.preventDefault(); onCommand('insertOrderedList') }}>
                <ListOrdered size={14} />
            </button>

            <div className="composer-toolbar__divider" />

            <button className="composer-toolbar__btn" title="Insert image or video" onMouseDown={e => { e.preventDefault(); onSaveSelection(); mediaInputRef.current?.click() }}>
                <ImagePlus size={14} />
            </button>
            <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) onInsertMedia(file)
                    e.target.value = ''
                }}
            />

            <div className="composer-toolbar__divider" />

            <button className="composer-toolbar__btn" title="Attach files" onMouseDown={e => { e.preventDefault(); onAttach() }}>
                <Paperclip size={14} />
            </button>
        </div>
    )
}

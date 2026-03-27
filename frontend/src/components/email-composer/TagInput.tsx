import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import './TagInput.css'

interface TagInputProps {
    tags: string[]
    onChange: (tags: string[]) => void
    placeholder?: string
    autoFocus?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string): boolean {
    return EMAIL_RE.test(value)
}

export default function TagInput({ tags, onChange, placeholder, autoFocus }: TagInputProps) {
    const [inputValue, setInputValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    function addTag(value: string) {
        const trimmed = value.trim().replace(/,+$/, '').trim()
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed])
        }
        setInputValue('')
    }

    function removeTag(index: number) {
        onChange(tags.filter((_, i) => i !== index))
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === ',' || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            addTag(inputValue)
        } else if (e.key === 'Backspace' && inputValue === '') {
            onChange(tags.slice(0, -1))
        }
    }

    return (
        <div className="tag-input" onClick={() => inputRef.current?.focus()}>
            {tags.map((tag, i) => (
                <span key={i} className={`tag-input__tag${isValidEmail(tag) ? '' : ' tag-input__tag--invalid'}`}>
                    {tag}
                    <button
                        className="tag-input__remove"
                        onClick={e => { e.stopPropagation(); removeTag(i) }}
                        tabIndex={-1}
                    >
                        <X size={10} />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                className="tag-input__input"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addTag(inputValue)}
                placeholder={tags.length === 0 ? placeholder : ''}
                autoFocus={autoFocus}
            />
        </div>
    )
}

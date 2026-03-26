import { ChevronRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ContextMenuItem } from '../../context/ContextMenuContext'
import './ContextMenu.css'

interface ContextMenuProps {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}

interface SubmenuPanelProps {
    anchorX: number  // right edge of the parent item
    anchorY: number  // top edge of the parent item
    items: ContextMenuItem[]
    onSelect: () => void
    onMouseEnter: () => void
    onMouseLeave: () => void
}

function SubmenuPanel({ anchorX, anchorY, items, onSelect, onMouseEnter, onMouseLeave }: SubmenuPanelProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ x: anchorX, y: anchorY })
    const [visible, setVisible] = useState(false)

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const { width, height } = el.getBoundingClientRect()
        const margin = 4
        // Prefer opening to the right; flip left if it would overflow
        const x = anchorX + width > window.innerWidth - margin
            ? anchorX - width - (window.innerWidth - anchorX) - margin  // flip left
            : anchorX + margin
        const y = Math.min(anchorY, window.innerHeight - height - margin)
        setPos({ x: Math.max(margin, x), y: Math.max(margin, y) })
        setVisible(true)
    }, [anchorX, anchorY])

    return (
        <div
            ref={ref}
            className={`context-menu${visible ? ' context-menu--visible' : ''}`}
            style={{ left: pos.x, top: pos.y }}
            role="menu"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {items.map((item, i) => {
                if (item.type === 'divider') {
                    return <div key={i} className="context-menu__divider" role="separator" />
                }
                if (item.type === 'submenu') return null  // no nested submenus
                return (
                    <button
                        key={i}
                        className={`context-menu__item${item.danger ? ' context-menu__item--danger' : ''}`}
                        role="menuitem"
                        onClick={() => { item.onClick(); onSelect() }}
                    >
                        {item.icon && <span className="context-menu__item-icon">{item.icon}</span>}
                        {item.label}
                    </button>
                )
            })}
        </div>
    )
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ x, y })
    const [visible, setVisible] = useState(false)
    const [submenuState, setSubmenuState] = useState<{ index: number; anchorX: number; anchorY: number } | null>(null)
    const closeTimerRef = useRef<ReturnType<typeof setTimeout>>()

    useLayoutEffect(() => {
        const menu = menuRef.current
        if (!menu) return
        const { width, height } = menu.getBoundingClientRect()
        const margin = 4
        const clampedX = Math.min(x, window.innerWidth - width - margin)
        const clampedY = Math.min(y, window.innerHeight - height - margin)
        setPos({ x: Math.max(margin, clampedX), y: Math.max(margin, clampedY) })
        setVisible(true)
    }, [x, y])

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        function handleScroll() {
            onClose()
        }
        document.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('keydown', handleKeyDown)
        window.addEventListener('scroll', handleScroll, { capture: true })
        return () => {
            document.removeEventListener('mousedown', handleMouseDown)
            document.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('scroll', handleScroll, { capture: true })
        }
    }, [onClose])

    function scheduleCloseSubmenu() {
        closeTimerRef.current = setTimeout(() => setSubmenuState(null), 120)
    }
    function cancelCloseSubmenu() {
        clearTimeout(closeTimerRef.current)
    }

    function handleSubmenuTriggerEnter(e: React.MouseEvent, index: number) {
        cancelCloseSubmenu()
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setSubmenuState({ index, anchorX: rect.right, anchorY: rect.top })
    }

    function handleRegularItemEnter() {
        setSubmenuState(null)
        cancelCloseSubmenu()
    }

    const activeSubmenuItems = submenuState !== null
        ? (items[submenuState.index] as Extract<ContextMenuItem, { type: 'submenu' }>).items
        : []

    return (
        <>
            <div
                ref={menuRef}
                className={`context-menu${visible ? ' context-menu--visible' : ''}`}
                style={{ left: pos.x, top: pos.y }}
                role="menu"
            >
                {items.map((item, i) => {
                    if (item.type === 'divider') {
                        return <div key={i} className="context-menu__divider" role="separator" />
                    }
                    if (item.type === 'submenu') {
                        return (
                            <div
                                key={i}
                                className={`context-menu__item context-menu__item--submenu${submenuState?.index === i ? ' context-menu__item--submenu-active' : ''}`}
                                role="menuitem"
                                aria-haspopup="true"
                                aria-expanded={submenuState?.index === i}
                                onMouseEnter={(e) => handleSubmenuTriggerEnter(e, i)}
                                onMouseLeave={scheduleCloseSubmenu}
                            >
                                {item.icon && <span className="context-menu__item-icon">{item.icon}</span>}
                                {item.label}
                                <ChevronRight size={12} className="context-menu__submenu-arrow" />
                            </div>
                        )
                    }
                    return (
                        <button
                            key={i}
                            className={`context-menu__item${item.danger ? ' context-menu__item--danger' : ''}`}
                            role="menuitem"
                            onMouseEnter={handleRegularItemEnter}
                            onClick={() => { item.onClick(); onClose() }}
                        >
                            {item.icon && <span className="context-menu__item-icon">{item.icon}</span>}
                            {item.label}
                        </button>
                    )
                })}
            </div>

            {submenuState && (
                <SubmenuPanel
                    anchorX={submenuState.anchorX}
                    anchorY={submenuState.anchorY}
                    items={activeSubmenuItems}
                    onSelect={onClose}
                    onMouseEnter={cancelCloseSubmenu}
                    onMouseLeave={scheduleCloseSubmenu}
                />
            )}
        </>
    )
}

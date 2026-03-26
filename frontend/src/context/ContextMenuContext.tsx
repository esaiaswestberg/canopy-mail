import { createContext, useContext } from 'react'

export type ContextMenuItem =
    | {
          type: 'action'
          label: string
          icon?: React.ReactNode
          danger?: boolean
          onClick: () => void
      }
    | {
          type: 'submenu'
          label: string
          icon?: React.ReactNode
          items: ContextMenuItem[]
      }
    | { type: 'divider' }

export interface ContextMenuState {
    x: number
    y: number
    items: ContextMenuItem[]
}

export interface ContextMenuContextValue {
    openMenu: (x: number, y: number, items: ContextMenuItem[]) => void
    closeMenu: () => void
}

export const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

export function useContextMenu(): ContextMenuContextValue {
    const ctx = useContext(ContextMenuContext)
    if (!ctx) throw new Error('useContextMenu must be used within ContextMenuContext.Provider')
    return ctx
}

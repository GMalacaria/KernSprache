import { useEffect, useRef, type ReactNode } from 'react'

interface SideMenuProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Side drawer on a native dialog: focus trap, Escape and backdrop come for free. */
export function SideMenu({ open, onClose, children }: SideMenuProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="side-menu"
      aria-label="Menu"
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="side-menu-body">
        <div className="row">
          <strong className="side-menu-title">English Tutor</strong>
          <button type="button" className="link" onClick={onClose} aria-label="Chiudi il menu">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/** Three-line button that opens the menu. */
export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="link menu-button" onClick={onClick} aria-label="Apri il menu">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  )
}

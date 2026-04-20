import { useEffect } from 'react'

/**
 * Closes a modal on ESC key press.
 * Backdrop click is handled via onClick on the overlay + stopPropagation on the inner panel.
 */
export function useModalClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])
}

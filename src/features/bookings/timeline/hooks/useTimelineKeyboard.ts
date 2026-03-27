import { useEffect } from 'react'

/**
 * Registers global keyboard shortcuts for the timeline page.
 * Currently handles `?` to toggle the keyboard-help dialog.
 */
export function useTimelineKeyboard(
  onToggleHelp: () => void,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        onToggleHelp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggleHelp])
}

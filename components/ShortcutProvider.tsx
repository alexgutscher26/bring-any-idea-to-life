import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ShortcutManager, sequenceFromString, sequenceToString, type Command, type ShortcutSequence } from '../services/shortcuts'

type ShortcutContextValue = {
  manager: ShortcutManager
  register: (cmd: Command) => void
  setContext: (ctx: string) => void
  setState: (s: Record<string, any>) => void
  showFeedback: (label: string, shortcut?: string) => void
}

const Ctx = createContext<ShortcutContextValue | null>(null)

/**
 * Retrieves the context value from ShortcutProvider.
 */
export const useShortcuts = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('ShortcutProvider missing')
  return v
}

/**
 * Provides a context for managing keyboard shortcuts and displaying feedback to the user.
 *
 * The ShortcutProvider initializes a ShortcutManager and sets up a feedback handler to display toast notifications
 * whenever a command is executed. It uses a React context to provide access to the manager and related functions
 * for registering commands, setting context, and showing feedback. The component also manages the display of
 * toast notifications, which are removed after a short duration.
 *
 * @param {React.ReactNode} children - The child components to be rendered within the provider.
 */
export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const managerRef = useRef<ShortcutManager | null>(null)
  const [toasts, setToasts] = useState<{ id: number; label: string; shortcut?: string }[]>([])

  if (!managerRef.current) managerRef.current = new ShortcutManager()

  useEffect(() => {
    const m = managerRef.current!
    m.setFeedbackHandler(cmd => {
      setToasts(prev => [...prev, { id: Date.now(), label: cmd.label, shortcut: cmd.sequences[0] ? sequenceToString(cmd.sequences[0]) : undefined }])
      setTimeout(() => setToasts(prev => prev.slice(1)), 1200)
    })
    return () => m.setFeedbackHandler(null)
  }, [])

  const value = useMemo<ShortcutContextValue>(() => {
    const m = managerRef.current!
    return {
      manager: m,
      register: (cmd: Command) => m.register(cmd),
      setContext: (ctx: string) => m.setContext(ctx),
      setState: (s: Record<string, any>) => m.setState(s),
      showFeedback: (label: string, shortcut?: string) => setToasts(prev => [...prev, { id: Date.now(), label, shortcut }])
    }
  }, [])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-zinc-900/90 border border-zinc-700 rounded-lg text-xs text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <span className="font-medium">{t.label}</span>
            {t.shortcut && <span className="text-[10px] text-zinc-500 border border-zinc-800 rounded px-1 py-0.5 font-mono">{t.shortcut}</span>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function parseShortcutInput(value: string): ShortcutSequence[] {
  return value.split(',').map(x => sequenceFromString(x.trim())).filter(seq => seq.length > 0)
}

/** Converts an array of ShortcutSequence to a string representation. */
export function stringifyShortcutSequences(seqs: ShortcutSequence[]): string {
  return seqs.map(s => sequenceToString(s)).join(', ')
}

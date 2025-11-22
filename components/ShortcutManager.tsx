import React, { useEffect, useMemo, useState } from 'react'
import { useShortcuts, parseShortcutInput, stringifyShortcutSequences } from './ShortcutProvider'
import { ArrowDownTrayIcon, ArrowPathIcon, NoSymbolIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'

/**
 * Renders a shortcut manager interface for managing keyboard shortcuts.
 *
 * This component utilizes the useShortcuts hook to access the shortcut manager, allowing users to search, enable/disable, update, export, and import shortcuts. It handles keyboard events for closing the manager and manages state for search input and activation delay. The component also displays any conflicts detected in the shortcuts.
 *
 * @param {Object} props - The component props.
 * @param {boolean} props.isOpen - Indicates whether the shortcut manager is open.
 * @param {function} props.onClose - Callback function to close the shortcut manager.
 * @returns {JSX.Element | null} The rendered component or null if not open.
 */
export const ShortcutManager: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { manager } = useShortcuts()
  const [search, setSearch] = useState('')
  const [delay, setDelay] = useState(1500)
  const [fileInputKey, setFileInputKey] = useState(0)
  const list = useMemo(() => manager.list(), [isOpen])
  const conflicts = useMemo(() => manager.conflicts(), [isOpen, list])

  useEffect(() => {
    setDelay(manager.exportConfig().activationDelayMs)
  }, [isOpen])

  useEffect(() => {
    /**
     * Handles the keyboard event to close on 'escape' key press.
     */
    const handler = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const filtered = list.filter(c => c.label.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))

  /**
   * Toggles the enabled state of an item by its ID.
   */
  const handleToggle = (id: string, enabled: boolean) => manager.enable(id, enabled)
  /**
   * Updates a shortcut with the given ID using the parsed input.
   */
  const handleUpdate = (id: string, raw: string) => {
    const seqs = parseShortcutInput(raw)
    manager.updateShortcut(id, seqs)
  }
  const handleExport = () => {
    const json = JSON.stringify(manager.exportConfig(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shortcuts.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const json = JSON.parse(String(ev.target?.result))
        manager.importConfig(json)
        setFileInputKey(k => k + 1)
      } catch {}
    }
    reader.readAsText(file)
  }
  const handleDelayChange = (ms: number) => {
    setDelay(ms)
    manager.setActivationDelay(ms)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[160] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-3xl bg-[#18181b] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search commands" className="flex-1 bg-transparent border-none outline-none text-white text-sm" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Chord delay</span>
              <input type="number" min={100} max={5000} step={100} value={delay} onChange={e => handleDelayChange(Number(e.target.value))} className="w-20 bg-transparent border border-zinc-700 rounded px-1 py-0.5" />
              <span>ms</span>
            </div>
            <button onClick={handleExport} className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800" title="Export">
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <label className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer" title="Import">
              <ArrowPathIcon className="w-4 h-4" />
              <input key={fileInputKey} type="file" accept="application/json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
        {!!conflicts.length && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <ShieldExclamationIcon className="w-4 h-4" />
            <span>{conflicts.length} conflicts detected</span>
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 text-sm">
              <div className="flex-1">
                <div className="text-white">{c.label}</div>
                <div className="text-[10px] text-zinc-500">{c.id}</div>
              </div>
              <input defaultValue={stringifyShortcutSequences(c.sequences)} onBlur={e => handleUpdate(c.id, e.target.value)} className="flex-1 bg-transparent border border-zinc-700 rounded px-2 py-1 text-xs text-white" />
              <button onClick={() => handleToggle(c.id, !(c.enabled !== false))} className={`p-1.5 rounded ${c.enabled !== false ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-red-400 hover:bg-red-900/30'}`} title={c.enabled !== false ? 'Disable' : 'Enable'}>
                <NoSymbolIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!filtered.length && <div className="px-4 py-8 text-center text-zinc-500 text-sm">No commands</div>}
        </div>
        <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
          <span>Edit shortcuts, disable or reassign. Comma to add alternatives.</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  )
}
